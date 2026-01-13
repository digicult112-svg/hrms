import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Clock, Save, Loader2 } from 'lucide-react';

export default function WorkHoursSettings() {
    const [hours, setHours] = useState<number>(8);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const { data, error } = await supabase
                .from('system_settings')
                .select('value')
                .eq('key', 'default_work_hours')
                .single();

            if (error) throw error;
            if (data) {
                setHours(Number(data.value));
            }
        } catch (error) {
            console.error('Error fetching settings:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        setMessage(null);

        try {
            // 1. Update global setting
            const { error: settingError } = await supabase
                .from('system_settings')
                .upsert({
                    key: 'default_work_hours',
                    value: hours,
                    description: 'Default daily work hours for employees'
                });

            if (settingError) throw settingError;

            // 2. Automatically update all profiles
            const { error: profilesError } = await supabase
                .from('profiles')
                .update({ daily_work_hours: hours })
                .neq('id', '00000000-0000-0000-0000-000000000000'); // Safe update all

            if (profilesError) throw profilesError;

            setMessage({
                type: 'success',
                text: `Successfully updated global work hours to ${hours}h for all employees.`
            });

        } catch (error: any) {
            console.error('Error saving settings:', error);
            setMessage({ type: 'error', text: error.message || 'Failed to save settings' });
        } finally {
            setSaving(false);
        }
    };

    if (loading) return (
        <div className="bg-white dark:bg-gray-900 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-gray-100 dark:border-gray-800 p-8 h-[400px] animate-pulse transition-colors">
            <div className="h-4 w-40 bg-gray-200 dark:bg-gray-800 rounded mb-8"></div>
            <div className="space-y-4">
                <div className="h-20 w-full bg-gray-100 dark:bg-gray-800 rounded-xl"></div>
                <div className="h-12 w-full bg-gray-100 dark:bg-gray-800 rounded-xl"></div>
            </div>
        </div>
    );

    return (
        <div className="bg-white dark:bg-gray-900 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-gray-100 dark:border-gray-800 overflow-hidden relative group transition-colors">
            <div className="absolute top-0 right-0 w-64 h-64 bg-purple-50/50 dark:bg-purple-900/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

            <div className="p-8 relative z-10 flex flex-col h-full">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <Clock className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                            Work Hours
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Set standard daily working duration</p>
                    </div>
                </div>

                <div className="space-y-6 flex-1">
                    <div className="bg-gray-50/50 dark:bg-gray-800/50 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 transition-colors">
                        <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4 text-center">
                            Daily Target
                        </label>
                        <div className="flex items-center justify-center gap-4">
                            <button
                                onClick={() => setHours(Math.max(1, hours - 1))}
                                className="w-10 h-10 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 hover:border-purple-200 dark:hover:border-purple-500/50 transition-all active:scale-95"
                            >
                                -
                            </button>
                            <div className="relative group">
                                <input
                                    type="number"
                                    min="1"
                                    max="24"
                                    value={hours}
                                    onChange={(e) => setHours(parseInt(e.target.value) || 0)}
                                    className="w-24 px-2 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 dark:focus:border-purple-500 transition-all outline-none text-center font-bold text-3xl text-gray-900 dark:text-white"
                                />
                                <span className="text-xs font-medium text-gray-400 absolute left-1/2 -translate-x-1/2 -bottom-6">HOURS</span>
                            </div>
                            <button
                                onClick={() => setHours(Math.min(24, hours + 1))}
                                className="w-10 h-10 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 hover:border-purple-200 dark:hover:border-purple-500/50 transition-all active:scale-95"
                            >
                                +
                            </button>
                        </div>
                        <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-6 font-medium">
                            This will apply to all existing and new employees.
                        </p>
                    </div>

                    {message && (
                        <div className={`p-4 rounded-xl flex items-start gap-3 animate-in slide-in-from-top-2 ${message.type === 'success'
                            ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                            : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                            }`}>
                            <div className={`mt-0.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${message.type === 'success' ? 'bg-green-500' : 'bg-red-500'
                                }`} />
                            <p className="text-sm font-medium leading-tight">{message.text}</p>
                        </div>
                    )}

                    <div className="pt-4 mt-auto">
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="w-full flex items-center justify-center px-4 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl hover:bg-black dark:hover:bg-gray-200 transition-all font-semibold text-sm shadow-lg shadow-gray-900/10 dark:shadow-white/10 active:scale-[0.98] disabled:opacity-70"
                        >
                            {saving ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save className="w-4 h-4 mr-2" />
                                    Save Configuration
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
