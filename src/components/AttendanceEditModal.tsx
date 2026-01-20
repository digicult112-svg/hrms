import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { toLocalISOString } from '../utils/date';
import { X, Save, Trash2, Calendar, User as UserIcon } from 'lucide-react';
import { useToast } from '../context/ToastContext';

interface AttendanceEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    log: any | null; // If null, adding new
    onSuccess: () => void;
    // For adding new log, we might need list of employees if not passed
}

export default function AttendanceEditModal({ isOpen, onClose, log, onSuccess }: AttendanceEditModalProps) {
    const { success, error: toastError } = useToast();
    const [loading, setLoading] = useState(false);

    // Form State
    const [userId, setUserId] = useState('');
    const [date, setDate] = useState('');
    const [clockIn, setClockIn] = useState('');
    const [clockOut, setClockOut] = useState('');
    const [mode, setMode] = useState<'onsite' | 'wfh'>('onsite');
    const [status, setStatus] = useState<'approved' | 'rejected' | 'pending'>('approved');

    // For Employee dropdown
    const [employees, setEmployees] = useState<any[]>([]);

    useEffect(() => {
        if (isOpen) {
            fetchEmployees();
            if (log) {
                setUserId(log.user_id);
                setDate(log.work_date);
                setClockIn(log.clock_in ? new Date(log.clock_in).toTimeString().slice(0, 5) : '');
                setClockOut(log.clock_out ? new Date(log.clock_out).toTimeString().slice(0, 5) : '');
                setMode(log.mode);
                setStatus(log.status || 'approved');
            } else {
                // Default new
                setUserId('');
                setDate(toLocalISOString());
                setClockIn('09:00');
                setClockOut('17:00');
                setMode('onsite');
                setStatus('approved');
            }
        }
    }, [isOpen, log]);

    const fetchEmployees = async () => {
        const { data } = await supabase.from('profiles').select('id, full_name, email').order('full_name');
        setEmployees(data || []);
    };

    const handleSave = async () => {
        if (!userId || !date || !clockIn) {
            toastError("Please fill required fields (Employee, Date, Clock In)");
            return;
        }

        setLoading(true);
        try {
            // Construct ISO strings
            // Date + Time
            const inTime = new Date(`${date}T${clockIn}:00`);
            const outTime = clockOut ? new Date(`${date}T${clockOut}:00`) : null;

            // Calculate total hours
            let totalHours = 0;
            if (outTime) {
                totalHours = (outTime.getTime() - inTime.getTime()) / (1000 * 3600);
            }

            const payload = {
                user_id: userId,
                work_date: date,
                clock_in: inTime.toISOString(),
                clock_out: outTime ? outTime.toISOString() : null,
                mode,
                status,
                total_hours: parseFloat(totalHours.toFixed(2))
            };

            if (log?.id) {
                // Update
                const { error } = await supabase.from('attendance_logs').update(payload).eq('id', log.id);
                if (error) throw error;
                success("Attendance updated successfully");
            } else {
                // Insert
                const { error } = await supabase.from('attendance_logs').insert(payload);
                if (error) throw error;
                success("Attendance added successfully");
            }
            onSuccess();
            onClose();
        } catch (error: any) {
            console.error('Error saving attendance:', error);
            toastError(error.message || "Failed to save");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!log?.id || !window.confirm("Are you sure you want to delete this attendance record?")) return;

        setLoading(true);
        try {
            const { error } = await supabase.from('attendance_logs').delete().eq('id', log.id);
            if (error) throw error;
            success("Record deleted");
            onSuccess();
            onClose();
        } catch (error: any) {
            toastError("Failed to delete");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl max-w-lg w-full p-6 border border-gray-200 dark:border-gray-800 animate-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                        {log ? 'Edit Attendance' : 'Add Attendance'}
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="space-y-4">
                    {/* Employee Select */}
                    <div>
                        <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Employee</label>
                        <div className="relative">
                            <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <select
                                value={userId}
                                onChange={(e) => setUserId(e.target.value)}
                                disabled={!!log} // Disable changing user on edit for simplicity
                                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-purple-500/50 appearance-none text-gray-900 dark:text-white"
                            >
                                <option value="">Select Employee</option>
                                {employees.map(emp => (
                                    <option key={emp.id} value={emp.id}>{emp.full_name} ({emp.email})</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Date */}
                    <div>
                        <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Date</label>
                        <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-purple-500/50 text-gray-900 dark:text-white"
                            />
                        </div>
                    </div>

                    {/* Times */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Clock In</label>
                            <input
                                type="time"
                                value={clockIn}
                                onChange={(e) => setClockIn(e.target.value)}
                                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-purple-500/50 text-gray-900 dark:text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Clock Out</label>
                            <input
                                type="time"
                                value={clockOut}
                                onChange={(e) => setClockOut(e.target.value)}
                                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-purple-500/50 text-gray-900 dark:text-white"
                            />
                        </div>
                    </div>

                    {/* Mode & Status */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Mode</label>
                            <select
                                value={mode}
                                onChange={(e) => setMode(e.target.value as any)}
                                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-purple-500/50 text-gray-900 dark:text-white appearance-none"
                            >
                                <option value="onsite">Onsite</option>
                                <option value="wfh">Work From Home</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Status</label>
                            <select
                                value={status}
                                onChange={(e) => setStatus(e.target.value as any)}
                                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-purple-500/50 text-gray-900 dark:text-white appearance-none"
                            >
                                <option value="approved">Approved</option>
                                <option value="pending">Pending</option>
                                <option value="rejected">Rejected</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div className="mt-8 flex gap-3">
                    {log && (
                        <button
                            onClick={handleDelete}
                            disabled={loading}
                            className="px-4 py-2.5 rounded-xl border border-red-200 dark:border-red-900/30 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        >
                            <Trash2 className="w-5 h-5" />
                        </button>
                    )}
                    <button
                        onClick={handleSave}
                        disabled={loading}
                        className="flex-1 px-4 py-2.5 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold transition-all hover:opacity-90 flex items-center justify-center gap-2"
                    >
                        {loading ? 'Saving...' : (
                            <>
                                <Save className="w-4 h-4" />
                                Save Changes
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
