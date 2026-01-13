import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { X, Loader2, GraduationCap, Briefcase, MapPin, Building2, User } from 'lucide-react';
import type { Profile, OfficeLocation } from '../types';

interface EditEmployeeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    employee: Profile;
}

export default function EditEmployeeModal({ isOpen, onClose, onSuccess, employee }: EditEmployeeModalProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [locations, setLocations] = useState<OfficeLocation[]>([]);
    const [formData, setFormData] = useState({
        fullName: employee.full_name || '',
        dateOfBirth: employee.date_of_birth || '',
        workEmail: employee.work_email || employee.email || '',
        personalEmail: employee.personal_email || '',
        phone: employee.phone || '',
        designation: employee.designation || '',
        role: employee.role as 'hr' | 'employee',
        baseLocationId: employee.base_location_id || '',
        dailyWorkHours: employee.daily_work_hours || 8,
        education: employee.education || '',
        address: employee.address || '',
        previousExperience: employee.previous_experience || '',
        previousRole: employee.previous_role || '',
        previousCompany: employee.previous_company || '',
        isFresher: !employee.previous_experience && !employee.previous_role && !employee.previous_company,
    });

    useEffect(() => {
        if (isOpen) {
            fetchLocations();
        }
    }, [isOpen]);

    const fetchLocations = async () => {
        const { data } = await supabase.from('office_locations').select('*');
        if (data) setLocations(data);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const { error: updateError } = await supabase
                .from('profiles')
                .update({
                    full_name: formData.fullName,
                    phone: formData.phone || null,
                    designation: formData.designation || null,
                    role: formData.role,
                    base_location_id: formData.baseLocationId || null,
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
                .eq('id', employee.id);

            if (updateError) throw updateError;

            onSuccess();
            onClose();
        } catch (err: any) {
            console.error('Error updating employee:', err);
            setError(err.message || 'Failed to update employee');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto transition-colors">
                <div className="border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between transition-colors">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Edit Employee</h2>
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
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white transition-colors"
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
                            />
                        </div>
                    </div>
                    {(!formData.workEmail && !formData.personalEmail) && (
                        <p className="md:col-span-2 text-xs text-amber-600 -mt-3">At least one email is required.</p>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Phone
                        </label>
                        <input
                            type="tel"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white transition-colors"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Designation
                        </label>
                        <input
                            type="text"
                            value={formData.designation}
                            onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white transition-colors"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Daily Work Hours
                        </label>
                        <input
                            type="number"
                            min="1"
                            max="24"
                            value={formData.dailyWorkHours}
                            onChange={(e) => setFormData({ ...formData, dailyWorkHours: parseInt(e.target.value) || 8 })}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white transition-colors"
                        />
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
                                    id="editIsFresher"
                                    checked={formData.isFresher}
                                    onChange={(e) => setFormData({ ...formData, isFresher: e.target.checked })}
                                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 border-gray-300 dark:border-gray-600 dark:bg-gray-700"
                                />
                                <label htmlFor="editIsFresher" className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
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

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Base Office Location
                        </label>
                        <select
                            value={formData.baseLocationId}
                            onChange={(e) => setFormData({ ...formData, baseLocationId: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white transition-colors"
                        >
                            <option value="">Default (First Available)</option>
                            {locations.map(loc => (
                                <option key={loc.id} value={loc.id}>
                                    {loc.name} ({loc.radius_m}m radius)
                                </option>
                            ))}
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
                                    Updating...
                                </>
                            ) : (
                                'Update Employee'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
