import React, { useState, useEffect } from 'react';
import { Candidate } from '../types';
import api from '../api';
import {
    X,
    Mail,
    Phone,
    MapPin,
    Calendar,
    Briefcase,
    CheckCircle2,
    Clock,
    XCircle,
    FileText,
    MessageSquare,
    Video,
    User,
    Download,
    ExternalLink,
    Plus,
    Loader2,
    Search,
    UserCheck
} from 'lucide-react';

interface CandidateDetailsModalProps {
    candidate: Candidate;
    onClose: () => void;
    onStatusUpdate?: (id: string, newStatus: string) => void;
    onDownloadResume?: (id: string, name: string) => void;
}

const CandidateDetailsModal: React.FC<CandidateDetailsModalProps> = ({
    candidate,
    onClose,
    onStatusUpdate,
    onDownloadResume
}) => {
    const [history, setHistory] = useState<Candidate[]>([]);
    const [interviews, setInterviews] = useState<any[]>([]);
    const [isScheduling, setIsScheduling] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Form state for scheduling
    const [scheduleForm, setScheduleForm] = useState({
        startTime: '',
        type: 'Technical Interview',
        interviewer: '',
        meetingLink: '',
        notes: ''
    });

    const fetchInterviews = async () => {
        if (candidate.id) {
            try {
                const interviewRes = await api.get(`/interviews/candidate/${candidate.id}`);
                setInterviews(interviewRes.data);
            } catch (error) {
                console.error("Failed to fetch interviews", error);
            }
        }
    };

    useEffect(() => {
        const fetchData = async () => {
            if (candidate.email) {
                try {
                    const historyRes = await api.get('/candidates/history', {
                        params: { email: candidate.email }
                    });
                    setHistory(historyRes.data);
                } catch (error) {
                    console.error("Failed to fetch candidate history", error);
                }
            }
            fetchInterviews();
        };
        fetchData();
    }, [candidate.email, candidate.id]);

    const handleScheduleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            // Ensure startTime has seconds
            let formattedStartTime = scheduleForm.startTime;
            if (formattedStartTime.length === 16) { // YYYY-MM-DDTHH:mm
                formattedStartTime += ':00';
            }

            // Calculate endTime and format as YYYY-MM-DDTHH:mm:ss (Local)
            const startDate = new Date(scheduleForm.startTime);
            const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);

            // Format to local ISO string (removing Z and timezone offset issues)
            const pad = (n: number) => n < 10 ? '0' + n : n;
            const formattedEndTime =
                endDate.getFullYear() + '-' +
                pad(endDate.getMonth() + 1) + '-' +
                pad(endDate.getDate()) + 'T' +
                pad(endDate.getHours()) + ':' +
                pad(endDate.getMinutes()) + ':' +
                pad(endDate.getSeconds());

            const payload = {
                candidateId: candidate.id,
                candidateName: candidate.name,
                startTime: formattedStartTime,
                endTime: formattedEndTime,
                type: scheduleForm.type,
                interviewer: scheduleForm.interviewer,
                meetingLink: scheduleForm.meetingLink,
                notes: scheduleForm.notes,
                status: 'Scheduled'
            };

            await api.post('/interviews', payload);
            await fetchInterviews();
            setIsScheduling(false);
            setScheduleForm({
                startTime: '',
                type: 'Technical Interview',
                interviewer: '',
                meetingLink: '',
                notes: ''
            });

            // Update candidate interview round info
            const roundMap: Record<string, string> = {
                'Technical Interview': 'Technical',
                'Managerial Round': 'Managerial',
                'HR Evaluation': 'HR'
            };
            const selectedRound = roundMap[scheduleForm.type] || 'Technical';

            try {
                // Determine new status (don't revert if already Hired/Offer)
                const newStatus = (candidate.status === 'Hired' || candidate.status === 'Offer') ? candidate.status : 'Interview';

                await api.put(`/candidates/${candidate.id}`, {
                    ...candidate,
                    status: newStatus,
                    interviewRound: selectedRound,
                    roundStatus: 'Scheduled'
                });
                if (onStatusUpdate && newStatus !== candidate.status) {
                    onStatusUpdate(candidate.id, newStatus);
                }
            } catch (e) {
                console.error("Failed to update candidate round info", e);
            }
        } catch (error) {
            console.error("Failed to schedule interview", error);
            alert("Failed to schedule interview round.");
        } finally {
            setIsSaving(false);
        }
    };

    // Helper to determine step status for timeline
    const getStepStatus = (stepName: string) => {
        const statusOrder = ['New', 'Screening', 'Shortlisted', 'Interview', 'Offer', 'Hired'];
        const currentStatus = candidate.status;

        const stepIndex = statusOrder.indexOf(stepName);
        const currentStatusIndex = statusOrder.indexOf(currentStatus);

        if (currentStatus === 'Rejected') {
            if (stepName === 'Offer' && interviews.length > 0) return 'rejected';
            if (stepName === 'Interview' && interviews.length > 0 && candidate.fitScore < 50) return 'rejected';
            if (stepIndex === 0) return 'completed';
            return 'pending';
        }

        if (currentStatus === 'Hired') return 'completed';
        if (currentStatusIndex > stepIndex) return 'completed';
        if (currentStatusIndex === stepIndex) return 'current';
        return 'pending';
    };

    const timelineSteps = [
        { id: 'New', label: 'Applied', date: candidate.appliedDate },
        { id: 'Screening', label: 'Screening', date: null },
        { id: 'Shortlisted', label: 'Shortlisted', date: null },
        { id: 'Interview', label: 'Interview Rounds', date: null },
        { id: 'Offer', label: 'Offer', date: null },
        { id: 'Hired', label: 'Hired', date: null },
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl my-8 flex flex-col max-h-[90vh] border border-gray-100 animate-in fade-in zoom-in duration-200">

                {/* Header */}
                <div className="p-8 border-b border-gray-100 relative bg-gray-50/30">
                    <button
                        onClick={onClose}
                        className="absolute top-6 right-6 p-2 bg-white hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors shadow-sm border border-gray-100"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
                        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-blue-200 shrink-0">
                            {candidate.name.charAt(0)}
                        </div>

                        <div className="flex-1">
                            <h2 className="text-3xl font-bold text-gray-900 mb-2">{candidate.name}</h2>
                            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-600">
                                <div className="flex items-center gap-2">
                                    <Mail className="w-4 h-4 text-gray-400" />
                                    <span>{candidate.email}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Phone className="w-4 h-4 text-gray-400" />
                                    <span>{candidate.phone || 'N/A'}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Briefcase className="w-4 h-4 text-gray-400" />
                                    <span className="font-semibold text-gray-700 bg-gray-100 px-2 py-0.5 rounded">{candidate.role}</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            {candidate.resumeId && onDownloadResume && (
                                <button onClick={() => onDownloadResume(candidate.resumeId!, candidate.name)} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-sm font-bold rounded-xl hover:bg-gray-50">
                                    <Download className="w-4 h-4" /> Resume
                                </button>
                            )}
                            {onStatusUpdate && candidate.status !== 'Rejected' && (
                                <div className="flex flex-wrap gap-2">
                                    {/* Primary Workflow Advance Buttons */}
                                    {candidate.status === 'New' && (
                                        <button
                                            onClick={() => onStatusUpdate(candidate.id, 'Screening')}
                                            className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700 shadow-md shadow-blue-100 flex items-center gap-2 transition-all"
                                        >
                                            <Search className="w-3.5 h-3.5" /> Move to Screening
                                        </button>
                                    )}

                                    {candidate.status === 'Screening' && (
                                        <button
                                            onClick={() => onStatusUpdate(candidate.id, 'Shortlisted')}
                                            className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-700 shadow-md shadow-indigo-100 flex items-center gap-2 transition-all"
                                        >
                                            <UserCheck className="w-3.5 h-3.5" /> Shortlist Candidate
                                        </button>
                                    )}

                                    {/* Scheduling Action - Always available for candidates in process */}
                                    {candidate.status !== 'Hired' && (
                                        <button
                                            onClick={() => {
                                                console.log("Toggling Schedule Form");
                                                setIsScheduling(!isScheduling);
                                            }}
                                            className={`px-4 py-2 text-xs font-bold rounded-xl flex items-center gap-2 transition-all ${isScheduling ? 'bg-indigo-100 text-indigo-700' : 'bg-black text-white hover:bg-gray-800'
                                                }`}
                                        >
                                            <Calendar className="w-3.5 h-3.5" /> {isScheduling ? 'Viewing Form' : 'Schedule Round'}
                                        </button>
                                    )}

                                    {/* Offer & Hire Logic */}
                                    {candidate.status === 'Shortlisted' || candidate.status === 'Interview' ? (
                                        <button
                                            onClick={async () => {
                                                if (window.confirm(`Send official offer letter to ${candidate.name}?`)) {
                                                    try {
                                                        await api.post(`/candidates/${candidate.id}/send-offer`);
                                                        alert("Offer letter sent successfully!");
                                                        if (onStatusUpdate) onStatusUpdate(candidate.id, 'Offer');
                                                    } catch (err) {
                                                        console.error("Failed to send offer", err);
                                                        alert("Failed to send offer letter.");
                                                    }
                                                }
                                            }}
                                            className="px-4 py-2 bg-green-600 text-white text-xs font-bold rounded-xl hover:bg-green-700 shadow-md shadow-green-100 transition-all font-sans"
                                        >
                                            Send Offer
                                        </button>
                                    ) : null}

                                    {candidate.status === 'Offer' && (
                                        <button
                                            onClick={() => onStatusUpdate(candidate.id, 'Hired')}
                                            className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-700 shadow-md shadow-indigo-100 flex items-center gap-2 transition-all"
                                        >
                                            <CheckCircle2 className="w-3.5 h-3.5" /> Confirm Hire
                                        </button>
                                    )}

                                    {/* Reject Button - Available until hired */}
                                    {candidate.status !== 'Hired' && (
                                        <button
                                            onClick={() => {
                                                const reason = window.prompt("Reason for rejection?");
                                                if (reason !== null) {
                                                    onStatusUpdate(candidate.id, 'Rejected');
                                                }
                                            }}
                                            className="px-4 py-2 bg-white border border-red-100 text-red-500 text-xs font-bold rounded-xl hover:bg-red-50 transition-colors"
                                        >
                                            Reject
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Stats Bar */}
                    <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                                <User className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 font-bold uppercase">Experience</p>
                                <p className="text-lg font-bold text-gray-900">{candidate.experience} Years</p>
                            </div>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${candidate.status === 'Rejected' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                                {candidate.status === 'Rejected' ? <XCircle className="w-6 h-6" /> : <CheckCircle2 className="w-6 h-6" />}
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 font-bold uppercase">Current Status</p>
                                <p className="text-lg font-bold text-gray-900">{candidate.status}</p>
                                {candidate.status === 'Interview' && candidate.interviewRound && (
                                    <div className="flex items-center gap-1 mt-1">
                                        <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded border border-indigo-100">
                                            {candidate.interviewRound}
                                        </span>
                                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${candidate.roundStatus === 'Passed' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-gray-50 text-gray-600 border-gray-100'}`}>
                                            {candidate.roundStatus || 'Pending'}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center justify-center">
                            <div className="text-center">
                                <p className="text-xs text-gray-500 font-bold uppercase mb-1">AI Fit Score</p>
                                <p className={`text-2xl font-black ${(candidate.fitScore || 0) >= 75 ? 'text-green-600' : 'text-orange-500'}`}>{candidate.fitScore || 0}%</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Body Content */}
                <div className="flex-1 overflow-y-auto p-8 bg-gray-50/50">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                        {/* LEFT COL */}
                        <div className="lg:col-span-2 space-y-6">

                            {/* Rejection Note */}
                            {candidate.status === 'Rejected' && (
                                <section className="bg-red-50 p-6 rounded-2xl border border-red-100 shadow-sm animate-in fade-in slide-in-from-top-4 duration-300">
                                    <h3 className="text-sm font-bold text-red-900 uppercase tracking-wider mb-2 flex items-center gap-2">
                                        <XCircle className="w-4 h-4" /> Rejection Feedback
                                    </h3>
                                    <p className="text-sm text-red-800 font-medium">
                                        {candidate.rejectionReason || "Candidate did not meet the role requirements after final review."}
                                    </p>
                                </section>
                            )}

                            {/* Skills Section */}
                            <section className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm animate-in fade-in slide-in-from-top-4 duration-500">
                                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                                    <Search className="w-4 h-4 text-purple-500" /> AI Screening Analysis
                                </h3>

                                {candidate.matchReason && (
                                    <div className="mb-4 p-3 bg-purple-50 rounded-xl border border-purple-100 text-sm text-purple-900 leading-relaxed font-medium">
                                        "{candidate.matchReason}"
                                    </div>
                                )}

                                <div className="space-y-3">
                                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Detected Skills</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {candidate.skills?.map((skill, i) => (
                                            <span key={i} className="px-3 py-1.5 bg-blue-50 text-blue-700 text-sm font-semibold rounded-lg border border-blue-100">
                                                {skill}
                                            </span>
                                        ))}
                                        {(!candidate.skills || candidate.skills.length === 0) && (
                                            <p className="text-sm text-gray-400 italic">No skills listed on resume.</p>
                                        )}
                                    </div>
                                </div>
                            </section>

                            {/* Interview Rounds Section */}
                            <section className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                                        <FileText className="w-4 h-4 text-orange-500" /> Interview Rounds & Notes
                                    </h3>
                                    <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100">
                                        {interviews.length} Rounds
                                    </span>
                                </div>

                                <div className="space-y-4">
                                    {/* Inline Scheduling Form */}
                                    {isScheduling && (
                                        <div className="bg-indigo-600 p-6 rounded-2xl shadow-xl text-white mb-6">
                                            <div className="flex justify-between items-center mb-6">
                                                <h3 className="text-lg font-bold flex items-center gap-2">
                                                    <Calendar className="w-5 h-5 text-indigo-200" /> Schedule Round {interviews.length + 1}
                                                </h3>
                                                <button onClick={() => setIsScheduling(false)} className="p-1.5 bg-indigo-500 hover:bg-indigo-400 rounded-lg transition-colors">
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                            <form onSubmit={handleScheduleSubmit} className="space-y-4">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-[10px] font-bold uppercase text-indigo-200 mb-1.5 ml-1">Date & Time</label>
                                                        <input
                                                            type="datetime-local"
                                                            required
                                                            className="w-full bg-indigo-700 border-indigo-500 text-white rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-white/20"
                                                            value={scheduleForm.startTime}
                                                            onChange={(e) => setScheduleForm({ ...scheduleForm, startTime: e.target.value })}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-[10px] font-bold uppercase text-indigo-200 mb-1.5 ml-1">Type</label>
                                                        <select
                                                            className="w-full bg-indigo-700 border-indigo-500 text-white rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-white/20"
                                                            value={scheduleForm.type}
                                                            onChange={(e) => setScheduleForm({ ...scheduleForm, type: e.target.value })}
                                                        >
                                                            <option>Technical Interview</option>
                                                            <option>Managerial Round</option>
                                                            <option>HR Evaluation</option>
                                                        </select>
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-[10px] font-bold uppercase text-indigo-200 mb-1.5 ml-1">Interviewer</label>
                                                        <input
                                                            type="text"
                                                            placeholder="Interviewer Name"
                                                            required
                                                            className="w-full bg-indigo-700 border-indigo-500 text-white rounded-xl px-4 py-2 text-sm outline-none placeholder:text-indigo-400"
                                                            value={scheduleForm.interviewer}
                                                            onChange={(e) => setScheduleForm({ ...scheduleForm, interviewer: e.target.value })}
                                                        />
                                                    </div>
                                                    <div className="relative">
                                                        <label className="block text-[10px] font-bold uppercase text-indigo-200 mb-1.5 ml-1">Link</label>
                                                        <div className="flex gap-2">
                                                            <input
                                                                type="url"
                                                                placeholder="Meeting Link"
                                                                className="flex-1 bg-indigo-700 border-indigo-500 text-white rounded-xl px-4 py-2 text-sm outline-none placeholder:text-indigo-400"
                                                                value={scheduleForm.meetingLink}
                                                                onChange={(e) => setScheduleForm({ ...scheduleForm, meetingLink: e.target.value })}
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={async () => {
                                                                    try {
                                                                        const res = await api.post('/interviews/generate-link', null, { params: { candidateName: candidate.name } });
                                                                        if (res.data.link) {
                                                                            setScheduleForm({ ...scheduleForm, meetingLink: res.data.link });
                                                                        } else {
                                                                            alert("Zoom credentials not configured or failed to generate link.");
                                                                        }
                                                                    } catch (err) {
                                                                        console.error("Link generation failed", err);
                                                                        alert("Failed to connect to Zoom service.");
                                                                    }
                                                                }}
                                                                className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-[10px] font-bold transition-colors whitespace-nowrap"
                                                                title="Click to generate dynamic Zoom link"
                                                            >
                                                                Auto-Generate
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                                <button
                                                    type="submit"
                                                    disabled={isSaving}
                                                    className="w-full bg-white text-indigo-700 py-2.5 rounded-xl font-bold hover:bg-gray-100 transition-colors flex items-center justify-center gap-2 mt-2 shadow-lg"
                                                >
                                                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm & Create Schedule'}
                                                </button>
                                            </form>
                                        </div>
                                    )}

                                    {interviews.length > 0 ? [...interviews].reverse().map((iv, idx) => (
                                        <div key={iv.id} className="p-4 bg-gray-50 rounded-xl border border-gray-100 relative group transition-all hover:bg-white hover:shadow-md">
                                            <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-500 opacity-20 group-hover:opacity-100 transition-opacity" />
                                            <div className="flex justify-between items-start mb-2">
                                                <div>
                                                    <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 px-2 py-0.5 rounded">
                                                        Round {interviews.length - idx} • {iv.type || 'Standard'}
                                                    </span>
                                                    <h4 className="text-sm font-bold text-gray-900 mt-2">
                                                        {(() => {
                                                            try {
                                                                const d = new Date(iv.startTime);
                                                                if (isNaN(d.getTime())) return "Date Pending";
                                                                return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }) + " at " + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                                            } catch (e) {
                                                                return "Date Pending";
                                                            }
                                                        })()}
                                                    </h4>
                                                    {iv.interviewer && (
                                                        <p className="text-[11px] font-medium text-gray-500 mt-1 flex items-center gap-1.5">
                                                            <User className="w-3 h-3" /> Interviewer: {iv.interviewer}
                                                        </p>
                                                    )}
                                                </div>
                                                <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-tight ${iv.status === 'Completed' ? 'bg-green-100 text-green-700' :
                                                    iv.status === 'Cancelled' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                                                    }`}>
                                                    {iv.status}
                                                </span>
                                            </div>
                                            {(iv.notes || "No additional notes.") && (
                                                <div className="mt-3 bg-white p-3 rounded-xl border border-gray-100 text-sm text-gray-600 italic leading-relaxed">
                                                    {iv.notes}
                                                </div>
                                            )}
                                            {iv.meetingLink && (
                                                <a href={iv.meetingLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-[11px] font-bold text-indigo-600 mt-3 hover:underline">
                                                    <ExternalLink className="w-3 h-3" /> Join Virtual Meeting
                                                </a>
                                            )}
                                        </div>
                                    )) : (
                                        <div className="p-12 border-2 border-dashed border-gray-200 rounded-3xl flex flex-col items-center justify-center text-gray-400">
                                            <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                                                <MessageSquare className="w-6 h-6 opacity-40 text-gray-400" />
                                            </div>
                                            <p className="text-sm font-medium">No interview rounds scheduled yet.</p>
                                            {!isScheduling && (
                                                <button
                                                    onClick={() => setIsScheduling(true)}
                                                    className="mt-4 px-4 py-1.5 bg-indigo-50 text-indigo-600 text-[11px] font-bold rounded-lg border border-indigo-100 hover:bg-indigo-100 shadow-sm transition-all"
                                                >
                                                    Schedule First Round
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </section>

                            {/* History Section */}
                            <section className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-gray-500" /> Other Applications
                                </h3>
                                <div className="space-y-3">
                                    {history.filter(h => h.id !== candidate.id).map((historyItem) => (
                                        <div key={historyItem.id} className="p-4 bg-gray-50/50 rounded-xl border border-gray-100 flex justify-between items-center hover:bg-white hover:shadow-sm transition-all group">
                                            <div>
                                                <h4 className="font-bold text-gray-900 text-sm group-hover:text-indigo-600 transition-colors">{historyItem.role}</h4>
                                                <p className="text-[10px] text-gray-400 mt-1 font-bold uppercase tracking-widest">Applied: {historyItem.appliedDate}</p>
                                            </div>
                                            <div className="text-right flex items-center gap-3">
                                                <div className="text-right mr-2">
                                                    <p className="text-[9px] text-gray-400 font-black uppercase">Fit Score</p>
                                                    <p className="text-xs font-bold text-gray-900">{historyItem.fitScore}%</p>
                                                </div>
                                                <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase ${historyItem.status === 'Hired' ? 'bg-green-100 text-green-700' :
                                                    historyItem.status === 'Rejected' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
                                                    }`}>
                                                    {historyItem.status}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                    {history.filter(h => h.id !== candidate.id).length === 0 && (
                                        <div className="text-center py-6 text-gray-400 italic text-sm">
                                            First application from this candidate.
                                        </div>
                                    )}
                                </div>
                            </section>
                        </div>

                        {/* RIGHT COL - Timeline */}
                        <div className="space-y-6">
                            <section className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm sticky top-6">
                                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-8 flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-indigo-500" /> Current Progress
                                </h3>
                                <div className="relative pl-6 space-y-10 before:absolute before:left-[33px] before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-100">
                                    {timelineSteps.map((step, i) => {
                                        const status = getStepStatus(step.id);
                                        return (
                                            <div key={i} className="relative flex items-start gap-4">
                                                <div className={`relative z-10 w-9 h-9 rounded-full flex items-center justify-center border-4 border-white shadow-md shrink-0 transition-all ${status === 'completed' ? 'bg-green-500 text-white scale-110' :
                                                    status === 'current' ? 'bg-indigo-600 text-white ring-4 ring-indigo-50 shadow-indigo-100 animate-pulse' :
                                                        status === 'rejected' ? 'bg-red-500 text-white scale-110 shadow-lg shadow-red-100' :
                                                            'bg-gray-50 text-gray-300'
                                                    }`}>
                                                    {status === 'completed' ? <CheckCircle2 className="w-5 h-5" /> :
                                                        status === 'current' ? <div className="w-3 h-3 bg-white rounded-full" /> :
                                                            status === 'rejected' ? <XCircle className="w-5 h-5" /> :
                                                                <div className="w-2 h-2 bg-gray-200 rounded-full" />}
                                                </div>
                                                <div className={`${status === 'pending' ? 'opacity-40' : ''}`}>
                                                    <h4 className={`text-sm font-bold tracking-tight ${status === 'current' ? 'text-indigo-700' : status === 'rejected' ? 'text-red-600' : 'text-gray-900'}`}>{step.label}</h4>
                                                    {step.date && <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-wide">{step.date}</p>}
                                                    {step.id === 'Interview' && interviews.length > 0 && (
                                                        <div className="mt-2 flex items-center gap-2">
                                                            <div className="flex -space-x-2">
                                                                {interviews.slice(0, 3).map((_, idx) => (
                                                                    <div key={idx} className="w-4 h-4 rounded-full border border-white bg-indigo-100 flex items-center justify-center text-[8px] font-bold text-indigo-600">
                                                                        {idx + 1}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                            <span className="text-[9px] font-bold text-indigo-400">{interviews.length} Round(s)</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </section>
                        </div>

                    </div>
                </div>

            </div>
        </div >
    );
};

export default CandidateDetailsModal;
