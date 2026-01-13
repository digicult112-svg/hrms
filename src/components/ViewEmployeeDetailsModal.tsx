import { X, Mail, Phone, MapPin, Calendar, Clock, DollarSign, Briefcase, GraduationCap, Building } from 'lucide-react';
import type { Profile } from '../types';
import ManageExperienceModal from './ManageExperienceModal';
import { useState } from 'react';

interface ViewEmployeeDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    employee: Profile | null;
}

export default function ViewEmployeeDetailsModal({ isOpen, onClose, employee }: ViewEmployeeDetailsModalProps) {
    const [showExperienceModal, setShowExperienceModal] = useState(false);

    if (!isOpen || !employee) return null;

    const isFresher = !employee.previous_experience && !employee.previous_role && !employee.previous_company;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-800 transition-colors">
                {/* Header */}
                <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between z-10 transition-colors">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-lg border border-blue-200 dark:border-blue-800/30">
                            {employee.full_name?.[0]?.toUpperCase()}
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{employee.full_name}</h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{employee.designation || 'No Designation'}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 space-y-8">
                    {/* Professional Details */}
                    <section>
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                            <Briefcase className="w-4 h-4" />
                            Professional Details
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg">
                                <span className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Work Email</span>
                                <div className="flex items-center gap-2 text-gray-900 dark:text-white font-medium break-all">
                                    <Mail className="w-4 h-4 text-gray-400" />
                                    {employee.work_email || employee.email || 'N/A'}
                                </div>
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg">
                                <span className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Personal Email</span>
                                <div className="flex items-center gap-2 text-gray-900 dark:text-white font-medium break-all">
                                    <Mail className="w-4 h-4 text-gray-400" />
                                    {employee.personal_email || 'N/A'}
                                </div>
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg">
                                <span className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Role</span>
                                <div className="flex items-center gap-2">
                                    <span className={`px-2 py-1 rounded text-xs font-medium ${employee.role === 'hr'
                                        ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300'
                                        : 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                                        }`}>
                                        {employee.role.toUpperCase()}
                                    </span>
                                </div>
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg">
                                <span className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Date Joined</span>
                                <div className="flex items-center gap-2 text-gray-900 dark:text-white font-medium">
                                    <Calendar className="w-4 h-4 text-gray-400" />
                                    {employee.date_joined ? new Date(employee.date_joined).toLocaleDateString() : 'N/A'}
                                </div>
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg">
                                <span className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Work Hours & Salary</span>
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2 text-gray-900 dark:text-white font-medium">
                                        <Clock className="w-4 h-4 text-gray-400" />
                                        {employee.daily_work_hours || 8} Hours / Day
                                    </div>
                                    <div className="flex items-center gap-2 text-gray-900 dark:text-white font-medium">
                                        <DollarSign className="w-4 h-4 text-gray-400" />
                                        ₹{employee.salary?.toLocaleString() || '0'} / Month
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Personal & Background */}
                    <section>
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                            <Briefcase className="w-4 h-4" />
                            Personal & Background
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg">
                                <span className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Phone Number</span>
                                <div className="flex items-center gap-2 text-gray-900 dark:text-white font-medium">
                                    <Phone className="w-4 h-4 text-gray-400" />
                                    {employee.phone || 'Not provided'}
                                </div>
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg">
                                <span className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Date of Birth</span>
                                <div className="flex items-center gap-2 text-gray-900 dark:text-white font-medium">
                                    <Calendar className="w-4 h-4 text-gray-400" />
                                    {employee.date_of_birth ? new Date(employee.date_of_birth).toLocaleDateString() : 'Not provided'}
                                </div>
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg">
                                <span className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Education</span>
                                <div className="flex items-center gap-2 text-gray-900 dark:text-white font-medium">
                                    <GraduationCap className="w-4 h-4 text-gray-400" />
                                    {employee.education || 'Not provided'}
                                </div>
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg md:col-span-2">
                                <span className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Address</span>
                                <div className="flex items-start gap-2 text-gray-900 dark:text-white font-medium">
                                    <MapPin className="w-4 h-4 text-gray-400 mt-1" />
                                    <span className="break-words">{employee.address || 'Not provided'}</span>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Previous Experience (Only if not fresher) */}
                    <section>
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                            <Building className="w-4 h-4" />
                            Work History
                        </h3>

                        {isFresher ? (
                            <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-lg p-4 text-sm text-blue-700 dark:text-blue-300">
                                This employee is a Fresher with no prior work experience.
                            </div>
                        ) : (
                            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-5 space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <span className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Previous Company</span>
                                        <div className="font-medium text-gray-900 dark:text-white">
                                            {employee.previous_company || 'N/A'}
                                        </div>
                                    </div>
                                    <div>
                                        <span className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Former Role</span>
                                        <div className="font-medium text-gray-900 dark:text-white">
                                            {employee.previous_role || 'N/A'}
                                        </div>
                                    </div>
                                    <div>
                                        <span className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Experience</span>
                                        <div className="font-medium text-gray-900 dark:text-white">
                                            {employee.previous_experience || 'N/A'}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </section>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-200 dark:border-gray-800 flex justify-between">
                    <button
                        onClick={() => setShowExperienceModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors font-medium text-sm"
                    >
                        <Briefcase className="w-4 h-4" />
                        Work Experience
                    </button>
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors font-medium"
                    >
                        Close
                    </button>
                </div>

                {/* Nested Modal for Experience */}
                <ManageExperienceModal
                    isOpen={showExperienceModal}
                    onClose={() => setShowExperienceModal(false)}
                    employeeId={employee.id}
                    allowEdit={true}
                />
            </div>
        </div>
    );
}
