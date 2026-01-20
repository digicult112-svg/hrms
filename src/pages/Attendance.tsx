import { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';

import { useAuth } from '../context/AuthContext';
import AttendanceControl from '../components/AttendanceControl';
import AttendanceApproval from '../components/AttendanceApproval';
import AttendanceHistory from '../components/AttendanceHistory';
import ExportAttendanceModal from '../components/ExportAttendanceModal';
import AbsenceCalendar from '../components/AbsenceCalendar';
import { Calendar as CalendarIcon, List } from 'lucide-react';
import { toLocalISOString } from '../utils/date';

export default function AttendancePage() {
    const { user, profile } = useAuth();
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<'my' | 'all'>('my');
    const [hrView, setHrView] = useState<'list' | 'calendar'>('list'); // [NEW]
    const [initialized, setInitialized] = useState(false);

    // Form filters
    const [dateFilter, setDateFilter] = useState('');
    const [employeeFilter, setEmployeeFilter] = useState('');
    const [recordTab, setRecordTab] = useState<'today' | 'history'>('today');

    // Stats
    const [weeklyHours, setWeeklyHours] = useState<string>('0.0');
    const [weeklyChange, setWeeklyChange] = useState<{ value: string; type: 'increase' | 'decrease' | 'neutral' }>({ value: '0', type: 'neutral' });

    // Export Modal
    const [showExportModal, setShowExportModal] = useState(false);

    useEffect(() => {
        if (profile && !initialized) {
            if (profile.role === 'hr') {
                setViewMode('all');
            }
            setInitialized(true);
        }
    }, [profile, initialized]);

    useEffect(() => {
        fetchLogs();
    }, [user, viewMode, dateFilter, employeeFilter, recordTab]);

    useEffect(() => {
        if (user) fetchWeeklySummary();
    }, [user, viewMode]);

    const fetchWeeklySummary = async () => {
        try {
            const today = new Date();
            const startOfCurrentWeek = new Date(today);
            startOfCurrentWeek.setDate(today.getDate() - 6); // Last 7 days including today

            const startOfLastWeek = new Date(startOfCurrentWeek);
            startOfLastWeek.setDate(startOfCurrentWeek.getDate() - 7); // The 7 days before that
            const endOfLastWeek = new Date(startOfCurrentWeek);
            endOfLastWeek.setDate(startOfCurrentWeek.getDate() - 1);

            let query = supabase
                .from('attendance_logs')
                .select(`
                    clock_in, 
                    clock_out, 
                    work_date,
                    profiles:user_id!inner(deleted_at)
                `)
                .is('profiles.deleted_at', null)
                .gte('work_date', toLocalISOString(startOfLastWeek))
                .lte('work_date', toLocalISOString(today));

            if (viewMode === 'my') {
                query = query.eq('user_id', user?.id);
            }

            const { data, error } = await query;
            if (error) throw error;

            let currentWeekMinutes = 0;
            let lastWeekMinutes = 0;

            const currentWeekStartStr = toLocalISOString(startOfCurrentWeek);

            data?.forEach((log: any) => {
                if (log.clock_in && log.clock_out) {
                    const duration = (new Date(log.clock_out).getTime() - new Date(log.clock_in).getTime()) / 60000;
                    if (log.work_date >= currentWeekStartStr) {
                        currentWeekMinutes += duration;
                    } else {
                        lastWeekMinutes += duration;
                    }
                }
            });

            const currentHours = currentWeekMinutes / 60;
            const lastHours = lastWeekMinutes / 60;

            setWeeklyHours(currentHours.toFixed(1));

            // Calculate Percentage Change
            if (lastHours === 0) {
                setWeeklyChange({
                    value: currentHours > 0 ? '100' : '0',
                    type: currentHours > 0 ? 'increase' : 'neutral'
                });
            } else {
                const percentChange = ((currentHours - lastHours) / lastHours) * 100;
                setWeeklyChange({
                    value: Math.abs(percentChange).toFixed(0),
                    type: percentChange > 0 ? 'increase' : percentChange < 0 ? 'decrease' : 'neutral'
                });
            }

        } catch (error) {
            console.error('Error fetching weekly summary:', error);
        }
    };

    const lastRequestRef = useRef(0);

    const fetchLogs = async () => {
        const requestId = ++lastRequestRef.current;
        setLoading(true);
        try {
            let query = supabase
                .from('attendance_logs')
                .select(`
                    *,
                    profiles:user_id!inner (
                        full_name,
                        email,
                        avatar_url,
                        deleted_at
                    )
                `)
                .is('profiles.deleted_at', null)
                .order('work_date', { ascending: false });

            // If we are HR and in 'all' mode, we fetch everyone.
            // If we are regular user or in 'my' mode, we fetch only our own.
            if (viewMode === 'my') {
                query = query.eq('user_id', user?.id);
            }

            if (recordTab === 'today') {
                const today = toLocalISOString(new Date());
                query = query.eq('work_date', today);
            } else {
                // History tab
                const today = toLocalISOString(new Date());
                query = query.neq('work_date', today);

                if (dateFilter) {
                    query = query.eq('work_date', dateFilter);
                }
            }

            const { data, error } = await query;

            // Check if this is still the latest request
            if (requestId !== lastRequestRef.current) return;

            if (error) throw error;

            let filteredData = data || [];

            // Client-side filter for employee name
            if (employeeFilter && viewMode === 'all') {
                filteredData = filteredData.filter((log: any) =>
                    log.profiles?.full_name.toLowerCase().includes(employeeFilter.toLowerCase()) ||
                    log.profiles?.email.toLowerCase().includes(employeeFilter.toLowerCase())
                );
            }

            setLogs(filteredData);
        } catch (error) {
            console.error('Error fetching attendance logs:', error);
        } finally {
            if (requestId === lastRequestRef.current) {
                setLoading(false);
            }
        }
    };

    // Replaced simple download with modal
    const handleExportClick = () => {
        setShowExportModal(true);
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-500">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">Attendance</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1 text-lg">Manage and track employee attendance</p>
                </div>

                {/* View Switcher Controls */}
                <div className="flex gap-4">
                    <div className="bg-gray-100/50 dark:bg-gray-800/50 p-1 rounded-xl border border-gray-200 dark:border-gray-700 flex items-center">
                        <button
                            onClick={() => setHrView('list')}
                            className={`p-2 rounded-lg transition-all ${hrView === 'list'
                                ? 'bg-white dark:bg-gray-700 text-purple-600 dark:text-purple-400 shadow-sm'
                                : 'text-gray-400 hover:text-gray-600'
                                }`}
                            title="List View"
                        >
                            <List className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => setHrView('calendar')}
                            className={`p-2 rounded-lg transition-all ${hrView === 'calendar'
                                ? 'bg-white dark:bg-gray-700 text-purple-600 dark:text-purple-400 shadow-sm'
                                : 'text-gray-400 hover:text-gray-600'
                                }`}
                            title="Calendar View"
                        >
                            <CalendarIcon className="w-5 h-5" />
                        </button>
                    </div>

                    {profile?.role === 'hr' && (
                        <div className="bg-gray-100/50 dark:bg-gray-800/50 p-1.5 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-inner inline-flex self-start transition-colors">
                            <button
                                onClick={() => setViewMode('my')}
                                className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${viewMode === 'my'
                                    ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-lg shadow-gray-200 dark:shadow-black/20 ring-1 ring-black/5 dark:ring-white/10'
                                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200/50 dark:hover:bg-gray-700/50'
                                    }`}
                            >
                                My Attendance
                            </button>
                            <button
                                onClick={() => setViewMode('all')}
                                className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${viewMode === 'all'
                                    ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-lg shadow-gray-200 dark:shadow-black/20 ring-1 ring-black/5 dark:ring-white/10'
                                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200/50 dark:hover:bg-gray-700/50'
                                    }`}
                            >
                                All Employees
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Content Logic */}
            {hrView === 'calendar' ? (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <AbsenceCalendar userId={viewMode === 'my' ? user?.id : undefined} />
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column: Controls (Timer / Approval) */}
                    <div className="lg:col-span-1 space-y-8">
                        {profile?.role === 'hr' && viewMode === 'all' ? (
                            <AttendanceApproval />
                        ) : (
                            <AttendanceControl onAttendanceUpdate={fetchLogs} />
                        )}

                        {/* Quick Stats Card */}
                        <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] p-8 shadow-xl shadow-gray-200/50 dark:shadow-gray-900/20 relative overflow-hidden group border border-gray-100 dark:border-gray-800">
                            <div className="relative z-10">
                                <h3 className="text-gray-500 dark:text-gray-400 font-medium mb-1 uppercase tracking-wider text-xs">Weekly Summary</h3>
                                <div className="text-5xl font-bold mb-6 tracking-tight text-gray-900 dark:text-white">{weeklyHours}<span className="text-2xl text-gray-400 dark:text-gray-500 font-medium">h</span></div>
                                <div className="flex items-center gap-3">
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1 ${weeklyChange.type === 'increase'
                                        ? 'bg-green-500/10 dark:bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/10 dark:border-green-500/20'
                                        : weeklyChange.type === 'decrease'
                                            ? 'bg-red-500/10 dark:bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/10 dark:border-red-500/20'
                                            : 'bg-gray-500/10 dark:bg-gray-500/20 text-gray-600 dark:text-gray-400 border-gray-500/10 dark:border-gray-500/20'
                                        }`}>
                                        <span className={`w-1.5 h-1.5 rounded-full ${weeklyChange.type === 'increase'
                                            ? 'bg-green-500 dark:bg-green-400'
                                            : weeklyChange.type === 'decrease'
                                                ? 'bg-red-500 dark:bg-red-400'
                                                : 'bg-gray-500 dark:bg-gray-400'
                                            }`}></span>
                                        {weeklyChange.type === 'increase' ? '+' : weeklyChange.type === 'decrease' ? '-' : ''}
                                        {weeklyChange.value}%
                                    </span>
                                    <span className="text-sm text-gray-500 font-medium">vs last week</span>
                                </div>
                            </div>

                            {/* Abstract shapes */}
                            <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-purple-500/10 dark:bg-purple-500/30 rounded-full blur-[80px] group-hover:bg-purple-500/20 dark:group-hover:bg-purple-500/40 transition-all duration-500"></div>
                            <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-48 h-48 bg-indigo-500/10 dark:bg-indigo-500/20 rounded-full blur-[60px] group-hover:bg-indigo-500/15 dark:group-hover:bg-indigo-500/30 transition-all duration-500"></div>
                        </div>
                    </div>

                    {/* Right Column: History Table */}
                    <div className="lg:col-span-2">
                        <AttendanceHistory
                            logs={logs}
                            loading={loading}
                            viewMode={viewMode}
                            recordTab={recordTab}
                            onTabChange={setRecordTab}
                            employeeFilter={employeeFilter}
                            onEmployeeFilterChange={setEmployeeFilter}
                            dateFilter={dateFilter}
                            onDateFilterChange={setDateFilter}
                            onExport={handleExportClick}
                        />
                    </div>
                </div>
            )}

            <ExportAttendanceModal
                isOpen={showExportModal}
                onClose={() => setShowExportModal(false)}
                currentUserId={user?.id}
            />
        </div>
    );
}
