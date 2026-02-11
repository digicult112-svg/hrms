import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toLocalISOString } from '../utils/date';
import DailyAttendanceModal from './DailyAttendanceModal';

interface DayStats {
    date: string;
    present: number;
    leaves: number;
    absent_marked: number;
    // Personal Mode
    status?: 'present' | 'leave' | 'absent' | 'none';
}

interface AbsenceCalendarProps {
    userId?: string; // If provided, shows single user view
}

export default function AbsenceCalendar({ userId }: AbsenceCalendarProps) {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [stats, setStats] = useState<DayStats[]>([]);
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [loading, setLoading] = useState(false);

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 = Sun

    useEffect(() => {
        fetchMonthStats();
    }, [currentDate, userId]); // Refetch when userId changes

    const fetchMonthStats = async () => {
        setLoading(true);
        const startDate = toLocalISOString(new Date(year, month, 1));
        const endDate = toLocalISOString(new Date(year, month + 1, 0));

        try {
            // HR Mode: Auto-mark absent employees for working days they didn't login
            if (!userId) {
                try {
                    // CLEANUP: Fix previous bug where future dates were marked absent
                    // We delete any "Unexcused Absence" for today or future dates
                    const todayStr = toLocalISOString().split('T')[0];

                    // Try RPC first (bypass RLS)
                    try {
                        await supabase.rpc('cleanup_future_absences');
                    } catch (err) {
                        // Fallback to direct delete if RPC not found yet
                        await supabase.from('leave_requests')
                            .delete()
                            .eq('reason', 'Unexcused Absence')
                            .gte('start_date', todayStr);
                    }

                    // Cap RPC check date to yesterday to avoid marking future/today as absent
                    const yesterday = new Date();
                    yesterday.setDate(yesterday.getDate() - 1);

                    const lastDayOfMonth = new Date(year, month + 1, 0);
                    const rpcEndDate = lastDayOfMonth > yesterday ? yesterday : lastDayOfMonth;

                    if (rpcEndDate >= new Date(year, month, 1)) {
                        await supabase.rpc('mark_absent_for_missing_days', {
                            check_from_date: startDate,
                            check_to_date: toLocalISOString(rpcEndDate)
                        });
                    }
                } catch (err) {
                    console.error('Error marking absent employees:', err);
                    // Don't fail the whole operation if this fails
                }
            }

            let queryLogs = supabase
                .from('attendance_logs')
                .select('work_date, user_id, status')
                .gte('work_date', startDate)
                .lte('work_date', endDate);

            if (userId) queryLogs = queryLogs.eq('user_id', userId);
            const { data: logs } = await queryLogs;

            // 2. Fetch Active Leaves
            let queryLeaves = supabase
                .from('leave_requests')
                .select('start_date, end_date, status, reason, user_id')
                .eq('status', 'approved')
                .or(`start_date.lte.${endDate},end_date.gte.${startDate}`);

            if (userId) queryLeaves = queryLeaves.eq('user_id', userId);
            const { data: leaves } = await queryLeaves;

            // Build map
            const statsMap: Record<string, DayStats> = {};

            for (let i = 1; i <= daysInMonth; i++) {
                const day = String(i).padStart(2, '0');
                const monthStr = String(month + 1).padStart(2, '0');
                const dateStr = `${year}-${monthStr}-${day}`;
                statsMap[dateStr] = { date: dateStr, present: 0, leaves: 0, absent_marked: 0, status: 'none' };
            }

            const todayStr = toLocalISOString();

            // Fill Present
            logs?.forEach(log => {
                // Ignore future attendance logs (likely bad data)
                if (log.work_date > todayStr) return;

                // Only count as present if log is approved
                if (statsMap[log.work_date] && log.status === 'approved') {
                    statsMap[log.work_date].present++;
                    if (userId) statsMap[log.work_date].status = 'present';
                }
            });

            // Fill Leaves (Range handling)
            leaves?.forEach(leave => {
                let curr = new Date(leave.start_date);
                const end = new Date(leave.end_date);
                const isUnexcused = leave.reason === 'Unexcused Absence';

                while (curr <= end) {
                    const dStr = toLocalISOString(curr);
                    if (statsMap[dStr]) {
                        if (isUnexcused) {
                            statsMap[dStr].absent_marked++;
                            if (userId) statsMap[dStr].status = 'absent';
                        } else {
                            statsMap[dStr].leaves++;
                            if (userId) statsMap[dStr].status = 'leave';
                        }
                    }
                    curr.setDate(curr.getDate() + 1);
                }
            });

            setStats(Object.values(statsMap));
        } catch (error) {
            console.error('Error fetching stats:', error);
        } finally {
            setLoading(false);
        }
    };

    const handlePrevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
    const handleNextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

    return (
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-100 dark:border-gray-800 shadow-sm">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">{userId ? 'My Attendance Calendar' : 'Company Absence Calendar'}</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        {userId ? 'Track your daily attendance status' : 'Click a day to manage attendance'}
                    </p>
                </div>
                <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 p-1 rounded-xl">
                    <button onClick={handlePrevMonth} className="p-2 hover:bg-white dark:hover:bg-gray-700 rounded-lg transition-all shadow-sm">
                        <ChevronLeft className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                    </button>
                    <span className="min-w-[140px] text-center font-bold text-sm text-gray-700 dark:text-gray-200">
                        {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                    </span>
                    <button onClick={handleNextMonth} className="p-2 hover:bg-white dark:hover:bg-gray-700 rounded-lg transition-all shadow-sm">
                        <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                    </button>
                </div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-7 mb-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="text-center text-xs font-bold text-gray-400 uppercase tracking-wider py-2">
                        {day}
                    </div>
                ))}
            </div>
            <div className="grid grid-cols-7 gap-2">
                {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                    <div key={`empty-${i}`} className="h-24" />
                ))}

                {stats.map(dayStat => {
                    const dateObj = new Date(dayStat.date);
                    const isToday = dayStat.date === toLocalISOString();
                    const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;

                    return (
                        <div
                            key={dayStat.date}
                            // Only allow click if NOT single user mode (Admin function)
                            onClick={() => !userId && setSelectedDate(dateObj)}
                            className={`
                                h-24 rounded-xl border p-2 flex flex-col justify-between transition-all 
                                ${!userId ? 'cursor-pointer hover:scale-[1.02] hover:shadow-md' : 'cursor-default'}
                                ${isToday
                                    ? 'border-purple-500 bg-purple-50/50 dark:bg-purple-900/10'
                                    : 'border-gray-100 dark:border-gray-800 bg-gray-50/30 dark:bg-gray-800/30'
                                }
                                ${!userId ? 'hover:border-purple-200 dark:hover:border-purple-800' : ''}
                            `}
                        >
                            <span className={`text-sm font-bold ${isToday ? 'text-purple-600' : 'text-gray-700 dark:text-gray-300'}`}>
                                {dateObj.getDate()}
                            </span>

                            {!loading && !isWeekend && (
                                <div className="space-y-1 w-full relative h-full">
                                    {/* PERSONAL MODE */}
                                    {userId ? (
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            {dayStat.status === 'present' && <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-bold px-2 py-1 rounded w-full text-center">Present</span>}
                                            {dayStat.status === 'leave' && <span className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 text-xs font-bold px-2 py-1 rounded w-full text-center">Leave</span>}
                                            {dayStat.status === 'absent' && <span className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs font-bold px-2 py-1 rounded w-full text-center">Absent</span>}
                                        </div>
                                    ) : (
                                        /* AGGREGATE MODE (HR) */
                                        <>
                                            {dayStat.present > 0 && (
                                                <div className="flex items-center justify-between text-[10px] bg-green-100 dark:bg-green-900/20 px-1.5 py-0.5 rounded text-green-700 dark:text-green-300 font-medium">
                                                    <span>Present</span>
                                                    <span>{dayStat.present}</span>
                                                </div>
                                            )}
                                            {dayStat.leaves > 0 && (
                                                <div className="flex items-center justify-between text-[10px] bg-yellow-100 dark:bg-yellow-900/20 px-1.5 py-0.5 rounded text-yellow-700 dark:text-yellow-300 font-medium">
                                                    <span>Leave</span>
                                                    <span>{dayStat.leaves}</span>
                                                </div>
                                            )}
                                            {dayStat.absent_marked > 0 && (
                                                <div className="flex items-center justify-between text-[10px] bg-red-100 dark:bg-red-900/20 px-1.5 py-0.5 rounded text-red-700 dark:text-red-300 font-medium">
                                                    <span>Absent</span>
                                                    <span>{dayStat.absent_marked}</span>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Modal only for Aggregate Mode */}
            {selectedDate && !userId && (
                <DailyAttendanceModal
                    isOpen={!!selectedDate}
                    onClose={() => setSelectedDate(null)}
                    date={selectedDate}
                    onUpdate={() => {
                        fetchMonthStats();
                    }}
                />
            )}
        </div>
    );
}
