import React, { useState, useRef, useEffect } from 'react';
import api from '../api';
import { User, Bell, Building, Shield, Save, Slack, Linkedin, Mail, Check, X, Upload } from 'lucide-react';

interface SettingsProps {
  searchQuery?: string;
}

const Settings: React.FC<SettingsProps> = ({ searchQuery = '' }) => {
  const [activeTab, setActiveTab] = useState('profile');

  const [profileData, setProfileData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    profilePic: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const profilePicInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      const user = JSON.parse(userData);
      // Split name into first and last for the form
      const nameParts = (user.name || '').split(' ');
      setProfileData({
        firstName: nameParts[0] || '',
        lastName: nameParts.slice(1).join(' ') || '',
        email: user.email || '',
        profilePic: user.profilePicture || '',
      });
      if (user.notificationPreferences) {
        setNotificationPrefs(user.notificationPreferences);
      }
    }

    // Fetch company data
    const fetchCompanyData = async () => {
      try {
        const response = await api.get('/company');
        if (response.data && response.data.name) {
          setCompanyData(response.data);
        }
      } catch (error) {
        console.error('Failed to fetch company data', error);
      }
    };
    fetchCompanyData();
  }, []);

  // Company state
  const [companyData, setCompanyData] = useState({
    logo: '',
    name: '',
    website: '',
    description: '',
    headquarters: '',
    size: '1-50 employees',
  });
  const [isSavingCompany, setIsSavingCompany] = useState(false);
  const companyLogoInputRef = useRef<HTMLInputElement>(null);

  // Notifications state
  const [notificationPrefs, setNotificationPrefs] = useState({
    newApplications: true,
    interviewReminders: true,
    weeklyReports: true,
    teamMentions: true,
  });
  const [isSavingNotifications, setIsSavingNotifications] = useState(false);

  // Integrations state
  const [integrations, setIntegrations] = useState({
    linkedin: false,
    slack: true,
    gmail: false,
  });

  const tabs = [
    { id: 'profile', label: 'My Profile', icon: User },
    { id: 'company', label: 'Company', icon: Building },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'integrations', label: 'Integrations', icon: Shield },
  ];

  const highlightText = (text: string) => {
    if (!searchQuery) return text;
    const parts = text.split(new RegExp(`(${searchQuery})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === searchQuery.toLowerCase() ? (
        <mark key={i} className="bg-yellow-200 px-1 rounded">{part}</mark>
      ) : part
    );
  };

  const filteredTabs = tabs.filter(tab => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return tab.label.toLowerCase().includes(query) || tab.id.toLowerCase().includes(query);
  });

  // Show search results message if searching
  const showSearchResults = searchQuery && (
    <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
      <p className="text-sm text-yellow-800">
        Searching for: <strong>{searchQuery}</strong>
      </p>
      <p className="text-xs text-yellow-600 mt-1">
        {filteredTabs.length > 0
          ? `Found ${filteredTabs.length} matching section(s)`
          : 'No matching sections found'}
      </p>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Settings</h2>
        <p className="text-sm text-gray-500">Manage your account settings and preferences.</p>
      </div>

      {showSearchResults}

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar Tabs */}
        <aside className="lg:w-64 flex-shrink-0">
          <nav className="space-y-1">
            {filteredTabs.length === 0 && searchQuery ? (
              <div className="text-center text-gray-500 text-sm py-4">No matching sections</div>
            ) : (
              filteredTabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${isActive
                      ? 'bg-indigo-50 text-indigo-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                  >
                    <tab.icon className={`w-5 h-5 ${isActive ? 'text-indigo-600' : 'text-gray-400'}`} />
                    {highlightText(tab.label)}
                  </button>
                );
              }))}
          </nav>
        </aside>

        {/* Content Area */}
        <div className="flex-1">
          {/* PROFILE TAB */}
          {activeTab === 'profile' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Personal Information</h3>
                <p className="text-sm text-gray-500">Update your photo and personal details.</p>
              </div>

              <div className="flex items-center gap-6 pb-6 border-b border-gray-200">
                {profileData.profilePic ? (
                  <img className="h-20 w-20 rounded-full object-cover border-2 border-indigo-100 shadow-sm" src={profileData.profilePic} alt="Profile" />
                ) : (
                  <div className="h-20 w-20 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white text-2xl font-bold shadow-lg border-2 border-white ring-2 ring-indigo-50">
                    {profileData.email ? profileData.email.charAt(0).toUpperCase() : 'U'}
                  </div>
                )}
                <div className="flex gap-3">
                  <button
                    onClick={() => profilePicInputRef.current?.click()}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Change
                  </button>
                  <button
                    onClick={async () => {
                      if (!profileData.email) return;
                      if (confirm('Are you sure you want to remove your profile picture?')) {
                        setIsSaving(true);
                        try {
                          const response = await api.delete(`/users/profile-picture?email=${profileData.email}`);
                          if (response.status === 200) {
                            setProfileData(prev => ({ ...prev, profilePic: '' }));

                            // Update local storage to sync header
                            const userData = localStorage.getItem('user');
                            if (userData) {
                              const user = JSON.parse(userData);
                              const updatedUser = { ...user, profilePicture: null };
                              localStorage.setItem('user', JSON.stringify(updatedUser));
                              window.dispatchEvent(new Event('storage'));
                            }
                            alert('Profile picture removed!');
                          }
                        } catch (error) {
                          console.error('Failed to remove profile picture', error);
                          alert('Failed to remove profile picture.');
                        } finally {
                          setIsSaving(false);
                        }
                      }
                    }}
                    className="px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
                    disabled={isSaving || !profileData.profilePic}
                  >
                    Remove
                  </button>
                </div>
                <input
                  ref={profilePicInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file || !profileData.email) return;

                    if (file.size > 2 * 1024 * 1024) {
                      alert('File size too large. Please select an image under 2MB.');
                      return;
                    }

                    setIsSaving(true);
                    const formData = new FormData();
                    formData.append('file', file);
                    formData.append('email', profileData.email);

                    try {
                      const response = await api.put('/users/profile-picture', formData, {
                        headers: { 'Content-Type': 'multipart/form-data' }
                      });

                      if (response.data) {
                        setProfileData(prev => ({ ...prev, profilePic: response.data.profilePicture }));

                        // Update local storage
                        const userData = localStorage.getItem('user');
                        if (userData) {
                          const user = JSON.parse(userData);
                          const updatedUser = { ...user, profilePicture: response.data.profilePicture };
                          localStorage.setItem('user', JSON.stringify(updatedUser));
                          window.dispatchEvent(new Event('storage'));
                        }
                        alert('Profile picture updated!');
                      }
                    } catch (error) {
                      console.error('Failed to upload picture', error);
                      alert('Failed to update profile picture.');
                    } finally {
                      setIsSaving(false);
                    }
                  }}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700">First Name</label>
                  <input
                    type="text"
                    value={profileData.firstName}
                    onChange={(e) => setProfileData(prev => ({ ...prev, firstName: e.target.value }))}
                    className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Last Name</label>
                  <input
                    type="text"
                    value={profileData.lastName}
                    onChange={(e) => setProfileData(prev => ({ ...prev, lastName: e.target.value }))}
                    className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Email Address</label>
                  <input
                    type="email"
                    value={profileData.email}
                    onChange={(e) => setProfileData(prev => ({ ...prev, email: e.target.value }))}
                    className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                  />
                </div>
              </div>
              <div className="flex justify-end pt-4">
                <button
                  disabled={isSaving}
                  onClick={async () => {
                    setIsSaving(true);
                    try {
                      const fullName = `${profileData.firstName} ${profileData.lastName}`.trim();
                      const response = await api.put('/users/profile', {
                        email: profileData.email,
                        name: fullName
                      });

                      if (response.data) {
                        // Update local storage
                        const userData = localStorage.getItem('user');
                        if (userData) {
                          const user = JSON.parse(userData);
                          const updatedUser = { ...user, name: response.data.name };
                          localStorage.setItem('user', JSON.stringify(updatedUser));
                          // Update state to trigger UI changes elsewhere (like Layout)
                          window.dispatchEvent(new Event('storage'));
                        }
                        alert('Profile saved successfully!');
                      }
                    } catch (error) {
                      console.error('Save profile error:', error);
                      alert('Failed to save profile changes.');
                    } finally {
                      setIsSaving(false);
                    }
                  }}
                  className={`flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 ${isSaving ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                  {isSaving ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : <Save className="w-4 h-4" />}
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          )}

          {/* NOTIFICATIONS TAB */}
          {activeTab === 'notifications' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-6">Notification Preferences</h3>
              <div className="space-y-4">
                <div className="flex items-start justify-between py-4 border-b border-gray-100">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">New Candidate Applications</h4>
                    <p className="text-sm text-gray-500">Get notified when a candidate applies to your job.</p>
                  </div>
                  <div className="flex items-center h-5">
                    <input
                      type="checkbox"
                      checked={notificationPrefs.newApplications}
                      onChange={(e) => setNotificationPrefs(prev => ({ ...prev, newApplications: e.target.checked }))}
                      className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300 rounded"
                    />
                  </div>
                </div>
                <div className="flex items-start justify-between py-4 border-b border-gray-100">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">Interview Reminders</h4>
                    <p className="text-sm text-gray-500">Receive reminders 1 hour before scheduled interviews.</p>
                  </div>
                  <div className="flex items-center h-5">
                    <input
                      type="checkbox"
                      checked={notificationPrefs.interviewReminders}
                      onChange={(e) => setNotificationPrefs(prev => ({ ...prev, interviewReminders: e.target.checked }))}
                      className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300 rounded"
                    />
                  </div>
                </div>
                <div className="flex items-start justify-between py-4 border-b border-gray-100">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">Weekly Reports</h4>
                    <p className="text-sm text-gray-500">Summary of recruitment activity every Monday.</p>
                  </div>
                  <div className="flex items-center h-5">
                    <input
                      type="checkbox"
                      checked={notificationPrefs.weeklyReports}
                      onChange={(e) => setNotificationPrefs(prev => ({ ...prev, weeklyReports: e.target.checked }))}
                      className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300 rounded"
                    />
                  </div>
                </div>
                <div className="flex items-start justify-between py-4 border-b border-gray-100 last:border-0">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">Team Mentions</h4>
                    <p className="text-sm text-gray-500">Notify when team members mention you in notes.</p>
                  </div>
                  <div className="flex items-center h-5">
                    <input
                      type="checkbox"
                      checked={notificationPrefs.teamMentions}
                      onChange={(e) => setNotificationPrefs(prev => ({ ...prev, teamMentions: e.target.checked }))}
                      className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300 rounded"
                    />
                  </div>
                </div>
              </div>
              <div className="mt-6 flex justify-end">
                <button
                  disabled={isSavingNotifications}
                  onClick={async () => {
                    if (!profileData.email) return;
                    setIsSavingNotifications(true);
                    try {
                      const response = await api.put(`/users/notification-preferences?email=${profileData.email}`, notificationPrefs);
                      if (response.data) {
                        // Update local storage
                        const userData = localStorage.getItem('user');
                        if (userData) {
                          const user = JSON.parse(userData);
                          const updatedUser = { ...user, notificationPreferences: response.data.notificationPreferences };
                          localStorage.setItem('user', JSON.stringify(updatedUser));
                          window.dispatchEvent(new Event('storage'));
                        }
                        alert('Notification preferences saved successfully!');
                      }
                    } catch (error) {
                      console.error('Failed to save notification preferences', error);
                      alert('Failed to save notification preferences.');
                    } finally {
                      setIsSavingNotifications(false);
                    }
                  }}
                  className={`flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 ${isSavingNotifications ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                  {isSavingNotifications ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : <Save className="w-4 h-4" />}
                  {isSavingNotifications ? 'Saving...' : 'Save Preferences'}
                </button>
              </div>
            </div>
          )}

          {/* INTEGRATIONS TAB */}
          {activeTab === 'integrations' && (
            <div className="space-y-4">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-50 rounded-lg text-blue-600">
                    <Linkedin className="w-8 h-8" />
                  </div>
                  <div>
                    <h4 className="text-lg font-medium text-gray-900">LinkedIn Recruiter</h4>
                    <p className="text-sm text-gray-500">Sync candidates and messages directly.</p>
                  </div>
                </div>
                {integrations.linkedin ? (
                  <button
                    onClick={() => {
                      if (confirm('Are you sure you want to disconnect LinkedIn Recruiter?')) {
                        setIntegrations(prev => ({ ...prev, linkedin: false }));
                        alert('LinkedIn Recruiter disconnected successfully.');
                      }
                    }}
                    className="px-4 py-2 bg-green-50 text-green-700 border border-green-200 rounded-lg text-sm font-medium flex items-center gap-2"
                  >
                    <Check className="w-4 h-4" /> Connected <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      // In a real app, this would open LinkedIn OAuth flow
                      alert('Redirecting to LinkedIn for authentication...\n\nIn a real application, this would open LinkedIn OAuth.');
                      setIntegrations(prev => ({ ...prev, linkedin: true }));
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Connect
                  </button>
                )}
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-purple-50 rounded-lg text-purple-600">
                    <Slack className="w-8 h-8" />
                  </div>
                  <div>
                    <h4 className="text-lg font-medium text-gray-900">Slack</h4>
                    <p className="text-sm text-gray-500">Receive notifications in your team channel.</p>
                  </div>
                </div>
                {integrations.slack ? (
                  <button
                    onClick={() => {
                      if (confirm('Are you sure you want to disconnect Slack?')) {
                        setIntegrations(prev => ({ ...prev, slack: false }));
                        alert('Slack disconnected successfully.');
                      }
                    }}
                    className="px-4 py-2 bg-green-50 text-green-700 border border-green-200 rounded-lg text-sm font-medium flex items-center gap-2"
                  >
                    <Check className="w-4 h-4" /> Connected <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      // In a real app, this would open Slack OAuth flow
                      alert('Redirecting to Slack for authentication...\n\nIn a real application, this would open Slack OAuth.');
                      setIntegrations(prev => ({ ...prev, slack: true }));
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Connect
                  </button>
                )}
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-red-50 rounded-lg text-red-600">
                    <Mail className="w-8 h-8" />
                  </div>
                  <div>
                    <h4 className="text-lg font-medium text-gray-900">Gmail</h4>
                    <p className="text-sm text-gray-500">Sync emails and calendar invites.</p>
                  </div>
                </div>
                {integrations.gmail ? (
                  <button
                    onClick={() => {
                      if (confirm('Are you sure you want to disconnect Gmail?')) {
                        setIntegrations(prev => ({ ...prev, gmail: false }));
                        alert('Gmail disconnected successfully.');
                      }
                    }}
                    className="px-4 py-2 bg-green-50 text-green-700 border border-green-200 rounded-lg text-sm font-medium flex items-center gap-2"
                  >
                    <Check className="w-4 h-4" /> Connected <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      // In a real app, this would open Gmail OAuth flow
                      alert('Redirecting to Gmail for authentication...\n\nIn a real application, this would open Gmail OAuth.');
                      setIntegrations(prev => ({ ...prev, gmail: true }));
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Connect
                  </button>
                )}
              </div>
            </div>
          )}

          {/* COMPANY TAB */}
          {activeTab === 'company' && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Company Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700">Company Logo</label>
                    <div className="mt-2 flex items-center gap-4">
                      {companyData.logo ? (
                        <img src={companyData.logo} alt="Company Logo" className="h-16 w-16 rounded-lg object-contain bg-white p-1 border border-gray-200" />
                      ) : (
                        <div className="h-16 w-16 rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center text-gray-400">
                          <Building className="w-8 h-8" />
                        </div>
                      )}
                      <button
                        onClick={() => companyLogoInputRef.current?.click()}
                        className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                      >
                        <Upload className="w-4 h-4" /> Upload New
                      </button>
                      <input
                        ref={companyLogoInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            if (file.size > 5 * 1024 * 1024) {
                              alert('File size must be less than 5MB');
                              return;
                            }
                            if (!file.type.startsWith('image/')) {
                              alert('Please select an image file');
                              return;
                            }
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              setCompanyData(prev => ({ ...prev, logo: reader.result as string }));
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                      <span className="text-xs text-gray-400">Recommended size: 256x256px (PNG, JPG)</span>
                    </div>
                  </div>
                  <div className="col-span-1">
                    <label className="block text-sm font-medium text-gray-700">Company Name</label>
                    <input
                      type="text"
                      value={companyData.name}
                      onChange={(e) => setCompanyData(prev => ({ ...prev, name: e.target.value }))}
                      className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                    />
                  </div>
                  <div className="col-span-1">
                    <label className="block text-sm font-medium text-gray-700">Website</label>
                    <input
                      type="text"
                      value={companyData.website}
                      onChange={(e) => setCompanyData(prev => ({ ...prev, website: e.target.value }))}
                      className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700">Description</label>
                    <textarea
                      rows={3}
                      value={companyData.description}
                      onChange={(e) => setCompanyData(prev => ({ ...prev, description: e.target.value }))}
                      className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                    />
                  </div>
                  <div className="col-span-1">
                    <label className="block text-sm font-medium text-gray-700">Headquarters</label>
                    <input
                      type="text"
                      value={companyData.headquarters}
                      onChange={(e) => setCompanyData(prev => ({ ...prev, headquarters: e.target.value }))}
                      className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                    />
                  </div>
                  <div className="col-span-1">
                    <label className="block text-sm font-medium text-gray-700">Company Size</label>
                    <select
                      value={companyData.size}
                      onChange={(e) => setCompanyData(prev => ({ ...prev, size: e.target.value }))}
                      className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                    >
                      <option>1-50 employees</option>
                      <option>51-200 employees</option>
                      <option>201-500 employees</option>
                      <option>500+ employees</option>
                    </select>
                  </div>
                </div>
                <div className="mt-6 flex justify-end">
                  <button
                    disabled={isSavingCompany}
                    onClick={async () => {
                      setIsSavingCompany(true);
                      try {
                        const response = await api.put('/company', companyData);
                        if (response.data) {
                          setCompanyData(response.data);
                          alert('Company details saved successfully!');
                        }
                      } catch (error) {
                        console.error('Failed to save company data', error);
                        alert('Failed to save company details.');
                      } finally {
                        setIsSavingCompany(false);
                      }
                    }}
                    className={`flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 ${isSavingCompany ? 'opacity-70 cursor-not-allowed' : ''}`}
                  >
                    {isSavingCompany ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : <Save className="w-4 h-4" />}
                    {isSavingCompany ? 'Saving...' : 'Save Details'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;