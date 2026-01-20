import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { toLocalISOString } from '../utils/date';
import { notifyHR } from '../lib/notifications';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import type { AttendanceLog, AttendanceMode, AttendanceStatus } from '../types/attendance';

// Helper for timeout
const withTimeout = <T>(promise: PromiseLike<T>): Promise<T> => {
    const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Request timed out. Please check your internet connection.')), 15000)
    );
    return Promise.race([Promise.resolve(promise), timeout]);
};

export const useAttendance = (onAttendanceUpdate?: () => void) => {
    const { user, profile } = useAuth();
    const { success, error: toastError } = useToast();

    // State
    const [status, setStatus] = useState<AttendanceStatus>('idle');
    const [mode, setMode] = useState<AttendanceMode>('onsite');
    const [wfhReason, setWfhReason] = useState('');
    const [startTime, setStartTime] = useState<Date | null>(null);
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const [loading, setLoading] = useState(true);
    const [locationError, setLocationError] = useState<string | null>(null);
    const [todayLogId, setTodayLogId] = useState<string | null>(null);

    // Simple pause tracking
    const [totalPauseSeconds, setTotalPauseSeconds] = useState(0);
    const [lastPauseTime, setLastPauseTime] = useState<Date | null>(null);
    const [wfhRejected, setWfhRejected] = useState(false);
    const [isPendingApproval, setIsPendingApproval] = useState(false);

    // Constants
    const WORK_HOURS_GOAL = profile?.daily_work_hours || 8;
    const TOTAL_SECONDS_GOAL = WORK_HOURS_GOAL * 3600;
    const percentage = Math.min((elapsedSeconds / TOTAL_SECONDS_GOAL) * 100, 100);

    // --- Logic ---

    const checkTodayAttendance = async () => {
        if (!user) {
            setLoading(false);
            return null;
        }

        try {
            // Get the server's definition of "Today" to handle timezone discrepancies
            const { data: serverToday, error: rpcError } = await supabase.rpc('get_server_today');
            if (rpcError) throw rpcError;

            const { data, error } = await supabase
                .from('attendance_logs')
                .select('*')
                .eq('user_id', user.id)
                .eq('work_date', serverToday)
                .maybeSingle();

            if (error) throw error;

            if (data) {
                const log = data as AttendanceLog;
                setTodayLogId(log.id);
                setMode(log.mode);
                if (log.wfh_reason) setWfhReason(log.wfh_reason);

                if (log.status === 'rejected') setWfhRejected(true);
                if (log.status === 'pending') setIsPendingApproval(true);
                else setIsPendingApproval(false);

                const clockInTime = new Date(log.clock_in);
                setStartTime(clockInTime);

                if (log.clock_out) {
                    setStatus('completed');
                    const start = new Date(log.clock_in);
                    const end = new Date(log.clock_out);
                    const duration = (end.getTime() - start.getTime()) / 1000 - (log.total_pause_seconds || 0);
                    setElapsedSeconds(Math.max(0, duration));
                } else if (log.last_pause_time) {
                    setStatus('paused');
                    setLastPauseTime(new Date(log.last_pause_time));
                    setTotalPauseSeconds(log.total_pause_seconds || 0);

                    const pauseStart = new Date(log.last_pause_time);
                    const diff = (pauseStart.getTime() - clockInTime.getTime()) / 1000 - (log.total_pause_seconds || 0);
                    setElapsedSeconds(Math.max(0, diff));
                } else {
                    setStatus('working');
                    setTotalPauseSeconds(log.total_pause_seconds || 0);

                    const now = new Date();
                    const diff = (now.getTime() - clockInTime.getTime()) / 1000 - (log.total_pause_seconds || 0);
                    setElapsedSeconds(Math.max(0, diff));
                }
                return log;
            }
            return null;
        } catch (error) {
            console.error('Error checking attendance:', error);
            return null;
        } finally {
            setLoading(false);
        }
    };

    // Initial Check
    useEffect(() => {
        checkTodayAttendance();
    }, [user, profile]);

    // Real-time subscription
    useEffect(() => {
        if (!todayLogId) return;

        const channel = supabase
            .channel(`attendance_update_${todayLogId}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'attendance_logs',
                    filter: `id=eq.${todayLogId}`
                },
                (payload) => {
                    const data = payload.new as AttendanceLog;

                    // Handle clock out
                    if (data.clock_out) {
                        const start = new Date(data.clock_in);
                        const end = new Date(data.clock_out);
                        const duration = (end.getTime() - start.getTime()) / 1000 - (data.total_pause_seconds || 0);

                        setStatus('completed');
                        setElapsedSeconds(Math.max(0, duration));
                        return;
                    }

                    if (data.status === 'rejected') {
                        setWfhRejected(true);
                        setIsPendingApproval(false);
                    } else if (data.status === 'approved') {
                        setIsPendingApproval(false);
                        setWfhRejected(false);
                    }

                    if (data.last_pause_time) {
                        const pauseStart = new Date(data.last_pause_time);
                        setLastPauseTime(pauseStart);
                        setTotalPauseSeconds(data.total_pause_seconds || 0);
                        setStatus('paused');
                        const diff = (pauseStart.getTime() - new Date(data.clock_in).getTime()) / 1000 - (data.total_pause_seconds || 0);
                        setElapsedSeconds(Math.max(0, diff));
                    } else {
                        setTotalPauseSeconds(data.total_pause_seconds || 0);
                        const now = new Date();
                        const diff = (now.getTime() - new Date(data.clock_in).getTime()) / 1000 - (data.total_pause_seconds || 0);
                        const currentElapsed = Math.max(0, diff);
                        setElapsedSeconds(currentElapsed);

                        if (currentElapsed >= TOTAL_SECONDS_GOAL) {
                            performAutoClockOut(data.id, new Date(data.clock_in), data.total_pause_seconds || 0, TOTAL_SECONDS_GOAL);
                        } else {
                            setStatus('working');
                        }
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [todayLogId]);

    // Refs for timer loop
    const statusRef = useRef(status);
    const startTimeRef = useRef(startTime);
    const totalPauseSecondsRef = useRef(totalPauseSeconds);
    const wfhRejectedRef = useRef(wfhRejected);
    const todayLogIdRef = useRef(todayLogId);

    // Sync refs
    useEffect(() => {
        statusRef.current = status;
        startTimeRef.current = startTime;
        totalPauseSecondsRef.current = totalPauseSeconds;
        wfhRejectedRef.current = wfhRejected;
        todayLogIdRef.current = todayLogId;
    }, [status, startTime, totalPauseSeconds, wfhRejected, todayLogId]);

    // Timer Interval
    useEffect(() => {
        const interval = setInterval(() => {
            const currentStatus = statusRef.current;
            const start = startTimeRef.current;
            const rejected = wfhRejectedRef.current;
            const pauseSeconds = totalPauseSecondsRef.current;

            if (currentStatus === 'working' && start && !rejected) {
                const now = new Date();
                const diff = (now.getTime() - start.getTime()) / 1000 - pauseSeconds;
                const currentElapsed = Math.max(0, diff);
                setElapsedSeconds(currentElapsed);

                if (currentElapsed >= TOTAL_SECONDS_GOAL && todayLogIdRef.current) {
                    performAutoClockOut(todayLogIdRef.current, start, pauseSeconds, TOTAL_SECONDS_GOAL);
                }
            }
        }, 100);

        return () => clearInterval(interval);
    }, [TOTAL_SECONDS_GOAL]);

    const performAutoClockOut = async (logId: string, start: Date, pauseSeconds: number, goalSeconds: number) => {
        const endTimeMs = start.getTime() + (pauseSeconds * 1000) + (goalSeconds * 1000);
        const endDate = new Date(endTimeMs);
        const now = new Date();
        const clockOutTime = endDate > now ? now : endDate;

        try {
            const { error } = await supabase
                .from('attendance_logs')
                .update({
                    clock_out: clockOutTime.toISOString(),
                    last_pause_time: null,
                    total_pause_seconds: pauseSeconds,
                    total_hours: parseFloat((goalSeconds / 3600).toFixed(2))
                })
                .eq('id', logId);

            if (error) throw error;

            setStatus('completed');
            setElapsedSeconds(goalSeconds);
            if (onAttendanceUpdate) onAttendanceUpdate();
        } catch (error) {
            console.error('Error performing auto clock out:', error);
        }
    };

    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const R = 6371e3;
        const φ1 = lat1 * Math.PI / 180;
        const φ2 = lat2 * Math.PI / 180;
        const Δφ = (lat2 - lat1) * Math.PI / 180;
        const Δλ = (lon2 - lon1) * Math.PI / 180;

        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return R * c;
    };

    const getLocation = (): Promise<GeolocationPosition> => {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Geolocation is not supported by your browser'));
            } else {
                const options = {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 0
                };
                navigator.geolocation.getCurrentPosition(resolve, reject, options);
            }
        });
    };

    const validateLocation = async (lat: number, lon: number) => {
        if (!profile?.base_location_id) return true;

        const { data: office, error } = await supabase
            .from('office_locations')
            .select('*')
            .eq('id', profile.base_location_id)
            .single();

        if (error || !office) return true;

        const distance = calculateDistance(lat, lon, office.latitude, office.longitude);
        return distance <= office.radius_m;
    };

    const handleClockIn = async () => {
        if (!user) return;

        if (mode === 'wfh' && !wfhReason.trim()) {
            setLocationError('Please provide a reason for Work From Home.');
            return;
        }

        setLoading(true);
        setLocationError(null);

        try {
            let lat = null;
            let lon = null;

            if (mode === 'onsite') {
                try {
                    const position = await getLocation();
                    lat = position.coords.latitude;
                    lon = position.coords.longitude;

                    const isValid = await validateLocation(lat, lon);
                    if (!isValid) {
                        throw new Error('You are not within the office premises.');
                    }
                } catch (err: any) {
                    setLocationError(err.message || 'Location access is required for Onsite attendance.');
                    setLoading(false);
                    return;
                }
            }

            const { data, error } = await withTimeout(
                supabase
                    .from('attendance_logs')
                    .insert({
                        user_id: user.id,
                        // work_date: removed - let DB DEFAULT CURRENT_DATE handle it
                        // clock_in: removed - let DB DEFAULT NOW() handle it
                        mode: mode,
                        geo_lat: lat,
                        geo_lon: lon,
                        wfh_reason: mode === 'wfh' ? wfhReason : null,
                        status: mode === 'wfh' ? 'pending' : 'approved',
                        total_pause_seconds: 0
                    })
                    .select()
                    .single()
            ) as any;

            if (error) throw error;

            setTodayLogId(data.id);
            setStartTime(new Date(data.clock_in)); // Use the timestamp returned by the server
            setStatus('working');
            if (mode === 'wfh') {
                setIsPendingApproval(true);
                notifyHR(
                    'Remote Work Request',
                    `${profile?.full_name || 'An employee'} has requested to work primarily from home today. Reason: ${wfhReason}`,
                    'info'
                );
            } else {
                supabase
                    .from('system_settings')
                    .select('value')
                    .eq('key', 'enable_clock_in_notifications')
                    .single()
                    .then(({ data }) => {
                        if (data && data.value === 'true') {
                            notifyHR(
                                'Clock In Alert',
                                `${profile?.full_name || 'An employee'} has clocked in from Office.`,
                                'info',
                                false
                            );
                        }
                    });
            }
            if (onAttendanceUpdate) onAttendanceUpdate();
            success('Good Morning!', `You have clocked in successfully via ${mode === 'onsite' ? 'Office' : 'Remote'}.`);

        } catch (error: any) {
            console.error('Error clocking in:', error);
            const msg = error.message || 'Failed to clock in';
            setLocationError(msg);
            toastError('Clock In Failed', msg);
        } finally {
            setLoading(false);
        }
    };

    const handlePause = async () => {
        let currentLogId = todayLogId;
        if (!currentLogId) {
            console.log('No active log ID found, refreshing...');
            const data = await checkTodayAttendance();
            if (data) currentLogId = data.id;
            else return;
        }

        setLoading(true);

        try {
            const now = new Date();
            const { error } = await withTimeout(
                supabase
                    .from('attendance_logs')
                    .update({ last_pause_time: now.toISOString() })
                    .eq('id', currentLogId)
            ) as any;

            if (error) throw error;

            setLastPauseTime(now);
            setStatus('paused');
            success('Paused', 'Work timer paused.');
        } catch (error: any) {
            console.error('Error pausing:', error);
            toastError('Pause Failed', error.message || 'Please check your connection.');
        } finally {
            setLoading(false);
        }
    };

    const handleResume = async () => {
        let currentLogId = todayLogId;
        let currentLastPauseTime = lastPauseTime;

        if (!currentLogId || !currentLastPauseTime) {
            console.log('Missing state for resume, refreshing...');
            const data = await checkTodayAttendance();
            if (data) {
                currentLogId = data.id;
                currentLastPauseTime = data.last_pause_time ? new Date(data.last_pause_time) : null;
            } else {
                return;
            }
        }

        if (!currentLogId || !currentLastPauseTime) return;

        setLoading(true);

        try {
            const now = new Date();
            const pauseDuration = (now.getTime() - currentLastPauseTime.getTime()) / 1000;
            const newTotalPause = Math.floor(totalPauseSeconds + pauseDuration);

            const { error } = await withTimeout(
                supabase
                    .from('attendance_logs')
                    .update({
                        last_pause_time: null,
                        total_pause_seconds: newTotalPause
                    })
                    .eq('id', currentLogId)
            ) as any;

            if (error) throw error;

            setTotalPauseSeconds(newTotalPause);
            setLastPauseTime(null);
            setStatus('working');
            success('Resumed', 'Work timer resumed.');
        } catch (error: any) {
            console.error('Error resuming:', error);
            toastError('Resume Failed', error.message || 'Please check your connection.');
        } finally {
            setLoading(false);
        }
    };

    const formatTime = (totalSeconds: number) => {
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = Math.floor(totalSeconds % 60);
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    };

    return {
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
        WORK_HOURS_GOAL,
        TOTAL_SECONDS_GOAL,
        percentage,
        handleClockIn,
        handlePause,
        handleResume,
        formatTime
    };
};
