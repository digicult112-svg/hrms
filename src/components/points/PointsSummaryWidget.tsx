import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { Trophy, Star, TrendingUp, History, Info } from 'lucide-react';

interface PointStats {
    total_points: number;
    monthly_points: number;
}

interface RecentActivity {
    id: string;
    points: number;
    category: string;
    reason: string;
    created_at: string;
}

export default function PointsSummaryWidget() {
    const { user, tenantId } = useAuth();
    const [stats, setStats] = useState<PointStats | null>(null);
    const [activities, setActivities] = useState<RecentActivity[]>([]);
    const [rank, setRank] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) return;
        fetchStats();
    }, [user, tenantId]);

    async function fetchStats() {
        setLoading(true);
        try {
            // 1. Fetch Stats
            const { data: wallet } = await supabase
                .from('employee_points_wallets')
                .select('total_points, monthly_points')
                .eq('user_id', user?.id)
                .single();

            // 2. Fetch Recent Transactions
            const { data: trans } = await supabase
                .from('points_transactions')
                .select('id, points, category, reason, created_at')
                .eq('employee_id', user?.id)
                .order('created_at', { ascending: false })
                .limit(3);

            // 3. Simple Rank Check (Monthly)
            const { count } = await supabase
                .from('employee_points_wallets')
                .select('*', { count: 'exact', head: true })
                .eq('tenant_id', tenantId)
                .gt('monthly_points', wallet?.monthly_points || 0);

            if (wallet) setStats(wallet);
            if (trans) setActivities(trans);
            setRank((count || 0) + 1);
        } catch (error) {
            console.error('Error fetching point stats:', error);
        } finally {
            setLoading(false);
        }
    }

    if (loading) return (
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-100 dark:border-gray-800 animate-pulse">
            <div className="h-6 w-32 bg-gray-100 dark:bg-gray-800 rounded mb-4" />
            <div className="grid grid-cols-2 gap-4">
                <div className="h-20 bg-gray-50 dark:bg-gray-800 rounded-xl" />
                <div className="h-20 bg-gray-50 dark:bg-gray-800 rounded-xl" />
            </div>
        </div>
    );

    return (
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden relative group">
            <div className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity rotate-12">
                <Trophy className="w-32 h-32 text-purple-600" />
            </div>

            <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                    Recognition Points
                </h3>
                <div className="px-2 py-1 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 text-[10px] font-bold rounded uppercase">
                    Rank #{rank || '-'}
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-100/50 dark:border-white/5">
                    <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest">Global Pts</p>
                    <p className="text-2xl font-black text-gray-900 dark:text-white">{stats?.total_points || 0}</p>
                </div>
                <div className="bg-purple-500 text-white p-4 rounded-xl shadow-lg shadow-purple-500/20">
                    <p className="text-[10px] text-white/70 uppercase font-black tracking-widest">This Month</p>
                    <p className="text-2xl font-black">{stats?.monthly_points || 0}</p>
                </div>
            </div>

            <div className="space-y-3">
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                    <History className="w-3 h-3" />
                    Recent Activity
                </h4>
                {activities.length === 0 ? (
                    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 border border-dashed border-gray-200 dark:border-gray-700 text-center">
                        <p className="text-[10px] text-gray-400 italic">No rewards yet. Keep it up!</p>
                    </div>
                ) : (
                    activities.map(a => (
                        <div key={a.id} className="flex items-center justify-between group/row">
                            <div className="min-w-0">
                                <p className="text-xs font-bold text-gray-900 dark:text-white truncate">
                                    {a.reason}
                                </p>
                                <p className="text-[10px] text-gray-400 capitalize">
                                    {a.category} • {new Date(a.created_at).toLocaleDateString()}
                                </p>
                            </div>
                            <div className={`text-sm font-black ${a.points >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                {a.points >= 0 ? '+' : ''}{a.points}
                            </div>
                        </div>
                    ))
                )}
            </div>

            <div className="mt-6 pt-4 border-t border-gray-50 dark:border-gray-800 flex items-center justify-between text-[10px] text-gray-400">
                <span className="flex items-center gap-1">
                    <TrendingUp className="w-3 h-3 text-green-500" />
                    Reset in 12 days
                </span>
                <span className="flex items-center gap-1 cursor-help group/info">
                    <Info className="w-3 h-3" />
                    How to earn?
                    <div className="absolute bottom-full right-0 mb-2 w-48 p-2 bg-gray-900 text-white rounded-lg text-xs opacity-0 group-hover/info:opacity-100 transition-opacity pointer-events-none z-10 shadow-xl border border-white/10">
                        Points are awarded by HR for performance, initiative, and team help.
                    </div>
                </span>
            </div>
        </div>
    );
}
