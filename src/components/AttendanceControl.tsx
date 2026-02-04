import { useAttendance } from '../hooks/useAttendance';
import { AttendanceHeader } from './attendance/AttendanceHeader';
import { AttendanceStatusCard } from './attendance/AttendanceStatus';
import { AttendanceTimer } from './attendance/AttendanceTimer';
import { AttendanceActions } from './attendance/AttendanceActions';

export default function AttendanceControl({ onAttendanceUpdate }: { onAttendanceUpdate?: () => void }) {
    const {
        status,
        mode,
        setMode,
        wfhReason,
        setWfhReason,
        elapsedSeconds,
        loading,
        locationError,
        wfhRejected,
        isPendingApproval,
        handleClockIn,
        handleClockOut,
        handlePause,
        handleResume,
        formatTime
    } = useAttendance(onAttendanceUpdate);

    return (
        <div className="bg-white dark:bg-gray-900 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-gray-100 dark:border-gray-800 overflow-hidden relative group transition-colors duration-200">
            {/* Decorative Ambient Background */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-purple-50/50 dark:bg-purple-900/10 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none"></div>

            <div className="p-8 relative z-10">
                <AttendanceHeader status={status} wfhRejected={wfhRejected} />

                {/* Main Content Area */}
                <div className="relative min-h-[220px] flex flex-col justify-center">
                    <AttendanceStatusCard
                        status={status}
                        mode={mode}
                        wfhRejected={wfhRejected}
                        isPendingApproval={isPendingApproval}
                    />

                    {mode === 'onsite' && status !== 'completed' && (
                        <AttendanceTimer
                            status={status}
                            elapsedSeconds={elapsedSeconds}
                            formatTime={formatTime}
                        />
                    )}
                </div>

                <AttendanceActions
                    status={status}
                    mode={mode}
                    setMode={setMode}
                    wfhReason={wfhReason}
                    setWfhReason={setWfhReason}
                    loading={loading}
                    locationError={locationError}
                    handleClockIn={handleClockIn}
                    handleClockOut={handleClockOut}
                    handlePause={handlePause}
                    handleResume={handleResume}
                />
            </div>
        </div>
    );
}
