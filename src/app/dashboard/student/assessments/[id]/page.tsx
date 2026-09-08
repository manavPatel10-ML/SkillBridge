"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState, use } from "react";
import { db } from "@/lib/firebase";
import { collection, doc, getDoc, getDocs, query, where, addDoc, serverTimestamp } from "firebase/firestore";
import { Loader2, ArrowLeft, Clock, BookOpen, Target, CheckCircle2, AlertCircle } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

type Assessment = {
  id: string;
  skillId: string;
  title: string;
  description: string;
  difficulty: string;
  totalQuestions: number;
  passingScore: number;
  timePerQuestionSeconds?: number;
};

function formatDuration(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (seconds === 0) {
    return `${minutes} Minutes`;
  }

  return `${minutes} Minutes ${seconds} Seconds`;
}

type Attempt = {
  id: string;
  assessmentId: string;
  status: "in_progress" | "completed";
  score?: number;
  percentage?: number;
  createdAt: any;
  questionIds?: string[];
};

export default function AssessmentDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const recId = searchParams.get('recId');
  
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      try {
        // Fetch Assessment Details
        const assessmentRef = doc(db, "assessments", id);
        const assessmentSnap = await getDoc(assessmentRef);
        
        if (assessmentSnap.exists()) {
          setAssessment({ id: assessmentSnap.id, ...assessmentSnap.data() } as Assessment);
        }

        // Fetch user's attempts for this assessment
        const attemptsSnap = await getDocs(
          query(
            collection(db, "assessmentAttempts"), 
            where("studentId", "==", user.uid),
            where("assessmentId", "==", id)
          )
        );
        
        setAttempts(attemptsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Attempt)));

      } catch (error) {
        console.error("Error fetching assessment details:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, id]);

  const handleStart = async () => {
    if (!user || !assessment) return;
    setStarting(true);
    
    try {
      // Check for existing in_progress attempt
      const inProgressAttempt = attempts.find(a => a.status === "in_progress");
      if (inProgressAttempt) {
        let url = `/dashboard/student/assessments/${assessment.id}/take?attemptId=${inProgressAttempt.id}`;
        if (recId) url += `&recId=${recId}`;
        router.push(url);
        return;
      }

      // 1. Collect previously used question IDs to avoid repeats
      const usedQuestionIds = new Set<string>();
      attempts.forEach(a => {
        if (a.questionIds) {
          a.questionIds.forEach((qId: string) => usedQuestionIds.add(qId));
        }
      });

      // 2. Fetch all active questions for this assessment
      const questionsSnap = await getDocs(
        query(
          collection(db, "assessmentQuestions"),
          where("assessmentId", "==", assessment.id),
          where("active", "==", true)
        )
      );

      const allQuestions = questionsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      // 3. Separate by difficulty
      const easyQs = allQuestions.filter(q => (q as any).difficulty === "easy");
      const mediumQs = allQuestions.filter(q => (q as any).difficulty === "medium");
      const hardQs = allQuestions.filter(q => (q as any).difficulty === "hard");

      // 4. Helper to select questions preferring unused
      const selectQuestions = (qs: any[], count: number) => {
        const unused = qs.filter(q => !usedQuestionIds.has(q.id));
        const used = qs.filter(q => usedQuestionIds.has(q.id));
        
        // Shuffle arrays
        const shuffle = (array: any[]) => array.sort(() => Math.random() - 0.5);
        
        const shuffledUnused = shuffle(unused);
        const shuffledUsed = shuffle(used);
        
        // Take from unused first, then used if needed
        const selected = [...shuffledUnused, ...shuffledUsed].slice(0, count);
        return selected.map(q => q.id);
      };

      // Distribution: 30% easy (3), 50% medium (5), 20% hard (2) for 10 total questions
      // If total is not 10, calculate dynamically, but we assume 10 for MVP
      const total = assessment.totalQuestions;
      const easyCount = Math.round(total * 0.3);
      const hardCount = Math.round(total * 0.2);
      const mediumCount = total - easyCount - hardCount;

      const selectedIds = [
        ...selectQuestions(easyQs, easyCount),
        ...selectQuestions(mediumQs, mediumCount),
        ...selectQuestions(hardQs, hardCount)
      ];

      // Shuffle final selected IDs so they aren't always in easy -> medium -> hard order
      const finalSelectedIds = selectedIds.sort(() => Math.random() - 0.5);

      // Create new attempt
      const attemptRef = await addDoc(collection(db, "assessmentAttempts"), {
        studentId: user.uid,
        assessmentId: assessment.id,
        skillId: assessment.skillId, // Store skillId for easier reporting later
        status: "in_progress",
        answers: {}, // to store answers by question ID
        questionIds: finalSelectedIds,
        currentQuestionIndex: 0,
        createdAt: serverTimestamp(),
        startedAt: serverTimestamp(), // Explicitly track when it started
        integrityEvents: [],
        violationCount: 0,
        integrityScore: 100,
        suspicious: false,
      });

      let url = `/dashboard/student/assessments/${assessment.id}/take?attemptId=${attemptRef.id}`;
      if (recId) url += `&recId=${recId}`;
      router.push(url);
    } catch (error) {
      console.error("Error starting assessment:", error);
      setStarting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!assessment) {
    return (
      <div className="text-center py-12">
        <h3 className="text-xl font-bold text-gray-900">Assessment not found</h3>
        <Link href="/dashboard/student/assessments" className="mt-4 text-blue-600 hover:underline inline-block">
          Return to assessments
        </Link>
      </div>
    );
  }

  const completedAttempts = attempts.filter(a => a.status === "completed");
  const inProgressAttempt = attempts.find(a => a.status === "in_progress");
  
  const bestAttempt = completedAttempts.length > 0 
    ? completedAttempts.reduce((prev, current) => (prev.percentage || 0) > (current.percentage || 0) ? prev : current)
    : null;

  const passed = bestAttempt && (bestAttempt.percentage || 0) >= assessment.passingScore;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Link href="/dashboard/student/assessments" className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-900">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Assessments
      </Link>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <div>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mb-3">
                {assessment.difficulty}
              </span>
              <h1 className="text-3xl font-bold text-gray-900">{assessment.title}</h1>
            </div>
            
            {passed && (
              <div className="flex items-center text-green-700 bg-green-50 px-4 py-2 rounded-full font-medium">
                <CheckCircle2 className="w-5 h-5 mr-2" />
                Passed
              </div>
            )}
          </div>

          <p className="text-lg text-gray-600 mb-8">{assessment.description}</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="flex items-center p-4 bg-gray-50 rounded-lg border border-gray-100">
              <Clock className="w-8 h-8 text-blue-500 mr-4" />
              <div>
                <p className="text-sm font-medium text-gray-500">Duration</p>
                <p className="text-lg font-bold text-gray-900">{formatDuration(assessment.totalQuestions * (assessment.timePerQuestionSeconds || 30))}</p>
              </div>
            </div>
            
            <div className="flex items-center p-4 bg-gray-50 rounded-lg border border-gray-100">
              <BookOpen className="w-8 h-8 text-indigo-500 mr-4" />
              <div>
                <p className="text-sm font-medium text-gray-500">Questions</p>
                <p className="text-lg font-bold text-gray-900">{assessment.totalQuestions}</p>
              </div>
            </div>
            
            <div className="flex items-center p-4 bg-gray-50 rounded-lg border border-gray-100">
              <Target className="w-8 h-8 text-purple-500 mr-4" />
              <div>
                <p className="text-sm font-medium text-gray-500">Passing Score</p>
                <p className="text-lg font-bold text-gray-900">{assessment.passingScore}%</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between border-t border-gray-100 pt-8">
            <div>
              {completedAttempts.length > 0 && (
                <p className="text-sm text-gray-600">
                  You have attempted this assessment <span className="font-bold text-gray-900">{completedAttempts.length} times</span>.
                  {bestAttempt && (
                    <span> Best score: <span className="font-bold text-gray-900">{bestAttempt.percentage}%</span></span>
                  )}
                </p>
              )}
            </div>
            
            <button
              onClick={handleStart}
              disabled={starting}
              className="w-full sm:w-auto flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 md:text-lg transition-colors disabled:opacity-50"
            >
              {starting && <Loader2 className="w-5 h-5 mr-2 animate-spin" />}
              {starting ? "Starting..." : inProgressAttempt ? "Resume Assessment" : completedAttempts.length > 0 ? "Retake Assessment" : "Start Assessment"}
            </button>
          </div>
        </div>
      </div>
      
      {/* History section if attempts exist */}
      {completedAttempts.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h2 className="font-semibold text-gray-900 flex items-center">
              History
            </h2>
          </div>
          <div className="divide-y divide-gray-200">
            {completedAttempts
              .sort((a, b) => b.createdAt?.toMillis() - a.createdAt?.toMillis())
              .map((attempt, idx) => (
              <div key={attempt.id} className="p-6 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">Attempt {completedAttempts.length - idx}</p>
                  <p className="text-sm text-gray-500">
                    {attempt.createdAt ? new Date(attempt.createdAt.toDate()).toLocaleDateString() : 'Recently'}
                  </p>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <p className={`font-bold text-lg ${(attempt.percentage || 0) >= assessment.passingScore ? 'text-green-600' : 'text-red-600'}`}>
                      {attempt.percentage}%
                    </p>
                    <p className="text-xs text-gray-500">
                      {attempt.score} / {assessment.totalQuestions * 10} points
                    </p>
                  </div>
                  <Link 
                    href={`/dashboard/student/assessments/${assessment.id}/result/${attempt.id}`}
                    className="px-3 py-1 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-md transition-colors border border-blue-200"
                  >
                    View
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
