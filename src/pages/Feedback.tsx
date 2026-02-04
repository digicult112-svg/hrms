import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Send, MessageSquare, User } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

export default function Feedback() {
    const { user } = useAuth();
    const [message, setMessage] = useState('');
    const [sending, setSending] = useState(false);
    const { success, error: toastError } = useToast();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!message.trim() || !user) return;

        setSending(true);
        try {
            const { error } = await supabase
                .from('anonymous_messages')
                .insert([{
                    message: message.trim(),
                    user_id: user.id
                }]);

            if (error) throw error;

            success('Feedback sent successfully!');
            setMessage('');
        } catch (error: any) {
            console.error('Error sending feedback:', error);
            toastError('Failed to send feedback');
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto px-4 py-8 animate-in fade-in duration-500">
            <div className="text-center mb-10">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-2xl mb-4 text-purple-600 dark:text-purple-400">
                    <MessageSquare className="w-8 h-8" />
                </div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">Employee Feedback</h1>
                <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                    Send feedback, suggestions, or concerns to the admin.
                    Your feedback will be <span className="font-bold text-purple-600 dark:text-purple-400">attributed to you</span>.
                </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-[2rem] p-8 shadow-xl shadow-gray-200/50 dark:shadow-gray-900/20 border border-gray-100 dark:border-gray-700 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none"></div>

                <form onSubmit={handleSubmit} className="relative z-10 space-y-6">
                    <div className="space-y-2">
                        <label htmlFor="message" className="text-sm font-bold text-gray-700 dark:text-gray-300 ml-1">
                            Your Message
                        </label>
                        <textarea
                            id="message"
                            value={message}
                            maxLength={1000}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="Type your message here..."
                            rows={6}
                            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all resize-none"
                            required
                        />
                        <div className="text-right text-xs text-gray-400 mt-1">
                            {message.length}/1000
                        </div>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                        <div className="flex items-center gap-2 text-xs text-purple-600 dark:text-purple-400 font-medium bg-purple-500/10 px-3 py-1.5 rounded-lg">
                            <User className="w-3.5 h-3.5" />
                            Submitted as: {user?.email || 'You'}
                        </div>

                        <button
                            type="submit"
                            disabled={sending || !message.trim()}
                            className="inline-flex items-center gap-2 px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-purple-500/25 active:scale-95"
                        >
                            {sending ? (
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            ) : (
                                <>
                                    Send Feedback
                                    <Send className="w-4 h-4" />
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
