import { useState, useEffect } from 'react';
import { X, Download, FileText } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Profile } from '../types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ExportAttendanceModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentUserId?: string;
}

export default function ExportAttendanceModal({ isOpen, onClose }: ExportAttendanceModalProps) {
    const [employees, setEmployees] = useState<Partial<Profile>[]>([]);
    const [selectedEmployee, setSelectedEmployee] = useState<string>('all');
    const [dateRangeType, setDateRangeType] = useState<'daily' | 'monthly' | 'custom'>('monthly');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [loading, setLoading] = useState(false);
    const [exportFormat, setExportFormat] = useState<'csv' | 'pdf'>('csv');

    // Load employees for selection
    useEffect(() => {
        if (isOpen) {
            fetchEmployees();

            // Set defaults
            const today = new Date();
            setStartDate(today.toISOString().split('T')[0]);
            setEndDate(today.toISOString().split('T')[0]);
        }
    }, [isOpen]);

    const fetchEmployees = async () => {
        const { data } = await supabase
            .from('profiles')
            .select('id, full_name, email')
            .order('full_name');
        setEmployees(data || []);
    };

    const handleGenerate = async () => {
        setLoading(true);
        try {
            let query = supabase
                .from('attendance_logs')
                .select(`
                    work_date,
                    clock_in,
                    clock_out,
                    mode,
                    status,
                    user_id,
                    profiles!attendance_logs_user_id_fkey (
                        full_name,
                        email,
                        designation
                    )
                `)
                .order('work_date', { ascending: false });

            // Filter by Employee
            if (selectedEmployee !== 'all') {
                query = query.eq('user_id', selectedEmployee);
            }

            // Filter by Date
            if (dateRangeType === 'daily') {
                query = query.eq('work_date', startDate);
            } else if (dateRangeType === 'monthly') {
                // startDate is expected to be "YYYY-MM"
                // Construct range for the whole month
                const [year, month] = startDate.split('-').map(Number);
                const start = new Date(year, month - 1, 1).toISOString().split('T')[0];
                const end = new Date(year, month, 0).toISOString().split('T')[0];

                query = query.gte('work_date', start).lte('work_date', end);
            } else if (dateRangeType === 'custom') {
                query = query.gte('work_date', startDate).lte('work_date', endDate);
            }

            const { data, error } = await query;
            if (error) throw error;

            if (!data || data.length === 0) {
                alert('No records found for the selected criteria.');
                setLoading(false);
                return;
            }

            if (exportFormat === 'csv') {
                generateCSV(data);
            } else {
                generatePDF(data);
            }

            onClose();

        } catch (error) {
            console.error('Error exporting attendance:', error);
            alert('Failed to export. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const formatDuration = (start: string, end?: string) => {
        if (!end) return '-';
        const startTime = new Date(start).getTime();
        const endTime = new Date(end).getTime();

        const diffMs = endTime - startTime;
        if (diffMs < 0) return '-'; // protection against bad data

        const diffMins = Math.floor(diffMs / 60000);
        const hours = Math.floor(diffMins / 60);
        const minutes = diffMins % 60;
        return `${hours}h ${minutes}m`;
    };

    const generateCSV = (logs: any[]) => {
        const headers = ['Employee', 'Email', 'Date', 'Mode', 'Status', 'In Time', 'Out Time', 'Duration'];
        const csvContent = [
            headers.join(','),
            ...logs.map(log => {
                const profile = Array.isArray(log.profiles) ? log.profiles[0] : log.profiles;
                return [
                    `"${profile?.full_name || 'Unknown'}"`,
                    `"${profile?.email || 'N/A'}"`,
                    `"${log.work_date}"`,
                    `"${log.mode}"`,
                    `"${log.status || 'approved'}"`,
                    `"${new Date(log.clock_in).toLocaleTimeString()}"`,
                    `"${log.clock_out ? new Date(log.clock_out).toLocaleTimeString() : '-'}"`,
                    `"${formatDuration(log.clock_in, log.clock_out)}"`
                ].join(',');
            })
        ].join('\n');

        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `Attendance_Report_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
    };

    const generatePDF = (logs: any[]) => {
        const doc = new jsPDF();

        // Header
        doc.setFontSize(18);
        doc.text('Attendance Report', 14, 20);

        doc.setFontSize(10);
        doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 28);

        let subtext = `Range: ${dateRangeType.toUpperCase()}`;
        if (dateRangeType === 'daily') subtext += ` (${startDate})`;
        if (dateRangeType === 'monthly') subtext += ` (${startDate})`; // actually year-month
        if (dateRangeType === 'custom') subtext += ` (${startDate} to ${endDate})`;

        // Filter text
        const empName = selectedEmployee === 'all' ? 'All Employees'
            : employees.find(e => e.id === selectedEmployee)?.full_name || 'Unknown';

        doc.text(`Employee: ${empName}`, 14, 34);
        doc.text(subtext, 14, 40);

        // Table
        const tableColumn = ["Date", "Employee", "Mode", "In", "Out", "Duration"];
        const tableRows = logs.map(log => {
            const profile = Array.isArray(log.profiles) ? log.profiles[0] : log.profiles;
            return [
                log.work_date,
                profile?.full_name || 'Unknown',
                log.mode,
                new Date(log.clock_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                log.clock_out ? new Date(log.clock_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-',
                formatDuration(log.clock_in, log.clock_out)
            ];
        });

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 45,
            theme: 'grid',
            headStyles: { fillColor: [50, 50, 50] },
            styles: { fontSize: 9 }
        });

        doc.save(`Attendance_Report_${new Date().toISOString().split('T')[0]}.pdf`);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl max-w-lg w-full overflow-hidden border border-gray-100 dark:border-gray-800 animate-in fade-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-gray-800">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Download className="w-5 h-5 text-indigo-500" />
                        Export Attendance
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-400">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-6">

                    {/* Employee Selection */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Employee</label>
                        <select
                            value={selectedEmployee}
                            onChange={(e) => setSelectedEmployee(e.target.value)}
                            className="w-full h-11 px-4 text-sm bg-gray-50 dark:bg-gray-800 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 dark:text-white"
                        >
                            <option value="all">All Employees</option>
                            {employees.map(emp => (
                                <option key={emp.id} value={emp.id}>{emp.full_name} ({emp.email})</option>
                            ))}
                        </select>
                    </div>

                    {/* Range Type */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Report Type</label>
                        <div className="grid grid-cols-3 gap-2">
                            {(['daily', 'monthly', 'custom'] as const).map((type) => (
                                <button
                                    key={type}
                                    onClick={() => setDateRangeType(type)}
                                    className={`py-2 rounded-lg text-sm font-medium capitalize transition-all ${dateRangeType === type
                                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 dark:shadow-none'
                                        : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                                        }`}
                                >
                                    {type}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Date Inputs */}
                    <div className="grid grid-cols-1 gap-4">
                        {dateRangeType === 'daily' && (
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 mb-1">Select Date</label>
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="w-full h-11 px-4 bg-gray-50 dark:bg-gray-800 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 dark:text-white"
                                />
                            </div>
                        )}

                        {dateRangeType === 'monthly' && (
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 mb-1">Select Month</label>
                                <input
                                    type="month"
                                    value={startDate.substring(0, 7)} // ensures YYYY-MM format
                                    onChange={(e) => setStartDate(e.target.value + '-01')} // append day to keep consistent state structure
                                    className="w-full h-11 px-4 bg-gray-50 dark:bg-gray-800 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 dark:text-white"
                                />
                            </div>
                        )}

                        {dateRangeType === 'custom' && (
                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <label className="block text-xs font-semibold text-gray-500 mb-1">From</label>
                                    <input
                                        type="date"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        className="w-full h-11 px-4 bg-gray-50 dark:bg-gray-800 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 dark:text-white"
                                    />
                                </div>
                                <div className="flex-1">
                                    <label className="block text-xs font-semibold text-gray-500 mb-1">To</label>
                                    <input
                                        type="date"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                        className="w-full h-11 px-4 bg-gray-50 dark:bg-gray-800 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 dark:text-white"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Filter Mode */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Export Format</label>
                        <div className="flex gap-4">
                            <label className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition-all ${exportFormat === 'csv' ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300' : 'border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
                                <input
                                    type="radio"
                                    name="format"
                                    value="csv"
                                    checked={exportFormat === 'csv'}
                                    onChange={() => setExportFormat('csv')}
                                    className="hidden"
                                />
                                <FileText className="w-5 h-5" />
                                <span className="font-medium">CSV (Excel)</span>
                            </label>

                            <label className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition-all ${exportFormat === 'pdf' ? 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300' : 'border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
                                <input
                                    type="radio"
                                    name="format"
                                    value="pdf"
                                    checked={exportFormat === 'pdf'}
                                    onChange={() => setExportFormat('pdf')}
                                    className="hidden"
                                />
                                <FileText className="w-5 h-5" />
                                <span className="font-medium">PDF Document</span>
                            </label>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-5 py-2.5 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleGenerate}
                        disabled={loading}
                        className="px-5 py-2.5 rounded-xl text-sm font-bold bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-black dark:hover:bg-gray-100 shadow-lg shadow-gray-900/10 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {loading && <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>}
                        Download {exportFormat.toUpperCase()}
                    </button>
                </div>
            </div>
        </div>
    );
}
