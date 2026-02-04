import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import AttendanceControl from '../components/AttendanceControl';
import AttendanceApproval from '../components/AttendanceApproval';
import OfficeLocationSettings from '../components/OfficeLocationSettings';
import PayrollSettings from '../components/PayrollSettings';
import NotificationSettings from '../components/NotificationSettings';
import WhosWorking from '../components/WhosWorking';
import SafeAvatar from '../components/SafeAvatar';
import Announcements from '../components/Announcements';

export default function Dashboard() {
    const navigate = useNavigate();
    const { profile } = useAuth();
    const isHR = profile?.role === 'hr';

    const [notificationsEnabled, setNotificationsEnabled] = useState(false);

    // 1. Sync Notification Settings & Check Birthdays
    useEffect(() => {
        let mounted = true;

        const fetchSettings = async () => {
            const { data } = await supabase
                .from('system_settings')
                .select('value')
                .eq('key', 'enable_clock_in_notifications')
                .single();

            if (mounted && data) {
                setNotificationsEnabled(Boolean(data.value));
            }
        };

        fetchSettings();

        // Listen for setting changes
        const settingsChannel = supabase
            .channel('settings_watch')
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'system_settings',
                    filter: "key=eq.enable_clock_in_notifications"
                },
                (payload) => {
                    if (mounted) {
                        setNotificationsEnabled(Boolean(payload.new.value));
                    }
                }
            )
            .subscribe();

        return () => {
            mounted = false;
            supabase.removeChannel(settingsChannel);
        };
    }, []);

    // 2. Attendance Log Listener
    useEffect(() => {
        if (!isHR || !notificationsEnabled) return;

        console.log('Subscribing to attendance logs...');

        const channel = supabase
            .channel('room:attendance_logs_hr')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'attendance_logs'
                },
                async (payload) => {
                    console.log('Received attendance log:', payload);
                    // const newLog = payload.new;

                    // Allow HR to see their own notifications for testing purposes
                    // if (newLog.user_id === profile?.id) return;

                    // Fetch user name
                    // const { data: userProfile } = await supabase
                    //     .from('profiles')
                    //     .select('full_name')
                    //     .eq('id', newLog.user_id)
                    //     .single();

                    // const name = userProfile?.full_name || 'An employee';
                    // const title = 'Clock In Alert';
                    // const body = `${name} has just clocked in.`;

                    // Show in-app notification
                    // setNotification({ title, body });
                    // Auto-dismiss after 5 seconds
                    // setTimeout(() => setNotification(null), 5000);
                }
            )
            .subscribe((status) => {
                console.log('Subscription status:', status);
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, [isHR, notificationsEnabled, profile?.id]);

    return (
        <div className="relative">
            {/* Sleek Floating Notification Toast */}


            {/* Dashboard Content */}
            <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">

                {/* 1. Hero Section */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <h1 className="text-4xl font-bold text-gray-900 dark:text-white tracking-tight">
                            Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 18 ? 'Afternoon' : 'Evening'},
                            <span className="text-purple-600 dark:text-purple-400"> {profile?.full_name?.split(' ')[0]}</span>
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400 mt-2 text-lg font-medium">
                            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        </p>
                    </div>

                    {isHR && (
                        <div className="flex items-center gap-3 bg-white dark:bg-gray-900 p-1 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm transition-colors duration-200">
                            <div className="px-4 py-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-100 dark:border-purple-900/30">
                                <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Role</span>
                                <div className="text-sm font-bold text-purple-700 dark:text-purple-300 capitalize">{profile?.role}</div>
                            </div>
                            <div className="h-8 w-px bg-gray-200 dark:bg-gray-700"></div>
                            <NotificationSettings />
                        </div>
                    )}
                </div>

                {/* Main Content Area */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* HR View */}
                    {isHR && (
                        <>
                            {/* Left Column (Main) */}
                            <div className="lg:col-span-2 space-y-8">
                                <section>
                                    <AttendanceControl />
                                </section>
                                <section>
                                    <Announcements />
                                </section>
                                <div className="w-full">
                                    <OfficeLocationSettings />
                                </div>
                                <div className="w-full">
                                    <PayrollSettings />
                                </div>
                            </div>

                            {/* Right Column (Sidebar) */}
                            <div className="space-y-8">
                                <WhosWorking />
                                <AttendanceApproval />
                            </div>
                        </>
                    )}

                    {/* Non-HR View */}
                    {!isHR && (
                        <>
                            <div className="lg:col-span-2 space-y-8">
                                <AttendanceControl />
                                <Announcements />
                            </div>

                            <div className="lg:col-span-1 space-y-8">
                                <div className="bg-gradient-to-br from-purple-600 to-indigo-700 rounded-[2.5rem] p-6 text-white shadow-2xl shadow-purple-900/20 relative overflow-hidden h-fit flex flex-col sticky top-8">
                                    <div className="relative z-10">
                                        <div className="mb-4 w-20 h-20 rounded-full bg-white/20 backdrop-blur-md border-2 border-white/30 flex items-center justify-center overflow-hidden shadow-2xl">
                                            <SafeAvatar
                                                src={profile?.avatar_url}
                                                alt={profile?.full_name || 'User'}
                                                className="w-full h-full"
                                                size={80}
                                            />
                                        </div>

                                        <h3 className="text-purple-100 font-medium mb-2 uppercase tracking-wider text-xs flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-white"></div>
                                            Your Profile
                                        </h3>
                                        <div className="text-3xl font-bold mb-2 mt-2">{profile?.full_name || 'Employee'}</div>
                                        {profile?.designation && <div className="text-lg text-purple-200 font-medium mb-4">{profile.designation}</div>}

                                        <p className="text-purple-100/80 text-sm leading-relaxed mb-6">
                                            Manage your personal information, view your employment history, and access important documents directly from your dashboard.
                                        </p>
                                        <div className="flex flex-col gap-3">
                                            <button
                                                onClick={() => navigate('/profile')}
                                                className="w-full bg-white text-purple-600 hover:bg-purple-50 px-6 py-3 rounded-xl text-sm font-bold transition-all shadow-lg shadow-purple-900/10 flex items-center justify-center active:scale-95"
                                            >
                                                View Profile
                                            </button>
                                            <button
                                                onClick={() => navigate('/leave')}
                                                className="w-full bg-purple-800/40 hover:bg-purple-800/60 border border-purple-400/30 text-white px-6 py-3 rounded-xl text-sm font-bold transition-all backdrop-blur-sm flex items-center justify-center active:scale-95"
                                            >
                                                Request Leave
                                            </button>
                                        </div>
                                    </div>
                                    {/* Ornamental Circles */}
                                    <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
                                    <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 bg-purple-500/30 rounded-full blur-3xl"></div>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
