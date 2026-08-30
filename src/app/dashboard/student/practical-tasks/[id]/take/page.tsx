"use client";

import { use, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import { 
  doc, getDoc, collection, query, where, getDocs, 
  addDoc, serverTimestamp, updateDoc 
} from "firebase/firestore";
import { Loader2, Code, Clock, CheckCircle2, AlertTriangle, FileText, Send } from "lucide-react";
import { useRouter } from "next/navigation";

type PracticalTask = {
  id: string;
  skillId: string;
  title: string;
  description: string;
  difficulty: string;
  durationMinutes: number;
  instructions: string;
  requirements: string[];
  submissionTypes: string[];
  evaluationCriteria: Record<string, number>;
};

type Props = {
  params: Promise<{ id: string }>;
};

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export default function TakePracticalTaskPage({ params }: Props) {
  const { id } = use(params);
  const { user } = useAuth();
  const router = useRouter();

  const [task, setTask] = useState<PracticalTask | null>(null);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // Timer state
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [isTimeUp, setIsTimeUp] = useState(false);
  
  // Submission state
  const [codeSubmission, setCodeSubmission] = useState("");
  const [explanationSubmission, setExplanationSubmission] = useState("");
  const [githubUrlSubmission, setGithubUrlSubmission] = useState("");
  const [liveUrlSubmission, setLiveUrlSubmission] = useState("");
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (!user) return;

    const initTask = async () => {
      try {
        const taskRef = doc(db, "practicalTasks", id);
        const taskSnap = await getDoc(taskRef);

        if (!taskSnap.exists()) {
          router.push("/dashboard/student/practical-tasks");
          return;
        }

        const taskData = { id: taskSnap.id, ...taskSnap.data() } as PracticalTask;
        setTask(taskData);

        // Check for existing attempt
        const attemptsRef = collection(db, "practicalTaskAttempts");
        const q = query(
          attemptsRef, 
          where("studentId", "==", user.uid),
          where("taskId", "==", id),
          where("status", "==", "in_progress")
        );
        
        const attemptSnap = await getDocs(q);
        
        let currentAttemptId = null;
        let startedAtTime = null;

        if (!attemptSnap.empty) {
          // Resume existing attempt
          const attemptData = attemptSnap.docs[0].data();
          currentAttemptId = attemptSnap.docs[0].id;
          startedAtTime = attemptData.startedAt?.toDate().getTime() || Date.now();
          
          if (attemptData.submission) {
            setCodeSubmission(attemptData.submission.code || "");
            setExplanationSubmission(attemptData.submission.explanation || "");
            setGithubUrlSubmission(attemptData.submission.githubUrl || "");
            setLiveUrlSubmission(attemptData.submission.liveUrl || "");
          }
        } else {
          // Check if already completed
          const completedQ = query(
            attemptsRef,
            where("studentId", "==", user.uid),
            where("taskId", "==", id),
            where("status", "==", "completed")
          );
          const completedSnap = await getDocs(completedQ);
          
          if (!completedSnap.empty) {
            router.push(`/dashboard/student/practical-tasks/${id}`);
            return;
          }

          // Create new attempt
          const newDocRef = await addDoc(attemptsRef, {
            studentId: user.uid,
            taskId: id,
            skillId: taskData.skillId,
            status: "in_progress",
            startedAt: serverTimestamp(),
            submission: {
              code: "",
              explanation: "",
              githubUrl: "",
              liveUrl: ""
            }
          });
          currentAttemptId = newDocRef.id;
          startedAtTime = Date.now();
        }

        setAttemptId(currentAttemptId);

        // Calculate initial time left
        const durationSeconds = taskData.durationMinutes * 60;
        const elapsedSeconds = Math.floor((Date.now() - startedAtTime) / 1000);
        const initialTimeLeft = Math.max(0, durationSeconds - elapsedSeconds);
        
        setTimeLeft(initialTimeLeft);
        
        if (initialTimeLeft === 0) {
          setIsTimeUp(true);
        }
        
      } catch (error) {
        console.error("Error initializing task:", error);
      } finally {
        setLoading(false);
      }
    };

    initTask();
  }, [id, user, router]);

  // Timer effect
  useEffect(() => {
    if (timeLeft === null || isTimeUp || submitting) return;

    if (timeLeft <= 0) {
      setIsTimeUp(true);
      handleSubmit(true); // Auto-submit when time is up
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev === null || prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, isTimeUp, submitting]);

  // Save progress periodically (debounced)
  useEffect(() => {
    if (!attemptId || isTimeUp || submitting) return;
    
    const timeout = setTimeout(async () => {
      try {
        await updateDoc(doc(db, "practicalTaskAttempts", attemptId), {
          "submission.code": codeSubmission,
          "submission.explanation": explanationSubmission,
          "submission.githubUrl": githubUrlSubmission,
          "submission.liveUrl": liveUrlSubmission
        });
      } catch (error) {
        console.error("Error auto-saving:", error);
      }
    }, 5000); // Auto-save 5 seconds after last change

    return () => clearTimeout(timeout);
  }, [codeSubmission, explanationSubmission, githubUrlSubmission, liveUrlSubmission, attemptId]);

  const isValidUrl = (string: string) => {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  };

  const handleSubmit = async (autoSubmitted = false) => {
    if (!attemptId || !task || submitting) return;

    if (!autoSubmitted) {
      if (githubUrlSubmission && !isValidUrl(githubUrlSubmission)) {
        setFormError("Please enter a valid GitHub URL (e.g. https://github.com/...)");
        return;
      }
      if (liveUrlSubmission && !isValidUrl(liveUrlSubmission)) {
        setFormError("Please enter a valid Live Demo URL (e.g. https://...)");
        return;
      }
    }
    
    setFormError("");
    setSubmitting(true);

    try {
      const durationSeconds = task.durationMinutes * 60;
      const finalTimeLeft = timeLeft || 0;
      const timeSpent = durationSeconds - finalTimeLeft;

      await updateDoc(doc(db, "practicalTaskAttempts", attemptId), {
        status: "completed",
        submittedAt: serverTimestamp(),
        timeSpent,
        "submission.code": codeSubmission,
        "submission.explanation": explanationSubmission,
        "submission.githubUrl": githubUrlSubmission,
        "submission.liveUrl": liveUrlSubmission
      });

      router.push(`/dashboard/student/practical-tasks`);
    } catch (error) {
      console.error("Error submitting task:", error);
      setSubmitting(false);
    }
  };

  if (loading || !task) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-600 font-medium animate-pulse">Setting up your workspace...</p>
        </div>
      </div>
    );
  }

  const isWarningTime = timeLeft !== null && timeLeft < 300; // Less than 5 minutes

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Task Execution Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
                <Code className="w-5 h-5" />
              </div>
              <div>
                <h1 className="font-bold text-gray-900 leading-tight">{task.title}</h1>
                <p className="text-xs text-gray-500 font-medium">Do not close this window</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-6">
              {/* Timer */}
              <div className={`flex items-center px-4 py-2 rounded-lg font-mono text-lg font-bold transition-colors ${
                isTimeUp ? 'bg-red-100 text-red-700' :
                isWarningTime ? 'bg-orange-100 text-orange-700 animate-pulse' :
                'bg-gray-100 text-gray-800'
              }`}>
                <Clock className={`w-5 h-5 mr-2 ${isWarningTime ? 'animate-bounce' : ''}`} />
                {timeLeft !== null ? formatTime(timeLeft) : "--:--"}
              </div>
              
              <button
                onClick={() => handleSubmit(false)}
                disabled={submitting || isTimeUp}
                className="inline-flex items-center px-6 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none disabled:opacity-50 transition-all"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Submit Task
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {isWarningTime && !isTimeUp && (
          <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-lg flex items-start shadow-sm">
            <AlertTriangle className="w-5 h-5 text-orange-500 mt-0.5 mr-3 shrink-0" />
            <div>
              <h3 className="text-sm font-medium text-orange-800">Time is running out!</h3>
              <p className="text-sm text-orange-700 mt-1">
                You have less than 5 minutes remaining. Your work will be automatically submitted when time expires.
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-12rem)]">
          {/* Left Panel: Instructions & Requirements */}
          <div className="lg:col-span-1 flex flex-col space-y-6 overflow-y-auto pr-2 custom-scrollbar">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                <FileText className="w-5 h-5 mr-2 text-blue-500" />
                Instructions
              </h2>
              <div className="prose prose-sm max-w-none text-gray-700 mb-6">
                {task.instructions}
              </div>

              <h3 className="font-bold text-gray-900 mb-3 flex items-center text-sm border-t pt-4">
                <CheckCircle2 className="w-4 h-4 mr-2 text-green-500" />
                Requirements Checklist
              </h3>
              <ul className="space-y-3">
                {task.requirements.map((req, idx) => (
                  <li key={idx} className="flex items-start text-sm">
                    <div className="min-w-4 h-4 mt-0.5 mr-2 border-2 border-gray-300 rounded-sm"></div>
                    <span className="text-gray-600">{req}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Right Panel: Editor Area */}
          <div className="lg:col-span-2 flex flex-col space-y-4">
            {task.submissionTypes.includes("code") && (
              <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-hidden">
                <div className="bg-gray-800 px-4 py-2 border-b border-gray-700 flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-200 flex items-center">
                    <Code className="w-4 h-4 mr-2" />
                    Code Editor ({task.skillId})
                  </span>
                  <span className="text-xs text-gray-400">Auto-saving...</span>
                </div>
                <textarea
                  value={codeSubmission}
                  onChange={(e) => setCodeSubmission(e.target.value)}
                  disabled={isTimeUp || submitting}
                  className="flex-1 w-full p-4 bg-[#1E1E1E] text-gray-100 font-mono text-sm resize-none focus:outline-none"
                  placeholder={`// Write your ${task.skillId} code here...\n\n`}
                  spellCheck="false"
                />
              </div>
            )}
            
            {task.submissionTypes.includes("explanation") && (
              <div className={`${task.submissionTypes.length > 2 ? 'flex-1' : 'h-64'} bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-hidden`}>
                <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                  <span className="text-sm font-medium text-gray-700 flex items-center">
                    <FileText className="w-4 h-4 mr-2 text-gray-500" />
                    Explanation / Approach
                  </span>
                </div>
                <textarea
                  value={explanationSubmission}
                  onChange={(e) => setExplanationSubmission(e.target.value)}
                  disabled={isTimeUp || submitting}
                  className="flex-1 w-full p-4 text-gray-700 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
                  placeholder="Briefly explain your approach, design decisions, or any assumptions you made..."
                />
              </div>
            )}
            
            {(task.submissionTypes.includes("github") || task.submissionTypes.includes("live_url")) && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="font-bold text-gray-900 mb-4 flex items-center text-sm border-b pb-2">
                  <Code className="w-4 h-4 mr-2 text-blue-500" />
                  Project Links
                </h3>
                {formError && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-md flex items-center">
                    <AlertTriangle className="w-4 h-4 mr-2 shrink-0" />
                    {formError}
                  </div>
                )}
                <div className="space-y-4">
                  {task.submissionTypes.includes("github") && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">GitHub Repository URL</label>
                      <input
                        type="url"
                        placeholder="https://github.com/username/project"
                        value={githubUrlSubmission}
                        onChange={(e) => setGithubUrlSubmission(e.target.value)}
                        disabled={isTimeUp || submitting}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      />
                    </div>
                  )}
                  {task.submissionTypes.includes("live_url") && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Live Demo URL</label>
                      <input
                        type="url"
                        placeholder="https://my-project.vercel.app"
                        value={liveUrlSubmission}
                        onChange={(e) => setLiveUrlSubmission(e.target.value)}
                        disabled={isTimeUp || submitting}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
      
      {/* Global CSS for custom scrollbar in this view */}
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #CBD5E1;
          border-radius: 20px;
        }
      `}} />
    </div>
  );
}
