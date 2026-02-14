import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, Briefcase, FileText, CheckCircle, ArrowUpRight,
  Calendar, Clock, XCircle, RotateCcw, Plus, Search
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import api from '../api';

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b', '#ef4444']; // Indigo, Violet, Pink, Emerald, Amber, Red

interface DashboardStats {
  openJobs: number;
  totalCandidates: number;
  interviewsToday: number;
  shortlisted: number;
  pipeline: {
    screening: number;
    interview: number;
    offer: number;
    hired: number;
    rejected: number;
  };
  interviewOverview: {
    today: number;
    upcoming: number;
    completed: number;
    cancelled: number;
    rescheduled: number;
  };
}

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7days' | '30days'>('7days');

  const [stats, setStats] = useState<DashboardStats>({
    openJobs: 0,
    totalCandidates: 0,
    interviewsToday: 0,
    shortlisted: 0,
    pipeline: { screening: 0, interview: 0, offer: 0, hired: 0, rejected: 0 },
    interviewOverview: { today: 0, upcoming: 0, completed: 0, cancelled: 0, rescheduled: 0 }
  });

  const [chartData, setChartData] = useState<any[]>([]);
  const [pieData, setPieData] = useState<{ name: string; value: number }[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Parallel API calls
        const [jobStats, candidateStats, interviewStats, trends, distStats, recent] = await Promise.all([
          api.get('/jobs/statistics').catch(() => ({ data: { open: 0 } })),
          api.get('/candidates/statistics').catch(() => ({ data: {} })),
          api.get('/interviews/statistics').catch(() => ({ data: {} })),
          api.get(`/candidates/trends?days=${timeRange === '7days' ? 7 : 30}`).catch(() => ({ data: {} })),
          api.get('/jobs/distribution').catch(() => ({ data: {} })),
          api.get('/candidates?page=0&size=5&sort=updatedAt,desc').catch(() => ({ data: { content: [] } }))
        ]);

        // Process Stats
        setStats({
          openJobs: jobStats.data.open || 0,
          totalCandidates: candidateStats.data.total || 0,
          interviewsToday: interviewStats.data.today || 0, // Using interview stats instead of candidate resumes today
          shortlisted: candidateStats.data.shortlisted || 0,
          pipeline: {
            screening: candidateStats.data.screening || 0,
            interview: candidateStats.data.interview || 0,
            offer: candidateStats.data.offer || 0,
            hired: candidateStats.data.hired || 0,
            rejected: candidateStats.data.rejected || 0
          },
          interviewOverview: {
            today: interviewStats.data.today || 0,
            upcoming: interviewStats.data.upcoming || 0,
            completed: interviewStats.data.completed || 0,
            cancelled: interviewStats.data.cancelled || 0,
            rescheduled: interviewStats.data.rescheduled || 0
          }
        });

        // Process Trends
        const formattedTrends = Object.entries(trends.data || {}).map(([dateStr, count]) => ({
          name: new Date(dateStr).toLocaleDateString('en-US', { day: 'numeric', month: 'short' }),
          value: count,
          fullDate: dateStr
        })).sort((a: any, b: any) => new Date(a.fullDate).getTime() - new Date(b.fullDate).getTime());
        setChartData(formattedTrends);

        // Process Pie Chart
        const formattedPie = Object.entries(distStats.data || {}).map(([name, value]) => ({
          name, value: Number(value)
        })).sort((a, b) => b.value - a.value).slice(0, 5); // Top 5
        setPieData(formattedPie);

        // Process Recent Activity
        setRecentActivity(recent.data.content || []);

      } catch (error) {
        console.error("Dashboard fetch error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [timeRange]);

  const formatTimeAgo = (dateInput: string | number[]) => {
    if (!dateInput) return 'Just now';
    let date = Array.isArray(dateInput)
      ? new Date(dateInput[0], (dateInput[1] || 1) - 1, dateInput[2], dateInput[3] || 0, dateInput[4] || 0)
      : new Date(dateInput);

    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Welcome back, Manager</h1>
          <p className="text-gray-500 mt-1">Here's what's happening with your recruitment pipeline today.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => navigate('/jobs')}
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2"
          >
            Create Requisition
          </button>
          <button
            onClick={() => navigate('/resume-upload')}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 flex items-center gap-2 shadow-sm"
          >
            <ArrowUpRight className="w-4 h-4" /> Upload Resumes
          </button>
        </div>
      </div>

      {/* Top Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {[
          { label: 'Open Jobs', value: stats.openJobs, icon: Briefcase, color: 'text-blue-600', bg: 'bg-blue-100' },
          { label: 'Total Candidates', value: stats.totalCandidates, icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-100' },
          { label: 'Interviews Today', value: stats.interviewsToday, icon: Calendar, color: 'text-purple-600', bg: 'bg-purple-100' },
          { label: 'Shortlisted', value: stats.shortlisted, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-100' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md transition-shadow">
            <div className={`p-3 rounded-lg ${stat.bg}`}>
              <stat.icon className={`w-6 h-6 ${stat.color}`} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">{stat.label}</p>
              <h3 className="text-2xl font-bold text-gray-900">{stat.value}</h3>
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* Left Column (2/3) */}
        <div className="xl:col-span-2 space-y-6">

          {/* Pipeline Overview */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Candidate Pipeline Overview</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
              {[
                { label: 'Screening', value: stats.pipeline.screening, color: 'bg-yellow-100 text-yellow-700', dot: 'bg-yellow-500' },
                { label: 'Interview', value: stats.pipeline.interview, color: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500' },
                { label: 'Offer', value: stats.pipeline.offer, color: 'bg-purple-100 text-purple-700', dot: 'bg-purple-500' },
                { label: 'Hired', value: stats.pipeline.hired, color: 'bg-green-100 text-green-700', dot: 'bg-green-500' },
                { label: 'Rejected', value: stats.pipeline.rejected, color: 'bg-red-100 text-red-700', dot: 'bg-red-500' },
              ].map((stage, i) => (
                <div key={i} className={`p-4 rounded-lg flex flex-col items-center justify-center text-center ${stage.color} bg-opacity-50`}>
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`w-2 h-2 rounded-full ${stage.dot}`}></div>
                    <span className="text-sm font-semibold">{stage.label}</span>
                  </div>
                  <span className="text-2xl font-bold">{stage.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Candidate Trends Chart */}
            <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-gray-900">Candidate Trends</h3>
                <select
                  className="text-sm border-gray-200 rounded-lg text-gray-600 focus:ring-indigo-500 focus:border-indigo-500"
                  value={timeRange}
                  onChange={(e) => setTimeRange(e.target.value as any)}
                >
                  <option value="7days">Last 7 Days</option>
                  <option value="30days">Last 30 Days</option>
                </select>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorTrend" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Area type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorTrend)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Jobs by Department - Donut */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col items-center justify-center relative">
              <h3 className="text-lg font-bold text-gray-900 mb-2 w-full text-left">Jobs by Department</h3>
              <div className="h-48 w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {pieData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                {/* Center Text */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-3xl font-bold text-gray-900">{stats.openJobs}</span>
                  <span className="text-xs text-gray-500 font-medium uppercase">Jobs</span>
                </div>
              </div>
              <div className="w-full mt-4 space-y-2">
                {pieData.slice(0, 3).map((entry, index) => (
                  <div key={index} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                      <span className="text-gray-600 truncate max-w-[100px]">{entry.name}</span>
                    </div>
                    <span className="font-semibold text-gray-900">{entry.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (1/3) - Sidebar */}
        <div className="space-y-6">

          {/* Interviews Overview */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Interviews Overview</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <span className="text-sm font-medium text-gray-700">Upcoming Interviews</span>
                </div>
                <span className="text-lg font-bold text-gray-900">{stats.interviewOverview.upcoming}</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                    <CheckCircle className="w-5 h-5" />
                  </div>
                  <span className="text-sm font-medium text-gray-700">Completed This Week</span>
                </div>
                <span className="text-lg font-bold text-gray-900">{stats.interviewOverview.completed}</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-100 text-red-600 rounded-lg">
                    <XCircle className="w-5 h-5" />
                  </div>
                  <span className="text-sm font-medium text-gray-700">Cancelled</span>
                </div>
                <span className="text-lg font-bold text-gray-900">{stats.interviewOverview.cancelled}</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-100 text-amber-600 rounded-lg">
                    <RotateCcw className="w-5 h-5" />
                  </div>
                  <span className="text-sm font-medium text-gray-700">Rescheduled</span>
                </div>
                <span className="text-lg font-bold text-gray-900">{stats.interviewOverview.rescheduled}</span>
              </div>
            </div>
          </div>

          {/* Recent Candidate Activity */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-900">Recent Candidate Activity</h3>
              <button onClick={() => navigate('/candidates')} className="text-sm text-indigo-600 font-medium hover:text-indigo-700">View All</button>
            </div>
            <div className="space-y-4">
              {recentActivity.length === 0 ? (
                <p className="text-center text-gray-500 py-4">No recent activity</p>
              ) : (
                recentActivity.map((candidate, i) => (
                  <div key={i} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer" onClick={() => navigate('/candidates')}>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${i % 2 === 0 ? 'bg-indigo-100 text-indigo-700' : 'bg-purple-100 text-purple-700'
                      }`}>
                      {candidate.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-semibold text-gray-900 truncate">{candidate.name}</h4>
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <span>Status: {candidate.status}</span>
                        <span>•</span>
                        <span className="truncate">Role: {candidate.role}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${candidate.fitScore >= 70 ? 'bg-green-100 text-green-700' :
                          candidate.fitScore >= 40 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                        }`}>
                        {candidate.fitScore || 0}% Fit
                      </span>
                      <p className="text-xs text-gray-400 mt-1">{formatTimeAgo(candidate.updatedAt || candidate.createdAt)}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Dashboard;
