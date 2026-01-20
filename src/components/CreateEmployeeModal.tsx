import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { X, Loader2, GraduationCap, Briefcase, MapPin, Building2, User } from 'lucide-react';

interface CreateEmployeeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function CreateEmployeeModal({ isOpen, onClose, onSuccess }: CreateEmployeeModalProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [formData, setFormData] = useState({
        fullName: '',
        dateOfBirth: '',
        workEmail: '',
        personalEmail: '',
        password: '',
        phone: '',
        designation: '',
        role: 'employee' as 'hr' | 'employee',
        dailyWorkHours: 8,
        salary: '',
        education: '',
        address: '',
        previousExperience: '',
        previousRole: '',
        previousCompany: '',
        isFresher: false,
    });

    useEffect(() => {
        if (isOpen) {
            fetchDefaultWorkHours();
        }
    }, [isOpen]);

    const fetchDefaultWorkHours = async () => {
        const { data } = await supabase
            .from('system_settings')
            .select('value')
            .eq('key', 'default_work_hours')
            .single();

        if (data) {
            setFormData(prev => ({ ...prev, dailyWorkHours: Number(data.value) }));
        }
    };


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            // Create a temporary client for the signup process
            // This allows us to create a new user without logging out the current admin
            const tempClient = createClient(
                import.meta.env.VITE_SUPABASE_URL,
                import.meta.env.VITE_SUPABASE_ANON_KEY,
                {
                    auth: {
                        persistSession: false,
                        autoRefreshToken: false,
                        detectSessionInUrl: false
                    }
                }
            );

            // Create the auth user with metadata
            // The database trigger will automatically create the profile
            const { data: authData, error: signUpError } = await tempClient.auth.signUp({
                email: formData.workEmail || formData.personalEmail,
                password: formData.password,
                options: {
                    data: {
                        full_name: formData.fullName,
                        role: formData.role,
                    }
                }
            });

            if (signUpError) throw signUpError;
            if (!authData.user) throw new Error('No user returned from signup');

            // If the user was created successfully but email confirmation is enabled,
            // we should let the HR know.
            // Note: Since we are using the standard signup, we can't auto-confirm 
            // without the service role key. The user will receive an email.

            // We can try to update the profile immediately if RLS allows it (it might not if the user isn't confirmed/logged in)
            // But the trigger should have handled the creation.
            // Any additional updates (phone, designation) might need to wait or be handled by the user later
            // OR we can try to update it using the admin's session if we have RLS policies that allow HR to update profiles.

            // Let's try to update the additional details using the MAIN client (authenticated as HR)
            const { error: updateError } = await supabase
                .from('profiles')
                .update({
                    phone: formData.phone || null,
                    designation: formData.designation || null,
                    daily_work_hours: formData.dailyWorkHours,
                    education: formData.education || null,
                    address: formData.address || null,
                    previous_experience: formData.isFresher ? null : (formData.previousExperience || null),
                    previous_role: formData.isFresher ? null : (formData.previousRole || null),
                    previous_company: formData.isFresher ? null : (formData.previousCompany || null),
                    work_email: formData.workEmail || null,
                    personal_email: formData.personalEmail || null,
                    date_of_birth: formData.dateOfBirth || null,
                })
                .eq('id', authData.user.id);

            if (updateError) {
                console.warn('Could not update additional profile details immediately:', updateError);
            }

            // [NEW] Update Salary in separate table
            const salaryAmount = parseFloat(formData.salary) || 0;
            if (salaryAmount > 0) {
                await supabase
                    .from('salaries')
                    .upsert({
                        user_id: authData.user.id,
                        amount: salaryAmount
                    });
            }

            // Reset form and close modal
            setFormData({
                fullName: '',
                dateOfBirth: '',
                workEmail: '',
                personalEmail: '',
                password: '',
                phone: '',
                designation: '',
                role: 'employee',
                dailyWorkHours: 8,
                salary: '',
                education: '',
                address: '',
                previousExperience: '',
                previousRole: '',
                previousCompany: '',
                isFresher: false,
            });

            onSuccess();
            onClose();
        } catch (err: any) {
            console.error('Error creating employee:', err);
            setError(err.message || 'Failed to create employee');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto transition-colors">
                <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between z-10 transition-colors">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Create New Employee</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                    {error && (
                        <div className="md:col-span-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                            {error}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Full Name *
                        </label>
                        <input
                            type="text"
                            required
                            value={formData.fullName}
                            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-colors"
                            placeholder="John Doe"
                        />
                    </div>

                    <div className="contents">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Work Email
                            </label>
                            <input
                                type="email"
                                value={formData.workEmail}
                                onChange={(e) => setFormData({ ...formData, workEmail: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-colors"
                                placeholder="john@company.com"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Personal Email
                            </label>
                            <input
                                type="email"
                                value={formData.personalEmail}
                                onChange={(e) => setFormData({ ...formData, personalEmail: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-colors"
                                placeholder="john.doe@gmail.com"
                            />
                        </div>
                    </div>
                    {(!formData.workEmail && !formData.personalEmail) && (
                        <p className="md:col-span-2 text-xs text-amber-600 -mt-3">At least one email is required.</p>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Temporary Password *
                        </label>
                        <input
                            type="password"
                            required
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-colors"
                            placeholder="Min. 6 characters"
                            minLength={6}
                        />
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Employee can change this after first login</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Phone
                        </label>
                        <input
                            type="tel"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-colors"
                            placeholder="+1234567890"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Position / Designation
                        </label>
                        <input
                            type="text"
                            value={formData.designation}
                            onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-colors"
                            placeholder="e.g. Senior Software Engineer"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Base Salary (Monthly)
                        </label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">₹</span>
                            <input
                                type="number"
                                min="0"
                                value={formData.salary}
                                onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                                className="w-full pl-8 pr-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-colors"
                                placeholder="50000"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Date of Birth
                        </label>
                        <input
                            type="date"
                            value={formData.dateOfBirth}
                            onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white transition-colors"
                        />
                    </div>

                    <div className="md:col-span-2 border-t border-gray-200 dark:border-gray-700 pt-4">
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Additional Details</h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    <div className="flex items-center gap-2">
                                        <GraduationCap className="w-4 h-4" />
                                        Education
                                    </div>
                                </label>
                                <input
                                    type="text"
                                    value={formData.education}
                                    onChange={(e) => setFormData({ ...formData, education: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white transition-colors"
                                    placeholder="e.g. B.Tech Computer Science"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    <div className="flex items-center gap-2">
                                        <MapPin className="w-4 h-4" />
                                        Address (Max 50 chars)
                                    </div>
                                </label>
                                <input
                                    type="text"
                                    maxLength={50}
                                    value={formData.address}
                                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white transition-colors"
                                    placeholder="e.g. 123 Main St, New York"
                                />
                                <div className="text-xs text-right text-gray-500 mt-1">
                                    {formData.address.length}/50
                                </div>
                            </div>

                            <div className="flex items-center gap-2 my-2">
                                <input
                                    type="checkbox"
                                    id="isFresher"
                                    checked={formData.isFresher}
                                    onChange={(e) => setFormData({ ...formData, isFresher: e.target.checked })}
                                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 border-gray-300 dark:border-gray-600 dark:bg-gray-700"
                                />
                                <label htmlFor="isFresher" className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                                    This employee is a Fresher (No prior experience)
                                </label>
                            </div>

                            {!formData.isFresher && (
                                <div className="md:col-span-2 space-y-4 pl-4 border-l-2 border-gray-200 dark:border-gray-700 transition-all grid grid-cols-1 md:grid-cols-2 gap-6 space-y-0">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            <div className="flex items-center gap-2">
                                                <Briefcase className="w-4 h-4" />
                                                Previous Experience
                                            </div>
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.previousExperience}
                                            onChange={(e) => setFormData({ ...formData, previousExperience: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white transition-colors"
                                            placeholder="e.g. 2 years"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            <div className="flex items-center gap-2">
                                                <User className="w-4 h-4" />
                                                Former Role
                                            </div>
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.previousRole}
                                            onChange={(e) => setFormData({ ...formData, previousRole: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white transition-colors"
                                            placeholder="e.g. Junior Developer"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            <div className="flex items-center gap-2">
                                                <Building2 className="w-4 h-4" />
                                                Former Company
                                            </div>
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.previousCompany}
                                            onChange={(e) => setFormData({ ...formData, previousCompany: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white transition-colors"
                                            placeholder="e.g. Google"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>



                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Role *
                        </label>
                        <select
                            value={formData.role}
                            onChange={(e) => setFormData({ ...formData, role: e.target.value as 'hr' | 'employee' })}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white transition-colors"
                        >
                            <option value="employee">Employee</option>
                            <option value="hr">HR</option>
                        </select>
                    </div>

                    <div className="md:col-span-2 flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                            disabled={loading}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Creating...
                                </>
                            ) : (
                                'Create Employee'
                            )}
                        </button>
                    </div>
                </form>
            </div >
        </div >
    );
}
