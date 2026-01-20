import { useState, useEffect } from 'react';
import { Outlet, useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ThemeToggle } from './ThemeToggle';
import { LogOut, LayoutDashboard, Users, Clock, Calendar, DollarSign, Briefcase, FileText, Shield, Menu, X, LifeBuoy, MessageSquare, ShieldAlert } from 'lucide-react';
import { Mail } from 'lucide-react';
import SafeAvatar from './SafeAvatar';
import { CommandPalette } from './CommandPalette';
import NotificationCenter from './NotificationCenter';
import { AnimatePresence, motion } from 'framer-motion';

export default function Layout() {
    const { signOut, profile } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const handleSignOut = async () => {
        await signOut();
        navigate('/login');
    };

    const isActive = (path: string) => location.pathname === path;
    const [isMobileOpen, setIsMobileOpen] = useState(false);

    // Close mobile menu when navigating
    useEffect(() => {
        setIsMobileOpen(false);
    }, [location.pathname]);

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col md:flex-row transition-colors duration-200">
            <CommandPalette />

            {/* Mobile Header */}
            <div className="md:hidden bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 p-4 flex items-center justify-between sticky top-0 z-30">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setIsMobileOpen(!isMobileOpen)}
                        className="p-2 -ml-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                    >
                        {isMobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                    </button>
                    <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-indigo-600">HRMS</span>
                </div>
                <div className="flex items-center gap-2">
                    <NotificationCenter />
                    <ThemeToggle />
                </div>
            </div>

            {/* Mobile Overlay */}
            {isMobileOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm"
                    onClick={() => setIsMobileOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`
                fixed md:sticky top-0 h-screen w-64 bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800 
                z-50 overflow-y-auto transition-transform duration-300 ease-in-out
                ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0
            `}>
                <div className="h-16 flex items-center justify-between px-6 border-b border-gray-100 dark:border-gray-800 hidden md:flex">
                    <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-indigo-600">HRMS</span>
                    <div className="flex items-center gap-2">
                        <NotificationCenter />
                        <ThemeToggle />
                    </div>
                </div>

                <nav className="p-4 space-y-1">
                    {/* Admin-only navigation */}
                    {profile?.role === 'admin' ? (
                        <>
                            <Link
                                to="/feedback"
                                className={`flex items-center px-4 py-2 rounded-lg transition-colors ${isActive('/feedback')
                                    ? 'bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300 font-medium'
                                    : 'text-gray-700 dark:text-gray-400 hover:bg-purple-50/50 dark:hover:bg-gray-800 hover:text-purple-600 dark:hover:text-purple-300'}`}
                            >
                                <MessageSquare className="w-5 h-5 mr-3" />
                                Feedback
                            </Link>

                            <Link
                                to="/admin-dashboard"
                                className={`flex items-center px-4 py-2 rounded-lg transition-colors ${isActive('/admin-dashboard')
                                    ? 'bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300 font-medium'
                                    : 'text-gray-700 dark:text-gray-400 hover:bg-purple-50/50 dark:hover:bg-gray-800 hover:text-purple-600 dark:hover:text-purple-300'}`}
                            >
                                <ShieldAlert className="w-5 h-5 mr-3" />
                                Admin Dashboard
                            </Link>
                        </>
                    ) : (
                        <>
                            {/* Regular user navigation */}
                            <Link
                                to="/"
                                className={`flex items-center px-4 py-2 rounded-lg transition-colors ${isActive('/')
                                    ? 'bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300 font-medium'
                                    : 'text-gray-700 dark:text-gray-400 hover:bg-purple-50/50 dark:hover:bg-gray-800 hover:text-purple-600 dark:hover:text-purple-300'}`}
                            >
                                <LayoutDashboard className="w-5 h-5 mr-3" />
                                Dashboard
                            </Link>

                            <Link
                                to="/attendance"
                                className={`flex items-center px-4 py-2 rounded-lg transition-colors ${isActive('/attendance')
                                    ? 'bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300 font-medium'
                                    : 'text-gray-700 dark:text-gray-400 hover:bg-purple-50/50 dark:hover:bg-gray-800 hover:text-purple-600 dark:hover:text-purple-300'}`}
                            >
                                <Clock className="w-5 h-5 mr-3" />
                                Attendance
                            </Link>

                            <Link
                                to="/leave"
                                className={`flex items-center px-4 py-2 rounded-lg transition-colors ${isActive('/leave')
                                    ? 'bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300 font-medium'
                                    : 'text-gray-700 dark:text-gray-400 hover:bg-purple-50/50 dark:hover:bg-gray-800 hover:text-purple-600 dark:hover:text-purple-300'}`}
                            >
                                <Calendar className="w-5 h-5 mr-3" />
                                Leave
                            </Link>

                            <Link
                                to="/payroll"
                                className={`flex items-center px-4 py-2 rounded-lg transition-colors ${isActive('/payroll')
                                    ? 'bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300 font-medium'
                                    : 'text-gray-700 dark:text-gray-400 hover:bg-purple-50/50 dark:hover:bg-gray-800 hover:text-purple-600 dark:hover:text-purple-300'}`}
                            >
                                <DollarSign className="w-5 h-5 mr-3" />
                                Payroll
                            </Link>

                            <Link
                                to="/jobs"
                                className={`flex items-center px-4 py-2 rounded-lg transition-colors ${isActive('/jobs')
                                    ? 'bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300 font-medium'
                                    : 'text-gray-700 dark:text-gray-400 hover:bg-purple-50/50 dark:hover:bg-gray-800 hover:text-purple-600 dark:hover:text-purple-300'}`}
                            >
                                <Briefcase className="w-5 h-5 mr-3" />
                                Job Openings
                            </Link>

                            <Link
                                to="/helpdesk"
                                className={`flex items-center px-4 py-2 rounded-lg transition-colors ${isActive('/helpdesk')
                                    ? 'bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300 font-medium'
                                    : 'text-gray-700 dark:text-gray-400 hover:bg-purple-50/50 dark:hover:bg-gray-800 hover:text-purple-600 dark:hover:text-purple-300'}`}
                            >
                                <LifeBuoy className="w-5 h-5 mr-3" />
                                Helpdesk
                            </Link>

                            <Link
                                to="/profile"
                                className={`flex items-center px-4 py-2 rounded-lg transition-colors ${isActive('/profile')
                                    ? 'bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300 font-medium'
                                    : 'text-gray-700 dark:text-gray-400 hover:bg-purple-50/50 dark:hover:bg-gray-800 hover:text-purple-600 dark:hover:text-purple-300'}`}
                            >
                                <Users className="w-5 h-5 mr-3" />
                                My Profile
                            </Link>

                            <Link
                                to="/feedback"
                                className={`flex items-center px-4 py-2 rounded-lg transition-colors ${isActive('/feedback')
                                    ? 'bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300 font-medium'
                                    : 'text-gray-700 dark:text-gray-400 hover:bg-purple-50/50 dark:hover:bg-gray-800 hover:text-purple-600 dark:hover:text-purple-300'}`}
                            >
                                <MessageSquare className="w-5 h-5 mr-3" />
                                Feedback
                            </Link>
                        </>
                    )}

                    {profile?.role === 'hr' && (
                        <>
                            <div className="pt-4 pb-2 px-4 text-xs font-bold text-gray-400 uppercase tracking-wider">
                                HR Management
                            </div>
                            <Link
                                to="/employees"
                                className={`flex items-center px-4 py-2 rounded-lg transition-colors ${isActive('/employees')
                                    ? 'bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300 font-medium'
                                    : 'text-gray-700 dark:text-gray-400 hover:bg-purple-50/50 dark:hover:bg-gray-800 hover:text-purple-600 dark:hover:text-purple-300'}`}
                            >
                                <Users className="w-5 h-5 mr-3" />
                                Employees
                            </Link>
                            <Link
                                to="/candidates"
                                className={`flex items-center px-4 py-2 rounded-lg transition-colors ${isActive('/candidates')
                                    ? 'bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300 font-medium'
                                    : 'text-gray-700 dark:text-gray-400 hover:bg-purple-50/50 dark:hover:bg-gray-800 hover:text-purple-600 dark:hover:text-purple-300'}`}
                            >
                                <FileText className="w-5 h-5 mr-3" />
                                Recruitment
                            </Link>
                            <Link
                                to="/audit-logs"
                                className={`flex items-center px-4 py-2 rounded-lg transition-colors ${isActive('/audit-logs')
                                    ? 'bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300 font-medium'
                                    : 'text-gray-700 dark:text-gray-400 hover:bg-purple-50/50 dark:hover:bg-gray-800 hover:text-purple-600 dark:hover:text-purple-300'}`}
                            >
                                <Shield className="w-5 h-5 mr-3" />
                                Audit Logs
                            </Link>

                            <Link
                                to="/communication"
                                className={`flex items-center px-4 py-2 rounded-lg transition-colors ${isActive('/communication')
                                    ? 'bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300 font-medium'
                                    : 'text-gray-700 dark:text-gray-400 hover:bg-purple-50/50 dark:hover:bg-gray-800 hover:text-purple-600 dark:hover:text-purple-300'}`}
                            >
                                <Mail className="w-5 h-5 mr-3" />
                                Communication
                            </Link>
                        </>
                    )}
                </nav>

                <div className="absolute bottom-0 w-full p-4 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 transition-colors duration-200">
                    <div className="flex items-center mb-4 px-2">
                        <SafeAvatar
                            src={profile?.avatar_url}
                            alt={profile?.full_name || 'User'}
                            className="w-9 h-9 shadow-sm"
                            size={36}
                        />
                        <div className="ml-3">
                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate w-32">{profile?.full_name}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{profile?.role}</p>
                        </div>
                    </div>
                    <button
                        onClick={handleSignOut}
                        className="flex items-center w-full px-4 py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    >
                        <LogOut className="w-4 h-4 mr-3" />
                        Sign Out
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 md:ml-0 p-4 md:p-8 bg-gray-50 dark:bg-gray-950 selection:bg-purple-100 transition-colors duration-200 min-w-0">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={location.pathname}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                    >
                        <Outlet />
                    </motion.div>
                </AnimatePresence>
            </main>
        </div >
    );
}
