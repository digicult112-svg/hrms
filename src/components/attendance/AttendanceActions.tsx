import { Play, MapPin, Briefcase, Loader2, Pause, AlertCircle } from 'lucide-react';
import type { AttendanceStatus, AttendanceMode } from '../../types/attendance';

interface AttendanceActionsProps {
    status: AttendanceStatus;
    mode: AttendanceMode;
    setMode: (mode: AttendanceMode) => void;
    wfhReason: string;
    setWfhReason: (reason: string) => void;
    loading: boolean;
    locationError: string | null;
    handleClockIn: () => void;
    handlePause: () => void;
    handleResume: () => void;
    workHoursGoal: number;
}

export const AttendanceActions = ({
    status,
    mode,
    setMode,
    wfhReason,
    setWfhReason,
    loading,
    locationError,
    handleClockIn,
    handlePause,
    handleResume,
    workHoursGoal
}: AttendanceActionsProps) => {

    if (status === 'completed') return null;

    return (
        <div className="mt-8 pt-8 border-t border-gray-100 dark:border-gray-800">
            {locationError && (
                <div className="mb-6 bg-red-50/50 dark:bg-red-900/20 backdrop-blur-sm border border-red-100 dark:border-red-900/30 text-red-600 dark:text-red-400 p-4 rounded-2xl flex items-start gap-3 animate-in slide-in-from-top-2">
                    <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                    <p className="font-medium text-sm">{locationError}</p>
                </div>
            )}

            {status === 'idle' ? (
                <div className="space-y-6 max-w-md mx-auto">
                    <div className="flex p-1.5 bg-gray-100/50 dark:bg-gray-800/50 rounded-2xl border border-gray-200/50 dark:border-gray-700/50 gap-2">
                        <button
                            onClick={() => setMode('onsite')}
                            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all duration-200 ${mode === 'onsite'
                                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-md ring-1 ring-black/5 dark:ring-white/5'
                                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-200/50 dark:hover:bg-gray-700/50'
                                }`}
                        >
                            <Briefcase className="w-4 h-4" />
                            Office
                        </button>
                        <button
                            onClick={() => setMode('wfh')}
                            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all duration-200 ${mode === 'wfh'
                                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-md ring-1 ring-black/5 dark:ring-white/5'
                                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-200/50 dark:hover:bg-gray-700/50'
                                }`}
                        >
                            <MapPin className="w-4 h-4" />
                            Remote
                        </button>
                    </div>

                    {mode === 'wfh' && (
                        <div className="animate-in slide-in-from-top-4 fade-in">
                            <textarea
                                value={wfhReason}
                                onChange={(e) => setWfhReason(e.target.value)}
                                placeholder="Reason for working from home..."
                                className="w-full p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-600 focus:border-transparent transition-all placeholder:text-gray-400 dark:placeholder:text-gray-500 min-h-[100px] resize-none"
                            />
                        </div>
                    )}

                    <button
                        onClick={handleClockIn}
                        disabled={loading}
                        className="w-full bg-gray-900 dark:bg-white hover:bg-black dark:hover:bg-gray-200 text-white dark:text-gray-900 py-4 rounded-2xl font-bold text-lg shadow-xl shadow-gray-900/10 dark:shadow-white/10 hover:shadow-gray-900/20 active:scale-[0.99] transition-all duration-200 flex items-center justify-center gap-3"
                    >
                        {loading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <>
                                <Play className="w-5 h-5 fill-current" />
                                Start Your Day
                            </>
                        )}
                    </button>
                </div>
            ) : (
                mode !== 'wfh' && (
                    <div className="max-w-md mx-auto space-y-4">
                        <div className="space-y-4">
                            {status === 'working' ? (
                                <button
                                    onClick={handlePause}
                                    disabled={loading}
                                    className="w-full bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 hover:border-gray-200 dark:hover:border-gray-600 text-gray-900 dark:text-white py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-sm hover:shadow-md"
                                >
                                    <Pause className="w-5 h-5 fill-current" />
                                    Pause
                                </button>
                            ) : (
                                <button
                                    onClick={handleResume}
                                    disabled={loading}
                                    className="w-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-black dark:hover:bg-gray-200 py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-lg shadow-gray-900/10 dark:shadow-white/10"
                                >
                                    <Play className="w-5 h-5 fill-current" />
                                    Resume
                                </button>
                            )}
                        </div>
                        <p className="text-center text-xs font-medium text-gray-400 uppercase tracking-wide">
                            Shift ends automatically at {workHoursGoal}h
                        </p>
                    </div>
                )
            )}
        </div>
    );
};
