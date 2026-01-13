export type AttendanceStatus = 'idle' | 'working' | 'paused' | 'completed';
export type AttendanceMode = 'onsite' | 'wfh';

export interface AttendanceLog {
    id: string;
    user_id: string;
    work_date: string;
    clock_in: string;
    clock_out: string | null;
    mode: AttendanceMode;
    geo_lat: number | null;
    geo_lon: number | null;
    wfh_reason: string | null;
    status: 'pending' | 'approved' | 'rejected';
    last_pause_time: string | null;
    total_pause_seconds: number;
    total_hours: number | null;
    created_at?: string;
}

export interface AttendanceState {
    status: AttendanceStatus;
    mode: AttendanceMode;
    wfhReason: string;
    startTime: Date | null;
    elapsedSeconds: number;
    loading: boolean;
    locationError: string | null;
    wfhRejected: boolean;
    isPendingApproval: boolean;
    todayLogId: string | null;
}
