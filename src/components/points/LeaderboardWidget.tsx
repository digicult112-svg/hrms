import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { Trophy, Medal, ChevronRight } from 'lucide-react';
import SafeAvatar from '../SafeAvatar';

interface LeaderboardEntry {
    user_id: string;
    total_points: number;
    monthly_points: number;
    profiles: {
        full_name: string;
        avatar_url: string;
        designation: string;
    };
}

export default function LeaderboardWidget() {
    const { tenantId } = useAuth();
    const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
    const [view, setView] = useState<'monthly' | 'total'>('monthly');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchLeaderboard();
    }, [tenantId, view]);

    async function fetchLeaderboard() {
        setLoading(true);
        try {
            const orderBy = view === 'monthly' ? 'monthly_points' : 'total_points';
            const { data } = await supabase
                .from('employee_points_wallets')
                .select(`
                    user_id,
                    total_points,
                    monthly_points,
                    profiles:user_id (full_name, avatar_url, designation)
                `)
                .eq('tenant_id', tenantId)
                .is('profiles.deleted_at', null)
                .order(orderBy, { ascending: false })
                .limit(5);

            if (data) setEntries(data as any);
        } catch (error) {
            console.error('Error fetching leaderboard:', error);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col h-full">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Trophy className="w-5 h-5 text-yellow-500" />
                        Top Performers
                    </h3>
                </div>
                <div className="flex p-1 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <button
                        onClick={() => setView('monthly')}
                        className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${view === 'monthly' ? 'bg-white dark:bg-gray-700 shadow-sm text-purple-600' : 'text-gray-400'}`}
                    >
                        MONTHLY
                    </button>
                    <button
                        onClick={() => setView('total')}
                        className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${view === 'total' ? 'bg-white dark:bg-gray-700 shadow-sm text-purple-600' : 'text-gray-400'}`}
                    >
                        ALL TIME
                    </button>
                </div>
            </div>

            <div className="flex-1 space-y-4">
                {loading ? (
                    [1, 2, 3, 4, 5].map(i => (
                        <div key={i} className="flex items-center gap-4 animate-pulse">
                            <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800" />
                            <div className="flex-1 space-y-2">
                                <div className="h-3 w-1/2 bg-gray-100 dark:bg-gray-800 rounded" />
                                <div className="h-2 w-1/3 bg-gray-50 dark:bg-gray-800 rounded" />
                            </div>
                        </div>
                    ))
                ) : entries.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                        <p className="text-xs text-gray-400 italic">No rankings yet.</p>
                    </div>
                ) : (
                    entries.map((entry, index) => {
                        // Handle null/missing profile data
                        const profile = entry.profiles || {
                            avatar_url: '',
                            full_name: 'Unknown User',
                            designation: 'Employee'
                        };

                        return (
                            <div key={entry.user_id} className="flex items-center gap-4 group cursor-default">
                                <div className="relative">
                                    <SafeAvatar
                                        src={profile.avatar_url}
                                        alt={profile.full_name}
                                        size={40}
                                        className="rounded-xl border-2 border-transparent group-hover:border-purple-200 dark:group-hover:border-purple-900 transition-colors"
                                    />
                                    {index < 3 && (
                                        <div className={`absolute -top-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center border-2 border-white dark:border-gray-900
                                            ${index === 0 ? 'bg-yellow-400' : index === 1 ? 'bg-slate-300' : 'bg-amber-600'}`}>
                                            <Medal className="w-3 h-3 text-white" />
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-sm font-bold text-gray-900 dark:text-white truncate">
                                        {profile.full_name}
                                    </h4>
                                    <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate uppercase tracking-tighter">
                                        {profile.designation || 'Employee'}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-black text-gray-900 dark:text-white">
                                        {view === 'monthly' ? entry.monthly_points : entry.total_points}
                                    </p>
                                    <p className="text-[9px] text-gray-400 font-bold uppercase tracking-tighter">pts</p>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            <button className="mt-6 w-full py-2 bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs font-bold rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center justify-center gap-2 group">
                Full Transparency Dashboard
                <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
            </button>
        </div>
    );
}
