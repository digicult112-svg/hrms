import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Trophy, Search, Plus, RotateCcw, History, AlertCircle } from 'lucide-react';
import SafeAvatar from '../components/SafeAvatar';
import { useToast } from '../context/ToastContext';

interface Employee {
    id: string;
    full_name: string;
    avatar_url: string;
    designation: string;
}

interface Transaction {
    id: string;
    employee_id: string;
    points: number;
    category: string;
    reason: string;
    created_at: string;
    profiles: {
        full_name: string;
        avatar_url: string;
    };
}

const CATEGORIES = [
    'Performance',
    'Attendance',
    'Team contribution',
    'Learning & growth',
    'Initiative',
    'Discipline'
];

export default function PointsManagement() {
    const { profile, tenantId } = useAuth();
    const { success, error } = useToast();
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // Form State
    const [selectedEmp, setSelectedEmp] = useState<string>('');
    const [points, setPoints] = useState<number>(10);
    const [category, setCategory] = useState(CATEGORIES[0]);
    const [reason, setReason] = useState('');

    useEffect(() => {
        fetchData();
    }, [tenantId]);

    async function fetchData() {
        setLoading(true);
        try {
            // Fetch employees for dropdown
            const { data: empData, error: empError } = await supabase
                .from('profiles')
                .select('id, full_name, avatar_url, designation')
                .eq('tenant_id', tenantId)
                .is('deleted_at', null)
                .order('full_name');

            if (empError) {
                console.error('Error fetching employees:', empError);
            }

            // Fetch recent transactions
            const { data: transData, error: transError } = await supabase
                .from('points_transactions')
                .select(`
                    *,
                    profiles:employee_id (full_name, avatar_url)
                `)
                .eq('tenant_id', tenantId)
                .order('created_at', { ascending: false })
                .limit(20);

            if (transError) {
                console.error('Error fetching transactions:', transError);
            }

            if (empData) setEmployees(empData);
            if (transData) setTransactions(transData as any);
        } catch (err) {
            console.error('Error fetching data:', err);
        } finally {
            setLoading(false);
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedEmp || !reason.trim() || points === 0) {
            error('Please fill all required fields');
            return;
        }

        // Mandatory reason for negative points check
        if (points < 0 && reason.length < 5) {
            error('Detailed reason required for negative points');
            return;
        }

        setSubmitting(true);
        try {
            const { error: insertError } = await supabase
                .from('points_transactions')
                .insert({
                    employee_id: selectedEmp,
                    tenant_id: tenantId,
                    added_by: profile?.id,
                    points: Math.round(points),
                    category,
                    reason: reason.trim()
                });

            if (insertError) throw insertError;

            success(`Points ${points > 0 ? 'awarded' : 'deducted'} successfully`);
            setReason('');
            setSelectedEmp('');
            fetchData();
        } catch (err: any) {
            error(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleResetMonthly = async () => {
        if (!confirm('⚠️ WARNING: This will reset ALL points (monthly and total) to 0 and DELETE all transaction history. This cannot be undone. Continue?')) return;

        try {
            const { data, error: resetError } = await supabase.rpc('reset_monthly_points');
            if (resetError) throw resetError;

            success(`Reset complete: ${data.affected_rows} employees reset, ${data.transactions_deleted} transactions deleted`);
            fetchData();
        } catch (err: any) {
            error(err.message);
        }
    };

    const filteredEmployees = employees.filter(e =>
        e.full_name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Trophy className="w-8 h-8 text-yellow-500" />
                        Recognition & Points
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400">Award points to recognize employee contributions and performance.</p>
                </div>
                <button
                    onClick={handleResetMonthly}
                    className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm text-sm font-medium"
                >
                    <RotateCcw className="w-4 h-4" />
                    Reset Monthly Scores
                </button>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Award Form */}
                <div className="lg:col-span-1">
                    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-8 shadow-sm sticky top-6">
                        <h2 className="text-xl font-bold mb-6 flex items-center gap-3 text-gray-900 dark:text-white">
                            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center">
                                <Plus className="w-5 h-5 text-purple-600" />
                            </div>
                            Award Points
                        </h2>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Employee Selection */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Select Employee</label>
                                <div className="relative mb-3">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Search by name..."
                                        className="w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:text-white transition-all"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                                {/* Employee List with Avatars */}
                                <div className="max-h-48 overflow-y-auto space-y-2 rounded-xl border border-gray-100 dark:border-gray-800 p-2 bg-gray-50/50 dark:bg-gray-800/50">
                                    {filteredEmployees.length === 0 ? (
                                        <p className="text-sm text-gray-400 text-center py-4">No employees found</p>
                                    ) : (
                                        filteredEmployees.map(e => (
                                            <button
                                                key={e.id}
                                                type="button"
                                                onClick={() => setSelectedEmp(e.id)}
                                                className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all text-left ${selectedEmp === e.id
                                                    ? 'bg-purple-100 dark:bg-purple-900/30 border-2 border-purple-500'
                                                    : 'bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-700'
                                                    }`}
                                            >
                                                <SafeAvatar src={e.avatar_url} alt={e.full_name} size={36} className="rounded-lg" />
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{e.full_name}</p>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{e.designation || 'No Designation'}</p>
                                                </div>
                                                {selectedEmp === e.id && (
                                                    <div className="w-5 h-5 bg-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                                                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                        </svg>
                                                    </div>
                                                )}
                                            </button>
                                        ))
                                    )}
                                </div>
                            </div>

                            {/* Points Amount */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Points Amount</label>
                                <div className="flex items-center gap-4">
                                    <input
                                        type="number"
                                        className="w-28 px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-lg font-bold focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:text-white text-center transition-all"
                                        value={points}
                                        onChange={(e) => setPoints(parseInt(e.target.value) || 0)}
                                    />
                                    <span className={`text-sm font-bold px-4 py-2 rounded-full ${points >= 0 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                                        {points >= 0 ? '+' : ''}{points} Points
                                    </span>
                                </div>
                            </div>

                            {/* Category */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Category</label>
                                <select
                                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:text-white transition-all cursor-pointer"
                                    value={category}
                                    onChange={(e) => setCategory(e.target.value)}
                                >
                                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>

                            {/* Reason */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Reason / Note</label>
                                <textarea
                                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:text-white min-h-[120px] resize-none transition-all"
                                    placeholder="Explain why these points are being awarded..."
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={submitting || !selectedEmp}
                                className="w-full py-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl font-bold text-base transition-all shadow-lg shadow-purple-500/25 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
                            >
                                {submitting ? 'Processing...' : 'Confirm Award'}
                            </button>
                        </form>
                    </div>
                </div>

                {/* History Log */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm overflow-hidden text-gray-900 dark:text-white">
                        <h2 className="text-lg font-semibold mb-6 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <History className="w-5 h-5 text-gray-400" />
                                Recent Activity
                            </div>
                        </h2>

                        {loading ? (
                            <div className="space-y-4 animate-pulse">
                                {[1, 2, 3, 4, 5].map(i => (
                                    <div key={i} className="h-16 bg-gray-50 dark:bg-gray-800 rounded-xl" />
                                ))}
                            </div>
                        ) : transactions.length === 0 ? (
                            <div className="text-center py-12">
                                <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                                <p className="text-gray-500">No points have been awarded yet.</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-50 dark:divide-gray-800">
                                {transactions.map((t) => (
                                    <div key={t.id} className="py-4 flex items-start justify-between group">
                                        <div className="flex items-start gap-4">
                                            <SafeAvatar
                                                src={t.profiles.avatar_url}
                                                alt={t.profiles.full_name}
                                                size={40}
                                                className="rounded-xl shadow-sm"
                                            />
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                                                        {t.profiles.full_name}
                                                    </h3>
                                                    <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded-md uppercase tracking-tight">
                                                        {t.category}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1 italic">
                                                    "{t.reason}"
                                                </p>
                                                <p className="text-[10px] text-gray-400 mt-1">
                                                    {new Date(t.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                                                </p>
                                            </div>
                                        </div>
                                        <div className={`font-black text-lg ${t.points >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                            {t.points >= 0 ? '+' : ''}{t.points}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
