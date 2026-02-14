import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useGoogleLogin } from '@react-oauth/google';
import { msalInstance } from '../services/msal';
import { loginRequest } from "../authConfig";
import api from '../api';
import axios from 'axios';
import { Mail, Lock, AlertCircle, CheckCircle, ArrowRight, Sparkles, Eye, EyeOff } from 'lucide-react';

const SignIn: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    useEffect(() => {
        if (location.state && location.state.registrationSuccess) {
            setSuccessMessage('Account created successfully! Please sign in.');
            window.history.replaceState({}, document.title);
        }
    }, [location]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const response = await api.post('/auth/login', {
                email,
                password
            });

            if (response.data && response.data.token) {
                localStorage.setItem('token', response.data.token);
                localStorage.setItem('user', JSON.stringify(response.data));
                navigate('/dashboard');
            }
        } catch (err: any) {
            if (err.response && err.response.data) {
                setError(err.response.data.message || err.response.data);
            } else {
                setError('Invalid credentials or server error.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleSocialLogin = async (email: string, name: string, provider: 'Google' | 'Outlook') => {
        setIsLoading(true);
        setError('');
        try {
            const response = await api.post('/auth/social-login', {
                email,
                name,
                provider
            });

            if (response.data && response.data.token) {
                localStorage.setItem('token', response.data.token);
                localStorage.setItem('user', JSON.stringify(response.data));
                navigate('/dashboard');
            }
        } catch (err: any) {
            console.error(`${provider} Login Error:`, err);
            setError(`${provider} Login Failed. Please try again.`);
        } finally {
            setIsLoading(false);
        }
    };

    const loginGoogle = useGoogleLogin({
        flow: 'implicit',
        onSuccess: async (tokenResponse) => {
            try {
                const userInfo = await axios.get(
                    'https://www.googleapis.com/oauth2/v3/userinfo',
                    { headers: { Authorization: `Bearer ${tokenResponse.access_token}` } }
                );
                handleSocialLogin(userInfo.data.email, userInfo.data.name, 'Google');
            } catch (err) {
                console.error("Google User Info Error:", err);
                setError("Failed to fetch Google profile.");
            }
        },
        onError: () => setError("Google Sign-In Failed"),
    });

    const loginOutlook = async () => {
        setIsLoading(true);
        setError('');
        try {
            // Ensure MSAL is initialized (safe to call multiple times with try-catch)
            try {
                await msalInstance.initialize();
            } catch (e) {
                // Instance might already be initialized
            }

            const response = await msalInstance.loginPopup({
                ...loginRequest,
                prompt: 'select_account' // FORCE the account selection screen
            });

            if (response && response.account) {
                const email = response.account.username ||
                    (response.idTokenClaims as any)?.email ||
                    (response.idTokenClaims as any)?.preferred_username;

                if (!email) {
                    setError("Could not retrieve email from Outlook account.");
                    return;
                }

                handleSocialLogin(
                    email,
                    response.account.name || 'Outlook User',
                    'Outlook'
                );
            }
        } catch (e: any) {
            console.error("Outlook Login Error:", e);
            if (e.name === "BrowserAuthError") {
                setError("MSAL Interaction already in progress. Please check popups.");
            } else {
                setError("Microsoft Sign-In Failed. " + (e.message || ""));
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="h-screen flex overflow-hidden bg-gradient-to-br from-slate-50 to-blue-50">
            {/* Left Side - Logo & Branding */}
            <div className="hidden lg:flex lg:w-5/12 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 items-center justify-center p-12 relative overflow-hidden">
                {/* Animated Background Elements */}
                <div className="absolute inset-0">
                    <div className="absolute top-20 left-20 w-72 h-72 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
                    <div className="absolute bottom-20 right-20 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
                </div>

                <div className="relative z-10 w-full max-w-xl px-8">
                    <div className="flex flex-col items-center">
                        <div className="flex items-center gap-6 mb-8 transform hover:scale-105 transition-all duration-500">
                            <div className="p-5 bg-white/10 backdrop-blur-2xl rounded-[2.5rem] border border-white/30 shadow-[0_20px_50px_rgba(0,0,0,0.2)]">
                                <img src="/recruitai-logo.png" alt="RecruitAI" className="h-20 w-auto" />
                            </div>
                            <div className="text-left border-l-2 border-white/20 pl-6">
                                <h2 className="text-5xl font-black text-white tracking-tighter flex items-center gap-3">
                                    Recruit AI
                                    <Sparkles className="w-10 h-10 text-yellow-400 fill-yellow-400 animate-pulse" />
                                </h2>
                                <p className="text-indigo-100 text-xl font-semibold tracking-wide opacity-90 capitalize">
                                    Intelligent Hiring
                                </p>
                            </div>
                        </div>
                        <div className="w-24 h-1 bg-white/20 rounded-full mb-8"></div>
                        <p className="text-indigo-100/80 text-lg font-medium max-w-sm mx-auto text-center leading-relaxed">
                            Empowering teams with the next generation of <span className="text-white font-bold underline decoration-indigo-400 underline-offset-4">AI-driven</span> recruitment automation.
                        </p>
                    </div>
                </div>
            </div>

            {/* Right Side - Login Form */}
            <div className="flex-1 flex items-center justify-center p-8 bg-slate-50/50">
                <div className="w-full max-w-md">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <h1 className="text-4xl font-black text-indigo-900 tracking-tight mb-3">
                            Welcome Back
                        </h1>
                        <p className="text-slate-500 font-medium text-lg">Sign in to access your dashboard</p>
                    </div>

                    {/* Card with Glassmorphism */}
                    <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 p-8">
                        {/* Messages */}
                        {successMessage && (
                            <div className="mb-4 p-3 rounded-xl bg-green-50 border border-green-200 flex items-start gap-2 animate-slide-down">
                                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                                <p className="text-sm text-green-700 font-medium">{successMessage}</p>
                            </div>
                        )}

                        {error && (
                            <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2 animate-slide-down">
                                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                                <p className="text-sm text-red-700">{error}</p>
                            </div>
                        )}

                        {/* Form */}
                        <form onSubmit={handleLogin} className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Email Address</label>
                                <div className="group flex items-center w-full bg-gray-50 border-2 border-gray-200 rounded-xl px-4 py-4 focus-within:border-indigo-500 focus-within:bg-white transition-all">
                                    <Mail className="w-5 h-5 text-gray-400 group-focus-within:text-indigo-600 transition-colors flex-shrink-0" />
                                    <input
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full bg-transparent border-none focus:ring-0 text-gray-900 placeholder-gray-400 px-3 outline-none text-base"
                                        placeholder="name@company.com"
                                    />
                                </div>
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="block text-sm font-semibold text-gray-700">Password</label>
                                    <a href="#" className="text-sm text-indigo-600 hover:text-indigo-700 font-medium transition-colors">
                                        Forgot?
                                    </a>
                                </div>
                                <div className="group flex items-center w-full bg-gray-50 border-2 border-gray-200 rounded-xl px-4 py-4 focus-within:border-indigo-500 focus-within:bg-white transition-all">
                                    <Lock className="w-5 h-5 text-gray-400 group-focus-within:text-indigo-600 transition-colors flex-shrink-0" />
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full bg-transparent border-none focus:ring-0 text-gray-900 placeholder-gray-400 px-3 outline-none text-base"
                                        placeholder="Enter your password"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="text-gray-400 hover:text-indigo-600 focus:outline-none transition-colors flex-shrink-0"
                                    >
                                        {showPassword ? (
                                            <EyeOff className="w-5 h-5" />
                                        ) : (
                                            <Eye className="w-5 h-5" />
                                        )}
                                    </button>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                id="login-submit-button"
                                className="w-full py-3.5 bg-indigo-600 text-white rounded-xl font-semibold shadow-lg hover:bg-indigo-700 hover:shadow-xl transform hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 group"
                            >
                                {isLoading ? (
                                    <>
                                        <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                        </svg>
                                        Signing in...
                                    </>
                                ) : (
                                    <>
                                        Sign In
                                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                    </>
                                )}
                            </button>


                        </form>

                        {/* Divider */}
                        <div className="relative my-6">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-gray-200"></div>
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-3 bg-white/80 text-gray-500 font-medium">Or continue with</span>
                            </div>
                        </div>

                        {/* Social Buttons */}
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => loginGoogle()}
                                className="flex items-center justify-center gap-2 px-4 py-3 bg-white border-2 border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm hover:shadow group"
                            >
                                <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-5 h-5" />
                                <span>Google</span>
                            </button>

                            <button
                                onClick={loginOutlook}
                                className="flex items-center justify-center gap-2 px-4 py-3 bg-white border-2 border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm hover:shadow group"
                            >
                                <img src="https://upload.wikimedia.org/wikipedia/commons/d/df/Microsoft_Office_Outlook_%282018%E2%80%93present%29.svg" alt="Outlook" className="w-5 h-5" />
                                <span>Outlook</span>
                            </button>
                        </div>

                        {/* Sign Up Link */}
                        <p className="text-center text-sm text-gray-600 mt-6">
                            Don't have an account?{' '}
                            <Link to="/signup" className="font-semibold text-indigo-600 hover:text-indigo-700 transition-colors">
                                Create free account
                            </Link>
                        </p>
                    </div>
                </div>
            </div>

            <style>{`
        @keyframes slide-down {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slide-down {
          animation: slide-down 0.4s ease-out;
        }
      `}</style>
        </div>
    );
};

export default SignIn;
