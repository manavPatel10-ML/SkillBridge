"use client";

import { useState, useEffect, use } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import { 
  doc, getDoc, collection, query, where, getDocs, 
  addDoc, serverTimestamp, runTransaction 
} from "firebase/firestore";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { 
  CompanyChallenge, 
  ChallengeTheoryConfiguration,
  ChallengePracticalTask,
  ChallengeApplication,
  ChallengeApplicationStatus,
  ChallengeStageStatus
} from "@/types";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  ArrowLeft, 
  Loader2, 
  Briefcase, 
  Calendar, 
  Users, 
  BookOpen,
  Code,
  MessageSquare,
  CheckCircle,
  AlertCircle
} from "lucide-react";

export default function StudentChallengeDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useAuth();
  const router = useRouter();

  const [challenge, setChallenge] = useState<CompanyChallenge | null>(null);
  const [companyName, setCompanyName] = useState("Unknown Company");
  const [theoryConfig, setTheoryConfig] = useState<ChallengeTheoryConfiguration | null>(null);
  const [practicalTask, setPracticalTask] = useState<ChallengePracticalTask | null>(null);
  
  const [existingApp, setExistingApp] = useState<ChallengeApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      if (!user) return;
      try {
        const docRef = doc(db, "companyChallenges", id);
        const docSnap = await getDoc(docRef);
        
        if (!docSnap.exists() || docSnap.data().status !== "published") {
          setError("Vacancy not found or not available.");
          setLoading(false);
          return;
        }

        const data = { id: docSnap.id, ...docSnap.data() } as CompanyChallenge;
        setChallenge(data);

        // Fetch company name
        const cSnap = await getDocs(query(collection(db, "users"), where("uid", "==", data.companyId)));
        if (!cSnap.empty) {
          const profileDoc = await getDoc(doc(db, "companyProfiles", data.companyId));
          if (profileDoc.exists()) {
            setCompanyName(profileDoc.data().companyName || "Unknown Company");
          }
        }

        // Fetch theory config summary if needed
        if (data.theoryRequired) {
          const tSnap = await getDocs(query(collection(db, "challengeTheoryConfiguration"), where("challengeId", "==", id)));
          if (!tSnap.empty) {
            setTheoryConfig(tSnap.docs[0].data() as ChallengeTheoryConfiguration);
          }
        }

        // Fetch practical config summary if needed
        if (data.practicalRequired) {
          const pSnap = await getDocs(query(collection(db, "challengePracticalTasks"), where("challengeId", "==", id)));
          if (!pSnap.empty) {
            setPracticalTask(pSnap.docs[0].data() as ChallengePracticalTask);
          }
        }

        // Check if student has already applied
        const appQ = query(
          collection(db, "challengeApplications"),
          where("challengeId", "==", id),
          where("studentId", "==", user.uid)
        );
        const appSnap = await getDocs(appQ);
        if (!appSnap.empty) {
          setExistingApp({ id: appSnap.docs[0].id, ...appSnap.docs[0].data() } as ChallengeApplication);
        }

      } catch (err) {
        console.error("Error fetching challenge:", err);
        setError("Failed to load vacancy details.");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [id, user]);

  const handleApply = async () => {
    if (!user || !challenge) return;
    setApplying(true);
    
    try {
      // Use transaction to update applicant count and create application
      const challengeRef = doc(db, "companyChallenges", id);
      
      let newAppId = "";

      await runTransaction(db, async (transaction) => {
        const cDoc = await transaction.get(challengeRef);
        if (!cDoc.exists()) throw "Vacancy does not exist!";
        
        const cData = cDoc.data() as CompanyChallenge;
        
        if (cData.applicantCount >= cData.maxApplicants) {
          throw "Vacancy has reached maximum applicants.";
        }

        // Check again for existing application just in case
        const appQ = query(
          collection(db, "challengeApplications"),
          where("challengeId", "==", id),
          where("studentId", "==", user.uid)
        );
        const appSnap = await getDocs(appQ); // Note: getDocs isn't strictly inside the transaction lock for creation, but good enough for client side protection.
        if (!appSnap.empty) {
          throw "You have already applied for this vacancy.";
        }

        const newApp: Omit<ChallengeApplication, "id"> = {
          challengeId: id,
          studentId: user.uid,
          companyId: challenge.companyId,
          status: 'applied',
          appliedAt: new Date().toISOString(),
          theoryStatus: 'not_started',
          practicalStatus: 'not_started',
          interviewStatus: 'not_started',
          theoryScore: 0,
          practicalScore: 0,
          interviewScore: 0,
          overallScore: 0,
          integrityScore: 100,
        };

        const appRef = doc(db, "challengeApplications", `${user.uid}_${id}`);
        newAppId = appRef.id;
        
        transaction.set(appRef, newApp);
        transaction.update(challengeRef, { applicantCount: cData.applicantCount + 1 });
      });

      router.push(`/dashboard/student/company-challenges/${id}/attempt`);
    } catch (err: any) {
      console.error("Error applying:", err);
      alert(err || "Failed to apply. Please try again.");
      setApplying(false);
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

  if (error || !challenge) {
    return (
      <ProtectedRoute allowedRoles={["student"]}>
        <div className="max-w-4xl mx-auto space-y-6">
          <Link href="/dashboard/student/company-challenges" className="inline-flex items-center text-blue-600 hover:underline">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Vacancies
          </Link>
          <div className="bg-red-50 text-red-700 p-4 rounded-md text-sm border border-red-200 flex items-center">
             <AlertCircle className="w-5 h-5 mr-2" />
            {error || "Vacancy not found."}
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  const isFull = challenge.applicantCount >= challenge.maxApplicants;
  const deadlinePassed = new Date(challenge.applicationDeadline) < new Date();

  return (
    <ProtectedRoute allowedRoles={["student"]}>
      <div className="max-w-4xl mx-auto space-y-6 pb-12">
        <Link href="/dashboard/student/company-challenges" className="inline-flex items-center text-blue-600 hover:underline mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Vacancies
        </Link>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">{challenge.title}</h1>
                <p className="text-lg text-blue-600 font-medium mb-4">{companyName}</p>
                
                <div className="flex flex-wrap gap-y-3 gap-x-6 text-sm text-gray-600">
                  <span className="flex items-center bg-gray-100 px-3 py-1 rounded-full">
                    <Briefcase className="w-4 h-4 mr-1.5 text-gray-500" /> {challenge.jobRole}
                  </span>
                  <span className="flex items-center bg-gray-100 px-3 py-1 rounded-full">
                    <Calendar className="w-4 h-4 mr-1.5 text-gray-500" /> 
                    Deadline: {new Date(challenge.applicationDeadline).toLocaleDateString()}
                  </span>
                  <span className="flex items-center bg-gray-100 px-3 py-1 rounded-full">
                    <Users className="w-4 h-4 mr-1.5 text-gray-500" /> 
                    {challenge.applicantCount} / {challenge.maxApplicants} Applied
                  </span>
                </div>
              </div>

              <div className="shrink-0 w-full sm:w-auto">
                {existingApp ? (
                  <Link 
                    href={`/dashboard/student/company-challenges/${id}/attempt`}
                    className="w-full sm:w-auto inline-flex justify-center items-center px-6 py-3 border border-transparent rounded-lg shadow-sm text-base font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                  >
                    Go to Vacancy Dashboard
                  </Link>
                ) : isFull ? (
                  <button disabled className="w-full sm:w-auto inline-flex justify-center items-center px-6 py-3 border border-transparent rounded-lg shadow-sm text-base font-medium text-white bg-gray-400 cursor-not-allowed">
                    Vacancy Full
                  </button>
                ) : deadlinePassed ? (
                  <button disabled className="w-full sm:w-auto inline-flex justify-center items-center px-6 py-3 border border-transparent rounded-lg shadow-sm text-base font-medium text-white bg-gray-400 cursor-not-allowed">
                    Deadline Passed
                  </button>
                ) : (
                  <button 
                    onClick={handleApply}
                    disabled={applying}
                    className="w-full sm:w-auto inline-flex justify-center items-center px-8 py-3 border border-transparent rounded-lg shadow-sm text-base font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none transition-colors"
                  >
                    {applying ? (
                      <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Applying...</>
                    ) : (
                      <><CheckCircle className="w-5 h-5 mr-2" /> Apply Now</>
                    )}
                  </button>
                )}
              </div>
            </div>

            <div className="mt-8 pt-8 border-t border-gray-200">
              <h3 className="text-lg font-bold text-gray-900 mb-4">About this Vacancy</h3>
              <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{challenge.description}</p>
            </div>

            <div className="mt-8 pt-8 border-t border-gray-200">
              <h3 className="text-lg font-bold text-gray-900 mb-6">Vacancy Stages</h3>
              
              <div className="space-y-4">
                {challenge.theoryRequired && (
                  <div className="flex items-start p-5 bg-blue-50 border border-blue-100 rounded-lg">
                    <div className="bg-blue-100 p-2 rounded-lg mr-4">
                      <BookOpen className="w-6 h-6 text-blue-700" />
                    </div>
                    <div>
                      <h4 className="text-base font-semibold text-blue-900">Theory Assessment</h4>
                      <p className="text-sm text-blue-700 mt-1">
                        Multiple choice questions covering required skills.
                        {theoryConfig && ` Includes ${theoryConfig.questionCount} questions. You will have ${theoryConfig.timePerQuestionSeconds} seconds per question.`}
                      </p>
                    </div>
                  </div>
                )}

                {challenge.practicalRequired && (
                  <div className="flex items-start p-5 bg-purple-50 border border-purple-100 rounded-lg">
                    <div className="bg-purple-100 p-2 rounded-lg mr-4">
                      <Code className="w-6 h-6 text-purple-700" />
                    </div>
                    <div>
                      <h4 className="text-base font-semibold text-purple-900">Hiring Task</h4>
                      <p className="text-sm text-purple-700 mt-1">
                        {practicalTask ? (
                          <>
                            <strong>{practicalTask.title}</strong>: {practicalTask.instructions.substring(0, 100)}...
                            <br />
                            Time limit: {practicalTask.durationMinutes} minutes.
                          </>
                        ) : (
                          "A hands-on coding or implementation task to demonstrate your skills."
                        )}
                      </p>
                    </div>
                  </div>
                )}

                {challenge.interviewRequired && (
                  <div className="flex items-start p-5 bg-green-50 border border-green-100 rounded-lg">
                    <div className="bg-green-100 p-2 rounded-lg mr-4">
                      <MessageSquare className="w-6 h-6 text-green-700" />
                    </div>
                    <div>
                      <h4 className="text-base font-semibold text-green-900">Technical Interview</h4>
                      <p className="text-sm text-green-700 mt-1">
                        Written technical interview questions to evaluate your problem-solving process and depth of knowledge.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
