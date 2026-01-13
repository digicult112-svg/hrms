import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Megaphone, Plus, Trash2, Edit2, X, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

interface Announcement {
    id: string;
    title: string;
    content: string;
    is_active: boolean;
    created_at: string;
    created_by: string;
    profiles?: {
        full_name: string;
    };
}

export default function Announcements() {
    const { profile } = useAuth();
    const isHR = profile?.role === 'hr';
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [loading, setLoading] = useState(true);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({ title: '', content: '' });
    const [submitting, setSubmitting] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    useEffect(() => {
        fetchAnnouncements();
    }, []);

    const fetchAnnouncements = async () => {
        setLoading(true);
        try {
            let query = supabase
                .from('announcements')
                .select(`
                    *,
                    profiles:created_by (full_name)
                `)
                .order('created_at', { ascending: false });

            // If not HR, only show active
            if (!isHR) {
                query = query.eq('is_active', true);
            }

            const { data, error } = await query;
            if (error) throw error;
            setAnnouncements(data as any);
        } catch (err) {
            console.error('Error fetching announcements:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this announcement?')) return;

        try {
            const { error } = await supabase.from('announcements').delete().eq('id', id);
            if (error) throw error;
            setAnnouncements(prev => prev.filter(a => a.id !== id));
        } catch (err) {
            console.error('Error deleting announcement:', err);
        }
    };

    const handleEdit = (announcement: Announcement) => {
        setFormData({ title: announcement.title, content: announcement.content });
        setEditingId(announcement.id);
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            if (editingId) {
                const { error } = await supabase
                    .from('announcements')
                    .update({
                        title: formData.title,
                        content: formData.content,
                    })
                    .eq('id', editingId);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('announcements')
                    .insert({
                        title: formData.title,
                        content: formData.content,
                        created_by: profile?.id,
                    });
                if (error) throw error;
            }
            fetchAnnouncements();
            handleCloseModal();
        } catch (err) {
            console.error('Error saving announcement:', err);
        } finally {
            setSubmitting(false);
        }
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setFormData({ title: '', content: '' });
        setEditingId(null);
    };

    if (!isHR && announcements.length === 0) return null;

    return (
        <div className="bg-white dark:bg-gray-900 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-gray-100 dark:border-gray-800 overflow-hidden relative group transition-colors">
            {/* Decorative Ambient Background */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-orange-50/50 dark:bg-orange-900/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

            <div className="p-8 relative z-10">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg text-orange-600 dark:text-orange-400">
                            <Megaphone className="w-5 h-5" />
                        </div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Announcements</h2>
                    </div>
                    {isHR && (
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                        >
                            <Plus className="w-4 h-4" />
                            Add New
                        </button>
                    )}
                </div>

                <div className="overflow-x-auto">
                    {loading ? (
                        <div className="text-center py-8 text-gray-500 dark:text-gray-400">Loading updates...</div>
                    ) : announcements.length === 0 ? (
                        <div className="text-center py-8 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                            No announcements posted yet.
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-gray-100 dark:border-gray-800 text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                    <th className="py-3 px-4 font-semibold">Title</th>
                                    <th className="py-3 px-4 font-semibold hidden sm:table-cell">Content</th>
                                    <th className="py-3 px-4 font-semibold">Date</th>
                                    {isHR && <th className="py-3 px-4 font-semibold text-right">Actions</th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                {announcements.map((announcement) => (
                                    <tr key={announcement.id} className="group hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                        <td className="py-3 px-4 align-top">
                                            <div className="font-semibold text-gray-900 dark:text-gray-100">{announcement.title}</div>
                                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 sm:hidden line-clamp-2">
                                                {announcement.content}
                                            </div>
                                        </td>
                                        <td className="py-3 px-4 align-top text-sm text-gray-600 dark:text-gray-300 hidden sm:table-cell max-w-xs">
                                            <div className="line-clamp-2" title={announcement.content}>
                                                {announcement.content}
                                            </div>
                                        </td>
                                        <td className="py-3 px-4 align-top text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                                            {format(new Date(announcement.created_at), 'MMM d, yyyy')}
                                        </td>
                                        {isHR && (
                                            <td className="py-3 px-4 align-top text-right">
                                                <div className="flex justify-end gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => handleEdit(announcement)}
                                                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(announcement.id)}
                                                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Modal */}
                {isModalOpen && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-lg transition-colors border border-gray-200 dark:border-gray-800">
                            <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-800">
                                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                                    {editingId ? 'Edit Announcement' : 'New Announcement'}
                                </h3>
                                <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <form onSubmit={handleSubmit} className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.title}
                                        onChange={e => setFormData({ ...formData, title: e.target.value })}
                                        className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-colors text-gray-900 dark:text-gray-100"
                                        placeholder="e.g., Office Closure Notice"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Content</label>
                                    <textarea
                                        required
                                        rows={4}
                                        value={formData.content}
                                        onChange={e => setFormData({ ...formData, content: e.target.value })}
                                        className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-colors resize-none text-gray-900 dark:text-gray-100"
                                        placeholder="Enter your announcement details..."
                                    />
                                </div>
                                <div className="flex justify-end gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={handleCloseModal}
                                        className="px-4 py-2 text-gray-600 dark:text-gray-400 font-medium hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center min-w-[100px]"
                                    >
                                        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : (editingId ? 'Update' : 'Post')}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
