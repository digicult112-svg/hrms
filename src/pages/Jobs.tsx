import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { JobPosition } from '../types';
import { useAuth } from '../context/AuthContext';
import { Plus, X } from 'lucide-react';
import { logAction } from '../lib/logger';

export default function JobsPage() {
    const { user, profile } = useAuth();
    const [jobs, setJobs] = useState<JobPosition[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({ title: '', department: '', description: '' });

    const [selectedJob, setSelectedJob] = useState<JobPosition | null>(null);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        fetchJobs();
    }, []);

    const fetchJobs = async () => {
        try {
            const { data, error } = await supabase
                .from('job_positions')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setJobs(data || []);
        } catch (error) {
            console.error('Error fetching jobs:', error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const { error } = await supabase.from('job_positions').insert({
                ...formData,
                status: 'open'
            });

            if (error) throw error;

            // Log Creation
            await logAction(user?.id || '', 'JOB_CREATED', 'job_positions', {
                title: formData.title,
                department: formData.department,
                timestamp: new Date().toISOString()
            });

            setShowForm(false);
            setFormData({ title: '', department: '', description: '' });
            fetchJobs();
        } catch (error) {
            console.error('Error creating job:', error);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this job position?')) return;
        setDeleting(true);
        try {
            const { error } = await supabase
                .from('job_positions')
                .delete()
                .eq('id', id);

            if (error) throw error;

            // Log Deletion
            await logAction(user?.id || '', 'JOB_DELETED', 'job_positions', {
                job_id: id,
                timestamp: new Date().toISOString()
            });

            setSelectedJob(null);
            fetchJobs();
        } catch (error) {
            console.error('Error deleting job:', error);
            alert('Error deleting job');
        } finally {
            setDeleting(false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto space-y-8">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">Job Openings</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Manage and view current job listings</p>
                </div>
                {profile?.role === 'hr' && (
                    <button
                        onClick={() => setShowForm(true)}
                        className="flex items-center px-6 py-2.5 bg-gray-900 text-white rounded-xl hover:bg-black font-semibold shadow-lg shadow-gray-900/10 active:scale-95 transition-all"
                    >
                        <Plus className="w-5 h-5 mr-2" />
                        Post New Job
                    </button>
                )}
            </div>

            {showForm && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-gray-900 rounded-[2rem] shadow-2xl max-w-2xl w-full p-8 relative animate-in zoom-in-95 duration-200 border border-gray-100 dark:border-gray-800 transition-colors">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <span className="w-2 h-8 bg-purple-500 rounded-full"></span>
                                Create Job Position
                            </h2>
                            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 ml-1">Job Title</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.title}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                        className="block w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 text-gray-900 dark:text-white transition-all outline-none"
                                        placeholder="e.g. Senior Developer"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 ml-1">Department</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.department}
                                        onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                                        className="block w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 text-gray-900 dark:text-white transition-all outline-none"
                                        placeholder="e.g. Engineering"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 ml-1">Description</label>
                                <textarea
                                    required
                                    rows={4}
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="block w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 text-gray-900 dark:text-white transition-all outline-none resize-none"
                                    placeholder="Detailed job description..."
                                />
                            </div>
                            <div className="flex justify-end pt-4 gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowForm(false)}
                                    className="px-6 py-3 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 font-bold transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-8 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 font-semibold shadow-lg shadow-purple-600/20 active:scale-95 transition-all"
                                >
                                    Create Position
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {jobs.map((job) => (
                    <div key={job.id} className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm hover:shadow-xl hover:-translate-y-1 p-6 border border-gray-100 dark:border-gray-800 hover:border-purple-100 dark:hover:border-purple-900/50 transition-all duration-300 group cursor-pointer" onClick={() => setSelectedJob(job)}>
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white leading-tight group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">{job.title}</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mt-1">{job.department}</p>
                            </div>
                            <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border uppercase tracking-wider ${job.status === 'open' ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border-green-100 dark:border-green-900/30' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700'
                                }`}>
                                {job.status}
                            </span>
                        </div>
                        <p className="text-gray-600 dark:text-gray-400 text-sm mb-6 line-clamp-3 leading-relaxed">{job.description}</p>
                        <div className="flex justify-between items-center pt-4 border-t border-gray-50 dark:border-gray-800">
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Posted {new Date(job.created_at).toLocaleDateString()}</span>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedJob(job);
                                }}
                                className="text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 text-sm font-bold flex items-center gap-1 group/btn"
                            >
                                View Details
                                <span className="group-hover/btn:translate-x-0.5 transition-transform">→</span>
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* details modal */}
            {selectedJob && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200" onClick={() => setSelectedJob(null)}>
                    <div
                        className="bg-white dark:bg-gray-900 rounded-[2rem] shadow-2xl max-w-2xl w-full p-8 relative animate-in zoom-in-95 duration-200 border border-gray-100 dark:border-gray-800 transition-colors"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{selectedJob.title}</h2>
                                <div className="flex items-center gap-3">
                                    <span className="bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 px-3 py-1 rounded-lg text-sm font-bold border border-purple-100 dark:border-purple-800/30">{selectedJob.department}</span>
                                    <span className="text-gray-400 text-sm font-medium">•</span>
                                    <span className="text-gray-500 dark:text-gray-400 text-sm font-medium">Posted on {new Date(selectedJob.created_at).toLocaleDateString()}</span>
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedJob(null)}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors text-gray-400 hover:text-gray-600 dark:hover:text-white"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            </button>
                        </div>

                        <div className="prose prose-purple max-w-none text-gray-600 dark:text-gray-300 bg-gray-50/50 dark:bg-gray-800/50 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 mb-8 max-h-[60vh] overflow-y-auto">
                            <p className="whitespace-pre-wrap leading-relaxed">{selectedJob.description}</p>
                        </div>

                        <div className="flex justify-end gap-3 pt-2 border-t border-gray-50 dark:border-gray-800">
                            {profile?.role === 'hr' && (
                                <button
                                    onClick={() => handleDelete(selectedJob.id)}
                                    disabled={deleting}
                                    className="px-6 py-2.5 border border-red-200 dark:border-red-900/30 text-red-600 dark:text-red-400 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 font-bold transition-all disabled:opacity-50"
                                >
                                    {deleting ? 'Deleting...' : 'Delete Position'}
                                </button>
                            )}
                            <button
                                onClick={() => setSelectedJob(null)}
                                className="px-6 py-2.5 bg-gray-900 text-white rounded-xl hover:bg-black font-bold shadow-lg shadow-gray-900/10 active:scale-95 transition-all"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
