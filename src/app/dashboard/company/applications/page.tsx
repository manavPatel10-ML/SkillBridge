"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ChallengeApplication, CompanyChallenge } from "@/types";
import { isCandidateStrongMatch } from "@/lib/candidate-matching";
import Link from "next/link";
import { 
  Users, 
  Search, 
  Loader2, 
  FileText,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  Briefcase
} from "lucide-react";

type EnrichedApplication = ChallengeApplication & {
  challengeTitle: string;
  studentName: string;
  studentEmail: string;
  isStrongMatch?: boolean;
};

export default function CompanyApplicationsPage() {
  const { user } = useAuth();
  const [applications, setApplications] = useState<EnrichedApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      if (!user) return;
      try {
        setLoading(true);
        // 1. Fetch Applications for this company
        const appsRef = collection(db, "challengeApplications");
        const q = query(appsRef, where("companyId", "==", user.uid));
        const appsSnap = await getDocs(q);
        
        const rawApps: ChallengeApplication[] = appsSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as ChallengeApplication[];

        if (rawApps.length === 0) {
          setApplications([]);
          setLoading(false);
          return;
        }

        // 2. Fetch Challenges to map titles and required skills
        const challengeIds = [...new Set(rawApps.map(a => a.challengeId))];
        const challengeMap: Record<string, string> = {};
        const challengeReqSkillsMap: Record<string, string[]> = {};
        
        const challengesQ = query(collection(db, "companyChallenges"), where("companyId", "==", user.uid));
        const challengesSnap = await getDocs(challengesQ);
        challengesSnap.forEach(doc => {
          const data = doc.data();
          challengeMap[doc.id] = data.title;
          challengeReqSkillsMap[doc.id] = data.requiredSkillIds || [];
        });

        // 3. Fetch Student Profiles to map names
        const studentIds = [...new Set(rawApps.map(a => a.studentId))];
        const studentMap: Record<string, {name: string, email: string}> = {};
        const studentVerifiedSkills: Record<string, Set<string>> = {};
        
        for (let i = 0; i < studentIds.length; i += 10) {
          const chunk = studentIds.slice(i, i + 10);
          const studentQ = query(collection(db, "studentProfiles"), where("__name__", "in", chunk));
          const studentSnap = await getDocs(studentQ);
          studentSnap.forEach(doc => {
            const data = doc.data();
            studentMap[doc.id] = {
              name: data.fullName || `${data.firstName || ''} ${data.lastName || ''}`.trim() || 'Unknown Student',
              email: data.email || 'No email'
            };
          });

          // Fetch skill scores for these students
          const scoresQ = query(collection(db, "skillScores"), where("studentId", "in", chunk));
          const scoresSnap = await getDocs(scoresQ);
          scoresSnap.forEach(doc => {
            const data = doc.data();
            if (!studentVerifiedSkills[data.studentId]) studentVerifiedSkills[data.studentId] = new Set<string>();
            if (data.isVerified) {
              studentVerifiedSkills[data.studentId].add(data.skillId);
            }
          });
        }

        // 4. Combine data
        const enriched: EnrichedApplication[] = rawApps.map(app => {
          const requiredSkills = challengeReqSkillsMap[app.challengeId] || [];
          const verifiedSet = studentVerifiedSkills[app.studentId] || new Set<string>();
          const isStrongMatch = isCandidateStrongMatch(requiredSkills, verifiedSet);

          return {
            ...app,
            challengeTitle: challengeMap[app.challengeId] || 'Unknown Challenge',
            studentName: studentMap[app.studentId]?.name || 'Unknown Student',
            studentEmail: studentMap[app.studentId]?.email || 'Unknown Email',
            isStrongMatch
          };
        });

        // Sort by appliedAt descending (newest first)
        enriched.sort((a, b) => new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime());

        setApplications(enriched);
      } catch (err) {
        console.error("Error fetching applications:", err);
        setError("Failed to load applications. Please try again later.");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [user]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'applied':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">Applied</span>;
      case 'in_progress':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">In Progress</span>;
      case 'submitted':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">Submitted</span>;
      case 'shortlisted':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"><CheckCircle className="w-3 h-3 mr-1"/> Shortlisted</span>;
      case 'hired':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800"><CheckCircle className="w-3 h-3 mr-1"/> Hired</span>;
      case 'rejected':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800"><XCircle className="w-3 h-3 mr-1"/> Rejected</span>;
      case 'completed':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">Completed</span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">{status}</span>;
    }
  };

  return (
    <ProtectedRoute allowedRoles={["company"]}>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Student Applications</h1>
            <p className="text-gray-500 mt-1">Review and manage candidates who have applied to your challenges.</p>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-lg">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : applications.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
              <Users className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">No Applications Yet</h3>
            <p className="text-gray-500 max-w-sm mx-auto mb-6">
              When students apply to your published challenges, their applications will appear here.
            </p>
            <Link 
              href="/dashboard/company/challenges"
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              <Briefcase className="w-4 h-4 mr-2" />
              Manage Challenges
            </Link>
          </div>
        ) : (
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <ul className="divide-y divide-gray-200">
              {applications.map((app) => (
                <li key={app.id}>
                  <Link href={`/dashboard/company/applications/${app.id}`} className="block hover:bg-gray-50 transition-colors">
                    <div className="px-4 py-4 sm:px-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center truncate">
                          <div className="flex-shrink-0 h-10 w-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-lg">
                            {app.studentName.charAt(0)}
                          </div>
                          <div className="ml-4 flex items-center gap-3">
                            <div className="truncate">
                              <p className="text-sm font-medium text-blue-600 truncate">{app.studentName}</p>
                              <p className="text-xs text-gray-500 truncate">{app.studentEmail}</p>
                            </div>
                            {app.isStrongMatch && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Strong Match
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="ml-2 flex-shrink-0 flex">
                          {getStatusBadge(app.status)}
                        </div>
                      </div>
                      <div className="mt-2 sm:flex sm:justify-between">
                        <div className="sm:flex">
                          <p className="flex items-center text-sm text-gray-500">
                            <Briefcase className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                            {app.challengeTitle}
                          </p>
                        </div>
                        <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                          <Clock className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                          <p>
                            Applied on <time dateTime={app.appliedAt}>{new Date(app.appliedAt).toLocaleDateString()}</time>
                          </p>
                        </div>
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
