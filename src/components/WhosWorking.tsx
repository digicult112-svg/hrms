import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { toLocalISOString } from '../utils/date';
import { useAuth } from '../context/AuthContext';
import { MapPin, Briefcase, User, MonitorSmartphone } from 'lucide-react';
import SafeAvatar from './SafeAvatar';

interface ActiveEmployee {
    id: string;
    full_name: string;
    avatar_url?: string;
    designation: string;
    mode: 'onsite' | 'wfh';
    status: 'working' | 'paused';
    clock_in: string;
    last_pause_time?: string;
}

export default function WhosWorking() {
    const { profile } = useAuth();
    const [employees, setEmployees] = useState<ActiveEmployee[]>([]);
    const [loading, setLoading] = useState(true);

    const isHR = profile?.role === 'hr';

    useEffect(() => {
        if (!isHR) return;

        fetchActiveEmployees();

        // Real-time subscription for updates
        const channel = supabase
            .channel('whos-working-updates')
            .on(
                'postgres_changes',
                {
                    event: '*', // Listen to INSERT (clock-in) and UPDATE (clock-out/pause)
                    schema: 'public',
                    table: 'attendance_logs',
                    filter: `work_date = eq.${toLocalISOString()} `
                },
                () => {
                    fetchActiveEmployees();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [isHR]);

    const fetchActiveEmployees = async () => {
        const today = toLocalISOString();

        // Fetch logs for today where clock_out is NULL (still working)
        const { data, error } = await supabase
            .from('attendance_logs')
            .select(`
user_id,
    mode,
    clock_in,
    last_pause_time,
    profiles: user_id(
        id,
        full_name,
        avatar_url,
        designation
    )
            `)
            .eq('work_date', today)
            .is('clock_out', null) // Only active sessions
            .neq('status', 'rejected'); // Exclude rejected WFH requests

        if (error) {
            console.error('Error fetching active employees:', error);
            setLoading(false);
            return;
        }

        // Transform data
        const active: ActiveEmployee[] = data.map((log: any) => ({
            id: log.profiles.id,
            full_name: log.profiles.full_name,
            avatar_url: log.profiles.avatar_url,
            designation: log.profiles.designation || 'Employee',
            mode: log.mode,
            status: log.last_pause_time ? 'paused' : 'working',
            clock_in: log.clock_in,
            last_pause_time: log.last_pause_time
        }));

        setEmployees(active);
        setLoading(false);
    };

    if (!isHR) return null;

    return (
        <div className="bg-white dark:bg-gray-900 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-gray-100 dark:border-gray-800 overflow-hidden relative group transition-colors duration-200 w-full flex flex-col">
            {/* Decorative Ambient Background */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-green-50/50 dark:bg-green-900/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

            <div className="p-8 relative z-10 flex flex-col flex-1">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">Who's Working?</h3>
                        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                            <span className="font-semibold text-green-600 dark:text-green-400">{employees.filter(e => e.status === 'working').length}</span> active now
                        </p>
                    </div>
                    <div className="p-2 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-xl">
                        <MonitorSmartphone className="w-5 h-5" />
                    </div>
                </div>

                {loading ? (
                    <div className="space-y-4 animate-pulse">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-full" />
                                <div className="flex-1 space-y-2">
                                    <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded w-1/2" />
                                    <div className="h-3 bg-gray-50 dark:bg-gray-800 rounded w-1/3" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : employees.length === 0 ? (
                    <div className="flex flex-col items-center justify-center text-center py-6 text-gray-400 bg-gray-50/50 dark:bg-gray-800/50 rounded-2xl">
                        <div className="w-10 h-10 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mb-2">
                            <User className="w-5 h-5 text-gray-300 dark:text-gray-500" />
                        </div>
                        <p className="text-sm font-medium">No one has clocked in yet.</p>
                    </div>
                ) : (
                    <div className="overflow-y-auto pr-2 space-y-4 max-h-[400px] scrollbar-hide min-h-0">
                        {employees.map((emp) => (
                            <div key={emp.id} className="flex items-center gap-4 group">
                                {/* Avatar */}
                                <div className="relative">
                                    <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 overflow-hidden flex items-center justify-center text-gray-500 dark:text-gray-400 font-semibold text-sm">
                                        <SafeAvatar
                                            src={emp.avatar_url}
                                            alt={emp.full_name || 'User'}
                                            className="w-full h-full"
                                            size={40}
                                        />
                                    </div>
                                    <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 border-2 border-white dark:border-gray-900 rounded-full ${emp.status === 'paused' ? 'bg-amber-400' : 'bg-green-500'
                                        }`} />
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-sm font-bold text-gray-900 dark:text-white truncate">{emp.full_name}</h4>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{emp.designation}</p>
                                </div>

                                {/* Status Badge */}
                                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide border ${emp.mode === 'onsite'
                                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-100 dark:border-blue-900/30'
                                    : 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 border-purple-100 dark:border-purple-900/30'
                                    }`}>
                                    {emp.mode === 'onsite' ? <Briefcase className="w-3 h-3" /> : <MapPin className="w-3 h-3" />}
                                    {emp.mode === 'onsite' ? 'Office' : 'Remote'}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
