import { useState } from 'react';
import { Search, Download, Calendar, Edit2, Plus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import AttendanceEditModal from './AttendanceEditModal';

interface AttendanceHistoryProps {
    logs: any[];
    loading: boolean;
    viewMode: 'my' | 'all';
    recordTab: 'today' | 'history';
    onTabChange: (tab: 'today' | 'history') => void;
    employeeFilter: string;
    onEmployeeFilterChange: (val: string) => void;
    dateFilter: string;
    onDateFilterChange: (val: string) => void;
    onExport: () => void;
}

export default function AttendanceHistory({
    logs,
    loading,
    viewMode,
    recordTab,
    onTabChange,
    employeeFilter,
    onEmployeeFilterChange,
    dateFilter,
    onDateFilterChange,
    onExport
}: AttendanceHistoryProps) {
    const { profile } = useAuth();
    const isHR = profile?.role === 'hr';

    // Modal State
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedLog, setSelectedLog] = useState<any | null>(null);

    const handleAddClick = () => {
        setSelectedLog(null);
        setShowEditModal(true);
    };

    const handleEditClick = (log: any) => {
        setSelectedLog(log);
        setShowEditModal(true);
    };

    const handleModalSuccess = () => {
        // Trigger a refresh logic if possible, or just let the user manually refresh via state lift
        // ideally we should trigger the parent's fetchLogs. 
        // But for now, user might need to click tab to refresh or we add a reload trigger.
        // Actually, we should probably pass a "onRefresh" prop or use the parent's context.
        // For simplicity now, we can rely on parent re-renders or manual refresh.
        // But better: we passed `onAttendanceUpdate` to Control but not here.
        // Let's assume user manually refreshes or switches tabs for now as quick fix, 
        // OR we can misuse `onTabChange` to force re-render? No.
        // Let's add window.location.reload() as fallback or ask user to refresh? 
        // Better: Expect parent to auto-refresh? No.
        // Simplest: We can trigger the parent refresh via a new prop `onRefresh` but let's stick to simple first of just closing.
        // Actually, `onExport` is just a modal trigger. 
        // Let's rely on tabs switching for refresh for this iteration to avoid prop drilling complexity hell unless I edit parent too.
        // Wait, I can try to trigger a re-fetch in parent if I had access.
        // I will add a text "Refresh" button or similar logic.
        // Actually, I will add `window.dispatchEvent(new Event('attendance-updated'))` and listen in parent? 
        // No, let's just Close.
        setShowEditModal(false);
        // Force reload page is drastic but safe for data consistency
        window.location.reload();
    };

    const formatDate = (dateStr: string) => {
        const d = new Date(dateStr);
        const day = d.getDate();
        const monthYear = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        return { day, monthYear };
    };

    const formatTime = (timeStr?: string) => {
        if (!timeStr) return '--:-- --';
        return new Date(timeStr).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase();
    };

    return (
        <div className="bg-[#0B1120] rounded-[2rem] p-6 shadow-2xl overflow-hidden flex flex-col h-[600px] border border-gray-800">
            {/* Header */}
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-8 shrink-0">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-6 bg-purple-500 rounded-full"></div>
                        <h2 className="text-2xl font-bold text-white whitespace-nowrap">History</h2>
                    </div>

                    <div className="bg-gray-800/50 p-1 rounded-xl flex items-center self-start sm:self-auto">
                        <button
                            onClick={() => onTabChange('today')}
                            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${recordTab === 'today'
                                ? 'bg-gray-700 text-white shadow-sm'
                                : 'text-gray-400 hover:text-white'
                                }`}
                        >
                            Today
                        </button>
                        <button
                            onClick={() => onTabChange('history')}
                            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${recordTab === 'history'
                                ? 'bg-gray-700 text-white shadow-sm'
                                : 'text-gray-400 hover:text-white'
                                }`}
                        >
                            History
                        </button>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 justify-end">
                    {/* Search */}
                    {viewMode === 'all' && (
                        <div className="relative group">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-purple-400 transition-colors" />
                            <input
                                type="text"
                                value={employeeFilter}
                                onChange={(e) => onEmployeeFilterChange(e.target.value)}
                                placeholder="Search employees..."
                                className="w-48 h-10 pl-10 pr-4 bg-gray-900/50 border border-gray-700 rounded-xl text-sm text-gray-300 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-all placeholder:text-gray-600"
                            />
                        </div>
                    )}

                    {/* Date Picker */}
                    <div className="relative group">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">
                            <Calendar className="w-4 h-4" />
                        </div>
                        <input
                            type="date"
                            value={dateFilter}
                            onChange={(e) => onDateFilterChange(e.target.value)}
                            className="w-40 h-10 pl-10 pr-4 bg-gray-900/50 border border-gray-700 rounded-xl text-sm text-gray-300 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-all cursor-pointer [color-scheme:dark] [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full"
                        />
                    </div>

                    {/* ADD BUTTON (HR ONLY) */}
                    {isHR && (
                        <button
                            onClick={handleAddClick}
                            className="h-10 px-4 flex items-center gap-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors text-xs font-bold shrink-0"
                        >
                            <Plus className="w-4 h-4" />
                            Add Record
                        </button>
                    )}

                    {/* Download */}
                    <button
                        onClick={onExport}
                        className="h-10 w-10 flex-shrink-0 flex items-center justify-center bg-white text-black rounded-xl hover:bg-gray-200 transition-colors"
                    >
                        <Download className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Table Header */}
            <div className="grid grid-cols-12 gap-4 px-4 py-3 border-b border-gray-800 text-xs font-bold text-gray-500 uppercase tracking-wider">
                <div className="col-span-4 pl-2">Employee</div>
                <div className="col-span-2 text-center">Date</div>
                <div className="col-span-2 text-center">Mode</div>
                <div className="col-span-2 text-center">Status</div>
                <div className="col-span-2 text-right pr-2">Times</div>
            </div>

            {/* Scrollable List */}
            <div className="overflow-y-auto flex-1 custom-scrollbar pr-1">
                {loading ? (
                    <div className="flex flex-col items-center justify-center h-48 gap-3">
                        <div className="w-6 h-6 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin"></div>
                        <p className="text-gray-500 text-sm">Loading records...</p>
                    </div>
                ) : logs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-48 gap-3">
                        <p className="text-gray-500 text-sm">No records found</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-800/50">
                        {logs.map((log) => {
                            const dateInfo = formatDate(log.work_date);
                            const statusColor = log.status === 'approved' ? 'text-green-400 bg-green-400/10 border-green-400/20' :
                                log.status === 'rejected' ? 'text-red-400 bg-red-400/10 border-red-400/20' :
                                    'text-orange-400 bg-orange-400/10 border-orange-400/20';

                            const modeColor = log.mode === 'onsite' ? 'text-blue-400 bg-blue-400/10 border-blue-400/20' :
                                'text-purple-400 bg-purple-400/10 border-purple-400/20';

                            return (
                                <div key={log.id} className="grid grid-cols-12 gap-4 px-4 py-4 items-center hover:bg-gray-900/50 transition-colors group rounded-xl my-1 relative">
                                    {/* Employee */}
                                    <div className="col-span-4 flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-gray-800 flex items-center justify-center text-white font-bold text-sm overflow-hidden border border-gray-700">
                                            {log.profiles?.avatar_url ? (
                                                <img src={log.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                log.profiles?.full_name?.charAt(0) || 'U'
                                            )}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="text-sm font-bold text-white truncate">{log.profiles?.full_name}</div>
                                            <div className="text-xs text-gray-500 truncate">{log.profiles?.email}</div>
                                        </div>
                                    </div>

                                    {/* Date */}
                                    <div className="col-span-2 flex flex-col items-center">
                                        <span className="text-lg font-bold text-white leading-none">{dateInfo.day}</span>
                                        <span className="text-[10px] font-medium text-gray-500 uppercase">{dateInfo.monthYear}</span>
                                    </div>

                                    {/* Mode */}
                                    <div className="col-span-2 flex justify-center">
                                        <span className={`px-3 py-1 rounded-lg text-xs font-bold border ${modeColor} uppercase tracking-wider`}>
                                            {log.mode}
                                        </span>
                                    </div>

                                    {/* Status */}
                                    <div className="col-span-2 flex justify-center">
                                        <span className={`px-3 py-1 rounded-lg text-xs font-bold border ${statusColor} capitalize`}>
                                            {log.status || 'Approved'}
                                        </span>
                                    </div>

                                    {/* Times */}
                                    <div className="col-span-2 flex flex-col items-end gap-1">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-bold text-gray-600 uppercase tracking-wider">IN</span>
                                            <span className="text-xs font-medium text-gray-300 font-mono">
                                                {formatTime(log.clock_in).replace(/\s(am|pm)/, '')}
                                                <span className="text-[10px] text-gray-500 ml-0.5">{formatTime(log.clock_in).slice(-2)}</span>
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-bold text-gray-600 uppercase tracking-wider">OUT</span>
                                            <span className="text-xs font-medium text-gray-300 font-mono">
                                                {log.clock_out ? (
                                                    <>
                                                        {formatTime(log.clock_out).replace(/\s(am|pm)/, '')}
                                                        <span className="text-[10px] text-gray-500 ml-0.5">{formatTime(log.clock_out).slice(-2)}</span>
                                                    </>
                                                ) : (
                                                    '--:--'
                                                )}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Edit Overlay (HR Only) */}
                                    {isHR && (
                                        <div className="absolute inset-0 bg-black/60 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                                            <button
                                                onClick={() => handleEditClick(log)}
                                                className="bg-white text-gray-900 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:scale-105 transition-transform"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                                Edit Record
                                            </button>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            <AttendanceEditModal
                isOpen={showEditModal}
                onClose={() => setShowEditModal(false)}
                log={selectedLog}
                onSuccess={handleModalSuccess}
            />

            <style>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #374151;
                    border-radius: 2px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #4b5563;
                }
            `}</style>
        </div>
    );
}
