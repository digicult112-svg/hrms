import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import type { Profile } from '../types';
import { Search, UserPlus, Mail, Phone, Briefcase, Edit2, Trash2, Filter, History, Lock, Unlock } from 'lucide-react';
import CreateEmployeeModal from '../components/CreateEmployeeModal';
import EditEmployeeModal from '../components/EditEmployeeModal';
import DeleteEmployeeDialog from '../components/DeleteEmployeeDialog';
import EmployeeHistoryModal from '../components/EmployeeHistoryModal';
import ViewEmployeeDetailsModal from '../components/ViewEmployeeDetailsModal';
import { Eye } from 'lucide-react';
import SafeAvatar from '../components/SafeAvatar';

export default function EmployeeList() {
    const { profile } = useAuth();
    const [employees, setEmployees] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState<'all' | 'hr' | 'employee'>('all');

    // Modal states
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [showViewModal, setShowViewModal] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState<Profile | null>(null);

    const [statusFilter, setStatusFilter] = useState<'active' | 'deleted'>('active');

    useEffect(() => {
        fetchEmployees();
    }, [statusFilter]); // Re-fetch when status changes

    const fetchEmployees = async () => {
        try {
            setLoading(true);
            let query = supabase
                .from('profiles')
                .select('*')
                .order('full_name');

            if (statusFilter === 'active') {
                query = query.is('deleted_at', null);
            } else {
                query = query.not('deleted_at', 'is', null);
            }

            const { data, error } = await query;

            if (error) throw error;
            setEmployees(data || []);
        } catch (error) {
            console.error('Error fetching employees:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (employee: Profile) => {
        setSelectedEmployee(employee);
        setShowEditModal(true);
    };

    const handleDelete = (employee: Profile) => {
        setSelectedEmployee(employee);
        setShowDeleteDialog(true);
    };

    const handleHistory = (employee: Profile) => {
        setSelectedEmployee(employee);
        setShowHistoryModal(true);
    };

    const handleView = (employee: Profile) => {
        setSelectedEmployee(employee);
        setShowViewModal(true);
    };

    const handleFreezeToggle = async (employee: Profile) => {
        // Prevent HR from freezing admin accounts
        if (employee.role === 'admin') {
            alert('❌ Admin accounts cannot be frozen. Only admins can manage other admin accounts.');
            return;
        }

        const action = employee.is_frozen ? 'unfreeze' : 'freeze';
        if (!confirm(`Are you sure you want to ${action} ${employee.full_name}'s login access?`)) return;

        try {
            // Use RPC function to bypass RLS issues
            const { data, error } = await supabase
                .rpc('toggle_employee_freeze', { employee_id: employee.id });

            if (error) throw error;

            // Update local state with the returned status
            const newFreezeStatus = data?.is_frozen ?? !employee.is_frozen;
            setEmployees(employees.map(e =>
                e.id === employee.id ? { ...e, is_frozen: newFreezeStatus } : e
            ));
        } catch (error: any) {
            console.error('Error updating status:', error);
            alert(`Error: ${error.message}`);
        }
    };

    const handleSuccess = () => {
        fetchEmployees();
    };

    const filteredEmployees = employees.filter(employee => {
        const matchesSearch =
            employee.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            employee.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            employee.designation?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesRole = roleFilter === 'all' || employee.role === roleFilter;

        return matchesSearch && matchesRole;
    });

    const isHR = profile?.role === 'hr';

    return (
        <div className="max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Employees</h1>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {filteredEmployees.length} {filteredEmployees.length === 1 ? 'employee' : 'employees'}
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                    <div className="relative flex-1 sm:flex-initial">
                        <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search employees..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-blue-500 focus:border-blue-500 w-full sm:w-64 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                        />
                    </div>

                    <div className="relative">
                        <Filter className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <select
                            value={roleFilter}
                            onChange={(e) => setRoleFilter(e.target.value as 'all' | 'hr' | 'employee')}
                            className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        >
                            <option value="all">All Roles</option>
                            <option value="hr">HR</option>
                            <option value="employee">Employee</option>
                        </select>
                    </div>

                    <div className="relative">
                        <Filter className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value as 'active' | 'deleted')}
                            className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        >
                            <option value="active">Active Employees</option>
                            <option value="deleted">Deleted (Archived)</option>
                        </select>
                    </div>

                    {isHR && (
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            <UserPlus className="w-5 h-5 mr-2" />
                            Create Employee
                        </button>
                    )}
                </div>
            </div>

            {loading ? (
                <div className="text-center py-12">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <p className="text-gray-600 dark:text-gray-400 mt-2">Loading employees...</p>
                </div>
            ) : filteredEmployees.length === 0 ? (
                <div className="text-center py-12 bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800">
                    <div className="text-gray-400 dark:text-gray-600 mb-4">
                        <UserPlus className="w-16 h-16 mx-auto" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No employees found</h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                        {searchTerm || roleFilter !== 'all'
                            ? 'Try adjusting your search or filters'
                            : 'Get started by creating your first employee'
                        }
                    </p>
                    {isHR && !searchTerm && roleFilter === 'all' && (
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            <UserPlus className="w-5 h-5 mr-2" />
                            Create First Employee
                        </button>
                    )}
                </div>
            ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {filteredEmployees.map((employee) => (
                        <div key={employee.id} className="bg-white dark:bg-gray-900 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-gray-800 hover:border-blue-200 dark:hover:border-blue-800/50 transition-colors">
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center">
                                    <div className="h-12 w-12 rounded-full flex items-center justify-center font-bold text-lg overflow-hidden">
                                        <SafeAvatar
                                            src={employee.avatar_url}
                                            alt={employee.full_name || 'User'}
                                            className="w-full h-full"
                                            size={48}
                                        />
                                    </div>
                                    <div className="ml-4">
                                        <h3 className={`font-semibold ${employee.deleted_at ? 'text-gray-500 dark:text-gray-400 line-through' : 'text-gray-900 dark:text-white'}`}>
                                            {employee.full_name}
                                        </h3>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                            {employee.deleted_at ? 'Deleted Account' : (employee.designation || 'No Designation')}
                                        </p>
                                    </div>
                                </div>
                                <span className={`px-2 py-1 rounded text-xs font-medium ${employee.role === 'hr'
                                    ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300'
                                    : 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                                    }`}>
                                    {employee.role.toUpperCase()}
                                </span>
                            </div>

                            {employee.deleted_at && (
                                <div className="mb-3 -mt-2">
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 w-full justify-center">
                                        <Trash2 className="w-3 h-3 mr-1" />
                                        Deleted on {new Date(employee.deleted_at).toLocaleDateString()}
                                    </span>
                                </div>
                            )}

                            {!employee.deleted_at && employee.is_frozen && (
                                <div className="mb-3 -mt-2">
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300">
                                        <Lock className="w-3 h-3 mr-1" />
                                        Account Frozen
                                    </span>
                                </div>
                            )}

                            <div className={`space-y-3 ${employee.is_frozen || employee.deleted_at ? 'opacity-50' : ''}`}>
                                <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                                    <Mail className="w-4 h-4 mr-3 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                                    <span className="truncate">{employee.work_email || employee.email}</span>
                                </div>
                                <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                                    <Phone className="w-4 h-4 mr-3 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                                    {employee.phone || 'No phone'}
                                </div>
                                <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                                    <Briefcase className="w-4 h-4 mr-3 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                                    Joined {employee.date_joined ? new Date(employee.date_joined).toLocaleDateString() : 'N/A'}
                                </div>
                            </div>

                            {isHR && (
                                <>
                                    <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-800 flex gap-2">
                                        <button
                                            onClick={() => handleHistory(employee)}
                                            className="flex-1 flex items-center justify-center px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-lg transition-colors border border-transparent dark:border-gray-800/30"
                                            title="View Audit Log"
                                        >
                                            <History className="w-4 h-4 mr-1" />
                                            Logs
                                        </button>

                                        {/* For deleted employees, we might restrict other actions or allow Restore in future */}
                                        {!employee.deleted_at && (
                                            <>
                                                <button
                                                    onClick={() => handleView(employee)}
                                                    className="flex-1 flex items-center justify-center px-3 py-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors border border-transparent dark:border-blue-900/30"
                                                    title="View Details"
                                                >
                                                    <Eye className="w-4 h-4 mr-1" />
                                                    View
                                                </button>
                                                {/* Only show freeze button for non-admin accounts */}
                                                {employee.role !== 'admin' && (
                                                    <button
                                                        onClick={() => handleFreezeToggle(employee)}
                                                        className={`flex-1 flex items-center justify-center px-3 py-2 text-sm rounded-lg transition-colors border border-transparent dark:border-gray-800/30 ${employee.is_frozen
                                                            ? 'text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30'
                                                            : 'text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/30'
                                                            }`}
                                                        title={employee.is_frozen ? "Unfreeze Account" : "Freeze Account"}
                                                    >
                                                        {employee.is_frozen ? <Unlock className="w-4 h-4 mr-1" /> : <Lock className="w-4 h-4 mr-1" />}
                                                        {employee.is_frozen ? 'Unfreeze' : 'Freeze'}
                                                    </button>
                                                )}
                                            </>
                                        )}
                                    </div>
                                    {!employee.deleted_at && (
                                        <div className="mt-2 flex gap-2">
                                            <button
                                                onClick={() => handleEdit(employee)}
                                                className="flex-1 flex items-center justify-center px-3 py-2 text-sm text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors border border-transparent dark:border-indigo-900/30"
                                            >
                                                <Edit2 className="w-4 h-4 mr-1" />
                                                Edit
                                            </button>
                                            {/* Only show delete button for non-admin accounts */}
                                            {employee.role !== 'admin' && (
                                                <button
                                                    onClick={() => handleDelete(employee)}
                                                    className="flex-1 flex items-center justify-center px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors border border-transparent dark:border-red-900/30"
                                                >
                                                    <Trash2 className="w-4 h-4 mr-1" />
                                                    Delete
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Modals */}
            <CreateEmployeeModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onSuccess={handleSuccess}
            />

            {selectedEmployee && (
                <>
                    <EditEmployeeModal
                        isOpen={showEditModal}
                        onClose={() => {
                            setShowEditModal(false);
                            setSelectedEmployee(null);
                        }}
                        onSuccess={handleSuccess}
                        employee={selectedEmployee}
                    />

                    <DeleteEmployeeDialog
                        isOpen={showDeleteDialog}
                        onClose={() => {
                            setShowDeleteDialog(false);
                            setSelectedEmployee(null);
                        }}
                        onSuccess={handleSuccess}
                        employeeName={selectedEmployee.full_name || 'Unknown'}
                        employeeId={selectedEmployee.id}
                    />

                    <EmployeeHistoryModal
                        isOpen={showHistoryModal}
                        onClose={() => {
                            setShowHistoryModal(false);
                            setSelectedEmployee(null);
                        }}
                        employee={selectedEmployee}
                    />

                    <ViewEmployeeDetailsModal
                        isOpen={showViewModal}
                        onClose={() => {
                            setShowViewModal(false);
                            setSelectedEmployee(null);
                        }}
                        employee={selectedEmployee}
                    />
                </>
            )}
        </div>
    );
}
