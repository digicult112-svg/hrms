import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { notifyHR, notifyUser } from '../lib/notifications';
import type { LeaveCalendarEvent } from '../types';
import { useAuth } from '../context/AuthContext';
import { CheckCircle, XCircle, Plus, X, ChevronLeft, ChevronRight } from 'lucide-react';

export default function LeavePage() {
    const { user, profile } = useAuth();
    const [activeTab, setActiveTab] = useState<'apply' | 'history' | 'calendar'>('history');
    const [leaves, setLeaves] = useState<any[]>([]);
    const [events, setEvents] = useState<LeaveCalendarEvent[]>([]);
    const [loading, setLoading] = useState(true);

    // Form state
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [reason, setReason] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // Event Form state
    const [showEventModal, setShowEventModal] = useState(false);
    const [eventTitle, setEventTitle] = useState('');
    const [eventDate, setEventDate] = useState('');
    const [eventDescription, setEventDescription] = useState('');
    const [addingEvent, setAddingEvent] = useState(false);

    // Calendar View State
    const [currentMonthDate, setCurrentMonthDate] = useState(new Date());

    useEffect(() => {
        fetchLeaves();
        fetchEvents();
    }, [user]);

    const fetchLeaves = async () => {
        try {
            let query = supabase.from('leave_requests')
                .select(`
                    *,
                    profiles:user_id (
                        full_name,
                        email,
                        avatar_url
                    )
                `)
                .order('created_at', { ascending: false });

            // If not HR, only show own leaves
            if (profile?.role !== 'hr') {
                query = query.eq('user_id', user?.id);
            }

            const { data, error } = await query;
            if (error) throw error;
            setLeaves(data || []);
        } catch (error) {
            console.error('Error fetching leaves:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchEvents = async () => {
        try {
            // 1. Fetch Calendar Events
            const { data: calendarEvents, error: eventsError } = await supabase
                .from('leave_calendar_events')
                .select('*')
                .order('event_date');

            if (eventsError) throw eventsError;

            // 2. Fetch Employee Birthdays
            const { data: employees, error: empError } = await supabase
                .from('profiles')
                .select('id, full_name, date_of_birth')
                .not('date_of_birth', 'is', null);

            if (empError) throw empError;

            // 3. Transform Birthdays into "Virtual" Events for the Current AND Next/Prev year 
            // (Just to cover the rendering range)
            const birthdayEvents: LeaveCalendarEvent[] = [];
            const yearsToCover = [new Date().getFullYear() - 1, new Date().getFullYear(), new Date().getFullYear() + 1];

            employees?.forEach(emp => {
                if (!emp.date_of_birth) return;
                const dob = new Date(emp.date_of_birth);
                const month = String(dob.getMonth() + 1).padStart(2, '0');
                const day = String(dob.getDate()).padStart(2, '0');

                yearsToCover.forEach(year => {
                    birthdayEvents.push({
                        id: `bday-${emp.id}-${year}`,
                        title: `🎂 ${emp.full_name.split(' ')[0]}'s B-day`,
                        description: `Happy Birthday ${emp.full_name}!`,
                        event_date: `${year}-${month}-${day}`,
                        created_at: new Date().toISOString()
                    });
                });
            });

            setEvents([...(calendarEvents || []), ...birthdayEvents]);
        } catch (error) {
            console.error('Error fetching events:', error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const { error } = await supabase.from('leave_requests').insert({
                user_id: user?.id,
                start_date: startDate,
                end_date: endDate,
                reason,
                status: 'pending'
            });

            if (error) throw error;

            // Notify HR
            await notifyHR(
                'New Leave Request',
                `${profile?.full_name || 'An employee'} has requested leave from ${startDate} to ${endDate}.`,
                'info'
            );

            // Reset form and refresh
            setStartDate('');
            setEndDate('');
            setReason('');
            setActiveTab('history');
            fetchLeaves();
            alert('Leave request submitted successfully!');
        } catch (error: any) {
            console.error('Error submitting leave request:', error);
            alert(`Error: ${error.message}`);
        } finally {
            setSubmitting(false);
        }
    };

    const handleAddEvent = async (e: React.FormEvent) => {
        e.preventDefault();
        setAddingEvent(true);
        try {
            const { error } = await supabase.from('leave_calendar_events').insert({
                title: eventTitle,
                event_date: eventDate,
                description: eventDescription,
                created_by: user?.id
            });

            if (error) throw error;

            // Reset form and refresh
            setEventTitle('');
            setEventDate('');
            setEventDescription('');
            setShowEventModal(false);
            fetchEvents();
            alert('Holiday added successfully!');
        } catch (error: any) {
            console.error('Error adding event:', error);
            alert(`Error: ${error.message}`);
        } finally {
            setAddingEvent(false);
        }
    };

    const handleStatusUpdate = async (id: string, status: 'approved' | 'rejected') => {
        try {
            console.log('Attempting to update leave request:', id, 'to status:', status);

            const { data, error } = await supabase
                .from('leave_requests')
                .update({ status })
                .eq('id', id)
                .select();

            if (error) {
                console.error('Supabase error:', error);
                alert(`Failed to update leave request: ${error.message}`);
                throw error;
            }

            // Notify Employee
            const leaveRequest = leaves.find(l => l.id === id);
            if (leaveRequest) {
                await notifyUser(
                    leaveRequest.user_id,
                    `Leave Request ${status === 'approved' ? 'Approved' : 'Rejected'}`,
                    `Your leave request from ${leaveRequest.start_date} to ${leaveRequest.end_date} has been ${status}.`,
                    status === 'approved' ? 'success' : 'error'
                );
            }

            console.log('Update successful:', data);
            alert(`Leave request ${status} successfully!`);
            fetchLeaves();
        } catch (error: any) {
            console.error('Error updating status:', error);
            alert(`Error: ${error?.message || 'Unknown error occurred'}`);
        }
    };

    return (
        <div className="max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Leave Management</h1>
                <div className="flex space-x-2">
                    <button
                        onClick={() => setActiveTab('history')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'history' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}
                    >
                        History
                    </button>
                    <button
                        onClick={() => setActiveTab('apply')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'apply' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}
                    >
                        Apply for Leave
                    </button>
                    <button
                        onClick={() => setActiveTab('calendar')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'calendar' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}
                    >
                        Holiday Calendar
                    </button>
                </div>
            </div>

            {activeTab === 'apply' && (
                <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-6 max-w-2xl mx-auto transition-colors">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">New Leave Request</h2>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start Date</label>
                                <input
                                    type="date"
                                    required
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="block w-full rounded-lg border-gray-300 dark:border-gray-700 md:text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 transition-colors"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">End Date</label>
                                <input
                                    type="date"
                                    required
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="block w-full rounded-lg border-gray-300 dark:border-gray-700 md:text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 transition-colors"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reason</label>
                            <textarea
                                required
                                rows={4}
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                className="block w-full rounded-lg border-gray-300 dark:border-gray-700 md:text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 transition-colors"
                                placeholder="Please describe the reason for your leave..."
                            />
                        </div>
                        <div className="flex justify-end">
                            <button
                                type="submit"
                                disabled={submitting}
                                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium shadow-sm"
                            >
                                {submitting ? 'Submitting...' : 'Submit Request'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {activeTab === 'history' && (
                <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden transition-colors">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-sm border-b border-gray-200 dark:border-gray-700">
                                <tr>
                                    {profile?.role === 'hr' && <th className="px-6 py-3 font-medium">Employee</th>}
                                    <th className="px-6 py-3 font-medium">Dates</th>
                                    <th className="px-6 py-3 font-medium">Reason</th>
                                    <th className="px-6 py-3 font-medium">Status</th>
                                    <th className="px-6 py-3 font-medium">Applied On</th>
                                    {profile?.role === 'hr' && <th className="px-6 py-3 font-medium">Actions</th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                                {loading ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">Loading...</td>
                                    </tr>
                                ) : leaves.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">No leave requests found</td>
                                    </tr>
                                ) : (
                                    leaves.map((leave) => (
                                        <tr key={leave.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                            {profile?.role === 'hr' && (
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center">
                                                        <div className="h-8 w-8 rounded-full bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center text-purple-600 dark:text-purple-400 font-bold border border-purple-100 dark:border-purple-800 mr-3 overflow-hidden">
                                                            {leave.profiles?.avatar_url ? (
                                                                <img src={leave.profiles.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                                                            ) : (
                                                                leave.profiles?.full_name?.charAt(0) || 'U'
                                                            )}
                                                        </div>
                                                        <div>
                                                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                                                                {leave.profiles?.full_name || 'Unknown'}
                                                            </div>
                                                            <div className="text-xs text-gray-500 dark:text-gray-400">
                                                                {leave.profiles?.email}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                            )}
                                            <td className="px-6 py-4 text-gray-900 dark:text-gray-100">
                                                <div className="flex flex-col">
                                                    <span className="font-medium">{leave.start_date}</span>
                                                    <span className="text-gray-500 dark:text-gray-400 text-xs">to {leave.end_date}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-gray-700 dark:text-gray-300 max-w-xs truncate">{leave.reason}</td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${leave.status === 'approved' ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300' :
                                                    leave.status === 'rejected' ? 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300' :
                                                        'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300'
                                                    }`}>
                                                    {leave.status.charAt(0).toUpperCase() + leave.status.slice(1)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-gray-500 dark:text-gray-400 text-sm">
                                                {new Date(leave.created_at).toLocaleDateString()}
                                            </td>
                                            {profile?.role === 'hr' && (
                                                <td className="px-6 py-4">
                                                    {leave.status === 'pending' && (
                                                        <div className="flex space-x-2">
                                                            <button
                                                                onClick={() => handleStatusUpdate(leave.id, 'approved')}
                                                                className="text-green-600 hover:text-green-800"
                                                                title="Approve"
                                                            >
                                                                <CheckCircle className="w-5 h-5" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleStatusUpdate(leave.id, 'rejected')}
                                                                className="text-red-600 hover:text-red-800"
                                                                title="Reject"
                                                            >
                                                                <XCircle className="w-5 h-5" />
                                                            </button>
                                                        </div>
                                                    )}
                                                </td>
                                            )}
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'calendar' && (
                <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-6 transition-colors">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Holiday Calendar</h2>
                        <div className="flex items-center space-x-4">
                            <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-1 transition-colors">
                                <button
                                    onClick={() => setCurrentMonthDate(new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() - 1, 1))}
                                    className="p-1 hover:bg-white dark:hover:bg-gray-700 rounded-md shadow-sm transition-all text-gray-600 dark:text-gray-400 dark:hover:text-white"
                                >
                                    <ChevronLeft className="w-5 h-5" />
                                </button>
                                <span className="px-4 font-medium text-gray-900 dark:text-white min-w-[140px] text-center">
                                    {currentMonthDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                                </span>
                                <button
                                    onClick={() => setCurrentMonthDate(new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() + 1, 1))}
                                    className="p-1 hover:bg-white dark:hover:bg-gray-700 rounded-md shadow-sm transition-all text-gray-600 dark:text-gray-400 dark:hover:text-white"
                                >
                                    <ChevronRight className="w-5 h-5" />
                                </button>
                            </div>
                            {profile?.role === 'hr' && (
                                <button
                                    onClick={() => {
                                        setEventDate(new Date().toISOString().split('T')[0]);
                                        setShowEventModal(true);
                                    }}
                                    className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
                                >
                                    <Plus className="w-4 h-4 mr-2" />
                                    Add Holiday
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Calendar Grid */}
                    <div className="border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden transition-colors">
                        <div className="grid grid-cols-7 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-800">
                            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                                <div key={day} className="py-2 text-center text-sm font-medium text-gray-500 dark:text-gray-400">
                                    {day}
                                </div>
                            ))}
                        </div>
                        <div className="grid grid-cols-7 divide-x divide-y divide-gray-200 dark:divide-gray-800 bg-white dark:bg-gray-900">
                            {Array.from({ length: new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth(), 1).getDay() }).map((_, i) => (
                                <div key={`empty-${i}`} className="h-32 bg-gray-50/50 dark:bg-gray-800/20" />
                            ))}
                            {Array.from({ length: new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() + 1, 0).getDate() }).map((_, i) => {
                                const day = i + 1;
                                const dateStr = `${currentMonthDate.getFullYear()}-${String(currentMonthDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                                const dayEvents = events.filter(e => e.event_date === dateStr);
                                const isToday = dateStr === new Date().toISOString().split('T')[0];

                                return (
                                    <div
                                        key={day}
                                        className={`h-32 p-2 transition-colors ${profile?.role === 'hr' ? 'cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/10' : ''} ${isToday ? 'bg-blue-50/30 dark:bg-blue-900/10' : ''}`}
                                        onClick={() => {
                                            if (profile?.role === 'hr') {
                                                setEventDate(dateStr);
                                                setShowEventModal(true);
                                            }
                                        }}
                                    >
                                        <div className={`text-sm font-medium mb-1 ${isToday ? 'text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'}`}>
                                            {day}
                                        </div>
                                        <div className="space-y-1 overflow-y-auto max-h-[88px]">
                                            {dayEvents.map(event => (
                                                <div key={event.id} className="text-xs p-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded border border-blue-200 dark:border-blue-800/50 truncate" title={event.title}>
                                                    {event.title}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* Add Event Modal */}
            {showEventModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-md w-full mx-4 border border-gray-200 dark:border-gray-800 transition-colors">
                        <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-800">
                            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Add Holiday</h2>
                            <button onClick={() => setShowEventModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <form onSubmit={handleAddEvent} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Event Title</label>
                                <input
                                    type="text"
                                    required
                                    value={eventTitle}
                                    onChange={(e) => setEventTitle(e.target.value)}
                                    className="block w-full rounded-lg border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 transition-colors"
                                    placeholder="e.g. New Year's Day"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date</label>
                                <input
                                    type="date"
                                    required
                                    value={eventDate}
                                    onChange={(e) => setEventDate(e.target.value)}
                                    className="block w-full rounded-lg border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 transition-colors"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                                <textarea
                                    rows={3}
                                    value={eventDescription}
                                    onChange={(e) => setEventDescription(e.target.value)}
                                    className="block w-full rounded-lg border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 transition-colors"
                                    placeholder="Optional description..."
                                />
                            </div>
                            <div className="flex justify-end space-x-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowEventModal(false)}
                                    className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={addingEvent}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                                >
                                    {addingEvent ? 'Adding...' : 'Add Holiday'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
