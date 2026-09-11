"use client";

import { useState, useEffect, use } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc, collection, query, where, getDocs } from "firebase/firestore";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ChallengeApplication, CompanyChallenge, ChallengeApplicationStatus } from "@/types";
import { isCandidateStrongMatch } from "@/lib/candidate-matching";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  ArrowLeft, 
  Loader2, 
  CheckCircle, 
  AlertCircle,
  Briefcase,
  User,
  Mail,
  Code,
  MessageSquare,
  BookOpen,
  Award,
  ExternalLink
} from "lucide-react";

export default function ApplicationDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useAuth();
  const router = useRouter();

  const [application, setApplication] = useState<ChallengeApplication | null>(null);
  const [challenge, setChallenge] = useState<CompanyChallenge | null>(null);
  const [student, setStudent] = useState<any>(null);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [updating, setUpdating] = useState(false);
  const [updateMsg, setUpdateMsg] = useState<{type: 'success' | 'error', text: string} | null>(null);

  // Form states for grading
  const [practicalScore, setPracticalScore] = useState<number>(0);
  const [interviewScore, setInterviewScore] = useState<number>(0);
  const [interviewFeedback, setInterviewFeedback] = useState<string>('');
  const [overallStatus, setOverallStatus] = useState<ChallengeApplicationStatus>('applied');

  const [isStrongMatch, setIsStrongMatch] = useState<boolean>(false);

  useEffect(() => {
    async function fetchData() {
      if (!user) return;
      try {
        const appRef = doc(db, "challengeApplications", id);
        const appSnap = await getDoc(appRef);
        
        if (!appSnap.exists()) {
          setError("Application not found.");
          setLoading(false);
          return;
        }

        const appData = { id: appSnap.id, ...appSnap.data() } as ChallengeApplication;
        
        // Ensure company owns this application
        if (appData.companyId !== user.uid) {
          setError("You do not have permission to view this application.");
          setLoading(false);
          return;
        }

        setApplication(appData);
        setPracticalScore(appData.practicalScore || 0);
        setInterviewScore(appData.interviewScore || 0);
        setInterviewFeedback(appData.interviewFeedback || '');
        setOverallStatus(appData.status);

        // Fetch challenge
        const cRef = doc(db, "companyChallenges", appData.challengeId);
        const cSnap = await getDoc(cRef);
        let challengeData: CompanyChallenge | null = null;
        if (cSnap.exists()) {
          challengeData = { id: cSnap.id, ...cSnap.data() } as CompanyChallenge;
          setChallenge(challengeData);
        }

        // Fetch student
        const sRef = doc(db, "studentProfiles", appData.studentId);
        const sSnap = await getDoc(sRef);
        if (sSnap.exists()) {
          setStudent(sSnap.data());
        }

        // Fetch skill scores to check for strong match
        if (challengeData && challengeData.requiredSkillIds && challengeData.requiredSkillIds.length > 0) {
          const scoresQ = query(collection(db, "skillScores"), where("studentId", "==", appData.studentId));
          const scoresSnap = await getDocs(scoresQ);
          
          const verifiedSet = new Set<string>();
          scoresSnap.forEach(d => {
            const data = d.data();
            if (data.isVerified) {
              verifiedSet.add(data.skillId);
            }
          });
          
          const isMatch = isCandidateStrongMatch(challengeData.requiredSkillIds, verifiedSet);
          
          setIsStrongMatch(isMatch);
        }

      } catch (err) {
        console.error("Error fetching application details:", err);
        setError("Failed to load application details.");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [id, user]);

  const handleUpdateStatus = async (newStatus: ChallengeApplicationStatus) => {
    if (!application) return;
    setUpdating(true);
    setUpdateMsg(null);
    try {
      const appRef = doc(db, "challengeApplications", id);
      await updateDoc(appRef, {
        status: newStatus
      });
      setOverallStatus(newStatus);
      setUpdateMsg({ type: 'success', text: 'Application status updated successfully.' });
    } catch (err) {
      console.error("Error updating status:", err);
      setUpdateMsg({ type: 'error', text: 'Failed to update application status.' });
    } finally {
      setUpdating(false);
    }
  };

  const calculateOverallScore = (pScore: number, iScore: number) => {
    if (!challenge || !application) return application?.overallScore || 0;
    let theoryWeight = challenge.theoryRequired ? 0.30 : 0;
    let practicalWeight = challenge.practicalRequired ? 0.50 : 0;
    let interviewWeight = challenge.interviewRequired ? 0.20 : 0;
    
    const totalWeight = theoryWeight + practicalWeight + interviewWeight;
    if (totalWeight === 0) return 0;
    
    const normTheory = theoryWeight / totalWeight;
    const normPractical = practicalWeight / totalWeight;
    const normInterview = interviewWeight / totalWeight;
    
    const theoryScore = application.theoryScore || 0;
    
    const overall = (theoryScore * normTheory) + (pScore * normPractical) + (iScore * normInterview);
    return Math.round(overall);
  };

  const handleGradePractical = async () => {
    if (!application) return;
    setUpdating(true);
    setUpdateMsg(null);
    try {
      const appRef = doc(db, "challengeApplications", id);
      const newOverall = calculateOverallScore(practicalScore, application.interviewScore || 0);
      
      await updateDoc(appRef, {
        practicalScore: practicalScore,
        practicalStatus: 'completed',
        overallScore: newOverall
      });
      
      setApplication({
        ...application, 
        practicalScore: practicalScore, 
        practicalStatus: 'completed', 
        overallScore: newOverall
      });
      
      setUpdateMsg({ type: 'success', text: 'Practical score updated.' });
    } catch (err) {
      console.error("Error grading practical:", err);
      setUpdateMsg({ type: 'error', text: 'Failed to update practical score.' });
    } finally {
      setUpdating(false);
    }
  };

  const handleGradeInterview = async () => {
    if (!application) return;
    setUpdating(true);
    setUpdateMsg(null);
    try {
      const appRef = doc(db, "challengeApplications", id);
      const newOverall = calculateOverallScore(application.practicalScore || 0, interviewScore);
      
      await updateDoc(appRef, {
        interviewScore: interviewScore,
        interviewFeedback: interviewFeedback,
        interviewStatus: 'completed',
        overallScore: newOverall
      });
      
      setApplication({
        ...application, 
        interviewScore: interviewScore,
        interviewFeedback: interviewFeedback,
        interviewStatus: 'completed', 
        overallScore: newOverall
      });
      
      setUpdateMsg({ type: 'success', text: 'Interview score updated.' });
    } catch (err) {
      console.error("Error grading interview:", err);
      setUpdateMsg({ type: 'error', text: 'Failed to update interview score.' });
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={["company"]}>
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </ProtectedRoute>
    );
  }

  if (error || !application || !challenge || !student) {
    return (
      <ProtectedRoute allowedRoles={["company"]}>
        <div className="max-w-4xl mx-auto space-y-6">
          <Link href="/dashboard/company/applications" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to Applications
          </Link>
          <div className="bg-red-50 text-red-700 p-4 rounded-md flex items-center">
            <AlertCircle className="w-5 h-5 mr-2" />
            {error || "Failed to load data."}
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  const studentName = student.fullName || `${student.firstName || ''} ${student.lastName || ''}`.trim() || 'Unknown Student';

  return (
    <ProtectedRoute allowedRoles={["company"]}>
      <div className="max-w-5xl mx-auto space-y-6 pb-12">
        <Link href="/dashboard/company/applications" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Applications
        </Link>

        {updateMsg && (
          <div className={`p-4 rounded-md flex items-center ${updateMsg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {updateMsg.type === 'success' ? <CheckCircle className="w-5 h-5 mr-2" /> : <AlertCircle className="w-5 h-5 mr-2" />}
            {updateMsg.text}
          </div>
        )}

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-gray-900">{studentName}</h1>
                {isStrongMatch && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Strong Match
                  </span>
                )}
              </div>
              <div className="flex items-center text-sm text-gray-500 mt-2 space-x-4">
                <span className="flex items-center"><Briefcase className="w-4 h-4 mr-1" /> {challenge.title}</span>
                <span className="flex items-center"><Mail className="w-4 h-4 mr-1" /> {student.email}</span>
              </div>
              <div className="flex flex-wrap items-center gap-2 mt-3">
                <Link
                  href={`/profile/${application.studentId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-md border border-indigo-200 transition-colors"
                >
                  <Award className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Public Verified Profile</span>
                  <ExternalLink className="w-3 h-3 opacity-60" />
                </Link>
                <Link
                  href={`/dashboard/company/student/${application.studentId}`}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-md transition-colors"
                >
                  <User className="w-3.5 h-3.5 text-slate-500" />
                  <span>Full Candidate Portfolio</span>
                </Link>
              </div>
            </div>
            
            <div className="flex flex-col items-end gap-2">
              {application.overallScore !== undefined && (
                <div className="text-sm font-medium text-gray-700 bg-blue-50 px-3 py-1 rounded-full">
                  Overall Score: <span className="font-bold text-blue-700">{application.overallScore}%</span>
                </div>
              )}
              <div className="flex items-center gap-2 mt-1">
                <label className="text-xs font-medium text-gray-500 uppercase">Status</label>
                <select
                  value={overallStatus}
                  onChange={(e) => handleUpdateStatus(e.target.value as ChallengeApplicationStatus)}
                  disabled={updating}
                  className="block w-40 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm disabled:opacity-50 py-1.5"
                >
                  <option value="applied">Applied</option>
                  <option value="in_progress">In Progress</option>
                  <option value="submitted">Submitted</option>
                  <option value="shortlisted">Shortlisted</option>
                  <option value="rejected">Rejected</option>
                  <option value="hired">Hired</option>
                </select>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-gray-200">
            <div className="p-6 text-center">
              <span className="block text-sm font-medium text-gray-500 mb-1">Theory Score</span>
              <span className="text-3xl font-bold text-gray-900">{application.theoryScore || 0}%</span>
              <div className="mt-2 text-xs text-gray-500">Status: {application.theoryStatus}</div>
            </div>
            <div className="p-6 text-center">
              <span className="block text-sm font-medium text-gray-500 mb-1">Hiring Task Score</span>
              <span className="text-3xl font-bold text-gray-900">{application.practicalScore || 0}%</span>
              <div className="mt-2 text-xs text-gray-500">Status: {application.practicalStatus}</div>
            </div>
            <div className="p-6 text-center">
              <span className="block text-sm font-medium text-gray-500 mb-1">Interview Score</span>
              <span className="text-3xl font-bold text-gray-900">{application.interviewScore || 0}%</span>
              <div className="mt-2 text-xs text-gray-500">Status: {application.interviewStatus}</div>
            </div>
          </div>
        </div>

        {/* Theory Review */}
        {challenge.theoryRequired && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
              <BookOpen className="w-5 h-5 mr-2 text-blue-500" /> Theory Stage Results
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 p-4 rounded-md">
                <span className="block text-sm font-medium text-gray-500">Integrity Violations</span>
                <span className="text-lg font-bold text-gray-900">{application.theoryAttempt?.violationCount || 0}</span>
              </div>
              <div className="bg-gray-50 p-4 rounded-md">
                <span className="block text-sm font-medium text-gray-500">Completion</span>
                <span className="text-lg font-bold text-gray-900 capitalize">{application.theoryStatus.replace('_', ' ')}</span>
              </div>
            </div>
          </div>
        )}

        {/* Hiring Task Review */}
        {challenge.practicalRequired && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
              <Code className="w-5 h-5 mr-2 text-blue-500" /> Hiring Task Submission
            </h2>
            
            {application.practicalStatus !== 'not_started' ? (
              <div className="space-y-4">
                {application.practicalAttempt?.githubUrl && (
                  <div>
                    <span className="block text-sm font-medium text-gray-700">GitHub URL</span>
                    <a href={application.practicalAttempt.githubUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                      {application.practicalAttempt.githubUrl}
                    </a>
                  </div>
                )}
                {application.practicalAttempt?.liveUrl && (
                  <div>
                    <span className="block text-sm font-medium text-gray-700">Live URL</span>
                    <a href={application.practicalAttempt.liveUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                      {application.practicalAttempt.liveUrl}
                    </a>
                  </div>
                )}
                {application.practicalAttempt?.description && (
                  <div>
                    <span className="block text-sm font-medium text-gray-700">Description/Notes</span>
                    <p className="text-gray-600 mt-1 whitespace-pre-wrap text-sm bg-gray-50 p-3 rounded-md border border-gray-200">
                      {application.practicalAttempt.description}
                    </p>
                  </div>
                )}
                
                <div className="pt-4 border-t border-gray-200 flex items-end gap-4">
                  <div>
                    <label htmlFor="practical-score" className="block text-sm font-medium text-gray-700 mb-1">Grade (0-100)</label>
                    <input 
                      id="practical-score"
                      type="number" 
                      min="0" 
                      max="100" 
                      value={practicalScore}
                      onChange={(e) => setPracticalScore(Number(e.target.value))}
                      className="block w-24 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    />
                  </div>
                  <button
                    onClick={handleGradePractical}
                    disabled={updating}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none disabled:opacity-50"
                  >
                    Save Hiring Task Score
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-gray-500 italic text-sm">The student has not started the hiring task yet.</p>
            )}
          </div>
        )}

        {/* Technical Interview Review */}
        {challenge.interviewRequired && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
              <MessageSquare className="w-5 h-5 mr-2 text-blue-500" /> Technical Interview Responses
            </h2>
            
            {application.interviewStatus !== 'not_started' ? (
              <div className="space-y-6">
                {application.interviewAttempt?.answers && Object.entries(application.interviewAttempt.answers).length > 0 ? (
                  <div className="space-y-4">
                    {Object.entries(application.interviewAttempt.answers).map(([qId, answer], idx) => (
                      <div key={qId} className="bg-gray-50 p-4 rounded-md border border-gray-200">
                        <span className="block text-xs font-medium text-gray-500 uppercase mb-2">Question {idx + 1}</span>
                        <p className="text-gray-700 whitespace-pre-wrap text-sm">{answer}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 italic text-sm">No answers submitted.</p>
                )}

                <div className="pt-4 border-t border-gray-200 space-y-4">
                  <div>
                    <label htmlFor="interview-feedback" className="block text-sm font-medium text-gray-700 mb-1">Interview Feedback (Visible to student if shortlisted/rejected)</label>
                    <textarea
                      id="interview-feedback"
                      rows={4}
                      value={interviewFeedback}
                      onChange={(e) => setInterviewFeedback(e.target.value)}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-3 border"
                      placeholder="Provide qualitative feedback on the student's technical interview performance..."
                    />
                  </div>
                  <div className="flex items-end gap-4">
                    <div>
                      <label htmlFor="interview-score" className="block text-sm font-medium text-gray-700 mb-1">Grade (0-100)</label>
                      <input 
                        id="interview-score"
                        type="number" 
                        min="0" 
                        max="100" 
                        value={interviewScore}
                        onChange={(e) => setInterviewScore(Number(e.target.value))}
                        className="block w-24 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2 px-3 border"
                      />
                    </div>
                    <button
                      onClick={handleGradeInterview}
                      disabled={updating}
                      className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none disabled:opacity-50"
                    >
                      Save Evaluation
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-gray-500 italic text-sm">The student has not started the interview stage yet.</p>
            )}
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
