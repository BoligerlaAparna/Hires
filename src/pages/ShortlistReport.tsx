import React, { useState } from 'react';
import { FileText, Download, Share2, Printer, CheckCircle, ExternalLink, Calendar, X, User, Briefcase, Clock, AlertCircle, Edit2 } from 'lucide-react';
import api from '../api';

interface ShortlistedCandidate {
  id: string;
  name: string;
  role: string;
  matchScore: number;
  experience: string;
  currentCompany: string;
  noticePeriod: string;
  notes: string;
  avatar: string;
  interviewStatus?: string;
  meetingLink?: string;
  interviewDate?: string;
  interviewTime?: string;
  interviewType?: string;
}

const mockShortlistData: Record<string, ShortlistedCandidate[]> = {};

interface ShortlistReportProps {
  searchQuery?: string;
}

const ShortlistReport: React.FC<ShortlistReportProps> = ({ searchQuery = '' }) => {
  const [shortlistData, setShortlistData] = useState<Record<string, ShortlistedCandidate[]>>(mockShortlistData);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'candidates' | 'positions' | 'days'>('all');
  const [showProfileModal, setShowProfileModal] = useState<{ candidate: ShortlistedCandidate | null }>({ candidate: null });
  const [recommendedFilter, setRecommendedFilter] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  React.useEffect(() => {
    const fetchCandidates = async () => {
      try {
        const response = await api.get('/candidates?size=100');
        const candidates = response.data.content;

        const groupedByRole: Record<string, ShortlistedCandidate[]> = {};

        candidates.forEach((c: any) => {
          const formatted: ShortlistedCandidate = {
            id: c.id,
            name: c.name,
            role: c.role || 'Unassigned',
            matchScore: c.fitScore || 0,
            experience: `${c.experience || 0} Years`,
            currentCompany: c.role || 'Not specified',
            noticePeriod: 'Not specified',
            notes: c.interviewNotes || 'No notes available.',
            avatar: c.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(c.name)}&background=random`,
            interviewStatus: (c.interviewDate || c.status === 'Interview') ? 'Scheduled' : undefined,
            meetingLink: c.interviewMeetingLink,
            interviewDate: c.interviewDate,
            interviewTime: c.interviewTime,
            interviewType: c.interviewType
          };

          if (!groupedByRole[formatted.role]) {
            groupedByRole[formatted.role] = [];
          }
          groupedByRole[formatted.role].push(formatted);
        });

        setShortlistData(groupedByRole);
      } catch (error) {
        console.error("Failed to fetch candidates for shortlist:", error);
      }
    };

    fetchCandidates();
  }, []);

  const highlightText = (text: string) => {
    if (!searchQuery) return text;
    const parts = text.split(new RegExp(`(${searchQuery})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === searchQuery.toLowerCase() ? (
        <mark key={i} className="bg-yellow-200 px-1 rounded">{part}</mark>
      ) : part
    );
  };

  const totalCandidates = Object.values(shortlistData).flat().length;
  const totalPositions = Object.keys(shortlistData).length;
  const avgNoticePeriod = Math.round(
    Object.values(shortlistData).flat().reduce((acc: number, c: ShortlistedCandidate) => {
      const days = parseInt(c.noticePeriod.replace(/\D/g, '')) || 0;
      return acc + days;
    }, 0) / (totalCandidates || 1)
  );

  const handleRemove = async (role: string, candidateId: string) => {
    if (confirm('Are you sure you want to remove this candidate from the database?')) {
      try {
        await api.delete(`/candidates/${candidateId}`);
        setShortlistData(prev => ({
          ...prev,
          [role]: prev[role].filter(c => c.id !== candidateId)
        }));
        alert('Candidate removed successfully.');
      } catch (error) {
        console.error("Failed to delete candidate:", error);
        alert("Failed to delete candidate.");
      }
    }
  };

  const [showInterviewModal, setShowInterviewModal] = useState<{ candidate: ShortlistedCandidate | null }>({ candidate: null });
  const [interviewData, setInterviewData] = useState({
    date: '',
    time: '',
    type: 'Video',
    notes: '',
    meetingLink: ''
  });

  const handleScheduleInterview = (candidate: ShortlistedCandidate) => {
    setShowInterviewModal({ candidate });
    setInterviewData({ date: '', time: '', type: 'Video', notes: '', meetingLink: '' });
  };

  const handleEditInterview = (candidate: ShortlistedCandidate) => {
    setShowInterviewModal({ candidate });
    setInterviewData({
      date: candidate.interviewDate || '',
      time: candidate.interviewTime ? candidate.interviewTime.substring(0, 5) : '', // Ensure HH:MM format
      type: candidate.interviewType || 'Video',
      notes: candidate.notes && candidate.notes !== 'No notes available.' ? candidate.notes : '',
      meetingLink: candidate.meetingLink || ''
    });
  };

  const submitInterview = async () => {
    if (!showInterviewModal.candidate || !interviewData.date || !interviewData.time) {
      setToast({ message: "Please select both date and time", type: 'error' });
      setTimeout(() => setToast(null), 3000);
      return;
    }
    try {
      // Backend expects yyyy-MM-dd'T'HH:mm:ss
      const startDateTime = `${interviewData.date}T${interviewData.time}:00`;

      const endDate = new Date(new Date(startDateTime).getTime() + 60 * 60 * 1000);
      // Constructing yyyy-MM-ddTHH:mm:ss manually to avoid timezone issues with toISOString
      const year = endDate.getFullYear();
      const month = String(endDate.getMonth() + 1).padStart(2, '0');
      const day = String(endDate.getDate()).padStart(2, '0');
      const hours = String(endDate.getHours()).padStart(2, '0');
      const minutes = String(endDate.getMinutes()).padStart(2, '0');
      const seconds = "00";

      const endDateTime = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;

      await api.post('/interviews', {
        candidateId: showInterviewModal.candidate.id,
        candidateName: showInterviewModal.candidate.name,
        startTime: startDateTime,
        endTime: endDateTime,
        type: interviewData.type,
        notes: interviewData.notes,
        meetingLink: interviewData.meetingLink,
        interviewer: 'Current User',
        status: 'Scheduled'
      });
      setToast({ message: "Interview Scheduled Successfully!", type: 'success' });
      setTimeout(() => setToast(null), 3000);

      // Refresh Data to get updated status from backend
      // We trigger the effect by forcing a re-fetch or manually updating state carefully
      // For now, simpler to optimistically update based on backend logic
      setShortlistData(prev => {
        const newData = { ...prev };
        for (const role in newData) {
          newData[role] = newData[role].map(c =>
            c.id === showInterviewModal.candidate?.id
              ? { ...c, interviewStatus: 'Scheduled', meetingLink: interviewData.meetingLink, notes: interviewData.notes }
              : c
          );
        }
        return newData;
      });

      setShowInterviewModal({ candidate: null });
    } catch (error) {
      console.error("Failed to schedule interview:", error);
      alert("Failed to schedule interview.");
    }
  };

  const handleViewFullProfile = (candidate: ShortlistedCandidate) => {
    setShowProfileModal({ candidate });
  };

  const handleViewAssessment = async (candidate: ShortlistedCandidate) => {
    try {
      const response = await api.get(`/skill-matrix/candidate/${candidate.id}`);
      const matrices = response.data || [];
      // Use the first matrix found or fallback
      const matrix = matrices[0] || null;
      setShowAssessmentModal({ candidate, matrix });
    } catch (error) {
      console.error("Failed to fetch assessment:", error);
      setShowAssessmentModal({ candidate, matrix: null });
    }
  };

  const [showAssessmentModal, setShowAssessmentModal] = useState<{ candidate: ShortlistedCandidate | null, matrix: any | null }>({ candidate: null, matrix: null });

  const handlePrint = () => {
    window.print();
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Shortlist Report',
          text: `Shortlist Report: ${totalCandidates} candidates across ${totalPositions} positions`,
          url: window.location.href
        });
      } catch (err) {
        console.log('Error sharing:', err);
      }
    } else {
      // Fallback: copy to clipboard
      const text = `Shortlist Report\n\nTotal Candidates: ${totalCandidates}\nPositions: ${totalPositions}\nAverage Notice Period: ${avgNoticePeriod} Days\n\n${window.location.href}`;
      navigator.clipboard.writeText(text).then(() => {
        alert('Report link copied to clipboard!');
      });
    }
  };

  const handleExportPDF = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      const content = document.querySelector('.space-y-6')?.innerHTML || '';
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Shortlist Report</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; }
              table { width: 100%; border-collapse: collapse; margin: 20px 0; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background-color: #f2f2f2; }
            </style>
          </head>
          <body>
            <h1>Shortlist Report</h1>
            <p>Generated on ${new Date().toLocaleDateString()}</p>
            ${content}
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const filteredData = (() => {
    let data = shortlistData;

    // Apply recommended filter
    if (recommendedFilter) {
      data = { [recommendedFilter]: data[recommendedFilter] || [] };
    }

    // Apply search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      data = Object.fromEntries(
        Object.entries(data).map(([role, candidates]) => [
          role,
          candidates.filter(c =>
            c.name.toLowerCase().includes(query) ||
            c.role.toLowerCase().includes(query) ||
            c.currentCompany.toLowerCase().includes(query) ||
            c.experience.toLowerCase().includes(query) ||
            c.notes.toLowerCase().includes(query)
          )
        ]).filter(([_, candidates]) => candidates.length > 0)
      );
    }

    // Apply selected filter
    if (selectedFilter === 'candidates') {
      data = Object.fromEntries(Object.entries(data).filter(([_, candidates]) => candidates.length > 0));
    }

    return data;
  })();

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Shortlist Report</h2>
          <p className="text-sm text-gray-500">Generated on November 14, 2025 • Q4 Hiring Cycle</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 bg-white border border-gray-300 px-4 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
          >
            <Printer className="w-4 h-4" /> Print
          </button>
          <button
            onClick={handleShare}
            className="flex items-center gap-2 bg-white border border-gray-300 px-4 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
          >
            <Share2 className="w-4 h-4" /> Share
          </button>
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-2 bg-indigo-600 px-4 py-2 rounded-lg text-sm font-medium text-white hover:bg-indigo-700 transition"
          >
            <Download className="w-4 h-4" /> Export PDF
          </button>
        </div>
      </div>

      {/* Executive Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <button
          onClick={() => setSelectedFilter(selectedFilter === 'candidates' ? 'all' : 'candidates')}
          className={`bg-white p-6 rounded-xl border shadow-sm transition-all hover:shadow-md ${selectedFilter === 'candidates' ? 'border-indigo-500 ring-2 ring-indigo-200' : 'border-gray-200'
            }`}
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-100 rounded-lg text-green-600">
              <User className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Total Shortlisted</p>
              <h3 className="text-2xl font-bold text-gray-900">{totalCandidates} Candidates</h3>
            </div>
          </div>
        </button>
        <button
          onClick={() => setSelectedFilter(selectedFilter === 'positions' ? 'all' : 'positions')}
          className={`bg-white p-6 rounded-xl border shadow-sm transition-all hover:shadow-md ${selectedFilter === 'positions' ? 'border-indigo-500 ring-2 ring-indigo-200' : 'border-gray-200'
            }`}
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 rounded-lg text-blue-600">
              <Briefcase className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Roles Covered</p>
              <h3 className="text-2xl font-bold text-gray-900">{totalPositions} Positions</h3>
            </div>
          </div>
        </button>
        <button
          onClick={() => setSelectedFilter(selectedFilter === 'days' ? 'all' : 'days')}
          className={`bg-white p-6 rounded-xl border shadow-sm transition-all hover:shadow-md ${selectedFilter === 'days' ? 'border-indigo-500 ring-2 ring-indigo-200' : 'border-gray-200'
            }`}
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-100 rounded-lg text-purple-600">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Avg. Notice Period</p>
              <h3 className="text-2xl font-bold text-gray-900">{avgNoticePeriod} Days</h3>
            </div>
          </div>
        </button>
      </div>

      {/* Detailed Reports by Role */}
      {Object.entries(filteredData).map(([role, candidates]) => (
        <div key={role} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <span className="w-2 h-6 bg-indigo-600 rounded-full"></span>
              {role}
            </h3>
            <button
              onClick={() => {
                setRecommendedFilter(recommendedFilter === role ? null : role);
                alert(`Showing ${candidates.length} recommended candidates for ${role} position.`);
              }}
              className={`text-xs font-medium px-2 py-1 rounded-full transition ${recommendedFilter === role
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                }`}
            >
              {candidates.length} Recommended
            </button>
          </div>

          <div className="divide-y divide-gray-200">
            {candidates.map((candidate) => (
              <div key={candidate.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex flex-col md:flex-row gap-6">
                  {/* Candidate Profile */}
                  <div className="flex-shrink-0 flex flex-col items-center text-center w-full md:w-48">
                    <img src={candidate.avatar} alt={candidate.name} className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-sm mb-3" />
                    <h4 className="font-bold text-gray-900">{highlightText(candidate.name)}</h4>
                    <p className="text-sm text-gray-500 mb-2">{highlightText(candidate.currentCompany)}</p>
                    <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${candidate.matchScore >= 75 ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'
                      }`}>
                      {candidate.matchScore}% Match
                    </div>
                  </div>

                  {/* Candidate Details */}
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8">
                    <div>
                      <h5 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Experience</h5>
                      <p className="text-sm font-medium text-gray-900">{candidate.experience}</p>
                    </div>
                    <div>
                      <h5 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Notice Period</h5>
                      <p className="text-sm font-medium text-gray-900">{candidate.noticePeriod}</p>
                    </div>
                    <div className="md:col-span-2">
                      <h5 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Recruiter Notes</h5>
                      <p className="text-sm text-gray-600 italic bg-gray-50 p-3 rounded-lg border border-gray-100">
                        {highlightText(`"${candidate.notes}"`)}
                      </p>
                    </div>

                    <div className="md:col-span-2 pt-2 flex items-center gap-3">
                      <button
                        onClick={() => handleViewFullProfile(candidate)}
                        className="text-sm font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                      >
                        View Full Profile <ExternalLink className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => handleViewAssessment(candidate)}
                        className="text-sm font-medium text-gray-500 hover:text-gray-700 flex items-center gap-1"
                      >
                        View Assessment
                      </button>
                      {candidate.meetingLink && (
                        <a
                          href={candidate.meetingLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium text-green-600 hover:text-green-800 flex items-center gap-1 bg-green-50 px-2 py-0.5 rounded border border-green-100"
                        >
                          Join Zoom Meeting <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Action */}
                  {candidate.interviewStatus === 'Scheduled' ? (
                    <div className="flex items-center gap-2">
                      <button
                        disabled
                        className="p-2 bg-green-50 text-green-600 rounded-lg border border-green-200 cursor-not-allowed flex items-center justify-center"
                        title="Interview Scheduled"
                      >
                        <CheckCircle className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleEditInterview(candidate)}
                        className="p-2 bg-blue-50 text-blue-600 rounded-lg border border-blue-200 hover:bg-blue-100 transition-colors flex items-center justify-center"
                        title="Reschedule Interview"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleScheduleInterview(candidate)}
                      className="p-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors flex items-center justify-center border border-indigo-200"
                      title="Schedule Interview"
                    >
                      <Calendar className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => handleRemove(role, candidate.id)}
                    className="p-2 bg-white border border-gray-200 text-gray-400 rounded-lg hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-colors"
                    title="Remove from Shortlist"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))
      }

      {/* View Full Profile Modal */}
      {
        showProfileModal.candidate && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900">Candidate Profile</h3>
                <button onClick={() => setShowProfileModal({ candidate: null })} className="text-gray-400 hover:text-gray-600">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="p-6">
                <div className="flex flex-col items-center mb-6">
                  <img src={showProfileModal.candidate.avatar} alt={showProfileModal.candidate.name} className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-lg mb-4" />
                  <h4 className="text-2xl font-bold text-gray-900">{showProfileModal.candidate.name}</h4>
                  <p className="text-gray-500">{showProfileModal.candidate.role}</p>
                  <div className={`mt-2 inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${showProfileModal.candidate.matchScore >= 75 ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'
                    }`}>
                    {showProfileModal.candidate.matchScore}% Match
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <p className="text-sm text-gray-500">Experience</p>
                    <p className="text-lg font-semibold text-gray-900">{showProfileModal.candidate.experience}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Current Company</p>
                    <p className="text-lg font-semibold text-gray-900">{showProfileModal.candidate.currentCompany}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Notice Period</p>
                    <p className="text-lg font-semibold text-gray-900">{showProfileModal.candidate.noticePeriod}</p>
                  </div>
                  {showProfileModal.candidate.meetingLink && (
                    <div className="col-span-2">
                      <p className="text-sm text-gray-500">Interview Meeting Link</p>
                      <a
                        href={showProfileModal.candidate.meetingLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-lg font-semibold text-indigo-600 hover:text-indigo-800 break-all"
                      >
                        {showProfileModal.candidate.meetingLink}
                      </a>
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-2">Recruiter Notes</p>
                  <p className="text-gray-700 bg-gray-50 p-4 rounded-lg border border-gray-100">{showProfileModal.candidate.notes}</p>
                </div>
              </div>
            </div>
          </div>
        )
      }

      {/* View Assessment Modal */}
      {
        showAssessmentModal.candidate && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900">Assessment Results</h3>
                <button onClick={() => setShowAssessmentModal({ candidate: null, matrix: null })} className="text-gray-400 hover:text-gray-600">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="p-6">
                <div className="mb-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">{showAssessmentModal.candidate.name}</h4>
                  <p className="text-gray-500">{showAssessmentModal.candidate.role}</p>
                </div>
                <div className="space-y-4">
                  {showAssessmentModal.matrix && showAssessmentModal.matrix.skillMetrics ? (
                    showAssessmentModal.matrix.skillMetrics.map((sm: any, idx: number) => (
                      <div key={idx}>
                        <div className="flex justify-between mb-2">
                          <span className="text-sm font-medium text-gray-700">{sm.skill}</span>
                          <span className={`text-sm font-bold ${sm.percentage >= 80 ? 'text-green-600' : sm.percentage >= 60 ? 'text-blue-600' : 'text-yellow-600'}`}>
                            {sm.percentage}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all duration-500 ${sm.percentage >= 80 ? 'bg-green-500' : sm.percentage >= 60 ? 'bg-blue-500' : 'bg-yellow-500'}`}
                            style={{ width: `${sm.percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-center py-8 text-gray-500 italic">No detailed skill metrics available for this candidate.</p>
                  )}

                  <div className="mt-6 p-4 bg-indigo-50 rounded-lg flex justify-between items-center">
                    <div>
                      <p className="text-sm text-indigo-900 font-medium">Overall Match Score</p>
                      <p className={`text-3xl font-bold ${showAssessmentModal.candidate.matchScore >= 75 ? 'text-green-600' : 'text-orange-500'}`}>
                        {showAssessmentModal.candidate.matchScore}%
                      </p>
                    </div>
                    {showAssessmentModal.matrix && (
                      <div className="text-right">
                        <p className="text-xs text-gray-500 uppercase font-bold mb-1">Recommended Role</p>
                        <p className="text-sm font-bold text-gray-900">{showAssessmentModal.matrix.jobTitle}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      }
      {/* Interview Modal */}
      {
        showInterviewModal.candidate && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
              <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                <h3 className="text-xl font-bold text-gray-900">Schedule Interview</h3>
                <button
                  onClick={() => setShowInterviewModal({ candidate: null })}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-3 p-3 bg-indigo-50 rounded-lg">
                  <img
                    src={showInterviewModal.candidate.avatar}
                    alt={showInterviewModal.candidate.name}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  <div>
                    <h4 className="font-semibold text-gray-900">{showInterviewModal.candidate.name}</h4>
                    <p className="text-sm text-indigo-600">{showInterviewModal.candidate.role}</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
                    <input
                      type="date"
                      value={interviewData.date}
                      onChange={(e) => setInterviewData({ ...interviewData, date: e.target.value })}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                    <input
                      type="time"
                      value={interviewData.time}
                      onChange={(e) => setInterviewData({ ...interviewData, time: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                    <select
                      value={interviewData.type}
                      onChange={(e) => setInterviewData({ ...interviewData, type: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="Video">Video Call</option>
                      <option value="Phone">Phone Call</option>
                      <option value="On-site">On-site</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Meeting Link</label>
                  <div className="relative">
                    <ExternalLink className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={interviewData.meetingLink}
                      onChange={(e) => setInterviewData({ ...interviewData, meetingLink: e.target.value })}
                      placeholder="Leave empty to auto-generate (Zoom)"
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <p className="mt-1 text-[10px] text-gray-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    If left empty, a Zoom link will be auto-created for Video calls.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea
                    value={interviewData.notes}
                    onChange={(e) => setInterviewData({ ...interviewData, notes: e.target.value })}
                    placeholder="Add interview context, agenda, or specific instructions..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 h-24"
                  ></textarea>
                </div>

                <button
                  onClick={submitInterview}
                  className="w-full py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
                >
                  Confirm Schedule
                </button>
              </div>
            </div>
          </div>
        )
      }
      {toast && (
        <div className={`fixed bottom-10 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-xl shadow-2xl z-[100] animate-in slide-in-from-bottom-5 duration-300 ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
          } text-white`}>
          <div className="flex items-center gap-3 font-bold">
            {toast.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            {toast.message}
          </div>
        </div>
      )}
    </div>
  );
};

export default ShortlistReport;