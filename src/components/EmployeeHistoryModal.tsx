import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { X, Download, Clock, DollarSign, FileText, Calendar, FileJson, FileType } from 'lucide-react';
import type { Profile } from '../types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toLocalISOString } from '../utils/date';

interface EmployeeHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    employee: Profile;
}

interface AuditLogEntry {
    id: string;
    action: string;
    details: string;
    timestamp: string;
    actor_id: string;
    table_name: string;
}

export default function EmployeeHistoryModal({ isOpen, onClose, employee }: EmployeeHistoryModalProps) {
    const [logs, setLogs] = useState<AuditLogEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [showDownloadMenu, setShowDownloadMenu] = useState(false);

    useEffect(() => {
        if (isOpen && employee) {
            fetchHistory();
        }
    }, [isOpen, employee]);

    const fetchHistory = async () => {
        setLoading(true);
        try {
            // Fetch logs where the TARGET is the employee
            // This includes:
            // - Attendance (Clock In/Out) - target_id = user_id
            // - Salary Changes - target_id = user_id
            // - Payroll - target_id = user_id
            const { data, error } = await supabase
                .from('audit_logs')
                .select('*')
                .or(`target_id.eq.${employee.id},actor_id.eq.${employee.id}`) // Fetch if they are the target OR the actor
                .order('timestamp', { ascending: false });

            if (error) throw error;
            setLogs(data || []);
        } catch (error) {
            console.error('Error fetching history:', error);
        } finally {
            setLoading(false);
        }
    };

    const downloadCSV = () => {
        const headers = ['Timestamp', 'Action', 'Details', 'Category'];
        const csvContent = [
            headers.join(','),
            ...logs.map(log => {
                const date = new Date(log.timestamp).toLocaleString();
                const action = log.action;
                const details = log.details?.replace(/,/g, ';') || ''; // Escape commas
                const category = log.table_name;
                return `"${date}","${action}","${details}","${category}"`;
            })
        ].join('\n');

        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `Audit_Log_${employee.full_name?.replace(/\s+/g, '_')}_${toLocalISOString()}.csv`;
        link.click();
        setShowDownloadMenu(false);
    };

    const downloadPDF = () => {
        const doc = new jsPDF();

        // Title
        doc.setFontSize(18);
        doc.text(`Audit History: ${employee.full_name}`, 14, 20);

        doc.setFontSize(10);
        doc.text(`Generated on: ${toLocalISOString(new Date())}`, 14, 30);

        // Table
        const tableColumn = ["Timestamp", "Action", "Details", "Category"];
        const tableRows = logs.map(log => [
            new Date(log.timestamp).toLocaleString(),
            log.action,
            log.details || '',
            log.table_name
        ]);

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 35,
            theme: 'grid',
            styles: { fontSize: 8 },
            headStyles: { fillColor: [66, 66, 66] }
        });

        doc.save(`Audit_Log_${employee.full_name?.replace(/\s+/g, '_')}.pdf`);
        setShowDownloadMenu(false);
    };

    const getIcon = (action: string) => {
        if (action.includes('Clock')) return <Clock className="w-4 h-4 text-blue-500" />;
        if (action.includes('Salary') || action.includes('Payroll')) return <DollarSign className="w-4 h-4 text-green-500" />;
        if (action.includes('Leave') || action.includes('Attendance')) return <Calendar className="w-4 h-4 text-purple-500" />;
        return <FileText className="w-4 h-4 text-gray-500" />;
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-4xl w-full max-h-[85vh] flex flex-col border border-gray-200 dark:border-gray-800 transition-colors">
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-800">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <span className="w-2 h-6 bg-blue-500 rounded-full"></span>
                            Audit History: {employee.full_name}
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 pl-4">
                            Detailed log of all activities, salary changes, and attendance.
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <button
                                onClick={() => setShowDownloadMenu(!showDownloadMenu)}
                                className="flex items-center px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-sm font-medium"
                            >
                                <Download className="w-4 h-4 mr-2" />
                                Download Report
                            </button>

                            {/* Dropdown Menu */}
                            {showDownloadMenu && (
                                <div className="absolute top-11 right-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-20 w-48 overflow-hidden animate-in fade-in slide-in-from-top-2">
                                    <button
                                        onClick={downloadCSV}
                                        className="flex items-center w-full px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 text-left transition-colors"
                                    >
                                        <FileJson className="w-4 h-4 mr-3 text-green-500" />
                                        Export as CSV
                                    </button>
                                    <button
                                        onClick={downloadPDF}
                                        className="flex items-center w-full px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 text-left transition-colors border-t border-gray-100 dark:border-gray-700/50"
                                    >
                                        <FileType className="w-4 h-4 mr-3 text-red-500" />
                                        Export as PDF
                                    </button>
                                </div>
                            )}
                        </div>
                        {showDownloadMenu && (
                            <div
                                className="fixed inset-0 z-10"
                                onClick={() => setShowDownloadMenu(false)}
                            ></div>
                        )}
                        <button
                            onClick={onClose}
                            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-0">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                            <div className="w-8 h-8 border-4 border-blue-100 border-t-blue-500 rounded-full animate-spin mb-3"></div>
                            <p>Loading history...</p>
                        </div>
                    ) : logs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                            <FileText className="w-12 h-12 mb-3 opacity-20" />
                            <p>No activity logs found for this employee.</p>
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider sticky top-0 z-10 shadow-sm">
                                <tr>
                                    <th className="px-6 py-3 border-b border-gray-200 dark:border-gray-700 w-48">Timestamp</th>
                                    <th className="px-6 py-3 border-b border-gray-200 dark:border-gray-700 w-48">Action</th>
                                    <th className="px-6 py-3 border-b border-gray-200 dark:border-gray-700">Details</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                {logs.map((log) => (
                                    <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                        <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                                            {toLocalISOString(new Date(log.timestamp))}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className="p-1.5 bg-gray-50 dark:bg-gray-800 rounded-md border border-gray-100 dark:border-gray-700">
                                                    {getIcon(log.action)}
                                                </div>
                                                <span className="font-medium text-gray-900 dark:text-white text-sm">
                                                    {log.action}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                                            {log.details || '-'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
}
