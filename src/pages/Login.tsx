import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Lock, Mail, ArrowRight, CheckCircle2, Hexagon } from 'lucide-react';
import { useToast } from '../context/ToastContext';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const { error: toastError, success } = useToast();
    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) throw error;

            // Check if user is frozen
            if (data.user) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('is_frozen')
                    .eq('id', data.user.id)
                    .single();

                if (profile?.is_frozen) {
                    await supabase.auth.signOut();
                    throw new Error('Your account has been frozen by the administrator. Access denied.');
                }
            }

            success('Welcome back!', 'You have successfully signed in.');
            navigate('/');
        } catch (err: any) {
            toastError('Login Failed', err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex bg-gray-50 dark:bg-gray-950 transition-colors duration-200">
            {/* Left Brand Side */}
            <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gray-900 justify-center items-center">
                {/* Background Gradients */}
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-purple-900 via-gray-900 to-gray-900 opacity-90 z-0"></div>
                <div className="absolute -top-[20%] -left-[20%] w-[70%] h-[70%] bg-purple-600 rounded-full mix-blend-multiply filter blur-[100px] opacity-30 animate-blob"></div>
                <div className="absolute -bottom-[20%] -right-[20%] w-[70%] h-[70%] bg-indigo-600 rounded-full mix-blend-multiply filter blur-[100px] opacity-30 animate-blob animation-delay-2000"></div>

                {/* Content */}
                <div className="relative z-10 p-12 max-w-lg text-white">
                    <div className="mb-8 p-3 bg-white/10 w-fit rounded-2xl backdrop-blur-xl border border-white/10 shadow-xl">
                        <Hexagon className="w-10 h-10 text-purple-400 fill-purple-400/20" />
                    </div>
                    <h1 className="text-5xl font-bold mb-6 leading-tight">
                        Orchestrate your <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-400">Workforce</span>
                    </h1>
                    <p className="text-xl text-gray-300 mb-8 leading-relaxed">
                        A modern HRMS platform designed to streamline attendance, payroll, and recruitment with intelligent analytics.
                    </p>

                    <div className="space-y-4">
                        {[
                            'Real-time Attendance Tracking',
                            'Automated Payroll Processing',
                            'Smart Recruitment Pipelines',
                            'Advanced Performance Analytics'
                        ].map((feature, index) => (
                            <div key={index} className="flex items-center gap-3 text-gray-300">
                                <CheckCircle2 className="w-5 h-5 text-purple-400" />
                                <span>{feature}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Right Form Side */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8 relative">
                <div className="w-full max-w-md space-y-8">
                    {/* Header */}
                    <div className="text-center lg:text-left">
                        <div className="lg:hidden flex justify-center mb-6">
                            <div className="p-3 bg-purple-50 dark:bg-purple-900/20 w-fit rounded-xl">
                                <Hexagon className="w-8 h-8 text-purple-600 dark:text-purple-400 fill-purple-600/20" />
                            </div>
                        </div>
                        <h2 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">Welcome back</h2>
                        <p className="mt-2 text-gray-500 dark:text-gray-400">
                            Please enter your details to sign in.
                        </p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-6">
                        <div className="space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                    Email Address
                                </label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Mail className="h-5 w-5 text-gray-400 group-focus-within:text-purple-500 transition-colors" />
                                    </div>
                                    <input
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="block w-full pl-10 pr-3 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all"
                                        placeholder="name@company.com"
                                    />
                                </div>
                            </div>

                            <div>
                                <div className="flex justify-between items-center mb-1.5">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Password
                                    </label>
                                    <button type="button" className="text-sm font-medium text-purple-600 hover:text-purple-500 dark:text-purple-400 transition-colors">
                                        Forgot password?
                                    </button>
                                </div>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Lock className="h-5 w-5 text-gray-400 group-focus-within:text-purple-500 transition-colors" />
                                    </div>
                                    <input
                                        type="password"
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="block w-full pl-10 pr-3 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all"
                                        placeholder="••••••••"
                                    />
                                </div>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full flex items-center justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-lg shadow-purple-500/20 text-sm font-semibold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:-translate-y-0.5 active:translate-y-0"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    Sign In
                                    <ArrowRight className="ml-2 w-4 h-4" />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-gray-200 dark:border-gray-800"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-2 bg-gray-50 dark:bg-gray-950 text-gray-500">Or continue with</span>
                        </div>
                    </div>

                    <div className="mt-6 text-center">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            Don't have an account?{' '}
                            <button
                                onClick={() => navigate('/register')}
                                className="text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 font-semibold transition-colors"
                            >
                                Create an account
                            </button>
                        </p>
                    </div>
                </div>

                {/* Footer Copyright */}
                <div className="absolute bottom-6 text-xs text-gray-400 dark:text-gray-600">
                    &copy; 2025 HRMS Platform. All rights reserved.
                </div>
            </div>
        </div>
    );
}
