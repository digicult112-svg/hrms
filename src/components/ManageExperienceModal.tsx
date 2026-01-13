import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { EmployeeExperience } from '../types';
import { X, Plus, Trash2, Briefcase, Calendar } from 'lucide-react';

interface ManageExperienceModalProps {
    isOpen: boolean;
    onClose: () => void;
    employeeId: string; // Can be current user OR another employee if HR is editing
    allowEdit: boolean; // If false, read-only
}

export default function ManageExperienceModal({ isOpen, onClose, employeeId, allowEdit }: ManageExperienceModalProps) {
    const [experiences, setExperiences] = useState<EmployeeExperience[]>([]);
    const [loading, setLoading] = useState(true);
    const [adding, setAdding] = useState(false);

    // Form State
    const [companyName, setCompanyName] = useState('');
    const [role, setRole] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [description, setDescription] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen && employeeId) {
            fetchExperience();
        }
    }, [isOpen, employeeId]);

    const fetchExperience = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('employee_experience')
                .select('*')
                .eq('user_id', employeeId)
                .order('start_date', { ascending: false });

            if (error) throw error;
            setExperiences(data || []);
        } catch (error) {
            console.error('Error fetching experience:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const { error } = await supabase.from('employee_experience').insert({
                user_id: employeeId,
                company_name: companyName,
                role,
                start_date: startDate || null,
                end_date: endDate || null,
                description
            });

            if (error) throw error;

            // Reset and Refresh
            setCompanyName('');
            setRole('');
            setStartDate('');
            setEndDate('');
            setDescription('');
            setAdding(false);
            fetchExperience();
        } catch (error: any) {
            console.error('Error adding experience:', error);
            alert('Error adding experience: ' + error.message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this experience entry?')) return;
        try {
            const { error } = await supabase
                .from('employee_experience')
                .delete()
                .eq('id', id);

            if (error) throw error;
            fetchExperience();
        } catch (error) {
            console.error('Error deleting experience:', error);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-2xl w-full max-h-[85vh] flex flex-col border border-gray-200 dark:border-gray-800 transition-colors">
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-800">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Briefcase className="w-5 h-5 text-indigo-500" />
                        Work Experience
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Add Form */}
                    {allowEdit && (
                        <div>
                            {!adding ? (
                                <button
                                    onClick={() => setAdding(true)}
                                    className="w-full py-3 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl text-gray-500 dark:text-gray-400 font-medium hover:border-indigo-500 hover:text-indigo-500 dark:hover:border-indigo-400 dark:hover:text-indigo-400 transition-colors flex items-center justify-center gap-2"
                                >
                                    <Plus className="w-5 h-5" />
                                    Add Previous Company
                                </button>
                            ) : (
                                <form onSubmit={handleAdd} className="bg-gray-50 dark:bg-gray-800/50 p-5 rounded-xl border border-gray-200 dark:border-gray-700 animate-in fade-in slide-in-from-top-2">
                                    <div className="flex justify-between items-start mb-4">
                                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">New Experience Entry</h3>
                                        <button
                                            type="button"
                                            onClick={() => setAdding(false)}
                                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Company Name *</label>
                                            <input
                                                required
                                                type="text"
                                                value={companyName}
                                                onChange={(e) => setCompanyName(e.target.value)}
                                                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                                                placeholder="e.g. Acme Corp"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Role/Title *</label>
                                            <input
                                                required
                                                type="text"
                                                value={role}
                                                onChange={(e) => setRole(e.target.value)}
                                                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                                                placeholder="e.g. Senior Developer"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Start Date</label>
                                            <input
                                                type="date"
                                                value={startDate}
                                                onChange={(e) => setStartDate(e.target.value)}
                                                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">End Date</label>
                                            <input
                                                type="date"
                                                value={endDate}
                                                onChange={(e) => setEndDate(e.target.value)}
                                                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                                            />
                                        </div>
                                    </div>
                                    <div className="mb-4">
                                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Description (Optional)</label>
                                        <textarea
                                            value={description}
                                            onChange={(e) => setDescription(e.target.value)}
                                            rows={2}
                                            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                                            placeholder="Brief description of responsibilities..."
                                        />
                                    </div>
                                    <div className="flex justify-end gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setAdding(false)}
                                            className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={submitting}
                                            className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
                                        >
                                            {submitting ? 'Saving...' : 'Save Experience'}
                                        </button>
                                    </div>
                                </form>
                            )}
                        </div>
                    )}

                    {/* List */}
                    {loading ? (
                        <div className="text-center py-8 text-gray-500">Loading...</div>
                    ) : experiences.length === 0 ? (
                        <div className="text-center py-8 text-gray-400 border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-xl">
                            No work experience added yet.
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {experiences.map((exp) => (
                                <div key={exp.id} className="relative group bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl p-5 hover:border-indigo-100 dark:hover:border-indigo-900/50 transition-all shadow-sm">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h4 className="font-bold text-gray-900 dark:text-white text-lg">{exp.company_name}</h4>
                                            <p className="text-indigo-600 dark:text-indigo-400 font-medium">{exp.role}</p>
                                        </div>
                                        {allowEdit && (
                                            <button
                                                onClick={() => handleDelete(exp.id)}
                                                className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 opacity-0 group-hover:opacity-100 transition-all"
                                                title="Delete"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-2 mt-2 text-sm text-gray-500 dark:text-gray-400">
                                        <Calendar className="w-4 h-4" />
                                        <span>
                                            {exp.start_date ? new Date(exp.start_date).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) : 'Unknown'}
                                            {' - '}
                                            {exp.end_date ? new Date(exp.end_date).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) : 'Present'}
                                        </span>
                                    </div>

                                    {exp.description && (
                                        <p className="mt-3 text-sm text-gray-600 dark:text-gray-300 leading-relaxed border-t border-gray-50 dark:border-gray-800/50 pt-3">
                                            {exp.description}
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
