"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { 
  Users, 
  Code, 
  Search, 
  CheckCircle,
  PlusCircle,
  AlertCircle,
  Briefcase,
  Clock
} from "lucide-react";
import Link from "next/link";
import { ChallengeApplication } from "@/types";

export default function CompanyDashboard() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ activeChallenges: 0, totalApplications: 0, hiredCandidates: 0 });
  const [recentApplications, setRecentApplications] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      
      try {
        // Fetch Profile
        const docRef = doc(db, "companyProfiles", user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setProfile(docSnap.data());
        }

        // Fetch Challenges
        const challengesQ = query(collection(db, "companyChallenges"), where("companyId", "==", user.uid));
        const challengesSnap = await getDocs(challengesQ);
        let activeCount = 0;
        const challengeMap: Record<string, string> = {};
        
        challengesSnap.forEach(doc => {
          const data = doc.data();
          challengeMap[doc.id] = data.title;
          if (data.status === 'published') {
            activeCount++;
          }
        });

        // Fetch Applications
        const appsQ = query(collection(db, "challengeApplications"), where("companyId", "==", user.uid));
        const appsSnap = await getDocs(appsQ);
        
        const rawApps: ChallengeApplication[] = [];
        let hiredCount = 0;
        
        appsSnap.forEach(doc => {
          const data = doc.data() as ChallengeApplication;
          data.id = doc.id;
          rawApps.push(data);
          if (data.status === 'shortlisted') {
            hiredCount++;
          }
        });

        setStats({
          activeChallenges: activeCount,
          totalApplications: rawApps.length,
          hiredCandidates: hiredCount
        });

        // For recent applications, we need student names
        // Sort by appliedAt
        rawApps.sort((a, b) => new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime());
        const top5 = rawApps.slice(0, 5);

        // Fetch student names for top 5
        const enrichedTop5 = [];
        for (const app of top5) {
          const sRef = doc(db, "studentProfiles", app.studentId);
          const sSnap = await getDoc(sRef);
          let studentName = "Unknown Student";
          if (sSnap.exists()) {
             const sData = sSnap.data();
             studentName = sData.fullName || `${sData.firstName || ''} ${sData.lastName || ''}`.trim() || 'Unknown Student';
          }
          enrichedTop5.push({
            ...app,
            challengeTitle: challengeMap[app.challengeId] || "Unknown Challenge",
            studentName
          });
        }
        
        setRecentApplications(enrichedTop5);

      } catch (err) {
        console.error("Error fetching dashboard data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  if (loading) {
    return <div className="animate-pulse space-y-4">
      <div className="h-8 bg-gray-200 rounded w-1/4"></div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="h-32 bg-gray-200 rounded-xl"></div>
        <div className="h-32 bg-gray-200 rounded-xl"></div>
        <div className="h-32 bg-gray-200 rounded-xl"></div>
      </div>
    </div>;
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'applied':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">Applied</span>;
      case 'in_progress':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">In Progress</span>;
      case 'submitted':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">Submitted</span>;
      case 'shortlisted':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1"/> Shortlisted</span>;
      case 'rejected':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800"><AlertCircle className="w-3 h-3 mr-1"/> Rejected</span>;
      case 'completed':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">Completed</span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome, {profile?.companyName || "Company"}
          </h1>
          <p className="text-gray-500 mt-1">Manage your challenges and review candidates.</p>
        </div>
        <div className="flex gap-3">
          <Link 
            href="/dashboard/company/search" 
            className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm"
          >
            <Search className="w-4 h-4 mr-2" />
            Find Candidates
          </Link>
          <Link 
            href="/dashboard/company/challenges/create"
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 shadow-sm"
          >
            <PlusCircle className="w-4 h-4 mr-2" />
            Create Challenge
          </Link>
        </div>
      </div>

      {profile?.verificationStatus === "pending" && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start">
          <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5 mr-3 flex-shrink-0" />
          <div>
            <h3 className="text-sm font-medium text-amber-800">Account Pending Verification</h3>
            <p className="text-sm text-amber-700 mt-1">
              Your company profile is currently being reviewed. You can create challenges, but they won't be visible to students until verification is complete.
            </p>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500">Active Challenges</p>
              <h3 className="text-2xl font-bold text-gray-900 mt-1">{stats.activeChallenges}</h3>
            </div>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Code className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Applications</p>
              <h3 className="text-2xl font-bold text-gray-900 mt-1">{stats.totalApplications}</h3>
            </div>
            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
              <Users className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500">Hired Candidates</p>
              <h3 className="text-2xl font-bold text-gray-900 mt-1">{stats.hiredCandidates}</h3>
            </div>
            <div className="p-2 bg-green-50 text-green-600 rounded-lg">
              <CheckCircle className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Recent Applications</h3>
        
        {recentApplications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
              <Users className="w-8 h-8 text-gray-400" />
            </div>
            <h4 className="text-md font-medium text-gray-900">No applications yet</h4>
            <p className="text-sm text-gray-500 mt-1 max-w-sm">
              Create a challenge to start receiving applications from verified students.
            </p>
            <Link 
              href="/dashboard/company/challenges/create"
              className="mt-4 inline-flex items-center px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Create your first challenge
            </Link>
          </div>
        ) : (
          <div className="overflow-hidden">
            <ul className="divide-y divide-gray-200">
              {recentApplications.map((app) => (
                <li key={app.id}>
                  <Link href={`/dashboard/company/applications/${app.id}`} className="block hover:bg-gray-50 transition-colors -mx-6 px-6 py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center truncate">
                        <div className="flex-shrink-0 h-10 w-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-lg">
                          {app.studentName.charAt(0)}
                        </div>
                        <div className="ml-4 truncate">
                          <p className="text-sm font-medium text-blue-600 truncate">{app.studentName}</p>
                          <p className="text-xs text-gray-500 flex items-center mt-0.5">
                            <Briefcase className="w-3 h-3 mr-1" />
                            {app.challengeTitle}
                          </p>
                        </div>
                      </div>
                      <div className="ml-2 flex-shrink-0 flex flex-col items-end">
                        {getStatusBadge(app.status)}
                        <span className="text-xs text-gray-400 mt-1 flex items-center">
                          <Clock className="w-3 h-3 mr-1" />
                          {new Date(app.appliedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mt-4 text-center border-t border-gray-100 pt-4">
              <Link 
                href="/dashboard/company/applications"
                className="text-sm font-medium text-blue-600 hover:text-blue-500"
              >
                View all applications
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
