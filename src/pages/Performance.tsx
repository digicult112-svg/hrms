import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { PerformanceSummary } from '../types';
import { useAuth } from '../context/AuthContext';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    AreaChart,
    Area
} from 'recharts';
import { TrendingUp, Calendar, Award } from 'lucide-react';

export default function PerformancePage() {
    const { user, profile } = useAuth();
    const [performanceData, setPerformanceData] = useState<PerformanceSummary[]>([]);
    const [leaveData, setLeaveData] = useState<{ name: string; value: number }[]>([]);
    const [funnelData, setFunnelData] = useState<{ name: string; value: number }[]>([]);
    // const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAllData();
    }, [user]);

    const fetchAllData = async () => {
        try {
            // setLoading(true);

            // 1. Fetch Performance Summary (Attendance Trends) from Dynamic View
            let perfQuery = supabase
                .from('attendance_performance_view')
                .select('*')
                .order('month', { ascending: true }); // Order by month for the chart

            if (profile?.role !== 'hr') {
                perfQuery = perfQuery.eq('user_id', user?.id);
            }

            const { data: perfData } = await perfQuery;
            setPerformanceData(perfData || []);

            // The following charts are mostly relevant for HR or could be personal if filtered
            // For now, let's show global stats for HR and personal for Employees where applicable

            // 2. Fetch Leave Distribution
            let leaveQuery = supabase.from('leave_requests').select('status');
            if (profile?.role !== 'hr') {
                leaveQuery = leaveQuery.eq('user_id', user?.id);
            }
            const { data: leaves } = await leaveQuery;

            if (leaves) {
                const distribution = [
                    { name: 'Approved', value: leaves.filter(l => l.status === 'approved').length },
                    { name: 'Pending', value: leaves.filter(l => l.status === 'pending').length },
                    { name: 'Rejected', value: leaves.filter(l => l.status === 'rejected').length },
                ].filter(item => item.value > 0);
                setLeaveData(distribution);
            }

            // 3. Fetch Recruitment Funnel (HR Only usually, but let's show for demo)
            if (profile?.role === 'hr') {
                const { data: candidates } = await supabase.from('candidates').select('status');
                if (candidates) {
                    const funnel = [
                        { name: 'Applied', value: candidates.filter(c => c.status === 'applied').length },
                        { name: 'Shortlisted', value: candidates.filter(c => c.status === 'shortlisted').length },
                        { name: 'Interview', value: candidates.filter(c => c.status === 'interview').length },
                        { name: 'Selected', value: candidates.filter(c => c.status === 'selected').length },
                    ];
                    setFunnelData(funnel);
                }
            }

        } catch (error) {
            console.error('Error fetching analytics:', error);
        } finally {
            // setLoading(false);
        }
    };

    const getMonthName = (month: number) => {
        return new Date(0, month - 1).toLocaleString('default', { month: 'short' });
    };

    const formatPerformanceData = (data: PerformanceSummary[]) => {
        return data.map(item => ({
            name: getMonthName(item.month),
            hours: item.total_hours,
            leaves: item.total_leaves
        }));
    };

    const COLORS = ['#10B981', '#F59E0B', '#EF4444', '#6366F1'];

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Performance Analytics</h1>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                        Visualize productivity, attendance, and recruitment metrics
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* KPI Cards */}
                <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-blue-600 dark:text-blue-400">
                            <TrendingUp className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Avg. Work Hours</p>
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                                {performanceData.length > 0
                                    ? Math.round(performanceData.reduce((acc, curr) => acc + curr.total_hours, 0) / performanceData.length)
                                    : 0} hrs
                            </h3>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-xl text-purple-600 dark:text-purple-400">
                            <Calendar className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Total Leaves</p>
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                                {performanceData.reduce((acc, curr) => acc + curr.total_leaves, 0)} days
                            </h3>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-xl text-green-600 dark:text-green-400">
                            <Award className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Productivity Score</p>
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">98%</h3>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Attendance Trends Chart */}
                <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Attendance Trends</h3>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={formatPerformanceData(performanceData)}>
                                <defs>
                                    <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
                                <XAxis dataKey="name" stroke="#6B7280" style={{ fontSize: '12px' }} />
                                <YAxis stroke="#6B7280" style={{ fontSize: '12px' }} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151', color: '#F3F4F6' }}
                                    itemStyle={{ color: '#F3F4F6' }}
                                />
                                <Area type="monotone" dataKey="hours" stroke="#8884d8" fillOpacity={1} fill="url(#colorHours)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Leave Distribution Chart */}
                <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Leave Distribution</h3>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={leaveData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={100}
                                    fill="#8884d8"
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {leaveData.map((_, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151', color: '#F3F4F6' }}
                                    itemStyle={{ color: '#F3F4F6' }}
                                />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Recruitment Funnel Chart (HR Only) */}
                {profile?.role === 'hr' && (
                    <div className="col-span-1 lg:col-span-2 bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Hiring Funnel</h3>
                        <div className="h-80">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={funnelData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#374151" opacity={0.1} />
                                    <XAxis type="number" stroke="#6B7280" style={{ fontSize: '12px' }} />
                                    <YAxis dataKey="name" type="category" stroke="#6B7280" style={{ fontSize: '12px' }} width={100} />
                                    <Tooltip
                                        cursor={{ fill: 'transparent' }}
                                        contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151', color: '#F3F4F6' }}
                                        itemStyle={{ color: '#F3F4F6' }}
                                    />
                                    <Bar dataKey="value" fill="#8884d8" radius={[0, 4, 4, 0]}>
                                        {funnelData.map((_, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[3 - (index % 4)]} /> // Gradient-ish effect
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
