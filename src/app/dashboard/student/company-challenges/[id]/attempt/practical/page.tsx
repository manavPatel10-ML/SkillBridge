"use client";

import { useState, useEffect, use } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import { 
  doc, getDocs, collection, query, where, updateDoc, serverTimestamp 
} from "firebase/firestore";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { 
  CompanyChallenge, 
  ChallengeApplication,
  ChallengePracticalTask
} from "@/types";
import { useRouter } from "next/navigation";
import { 
  Loader2, 
  ArrowLeft, 
  CheckCircle2, 
  AlertCircle,
  GitBranch as Github,
  Link as LinkIcon,
  Clock
} from "lucide-react";
import Link from "next/link";

export default function PracticalStagePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useAuth();
  const router = useRouter();

  const [challenge, setChallenge] = useState<CompanyChallenge | null>(null);
  const [application, setApplication] = useState<ChallengeApplication | null>(null);
  const [practicalTask, setPracticalTask] = useState<ChallengePracticalTask | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [githubUrl, setGithubUrl] = useState("");
  const [liveUrl, setLiveUrl] = useState("");

  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [isTimeUp, setIsTimeUp] = useState(false);

  useEffect(() => {
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
        setChallenge({ id: cSnap.docs[0].id, ...cSnap.docs[0].data() } as CompanyChallenge);

        // Fetch Application
        const appQ = query(
          collection(db, "challengeApplications"),
          where("challengeId", "==", id),
          where("studentId", "==", user.uid)
        );
        const appSnap = await getDocs(appQ);
        if (appSnap.empty) {
          router.push(`/dashboard/student/company-challenges/${id}`);
          return;
        }
        const appData = { id: appSnap.docs[0].id, ...appSnap.docs[0].data() } as ChallengeApplication;
        
        if (appData.practicalStatus === 'completed') {
          router.push(`/dashboard/student/company-challenges/${id}/attempt`);
          return;
        }
        
        setApplication(appData);

        // Fetch Practical Config
        const pSnap = await getDocs(query(collection(db, "challengePracticalTasks"), where("challengeId", "==", id)));
        if (pSnap.empty) {
          setError("Practical configuration missing.");
          setLoading(false);
          return;
        }
        const pData = pSnap.docs[0].data() as ChallengePracticalTask;
        setPracticalTask(pData);

        // Initialize practical attempt if not started
        let startedAt = appData.practicalAttempt?.startedAt;
        if (!startedAt) {
          startedAt = new Date().toISOString();
          await updateDoc(doc(db, "challengeApplications", appData.id!), {
            "practicalAttempt.startedAt": startedAt,
            practicalStatus: "in_progress"
          });
        }
        
        // Calculate remaining time
        const startTimeMs = new Date(startedAt).getTime();
        const durationMs = pData.durationMinutes * 60 * 1000;
        const endTimeMs = startTimeMs + durationMs;
        const nowMs = Date.now();

        if (nowMs >= endTimeMs) {
          setIsTimeUp(true);
          setTimeLeft(0);
        } else {
          setTimeLeft(Math.floor((endTimeMs - nowMs) / 1000));
        }

      } catch (err) {
        console.error("Error fetching practical stage:", err);
        setError("Failed to load practical stage.");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [id, user, router]);

  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0 || isTimeUp) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev === null || prev <= 1) {
          clearInterval(timer);
          setIsTimeUp(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, isTimeUp]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!application || submitting || isTimeUp) return;

    // Optional validation
    let valid = false;
    if (practicalTask?.submissionTypes.includes("github") && !githubUrl) {
       setError("GitHub URL is required");
       return;
    }
    if (practicalTask?.submissionTypes.includes("live_url") && !liveUrl) {
       setError("Live URL is required");
       return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await updateDoc(doc(db, "challengeApplications", application.id!), {
        practicalStatus: "completed",
        "practicalAttempt.githubUrl": githubUrl || null,
        "practicalAttempt.liveUrl": liveUrl || null,
        "practicalAttempt.submittedAt": new Date().toISOString()
      });
      
      router.push(`/dashboard/student/company-challenges/${id}/attempt`);
    } catch (err) {
      console.error("Error submitting practical:", err);
      setError("Failed to submit. Please try again.");
      setSubmitting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    return `${m}m ${s}s`;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error && !application) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <div className="bg-red-50 text-red-700 p-6 rounded-md shadow-sm border border-red-200">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6">
        <div className="border-b border-gray-200 bg-gray-50 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{challenge?.title} - Practical</h1>
            <p className="text-sm text-gray-500 mt-1">{practicalTask?.title}</p>
          </div>
          
          <div className={`flex items-center px-4 py-2 rounded-lg font-bold border ${
            isTimeUp ? 'bg-red-50 text-red-700 border-red-200' : 
            (timeLeft !== null && timeLeft < 300) ? 'bg-orange-50 text-orange-700 border-orange-200' : 
            'bg-blue-50 text-blue-700 border-blue-200'
          }`}>
            <Clock className="w-5 h-5 mr-2" />
            {isTimeUp ? "Time Expired" : timeLeft !== null ? formatTime(timeLeft) : "--:--"}
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Instructions</h3>
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-100 text-gray-800 whitespace-pre-wrap">
              {practicalTask?.instructions}
            </div>
          </div>
          
          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Requirements</h3>
            <ul className="list-disc pl-5 space-y-1 text-gray-800">
              {practicalTask?.requirements.map((req, i) => (
                <li key={i}>{req}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Submit Your Work</h2>
        
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md text-red-600 text-sm flex items-start">
            <AlertCircle className="w-5 h-5 mr-2 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-6">
          {practicalTask?.submissionTypes.includes("github") && (
            <div>
              <label htmlFor="githubUrl" className="block text-sm font-medium text-gray-700 mb-1">
                GitHub Repository URL <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Github className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="url"
                  id="githubUrl"
                  value={githubUrl}
                  onChange={(e) => setGithubUrl(e.target.value)}
                  className="pl-10 block w-full rounded-md border-gray-300 border py-2.5 px-3 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="https://github.com/username/repo"
                  required
                  disabled={isTimeUp || submitting}
                />
              </div>
            </div>
          )}

          {practicalTask?.submissionTypes.includes("live_url") && (
            <div>
              <label htmlFor="liveUrl" className="block text-sm font-medium text-gray-700 mb-1">
                Live Deployment URL <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <LinkIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="url"
                  id="liveUrl"
                  value={liveUrl}
                  onChange={(e) => setLiveUrl(e.target.value)}
                  className="pl-10 block w-full rounded-md border-gray-300 border py-2.5 px-3 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="https://my-project.vercel.app"
                  required
                  disabled={isTimeUp || submitting}
                />
              </div>
            </div>
          )}
        </div>

        <div className="mt-8 flex items-center justify-between">
          <Link href={`/dashboard/student/company-challenges/${id}/attempt`} className="text-sm font-medium text-gray-500 hover:text-gray-700">
            Cancel and Return
          </Link>
          
          <button
            type="submit"
            disabled={submitting || isTimeUp}
            className="inline-flex justify-center items-center py-2.5 px-6 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
          >
            {submitting ? (
              <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Submitting...</>
            ) : isTimeUp ? (
              "Time Expired"
            ) : (
              <><CheckCircle2 className="w-5 h-5 mr-2" /> Submit Task</>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
