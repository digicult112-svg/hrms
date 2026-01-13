import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { notifyUser } from '../lib/notifications';
import { Check, X, Clock, FileText } from 'lucide-react';

interface PendingAttendance {
    id: string;
    user_id: string;
    clock_in: string;
    wfh_reason: string;
    status: string;
    profiles: {
        full_name: string;
        email: string;
        designation: string;
        daily_work_hours?: number;
        avatar_url?: string;
    } | {
        full_name: string;
        email: string;
        designation: string;
        daily_work_hours?: number;
        avatar_url?: string;
    }[];
}

export default function AttendanceApproval() {
    const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');
    const [pendingRequests, setPendingRequests] = useState<PendingAttendance[]>([]);
    const [historyRequests, setHistoryRequests] = useState<PendingAttendance[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchRequests();
    }, [activeTab]);

    const fetchRequests = async () => {
        setLoading(true);
        try {
            let query = supabase
                .from('attendance_logs')
                .select(`
                    id,
                    user_id,
                    clock_in,
                    wfh_reason,
                    status,
                    profiles:user_id (
                        full_name,
                        email,
                        designation,
                        designation,
                        daily_work_hours,
                        avatar_url
                    )
                `)
                .eq('mode', 'wfh')
                .order('clock_in', { ascending: false });

            if (activeTab === 'pending') {
                query = query.eq('status', 'pending');
            } else {
                query = query.neq('status', 'pending');
            }

            const { data, error } = await query;

            if (error) throw error;

            if (activeTab === 'pending') {
                setPendingRequests(data || []);
            } else {
                setHistoryRequests(data || []);
            }
        } catch (error) {
            console.error('Error fetching requests:', error);
        } finally {
            setLoading(false);
        }
    };
    const handleAction = async (id: string, action: 'approved' | 'rejected') => {
        try {
            if (action === 'rejected') {
                // 1. Mark attendance as rejected
                const { error: updateError } = await supabase
                    .from('attendance_logs')
                    .update({ status: 'rejected' })
                    .eq('id', id);

                if (updateError) throw updateError;

                // 2. Create leave request
                const request = pendingRequests.find(r => r.id === id) || historyRequests.find(r => r.id === id);
                if (request) {
                    const { error: leaveError } = await supabase
                        .from('leave_requests')
                        .insert({
                            user_id: request.user_id,
                            start_date: new Date(request.clock_in).toISOString().split('T')[0],
                            end_date: new Date(request.clock_in).toISOString().split('T')[0],
                            reason: `WFH Request Rejected: ${request.wfh_reason}`,
                            status: 'approved', // Auto-approve leave since HR rejected work
                            hr_comment: 'Automatically created upon WFH rejection'
                        });

                    if (leaveError) console.error('Error creating leave record:', leaveError);
                }
            } else {
                // For approval, auto-complete the shift based on employee's work hours
                const request = pendingRequests.find(r => r.id === id) || historyRequests.find(r => r.id === id);
                if (request) {
                    // Extract daily work hours safely
                    const profileData = Array.isArray(request.profiles) ? request.profiles[0] : request.profiles;
                    const workHours = profileData?.daily_work_hours || 8; // Default to 8 if not set

                    const clockIn = new Date(request.clock_in);
                    const clockOut = new Date(clockIn.getTime() + workHours * 60 * 60 * 1000);

                    const { error } = await supabase
                        .from('attendance_logs')
                        .update({
                            status: action,
                            clock_out: clockOut.toISOString(),
                            total_hours: workHours
                        })
                        .eq('id', id);

                    if (error) throw error;

                    // Notify Employee (Approved)
                    await notifyUser(
                        request.user_id,
                        'WFH Request Approved',
                        `Your Work From Home request for ${new Date(request.clock_in).toLocaleDateString()} has been approved.`,
                        'success'
                    );
                }
            }

            // Notify Employee (Rejected) - logic for rejection path
            if (action === 'rejected') {
                // We already handled DB updates above, just notify now
                const request = pendingRequests.find(r => r.id === id) || historyRequests.find(r => r.id === id);
                if (request) {
                    await notifyUser(
                        request.user_id,
                        'WFH Request Rejected',
                        `Your Work From Home request has been rejected. A leave record has been created automatically.`,
                        'error'
                    );
                }
            }

            // Remove from list and refresh
            setPendingRequests(prev => prev.filter(req => req.id !== id));
            // Optional: could add to history immediately, but fetching on tab switch is safer
        } catch (error: any) {
            console.error(`Error ${action} request:`, error);
            alert(`Failed to ${action} request`);
        }
    };

    if (loading && pendingRequests.length === 0 && historyRequests.length === 0) return (
        <div className="bg-white dark:bg-gray-900 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-gray-100 dark:border-gray-800 p-8 text-center h-[400px] flex items-center justify-center">
            <div className="animate-pulse flex flex-col items-center w-full">
                <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
                <div className="space-y-3 w-full max-w-sm">
                    <div className="h-16 w-full bg-gray-100 dark:bg-gray-800 rounded-xl"></div>
                    <div className="h-16 w-full bg-gray-100 dark:bg-gray-800 rounded-xl"></div>
                    <div className="h-16 w-full bg-gray-100 dark:bg-gray-800 rounded-xl"></div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="bg-white dark:bg-gray-900 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-gray-100 dark:border-gray-800 overflow-hidden relative group transition-colors w-full flex flex-col">
            {/* Decorative Ambient Background */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-orange-50/50 dark:bg-orange-900/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

            <div className="p-4 relative z-10 flex flex-col">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-orange-50 dark:bg-orange-900/20 rounded-lg text-orange-600 dark:text-orange-400">
                            <Clock className="w-4 h-4" />
                        </div>
                        <h2 className="text-base font-bold text-gray-900 dark:text-white leading-none">
                            WFH Requests
                        </h2>
                    </div>

                    <div className="flex p-0.5 bg-gray-100 dark:bg-gray-800 rounded-lg">
                        <button
                            onClick={() => setActiveTab('pending')}
                            className={`px-3 py-1 rounded-md text-xs font-semibold transition-all duration-200 ${activeTab === 'pending'
                                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                                : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                                }`}
                        >
                            Pending
                            {pendingRequests.length > 0 && (
                                <span className={`ml-1.5 px-1 py-0 rounded-full text-[9px] ${activeTab === 'pending' ? 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-400' : 'bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300'
                                    }`}>
                                    {pendingRequests.length}
                                </span>
                            )}
                        </button>
                        <button
                            onClick={() => setActiveTab('history')}
                            className={`px-3 py-1 rounded-md text-xs font-semibold transition-all duration-200 ${activeTab === 'history'
                                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                                : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                                }`}
                        >
                            History
                        </button>
                    </div>
                </div>

                <div className="space-y-3 overflow-y-auto h-[320px] pr-2 custom-scrollbar">
                    {(activeTab === 'pending' ? pendingRequests : historyRequests).length === 0 ? (
                        <div className="flex flex-col items-center justify-center text-center py-6 border border-dashed border-gray-100 dark:border-gray-800 rounded-xl bg-gray-50/50 dark:bg-gray-800/50">
                            <div className="w-10 h-10 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-2 text-gray-400">
                                <FileText className="w-5 h-5" />
                            </div>
                            <p className="text-gray-500 dark:text-gray-400 text-xs">No {activeTab} requests</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {(activeTab === 'pending' ? pendingRequests : historyRequests).map((req: any) => (
                                <div key={req.id} className="group relative bg-gray-50 dark:bg-gray-800/50 p-3 rounded-xl border border-gray-100 dark:border-gray-700 hover:bg-white dark:hover:bg-gray-800 transition-all duration-200 hover:shadow-sm">
                                    <div className="flex gap-3">
                                        {/* User Avatar */}
                                        <div className="flex-shrink-0">
                                            <div className="w-8 h-8 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300 font-bold text-xs overflow-hidden">
                                                {(Array.isArray(req.profiles) ? req.profiles[0]?.avatar_url : req.profiles?.avatar_url) ? (
                                                    <img
                                                        src={Array.isArray(req.profiles) ? req.profiles[0]?.avatar_url : req.profiles?.avatar_url}
                                                        alt="Avatar"
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    Array.isArray(req.profiles) ? req.profiles[0]?.full_name?.[0] : req.profiles?.full_name?.[0]
                                                )}
                                            </div>
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2 mb-1">
                                                <div className="min-w-0">
                                                    <h4 className="text-sm font-bold text-gray-900 dark:text-white leading-tight truncate">
                                                        {Array.isArray(req.profiles) ? req.profiles[0]?.full_name : req.profiles?.full_name}
                                                    </h4>
                                                    <p className="text-[10px] font-medium text-purple-600 dark:text-purple-400 truncate">
                                                        {Array.isArray(req.profiles) ? req.profiles[0]?.designation : req.profiles?.designation}
                                                    </p>
                                                </div>
                                                <div className="text-[10px] font-medium text-gray-400 whitespace-nowrap">
                                                    {new Date(req.clock_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                            </div>

                                            <div className="text-xs text-gray-600 dark:text-gray-300 italic mb-3 line-clamp-2">
                                                "{req.wfh_reason}"
                                            </div>

                                            {activeTab === 'pending' ? (
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => handleAction(req.id, 'approved')}
                                                        className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg text-xs font-bold transition-colors hover:bg-black dark:hover:bg-gray-200"
                                                    >
                                                        <Check className="w-3 h-3" />
                                                        Approve
                                                    </button>
                                                    <button
                                                        onClick={() => handleAction(req.id, 'rejected')}
                                                        className="px-3 py-1.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 rounded-lg hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                                    >
                                                        <X className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2">
                                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border ${req.status === 'approved'
                                                        ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border-green-100 dark:border-green-900/30'
                                                        : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border-red-100 dark:border-red-900/30'
                                                        }`}>
                                                        {req.status}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
