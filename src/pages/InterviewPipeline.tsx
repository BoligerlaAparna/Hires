import React, { useState, useEffect, useMemo } from 'react';
import { Search, Calendar, CheckCircle, XCircle, Clock, User, Briefcase, ChevronRight, X, Filter, UserPlus, Users, ArrowRight, Star } from 'lucide-react';
import api from '../api';
import { Candidate } from '../types';
import CandidateDetailsModal from '../components/CandidateDetailsModal';

// Rounds configuration with enhanced styling metadata
const ROUNDS = [
    { id: 'Technical', title: '💻 Technical Round', color: 'from-blue-50 to-indigo-50 border-blue-100', text: 'text-indigo-900', iconBg: 'bg-indigo-500/10', accent: 'bg-indigo-500' },
    { id: 'Managerial', title: '👔 Manager Round', color: 'from-purple-50 to-pink-50 border-purple-100', text: 'text-purple-900', iconBg: 'bg-purple-500/10', accent: 'bg-purple-500' },
    { id: 'HR', title: '🤝 HR Round', color: 'from-emerald-50 to-teal-50 border-emerald-100', text: 'text-emerald-900', iconBg: 'bg-emerald-500/10', accent: 'bg-emerald-500' }
];

const InterviewPipeline: React.FC = () => {
    const [candidates, setCandidates] = useState<Candidate[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedRoundId, setSelectedRoundId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'All' | 'Scheduled' | 'Passed' | 'Rejected'>('All');
    const [selectedCandidateForDetails, setSelectedCandidateForDetails] = useState<Candidate | null>(null);

    useEffect(() => {
        fetchCandidates();
    }, []);

    const fetchCandidates = async () => {
        try {
            const response = await api.get('/candidates?size=1000');
            const data = response.data.content || response.data;
            const interviewCandidates = data.filter((c: Candidate) => c.status === 'Interview');
            setCandidates(interviewCandidates);
        } catch (error) {
            console.error("Failed to fetch candidates", error);
        } finally {
            setLoading(false);
        }
    };

    const handleStatusChange = async (candidateId: string, newStatus: 'Passed' | 'Rejected' | 'Scheduled') => {
        try {
            const candidate = candidates.find(c => c.id === candidateId);
            if (!candidate) return;

            const updated = { ...candidate, roundStatus: newStatus };
            setCandidates(candidates.map(c => c.id === candidateId ? updated : c));

            await api.put(`/candidates/${candidateId}`, updated);
        } catch (e) {
            console.error("Failed to update status", e);
            fetchCandidates();
        }
    };

    const getCandidatesByRound = (roundId: string) => {
        return candidates.filter(c => c.interviewRound === roundId || (!c.interviewRound && roundId === 'Technical'));
    };

    const filteredCandidates = useMemo(() => {
        if (!selectedRoundId) return [];
        let list = getCandidatesByRound(selectedRoundId);

        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            list = list.filter(c =>
                c.name.toLowerCase().includes(query) ||
                c.role.toLowerCase().includes(query) ||
                c.email.toLowerCase().includes(query)
            );
        }

        if (statusFilter !== 'All') {
            list = list.filter(c => {
                if (statusFilter === 'Scheduled') return !c.roundStatus || c.roundStatus === 'Scheduled';
                return c.roundStatus === statusFilter;
            });
        }

        return list;
    }, [selectedRoundId, candidates, searchQuery, statusFilter]);

    const activeRound = ROUNDS.find(r => r.id === selectedRoundId);

    const handleDownloadResume = async (resumeId: string | undefined, candidateName: string) => {
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

    const handleGlobalStatusUpdate = async (id: string, newStatus: string) => {
        try {
            await api.patch(`/candidates/${id}/status`, null, { params: { status: newStatus } });
            fetchCandidates();
            setSelectedCandidateForDetails(null);
        } catch (error) {
            console.error("Failed to update status", error);
        }
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center h-full gap-4">
            <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
            <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Initializing Pipeline...</p>
        </div>
    );

    return (
        <div className="flex h-full flex-col bg-[#F8FAFC] overflow-hidden">
            {/* Header Area */}
            <div className="relative px-12 pt-12 pb-8 overflow-hidden">
                <div className="absolute top-0 right-0 -mt-20 -mr-20 w-96 h-96 bg-indigo-100/30 rounded-full blur-3xl" />
                <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-72 h-72 bg-emerald-100/20 rounded-full blur-3xl" />

                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-indigo-600 rounded-xl text-white shadow-lg shadow-indigo-200">
                            <Users size={20} />
                        </div>
                        <span className="text-indigo-600 font-black text-[10px] uppercase tracking-[0.2em]">Hiring Process</span>
                    </div>
                    <h1 className="text-4xl font-black text-[#0F172A] tracking-tight">Interview Pipeline</h1>
                    <p className="text-slate-500 mt-2 text-lg font-medium max-w-2xl">
                        A centralized dashboard to monitor and manage candidates as they move through different interview stages.
                    </p>
                </div>
            </div>

            {/* Stage Selector Grid */}
            <div className="px-12 flex-1 overflow-y-auto pb-12">
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                    {ROUNDS.map((round) => {
                        const roundCandidates = getCandidatesByRound(round.id);
                        return (
                            <div
                                key={round.id}
                                onClick={() => {
                                    setSelectedRoundId(round.id);
                                    setStatusFilter('All');
                                    setSearchQuery('');
                                }}
                                className={`group relative p-8 rounded-[40px] border border-white bg-gradient-to-br ${round.color} shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_50px_rgba(0,0,0,0.1)] transition-all duration-500 cursor-pointer overflow-hidden backdrop-blur-xl scale-100 hover:scale-[1.02]`}
                            >
                                {/* Background Accent */}
                                <div className={`absolute -right-12 -top-12 w-48 h-48 rounded-full ${round.accent} opacity-[0.03] group-hover:opacity-[0.07] transition-opacity`} />

                                <div className="flex flex-col h-full relative z-10">
                                    <div className="flex items-start justify-between mb-8">
                                        <div className={`${round.iconBg} p-4 rounded-3xl transition-transform group-hover:rotate-12`}>
                                            <h3 className={`text-2xl font-black ${round.text}`}>{round.title.split(' ')[0]}</h3>
                                        </div>
                                        <div className={`flex flex-col items-end`}>
                                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Active</span>
                                            <div className="flex items-center gap-2">
                                                <span className={`text-4xl font-black ${round.text}`}>{roundCandidates.length}</span>
                                                <div className={`w-2 h-2 rounded-full ${round.accent} animate-pulse`} />
                                            </div>
                                        </div>
                                    </div>

                                    <h3 className={`text-2xl font-black ${round.text} leading-tight`}>
                                        {round.title.split(' ').slice(1).join(' ')}
                                    </h3>

                                    <div className="mt-8 pt-8 border-t border-white/50 flex items-center justify-between">
                                        <div className="flex -space-x-4">
                                            {roundCandidates.slice(0, 4).map((c) => (
                                                <div key={c.id} className="w-12 h-12 rounded-[18px] ring-[6px] ring-white bg-white shadow-sm flex items-center justify-center font-black text-indigo-600 border border-slate-50 group-hover:-translate-y-1 transition-transform">
                                                    {c.name.charAt(0)}
                                                </div>
                                            ))}
                                            {roundCandidates.length > 4 && (
                                                <div className="w-12 h-12 rounded-[18px] ring-[6px] ring-white bg-slate-100 flex items-center justify-center font-black text-slate-400 text-xs border border-slate-50 group-hover:-translate-y-1 transition-transform">
                                                    +{roundCandidates.length - 4}
                                                </div>
                                            )}
                                            {roundCandidates.length === 0 && (
                                                <div className="text-slate-400 text-xs font-bold uppercase tracking-widest italic">No candidates awaiting</div>
                                            )}
                                        </div>
                                        <div className={`p-3 rounded-2xl bg-white/40 shadow-sm text-slate-400 group-hover:text-slate-600 transition-all group-hover:translate-x-1`}>
                                            <ArrowRight size={20} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Premium Candidates Modal */}
            {selectedRoundId && activeRound && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-[48px] shadow-[0_32px_80px_rgba(0,0,0,0.15)] w-full max-w-5xl flex flex-col max-h-[90vh] overflow-hidden border border-slate-100 animate-in slide-in-from-bottom-8 duration-500">
                        {/* Modal Header */}
                        <div className="px-12 pt-10 pb-2 flex items-center justify-between">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <div className={`w-2 h-2 rounded-full ${activeRound.accent}`} />
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Current Stage</span>
                                </div>
                                <h2 className="text-3xl font-black text-slate-900 tracking-tight">
                                    {activeRound.title.split(' ').slice(1).join(' ')}
                                </h2>
                            </div>
                            <button
                                onClick={() => setSelectedRoundId(null)}
                                className="p-4 hover:bg-slate-100 rounded-3xl transition-all text-slate-400 hover:text-slate-600 hover:rotate-90"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        {/* Search and Tabs Container */}
                        <div className="px-12 py-6">
                            <div className="flex flex-col md:flex-row gap-6 items-center">
                                <div className="relative flex-1 group w-full">
                                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors w-5 h-5" />
                                    <input
                                        type="text"
                                        placeholder="Find by name, role, or contact info..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full pl-14 pr-6 py-5 bg-slate-50 border-none rounded-[24px] focus:ring-4 focus:ring-indigo-500/10 transition-all font-bold text-slate-600 placeholder:text-slate-300 shadow-inner"
                                    />
                                </div>

                                <div className="flex p-1.5 bg-slate-100 rounded-[24px] w-full md:w-auto">
                                    {[
                                        { id: 'All', label: 'All' },
                                        { id: 'Scheduled', label: 'Waiting' },
                                        { id: 'Passed', label: 'Passed' },
                                        { id: 'Rejected', label: 'Rejected' }
                                    ].map(tab => (
                                        <button
                                            key={tab.id}
                                            onClick={() => setStatusFilter(tab.id as any)}
                                            className={`px-6 py-3 rounded-[18px] text-xs font-black tracking-widest uppercase transition-all duration-300 ${statusFilter === tab.id ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                        >
                                            {tab.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Enhanced Modern Card List */}
                        <div className="flex-1 overflow-y-auto px-12 pb-12 space-y-4 custom-scrollbar">
                            {filteredCandidates.length > 0 ? (
                                filteredCandidates.map((candidate) => (
                                    <div
                                        key={candidate.id}
                                        onClick={() => setSelectedCandidateForDetails(candidate)}
                                        className="group bg-white rounded-[32px] p-6 border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)] hover:shadow-[0_12px_40px_rgba(79,70,229,0.08)] hover:-translate-y-1 transition-all flex flex-col md:flex-row items-center cursor-pointer gap-6 border-l-4 hover:border-l-indigo-600"
                                    >
                                        {/* Profile Info */}
                                        <div className="flex items-center gap-5 flex-1 min-w-0 w-full">
                                            <div className="relative">
                                                <div className="w-16 h-16 rounded-[24px] bg-gradient-to-br from-indigo-50 to-slate-100 flex items-center justify-center font-black text-xl text-indigo-600 shadow-sm group-hover:scale-110 transition-transform">
                                                    {candidate.name.charAt(0)}
                                                </div>
                                                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-lg bg-green-500 border-[3px] border-white shadow-sm flex items-center justify-center">
                                                    <Star size={10} className="text-white fill-current" />
                                                </div>
                                            </div>
                                            <div className="truncate">
                                                <h4 className="text-xl font-black text-slate-900 group-hover:text-indigo-600 transition-colors truncate">{candidate.name}</h4>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-xs font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md">{candidate.role}</span>
                                                    <span className="w-1 h-1 rounded-full bg-slate-200" />
                                                    <span className="text-xs font-bold text-slate-300">{candidate.email}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Progress Pipeline Visualization */}
                                        <div className="hidden lg:flex items-center gap-2 px-8 py-3 bg-slate-50 rounded-2xl border border-slate-100/50">
                                            {ROUNDS.map((r, i) => {
                                                const isCompleted = (candidate.interviewRound === 'Technical' && i < 0) ||
                                                    (candidate.interviewRound === 'Managerial' && i < 1) ||
                                                    (candidate.interviewRound === 'HR' && i < 2) ||
                                                    (candidate.roundStatus === 'Passed' && candidate.interviewRound === r.id);
                                                const isCurrent = candidate.interviewRound === r.id || (!candidate.interviewRound && r.id === 'Technical');

                                                return (
                                                    <React.Fragment key={r.id}>
                                                        <div
                                                            className={`w-3 h-3 rounded-full transition-all duration-500 scale-100 hover:scale-150 ${isCompleted ? 'bg-indigo-500 shadow-sm shadow-indigo-200' : isCurrent ? 'bg-indigo-300 animate-pulse' : 'bg-slate-200'}`}
                                                            title={r.title}
                                                        />
                                                        {i < ROUNDS.length - 1 && <div className={`w-6 h-0.5 rounded-full ${isCompleted ? 'bg-indigo-500' : 'bg-slate-100'}`} />}
                                                    </React.Fragment>
                                                );
                                            })}
                                        </div>

                                        {/* Status & Actions */}
                                        <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end">
                                            <div className={`px-5 py-2.5 rounded-[18px] text-[10px] font-black uppercase tracking-widest flex items-center gap-2
                                                ${candidate.roundStatus === 'Passed' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                                                    candidate.roundStatus === 'Rejected' ? 'bg-rose-50 text-rose-600 border border-rose-100' :
                                                        'bg-amber-50 text-amber-600 border border-amber-100'}`}>
                                                {candidate.roundStatus === 'Passed' ? <CheckCircle size={14} strokeWidth={3} /> :
                                                    candidate.roundStatus === 'Rejected' ? <XCircle size={14} strokeWidth={3} /> :
                                                        <Clock size={14} strokeWidth={3} />}
                                                {candidate.roundStatus || 'Scheduled'}
                                            </div>

                                            <div className="flex gap-2">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleStatusChange(candidate.id, 'Passed');
                                                    }}
                                                    className="w-12 h-12 flex items-center justify-center bg-white border border-slate-100 rounded-2xl text-slate-300 hover:bg-emerald-500 hover:text-white hover:border-emerald-500 transition-all shadow-sm active:scale-95"
                                                >
                                                    <CheckCircle size={20} strokeWidth={2.5} />
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleStatusChange(candidate.id, 'Rejected');
                                                    }}
                                                    className="w-12 h-12 flex items-center justify-center bg-white border border-slate-100 rounded-2xl text-slate-300 hover:bg-rose-500 hover:text-white hover:border-rose-500 transition-all shadow-sm active:scale-95"
                                                >
                                                    <XCircle size={20} strokeWidth={2.5} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="flex flex-col items-center justify-center py-24 bg-slate-50/50 rounded-[40px] border-2 border-dashed border-slate-200">
                                    <div className="w-20 h-20 bg-white shadow-xl rounded-[28px] flex items-center justify-center text-slate-200 mb-6">
                                        <Search size={32} />
                                    </div>
                                    <h3 className="text-xl font-black text-slate-900">No matches found</h3>
                                    <p className="text-slate-400 font-bold mt-1 text-sm">Refine your search or clear filters to see more candidates.</p>
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="px-12 py-8 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-white rounded-xl shadow-sm">
                                    <Users size={16} className="text-indigo-600" />
                                </div>
                                <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">
                                    {filteredCandidates.length} of {getCandidatesByRound(selectedRoundId).length} candidates listed
                                </p>
                            </div>
                            <button
                                onClick={() => setSelectedRoundId(null)}
                                className="px-10 py-5 bg-slate-900 border border-slate-900 text-white font-black text-xs uppercase tracking-widest rounded-[24px] hover:bg-indigo-600 hover:border-indigo-600 transition-all shadow-2xl shadow-slate-200 active:scale-95"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Candidate Detail Modal */}
            {selectedCandidateForDetails && (
                <CandidateDetailsModal
                    candidate={selectedCandidateForDetails}
                    onClose={() => setSelectedCandidateForDetails(null)}
                    onStatusUpdate={handleGlobalStatusUpdate}
                    onDownloadResume={handleDownloadResume}
                />
            )}
        </div>
    );
};

export default InterviewPipeline;
