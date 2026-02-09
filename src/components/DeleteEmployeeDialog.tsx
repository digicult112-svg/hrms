import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { AlertTriangle, Loader2 } from 'lucide-react';

interface DeleteEmployeeDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    employeeName: string;
    employeeId: string;
}

export default function DeleteEmployeeDialog({
    isOpen,
    onClose,
    onSuccess,
    employeeName,
    employeeId
}: DeleteEmployeeDialogProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleDelete = async () => {
        setError('');
        setLoading(true);

        try {
            // Step 0: Check if the employee is an admin (prevent HR from deleting admins)
            const { data: employeeProfile, error: profileError } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', employeeId)
                .single();

            if (profileError) throw profileError;

            if (employeeProfile?.role === 'admin') {
                throw new Error('❌ Admin accounts cannot be deleted. Only admins can manage other admin accounts.');
            }

            // Step 1: Soft delete - Mark as frozen and set deleted_at
            const { error: deleteError } = await supabase
                .from('profiles')
                .update({
                    is_frozen: true,
                    deleted_at: new Date().toISOString()
                })
                .eq('id', employeeId);

            if (deleteError) throw deleteError;

            // Step 2: Ban user at auth level to prevent authentication
            // This blocks login at database level, not just app level
            const { data: banResult, error: banError } = await supabase.rpc('ban_user', {
                target_user_id: employeeId
            });

            if (banError) {
                // Rollback the soft delete if ban fails
                console.error('Failed to ban user, rolling back soft delete:', banError);
                await supabase
                    .from('profiles')
                    .update({
                        is_frozen: false,
                        deleted_at: null
                    })
                    .eq('id', employeeId);
                throw new Error(`Failed to revoke authentication: ${banError.message}`);
            }

            if (!banResult?.success) {
                // Rollback the soft delete if ban fails
                console.error('Ban returned failure, rolling back:', banResult?.error);
                await supabase
                    .from('profiles')
                    .update({
                        is_frozen: false,
                        deleted_at: null
                    })
                    .eq('id', employeeId);
                throw new Error(`Failed to revoke authentication: ${banResult?.error || 'Unknown error'}`);
            }

            onSuccess();
            onClose();
        } catch (err: any) {
            console.error('Error deleting employee:', err);
            setError(err.message || 'Failed to delete employee');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-md w-full p-6 transition-colors">
                <div className="flex items-start mb-4">
                    <div className="flex-shrink-0">
                        <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                            <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
                        </div>
                    </div>
                    <div className="ml-4 flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                            Delete Employee
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            Are you sure you want to delete <strong>{employeeName}</strong>?
                        </p>
                    </div>
                </div>

                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 mb-4">
                    <p className="text-sm text-yellow-800 dark:text-yellow-300">
                        <strong>Warning:</strong> This action cannot be undone. All associated data including
                        attendance logs, leave requests, and payroll records will be permanently deleted.
                    </p>
                </div>

                {error && (
                    <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm">
                        {error}
                    </div>
                )}

                <div className="flex gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                        disabled={loading}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleDelete}
                        disabled={loading}
                        className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Deleting...
                            </>
                        ) : (
                            'Delete Employee'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
