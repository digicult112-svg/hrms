import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { sendEmail } from '../lib/email';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Mail, Send, Users, User, Loader2, CheckCircle2, Filter } from 'lucide-react';

export default function EmailCommunication() {
    const { profile } = useAuth();
    const { success, error: toastError } = useToast();

    const [loading, setLoading] = useState(false);
    const [sending, setSending] = useState(false);
    const [employees, setEmployees] = useState<any[]>([]);

    // Form State
    const [targetType, setTargetType] = useState<'all' | 'role' | 'individual'>('all');
    const [selectedRole, setSelectedRole] = useState('employee');
    const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');

    useEffect(() => {
        fetchEmployees();
    }, []);

    const fetchEmployees = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('id, full_name, email, role, designation')
                .order('full_name');

            if (error) throw error;
            setEmployees(data || []);
        } catch (error) {
            console.error('Error fetching employees:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!subject.trim() || !message.trim()) {
            toastError('Missing Information', 'Please provide both a subject and a message.');
            return;
        }

        setSending(true);

        try {
            let recipients: any[] = [];

            // 1. Filter Recipients
            if (targetType === 'all') {
                recipients = employees.filter(emp => emp.email);
            } else if (targetType === 'role') {
                recipients = employees.filter(emp => emp.role === selectedRole && emp.email);
            } else if (targetType === 'individual') {
                recipients = employees.filter(emp => emp.id === selectedEmployeeId && emp.email);
            }

            if (recipients.length === 0) {
                toastError('No Recipients', 'No valid email addresses found for the selected group.');
                setSending(false);
                return;
            }

            // 2. Prepare Email Content
            // We wrap the message in a nice HTML template
            const htmlTemplate = (name: string, body: string) => `
                <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #333; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
                    <div style="background: #eff6ff; padding: 20px; border-bottom: 1px solid #e2e8f0;">
                        <h2 style="color: #1e3a8a; margin: 0; font-size: 20px;">${subject}</h2>
                    </div>
                    <div style="padding: 24px;">
                        <p style="margin-top: 0; color: #4b5563;">Hello ${name},</p>
                        <div style="line-height: 1.6; color: #1f2937; white-space: pre-wrap;">
                            ${body.replace(/\n/g, '<br/>')}
                        </div>
                    </div>
                    <div style="background: #f8fafc; padding: 16px 24px; border-top: 1px solid #e2e8f0; text-align: center;">
                        <p style="margin: 0; font-size: 12px; color: #94a3b8;">
                            Sent by ${profile?.full_name || 'HR Team'} via HRMS
                        </p>
                    </div>
                </div>
            `;

            // 3. Send Emails (Batch)
            // For < 20 employees, Promise.all is perfectly fine and fast.
            await Promise.all(recipients.map(recipient =>
                sendEmail({
                    to: recipient.email,
                    subject: subject,
                    html: htmlTemplate(recipient.full_name, message)
                })
            ));

            success('Emails Sent', `Successfully sent to ${recipients.length} recipient(s).`);

            // Reset Form (optional)
            setSubject('');
            setMessage('');

        } catch (error: any) {
            console.error('Error sending emails:', error);
            toastError('Send Failed', error.message || 'Failed to send emails.');
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
                            <Mail className="w-6 h-6" />
                        </div>
                        Communication Center
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1 ml-14">
                        Send announcements and updates to your team.
                    </p>
                </div>
            </div>

            {/* Main Composition Card */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
                <form onSubmit={handleSend} className="divide-y divide-gray-100 dark:divide-gray-800">

                    {/* 1. Recipient Selection */}
                    <div className="p-6 space-y-4 bg-gray-50/50 dark:bg-gray-900/50">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            To
                        </label>
                        <div className="flex flex-wrap gap-2">
                            <button
                                type="button"
                                onClick={() => setTargetType('all')}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${targetType === 'all'
                                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                                    }`}
                            >
                                <Users className="w-4 h-4" />
                                All Employees
                            </button>
                            <button
                                type="button"
                                onClick={() => setTargetType('role')}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${targetType === 'role'
                                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                                    }`}
                            >
                                <Filter className="w-4 h-4" />
                                By Role
                            </button>
                            <button
                                type="button"
                                onClick={() => setTargetType('individual')}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${targetType === 'individual'
                                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                                    }`}
                            >
                                <User className="w-4 h-4" />
                                Individual
                            </button>
                        </div>

                        {/* Conditional Inputs based on Target Type */}
                        <div className="animate-in slide-in-from-top-2 duration-200">
                            {targetType === 'role' && (
                                <select
                                    value={selectedRole}
                                    onChange={(e) => setSelectedRole(e.target.value)}
                                    className="w-full max-w-md px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 dark:text-white"
                                >
                                    <option value="employee">Employees</option>
                                    <option value="hr">HR Administrators</option>
                                </select>
                            )}

                            {targetType === 'individual' && (
                                <select
                                    value={selectedEmployeeId}
                                    onChange={(e) => setSelectedEmployeeId(e.target.value)}
                                    className="w-full max-w-md px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 dark:text-white"
                                >
                                    <option value="">Select an employee...</option>
                                    {employees.map(emp => (
                                        <option key={emp.id} value={emp.id}>
                                            {emp.full_name} ({emp.email || 'No Email'})
                                        </option>
                                    ))}
                                </select>
                            )}

                            {/* Recipient Count Preview */}
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3 text-green-500" />
                                Will be sent to
                                <span className="font-semibold text-gray-900 dark:text-white mx-1">
                                    {targetType === 'all'
                                        ? employees.filter(e => e.email).length
                                        : targetType === 'role'
                                            ? employees.filter(e => e.role === selectedRole && e.email).length
                                            : selectedEmployeeId ? 1 : 0
                                    }
                                </span>
                                recipients
                            </p>
                        </div>
                    </div>

                    {/* 2. Message Content */}
                    <div className="p-6 space-y-6">
                        <div>
                            <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                                Subject Line
                            </label>
                            <input
                                type="text"
                                required
                                value={subject}
                                onChange={(e) => setSubject(e.target.value)}
                                placeholder="Important Announcement: Upcoming Holidays"
                                className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:text-white placeholder-gray-400 transition-all font-medium"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                                Message Body
                            </label>
                            <div className="relative">
                                <textarea
                                    required
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    rows={8}
                                    placeholder="Write your message here... (HTML tags not supported in this version)"
                                    className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:text-white placeholder-gray-400 transition-all resize-none leading-relaxed"
                                ></textarea>
                                <div className="absolute bottom-3 right-3 text-xs text-gray-400">
                                    {message.length} chars
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 3. Footer / Actions */}
                    <div className="p-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                            * Emails are sent via secure SMTP. Replies will go to the configured support email.
                        </div>
                        <button
                            type="submit"
                            disabled={sending || loading}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-2.5 rounded-xl text-sm font-semibold shadow-lg shadow-blue-500/30 transition-all transform active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {sending ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Sending...
                                </>
                            ) : (
                                <>
                                    <Send className="w-4 h-4" />
                                    Send Message
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
