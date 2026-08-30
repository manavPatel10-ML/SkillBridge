"use client";

import { useState, useEffect, use } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import { 
  doc, getDocs, collection, query, where, updateDoc, serverTimestamp, onSnapshot 
} from "firebase/firestore";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { 
  CompanyChallenge, 
  ChallengeApplication 
} from "@/types";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  ArrowLeft, 
  Loader2, 
  BookOpen,
  Code,
  MessageSquare,
  CheckCircle,
  PlayCircle,
  Lock
} from "lucide-react";

export default function ChallengeExecutionDashboard({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useAuth();
  const router = useRouter();

  const [challenge, setChallenge] = useState<CompanyChallenge | null>(null);
  const [application, setApplication] = useState<ChallengeApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [calculatingScore, setCalculatingScore] = useState(false);

  useEffect(() => {
    let unsubscribeApp: () => void;

    async function fetchData() {
      if (!user) return;
      try {
        // Fetch Challenge
        const cQ = query(collection(db, "companyChallenges"), where("__name__", "==", id));
        const cSnap = await getDocs(cQ);
        if (cSnap.empty) {
          setError("Challenge not found.");
          setLoading(false);
          return;
        }
        const cData = { id: cSnap.docs[0].id, ...cSnap.docs[0].data() } as CompanyChallenge;
        setChallenge(cData);

        // Fetch Application
        const appQ = query(
          collection(db, "challengeApplications"),
          where("challengeId", "==", id),
          where("studentId", "==", user.uid)
        );
        
        unsubscribeApp = onSnapshot(appQ, (appSnap) => {
          console.log("ATTEMPT DASHBOARD onSnapshot fired. Empty:", appSnap.empty, "From cache:", appSnap.metadata.fromCache);
          if (appSnap.empty) {
            // Document might be indexing in the emulator, don't show error immediately.
            // Since it's a listener, it will re-fire when the document appears.
            return;
          }
          const appData = { id: appSnap.docs[0].id, ...appSnap.docs[0].data() } as ChallengeApplication;
          console.log("ATTEMPT DASHBOARD Application data:", appData.status, appData.interviewStatus);
          setApplication(appData);
          setLoading(false);
        }, (err) => {
          console.error("Error listening to application:", err);
          setError("Failed to load dashboard.");
          setLoading(false);
        });

      } catch (err) {
        console.error("Error fetching execution dashboard:", err);
        setError("Failed to load dashboard.");
        setLoading(false);
      }
    }

    fetchData();

    return () => {
      if (unsubscribeApp) unsubscribeApp();
    };
  }, [id, user, router]);

  // Check if all required stages are complete to finalize the application
  useEffect(() => {
    if (!application || !challenge || !["applied", "in_progress"].includes(application.status) || calculatingScore) return;

    const theoryDone = !challenge.theoryRequired || application.theoryStatus === 'completed';
    const practicalDone = !challenge.practicalRequired || application.practicalStatus === 'completed';
    const interviewDone = !challenge.interviewRequired || application.interviewStatus === 'completed';

    console.log("ATTEMPT DASHBOARD stage statuses:", { theoryDone, practicalDone, interviewDone });

    if (theoryDone && practicalDone && interviewDone) {
      finalizeApplication();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [application, challenge]);

  const finalizeApplication = async () => {
    console.log("ATTEMPT DASHBOARD finalizeApplication called!", { 
      applicationStatus: application?.status, 
      calculatingScore 
    });
    if (!application || !challenge) return;
    // ONLY transition if we are in applied or in_progress
    if (application.status !== "applied" && application.status !== "in_progress") {
      return;
    }
    
    setCalculatingScore(true);

    try {
      const updateData = {
        status: "submitted",
        completedAt: new Date().toISOString()
      };
      
      console.log("ATTEMPT DASHBOARD updating doc with", updateData);

      await updateDoc(doc(db, "challengeApplications", application.id!), updateData);
      
      console.log("ATTEMPT DASHBOARD updateDoc success!");
      
      setApplication({ ...application, ...updateData as any });
    } catch (err) {
      console.error("Error finalizing application:", err);
    } finally {
      setCalculatingScore(false);
    }
  };

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={["student"]}>
        <div className="flex justify-center items-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </ProtectedRoute>
    );
  }

  if (error || !challenge || !application) {
    return (
      <ProtectedRoute allowedRoles={["student"]}>
        <div className="max-w-4xl mx-auto space-y-6">
          <Link href="/dashboard/student/company-challenges" className="inline-flex items-center text-blue-600 hover:underline">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Challenges
          </Link>
          <div className="bg-red-50 text-red-700 p-4 rounded-md text-sm border border-red-200">
            {error || "An error occurred."}
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  // Determine unlock status
  const theoryUnlocked = challenge.theoryRequired && application.theoryStatus !== 'completed';
  
  const practicalUnlocked = challenge.practicalRequired && 
    (!challenge.theoryRequired || application.theoryStatus === 'completed') &&
    application.practicalStatus !== 'completed';

  const interviewUnlocked = challenge.interviewRequired &&
    (!challenge.theoryRequired || application.theoryStatus === 'completed') &&
    (!challenge.practicalRequired || application.practicalStatus === 'completed') &&
    application.interviewStatus !== 'completed';

  const renderStageCard = (
    title: string, 
    icon: React.ReactNode, 
    isRequired: boolean, 
    status: string, 
    isUnlocked: boolean,
    route: string,
    score: number
  ) => {
    if (!isRequired) {
      return (
        <div className="border border-gray-200 rounded-lg p-6 bg-gray-50 flex items-center justify-between opacity-60">
          <div className="flex items-center gap-4">
            <div className="bg-gray-200 p-3 rounded-lg text-gray-500">
              {icon}
            </div>
            <div>
              <h3 className="font-bold text-gray-700">{title}</h3>
              <p className="text-sm text-gray-500">Not required for this challenge</p>
            </div>
          </div>
        </div>
      );
    }

    if (status === 'completed') {
      return (
        <div className="border border-green-200 rounded-lg p-6 bg-green-50 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-green-100 p-3 rounded-lg text-green-700">
              {icon}
            </div>
            <div>
              <h3 className="font-bold text-green-900">{title}</h3>
              <p className="text-sm text-green-700">Completed successfully</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <span className="block text-xs text-green-600 font-medium uppercase">Score</span>
              <span className="text-xl font-bold text-green-700">{score}%</span>
            </div>
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
        </div>
      );
    }

    if (isUnlocked) {
      return (
        <div className="border border-blue-200 rounded-lg p-6 bg-white shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-blue-100 p-3 rounded-lg text-blue-700">
              {icon}
            </div>
            <div>
              <h3 className="font-bold text-gray-900">{title}</h3>
              <p className="text-sm text-gray-500">
                {status === 'in_progress' ? 'Resume your attempt' : 'Ready to start'}
              </p>
            </div>
          </div>
          <Link
            href={`/dashboard/student/company-challenges/${id}/attempt/${route}`}
            className="inline-flex items-center justify-center px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            <PlayCircle className="w-4 h-4 mr-2" />
            {status === 'in_progress' ? 'Resume' : 'Start'}
          </Link>
        </div>
      );
    }

    // Locked state
    return (
      <div className="border border-gray-200 rounded-lg p-6 bg-gray-50 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="bg-gray-200 p-3 rounded-lg text-gray-500">
            <Lock className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-gray-700">{title}</h3>
            <p className="text-sm text-gray-500">Locked until previous stages are completed</p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <ProtectedRoute allowedRoles={["student"]}>
      <div className="max-w-4xl mx-auto space-y-6 pb-12">
        <Link href={`/dashboard/student/company-challenges/${id}`} className="inline-flex items-center text-blue-600 hover:underline mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Challenge Details
        </Link>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 sm:p-8 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{challenge.title}</h1>
                <p className="text-sm text-gray-500 mt-1">Application Dashboard</p>
              </div>
              
              {!['applied', 'in_progress'].includes(application.status) && (
                <div className={`px-4 py-2 rounded-full font-bold flex items-center shadow-sm ${
                  application.status === 'shortlisted' ? 'bg-green-100 text-green-800' :
                  application.status === 'rejected' ? 'bg-red-100 text-red-800' :
                  'bg-blue-100 text-blue-800'
                }`}>
                  <CheckCircle className="w-5 h-5 mr-2" />
                  {application.status === 'shortlisted' ? 'Shortlisted' :
                   application.status === 'rejected' ? 'Not Selected' :
                   'Application Submitted'}
                </div>
              )}
            </div>
          </div>

          <div className="p-6 sm:p-8 space-y-6">
            <div className="space-y-4">
              {renderStageCard(
                "1. Theory Assessment", 
                <BookOpen className="w-6 h-6" />, 
                challenge.theoryRequired, 
                application.theoryStatus, 
                theoryUnlocked, 
                "theory",
                application.theoryScore
              )}

              {renderStageCard(
                "2. Practical Challenge", 
                <Code className="w-6 h-6" />, 
                challenge.practicalRequired, 
                application.practicalStatus, 
                practicalUnlocked, 
                "practical",
                application.practicalScore
              )}

              {renderStageCard(
                "3. Technical Interview", 
                <MessageSquare className="w-6 h-6" />, 
                challenge.interviewRequired, 
                application.interviewStatus, 
                interviewUnlocked, 
                "interview",
                application.interviewScore
              )}
            </div>

            {!['applied', 'in_progress'].includes(application.status) && (
              <div className="mt-8 p-6 bg-blue-50 border border-blue-200 rounded-lg text-center">
                <h3 className="text-lg font-bold text-blue-900 mb-2">Application Status</h3>
                <div className="text-2xl font-black text-blue-700 capitalize">{application.status.replace('_', ' ')}</div>
                <p className="text-sm text-blue-600 mt-2">
                  Your application has been successfully submitted to the company.
                </p>
                {application.overallScore > 0 && (
                  <div className="mt-4 pt-4 border-t border-blue-200">
                    <span className="text-sm text-blue-600">Overall Score: </span>
                    <span className="font-bold text-blue-800">{application.overallScore}%</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
