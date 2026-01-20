import { X, Check } from 'lucide-react';

interface PreviewData {
    employeeCount: number;
    totalPayout: number;
    month: string;
    year: number;
    records: any[];
}

interface PayrollPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    data: PreviewData | null;
    isGenerating: boolean;
}

export default function PayrollPreviewModal({ isOpen, onClose, onConfirm, data, isGenerating }: PayrollPreviewModalProps) {
    if (!isOpen || !data) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-2xl shadow-2xl border border-gray-200 dark:border-gray-700 max-h-[90vh] flex flex-col">
                <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-700">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                            Payroll Preview: {data.month} {data.year}
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            Review calculations before committing.
                        </p>
                    </div>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto flex-1">
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                            <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">Total Employees</p>
                            <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{data.employeeCount}</p>
                        </div>
                        <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                            <p className="text-sm text-green-600 dark:text-green-400 font-medium">Total Net Payout</p>
                            <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                                {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(data.totalPayout)}
                            </p>
                        </div>
                    </div>

                    <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Employee Breakdown</h3>
                    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400 font-medium border-b border-gray-200 dark:border-gray-700">
                                <tr>
                                    <th className="px-4 py-3">Employee</th>
                                    <th className="px-4 py-3 text-right">Paid Days</th>
                                    <th className="px-4 py-3 text-right">Net Salary</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {data.records.map((rec, idx) => (
                                    <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                        <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                                            {rec.profiles?.full_name || 'Unknown'}
                                        </td>
                                        <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-400">
                                            {rec.metadata?.paid_days} / {rec.metadata?.total_days}
                                        </td>
                                        <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-gray-200">
                                            {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(rec.net_salary)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="p-6 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-3 bg-gray-50 dark:bg-gray-800/50 rounded-b-xl">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"
                        disabled={isGenerating}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        className="flex items-center gap-2 px-4 py-2 text-white bg-purple-600 rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={isGenerating}
                    >
                        {isGenerating ? 'Processing...' : (
                            <>
                                <Check size={18} />
                                Confirm & Generate
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
