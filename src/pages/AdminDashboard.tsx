import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { MessageSquare, Clock, ShieldAlert } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import type { AnonymousMessage } from '../types';

export default function AdminDashboard() {
    const { profile } = useAuth();
    const [messages, setMessages] = useState<AnonymousMessage[]>([]);
    const [loading, setLoading] = useState(true);
    const { error: toastError } = useToast();

    useEffect(() => {
        if (profile?.role === 'admin') {
            fetchMessages();
        }
    }, [profile]);

    const fetchMessages = async () => {
        try {
            const { data, error } = await supabase
                .from('anonymous_messages')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setMessages(data || []);
        } catch (error: any) {
            console.error('Error fetching messages:', error);
            toastError('Failed to load messages');
        } finally {
            setLoading(false);
        }
    };

    if (profile?.role !== 'admin') {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] text-center p-8">
                <ShieldAlert className="w-16 h-16 text-red-500 mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Access Denied</h2>
                <p className="text-gray-500">You do not have permission to view this page.</p>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto px-4 py-8 animate-in fade-in duration-500">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                    <ShieldAlert className="w-8 h-8 text-purple-600" />
                    Admin Dashboard
                </h1>
                <p className="text-gray-500 dark:text-gray-400 mt-2">View anonymous feedback and messages from employees.</p>
            </div>

            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
            ) : messages.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 text-center border border-gray-100 dark:border-gray-700">
                    <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">No messages yet</h3>
                    <p className="text-gray-500 mt-1">Anonymous messages will appear here.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {messages.map((msg) => (
                        <div key={msg.id} className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow">
                            <div className="flex items-start gap-4">
                                <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-xl shrink-0">
                                    <MessageSquare className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-gray-900 dark:text-white whitespace-pre-wrap leading-relaxed">{msg.message}</p>
                                    <div className="flex items-center gap-2 mt-4 text-xs text-gray-500">
                                        <Clock className="w-3.5 h-3.5" />
                                        <span>{new Date(msg.created_at).toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
