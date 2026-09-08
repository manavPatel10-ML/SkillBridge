"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState, use } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { Loader2, ArrowLeft, CheckCircle2, XCircle, Trophy, RotateCcw, ShieldAlert, ShieldCheck, Terminal } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PostCompletionNextAction } from "@/components/learning/PostCompletionNextAction";
import { EngagementAuditService } from "@/lib/pilot-engagement-audit";

type Question = {
  id: string;
  question: string;
  options: string[];
  correctAnswer: string;
  points: number;
  explanation: string;
};

type Assessment = {
  id: string;
  title: string;
  passingScore: number;
  skillId: string;
};

type Attempt = {
  id: string;
  status: string;
  score: number;
  maxScore: number;
  percentage: number;
  answers: Record<string, string>;
  completedAt: any;
  questionIds: string[];
  integrityScore?: number;
  violationCount?: number;
  suspicious?: boolean;
};

export default function AssessmentResultPage({ params }: { params: Promise<{ id: string, attemptId: string }> }) {
  const { id, attemptId } = use(params);
  const { user } = useAuth();
  const router = useRouter();
  
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      try {
        const assessmentRef = doc(db, "assessments", id);
        const assessmentSnap = await getDoc(assessmentRef);
        if (assessmentSnap.exists()) {
          setAssessment({ id: assessmentSnap.id, ...assessmentSnap.data() } as Assessment);
        }

        const attemptRef = doc(db, "assessmentAttempts", attemptId);
        const attemptSnap = await getDoc(attemptRef);
        if (attemptSnap.exists()) {
          const attemptData = { id: attemptSnap.id, ...attemptSnap.data() } as Attempt;
          
          if (attemptData.status !== "completed") {
            router.replace(`/dashboard/student/assessments/${id}/take?attemptId=${attemptId}`);
            return;
          }
          
          setAttempt(attemptData);

          // Fetch only the questions that were part of this attempt
          if (attemptData.questionIds && attemptData.questionIds.length > 0) {
            const fetchedQuestions: Question[] = [];
            for (const qId of attemptData.questionIds) {
              const qSnap = await getDoc(doc(db, "assessmentQuestions", qId));
              if (qSnap.exists()) {
                fetchedQuestions.push({ id: qSnap.id, ...qSnap.data() } as Question);
              }
            }
            setQuestions(fetchedQuestions);
          }
        } else {
          console.error("Attempt not found");
          router.replace(`/dashboard/student/assessments/${id}`);
        }

      } catch (error) {
        console.error("Error fetching result data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, id, attemptId, router]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen pb-32">
        <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!assessment || !attempt) {
    return (
      <div className="text-center py-12">
        <h3 className="text-xl font-bold text-gray-900">Result not found</h3>
        <Link href="/dashboard/student/assessments" className="mt-4 text-blue-600 hover:underline inline-block">
          Return to assessments
        </Link>
      </div>
    );
  }

  const passed = attempt.percentage >= assessment.passingScore;
  const integrityScore = attempt.integrityScore ?? 100;
  const isSuspicious = attempt.suspicious || integrityScore < 70;

  return (
    <div className="max-w-4xl mx-auto py-8 space-y-8">
      
      <Link href={`/dashboard/student/assessments/${id}`} className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-900">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Assessment Details
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Result Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className={`p-8 text-center border-t-8 h-full ${passed ? 'border-green-500' : 'border-red-500'}`}>
            <div className="flex justify-center mb-6">
              <div className={`w-20 h-20 rounded-full flex items-center justify-center ${passed ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                {passed ? <Trophy className="w-10 h-10" /> : <XCircle className="w-10 h-10" />}
              </div>
            </div>
            
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{assessment.title}</h1>
            <h2 className={`text-xl font-bold mb-6 ${passed ? 'text-green-600' : 'text-red-600'}`}>
              {passed ? 'Passed!' : 'Failed'}
            </h2>
            
            <div className="flex justify-center items-center gap-6 mb-8">
              <div className="text-center">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Knowledge Score</p>
                <p className="text-3xl font-black text-gray-900">{attempt.percentage}%</p>
              </div>
              <div className="h-10 w-px bg-gray-200"></div>
              <div className="text-center">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Points</p>
                <p className="text-xl font-bold text-gray-700 mt-2">{attempt.score} / {attempt.maxScore}</p>
              </div>
            </div>
            
            <div className="flex flex-col gap-3 justify-center items-center">
              {!passed && assessment.skillId && (
                <Link 
                  href={`/dashboard/student/practice?skillId=${assessment.skillId}`}
                  className="inline-flex justify-center items-center px-6 py-2.5 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors w-64"
                >
                  <Terminal className="w-4 h-4 mr-2" />
                  Practice to Improve
                </Link>
              )}
              <Link 
                href={`/dashboard/student/assessments/${id}`}
                className={`inline-flex justify-center items-center px-6 py-2.5 border shadow-sm text-sm font-medium rounded-md transition-colors w-64 ${passed ? 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50' : 'border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100'}`}
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Retake Assessment
              </Link>
            </div>
          </div>
        </div>

        {/* Integrity Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className={`p-8 text-center border-t-8 h-full ${!isSuspicious ? 'border-blue-500' : 'border-orange-500'}`}>
            <div className="flex justify-center mb-6">
              <div className={`w-20 h-20 rounded-full flex items-center justify-center ${!isSuspicious ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600'}`}>
                {!isSuspicious ? <ShieldCheck className="w-10 h-10" /> : <ShieldAlert className="w-10 h-10" />}
              </div>
            </div>
            
            <h2 className="text-xl font-bold text-gray-900 mb-2">Assessment Integrity</h2>
            <h3 className={`text-lg font-bold mb-6 ${!isSuspicious ? 'text-blue-600' : 'text-orange-600'}`}>
              {!isSuspicious ? 'Normal' : 'Review Recommended'}
            </h3>
            
            <div className="flex justify-center items-center gap-6 mb-8">
              <div className="text-center">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Integrity Score</p>
                <p className={`text-3xl font-black ${integrityScore >= 90 ? 'text-green-600' : integrityScore >= 70 ? 'text-orange-600' : 'text-red-600'}`}>
                  {integrityScore}%
                </p>
              </div>
              <div className="h-10 w-px bg-gray-200"></div>
              <div className="text-center">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Violations</p>
                <p className="text-xl font-bold text-gray-700 mt-2">{attempt.violationCount || 0}</p>
              </div>
            </div>

            <p className="text-xs text-gray-500">
              Integrity scores are based on browser signals (tab switching, fullscreen exit, copy/paste) to deter unfair advantages.
            </p>
          </div>
        </div>
      </div>

      {/* One Clear Next Action Post-Completion Experience */}
      <PostCompletionNextAction
        score={attempt.score}
        maxScore={attempt.maxScore}
        passed={passed}
        taskTitle={assessment.title}
        nextAction={EngagementAuditService.generateNextAction(
          user?.uid || "student",
          id,
          assessment.skillId || "fe_html",
          attempt.percentage / 100,
          "frontend"
        )}
        onRetake={() => router.push(`/dashboard/student/assessments/${id}`)}
        showReviewButton={false}
      />

      {/* Answers Review */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200 bg-gray-50">
          <h3 className="text-lg font-bold text-gray-900">Review Your Answers</h3>
        </div>
        
        <div className="divide-y divide-gray-200">
          {questions.map((q, idx) => {
            const studentAnswer = attempt.answers[q.id];
            const isCorrect = studentAnswer === q.correctAnswer;
            
            return (
              <div key={q.id} className="p-6">
                <div className="flex items-start mb-4">
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mr-4 mt-0.5 ${isCorrect ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                    {isCorrect ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-gray-900">
                      <span className="text-gray-500 mr-2">{idx + 1}.</span> 
                      {q.question}
                    </h4>
                  </div>
                </div>
                
                <div className="ml-12 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className={`p-4 rounded-lg border-2 ${isCorrect ? 'border-green-500 bg-green-50' : studentAnswer ? 'border-red-500 bg-red-50' : 'border-gray-300 bg-gray-50'}`}>
                      <p className="text-sm font-bold text-gray-500 uppercase mb-1">Your Answer</p>
                      <p className={`font-medium ${isCorrect ? 'text-green-800' : studentAnswer ? 'text-red-800' : 'text-gray-500 italic'}`}>
                        {studentAnswer || "No answer provided (Time expired)"}
                      </p>
                    </div>
                    
                    {!isCorrect && (
                      <div className="p-4 rounded-lg border-2 border-green-500 bg-green-50">
                        <p className="text-sm font-bold text-gray-500 uppercase mb-1">Correct Answer</p>
                        <p className="font-medium text-green-800">
                          {q.correctAnswer}
                        </p>
                      </div>
                    )}
                  </div>
                  
                  {q.explanation && (
                    <div className="mt-4 p-4 bg-blue-50 border border-blue-100 rounded-lg">
                      <p className="text-sm font-bold text-blue-800 mb-1">Explanation</p>
                      <p className="text-sm text-blue-900">{q.explanation}</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
    </div>
  );
}
