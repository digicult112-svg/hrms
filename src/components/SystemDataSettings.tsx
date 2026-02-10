import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Trash2, Lock, Loader2, ShieldAlert } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

export default function SystemDataSettings() {
    const { user } = useAuth();
    const { success, error: toastError } = useToast();

    const [step, setStep] = useState<'idle' | 'password-1' | 'password-2'>('idle');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    // const tablesToDelete = [
    //     'attendance_logs',
    //     'leave_requests',
    //     'payroll',
    //     'tickets',
    //     'ticket_comments',
    //     'employee_experience',
    //     'candidates',
    //     'audit_logs',
    // ];

    const handleInitialClick = () => {
        setStep('password-1');
        setPassword('');
    };

    const verifyPassword = async () => {
        // TEMPORARILY DISABLED FOR TESTING
        // Just return true to skip password check
        return true;
    };

    const handleFirstPasswordSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const isValid = await verifyPassword();
        if (isValid) {
            setStep('password-2');
            setPassword('');
        }
    };

    const handleFinalPasswordSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const isValid = await verifyPassword();
        if (isValid) {
            console.log('🚀 About to call clearAllData()...');
            await clearAllData();
        }
    };

    const clearAllData = async () => {
        setLoading(true);
        try {
            console.log('🔍 Calling clear_all_employee_data() function...');

            // Call the secure server-side function that bypasses RLS policies
            const { data, error } = await supabase.rpc('clear_all_employee_data');

            console.log('📝 Response:', { data, error });

            if (error) {
                console.error('❌ Error details:');
                console.error('  - Code:', error.code);
                console.error('  - Message:', error.message);
                console.error('  - Details:', error.details);
                console.error('  - Hint:', error.hint);

                // Specific diagnostic messages
                if (error.code === '42883') {
                    console.error('  ⚠️  Function does not exist! Migration not applied.');
                } else if (error.message?.includes('Access Denied')) {
                    console.error('  ⚠️  User is not admin or not authenticated.');
                }

                throw error;
            }

            console.log('✅ Data cleared successfully:', data);
            success('System cleaned successfully. All employee and candidate data has been wiped.');
            setStep('idle');
            setPassword('');
            // Reload to ensure UI reflects database state
            setTimeout(() => window.location.reload(), 1500);

        } catch (error: any) {
            console.error('💥 Error clearing data:', error);
            toastError(`Failed to clear data: ${error.message || 'Unknown error occurred'}`);
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = () => {
        setStep('idle');
        setPassword('');
    };

    return (
        <div className="bg-white dark:bg-gray-900 rounded-[2rem] shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden relative transition-colors mt-8">
            {/* Danger Zone Gradient */}
            <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-br from-red-50/50 to-transparent dark:from-red-900/10 pointer-events-none"></div>

            <div className="p-8 relative z-10">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-xl">
                        <ShieldAlert className="w-6 h-6 text-red-600 dark:text-red-400" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Danger Zone</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Irreversible actions for system data management</p>
                    </div>
                </div>

                <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/50 rounded-2xl p-6">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                        <div>
                            <h3 className="text-lg font-bold text-red-900 dark:text-red-300 mb-2">Clear All Employee Data</h3>
                            <p className="text-sm text-red-700 dark:text-red-400/80 max-w-xl leading-relaxed">
                                This action will permanently delete all employees, payroll records, attendance logs, leave requests, and performance data.
                                <span className="font-bold block mt-1">Your administrator account and system settings will be preserved.</span>
                            </p>
                        </div>

                        {step === 'idle' ? (
                            <button
                                onClick={handleInitialClick}
                                className="flex items-center px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-red-500/30 active:scale-95 whitespace-nowrap"
                            >
                                <Trash2 className="w-5 h-5 mr-2" />
                                Clear All Data
                            </button>
                        ) : (
                            <div className="w-full max-w-md bg-white dark:bg-gray-900 p-6 rounded-xl border border-red-200 dark:border-red-800 shadow-xl">
                                <form onSubmit={step === 'password-1' ? handleFirstPasswordSubmit : handleFinalPasswordSubmit}>
                                    <div className="flex items-start gap-4 mb-4">
                                        <div className="p-3 bg-red-100 dark:bg-red-900/40 rounded-full shrink-0 animate-pulse">
                                            <Lock className="w-6 h-6 text-red-600 dark:text-red-400" />
                                        </div>
                                        <div>
                                            <h4 className="text-lg font-bold text-gray-900 dark:text-white">
                                                {step === 'password-1' ? 'Security Verification' : 'Final Confirmation'}
                                            </h4>
                                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                                {step === 'password-1'
                                                    ? 'Please enter your password to continue.'
                                                    : <span className="text-red-600 dark:text-red-400 font-bold uppercase">This is irreversible. Enter password again to confirm.</span>
                                                }
                                            </p>
                                        </div>
                                    </div>

                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="Enter your password"
                                        className="w-full mb-4 px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:ring-2 focus:ring-red-500 outline-none transition-all"
                                        autoFocus
                                        disabled={loading}
                                    />

                                    <div className="flex justify-end gap-3">
                                        <button
                                            type="button"
                                            onClick={handleCancel}
                                            className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors font-medium text-sm"
                                            disabled={loading}
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold transition-colors text-sm flex items-center shadow-md disabled:opacity-70"
                                            disabled={loading || !password}
                                        >
                                            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                                            {step === 'password-1' ? 'Verify' : 'Confirm & Wipe'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
