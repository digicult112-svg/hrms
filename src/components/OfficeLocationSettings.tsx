import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { MapPin, Save, Loader2, RefreshCw } from 'lucide-react';

import type { OfficeLocation } from '../types';

export default function OfficeLocationSettings() {
    const [office, setOffice] = useState<OfficeLocation | null>(null);
    const [loading, setLoading] = useState(false);
    const [updating, setUpdating] = useState(false);

    // Form state
    const [latitude, setLatitude] = useState<string>('');
    const [longitude, setLongitude] = useState<string>('');
    const [radius, setRadius] = useState<number>(300);

    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        fetchOffice();
    }, []);

    const fetchOffice = async () => {
        setLoading(true);
        const { data } = await supabase.from('office_locations').select('*').maybeSingle();
        if (data) {
            setOffice(data);
            setLatitude(data.latitude.toString());
            setLongitude(data.longitude.toString());
            setRadius(data.radius_m || 300);
        }
        setLoading(false);
    };

    const handleGetLocation = () => {
        if (!('geolocation' in navigator)) {
            setMessage({ type: 'error', text: 'Geolocation is not supported by your browser' });
            return;
        }

        setUpdating(true);
        setMessage(null);

        navigator.geolocation.getCurrentPosition(
            (position) => {
                setLatitude(position.coords.latitude.toString());
                setLongitude(position.coords.longitude.toString());
                setUpdating(false);
                setMessage({ type: 'success', text: 'Coordinates fetched! Click Save to apply.' });
            },
            (err) => {
                console.error('Geolocation error:', err);
                setMessage({ type: 'error', text: 'Could not get your location. Please allow location access.' });
                setUpdating(false);
            },
            { enableHighAccuracy: true }
        );
    };

    const handleSave = async () => {
        const lat = parseFloat(latitude);
        const lng = parseFloat(longitude);

        if (isNaN(lat) || isNaN(lng)) {
            setMessage({ type: 'error', text: 'Invalid latitude or longitude.' });
            return;
        }

        setUpdating(true);
        setMessage(null);

        try {
            const { error } = await supabase
                .from('office_locations')
                .upsert({
                    id: office?.id,
                    name: office?.name || 'Main Office',
                    latitude: lat,
                    longitude: lng,
                    radius_m: radius
                })
                .select()
                .single();

            if (error) throw error;

            await fetchOffice();
            setMessage({ type: 'success', text: 'Office configuration saved successfully!' });
        } catch (err: any) {
            console.error('Error saving settings:', err);
            setMessage({ type: 'error', text: err.message || 'Failed to save settings' });
        } finally {
            setUpdating(false);
        }
    };

    if (loading) return (
        <div className="bg-white dark:bg-gray-900 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-gray-100 dark:border-gray-800 p-8 h-[400px] animate-pulse transition-colors">
            <div className="h-4 w-40 bg-gray-200 dark:bg-gray-800 rounded mb-8"></div>
            <div className="space-y-4">
                <div className="h-12 w-full bg-gray-100 dark:bg-gray-800 rounded-xl"></div>
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
                            <MapPin className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                            Office Location
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Configure geo-fencing for attendance</p>
                    </div>
                    <button
                        onClick={fetchOffice}
                        className="p-2 text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-full transition-all"
                        title="Refresh"
                    >
                        <RefreshCw className="w-4 h-4" />
                    </button>
                </div>

                {message && (
                    <div className={`p-4 rounded-xl mb-6 flex items-start gap-3 animate-in slide-in-from-top-2 ${message.type === 'success'
                        ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                        : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                        }`}>
                        <div className={`mt-0.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${message.type === 'success' ? 'bg-green-500' : 'bg-red-500'
                            }`} />
                        <span className="text-sm font-medium">{message.text}</span>
                    </div>
                )}

                <div className="space-y-6 flex-1">
                    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 border border-gray-100 dark:border-gray-700 transition-colors space-y-4">
                        <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Coordinates</span>
                            <span className="text-xs font-mono text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 px-2 py-0.5 rounded border border-purple-100 dark:border-purple-900/30">
                                {latitude && longitude ? 'Set' : 'Not Set'}
                            </span>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Latitude</label>
                                <input
                                    type="text"
                                    value={latitude}
                                    onChange={(e) => setLatitude(e.target.value)}
                                    placeholder="e.g. 12.9716"
                                    className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 text-sm font-mono"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Longitude</label>
                                <input
                                    type="text"
                                    value={longitude}
                                    onChange={(e) => setLongitude(e.target.value)}
                                    placeholder="e.g. 77.5946"
                                    className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 text-sm font-mono"
                                />
                            </div>
                        </div>

                        <p className="text-xs text-gray-400 dark:text-gray-500">
                            Enter coordinates manually or use "Auto-Detect" below.
                        </p>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 ml-1">
                            Geofence Radius
                        </label>
                        <div className="relative">
                            <input
                                type="number"
                                value={radius}
                                onChange={(e) => setRadius(Number(e.target.value))}
                                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 focus:bg-white dark:focus:bg-gray-900 text-gray-900 dark:text-white transition-all outline-none font-mono text-sm"
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-400 font-medium pointer-events-none">
                                meters
                            </span>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 pt-4 mt-auto">
                        <button
                            onClick={handleGetLocation}
                            disabled={updating}
                            className="flex-1 flex items-center justify-center px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-all font-semibold text-sm shadow-sm active:scale-[0.98]"
                        >
                            <MapPin className="w-4 h-4 mr-2 text-purple-500" />
                            Auto-Detect
                        </button>

                        <button
                            onClick={handleSave}
                            disabled={updating}
                            className="flex-1 flex items-center justify-center px-4 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl hover:bg-black dark:hover:bg-gray-200 transition-all font-semibold text-sm shadow-lg shadow-gray-900/10 dark:shadow-white/10 active:scale-[0.98]"
                        >
                            {updating ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save className="w-4 h-4 mr-2" />
                                    Save Changes
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
