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
  ChallengeInterviewQuestion
} from "@/types";
import { useRouter } from "next/navigation";
import { 
  Loader2, 
  ArrowLeft, 
  CheckCircle2, 
  MessageSquare,
  AlertCircle
} from "lucide-react";
import Link from "next/link";

export default function InterviewStagePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useAuth();
  const router = useRouter();

  const [challenge, setChallenge] = useState<CompanyChallenge | null>(null);
  const [application, setApplication] = useState<ChallengeApplication | null>(null);
  const [questions, setQuestions] = useState<ChallengeInterviewQuestion[]>([]);
  
  const [answers, setAnswers] = useState<Record<string, string>>({});
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      if (!user) return;
      try {
        // Fetch Challenge
        const cQ = query(collection(db, "companyChallenges"), where("__name__", "==", id));
        const cSnap = await getDocs(cQ);
        if (cSnap.empty) {
          setError("Vacancy not found.");
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
        
        if (appData.interviewStatus === 'completed' && !['submitted', 'shortlisted', 'rejected', 'hired'].includes(appData.status)) {
          router.push(`/dashboard/student/company-challenges/${id}/attempt`);
          return;
        }
        
        setApplication(appData);

        // Fetch Interview Questions
        const qQ = query(collection(db, "challengeInterviewQuestions"), where("challengeId", "==", id));
        const qSnap = await getDocs(qQ);
        
        if (qSnap.empty) {
          setError("Interview questions missing.");
          setLoading(false);
          return;
        }
        
        const qList = qSnap.docs.map(d => ({ id: d.id, ...d.data() } as ChallengeInterviewQuestion));
        // Sort by some logic or just use as is (assuming ordered)
        setQuestions(qList);

        if (appData.interviewAttempt?.answers) {
          setAnswers(appData.interviewAttempt.answers);
        }

      } catch (err) {
        console.error("Error fetching interview stage:", err);
        setError("Failed to load interview stage.");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [id, user, router]);

  const handleAnswerChange = (questionId: string, text: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: text }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!application || submitting) return;
    
    // Validation
    const allAnswered = questions.every(q => answers[q.id!] && answers[q.id!].trim().length > 0);
    if (!allAnswered) {
      alert("Please answer all questions before submitting.");
      return;
    }
    
    const confirmSubmit = window.confirm("Are you sure you want to submit your interview? You cannot change your answers later.");
    if (!confirmSubmit) return;

    setSubmitting(true);
    setError(null);

    try {
      await updateDoc(doc(db, "challengeApplications", application.id!), {
        interviewStatus: "completed",
        "interviewAttempt.answers": answers,
        "interviewAttempt.submittedAt": new Date().toISOString()
      });
      
      router.push(`/dashboard/student/company-challenges/${id}/attempt`);
    } catch (err) {
      console.error("Error submitting interview:", err);
      setError("Failed to submit. Please try again.");
      setSubmitting(false);
    }
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
    <div className="max-w-4xl mx-auto py-8 pb-20">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6">
        <div className="border-b border-gray-200 bg-gray-50 p-6 flex flex-col justify-between">
          <h1 className="text-xl font-bold text-gray-900">{challenge?.title} - Interview Stage</h1>
          <p className="text-sm text-gray-500 mt-1">Answer the following questions to demonstrate your technical reasoning.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-600 text-sm flex items-start">
            <AlertCircle className="w-5 h-5 mr-2 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {questions.map((q, index) => (
          <div key={q.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              <span className="text-blue-600 mr-2">Q{index + 1}.</span> 
              {q.question}
            </h3>
            
            <div className="mt-4">
              <label htmlFor={`q-${q.id}`} className="sr-only">Your Answer</label>
              <textarea
                id={`q-${q.id}`}
                rows={6}
                value={answers[q.id!] || ""}
                onChange={(e) => handleAnswerChange(q.id!, e.target.value)}
                placeholder="Type your answer here..."
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm resize-y"
                required
                disabled={['submitted', 'shortlisted', 'rejected', 'hired'].includes(application?.status || '')}
              />
              <div className="mt-2 text-right text-xs text-gray-400">
                {(answers[q.id!] || "").length} characters
              </div>
            </div>
          </div>
        ))}

        <div className="mt-8 flex items-center justify-between bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <Link href={`/dashboard/student/company-challenges/${id}/attempt`} className="text-sm font-medium text-gray-500 hover:text-gray-700">
            Cancel and Return
          </Link>
          
          {!['submitted', 'shortlisted', 'rejected', 'hired'].includes(application?.status || '') && (
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex justify-center items-center py-2.5 px-6 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
            >
              {submitting ? (
                <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Submitting...</>
              ) : (
                <><CheckCircle2 className="w-5 h-5 mr-2" /> Submit Interview</>
              )}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
