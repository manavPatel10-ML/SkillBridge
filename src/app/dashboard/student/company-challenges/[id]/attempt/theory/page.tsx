"use client";

import { useState, useEffect, use, useRef, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import { 
  doc, getDoc, collection, query, where, getDocs, updateDoc, serverTimestamp 
} from "firebase/firestore";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { 
  CompanyChallenge, 
  ChallengeApplication,
  ChallengeTheoryConfiguration
} from "@/types";
import { useRouter } from "next/navigation";
import { 
  Loader2, 
  ArrowRight, 
  ArrowLeft, 
  CheckCircle2, 
  AlertCircle, 
  ShieldAlert, 
  Maximize 
} from "lucide-react";

type Question = {
  id: string;
  skillId: string;
  question: string;
  options: string[];
  correctAnswer: string;
  points: number;
};

export default function TheoryStagePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useAuth();
  const router = useRouter();

  const [challenge, setChallenge] = useState<CompanyChallenge | null>(null);
  const [application, setApplication] = useState<ChallengeApplication | null>(null);
  const [theoryConfig, setTheoryConfig] = useState<ChallengeTheoryConfiguration | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const answersRef = useRef<Record<string, string>>({});
  
  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Timer & Locking State
  const [timeLeft, setTimeLeft] = useState(30);
  const [isLocked, setIsLocked] = useState(false);
  const [questionStartedAt, setQuestionStartedAt] = useState<Record<string, number>>({});
  const [lockedQuestionIds, setLockedQuestionIds] = useState<string[]>([]);
  
  // Integrity State
  const [violationCount, setViolationCount] = useState(0);
  const [isFullscreenMode, setIsFullscreenMode] = useState(false);
  const [showFullscreenPrompt, setShowFullscreenPrompt] = useState(true);

  const currentQIdRef = useRef<string | null>(null);

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
        const cData = { id: cSnap.docs[0].id, ...cSnap.docs[0].data() } as CompanyChallenge;
        setChallenge(cData);

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
        
        if (appData.theoryStatus === 'completed') {
          router.push(`/dashboard/student/company-challenges/${id}/attempt`);
          return;
        }
        
        setApplication(appData);

        // Fetch Theory Config
        const tSnap = await getDocs(query(collection(db, "challengeTheoryConfiguration"), where("challengeId", "==", id)));
        if (tSnap.empty) {
          setError("Theory configuration missing.");
          setLoading(false);
          return;
        }
        const tData = tSnap.docs[0].data() as ChallengeTheoryConfiguration;
        setTheoryConfig(tData);

        // Check if questions are already assigned
        let assignedQIds = appData.theoryAttempt?.questionIds;

        if (!assignedQIds || assignedQIds.length === 0) {
          // Generate questions
          const generatedQuestions: Question[] = [];
          
          const fetchByDifficulty = async (diff: string, count: number) => {
            if (count === 0) return;
            const q = query(
              collection(db, "assessmentQuestions"),
              where("skillId", "in", tData.requiredSkillIds),
              where("difficulty", "==", diff)
            );
            const qSnap = await getDocs(q);
            const pool = qSnap.docs.map(d => ({ id: d.id, ...d.data() } as Question));
            // Shuffle and slice
            pool.sort(() => 0.5 - Math.random());
            generatedQuestions.push(...pool.slice(0, count));
          };

          await fetchByDifficulty('easy', tData.easyQuestionCount);
          await fetchByDifficulty('medium', tData.mediumQuestionCount);
          await fetchByDifficulty('hard', tData.hardQuestionCount);

          assignedQIds = generatedQuestions.map(q => q.id);

          // Save to application
          await updateDoc(doc(db, "challengeApplications", appData.id!), {
            "theoryAttempt.questionIds": assignedQIds,
            "theoryAttempt.answers": {},
            "theoryAttempt.questionStartedAt": {},
            "theoryAttempt.lockedQuestionIds": [],
            "theoryAttempt.violationCount": 0,
            theoryStatus: "in_progress"
          });

          setQuestions(generatedQuestions);
        } else {
          // Fetch assigned questions
          const fetchedQuestions: Question[] = [];
          for (const qId of assignedQIds) {
            const qSnap = await getDoc(doc(db, "assessmentQuestions", qId));
            if (qSnap.exists()) {
              fetchedQuestions.push({ id: qSnap.id, ...qSnap.data() } as Question);
            }
          }
          setQuestions(fetchedQuestions);
          
          if (appData.theoryAttempt) {
            setAnswers(appData.theoryAttempt.answers || {});
            setQuestionStartedAt(appData.theoryAttempt.questionStartedAt || {});
            setLockedQuestionIds(appData.theoryAttempt.lockedQuestionIds || []);
            setViolationCount(appData.theoryAttempt.violationCount || 0);
          }
        }

      } catch (err) {
        console.error("Error fetching theory stage:", err);
        setError("Failed to load theory stage.");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [id, user, router]);

  const logViolation = useCallback(async (type: string) => {
    if (!application) return;
    
    setViolationCount(prev => prev + 1);

    try {
      const appRef = doc(db, "challengeApplications", application.id!);
      const snap = await getDoc(appRef);
      if (snap.exists()) {
        const data = snap.data();
        const currentCount = data.theoryAttempt?.violationCount || 0;
        await updateDoc(appRef, {
          "theoryAttempt.violationCount": currentCount + 1
        });
      }
    } catch (e) {
      console.error("Failed to log integrity event", e);
    }
  }, [application]);

  useEffect(() => {
    if (loading || !application || showFullscreenPrompt) return;

    const handleVisibilityChange = () => { if (document.hidden) logViolation("tab_switch"); };
    const handleBlur = () => logViolation("window_blur");
    const handleContextMenu = (e: MouseEvent) => { e.preventDefault(); logViolation("context_menu"); };
    const handleCopy = (e: ClipboardEvent) => { e.preventDefault(); logViolation("copy_attempt"); };
    const handlePaste = (e: ClipboardEvent) => { e.preventDefault(); logViolation("paste_attempt"); };
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        setIsFullscreenMode(false);
        logViolation("fullscreen_exit");
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
  }, [loading, application, showFullscreenPrompt, logViolation]);

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
      if (application) {
        updateDoc(doc(db, "challengeApplications", application.id!), { 
          "theoryAttempt.questionStartedAt": newStartedAtObj 
        });
      }
    }

    const timePerQ = theoryConfig?.timePerQuestionSeconds || 30;
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
    
    if (application) {
      await updateDoc(doc(db, "challengeApplications", application.id!), { 
        "theoryAttempt.lockedQuestionIds": newLocked 
      });
    }
    
    if (currentIndex < questions.length - 1) {
      setTimeout(() => setCurrentIndex(prev => prev + 1), 1500);
    }
  };

  const handleSelectOption = async (questionId: string, option: string) => {
    if (!application || isLocked) return;
    
    const newAnswers = { ...answers, [questionId]: option };
    setAnswers(newAnswers);
    setSaving(true);
    
    try {
      await updateDoc(doc(db, "challengeApplications", application.id!), {
        "theoryAttempt.answers": newAnswers,
      });
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
    if (!application || !theoryConfig) return;
    
    if (!forceSubmit) {
      const confirmSubmit = window.confirm("Are you sure you want to submit? You won't be able to change your answers.");
      if (!confirmSubmit) return;
    }
    
    setSubmitting(true);
    
    try {
      let score = 0;
      let maxScore = 0;
      
      questions.forEach(q => {
        maxScore += q.points || 10;
        if (answersRef.current[q.id] === q.correctAnswer) {
          score += q.points || 10;
        }
      });
      
      const percentage = Math.round((score / maxScore) * 100);
      const integrityPenalty = violationCount * 5;
      const finalIntegrityScore = Math.max(0, 100 - integrityPenalty);
      
      await updateDoc(doc(db, "challengeApplications", application.id!), {
        theoryStatus: "completed",
        theoryScore: percentage,
        integrityScore: finalIntegrityScore
      });
      
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(console.error);
      }
      
      router.push(`/dashboard/student/company-challenges/${id}/attempt`);
    } catch (error) {
      console.error("Error submitting assessment:", error);
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen pb-32 bg-gray-50">
        <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error || !challenge || !application || !theoryConfig) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <div className="bg-red-50 text-red-700 p-6 rounded-md shadow-sm border border-red-200">
          {error || "An error occurred."}
        </div>
      </div>
    );
  }

  if (showFullscreenPrompt) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] text-center px-4">
        <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 max-w-md w-full">
          <Maximize className="w-12 h-12 text-blue-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-4">Theory Security Protocol</h2>
          <p className="text-gray-600 mb-6 text-sm">
            This stage requires fullscreen mode. Actions such as switching tabs or exiting fullscreen will be flagged.
            <br/><br/>
            You have <b>{theoryConfig.timePerQuestionSeconds} seconds</b> per question.
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

  const currentQuestion = questions[currentIndex];
  const allAnswered = questions.every(q => answers[q.id]);

  return (
    <div className="max-w-4xl mx-auto py-8 relative select-none">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6 sticky top-4 z-10">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-xl font-bold text-gray-900">{challenge.title} - Theory</h1>
          
          <div className="flex items-center gap-4">
            {violationCount > 0 && (
              <div className="flex items-center text-sm font-medium text-red-600 bg-red-50 px-3 py-1 rounded-full">
                <ShieldAlert className="w-4 h-4 mr-1.5" />
                Alerts: {violationCount}
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
            style={{ width: `${((timeLeft / theoryConfig.timePerQuestionSeconds) * 100)}%` }}
          ></div>
        </div>
      </div>

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
              <><CheckCircle2 className="w-5 h-5 mr-2" /> Submit Theory</>
            )}
          </button>
        ) : (
          <button
            onClick={lockCurrentQuestion}
            className="flex items-center px-6 py-3 border border-transparent shadow-sm text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors"
          >
            Next Question
            <ArrowRight className="w-5 h-5 ml-2" />
          </button>
        )}
      </div>

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
