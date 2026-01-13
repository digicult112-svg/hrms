import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Bell, Loader2, VolumeX } from 'lucide-react';

export default function NotificationSettings() {
    const [enabled, setEnabled] = useState(false);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const { data } = await supabase
                .from('system_settings')
                .select('value')
                .eq('key', 'enable_clock_in_notifications')
                .single();

            if (data) {
                setEnabled(Boolean(data.value));
            }
        } catch (error) {
            console.error('Error fetching notification settings:', error);
        } finally {
            setLoading(false);
        }
    };

    const toggleNotification = async (newState: boolean) => {
        setUpdating(true);

        // Optimistic update
        setEnabled(newState);

        try {
            const { error } = await supabase
                .from('system_settings')
                .upsert({
                    key: 'enable_clock_in_notifications',
                    value: newState,
                    description: 'Enable real-time notifications for HR when employees clock in'
                });

            if (error) throw error;

        } catch (error) {
            console.error('Error saving setting:', error);
            // Revert on error
            setEnabled(!newState);
        } finally {
            setUpdating(false);
        }
    };

    if (loading) return (
        <div className="h-full min-h-[160px] bg-white dark:bg-gray-800 rounded-3xl animate-pulse flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-gray-300 dark:text-gray-600 animate-spin" />
        </div>
    );

    return (
        <div className={`flex items-center gap-3 px-3 py-1.5 rounded-xl border transition-all duration-300 ${enabled
            ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800 shadow-sm'
            : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
            }`}>
            <div className={`p-1.5 rounded-lg transition-colors ${enabled ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400' : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500'}`}>
                {enabled ? <Bell className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </div>

            <div className="flex flex-col mr-2">
                <span className={`text-xs font-bold leading-none mb-0.5 ${enabled ? 'text-purple-900 dark:text-purple-300' : 'text-gray-600 dark:text-gray-400'}`}>Clock-In Alerts</span>
                <span className="text-[10px] text-gray-500 dark:text-gray-400 leading-none font-medium">{enabled ? 'On' : 'Off'}</span>
            </div>

            <button
                onClick={() => toggleNotification(!enabled)}
                disabled={updating}
                className={`relative w-11 h-6 rounded-full transition-all duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-purple-500 ${enabled
                    ? 'bg-purple-600 shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)]'
                    : 'bg-gray-200 shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)]'
                    }`}
            >
                <span className={`absolute left-0.5 top-0.5 w-5 h-5 rounded-full bg-white shadow-md transform transition-transform duration-300 cubic-bezier(0.4, 0.0, 0.2, 1) flex items-center justify-center ${enabled ? 'translate-x-5' : 'translate-x-0'
                    }`}>
                    {updating ? (
                        <Loader2 className="w-3 h-3 text-purple-600 animate-spin" />
                    ) : (
                        enabled && <span className="w-1.5 h-1.5 rounded-full bg-purple-600/20"></span>
                    )}
                </span>
            </button>
        </div>
    );
}
