import type { AttendanceStatus } from '../../types/attendance';

interface AttendanceTimerProps {
    status: AttendanceStatus;
    elapsedSeconds: number;
    workHoursGoal: number;
    percentage: number;
    formatTime: (seconds: number) => string;
}

export const AttendanceTimer = ({
    status,
    elapsedSeconds,
    workHoursGoal,
    percentage,
    formatTime
}: AttendanceTimerProps) => {
    return (
        <div className="flex flex-col items-center">
            {/* Timer Display */}
            <div className="relative mb-2">
                <div className={`text-8xl font-sans font-semibold tracking-tighter tabular-nums transition-colors duration-500 ${status === 'working' ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500'
                    }`}>
                    {formatTime(elapsedSeconds)}
                </div>
            </div>
            <div className="text-sm font-semibold tracking-[0.2em] text-gray-400 uppercase mb-12">
                Work Duration
            </div>

            {/* Premium Progress Bar */}
            <div className="w-full max-w-lg mb-8 group cursor-default">
                <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden shadow-inner border border-gray-100/50 dark:border-gray-700/50 relative">
                    <div
                        className={`h-full rounded-full transition-all duration-1000 ease-out relative ${status === 'completed' ? 'bg-purple-600' : 'bg-gradient-to-r from-purple-600 to-indigo-600'
                            }`}
                        style={{ width: `${percentage}%` }}
                    >
                        {/* Shimmer Effect */}
                        {status === 'working' && (
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent w-full -translate-x-full animate-[shimmer_2s_infinite]"></div>
                        )}
                    </div>
                </div>
                <div className="flex justify-between mt-3 text-xs font-medium text-gray-400">
                    <span>Start</span>
                    <span>{Math.round(percentage)}%</span>
                    <span>Goal: {workHoursGoal}h</span>
                </div>
            </div>
        </div>
    );
};
