import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Trophy, Search, Filter, ArrowUpDown, Calendar as CalendarIcon, User, Tag, MessageSquare, Plus } from 'lucide-react';
import SafeAvatar from '../components/SafeAvatar';
import { useToast } from '../context/ToastContext';
import PointsSummaryWidget from '../components/points/PointsSummaryWidget';
import LeaderboardWidget from '../components/points/LeaderboardWidget';

interface Transaction {
    id: string;
    points: number;
    category: string;
    reason: string;
    created_at: string;
    employee: {
        full_name: string;
        avatar_url: string;
        designation: string;
    };
    author: {
        full_name: string;
    };
}

export default function PointsLedger() {
    const navigate = useNavigate();
    const { tenantId, profile } = useAuth();
    const { error } = useToast();
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCategory, setFilterCategory] = useState('All');

    const isHR = profile?.role === 'hr';
    const CATEGORIES = ['All', 'Performance', 'Attendance', 'Team contribution', 'Learning & growth', 'Initiative', 'Discipline'];

    useEffect(() => {
        fetchLedger();
    }, [tenantId]);

    async function fetchLedger() {
        setLoading(true);
        try {
            const { data, error: fetchError } = await supabase
                .from('points_transactions')
                .select(`
                    *,
                    employee:employee_id (full_name, avatar_url, designation),
                    author:added_by (full_name)
                `)
                .eq('tenant_id', tenantId)
                .order('created_at', { ascending: false });

            if (fetchError) throw fetchError;
            if (data) setTransactions(data as any);
        } catch (err: any) {
            error(err.message);
        } finally {
            setLoading(false);
        }
    }

    const filteredTransactions = transactions.filter(t => {
        const matchesSearch = t.employee.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            t.reason.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = filterCategory === 'All' || t.category === filterCategory;
        return matchesSearch && matchesCategory;
    });

    return (
        <div className="space-y-6">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Trophy className="w-8 h-8 text-yellow-500" />
                        Recognition Ledger
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400">Company-wide transparency for recognition and awards.</p>
                </div>
                {isHR && (
                    <button
                        onClick={() => navigate('/points')}
                        className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-semibold shadow-lg shadow-purple-200 dark:shadow-none transition-all active:scale-95"
                    >
                        <Plus className="w-5 h-5" />
                        Award Points
                    </button>
                )}
            </header>

            {/* Points Summary & Leaderboard */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <PointsSummaryWidget />
                <LeaderboardWidget />
            </div>

            {/* Filters */}
            <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col md:flex-row gap-4 items-center">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search employee or reason..."
                        className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-800 border-0 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 dark:text-white"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-2 w-full md:w-auto">
                    <Filter className="w-4 h-4 text-gray-400" />
                    <select
                        className="w-full md:w-48 px-4 py-2 bg-gray-50 dark:bg-gray-800 border-0 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 dark:text-white"
                        value={filterCategory}
                        onChange={(e) => setFilterCategory(e.target.value)}
                    >
                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
                <button
                    onClick={fetchLedger}
                    className="p-2 text-gray-400 hover:text-purple-600 transition-colors"
                >
                    <ArrowUpDown className="w-5 h-5" />
                </button>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden text-gray-900 dark:text-white">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-separate border-spacing-0">
                        <thead>
                            <tr className="bg-gray-50 dark:bg-gray-800/50">
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-100 dark:border-gray-800">
                                    <div className="flex items-center gap-2"><User className="w-3 h-3" /> Employee</div>
                                </th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-100 dark:border-gray-800">
                                    <div className="flex items-center gap-2"><Tag className="w-3 h-3" /> Category</div>
                                </th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-100 dark:border-gray-800">
                                    <div className="flex items-center gap-2"><MessageSquare className="w-3 h-3" /> Reason</div>
                                </th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-100 dark:border-gray-800">
                                    <div className="flex items-center gap-2">Points</div>
                                </th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-100 dark:border-gray-800">
                                    <div className="flex items-center gap-2"><CalendarIcon className="w-3 h-3" /> Date</div>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                            {loading ? (
                                [1, 2, 3, 4, 5].map(i => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={5} className="px-6 py-4">
                                            <div className="h-10 bg-gray-50 dark:bg-gray-800 rounded-lg w-full" />
                                        </td>
                                    </tr>
                                ))
                            ) : filteredTransactions.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400 italic">
                                        No recognition records found.
                                    </td>
                                </tr>
                            ) : (
                                filteredTransactions.map((t) => (
                                    <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <SafeAvatar
                                                    src={t.employee.avatar_url}
                                                    alt={t.employee.full_name}
                                                    size={32}
                                                    className="rounded-lg shadow-sm"
                                                />
                                                <div>
                                                    <div className="text-sm font-bold text-gray-900 dark:text-white">
                                                        {t.employee.full_name}
                                                    </div>
                                                    <div className="text-[10px] text-gray-400">
                                                        {t.employee.designation}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-[10px] font-bold rounded-lg uppercase">
                                                {t.category}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-gray-600 dark:text-gray-300 max-w-md truncate" title={t.reason}>
                                                {t.reason}
                                            </div>
                                            <div className="text-[10px] text-gray-400 mt-1">
                                                Awarded by {t.author.full_name}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className={`text-sm font-black ${t.points >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                                {t.points >= 0 ? '+' : ''}{t.points}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-xs text-gray-500 dark:text-gray-400">
                                                {new Date(t.created_at).toLocaleDateString('en-US', {
                                                    month: 'short',
                                                    day: 'numeric',
                                                    year: 'numeric'
                                                })}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
