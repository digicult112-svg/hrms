import type { AttendanceStatus } from '../../types/attendance';

interface AttendanceHeaderProps {
    status: AttendanceStatus;
    wfhRejected: boolean;
}

export const AttendanceHeader = ({ status, wfhRejected }: AttendanceHeaderProps) => {
    return (
        <div className="flex justify-between items-start mb-10">
            <div>
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">Attendance</h2>
                <p className="text-gray-500 dark:text-gray-400 font-medium mt-1">
                    {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </p>
            </div>

            <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold border shadow-sm transition-all ${wfhRejected ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-100 dark:border-red-900/30' :
                status === 'working' ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800' :
                    status === 'paused' ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-900/30' :
                        status === 'completed' ? 'bg-gray-100/80 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700' :
                            'bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-100 dark:border-gray-700'
                }`}>
                <div className={`w-2 h-2 rounded-full ${wfhRejected ? 'bg-red-500' :
                    status === 'working' ? 'bg-purple-500 animate-pulse' :
                        status === 'paused' ? 'bg-amber-500' :
                            status === 'completed' ? 'bg-gray-500' :
                                'bg-gray-400'
                    }`} />
                {wfhRejected ? 'Rejected' : status === 'idle' ? 'Not Started' : status === 'paused' ? 'Paused' : status === 'completed' ? 'Completed' : 'Working'}
            </div>
        </div>
    );
};
