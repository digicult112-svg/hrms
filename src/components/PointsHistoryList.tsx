import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Trophy, TrendingDown, TrendingUp } from 'lucide-react';

interface Transaction {
    id: string;
    points: number;
    category: string;
    reason: string;
    created_at: string;
}

export default function PointsHistoryList({ userId }: { userId: string }) {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchHistory();
    }, [userId]);

    async function fetchHistory() {
        setLoading(true);
        try {
            const { data } = await supabase
                .from('points_transactions')
                .select('*')
                .eq('employee_id', userId)
                .order('created_at', { ascending: false });

            if (data) setTransactions(data);
        } catch (error) {
            console.error('Error fetching points history:', error);
        } finally {
            setLoading(false);
        }
    }

    if (loading) return <div className="space-y-4 animate-pulse">
        {[1, 2, 3].map(i => <div key={i} className="h-12 bg-gray-50 dark:bg-gray-800 rounded-lg" />)}
    </div>;

    if (transactions.length === 0) return (
        <div className="text-center py-8 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
            <Trophy className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No recognition points yet. Keep up the great work!</p>
        </div>
    );

    return (
        <div className="space-y-4">
            {transactions.map(t => (
                <div key={t.id} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-4 rounded-2xl flex items-center justify-between group hover:shadow-md transition-all">
                    <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-xl ${t.points >= 0 ? 'bg-green-50 dark:bg-green-900/20 text-green-600' : 'bg-red-50 dark:bg-red-900/20 text-red-600'}`}>
                            {t.points >= 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h4 className="text-sm font-bold text-gray-900 dark:text-white capitalize">{t.category}</h4>
                                <span className="text-[10px] text-gray-400 font-medium">{new Date(t.created_at).toLocaleDateString()}</span>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{t.reason}</p>
                        </div>
                    </div>
                    <div className={`text-lg font-black ${t.points >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {t.points >= 0 ? '+' : ''}{t.points}
                    </div>
                </div>
            ))}
        </div>
    );
}
