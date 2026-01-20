import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { toLocalISOString } from '../utils/date';
import { X, Search } from 'lucide-react';
import SafeAvatar from './SafeAvatar';


interface DailyAttendanceModalProps {
    isOpen: boolean;
    onClose: () => void;
    date: Date;
    onUpdate: () => void;
}

interface DailyStatus {
    user_id: string;
    full_name: string;
    avatar_url?: string;
    status: 'present' | 'leave' | 'absent' | 'holiday' | 'absent_marked';
    details?: string; // clock-in time or leave reason
}

export default function DailyAttendanceModal({ isOpen, onClose, date, onUpdate }: DailyAttendanceModalProps) {
    // const { user } = useAuth(); // Removed unused user
    const [employees, setEmployees] = useState<DailyStatus[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [markingAbsent, setMarkingAbsent] = useState<string | null>(null);

    const dateStr = toLocalISOString(date);

    useEffect(() => {
        if (isOpen) {
            fetchDailyStats();
        }
    }, [isOpen, date]);

    const fetchDailyStats = async () => {
        setLoading(true);
        try {
            // 1. Fetch all active profiles
            const { data: profiles, error: profileError } = await supabase
                .from('profiles')
                .select('id, full_name, avatar_url')
                .in('role', ['employee', 'hr']) // Track both employees and HR
                .order('full_name');

            if (profileError) throw profileError;

            // 2. Fetch Attendance for this date
            const { data: attendance, error: attError } = await supabase
                .from('attendance_logs')
                .select('user_id, clock_in')
                .eq('work_date', dateStr);

            if (attError) throw attError;

            // 3. Fetch Leaves for this date
            const { data: leaves, error: leaveError } = await supabase
                .from('leave_requests')
                .select('user_id, status, reason')
                .eq('status', 'approved')
                .lte('start_date', dateStr)
                .gte('end_date', dateStr);

            if (leaveError) throw leaveError;

            // 4. Fetch Holidays
            const { data: holidays, error: holidayError } = await supabase
                .from('leave_calendar_events')
                .select('id, title')
                .eq('event_date', dateStr);

            if (holidayError) throw holidayError;

            const isHoliday = holidays && holidays.length > 0;
            const holidayTitle = isHoliday ? holidays[0].title : '';

            // 5. Merge Data
            const merged: DailyStatus[] = (profiles || []).map(p => {
                // Check attendance
                const log = attendance?.find(a => a.user_id === p.id);
                if (log) {
                    return {
                        user_id: p.id,
                        full_name: p.full_name,
                        avatar_url: p.avatar_url,
                        status: 'present',
                        details: new Date(log.clock_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    };
                }

                // Check leaves
                const leave = leaves?.find(l => l.user_id === p.id);
                if (leave) {
                    const isUnexcused = leave.reason === 'Unexcused Absence';
                    return {
                        user_id: p.id,
                        full_name: p.full_name,
                        avatar_url: p.avatar_url,
                        status: isUnexcused ? 'absent_marked' : 'leave',
                        details: leave.reason
                    };
                }

                // If holiday
                if (isHoliday) {
                    return {
                        user_id: p.id,
                        full_name: p.full_name,
                        avatar_url: p.avatar_url,
                        status: 'holiday',
                        details: holidayTitle
                    };
                }

                // Otherwise Absent
                return {
                    user_id: p.id,
                    full_name: p.full_name,
                    avatar_url: p.avatar_url,
                    status: 'absent',
                    details: 'No Record'
                };
            });

            setEmployees(merged);
        } catch (error) {
            console.error('Error fetching daily stats:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleMarkPresent = async (employeeId: string, currentStatus: string) => {
        if (!confirm('Mark this employee as Present? This will create an attendance record (9 AM - 5 PM).')) return;

        try {
            // 1. If they are on leave (or marked absent), we must cancel that leave first
            if (currentStatus === 'leave' || currentStatus === 'absent_marked') {
                const { error: leaveError } = await supabase
                    .from('leave_requests')
                    .update({ status: 'rejected', hr_comment: 'Overridden by HR: Marked Present' })
                    .eq('user_id', employeeId)
                    .eq('status', 'approved')
                    .lte('start_date', dateStr)
                    .gte('end_date', dateStr);

                if (leaveError) throw leaveError;
            }

            // 2. Insert Attendance Log
            const { error: attError } = await supabase
                .from('attendance_logs')
                .insert({
                    user_id: employeeId,
                    work_date: dateStr,
                    clock_in: `${dateStr} T09:00:00`,
                    clock_out: `${dateStr} T17:00:00`,
                    mode: 'onsite'
                });

            if (attError) throw attError;

            // 3. Update Local State
            setEmployees(prev => prev.map(emp =>
                emp.user_id === employeeId
                    ? { ...emp, status: 'present', details: '09:00 - 17:00 (Manual)' }
                    : emp
            ));

            onUpdate();

        } catch (error: any) {
            console.error(error);
            alert('Error marking present: ' + error.message);
        }
    };

    const handleMarkAbsent = async (employeeId: string) => {
        if (!confirm('Mark this employee as Absent (Unexcused)? This will create a leave record.')) return;

        setMarkingAbsent(employeeId);
        try {
            const { error } = await supabase.from('leave_requests').insert({
                user_id: employeeId,
                start_date: dateStr,
                end_date: dateStr,
                reason: 'Unexcused Absence',
                status: 'approved', // Auto-approve
                hr_comment: `Marked absent by HR on ${new Date().toLocaleDateString()} `
            });

            if (error) throw error;

            // Update local state
            setEmployees(prev => prev.map(emp =>
                emp.user_id === employeeId
                    ? { ...emp, status: 'absent_marked', details: 'Unexcused Absence' }
                    : emp
            ));

            onUpdate(); // refresh parent if needed
        } catch (error: any) {
            alert('Error marking absent: ' + error.message);
        } finally {
            setMarkingAbsent(null);
        }
    };

    const handleBulkMarkAbsent = async () => {
        const pendingCount = stats.unaccounted;
        if (pendingCount === 0) return;

        if (!confirm(`Are you sure you want to mark ALL ${pendingCount} pending employees as ABSENT for ${date.toLocaleDateString()} ? `)) return;

        setLoading(true);
        try {
            const { data, error } = await supabase.rpc('bulk_mark_absent', { target_date: dateStr });
            if (error) throw error;

            alert(`Successfully marked ${data.affected_rows} employees as Absent.`);
            fetchDailyStats();
            onUpdate();
        } catch (error: any) {
            console.error(error);
            alert('Error running bulk action: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    const filteredEmployees = employees.filter(e =>
        e.full_name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const stats = {
        present: employees.filter(e => e.status === 'present').length,
        leave: employees.filter(e => e.status === 'leave').length,
        absent: employees.filter(e => e.status === 'absent_marked').length,
        unaccounted: employees.filter(e => e.status === 'absent').length
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] border border-gray-100 dark:border-gray-800">

                {/* Header */}
                <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            {date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
                        </h2>
                        <div className="flex items-center gap-4 mt-2 text-sm">
                            <span className="text-green-600 dark:text-green-400 font-medium">Present: {stats.present}</span>
                            <span className="text-yellow-600 dark:text-yellow-400 font-medium">On Leave: {stats.leave}</span>
                            <span className="text-red-600 dark:text-red-400 font-medium">Absent: {stats.absent}</span>
                            {stats.unaccounted > 0 && (
                                <div className="flex items-center gap-2">
                                    <span className="text-gray-500 dark:text-gray-400 font-medium">Pending: {stats.unaccounted}</span>
                                    {/* Only show bulk action for past/current days, not future */}
                                    {date <= new Date() && (
                                        <button
                                            onClick={handleBulkMarkAbsent}
                                            className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition-colors shadow-sm"
                                        >
                                            Mark All Absent
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors text-gray-500">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Search */}
                <div className="p-4 border-b border-gray-100 dark:border-gray-800">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search employee..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-800 border-none rounded-xl focus:ring-2 focus:ring-purple-500 text-sm"
                        />
                    </div>
                </div>

                {/* List */}
                <div className="overflow-y-auto flex-1 p-4 space-y-2">
                    {loading ? (
                        <div className="text-center py-8 text-gray-500">Loading attendance data...</div>
                    ) : (
                        filteredEmployees.map(emp => (
                            <div key={emp.user_id} className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-xl transition-colors border border-transparent hover:border-gray-100 dark:hover:border-gray-700">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-sm font-bold text-gray-600 dark:text-gray-300 overflow-hidden">
                                        <SafeAvatar
                                            src={emp.avatar_url}
                                            alt={emp.full_name || 'User'}
                                            className="w-full h-full"
                                            size={40}
                                        />
                                    </div>
                                    <div>
                                        <div className="font-medium text-gray-900 dark:text-white">{emp.full_name}</div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                                            {emp.status === 'present' && `Clocked in at ${emp.details} `}
                                            {emp.status === 'leave' && `On Leave: ${emp.details} `}
                                            {emp.status === 'absent_marked' && <span className="text-red-500 font-medium">Marked Absent</span>}
                                            {emp.status === 'holiday' && `Holiday: ${emp.details} `}
                                            {emp.status === 'absent' && 'No Record Found'}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    {emp.status === 'present' && (
                                        <span className="px-3 py-1 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 text-xs font-bold rounded-full">Present</span>
                                    )}

                                    {(emp.status === 'leave' || emp.status === 'absent_marked') && (
                                        <>
                                            <span className={`px-3 py-1 text-xs font-bold rounded-full ${emp.status === 'leave' ? 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300' : 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                                                }`}>
                                                {emp.status === 'leave' ? 'Leave' : 'Absent'}
                                            </span>
                                            {/* Allow overriding Leave/Absent with Present */}
                                            <button
                                                onClick={() => handleMarkPresent(emp.user_id, emp.status)}
                                                className="px-3 py-1 bg-green-50 hover:bg-green-100 dark:bg-green-900/20 dark:hover:bg-green-900/30 text-green-600 dark:text-green-400 text-xs font-bold rounded-lg border border-green-200 dark:border-green-900/30 transition-colors"
                                                title="Override and Mark Present"
                                            >
                                                Mark Present
                                            </button>
                                        </>
                                    )}

                                    {emp.status === 'holiday' && (
                                        <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-xs font-bold rounded-full">Holiday</span>
                                    )}

                                    {emp.status === 'absent' && (
                                        <>
                                            <button
                                                onClick={() => handleMarkPresent(emp.user_id, 'absent')}
                                                className="px-3 py-1.5 bg-green-50 hover:bg-green-100 dark:bg-green-900/20 dark:hover:bg-green-900/30 text-green-600 dark:text-green-400 text-xs font-bold rounded-lg transition-colors border border-green-200 dark:border-green-900/30"
                                            >
                                                Mark Present
                                            </button>
                                            <button
                                                onClick={() => handleMarkAbsent(emp.user_id)}
                                                disabled={markingAbsent === emp.user_id}
                                                className="px-3 py-1.5 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 text-xs font-bold rounded-lg transition-colors border border-red-200 dark:border-red-900/30"
                                            >
                                                {markingAbsent === emp.user_id ? 'Saving...' : 'Mark Absent'}
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                    {!loading && filteredEmployees.length === 0 && (
                        <div className="text-center py-8 text-gray-500">No employees found</div>
                    )}
                </div>
            </div>
        </div>
    );
}
