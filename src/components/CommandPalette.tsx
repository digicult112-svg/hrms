import { useEffect, useState } from 'react';
import { Command } from 'cmdk';
import { useNavigate } from 'react-router-dom';
import {
    Calculator,
    Calendar,
    CreditCard,
    Settings,
    User,
    Search,
    LayoutDashboard,
    LogOut,
    Briefcase
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export function CommandPalette() {
    const [open, setOpen] = useState(false);
    const navigate = useNavigate();
    const { signOut } = useAuth();
    const { theme, setTheme } = useTheme();

    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            // Toggle on Cmd+K or Ctrl+K
            if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setOpen((open) => !open);
            }
        };

        document.addEventListener('keydown', down);
        return () => document.removeEventListener('keydown', down);
    }, []);

    const runCommand = (command: () => void) => {
        setOpen(false);
        command();
    };

    const toggleTheme = () => {
        setTheme(theme === 'dark' ? 'light' : 'dark');
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-start justify-center pt-[20vh] transition-all">
            <div className="w-full max-w-lg bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden ring-1 ring-black/5">
                <Command className="w-full">
                    <div className="flex items-center border-b border-gray-100 dark:border-gray-800 px-3">
                        <Search className="w-5 h-5 text-gray-400 mr-2" />
                        <Command.Input
                            placeholder="Type a command or search..."
                            className="w-full py-4 text-sm text-gray-700 dark:text-gray-200 bg-transparent outline-none placeholder:text-gray-400"
                        />
                    </div>

                    <Command.List className="max-h-[300px] overflow-y-auto p-2 scroll-py-2">
                        <Command.Empty className="py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                            No results found.
                        </Command.Empty>

                        <Command.Group heading="Navigation" className="text-xs font-medium text-gray-400 dark:text-gray-500 px-2 py-1.5 mb-2 uppercase tracking-wider">
                            <Command.Item
                                onSelect={() => runCommand(() => navigate('/'))}
                                className="flex items-center px-2 py-2.5 rounded-lg text-sm text-gray-700 dark:text-gray-200 cursor-pointer aria-selected:bg-purple-50 aria-selected:text-purple-700 dark:aria-selected:bg-purple-900/20 dark:aria-selected:text-purple-300 transition-colors"
                                value="dashboard"
                            >
                                <LayoutDashboard className="w-4 h-4 mr-2" />
                                Dashboard
                            </Command.Item>
                            <Command.Item
                                onSelect={() => runCommand(() => navigate('/attendance'))}
                                className="flex items-center px-2 py-2.5 rounded-lg text-sm text-gray-700 dark:text-gray-200 cursor-pointer aria-selected:bg-purple-50 aria-selected:text-purple-700 dark:aria-selected:bg-purple-900/20 dark:aria-selected:text-purple-300 transition-colors"
                                value="attendance"
                            >
                                <Calculator className="w-4 h-4 mr-2" />
                                Attendance
                            </Command.Item>
                            <Command.Item
                                onSelect={() => runCommand(() => navigate('/leave'))}
                                className="flex items-center px-2 py-2.5 rounded-lg text-sm text-gray-700 dark:text-gray-200 cursor-pointer aria-selected:bg-purple-50 aria-selected:text-purple-700 dark:aria-selected:bg-purple-900/20 dark:aria-selected:text-purple-300 transition-colors"
                                value="leave"
                            >
                                <Calendar className="w-4 h-4 mr-2" />
                                Leave Management
                            </Command.Item>
                            <Command.Item
                                onSelect={() => runCommand(() => navigate('/payroll'))}
                                className="flex items-center px-2 py-2.5 rounded-lg text-sm text-gray-700 dark:text-gray-200 cursor-pointer aria-selected:bg-purple-50 aria-selected:text-purple-700 dark:aria-selected:bg-purple-900/20 dark:aria-selected:text-purple-300 transition-colors"
                                value="payroll"
                            >
                                <CreditCard className="w-4 h-4 mr-2" />
                                Payroll
                            </Command.Item>
                            <Command.Item
                                onSelect={() => runCommand(() => navigate('/candidates'))}
                                className="flex items-center px-2 py-2.5 rounded-lg text-sm text-gray-700 dark:text-gray-200 cursor-pointer aria-selected:bg-purple-50 aria-selected:text-purple-700 dark:aria-selected:bg-purple-900/20 dark:aria-selected:text-purple-300 transition-colors"
                                value="candidates"
                            >
                                <Briefcase className="w-4 h-4 mr-2" />
                                Recruitment Board
                            </Command.Item>
                            <Command.Item
                                onSelect={() => runCommand(() => navigate('/profile'))}
                                className="flex items-center px-2 py-2.5 rounded-lg text-sm text-gray-700 dark:text-gray-200 cursor-pointer aria-selected:bg-purple-50 aria-selected:text-purple-700 dark:aria-selected:bg-purple-900/20 dark:aria-selected:text-purple-300 transition-colors"
                                value="profile"
                            >
                                <User className="w-4 h-4 mr-2" />
                                My Profile
                            </Command.Item>
                        </Command.Group>

                        <Command.Group heading="General" className="text-xs font-medium text-gray-400 dark:text-gray-500 px-2 py-1.5 mb-2 mt-4 uppercase tracking-wider">
                            <Command.Item
                                onSelect={() => runCommand(toggleTheme)}
                                className="flex items-center px-2 py-2.5 rounded-lg text-sm text-gray-700 dark:text-gray-200 cursor-pointer aria-selected:bg-purple-50 aria-selected:text-purple-700 dark:aria-selected:bg-purple-900/20 dark:aria-selected:text-purple-300 transition-colors"
                                value="toggle theme"
                            >
                                <Settings className="w-4 h-4 mr-2" />
                                Toggle Theme
                            </Command.Item>
                            <Command.Item
                                onSelect={() => runCommand(() => { signOut(); navigate('/login'); })}
                                className="flex items-center px-2 py-2.5 rounded-lg text-sm text-red-600 dark:text-red-400 cursor-pointer aria-selected:bg-red-50 aria-selected:text-red-700 dark:aria-selected:bg-red-900/20 dark:aria-selected:text-red-300 transition-colors"
                                value="sign out"
                            >
                                <LogOut className="w-4 h-4 mr-2" />
                                Sign Out
                            </Command.Item>
                        </Command.Group>
                    </Command.List>

                    <div className="border-t border-gray-100 dark:border-gray-800 px-3 py-2 text-xs text-gray-400 flex justify-between">
                        <span>Use ↑↓ to navigate</span>
                        <span><kbd className="font-sans px-1 rounded bg-gray-100 dark:bg-gray-800 border dark:border-gray-700">↵</kbd> to select</span>
                    </div>
                </Command>
            </div>
        </div>
    );
}
