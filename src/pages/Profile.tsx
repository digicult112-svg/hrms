import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import type { Profile } from '../types';
import { Mail, Briefcase, Phone, Calendar, Camera, Trash2, History, PlusCircle } from 'lucide-react';
import EmployeeHistoryModal from '../components/EmployeeHistoryModal';
import ManageExperienceModal from '../components/ManageExperienceModal';
import PointsHistoryList from '../components/PointsHistoryList';
import { Star } from 'lucide-react';

const compressImage = (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
        // If file is already < 30KB, return it as is
        if (file.size <= 30 * 1024) {
            resolve(file);
            return;
        }

        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                // Resize to smaller dimensions to hit ~30KB target
                const maxWidth = 300;
                const maxHeight = 300;
                let width = img.width;
                let height = img.height;

                // Calculated new dimensions maintaining aspect ratio
                if (width > height) {
                    if (width > maxWidth) {
                        height *= maxWidth / width;
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width *= maxHeight / height;
                        height = maxHeight;
                    }
                }

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error('Could not get canvas context'));
                    return;
                }
                ctx.drawImage(img, 0, 0, width, height);

                // Export as JPEG with 0.5 quality to aggressively target low file size
                canvas.toBlob((blob) => {
                    if (!blob) {
                        reject(new Error('Image compression failed'));
                        return;
                    }

                    // Convert blob back to File
                    const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, ".jpg"), {
                        type: 'image/jpeg',
                        lastModified: Date.now(),
                    });

                    console.log(`Compressed image: ${file.size} -> ${compressedFile.size} bytes`);
                    resolve(compressedFile);
                }, 'image/jpeg', 0.5);
            };
            img.onerror = (error) => reject(error);
        };
        reader.onerror = (error) => reject(error);
    });
};

export default function ProfilePage() {
    const { user } = useAuth();
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState<Partial<Profile>>({});
    const [uploading, setUploading] = useState(false);
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [showExperienceModal, setShowExperienceModal] = useState(false);

    useEffect(() => {
        if (user) {
            fetchProfile();
        }
    }, [user]);

    const fetchProfile = async () => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user!.id)
                .single();

            if (error) throw error;
            setProfile(data);
            setFormData(data);
        } catch (error) {
            console.error('Error fetching profile:', error);
        } finally {
            setLoading(false);
        }
    };
    // ... (middle content remains same, we skip large block replacement if possible, but structure is unsafe to partial replace without care)
    // Actually, I'll just replace the top state part and the bottom return structure separately.


    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const { error } = await supabase
                .from('profiles')
                .update({
                    phone: formData.phone,
                    // Add other editable fields here
                })
                .eq('id', user!.id);

            if (error) throw error;
            setProfile({ ...profile!, ...formData } as Profile);
            setIsEditing(false);
        } catch (error) {
            console.error('Error updating profile:', error);
        }
    };

    const uploadAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
        try {
            setUploading(true);

            if (!event.target.files || event.target.files.length === 0) {
                throw new Error('You must select an image to upload.');
            }

            let file = event.target.files[0];

            // Compress image if needed
            try {
                file = await compressImage(file);
            } catch (compError) {
                console.warn('Compression failed, attempting upload of original...', compError);
            }

            const fileExt = file.name.split('.').pop();
            const fileName = `${user!.id}/${Math.random()}.${fileExt}`;
            const filePath = `${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file);

            if (uploadError) {
                throw uploadError;
            }

            const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
            const publicUrl = data.publicUrl;

            const { error: updateError } = await supabase
                .from('profiles')
                .update({ avatar_url: publicUrl })
                .eq('id', user!.id);

            if (updateError) {
                throw updateError;
            }

            setProfile({ ...profile!, avatar_url: publicUrl });
            // Force reload to update header avatar instantly if possible, or use context
            // For now, local state update is fine for this component
        } catch (error) {
            console.error('Error uploading avatar:', error);
            alert('Error uploading avatar!');
        } finally {
            setUploading(false);
        }
    };

    const removeAvatar = async () => {
        if (!confirm('Are you sure you want to remove your profile picture?')) return;

        try {
            setUploading(true);

            // 1. Update profile to nullify avatar_url
            const { error: updateError } = await supabase
                .from('profiles')
                .update({ avatar_url: null })
                .eq('id', user!.id);

            if (updateError) throw updateError;

            // 2. (Optional) We could delete the file from storage if we knew the path, 
            // but for now, unlink is sufficient and safer.

            setProfile({ ...profile!, avatar_url: undefined });
        } catch (error) {
            console.error('Error removing avatar:', error);
            alert('Error removing avatar!');
        } finally {
            setUploading(false);
        }
    };

    if (loading) return <div>Loading...</div>;

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">My Profile</h1>

            <div className="bg-white dark:bg-gray-900 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-gray-100 dark:border-gray-800 overflow-hidden relative group transition-colors">
                {/* Decorative Background */}
                <div className="h-48 bg-gradient-to-r from-purple-100 via-purple-50 to-white dark:from-purple-900/40 dark:via-gray-900 dark:to-gray-900 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-purple-200/20 rounded-full blur-3xl -mr-20 -mt-20"></div>
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-200/20 rounded-full blur-3xl -ml-10 -mb-10"></div>
                </div>

                <div className="px-8 pb-8 relative">
                    <div className="flex flex-col sm:flex-row justify-between items-end -mt-16 mb-8 gap-4">
                        <div className="flex items-end">
                            <div className="relative group/avatar cursor-pointer">
                                <div className="h-32 w-32 rounded-[2rem] p-1 bg-white dark:bg-gray-900 shadow-xl ring-1 ring-gray-100 dark:ring-gray-800 relative overflow-hidden transition-colors">
                                    {profile?.avatar_url ? (
                                        <img
                                            src={profile.avatar_url}
                                            alt="Avatar"
                                            className="w-full h-full rounded-[1.8rem] object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full rounded-[1.8rem] bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-4xl font-bold text-white shadow-inner">
                                            {profile?.full_name?.[0]?.toUpperCase()}
                                        </div>
                                    )}

                                    {/* Upload/Remove Overlay */}
                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center gap-3 opacity-0 group-hover/avatar:opacity-100 transition-opacity rounded-[1.8rem] backdrop-blur-[1px]">
                                        <label
                                            className="cursor-pointer p-3 bg-white/20 rounded-full hover:bg-white/30 transition-all active:scale-95"
                                            htmlFor="avatar-upload"
                                            title="Upload New Photo"
                                        >
                                            <Camera className="w-5 h-5 text-white" />
                                            <input
                                                type="file"
                                                id="avatar-upload"
                                                accept="image/*"
                                                onChange={uploadAvatar}
                                                disabled={uploading}
                                                className="hidden"
                                            />
                                        </label>

                                        {profile?.avatar_url && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    removeAvatar();
                                                }}
                                                disabled={uploading}
                                                className="p-3 bg-red-500/80 rounded-full hover:bg-red-600 transition-all active:scale-95 shadow-sm"
                                                title="Remove Photo"
                                            >
                                                <Trash2 className="w-5 h-5 text-white" />
                                            </button>
                                        )}
                                    </div>
                                    {uploading && (
                                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-[1.8rem] z-10">
                                            <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        </div>
                                    )}
                                </div>
                                <div className="absolute -bottom-2 -right-2 bg-green-500 border-[3px] border-white w-6 h-6 rounded-full"></div>
                            </div>
                            <div className="ml-6 mb-2">
                                <h2 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">{profile?.full_name}</h2>
                                <p className="text-purple-600 dark:text-purple-400 font-medium text-lg">{profile?.designation || 'No Designation'}</p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setShowHistoryModal(true)}
                                className="px-4 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 active:scale-95 bg-white dark:bg-gray-900 flex items-center gap-2"
                            >
                                <History className="w-4 h-4" />
                                <span className="hidden sm:inline">View History</span>
                            </button>
                            <button
                                onClick={() => setIsEditing(!isEditing)}
                                className="px-6 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm border border-gray-200 dark:border-gray-700 hover:border-purple-200 dark:hover:border-purple-700/50 hover:bg-purple-50 dark:hover:bg-purple-900/20 text-gray-700 dark:text-gray-300 hover:text-purple-700 dark:hover:text-purple-400 active:scale-95 bg-white dark:bg-gray-800"
                            >
                                {isEditing ? 'Cancel Editing' : 'Edit Profile'}
                            </button>
                        </div>
                    </div>

                    {isEditing ? (
                        <form onSubmit={handleUpdate} className="animate-in slide-in-from-bottom-2 fade-in duration-300">
                            <div className="bg-gray-50/50 dark:bg-gray-800/50 rounded-2xl p-6 border border-gray-100 dark:border-gray-800 mb-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 ml-1">Phone Number</label>
                                        <div className="relative">
                                            <Phone className="absolute left-4 top-3.5 w-4 h-4 text-gray-400" />
                                            <input
                                                type="text"
                                                value={formData.phone || ''}
                                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                                className="block w-full pl-11 pr-4 py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 text-gray-900 dark:text-white transition-all outline-none"
                                                placeholder="+1 (555) 000-0000"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="flex justify-end">
                                <button
                                    type="submit"
                                    className="px-8 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl hover:bg-black dark:hover:bg-gray-100 font-semibold shadow-lg shadow-gray-900/10 active:scale-95 transition-all"
                                >
                                    Save Changes
                                </button>
                            </div>
                        </form>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in slide-in-from-bottom-2 fade-in duration-500">
                            <div className="bg-gray-50/50 dark:bg-gray-800/50 rounded-2xl p-6 border border-gray-100 dark:border-gray-800 hover:border-purple-100 dark:hover:border-purple-900/30 transition-colors">
                                <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-6 flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
                                    Contact Information
                                </h3>
                                <div className="space-y-4">
                                    <div className="flex items-center group">
                                        <div className="w-10 h-10 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-400 dark:text-gray-500 group-hover:scale-105 group-hover:border-purple-200 dark:group-hover:border-purple-800 group-hover:text-purple-500 dark:group-hover:text-purple-400 transition-all mr-4 shadow-sm">
                                            <Mail className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-400 dark:text-gray-500 font-medium">Email Address</p>
                                            <p className="text-sm font-semibold text-gray-900 dark:text-white">{profile?.email}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center group">
                                        <div className="w-10 h-10 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-400 dark:text-gray-500 group-hover:scale-105 group-hover:border-purple-200 dark:group-hover:border-purple-800 group-hover:text-purple-500 dark:group-hover:text-purple-400 transition-all mr-4 shadow-sm">
                                            <Phone className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-400 dark:text-gray-500 font-medium">Phone Number</p>
                                            <p className="text-sm font-semibold text-gray-900 dark:text-white">{profile?.phone || 'Not provided'}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-gray-50/50 dark:bg-gray-800/50 rounded-2xl p-6 border border-gray-100 dark:border-gray-800 hover:border-purple-100 dark:hover:border-purple-900/30 transition-colors">
                                <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-6 flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                                    Employment Details
                                    <button
                                        onClick={() => setShowExperienceModal(true)}
                                        className="ml-auto flex items-center gap-1 text-xs bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-3 py-1.5 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
                                    >
                                        <PlusCircle className="w-3.5 h-3.5" />
                                        Manage Experience
                                    </button>
                                </h3>
                                <div className="space-y-4">
                                    <div className="flex items-center group">
                                        <div className="w-10 h-10 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-400 dark:text-gray-500 group-hover:scale-105 group-hover:border-indigo-200 dark:group-hover:border-indigo-800 group-hover:text-indigo-500 dark:group-hover:text-indigo-400 transition-all mr-4 shadow-sm">
                                            <Briefcase className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-400 dark:text-gray-500 font-medium">Role</p>
                                            <p className="text-sm font-semibold text-gray-900 dark:text-white capitalize">{profile?.role}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center group">
                                        <div className="w-10 h-10 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-400 dark:text-gray-500 group-hover:scale-105 group-hover:border-indigo-200 dark:group-hover:border-indigo-800 group-hover:text-indigo-500 dark:group-hover:text-indigo-400 transition-all mr-4 shadow-sm">
                                            <Calendar className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-400 dark:text-gray-500 font-medium">Date Joined</p>
                                            <p className="text-sm font-semibold text-gray-900 dark:text-white">{profile?.date_joined || 'Unknown'}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Recognition Points Section */}
                    <div className="mt-8 pt-8 border-t border-gray-100 dark:border-gray-800 animate-in slide-in-from-bottom-2 fade-in duration-700">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                                <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                                Recognition History
                            </h3>
                        </div>
                        <PointsHistoryList userId={profile?.id || ''} />
                    </div>
                </div>
            </div>

            {profile && (
                <EmployeeHistoryModal
                    isOpen={showHistoryModal}
                    onClose={() => setShowHistoryModal(false)}
                    employee={profile}
                />
            )}

            {profile && (
                <ManageExperienceModal
                    isOpen={showExperienceModal}
                    onClose={() => setShowExperienceModal(false)}
                    employeeId={profile.id}
                    allowEdit={true}
                />
            )}
        </div>
    );
}
