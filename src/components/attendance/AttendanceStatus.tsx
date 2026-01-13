import { Briefcase, AlertCircle, Clock, Check } from 'lucide-react';
import type { AttendanceStatus, AttendanceMode } from '../../types/attendance';

interface AttendanceStatusProps {
    status: AttendanceStatus;
    mode: AttendanceMode;
    wfhRejected: boolean;
    isPendingApproval: boolean;
    workHoursGoal: number;
}

export const AttendanceStatusCard = ({
    status,
    mode,
    wfhRejected,
    isPendingApproval,
    workHoursGoal
}: AttendanceStatusProps) => {
    if (status === 'completed') {
        return (
            <div className="max-w-md mx-auto bg-purple-50/50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800 rounded-3xl p-8 text-center animate-in zoom-in-95 duration-300">
                <div className="mx-auto w-16 h-16 bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 rounded-full flex items-center justify-center mb-4 shadow-lg shadow-purple-100/50 dark:shadow-purple-900/30">
                    <Check className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">You're All Done!</h3>
                <p className="text-gray-600 dark:text-gray-400 font-medium">Have a great evening.</p>
            </div>
        );
    }

    if (mode === 'wfh' && status !== 'idle') {
        return (
            <div className="text-center animate-in fade-in zoom-in duration-300">
                <div className={`mx-auto w-20 h-20 rounded-3xl flex items-center justify-center mb-6 shadow-xl ${wfhRejected ? 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 shadow-red-100 dark:shadow-red-900/20' :
                    isPendingApproval ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 shadow-amber-100 dark:shadow-amber-900/20' :
                        'bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 shadow-purple-100 dark:shadow-purple-900/20'
                    }`}>
                    {wfhRejected ? <AlertCircle className="w-10 h-10" /> :
                        isPendingApproval ? <Clock className="w-10 h-10" /> :
                            <Briefcase className="w-10 h-10" />}
                </div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    {wfhRejected ? 'Request Rejected' : isPendingApproval ? 'Awaiting Approval' : 'Attendance Approved'}
                </h3>
                <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto leading-relaxed">
                    {wfhRejected ? 'Please contact HR. Your request was marked as rejected.' :
                        isPendingApproval ? 'Your request has been submitted and is waiting for HR approval.' :
                            `You are successfully clocked in for ${workHoursGoal} hours.`}
                </p>
            </div>
        );
    }

    return null;
};
