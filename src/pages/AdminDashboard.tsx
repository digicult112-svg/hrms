import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { MessageSquare, Clock, ShieldAlert, Users, Calendar, FileText } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import SystemDataSettings from '../components/SystemDataSettings';
import type { AnonymousMessage } from '../types';

export default function AdminDashboard() {
    const { profile } = useAuth();
    const [messages, setMessages] = useState<AnonymousMessage[]>([]);
    const [employees, setEmployees] = useState<any[]>([]);
    const [attendanceLogs, setAttendanceLogs] = useState<any[]>([]);
    const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'feedback' | 'employees' | 'attendance' | 'leave' | 'settings'>('feedback');
    const { error: toastError } = useToast();

    useEffect(() => {
        if (profile?.role === 'admin') {
            fetchAllData();
        }
    }, [profile]);

    const fetchAllData = async () => {
        setLoading(true);
        try {
            // Fetch feedback messages
            console.log('🔍 Fetching feedback messages...');
            const { data: messagesData, error: messagesError } = await supabase
                .from('anonymous_messages')
                .select(`
                    *,
                    profiles!user_id (
                        full_name,
                        email,
                        avatar_url
                    )
                `)
                .order('created_at', { ascending: false });

            if (messagesError) {
                console.error('❌ Error fetching messages:', messagesError);
                toastError(`Failed to load feedback: ${messagesError.message}`);
            } else {
                console.log('✅ Fetched messages:', messagesData);
                console.log('📊 Message count:', messagesData?.length || 0);
            }

            // Fetch employees
            const { data: employeesData, error: employeesError } = await supabase
                .from('profiles')
                .select('*')
                .is('deleted_at', null)
                .order('full_name', { ascending: true });

            if (employeesError) {
                console.error('❌ Error fetching employees:', employeesError);
            } else {
                console.log('✅ Fetched employees:', employeesData?.length || 0);
            }

            // Fetch recent attendance (last 30 days)
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            const { data: attendanceData, error: attendanceError } = await supabase
                .from('attendance_logs')
                .select(`
                    *,
                    profiles:user_id (
                        full_name,
                        email
                    )
                `)
                .gte('work_date', thirtyDaysAgo.toISOString().split('T')[0])
                .order('work_date', { ascending: false });

            if (attendanceError) {
                console.error('❌ Error fetching attendance:', attendanceError);
            }

            // Fetch leave requests
            const { data: leaveData, error: leaveError } = await supabase
                .from('leave_requests')
                .select(`
                    *,
                    profiles:user_id (
                        full_name,
                        email
                    )
                `)
                .order('created_at', { ascending: false })
                .limit(50);

            if (leaveError) {
                console.error('❌ Error fetching leave:', leaveError);
            }

            setMessages(messagesData || []);
            setEmployees(employeesData || []);
            setAttendanceLogs(attendanceData || []);
            setLeaveRequests(leaveData || []);
        } catch (error: any) {
            console.error('💥 Fatal error fetching admin data:', error);
            toastError('Failed to load admin data');
        } finally {
            setLoading(false);
        }
    };

    if (profile?.role !== 'admin') {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] text-center p-8">
                <ShieldAlert className="w-16 h-16 text-red-500 mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Access Denied</h2>
                <p className="text-gray-500">You do not have permission to view this page.</p>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 py-8 animate-in fade-in duration-500">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                    <ShieldAlert className="w-8 h-8 text-purple-600" />
                    Admin Dashboard
                </h1>
                <p className="text-gray-500 dark:text-gray-400 mt-2">Comprehensive system management and oversight.</p>
            </div>

            {/* Tab Navigation */}
            <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
                <nav className="flex gap-6">
                    <button
                        onClick={() => setActiveTab('feedback')}
                        className={`pb-3 px-1 font-medium text-sm border-b-2 transition-colors ${activeTab === 'feedback'
                            ? 'border-purple-600 text-purple-600 dark:text-purple-400'
                            : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                            }`}
                    >
                        <MessageSquare className="w-4 h-4 inline mr-2" />
                        Employee Feedback
                    </button>
                    <button
                        onClick={() => setActiveTab('employees')}
                        className={`pb-3 px-1 font-medium text-sm border-b-2 transition-colors ${activeTab === 'employees'
                            ? 'border-purple-600 text-purple-600 dark:text-purple-400'
                            : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                            }`}
                    >
                        <Users className="w-4 h-4 inline mr-2" />
                        Employees ({employees.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('attendance')}
                        className={`pb-3 px-1 font-medium text-sm border-b-2 transition-colors ${activeTab === 'attendance'
                            ? 'border-purple-600 text-purple-600 dark:text-purple-400'
                            : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                            }`}
                    >
                        <Clock className="w-4 h-4 inline mr-2" />
                        Attendance Logs
                    </button>
                    <button
                        onClick={() => setActiveTab('leave')}
                        className={`pb-3 px-1 font-medium text-sm border-b-2 transition-colors ${activeTab === 'leave'
                            ? 'border-purple-600 text-purple-600 dark:text-purple-400'
                            : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                            }`}
                    >
                        <Calendar className="w-4 h-4 inline mr-2" />
                        Leave History
                    </button>
                    <button
                        onClick={() => setActiveTab('settings')}
                        className={`pb-3 px-1 font-medium text-sm border-b-2 transition-colors ${activeTab === 'settings'
                            ? 'border-purple-600 text-purple-600 dark:text-purple-400'
                            : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                            }`}
                    >
                        <FileText className="w-4 h-4 inline mr-2" />
                        System Settings
                    </button>
                </nav>
            </div>

            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
            ) : (
                <>
                    {/* Feedback Tab */}
                    {activeTab === 'feedback' && (
                        <div className="space-y-4">
                            {messages.length === 0 ? (
                                <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 text-center border border-gray-100 dark:border-gray-700">
                                    <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">No feedback yet</h3>
                                    <p className="text-gray-500 mt-1">Employee feedback will appear here.</p>
                                </div>
                            ) : (
                                messages.map((msg) => (
                                    <div key={msg.id} className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow">
                                        <div className="flex items-start gap-4">
                                            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-xl shrink-0">
                                                <MessageSquare className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between mb-2">
                                                    <div>
                                                        <p className="font-semibold text-gray-900 dark:text-white">
                                                            {msg.profiles?.full_name || 'Unknown Employee'}
                                                        </p>
                                                        <p className="text-sm text-gray-500">{msg.profiles?.email}</p>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-xs text-gray-500">
                                                        <Clock className="w-3.5 h-3.5" />
                                                        <span>{new Date(msg.created_at).toLocaleString()}</span>
                                                    </div>
                                                </div>
                                                <p className="text-gray-900 dark:text-white whitespace-pre-wrap leading-relaxed mt-3">{msg.message}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}

                    {/* Employees Tab */}
                    {activeTab === 'employees' && (
                        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Name</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Email</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Role</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Designation</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                        {employees.map((emp) => (
                                            <tr key={emp.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="font-medium text-gray-900 dark:text-white">{emp.full_name}</div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{emp.email}</td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className="px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
                                                        {emp.role}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{emp.designation || '-'}</td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400">
                                                        Active
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Attendance Tab */}
                    {activeTab === 'attendance' && (
                        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Employee</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Clock In</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Clock Out</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Hours</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Mode</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                        {attendanceLogs.map((log) => (
                                            <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="font-medium text-gray-900 dark:text-white">{log.profiles?.full_name}</div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {new Date(log.work_date).toLocaleDateString()}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {log.clock_in ? new Date(log.clock_in).toLocaleTimeString() : '-'}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {log.clock_out ? new Date(log.clock_out).toLocaleTimeString() : 'In Progress'}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                                                    {log.total_hours?.toFixed(2) || '0.00'}h
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${log.mode === 'wfh'
                                                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                                                        : 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                                                        }`}>
                                                        {log.mode === 'wfh' ? 'Remote' : 'Office'}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Leave Tab */}
                    {activeTab === 'leave' && (
                        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Employee</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Type</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">From</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">To</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Days</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                        {leaveRequests.map((leave) => (
                                            <tr key={leave.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="font-medium text-gray-900 dark:text-white">{leave.profiles?.full_name}</div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{leave.leave_type}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {new Date(leave.start_date).toLocaleDateString()}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {new Date(leave.end_date).toLocaleDateString()}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                                                    {leave.total_days}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${leave.status === 'approved'
                                                        ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                                                        : leave.status === 'rejected'
                                                            ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                                                            : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400'
                                                        }`}>
                                                        {leave.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Settings Tab */}
                    {activeTab === 'settings' && (
                        <div>
                            <SystemDataSettings />
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
