import type { AttendanceStatus } from '../../types/attendance';

interface AttendanceTimerProps {
    status: AttendanceStatus;
    elapsedSeconds: number;
    formatTime: (seconds: number) => string;
}

export const AttendanceTimer = ({
    status,
    elapsedSeconds,
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
                Shift Duration
            </div>
        </div>
    );
};
