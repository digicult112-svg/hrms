import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { notifyUser } from '../lib/notifications';
import { X, Send, MessageSquare, Loader2, CheckCircle, RotateCw } from 'lucide-react';
import SafeAvatar from './SafeAvatar';
import { logAction } from '../lib/logger';
import { useAuth } from '../context/AuthContext';
import type { Ticket, TicketComment, TicketStatus } from '../types';
import { format } from 'date-fns';

interface TicketDetailsModalProps {
    ticket: Ticket | null;
    isOpen: boolean;
    onClose: () => void;
    onUpdate: () => void;
}

export default function TicketDetailsModal({ ticket, isOpen, onClose, onUpdate }: TicketDetailsModalProps) {
    const { user, profile } = useAuth();
    const [comments, setComments] = useState<TicketComment[]>([]);
    const [newComment, setNewComment] = useState('');
    const [loadingComments, setLoadingComments] = useState(false);
    const [sendingComment, setSendingComment] = useState(false);

    // Status update state
    const [status, setStatus] = useState<TicketStatus>('Open');
    const [updatingStatus, setUpdatingStatus] = useState(false);

    useEffect(() => {
        if (ticket && isOpen) {
            setStatus(ticket.status);
            fetchComments();
            // Subscribe to real-time comments? Maybe later.
        }
    }, [ticket, isOpen]);

    const fetchComments = async () => {
        if (!ticket) return;
        setLoadingComments(true);
        const { data, error } = await supabase
            .from('ticket_comments')
            .select(`
                *,
                profiles:user_id (
                    full_name,
                    avatar_url,
                    role
                )
            `)
            .eq('ticket_id', ticket.id)
            .order('created_at', { ascending: true });

        if (!error && data) {
            setComments(data as any);
        }
        setLoadingComments(false);
    };

    const handleSendComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!ticket || !user || !newComment.trim()) return;

        setSendingComment(true);
        try {
            const { error } = await supabase
                .from('ticket_comments')
                .insert({
                    ticket_id: ticket.id,
                    user_id: user.id,
                    message: newComment.trim(),
                });

            if (error) throw error;

            // Log comment addition
            await logAction(user.id, 'TICKET_COMMENT_ADDED', 'ticket_comments', {
                ticket_id: ticket.id,
                timestamp: new Date().toISOString()
            });

            setNewComment('');
            fetchComments();
        } catch (err) {
            console.error('Error sending comment:', err);
        } finally {
            setSendingComment(false);
        }
    };

    const handleStatusChange = async (newStatus: TicketStatus) => {
        if (!ticket) return;
        setUpdatingStatus(true);
        setStatus(newStatus); // Optimistic update

        try {
            const { error } = await supabase
                .from('tickets')
                .update({ status: newStatus })
                .eq('id', ticket.id);

            if (error) throw error;

            // Log status change
            await logAction(user?.id || '', 'TICKET_STATUS_UPDATED', 'tickets', {
                ticket_id: ticket.id,
                old_status: ticket.status,
                new_status: newStatus,
                timestamp: new Date().toISOString()
            });

            // Notify Employee (Status Update)
            if (ticket.employee_id !== user?.id) { // Don't notify if user is updating their own ticket
                await notifyUser(
                    ticket.employee_id,
                    `Ticket Status: ${newStatus}`,
                    `Your ticket "${ticket.subject}" has been marked as ${newStatus}.`,
                    'info'
                );
            }

            onUpdate();
        } catch (err) {
            console.error('Error updating status:', err);
            setStatus(ticket.status); // Revert
        } finally {
            setUpdatingStatus(false);
        }
    };

    if (!isOpen || !ticket) return null;

    const isHR = profile?.role === 'hr';

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col transition-colors">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-t-xl z-10 relative gap-4">
                    <div className="flex-1 min-w-0 mr-8">
                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide border ${ticket.status === 'Resolved' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800' :
                                ticket.status === 'Open' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800' :
                                    ticket.status === 'In Progress' ? 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800' :
                                        'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600'
                                }`}>
                                {ticket.status}
                            </span>
                            <span className="text-gray-400 dark:text-gray-500 text-xs font-mono">#{ticket.id.slice(0, 8)}</span>
                        </div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white truncate" title={ticket.subject}>{ticket.subject}</h2>
                    </div>

                    {/* Compact Admin Controls (Visible to HR only) */}
                    {isHR && (
                        <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                            <div className="relative group">
                                <select
                                    value={status}
                                    onChange={(e) => handleStatusChange(e.target.value as TicketStatus)}
                                    disabled={updatingStatus}
                                    className="appearance-none pl-3 pr-8 py-1.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-xs font-semibold text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-purple-500/20 cursor-pointer hover:border-purple-400 dark:hover:border-purple-500 transition-colors disabled:opacity-50"
                                >
                                    <option value="Open">Status: Open</option>
                                    <option value="In Progress">Status: In Progress</option>
                                    <option value="Resolved">Status: Resolved</option>
                                    <option value="Closed">Status: Closed</option>
                                </select>
                                <RotateCw className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none group-hover:text-purple-500 transition-colors" />
                            </div>

                            {status !== 'Resolved' && status !== 'Closed' ? (
                                <button
                                    onClick={() => handleStatusChange('Resolved')}
                                    disabled={updatingStatus}
                                    title="Mark as Resolved"
                                    className="p-1.5 bg-green-50 text-green-600 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/40 rounded-lg border border-green-200 dark:border-green-800 transition-colors disabled:opacity-50"
                                >
                                    {updatingStatus ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                                </button>
                            ) : (
                                <button
                                    onClick={() => handleStatusChange('Open')}
                                    disabled={updatingStatus}
                                    title="Re-open Ticket"
                                    className="p-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/40 rounded-lg border border-blue-200 dark:border-blue-800 transition-colors disabled:opacity-50"
                                >
                                    <RotateCw className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    )}

                    <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Ticket Info */}
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 space-y-3">
                        <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                            <span>Reported by <strong>{ticket.profiles?.full_name || 'Unknown'}</strong></span>
                            <span>{format(new Date(ticket.created_at), 'MMM d, yyyy HH:mm')}</span>
                        </div>
                        <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{ticket.description}</p>
                    </div>

                    {/* HR Administrative Actions */}
                    {/* HR Administrative Actions - Compact Toolbar */}
                    {/* Remove old separate toolbar location, it's now in header */}

                    {/* Comments */}
                    <div className="space-y-4">
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                            <MessageSquare className="w-4 h-4" />
                            Activity & Comments
                        </h3>

                        <div className="space-y-4">
                            {loadingComments ? (
                                <div className="text-center py-4 text-gray-500 dark:text-gray-400">Loading comments...</div>
                            ) : comments.length === 0 ? (
                                <div className="text-center py-8 text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-700/30 rounded-lg border border-dashed border-gray-200 dark:border-gray-700">
                                    No comments yet.
                                </div>
                            ) : (
                                comments.map((comment) => (
                                    <div key={comment.id} className={`flex gap-3 ${comment.profiles?.role === 'hr' ? 'flex-row-reverse' : ''}`}>
                                        <SafeAvatar
                                            src={comment.profiles?.avatar_url}
                                            alt={comment.profiles?.full_name || 'User'}
                                            className="w-8 h-8 flex-shrink-0"
                                            size={32}
                                        />
                                        <div className={`flex-1 rounded-2xl p-4 shadow-sm relative ${comment.profiles?.role === 'hr'
                                            ? 'bg-purple-50 dark:bg-purple-900/10 border border-purple-100 dark:border-purple-900/20 rounded-tr-none'
                                            : 'bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-tl-none'
                                            }`}>
                                            <div className={`flex items-center gap-2 mb-1 ${comment.profiles?.role === 'hr' ? 'justify-end' : 'justify-between'}`}>
                                                <div className="flex items-center gap-2">
                                                    {comment.profiles?.role === 'hr' && (
                                                        <span className="bg-purple-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">
                                                            HR Team
                                                        </span>
                                                    )}
                                                    <span className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                                                        {comment.profiles?.full_name || 'Unknown'}
                                                    </span>
                                                </div>
                                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                                    {format(new Date(comment.created_at), 'MMM d, HH:mm')}
                                                </span>
                                            </div>
                                            <p className={`text-sm whitespace-pre-wrap ${comment.profiles?.role === 'hr' ? 'text-gray-800 dark:text-gray-200 text-right' : 'text-gray-700 dark:text-gray-300'}`}>
                                                {comment.message}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer / Comment Input */}
                <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 rounded-b-xl">
                    <form onSubmit={handleSendComment} className="flex gap-2">
                        <input
                            type="text"
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            placeholder="Type your reply..."
                            className="flex-1 px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 transition-colors"
                        />
                        <button
                            type="submit"
                            disabled={sendingComment || !newComment.trim()}
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center"
                        >
                            {sendingComment ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
