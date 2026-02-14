export type ViewState = 'dashboard' | 'jobs' | 'candidates' | 'resume-upload' | 'skills-matrix' | 'shortlist' | 'settings';

export interface Candidate {
  id: string;
  name: string;
  role: string;
  email: string;
  experience: number; // years
  status: 'New' | 'Screening' | 'Shortlisted' | 'Interview' | 'Offer' | 'Rejected' | 'Hired';
  fitScore: number;
  skills: string[];
  avatar: string;
  appliedDate: string;
  source?: string;
  resumeId?: string;
  phone?: string;
  confidenceScore?: number;
  auditLogId?: string;
  matchReason?: string;
  interviewDate?: string;
  interviewTime?: string;
  interviewType?: 'Video Call' | 'In-Person' | 'Phone';
  interviewNotes?: string;
  interviewMeetingLink?: string;
  rejectionReason?: string;
  jobId?: string;
  interviewRound?: 'Technical' | 'Managerial' | 'HR';
  roundStatus?: 'Scheduled' | 'Feedback Pending' | 'Passed' | 'Rejected';
}

export interface SkillWeight {
  name: string;
  weight: number;
}

export interface Job {
  id: string;
  title: string;
  department: string;
  employmentType: string;
  location: string;
  applicants: number;
  status: string;
  postedDate: string;
  description: string;
  company: string;
  salary: string;
  experienceLevel: string;
  remote: boolean;
  skills: SkillWeight[];
  education: string[];
  industry: string;
  benefits: string[];
  deadline: string;
}

export interface SkillMetric {
  skill: string;
  proficiency: number; // 0-100
}

export interface CandidateSkillMatrix {
  candidateId: string;
  candidateName: string;
  metrics: SkillMetric[];
  totalScore: number;
}
