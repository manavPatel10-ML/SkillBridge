"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc, collection, query, where, getDocs } from "firebase/firestore";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useParams, useRouter } from "next/navigation";
import { CompanyChallenge, ChallengeApplication } from "@/types";
import { isCandidateStrongMatch } from "@/lib/candidate-matching";
import Link from "next/link";
import { 
  ArrowLeft, 
  Loader2, 
  Briefcase, 
  Calendar, 
  Users, 
  Edit2,
  CheckCircle,
  Archive,
  XCircle,
  BookOpen,
  Code,
  MessageSquare,
  Sparkles
} from "lucide-react";

export default function ChallengeDetailsPage() {
  const { user } = useAuth();
  const params = useParams();
  const router = useRouter();
  
  const [challenge, setChallenge] = useState<CompanyChallenge | null>(null);
  const [matchedCount, setMatchedCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchChallenge() {
      if (!user || !params.id) return;
      try {
        const docRef = doc(db, "companyChallenges", params.id as string);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = { id: docSnap.id, ...docSnap.data() } as CompanyChallenge;
          if (data.companyId !== user.uid) {
            setError("You do not have permission to view this challenge.");
          } else {
            setChallenge(data);

            // Fetch applications and calculate strong matches
            const appSnap = await getDocs(query(collection(db, "challengeApplications"), where("challengeId", "==", data.id)));
            const applicantIds = new Set<string>();
            appSnap.forEach(d => applicantIds.add(d.data().studentId));
            
            let mCount = 0;
            
            if (data.requiredSkillIds && data.requiredSkillIds.length > 0) {
              // Note: For a very large number of applicants, this O(N) loop should be moved to a backend Cloud Function. 
              // For MVP, this client-side aggregation is acceptable.
              for (const sId of applicantIds) {
                const scoresSnap = await getDocs(query(collection(db, "skillScores"), where("studentId", "==", sId)));
                const verified = new Set<string>();
                scoresSnap.forEach(d => {
                  if (d.data().isVerified) verified.add(d.data().skillId);
                });
                
                const isStrongMatch = isCandidateStrongMatch(data.requiredSkillIds, verified);
                if (isStrongMatch) mCount++;
              }
            } else {
              mCount = -1; // If no skills required, mark as -1
            }
            
            setMatchedCount(mCount);
          }
        } else {
          setError("Challenge not found.");
        }
      } catch (err) {
        console.error("Error fetching challenge:", err);
        setError("Failed to load challenge details.");
      } finally {
        setLoading(false);
      }
    }

    fetchChallenge();
  }, [user, params.id]);

  const handleUpdateStatus = async (newStatus: CompanyChallenge['status']) => {
    if (!challenge) return;
    try {
      const updateData: Partial<CompanyChallenge> = {
        status: newStatus,
        updatedAt: new Date().toISOString()
      };
      
      if (newStatus === 'published' && !challenge.publishedAt) {
        updateData.publishedAt = new Date().toISOString();
      }
      
      await updateDoc(doc(db, "companyChallenges", challenge.id!), updateData);
      setChallenge({ ...challenge, ...updateData });
    } catch (err) {
      console.error("Error updating status:", err);
      alert("Failed to update challenge status.");
    }
  };

  const getStatusBadge = (status: CompanyChallenge['status']) => {
    switch (status) {
      case 'published':
        return <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800"><CheckCircle className="w-4 h-4 mr-1.5" /> Published</span>;
      case 'draft':
        return <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800"><Edit2 className="w-4 h-4 mr-1.5" /> Draft</span>;
      case 'closed':
        return <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800"><XCircle className="w-4 h-4 mr-1.5" /> Closed</span>;
      case 'archived':
        return <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800"><Archive className="w-4 h-4 mr-1.5" /> Archived</span>;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={["company"]}>
        <div className="flex justify-center items-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </ProtectedRoute>
    );
  }

  if (error || !challenge) {
    return (
      <ProtectedRoute allowedRoles={["company"]}>
        <div className="max-w-4xl mx-auto space-y-6">
          <Link href="/dashboard/company/challenges" className="inline-flex items-center text-blue-600 hover:underline">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Vacancies
          </Link>
          <div className="bg-red-50 text-red-700 p-4 rounded-md text-sm border border-red-200">
            {error || "Vacancy not found."}
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={["company"]}>
      <div className="max-w-5xl mx-auto space-y-6 pb-12">
        <Link href="/dashboard/company/challenges" className="inline-flex items-center text-blue-600 hover:underline mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Vacancies
        </Link>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-2xl font-bold text-gray-900">{challenge.title}</h1>
                  {getStatusBadge(challenge.status)}
                </div>
                <div className="flex flex-wrap items-center gap-y-2 gap-x-6 text-sm text-gray-500 mt-3">
                  <span className="flex items-center">
                    <Briefcase className="w-4 h-4 mr-1.5" /> {challenge.jobRole}
                  </span>
                  <span className="flex items-center">
                    <Calendar className="w-4 h-4 mr-1.5" /> Deadline: {new Date(challenge.applicationDeadline).toLocaleDateString()}
                  </span>
                  <span className="flex items-center">
                    <Users className="w-4 h-4 mr-1.5" /> {challenge.applicantCount} / {challenge.maxApplicants} Applicants
                  </span>
                  {matchedCount === -1 ? (
                    <span className="flex items-center text-gray-700 bg-gray-50 px-2 py-0.5 rounded-full font-medium border border-gray-200">
                      <Sparkles className="w-3.5 h-3.5 mr-1.5" /> No specific skills required
                    </span>
                  ) : (
                    <span className="flex items-center text-green-700 bg-green-50 px-2 py-0.5 rounded-full font-medium border border-green-200">
                      <Sparkles className="w-3.5 h-3.5 mr-1.5" /> {matchedCount} Strong Matches
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {(challenge.status === 'draft' || challenge.status === 'published') && (
                  <Link
                    href={`/dashboard/company/challenges/${challenge.id}/edit`}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    <Edit2 className="w-4 h-4 mr-2" /> Edit
                  </Link>
                )}
                
                {challenge.status === 'draft' && (
                  <button
                    onClick={() => handleUpdateStatus('published')}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" /> Publish
                  </button>
                )}
                
                {challenge.status === 'published' && (
                  <button
                    onClick={() => handleUpdateStatus('closed')}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700"
                  >
                    <XCircle className="w-4 h-4 mr-2" /> Close Applications
                  </button>
                )}

                {(challenge.status === 'published' || challenge.status === 'closed') && (
                  <button
                    onClick={() => handleUpdateStatus('archived')}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-yellow-600 hover:bg-yellow-700"
                  >
                    <Archive className="w-4 h-4 mr-2" /> Archive
                  </button>
                )}
              </div>
            </div>

            <div className="mt-8 pt-8 border-t border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Description</h3>
              <p className="text-gray-700 whitespace-pre-wrap">{challenge.description}</p>
            </div>

            <div className="mt-8 pt-8 border-t border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Assessment Stages</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                <div className={`border rounded-lg p-5 ${challenge.theoryRequired ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'}`}>
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`p-2 rounded-md ${challenge.theoryRequired ? 'bg-blue-100 text-blue-600' : 'bg-gray-200 text-gray-400'}`}>
                      <BookOpen className="w-5 h-5" />
                    </div>
                    <h4 className={`font-semibold ${challenge.theoryRequired ? 'text-blue-900' : 'text-gray-500'}`}>Theory</h4>
                  </div>
                  <p className={`text-sm mt-2 ${challenge.theoryRequired ? 'text-blue-700' : 'text-gray-500'}`}>
                    {challenge.theoryRequired ? 'Theory assessment configured and enabled.' : 'No theory assessment required.'}
                  </p>
                </div>

                <div className={`border rounded-lg p-5 ${challenge.practicalRequired ? 'bg-purple-50 border-purple-200' : 'bg-gray-50 border-gray-200'}`}>
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`p-2 rounded-md ${challenge.practicalRequired ? 'bg-purple-100 text-purple-600' : 'bg-gray-200 text-gray-400'}`}>
                      <Code className="w-5 h-5" />
                    </div>
                    <h4 className={`font-semibold ${challenge.practicalRequired ? 'text-purple-900' : 'text-gray-500'}`}>Hiring Task</h4>
                  </div>
                  <p className={`text-sm mt-2 ${challenge.practicalRequired ? 'text-purple-700' : 'text-gray-500'}`}>
                    {challenge.practicalRequired ? 'Hiring task and evaluation criteria configured.' : 'No hiring task required.'}
                  </p>
                </div>

                <div className={`border rounded-lg p-5 ${challenge.interviewRequired ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`p-2 rounded-md ${challenge.interviewRequired ? 'bg-green-100 text-green-600' : 'bg-gray-200 text-gray-400'}`}>
                      <MessageSquare className="w-5 h-5" />
                    </div>
                    <h4 className={`font-semibold ${challenge.interviewRequired ? 'text-green-900' : 'text-gray-500'}`}>Interview</h4>
                  </div>
                  <p className={`text-sm mt-2 ${challenge.interviewRequired ? 'text-green-700' : 'text-gray-500'}`}>
                    {challenge.interviewRequired ? 'Technical interview questions configured.' : 'No technical interview required.'}
                  </p>
                </div>
                
              </div>
            </div>

          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
