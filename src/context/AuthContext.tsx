import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { Profile } from '../types';

interface AuthContextType {
    session: Session | null;
    user: User | null;
    profile: Profile | null;
    tenantId: string | null;
    loading: boolean;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [tenantId, setTenantId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const isSignOutInProgress = useRef(false);

    useEffect(() => {
        // Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);
            if (session?.user) {
                fetchProfile(session.user.id);
            } else {
                setLoading(false);
            }
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setUser(session?.user ?? null);
            if (session?.user) {
                fetchProfile(session.user.id);
            } else {
                setProfile(null);
                setLoading(false);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    // Monitor Freeze Status in Real-time
    useEffect(() => {
        if (!user) return;

        const channel = supabase
            .channel(`profile_freeze_check_${user.id}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'profiles',
                    filter: `id=eq.${user.id}`
                },
                async (payload) => {
                    if (payload.new.is_frozen && !isSignOutInProgress.current) {
                        isSignOutInProgress.current = true;
                        await signOut();
                        // We use a simple window alert here as a last resort before redirect, 
                        // but the signOut logic will trigger the UI to clear.
                        alert('Your account has been frozen by the administrator. Session terminated.');
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user]);

    const fetchProfile = async (userId: string) => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (error) {
                console.error('Error fetching profile:', error);
            } else {
                if (data.is_frozen && !isSignOutInProgress.current) {
                    isSignOutInProgress.current = true;
                    await supabase.auth.signOut();
                    setProfile(null);
                    setTenantId(null);
                    setUser(null);
                    setSession(null);
                    alert('Your account has been frozen by the administrator. Please contact HR.');
                    return;
                }
                setProfile(data);
                setTenantId(data.tenant_id);
            }
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    };

    const signOut = async () => {
        if (isSignOutInProgress.current) return;
        isSignOutInProgress.current = true;
        try {
            await supabase.auth.signOut();
        } finally {
            setProfile(null);
            setTenantId(null);
            setUser(null);
            setSession(null);
            isSignOutInProgress.current = false;
        }
    };

    return (
        <AuthContext.Provider value={{ session, user, profile, tenantId, loading, signOut }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
