import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Candidate } from '../types';
import {
  Mail,
  Phone,
  Download,
  Search,
  CheckCircle2,
  Clock,
  User,
  Briefcase,
  X,
  Target,
  Plus,
  Trash2,
  Filter,
  Eye,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal
} from 'lucide-react';
import api from '../api';
import CandidateDetailsModal from '../components/CandidateDetailsModal';

interface CandidatesProps {
  searchQuery?: string;
}

const Candidates: React.FC<CandidatesProps> = ({ searchQuery = '' }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const highlightId = location.state?.highlightId;
  const itemsPerPage = 5;

  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [filteredCandidates, setFilteredCandidates] = useState<Candidate[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedCandidateForDetails, setSelectedCandidateForDetails] = useState<Candidate | null>(null);

  // Auto-scroll and Pagination Logic
  useEffect(() => {
    if (highlightId && filteredCandidates.length > 0) {
      const index = filteredCandidates.findIndex(c => c.id === highlightId);
      if (index !== -1) {
        const targetPage = Math.ceil((index + 1) / itemsPerPage);
        if (currentPage !== targetPage) {
          setCurrentPage(targetPage);
        }
        // Scroll with delay to ensure render
        setTimeout(() => {
          const element = document.getElementById(`candidate-${highlightId}`);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 500);
      }
    }
  }, [highlightId, filteredCandidates, itemsPerPage]); // currentPage removed to avoid loop, we just set it once.

  // Clear highlight state after 10 seconds
  useEffect(() => {
    if (highlightId) {
      const timer = setTimeout(() => {
        navigate(location.pathname, { replace: true, state: {} });
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [highlightId, navigate, location.pathname]);

  const [jobs, setJobs] = useState<any[]>([]);
  const [isCandidateModalOpen, setIsCandidateModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [loadingJobs, setLoadingJobs] = useState(false);

  // Filter states
  const [localSearch, setLocalSearch] = useState('');
  const [selectedSkill, setSelectedSkill] = useState('All Skills');
  const [selectedJob, setSelectedJob] = useState('All Jobs');
  const [sortBy, setSortBy] = useState('Sort by Fit Score');

  const [expandedSkillsCandidate, setExpandedSkillsCandidate] = useState<string | null>(null);
  const popupRef = React.useRef<HTMLDivElement>(null);

  // Close popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        setExpandedSkillsCandidate(null);
      }
    };
    if (expandedSkillsCandidate) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [expandedSkillsCandidate]);

  const [formData, setFormData] = useState<Partial<Candidate>>({
    name: '',
    email: '',
    role: '',
    experience: 0,
    skills: [],
    status: 'New'
  });

  /* ===================== FETCH ===================== */
  useEffect(() => {
    fetchCandidates();
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      setLoadingJobs(true);
      const response = await api.get('/jobs?size=100');
      setJobs(response.data.content || []);
    } catch (error) {
      console.error('Failed to fetch jobs:', error);
    } finally {
      setLoadingJobs(false);
    }
  };

  const fetchCandidates = async () => {
    try {
      const response = await api.get('/candidates?size=100');
      const data = response.data.content.map((c: any) => ({
        ...c,
        appliedDate: c.createdAt
          ? c.createdAt.split('T')[0]
          : new Date().toISOString().split('T')[0],
      }));
      setCandidates(data);
      setFilteredCandidates(data);
    } catch (error) {
      console.error('Failed to fetch candidates:', error);
    }
  };

  /* ===================== HELPERS ===================== */
  const highlightText = (text: string) => {
    if (!searchQuery) return text;
    const parts = text.split(new RegExp(`(${searchQuery})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === searchQuery.toLowerCase() ? (
        <mark key={i} className="bg-yellow-100 text-yellow-800 px-1 rounded">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  const getFitScoreColor = (score: number) => {
    // User Rule:
    // 0-39% = RED
    // 40-69% = ORANGE
    // 70-100% = GREEN
    if (score < 40) return 'bg-red-500';
    if (score < 70) return 'bg-orange-500';
    return 'bg-green-500';
  };

  /* ===================== FILTERING ===================== */
  useEffect(() => {
    let filtered = [...candidates];

    // 1. Search (Global or Local)
    const q = (localSearch || searchQuery).toLowerCase();
    if (q) {
      filtered = filtered.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.role.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          (c.skills || []).some((s) => s.toLowerCase().includes(q)) ||
          c.status.toLowerCase().includes(q)
      );
    }

    // 2. Skill Filter
    if (selectedSkill !== 'All Skills') {
      filtered = filtered.filter(c =>
        (c.skills || []).some(s => s === selectedSkill)
      );
    }

    // 3. Job Filter
    if (selectedJob !== 'All Jobs') {
      filtered = filtered.filter(c => c.role === selectedJob);
    }

    // 4. Sorting
    if (sortBy === 'Highest First') {
      filtered.sort((a, b) => (b.fitScore || 0) - (a.fitScore || 0));
    } else if (sortBy === 'Lowest First') {
      filtered.sort((a, b) => (a.fitScore || 0) - (b.fitScore || 0));
    }

    setFilteredCandidates(filtered);
    setCurrentPage(1); // Reset to page 1 on filter change
  }, [searchQuery, localSearch, selectedSkill, selectedJob, sortBy, candidates]);

  const totalPages = Math.ceil(filteredCandidates.length / itemsPerPage);
  const paginatedCandidates = filteredCandidates.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleDownloadResume = async (resumeId: string, candidateName: string) => {
    if (!resumeId) {
      alert("No resume available for this candidate");
      return;
    }
    try {
      const response = await api.get(`/resumes/${resumeId}`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${candidateName}_Resume.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error("Failed to download resume:", error);
      alert("Failed to download resume");
    }
  };

  const handleExportCSV = () => {
    const csv = [
      ['Name', 'Email', 'Phone', 'Role', 'Experience', 'Fit Score', 'Source'],
      ...filteredCandidates.map((c) => [
        c.name,
        c.email,
        c.phone || 'N/A',
        c.role,
        c.experience,
        c.fitScore,
        c.source || 'N/A'
      ]),
    ]
      .map((r) => r.map((v) => `"${v}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'candidates.csv';
    link.click();
  };

  /* ===================== STATUS UPDATE ===================== */
  const handleStatusUpdate = async (id: string, newStatus: string) => {
    // Optimistic Update
    setCandidates(prev => prev.map(c => c.id === id ? { ...c, status: newStatus as any } : c));
    setFilteredCandidates(prev => prev.map(c => c.id === id ? { ...c, status: newStatus as any } : c));

    // Update selected candidate if modal is open
    if (selectedCandidateForDetails && selectedCandidateForDetails.id === id) {
      setSelectedCandidateForDetails(prev => prev ? { ...prev, status: newStatus as any } : null);
    }

    try {
      await api.patch(`/candidates/${id}/status`, null, { params: { status: newStatus } });
    } catch (error) {
      console.error("Failed to update status", error);
      fetchCandidates();
    }
  };

  const handleAssignJob = async (id: string, jobId: string) => {
    const job = jobs.find(j => j.id === jobId);
    if (!job) return;

    // Optimistic Update
    setCandidates(prev => prev.map(c => c.id === id ? { ...c, jobId, role: job.title } : c));
    setFilteredCandidates(prev => prev.map(c => c.id === id ? { ...c, jobId, role: job.title } : c));

    try {
      await api.patch(`/candidates/${id}/assign-job`, null, { params: { jobId, role: job.title } });
    } catch (error) {
      console.error("Failed to assign job", error);
      fetchCandidates();
    }
  };

  /* ===================== CRUD ACTIONS ===================== */
  const handleDeleteCandidate = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete ${name}?`)) return;

    // Optimistic Update: Remove immediately from UI
    const previousCandidates = [...candidates];
    setCandidates(prev => prev.filter(c => c.id !== id));
    setFilteredCandidates(prev => prev.filter(c => c.id !== id));

    try {
      await api.delete(`/candidates/${id}`);
      // Success - no further action needed
    } catch (error: any) {
      console.error("Failed to delete candidate:", error);
      alert(`Failed to delete candidate: ${error?.response?.data?.error || 'Unknown error'}`);
      // Revert on failure
      setCandidates(previousCandidates);
      setFilteredCandidates(previousCandidates);
    }
  };

  const handleSaveCandidate = async () => {
    try {
      if (modalMode === 'add') {
        const res = await api.post('/candidates', formData);
        // Add new to top of list
        setCandidates(prev => [res.data, ...prev]);
        if (selectedJob === 'All Jobs' || res.data.role === selectedJob) {
          setFilteredCandidates(prev => [res.data, ...prev]);
        }
      } else if (selectedCandidate) {
        // Optimistic Edit
        setCandidates(prev => prev.map(c => c.id === selectedCandidate.id ? { ...c, ...formData } : c));
        setFilteredCandidates(prev => prev.map(c => c.id === selectedCandidate.id ? { ...c, ...formData } : c));

        await api.put(`/candidates/${selectedCandidate.id}`, formData);
      }
      setIsCandidateModalOpen(false);
      // Optional: Background re-fetch to ensure consistency
      fetchCandidates();
    } catch (error: any) {
      console.error("Save failed:", error);
      alert(`Failed to save candidate: ${error?.response?.data?.error || 'Unknown error'}`);
      // On error, we rely on the fetchCandidates from the background re-sync or page reload to fix state, 
      // or we could store previous state to revert more gracefully.
      fetchCandidates();
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden p-6 space-y-6">
      {/* Header & Stats */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Candidate Database</h2>
          <p className="text-sm text-gray-500 mt-1 flex items-center gap-2">
            <User className="w-4 h-4 text-indigo-500" />
            Total {filteredCandidates.length} professional profiles
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 font-bold transition shadow-sm"
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>
          <button
            onClick={() => {
              setModalMode('add');
              setFormData({ name: '', email: '', role: '', experience: 0, skills: [], status: 'New' });
              setIsCandidateModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-bold transition shadow-lg shadow-indigo-100"
          >
            <Plus className="w-4 h-4" /> Add Candidate
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col lg:flex-row gap-4 p-4 bg-gray-50/50 rounded-2xl border border-gray-100 items-end lg:items-center">
        <div className="flex-1 w-full relative group">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-indigo-600 transition-colors" />
          <input
            type="text"
            placeholder="Search by name, role, email, or skills..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          <div className="relative flex-1 lg:flex-none">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <select
              className="pl-8 pr-8 py-2.5 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm font-semibold text-gray-700 appearance-none min-w-[140px] shadow-sm cursor-pointer"
              value={selectedSkill}
              onChange={(e) => setSelectedSkill(e.target.value)}
            >
              <option>All Skills</option>
              {Array.from(new Set(candidates.flatMap(c => c.skills || []))).map(skill => (
                <option key={skill} value={skill}>{skill}</option>
              ))}
            </select>
          </div>

          <div className="relative flex-1 lg:flex-none">
            <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <select
              className="pl-8 pr-8 py-2.5 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm font-semibold text-gray-700 appearance-none min-w-[140px] shadow-sm cursor-pointer"
              value={selectedJob}
              onChange={(e) => setSelectedJob(e.target.value)}
            >
              <option>All Jobs</option>
              {jobs.map(job => (
                <option key={job.id} value={job.title}>{job.title}</option>
              ))}
            </select>
          </div>

          <div className="relative flex-1 lg:flex-none">
            <Target className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <select
              className="pl-8 pr-8 py-2.5 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm font-semibold text-gray-700 appearance-none min-w-[160px] shadow-sm cursor-pointer"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option>Sort by Fit Score</option>
              <option value="Highest First">Highest First</option>
              <option value="Lowest First">Lowest First</option>
            </select>
          </div>
        </div>
      </div>

      {/* Candidates Table */}
      <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
        <table className="w-full min-w-[1000px] border-collapse">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Candidate Name</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Phone</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Experience</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Skills</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Job Role</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Fit Score</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Source</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Assign Job</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {paginatedCandidates.map((candidate) => (
              <tr
                key={candidate.id}
                id={`candidate-${candidate.id}`}
                className={`group hover:bg-gray-50/50 transition-colors ${highlightId === candidate.id ? 'bg-blue-50 ring-2 ring-blue-500 ring-inset' : ''}`}
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs shadow-sm">
                      {candidate.name.charAt(0)}
                    </div>
                    <div>
                      {/* CLICKABLE NAME FOR MODAL */}
                      <button
                        onClick={() => setSelectedCandidateForDetails(candidate)}
                        className="text-sm font-bold text-gray-900 hover:text-blue-600 hover:underline text-left"
                        title="View Details"
                      >
                        {highlightText(candidate.name)}
                      </button>
                      <div className="text-[11px] text-gray-500 flex items-center gap-1">
                        <Mail className="w-3 h-3 text-indigo-400" /> {highlightText(candidate.email)}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-1.5 text-sm text-gray-600 font-medium">
                    <Phone className="w-3.5 h-3.5 text-indigo-400" />
                    {candidate.phone && candidate.phone !== 'NOT_FOUND' ? candidate.phone : 'N/A'}
                  </div>
                </td>
                <td className="px-6 py-4 text-sm font-semibold text-gray-700">
                  {candidate.experience || 0} years
                </td>
                <td className="px-6 py-4 relative">
                  <div className="flex flex-wrap gap-1.5 max-w-[180px]">
                    {(candidate.skills || []).slice(0, 3).map((skill, idx) => (
                      <span key={idx} className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded text-[10px] font-bold border border-indigo-100/50">
                        {skill}
                      </span>
                    ))}
                    {(candidate.skills || []).length > 3 && (
                      <button
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          setExpandedSkillsCandidate(expandedSkillsCandidate === candidate.id ? null : candidate.id);
                        }}
                        className="px-2 py-0.5 bg-white text-indigo-600 rounded text-[10px] font-bold border border-indigo-200 hover:bg-indigo-50 transition shadow-sm"
                      >
                        +{(candidate.skills || []).length - 3} more
                      </button>
                    )}
                  </div>

                  {expandedSkillsCandidate === candidate.id && (
                    <div
                      ref={popupRef}
                      className="absolute z-[100] left-6 top-12 mt-2 w-72 bg-white rounded-xl shadow-2xl border border-gray-100 p-4 animate-in fade-in zoom-in duration-200"
                    >
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                          <Target className="w-3.5 h-3.5 text-indigo-600" />
                          Expertise & Skills
                        </h4>
                        <button
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            setExpandedSkillsCandidate(null);
                          }}
                          className="p-1 hover:bg-gray-100 rounded-lg transition-colors group/close"
                        >
                          <X className="w-4 h-4 text-gray-400 group-hover/close:text-gray-600" />
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {(candidate.skills || []).map((skill, idx) => (
                          <span key={idx} className="px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-[11px] font-semibold border border-indigo-100/50">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm font-medium text-gray-900 bg-gray-50 px-3 py-1 rounded-lg border border-gray-100 inline-block">
                    {highlightText(candidate.role)}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-2 bg-gray-100 rounded-full overflow-hidden shadow-inner">
                      <div
                        className={`h-full ${getFitScoreColor(candidate.fitScore)} transition-all duration-1000 ease-out`}
                        style={{ width: `${candidate.fitScore}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-extrabold text-gray-900">{candidate.fitScore}%</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                    {candidate.source || 'Local System'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <select
                    className="text-xs bg-white border border-gray-200 rounded-lg p-1 outline-none focus:ring-2 focus:ring-indigo-100 min-w-[120px]"
                    value={candidate.jobId || ''}
                    onChange={(e) => handleAssignJob(candidate.id, e.target.value)}
                  >
                    <option value="">Manual Assign</option>
                    {jobs.map(job => (
                      <option key={job.id} value={job.id}>{job.title}</option>
                    ))}
                  </select>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${candidate.status === 'Shortlisted' ? 'bg-green-100 text-green-700' :
                    candidate.status === 'Interview' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                    {candidate.status === 'Shortlisted' ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                    {candidate.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => handleDownloadResume(candidate.resumeId, candidate.name)}
                      className="p-1.5 text-gray-400 hover:text-blue-600 transition hover:bg-blue-50 rounded-lg"
                      title="Download Resume"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        setSelectedCandidate(candidate);
                        setModalMode('edit');
                        setFormData({ ...candidate });
                        setIsCandidateModalOpen(true);
                      }}
                      className="p-1.5 text-gray-400 hover:text-gray-600 transition hover:bg-gray-50 rounded-lg"
                      title="Edit"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteCandidate(candidate.id, candidate.name)}
                      className="p-1.5 text-gray-400 hover:text-red-600 transition hover:bg-red-50 rounded-lg"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      <div className="px-6 py-4 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between">
        <div className="text-sm text-gray-500 font-medium">
          Showing <span className="font-bold text-gray-900">{Math.min((currentPage - 1) * itemsPerPage + 1, filteredCandidates.length)}</span> to <span className="font-bold text-gray-900">{Math.min(currentPage * itemsPerPage, filteredCandidates.length)}</span> of <span className="font-bold text-gray-900">{filteredCandidates.length}</span> results
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="p-2 border border-gray-200 rounded-lg hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition shadow-sm"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => (
              <button
                key={pageNum}
                onClick={() => setCurrentPage(pageNum)}
                className={`w-8 h-8 rounded-lg text-xs font-bold transition ${currentPage === pageNum
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100'
                  : 'text-gray-500 hover:bg-white border border-transparent hover:border-gray-200'
                  }`}
              >
                {pageNum}
              </button>
            ))}
          </div>

          <button
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages || totalPages === 0}
            className="p-2 border border-gray-200 rounded-lg hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition shadow-sm"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Candidate Details Modal */}
      {selectedCandidateForDetails && (
        <CandidateDetailsModal
          candidate={selectedCandidateForDetails}
          onClose={() => setSelectedCandidateForDetails(null)}
          onStatusUpdate={handleStatusUpdate}
          onDownloadResume={handleDownloadResume}
        />
      )}

      {/* Candidate Add/Edit Modal (Existing) */}
      {isCandidateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">
                {modalMode === 'add' ? 'Add New Candidate' : 'Edit Candidate'}
              </h3>
              <button onClick={() => setIsCandidateModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Full Name</label>
                <input
                  type="text"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. John Doe"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Email Address</label>
                <input
                  type="email"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="john@example.com"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Role</label>
                  <input
                    type="text"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    placeholder="Software Engineer"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Experience (Years)</label>
                  <input
                    type="number"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    value={formData.experience}
                    onChange={(e) => setFormData({ ...formData, experience: Number(e.target.value) })}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Status</label>
                <select
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                >
                  <option value="New">New</option>
                  <option value="Shortlisted">Shortlisted</option>
                  <option value="Interview">Interview</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Interview Meeting Link</label>
                <input
                  type="text"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  value={formData.interviewMeetingLink || ''}
                  onChange={(e) => setFormData({ ...formData, interviewMeetingLink: e.target.value })}
                  placeholder="Zoom/Meet Link"
                />
              </div>
            </div>
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={() => setIsCandidateModalOpen(false)}
                className="px-4 py-2 text-sm font-bold text-gray-600 hover:text-gray-800 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveCandidate}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition"
              >
                {modalMode === 'add' ? 'Create Candidate' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Candidates;
