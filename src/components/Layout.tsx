import React, { useEffect, useState, useRef } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import api from '../api';
import {
    LayoutDashboard,
    Briefcase,
    Users,
    UploadCloud,
    BarChart,
    FileText,
    Settings,
    LogOut,
    Menu,
    X,
    Bell,
    CheckCircle,
    Info,
    AlertCircle
} from 'lucide-react';
import InterviewAlert from './InterviewAlert';

const Layout: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [user, setUser] = useState<any>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isUploading, setIsUploading] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        // Initialize notification sound
        audioRef.current = new Audio("https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3");
    }, []);

    useEffect(() => {
        const token = localStorage.getItem('token');
        const userData = localStorage.getItem('user');

        if (!token) {
            navigate('/login');
        } else if (userData) {
            setUser(JSON.parse(userData));
        }
    }, [navigate]);

    // Listen for storage changes to sync user data (e.g., from Settings page)
    useEffect(() => {
        const handleStorageChange = () => {
            const userData = localStorage.getItem('user');
            if (userData) {
                setUser(JSON.parse(userData));
            }
        };

        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, []);

    const [notifications, setNotifications] = useState<any[]>([]);
    const [recentToast, setRecentToast] = useState<{ message: string, type: 'SUCCESS' | 'INFO' | 'ERROR' } | null>(null);
    const lastNotifId = useRef<string | null>(null);

    useEffect(() => {
        const fetchNotifications = async () => {
            try {
                const response = await api.get('/notifications?unreadOnly=true');
                const newNotifs = response.data;
                setNotifications(newNotifs);

                // Show toast for the newest notification if it's new
                if (newNotifs.length > 0) {
                    const newest = newNotifs[0];
                    if (newest.id !== lastNotifId.current) {
                        lastNotifId.current = newest.id;
                        setRecentToast({ message: newest.message, type: newest.type || 'INFO' });

                        // Play sound (Loop for 5 seconds as requested)
                        if (audioRef.current) {
                            audioRef.current.currentTime = 0;
                            audioRef.current.loop = true;
                            audioRef.current.play().catch(e => console.log("Audio play deferred until user interaction."));

                            setTimeout(() => {
                                if (audioRef.current) {
                                    audioRef.current.pause();
                                    audioRef.current.loop = false;
                                }
                            }, 5000);
                        }

                        setTimeout(() => setRecentToast(null), 5000);
                    }
                }
            } catch (error) {
                console.error("Failed to fetch notifications", error);
            }
        };

        fetchNotifications();
        // Poll every 30 seconds
        const interval = setInterval(fetchNotifications, 10000);
        return () => clearInterval(interval);
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
    };

    const handleProfilePictureClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user?.email) return;

        // basic validation
        if (file.size > 2 * 1024 * 1024) {
            alert('File size too large. Please select an image under 2MB.');
            return;
        }

        setIsUploading(true);
        const formData = new FormData();
        formData.append('file', file);
        formData.append('email', user.email);

        try {
            const response = await api.put('/users/profile-picture', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            if (response.data) {
                // Update local storage and state
                const updatedUser = { ...user, profilePicture: response.data.profilePicture };
                localStorage.setItem('user', JSON.stringify(updatedUser));
                setUser(updatedUser);
                alert('Profile picture updated successfully!');
            }
        } catch (error) {
            console.error('Failed to upload profile picture', error);
            alert('Failed to update profile picture. Please try again.');
        } finally {
            setIsUploading(false);
        }
    };

    const navItems = [
        { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { path: '/jobs', label: 'Job Management', icon: Briefcase },
        { path: '/candidates', label: 'Candidates', icon: Users },
        { path: '/resume-upload', label: 'Resume Upload', icon: UploadCloud },
        { path: '/skills-matrix', label: 'Skills Matrix', icon: BarChart },
        { path: '/shortlist-report', label: 'Shortlist Report', icon: FileText },
        { path: '/interview-pipeline', label: 'Interview Pipeline', icon: Users },
        { path: '/settings', label: 'Settings', icon: Settings },
    ];

    return (
        <div className="flex h-screen bg-gray-50 font-sans">
            {/* Sidebar */}
            <aside
                className={`bg-white border-r border-gray-200 transition-all duration-300 ease-in-out flex flex-col
          ${isSidebarOpen ? 'w-64' : 'w-20'} fixed md:relative z-30 h-full`}
            >
                <div className="h-16 flex items-center justify-between px-6 border-b border-gray-100">
                    {isSidebarOpen ? (
                        <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-cyan-500">
                            RecruitAI
                        </span>
                    ) : (
                        <span className="text-xl font-bold text-indigo-600 mx-auto">RAI</span>
                    )}
                    <button
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        className="p-1 rounded-md hover:bg-gray-100 text-gray-500 md:hidden"
                    >
                        {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
                    </button>
                </div>

                <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
                    <div className="mb-6 px-3">
                        <div className={`mb-2 px-1 ${!isSidebarOpen && 'hidden'}`}>
                            <span className="text-xl font-bold text-indigo-700">
                                Recruit Ai
                            </span>
                        </div>
                        <p className={`text-xs font-semibold text-gray-400 uppercase tracking-wider ${!isSidebarOpen && 'hidden'}`}>
                            Main Menu
                        </p>
                    </div>

                    {navItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={({ isActive }) =>
                                `flex items-center px-3 py-2.5 rounded-lg transition-all duration-200 group
                ${isActive
                                    ? 'bg-indigo-50 text-indigo-600 shadow-sm'
                                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                }`
                            }
                        >
                            <item.icon size={20} className={`flex-shrink-0 ${isSidebarOpen ? 'mr-3' : 'mx-auto'}`} />
                            {isSidebarOpen && <span className="font-medium text-sm">{item.label}</span>}

                            {!isSidebarOpen && (
                                <div className="absolute left-16 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 whitespace-nowrap">
                                    {item.label}
                                </div>
                            )}
                        </NavLink>
                    ))}
                </nav>

                <div className="p-4 border-t border-gray-100">
                    <button
                        onClick={handleLogout}
                        className={`flex items-center w-full px-3 py-2.5 rounded-lg text-red-600 hover:bg-red-50 transition-colors
              ${isSidebarOpen ? '' : 'justify-center'}`}
                    >
                        <LogOut size={20} className={isSidebarOpen ? 'mr-3' : ''} />
                        {isSidebarOpen && <span className="font-medium text-sm">Sign Out</span>}
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-auto w-full">
                <div className={`p-8 ${isSidebarOpen ? '' : ''}`}>
                    {/* Top Bar (Optional, usually for Search/Profile) */}
                    <div className="flex justify-end mb-8 gap-6 items-center">
                        {/* Notification Bell */}
                        <div className="relative cursor-pointer group">
                            <span className="p-2 rounded-full hover:bg-gray-100 block transition">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-600">
                                    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                                    <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
                                </svg>
                            </span>
                            {/* Red Dot if unread */}
                            {notifications.length > 0 && (
                                <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
                            )}

                            {/* Simple Dropdown Hover */}
                            <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-2xl border border-gray-100 opacity-0 group-hover:opacity-100 invisible group-hover:visible transition-all duration-200 transform origin-top-right z-50">
                                <div className="p-4 border-b border-gray-50 bg-gray-50/50 rounded-t-xl">
                                    <h4 className="font-bold text-gray-800">Notifications</h4>
                                </div>
                                <div className="max-h-64 overflow-y-auto">
                                    {notifications.length === 0 ? (
                                        <div className="p-4 text-center text-gray-500 text-sm">No new notifications</div>
                                    ) : (
                                        notifications.map((notif: any) => (
                                            <div
                                                key={notif.id}
                                                onClick={() => {
                                                    // Handle Navigation based on Category
                                                    if (notif.category === 'INTERVIEW' || notif.message.includes('Interview')) {
                                                        navigate('/candidates', { state: { highlightId: notif.relatedEntityId } });
                                                    } else {
                                                        // Default fallback
                                                        navigate('/dashboard');
                                                    }
                                                }}
                                                className="p-4 border-b border-gray-50 hover:bg-indigo-50 transition cursor-pointer"
                                            >
                                                <p className="text-sm text-gray-800 font-medium">{notif.type === 'SUCCESS' ? '✅ ' : 'ℹ️ '}{notif.message}</p>
                                                <p className="text-xs text-gray-500 mt-1">{new Date(notif.createdAt).toLocaleString()}</p>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            {/* Settings Icon in User Account Section */}
                            <button
                                onClick={() => navigate('/settings')}
                                className="p-2 rounded-full hover:bg-gray-100 text-gray-500 transition-all hover:text-indigo-600 group relative"
                                title="Account Settings"
                            >
                                <Settings size={22} className="transition-transform group-hover:rotate-45" />
                            </button>

                            <div className="text-right hidden sm:block">
                                <p className="text-sm font-medium text-gray-900">{user?.email || 'User'}</p>
                                <p className="text-xs text-gray-500 uppercase tracking-tighter">{user?.role || 'USER'}</p>
                            </div>
                            <div
                                onClick={handleProfilePictureClick}
                                className={`w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold shadow-lg border-2 border-white ring-2 ring-indigo-50 transform hover:scale-105 transition-all cursor-pointer overflow-hidden group/avatar relative ${isUploading ? 'opacity-50' : ''}`}
                            >
                                {isUploading ? (
                                    <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    </div>
                                ) : user?.profilePicture ? (
                                    <img src={user.profilePicture} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    <span>{user?.email ? user.email.charAt(0).toUpperCase() : 'U'}</span>
                                )}
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity">
                                    <UploadCloud size={14} className="text-white" />
                                </div>
                            </div>
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept="image/*"
                                onChange={handleFileChange}
                            />
                        </div>
                    </div>

                    <Outlet />
                </div>
            </main>
            {recentToast && (
                <div className={`fixed bottom-12 left-1/2 transform -translate-x-1/2 px-8 py-4 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] z-[100] animate-in slide-in-from-bottom-5 duration-300 flex items-center gap-4 font-bold text-white border-2 border-white/20 backdrop-blur-md ${recentToast.type === 'SUCCESS' ? 'bg-green-600/95' :
                    recentToast.type === 'ERROR' ? 'bg-red-600/95' : 'bg-indigo-600/95'
                    }`}>
                    <div className="p-2 bg-white/20 rounded-full">
                        {recentToast.type === 'SUCCESS' ? <CheckCircle className="w-6 h-6" /> :
                            recentToast.type === 'ERROR' ? <AlertCircle className="w-6 h-6" /> : <Bell className="w-6 h-6" />}
                    </div>
                    <div className="flex flex-col">
                        <span className="text-xs uppercase opacity-80 tracking-widest mb-0.5">Notification</span>
                        <span className="text-lg">{recentToast.message}</span>
                    </div>
                </div>
            )}
            <InterviewAlert />
        </div>
    );
};

export default Layout;
