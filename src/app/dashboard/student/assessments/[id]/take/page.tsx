"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState, use, useRef, useCallback } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { Loader2, ArrowRight, ArrowLeft, CheckCircle2, AlertCircle, ShieldAlert, Maximize } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { updateSkillScore } from "@/lib/skill-intelligence";

type Question = {
  id: string;
  assessmentId: string;
  question: string;
  options: string[];
  correctAnswer: string;
  points: number;
};

type Assessment = {
  id: string;
  title: string;
  totalQuestions: number;
  difficulty: string;
  passingScore: number;
  timePerQuestionSeconds?: number;
  skillId?: string;
};

type Attempt = {
  id: string;
  answers: Record<string, string>;
  status: string;
  questionIds: string[];
  questionStartedAt: Record<string, number>;
  lockedQuestionIds: string[];
  integrityScore: number;
  violationCount: number;
};

// The time limit is now pulled dynamically from the assessment document
// const QUESTION_TIME_LIMIT = 30; // seconds

export default function TakeAssessmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const attemptId = searchParams.get("attemptId");
  const recId = searchParams.get("recId");
  
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const answersRef = useRef<Record<string, string>>({});
  
  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Timer & Locking State
  const [timeLeft, setTimeLeft] = useState(30);
  const [isLocked, setIsLocked] = useState(false);
  const [questionStartedAt, setQuestionStartedAt] = useState<Record<string, number>>({});
  const [lockedQuestionIds, setLockedQuestionIds] = useState<string[]>([]);
  
  // Integrity State
  const [integrityScore, setIntegrityScore] = useState(100);
  const [violationCount, setViolationCount] = useState(0);
  const [isFullscreenMode, setIsFullscreenMode] = useState(false);
  const [showFullscreenPrompt, setShowFullscreenPrompt] = useState(true);

  // References for event listeners
  const attemptRef = useRef(attemptId ? doc(db, "assessmentAttempts", attemptId) : null);
  const currentQIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!user || !attemptId) return;
    attemptRef.current = doc(db, "assessmentAttempts", attemptId);

    const fetchData = async () => {
      try {
        const aSnap = await getDoc(doc(db, "assessments", id));
        if (aSnap.exists()) {
          setAssessment({ id: aSnap.id, ...aSnap.data() } as Assessment);
        }

        const attSnap = await getDoc(attemptRef.current!);
        if (attSnap.exists()) {
          const attemptData = { id: attSnap.id, ...attSnap.data() } as Attempt;
          
          if (attemptData.status === "completed") {
            router.replace(`/dashboard/student/assessments/${id}/result/${attemptId}`);
            return;
          }
          
          setAttempt(attemptData);
          setAnswers(attemptData.answers || {});
          setQuestionStartedAt(attemptData.questionStartedAt || {});
          setLockedQuestionIds(attemptData.lockedQuestionIds || []);
          setIntegrityScore(attemptData.integrityScore ?? 100);
          setViolationCount(attemptData.violationCount ?? 0);

          // Fetch sanitized questions via secure API (stripping correctAnswer)
          if (attemptData.questionIds && attemptData.questionIds.length > 0) {
            try {
              const token = await user.getIdToken();
              const qRes = await fetch(`/api/assessments/${id}/questions?attemptId=${attemptId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
              });
              if (qRes.ok) {
                const qData = await qRes.json();
                if (qData.questions && qData.questions.length > 0) {
                  setQuestions(qData.questions);
                } else {
                  throw new Error("Empty questions returned from API");
                }
              } else {
                throw new Error("API question fetch failed");
              }
            } catch (qErr) {
              // Fallback to direct read if offline
              const fetchedQuestions: Question[] = [];
              for (const qId of attemptData.questionIds) {
                const qSnap = await getDoc(doc(db, "assessmentQuestions", qId));
                if (qSnap.exists()) {
                  fetchedQuestions.push({ id: qSnap.id, ...qSnap.data() } as Question);
                }
              }
              setQuestions(fetchedQuestions);
            }
          }
        } else {
          router.replace(`/dashboard/student/assessments/${id}`);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, id, attemptId, router]);

  // Log integrity violation
  const logViolation = useCallback(async (type: string, penalty: number) => {
    if (!attemptRef.current) return;
    
    setIntegrityScore(prev => Math.max(0, prev - penalty));
    setViolationCount(prev => prev + 1);

    const event = {
      type,
      timestamp: new Date().toISOString(),
      questionId: currentQIdRef.current,
      penalty
    };

    try {
      // We read the current state to update
      const snap = await getDoc(attemptRef.current);
      if (snap.exists()) {
        const data = snap.data();
        const currentScore = data.integrityScore ?? 100;
        const currentCount = data.violationCount ?? 0;
        const currentEvents = data.integrityEvents || [];
        
        const newScore = Math.max(0, currentScore - penalty);
        const newCount = currentCount + 1;
        
        await updateDoc(attemptRef.current, {
          integrityScore: newScore,
          violationCount: newCount,
          suspicious: newCount >= 3 || newScore < 50,
          integrityEvents: [...currentEvents, event]
        });
      }
    } catch (e) {
      console.error("Failed to log integrity event", e);
    }
  }, []);

  // Setup Integrity Monitoring
  useEffect(() => {
    if (loading || !attemptId || showFullscreenPrompt) return;

    const handleVisibilityChange = () => {
      if (document.hidden) logViolation("tab_switch", 10);
    };
    
    const handleBlur = () => logViolation("window_blur", 5);
    const handleContextMenu = (e: MouseEvent) => { e.preventDefault(); logViolation("context_menu", 2); };
    const handleCopy = (e: ClipboardEvent) => { e.preventDefault(); logViolation("copy_attempt", 10); };
    const handlePaste = (e: ClipboardEvent) => { e.preventDefault(); logViolation("paste_attempt", 10); };
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        setIsFullscreenMode(false);
        logViolation("fullscreen_exit", 5);
      } else {
        setIsFullscreenMode(true);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleBlur);
    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("copy", handleCopy);
    document.addEventListener("paste", handlePaste);
    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("copy", handleCopy);
      document.removeEventListener("paste", handlePaste);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, [loading, attemptId, showFullscreenPrompt, logViolation]);

  // Handle Timer & Locking per question
  useEffect(() => {
    if (questions.length === 0 || showFullscreenPrompt) return;
    
    const currentQ = questions[currentIndex];
    currentQIdRef.current = currentQ.id;
    
    let isLockedForQ = lockedQuestionIds.includes(currentQ.id);
    
    if (isLockedForQ) {
      setIsLocked(true);
      setTimeLeft(0);
      return;
    }

    let startedAt = questionStartedAt[currentQ.id];
    const now = Date.now();
    
    if (!startedAt) {
      startedAt = now;
      const newStartedAtObj = { ...questionStartedAt, [currentQ.id]: startedAt };
      setQuestionStartedAt(newStartedAtObj);
      if (attemptRef.current) {
        updateDoc(attemptRef.current, { questionStartedAt: newStartedAtObj });
      }
    }

    const timePerQ = assessment?.timePerQuestionSeconds || 30;
    const elapsed = Math.floor((now - startedAt) / 1000);
    const remaining = Math.max(0, timePerQ - elapsed);
    setTimeLeft(remaining);
    
    if (remaining === 0) {
      lockCurrentQuestion();
      return;
    }

    setIsLocked(false);
    
    const interval = setInterval(() => {
      const currentNow = Date.now();
      const currentElapsed = Math.floor((currentNow - startedAt) / 1000);
      const currentRemaining = Math.max(0, timePerQ - currentElapsed);
      
      setTimeLeft(currentRemaining);
      
      if (currentRemaining === 0) {
        clearInterval(interval);
        lockCurrentQuestion();
      }
    }, 1000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, questions, showFullscreenPrompt]);

  // Auto-submit when the last question gets locked
  useEffect(() => {
    if (questions.length > 0 && currentIndex === questions.length - 1) {
      const currentQId = questions[currentIndex].id;
      if (lockedQuestionIds.includes(currentQId) && !submitting) {
        handleSubmit(true);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lockedQuestionIds, currentIndex, questions, submitting]);

  const lockCurrentQuestion = async () => {
    setIsLocked(true);
    if (!currentQIdRef.current) return;
    
    const qId = currentQIdRef.current;
    if (lockedQuestionIds.includes(qId)) return;
    
    const newLocked = [...lockedQuestionIds, qId];
    setLockedQuestionIds(newLocked);
    
    if (attemptRef.current) {
      await updateDoc(attemptRef.current, { lockedQuestionIds: newLocked });
    }
    
    // Auto-advance if not on last question
    if (currentIndex < questions.length - 1) {
      setTimeout(() => setCurrentIndex(prev => prev + 1), 1500);
    }
  };

  const handleSelectOption = async (questionId: string, option: string) => {
    if (!attemptId || isLocked) return;
    
    const newAnswers = { ...answers, [questionId]: option };
    setAnswers(newAnswers);
    setSaving(true);
    
    try {
      if (attemptRef.current) {
        await updateDoc(attemptRef.current, {
          answers: newAnswers,
          lastUpdated: serverTimestamp()
        });
      }
    } catch (error) {
      console.error("Error saving answer:", error);
    } finally {
      setSaving(false);
    }
  };

  const requestFullscreen = async () => {
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
    } catch (e) {
      console.warn("Fullscreen request failed", e);
    } finally {
      setShowFullscreenPrompt(false);
    }
  };

  const handleSubmit = async (forceSubmit: boolean = false) => {
    if (!attemptId || !assessment || !attemptRef.current) return;
    
    if (!forceSubmit) {
      const confirmSubmit = window.confirm("Are you sure you want to submit your assessment? You won't be able to change your answers.");
      if (!confirmSubmit) return;
    }
    
    setSubmitting(true);
    
    try {
      const token = await user?.getIdToken();
      if (!token) throw new Error("Unauthorized session");

      const submitRes = await fetch('/api/assessments/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          attemptId,
          assessmentId: id,
          answers: answersRef.current,
          recId: recId || undefined
        })
      });

      if (!submitRes.ok) {
        const errJson = await submitRes.json();
        throw new Error(errJson.error || "Failed to evaluate assessment submission");
      }
      
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(console.error);
      }
      
      router.push(`/dashboard/student/assessments/${id}/result/${attemptId}`);
    } catch (error) {
      console.error("Error submitting assessment:", error);
      setSubmitting(false);
    }
  };

  const handleNext = () => {
    // If not locked, force lock on next to prevent returning? 
    // Wait, the spec says "A student should not be able to go back and change an answer after the question timer expires."
    // It doesn't say they can't go back if it hasn't expired, but if the timer keeps running in the background, it's complex.
    // Let's just lock it when they click Next to be safe and enforce linear progression, 
    // or let it expire normally. Locking on next is standard for strict assessments.
    lockCurrentQuestion();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen pb-32">
        <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
      </div>
    );
  }

  if (showFullscreenPrompt) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="bg-white p-8 rounded-xl shadow-sm border max-w-md w-full">
          <Maximize className="w-12 h-12 text-blue-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-4">Assessment Security</h2>
          <p className="text-gray-600 mb-6 text-sm">
            This assessment requires fullscreen mode. Your actions (tab switching, copy/paste) will be monitored to maintain integrity. 
            <br/><br/>
            You have <b>{assessment?.timePerQuestionSeconds || 30} seconds</b> per question. Once time expires, the question will be locked.
          </p>
          <button
            onClick={requestFullscreen}
            className="w-full bg-blue-600 text-white font-semibold py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Enter Fullscreen & Start
          </button>
        </div>
      </div>
    );
  }

  if (!assessment || questions.length === 0) {
    return (
      <div className="text-center py-12">
        <h3 className="text-xl font-bold text-gray-900">Questions not found</h3>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const allAnswered = questions.every(q => answers[q.id]);

  return (
    <div className="max-w-4xl mx-auto py-8 relative select-none">
      
      {/* Watermark overlay */}
      <div className="fixed inset-0 pointer-events-none flex items-center justify-center opacity-[0.03] z-50 overflow-hidden">
        <div className="text-4xl font-bold transform -rotate-45 whitespace-nowrap">
          {user?.email} • {attemptId}
        </div>
      </div>

      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6 sticky top-4 z-10">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-xl font-bold text-gray-900">{assessment.title}</h1>
          
          <div className="flex items-center gap-4">
            {violationCount > 0 && (
              <div className="flex items-center text-sm font-medium text-red-600 bg-red-50 px-3 py-1 rounded-full">
                <ShieldAlert className="w-4 h-4 mr-1.5" />
                Integrity Alerts: {violationCount}
              </div>
            )}
            
            <div className={`flex items-center px-4 py-1.5 rounded-full font-bold ${
              isLocked ? 'bg-red-100 text-red-700' : 
              timeLeft <= 10 ? 'bg-orange-100 text-orange-700 animate-pulse' : 
              'bg-blue-100 text-blue-700'
            }`}>
              {isLocked ? "Locked" : `00:${timeLeft.toString().padStart(2, '0')}`}
            </div>
          </div>
        </div>
        
        {/* Progress bar */}
        <div className="flex items-center justify-between text-sm font-medium text-gray-500 mb-2">
          <span>Question {currentIndex + 1} of {questions.length}</span>
          {saving ? (
            <span className="text-gray-400 flex items-center"><Loader2 className="w-3 h-3 mr-1 animate-spin"/> Saving</span>
          ) : (
            <span className="text-green-600 flex items-center"><CheckCircle2 className="w-3 h-3 mr-1"/> Saved</span>
          )}
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div 
            className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" 
            style={{ width: `${((timeLeft / (assessment.timePerQuestionSeconds || 30)) * 100)}%` }}
          ></div>
        </div>
      </div>

      {/* Question Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6 relative">
        {isLocked && (
          <div className="absolute inset-0 bg-gray-50/50 backdrop-blur-[1px] z-10 flex items-center justify-center">
            <div className="bg-white px-6 py-3 rounded-full shadow-md font-semibold text-gray-700 border flex items-center">
              <AlertCircle className="w-5 h-5 mr-2 text-orange-500" />
              Time Expired - Question Locked
            </div>
          </div>
        )}
        <div className={`p-8 ${isLocked ? 'opacity-50 pointer-events-none' : ''}`}>
          <h2 className="text-2xl font-bold text-gray-900 mb-8">{currentQuestion.question}</h2>
          
          <div className="space-y-4">
            {currentQuestion.options.map((option, idx) => {
              const isSelected = answers[currentQuestion.id] === option;
              return (
                <button
                  key={idx}
                  disabled={isLocked}
                  onClick={() => handleSelectOption(currentQuestion.id, option)}
                  className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                    isSelected 
                      ? "border-blue-600 bg-blue-50 text-blue-900" 
                      : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-center">
                     <div className={`flex-shrink-0 w-6 h-6 rounded-full border flex items-center justify-center mr-4 ${
                      isSelected ? "border-blue-600 bg-blue-600" : "border-gray-400"
                    }`}>
                      {isSelected && <div className="w-2.5 h-2.5 bg-white rounded-full"></div>}
                    </div>
                    <span className="text-lg">{option}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between items-center">
        <button
          onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
          disabled={currentIndex === 0}
          className="flex items-center px-6 py-3 border border-gray-300 shadow-sm text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Previous
        </button>

        {currentIndex === questions.length - 1 ? (
          <button
            onClick={() => handleSubmit(false)}
            disabled={submitting}
            className={`flex items-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white transition-colors shadow-sm ${
              allAnswered ? "bg-green-600 hover:bg-green-700" : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {submitting ? (
              <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Submitting...</>
            ) : (
              <><CheckCircle2 className="w-5 h-5 mr-2" /> Submit Assessment</>
            )}
          </button>
        ) : (
          <button
            onClick={handleNext}
            className="flex items-center px-6 py-3 border border-transparent shadow-sm text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors"
          >
            Next Question
            <ArrowRight className="w-5 h-5 ml-2" />
          </button>
        )}
      </div>

      {!allAnswered && currentIndex === questions.length - 1 && (
        <div className="mt-6 flex items-center justify-end text-sm text-orange-600 font-medium">
          <AlertCircle className="w-4 h-4 mr-1.5" />
          You can submit, but some questions remain unanswered.
        </div>
      )}

      {/* Question Navigator */}
      <div className="mt-12 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-4 uppercase tracking-wider">Question Navigator</h3>
        <div className="flex flex-wrap gap-2">
          {questions.map((q, idx) => {
            const isAnswered = !!answers[q.id];
            const isCurrent = idx === currentIndex;
            const locked = lockedQuestionIds.includes(q.id);
            return (
              <button
                key={q.id}
                onClick={() => setCurrentIndex(idx)}
                className={`w-10 h-10 rounded-md font-medium text-sm flex items-center justify-center border transition-colors relative ${
                  isCurrent
                    ? "ring-2 ring-blue-600 ring-offset-2 border-blue-600 bg-blue-50 text-blue-700"
                    : locked
                    ? "bg-gray-100 text-gray-500 border-gray-300"
                    : isAnswered
                    ? "bg-blue-600 text-white border-blue-600 hover:bg-blue-700"
                    : "bg-white text-gray-500 border-gray-300 hover:bg-gray-50"
                }`}
              >
                {idx + 1}
                {locked && <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white" title="Locked" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
