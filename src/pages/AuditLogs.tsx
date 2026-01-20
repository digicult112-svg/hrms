import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { AuditLog } from '../types';
import { toLocalISOString } from '../utils/date';
import { Clock, FileText, Download } from 'lucide-react';
import { downloadCSV, downloadPDF } from '../utils/export';

export default function AuditLogsPage() {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchLogs();
    }, []);

    const fetchLogs = async () => {
        try {
            const { data, error } = await supabase
                .from('audit_logs')
                .select('*, profiles:actor_id(full_name, deleted_at)')
                .order('timestamp', { ascending: false })
                .limit(50);

            if (error) throw error;
            setLogs(data || []);
        } catch (error) {
            console.error('Error fetching audit logs:', error);
        } finally {
            setLoading(false);
        }
    };

    const getFormattedLogs = () => {
        return logs.map(log => ({
            timestamp: new Date(log.timestamp).toLocaleString(),
            action: log.action,
            table: log.table_name,
            actor: log.profiles?.full_name || log.actor_id,
            details: log.row_id || '-'
        }));
    };

    return (
        <div className="max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Audit Logs</h1>
                <div className="flex gap-2">
                    <button
                        onClick={() => downloadCSV(getFormattedLogs(), `audit - logs - ${toLocalISOString()} `)}
                        disabled={loading || logs.length === 0}
                        className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <FileText className="w-4 h-4" />
                        Export CSV
                    </button>
                    <button
                        onClick={() => downloadPDF(getFormattedLogs(), `audit - logs - ${toLocalISOString()} `, 'Audit Logs Report')}
                        disabled={loading || logs.length === 0}
                        className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Download className="w-4 h-4" />
                        Export PDF
                    </button>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden transition-colors">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-sm border-b border-gray-200 dark:border-gray-700">
                            <tr>
                                <th className="px-6 py-3 font-medium">Timestamp</th>
                                <th className="px-6 py-3 font-medium">Action</th>
                                <th className="px-6 py-3 font-medium">Table</th>
                                <th className="px-6 py-3 font-medium">Actor ID</th>
                                <th className="px-6 py-3 font-medium">Row ID</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">Loading...</td>
                                </tr>
                            ) : logs.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">No audit logs found</td>
                                </tr>
                            ) : (
                                logs.map((log) => (
                                    <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                        <td className="px-6 py-4 text-gray-500 dark:text-gray-400 text-sm">
                                            <div className="flex items-center">
                                                <Clock className="w-3 h-3 mr-2" />
                                                {new Date(log.timestamp).toLocaleString()}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-gray-900 dark:text-white font-medium">{log.action}</td>
                                        <td className="px-6 py-4 text-gray-700 dark:text-gray-300 font-mono text-xs">{log.table_name}</td>
                                        <td className="px-6 py-4 text-gray-500 dark:text-gray-400 text-xs font-mono">
                                            <div className="flex flex-col">
                                                <span>{log.profiles?.full_name || log.actor_id}</span>
                                                {/* @ts-ignore - profiles is joined and might have deleted_at */}
                                                {(log.profiles as any)?.deleted_at && (
                                                    <span className="text-[10px] text-red-500 font-medium">Deleted User</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-gray-500 dark:text-gray-400 text-xs font-mono">{log.row_id || '-'}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div >
    );
}
