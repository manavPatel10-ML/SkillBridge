"use client";

import { use, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { Loader2, ArrowLeft, CheckCircle2, User, Code, FileText, Save, AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { updateSkillScore } from "@/lib/skill-intelligence";

type Props = {
  params: Promise<{ id: string }>;
};

export default function EvaluatePracticalAttemptPage({ params }: Props) {
  const { id } = use(params);
  const { user } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  
  const [attempt, setAttempt] = useState<any>(null);
  const [task, setTask] = useState<any>(null);
  const [student, setStudent] = useState<any>(null);

  // Form state
  const [percentage, setPercentage] = useState<string>("");
  const [feedback, setFeedback] = useState<string>("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const attemptDoc = await getDoc(doc(db, "practicalTaskAttempts", id));
        if (!attemptDoc.exists()) {
          router.push("/dashboard/admin/evaluations");
          return;
        }
        
        const attemptData = attemptDoc.data();
        setAttempt({ id: attemptDoc.id, ...attemptData });
        
        if (attemptData.evaluation) {
          setPercentage(attemptData.evaluation.percentage?.toString() || "");
          setFeedback(attemptData.evaluation.feedback || "");
        }

        const taskDoc = await getDoc(doc(db, "practicalTasks", attemptData.taskId));
        if (taskDoc.exists()) {
          setTask({ id: taskDoc.id, ...taskDoc.data() });
        }

        const studentDoc = await getDoc(doc(db, "users", attemptData.studentId));
        if (studentDoc.exists()) {
          setStudent({ id: studentDoc.id, ...studentDoc.data() });
        }

      } catch (err) {
        console.error("Error loading evaluation data:", err);
        setError("Failed to load evaluation data.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, router]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const pct = parseInt(percentage);
    if (isNaN(pct) || pct < 0 || pct > 100) {
      setError("Please enter a valid percentage between 0 and 100.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      // 1. Update the attempt
      await updateDoc(doc(db, "practicalTaskAttempts", id), {
        evaluation: {
          status: 'evaluated',
          percentage: pct,
          feedback,
          evaluatorId: user?.uid,
          evaluatedAt: serverTimestamp()
        }
      });

      // 2. Trigger aggregation
      await updateSkillScore(attempt.studentId, attempt.skillId);

      // 3. Navigate back
      router.push("/dashboard/admin/evaluations");
    } catch (err) {
      console.error("Error saving evaluation:", err);
      setError("Failed to save evaluation. Please check your permissions.");
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen pb-32">
        <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!attempt || !task) {
    return (
      <div className="p-8 text-center text-gray-500">
        Attempt or task not found.
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6 mb-12">
      <div className="flex items-center space-x-4 mb-6">
        <Link 
          href="/dashboard/admin/evaluations"
          className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Evaluate Submission</h1>
          <p className="text-gray-500 text-sm">Task: {task.title}</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md flex items-start">
          <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 mr-3 flex-shrink-0" />
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Submission Details */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
              <User className="w-5 h-5 mr-2 text-blue-500" />
              Student Information
            </h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Email</p>
                <p className="font-medium text-gray-900">{student?.email || 'Unknown'}</p>
              </div>
              <div>
                <p className="text-gray-500">Student ID</p>
                <p className="font-medium text-gray-900 font-mono text-xs mt-1">{attempt.studentId}</p>
              </div>
              <div>
                <p className="text-gray-500">Time Spent</p>
                <p className="font-medium text-gray-900">{Math.round((attempt.timeSpent || 0) / 60)} minutes</p>
              </div>
              <div>
                <p className="text-gray-500">Submitted At</p>
                <p className="font-medium text-gray-900">
                  {attempt.submittedAt ? new Date(attempt.submittedAt.toDate()).toLocaleString() : 'Unknown'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
              <Code className="w-5 h-5 mr-2 text-blue-500" />
              Submission Details
            </h2>

            {/* Project Links (Phase 15B) */}
            {(attempt.submission?.githubUrl || attempt.submission?.liveUrl) && (
              <div className="mb-6 space-y-3">
                <h3 className="text-sm font-semibold text-gray-700">Project Links</h3>
                {attempt.submission.githubUrl && (
                  <div className="flex items-center">
                    <span className="w-24 text-sm text-gray-500">GitHub:</span>
                    <a href={attempt.submission.githubUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline break-all">
                      {attempt.submission.githubUrl}
                    </a>
                  </div>
                )}
                {attempt.submission.liveUrl && (
                  <div className="flex items-center">
                    <span className="w-24 text-sm text-gray-500">Live Demo:</span>
                    <a href={attempt.submission.liveUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline break-all">
                      {attempt.submission.liveUrl}
                    </a>
                  </div>
                )}
              </div>
            )}

            <div className="bg-gray-50 p-4 rounded-md border border-gray-200 overflow-x-auto">
              <pre className="text-sm font-mono text-gray-800 whitespace-pre-wrap">
                {attempt.submission?.code || <span className="text-gray-400 italic">No code submitted.</span>}
              </pre>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
              <FileText className="w-5 h-5 mr-2 text-blue-500" />
              Explanation
            </h2>
            <div className="bg-gray-50 p-4 rounded-md border border-gray-200 prose prose-sm max-w-none">
              <p className="whitespace-pre-wrap text-gray-700">
                {attempt.submission?.explanation || <span className="text-gray-400 italic">No explanation provided.</span>}
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Grading Panel */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm sticky top-24">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
              <CheckCircle2 className="w-5 h-5 mr-2 text-green-500" />
              Evaluation Panel
            </h2>

            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Evaluation Criteria</h3>
              <ul className="space-y-2">
                {task.evaluationCriteria?.map((c: any, i: number) => (
                  <li key={i} className="text-sm flex justify-between items-start bg-gray-50 p-2 rounded border border-gray-100">
                    <span className="text-gray-700 flex-1 pr-4">{c.criterion}</span>
                    <span className="font-semibold text-gray-900 bg-gray-200 px-2 py-0.5 rounded text-xs">
                      {c.weight}%
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Final Score (%) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    required
                    value={percentage}
                    onChange={(e) => setPercentage(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none pr-8"
                    placeholder="e.g. 85"
                  />
                  <span className="absolute right-3 top-2.5 text-gray-400">%</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Feedback
                </label>
                <textarea
                  rows={4}
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
                  placeholder="Provide constructive feedback..."
                ></textarea>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full flex items-center justify-center px-4 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {submitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Evaluation
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
