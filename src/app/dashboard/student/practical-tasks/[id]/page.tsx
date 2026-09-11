"use client";

import { use, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, query, where, getDocs, orderBy, limit } from "firebase/firestore";
import { Loader2, Code, Clock, Activity, ArrowLeft, PlayCircle, CheckCircle2, FileText, AlertCircle } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { PracticalTask } from "@/types";

function normalizeEvaluationCriteria(criteria: any): { criterion: string; weight: number }[] {
  if (!criteria) return [];
  if (Array.isArray(criteria)) return criteria;
  if (typeof criteria === "object") {
    return Object.entries(criteria).map(([criterion, weight]) => ({
      criterion: criterion
        .replace(/([A-Z])/g, " $1")
        .replace(/_/g, " ")
        .replace(/^./, str => str.toUpperCase()),
      weight: Number(weight) || 0
    }));
  }
  return [];
}

type Props = {
  params: Promise<{ id: string }>;
};

export default function PracticalTaskDetailPage({ params }: Props) {
  const { id } = use(params);
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const recId = searchParams.get('recId');
  
  const [task, setTask] = useState<PracticalTask | null>(null);
  const [skillName, setSkillName] = useState("");
  const [loading, setLoading] = useState(true);
  const [recentAttempt, setRecentAttempt] = useState<any>(null);

  useEffect(() => {
    if (!user) return;

    const fetchTaskDetails = async () => {
      try {
        const taskRef = doc(db, "practicalTasks", id);
        const taskSnap = await getDoc(taskRef);

        if (taskSnap.exists()) {
          const taskData = { id: taskSnap.id, ...taskSnap.data() } as PracticalTask;
          setTask(taskData);

          // Fetch skill name
          const skillRef = doc(db, "skills", taskData.skillId);
          const skillSnap = await getDoc(skillRef);
          if (skillSnap.exists()) {
            setSkillName(skillSnap.data().name);
          }

          // Check if user has already taken or is currently taking this task
          const attemptsRef = collection(db, "practicalTaskAttempts");
          const q = query(
            attemptsRef, 
            where("studentId", "==", user.uid),
            where("taskId", "==", id),
            orderBy("startedAt", "desc"),
            limit(1)
          );
          
          const attemptSnap = await getDocs(q);
          if (!attemptSnap.empty) {
            setRecentAttempt({ id: attemptSnap.docs[0].id, ...attemptSnap.docs[0].data() });
          }
        }
      } catch (error) {
        console.error("Error fetching practical task:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTaskDetails();
  }, [id, user]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!task) {
    return (
      <div className="max-w-3xl mx-auto py-12 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Task Not Found</h2>
        <p className="text-gray-600 mb-6">The practical task you are looking for does not exist or has been removed.</p>
        <Link 
          href="/dashboard/student/practical-tasks"
          className="inline-flex items-center text-blue-600 hover:text-blue-800"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Practical Tasks
        </Link>
      </div>
    );
  }

  const isCompleted = recentAttempt?.status === "completed";
  const isInProgress = recentAttempt?.status === "in_progress";

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header Navigation */}
      <Link 
        href="/dashboard/student/practical-tasks"
        className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-700 mb-2"
      >
        <ArrowLeft className="w-4 h-4 mr-1" />
        Back to Tasks
      </Link>

      {/* Task Header */}
      <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5">
          <Code className="w-48 h-48" />
        </div>
        
        <div className="relative z-10">
          <div className="flex items-center space-x-3 mb-4">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
              {skillName || task.skillId}
            </span>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
              {task.difficulty}
            </span>
          </div>

          <h1 className="text-3xl font-bold text-gray-900 mb-4">{task.title}</h1>
          <p className="text-lg text-gray-600 mb-8 max-w-2xl">{task.description}</p>

          <div className="flex flex-wrap gap-6 mb-8">
            <div className="flex items-center text-gray-700">
              <div className="p-2 bg-blue-50 rounded-lg mr-3">
                <Clock className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium">Duration</p>
                <p className="font-semibold">{task.durationMinutes} Minutes</p>
              </div>
            </div>
            
            <div className="flex items-center text-gray-700">
              <div className="p-2 bg-green-50 rounded-lg mr-3">
                <FileText className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium">Requirements</p>
                <p className="font-semibold">{task.requirements?.length || 0} Items</p>
              </div>
            </div>
          </div>

          {/* Call to Action */}
          <div className="pt-6 border-t border-gray-100">
            {isInProgress ? (
              <div>
                <div className="mb-4 p-4 bg-orange-50 border border-orange-200 rounded-lg flex items-start">
                  <Activity className="w-5 h-5 text-orange-600 mt-0.5 mr-3 shrink-0" />
                  <div>
                    <h4 className="font-medium text-orange-900">Task In Progress</h4>
                    <p className="text-sm text-orange-700 mt-1">You have an ongoing attempt for this task.</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    let url = `/dashboard/student/practical-tasks/${task.id}/take`;
                    if (recId) url += `?recId=${recId}`;
                    router.push(url);
                  }}
                  className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-orange-600 hover:bg-orange-700"
                >
                  <PlayCircle className="w-5 h-5 mr-2" />
                  Resume Task
                </button>
              </div>
            ) : isCompleted ? (
              <div>
                <div className="mb-4 p-5 bg-green-50 border border-green-200 rounded-lg flex items-start">
                  <CheckCircle2 className="w-6 h-6 text-green-600 mt-0.5 mr-3 shrink-0" />
                  <div className="w-full">
                    <h4 className="font-semibold text-lg text-green-900">Task Completed</h4>
                    <p className="text-sm text-green-700 mt-1 mb-5">You have successfully submitted this practical task.</p>
                    
                    {/* Submission Links */}
                    {recentAttempt?.submission && (
                      <div className="bg-white/60 p-4 rounded-md border border-green-200/60 mb-4 space-y-3">
                        <h5 className="text-xs font-bold text-green-800 uppercase tracking-wider mb-2">Your Submission</h5>
                        {recentAttempt.submission.githubUrl && (
                          <div className="flex items-center text-sm">
                            <Code className="w-4 h-4 mr-2 text-gray-500" />
                            <span className="font-medium text-gray-700 mr-2">GitHub:</span>
                            <a href={recentAttempt.submission.githubUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline truncate">
                              {recentAttempt.submission.githubUrl}
                            </a>
                          </div>
                        )}
                        {recentAttempt.submission.liveUrl && (
                          <div className="flex items-center text-sm">
                            <Activity className="w-4 h-4 mr-2 text-gray-500" />
                            <span className="font-medium text-gray-700 mr-2">Live Demo:</span>
                            <a href={recentAttempt.submission.liveUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline truncate">
                              {recentAttempt.submission.liveUrl}
                            </a>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Evaluation Details */}
                    <div className="bg-white/60 p-4 rounded-md border border-green-200/60">
                       <h5 className="text-xs font-bold text-green-800 uppercase tracking-wider mb-3">Evaluation Status</h5>
                       {recentAttempt?.evaluation?.status === 'evaluated' ? (
                         <div className="space-y-3">
                           <div className="flex items-center justify-between">
                             <span className="text-sm font-medium text-gray-700">Score</span>
                             <span className="text-2xl font-black text-green-700">{recentAttempt.evaluation.percentage}%</span>
                           </div>
                           {recentAttempt.evaluation.feedback && (
                             <div className="mt-3 pt-3 border-t border-green-200/60">
                               <span className="text-xs font-semibold text-gray-600 block mb-1">Admin Feedback:</span>
                               <p className="text-sm text-gray-800 italic">"{recentAttempt.evaluation.feedback}"</p>
                             </div>
                           )}
                         </div>
                       ) : (
                         <div className="flex items-center text-sm text-yellow-700 bg-yellow-50 p-3 rounded border border-yellow-200">
                           <Clock className="w-4 h-4 mr-2 text-yellow-600" />
                           <span className="font-medium">Pending Admin Review</span>
                         </div>
                       )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <button
                onClick={() => {
                  let url = `/dashboard/student/practical-tasks/${task.id}/take`;
                  if (recId) url += `?recId=${recId}`;
                  router.push(url);
                }}
                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
              >
                <PlayCircle className="w-5 h-5 mr-2" />
                Start Task Now
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Task Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-8">
          {/* Instructions */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
              <FileText className="w-5 h-5 mr-2 text-blue-500" />
              Instructions
            </h3>
            <div className="prose prose-blue max-w-none text-gray-700">
              {task.instructions}
            </div>
          </div>

          {/* Requirements */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
              <CheckCircle2 className="w-5 h-5 mr-2 text-green-500" />
              Requirements
            </h3>
            <ul className="space-y-3">
              {task.requirements?.map((req, idx) => (
                <li key={idx} className="flex items-start">
                  <div className="min-w-6 text-green-500 mt-0.5">•</div>
                  <span className="text-gray-700">{req}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <h3 className="font-bold text-gray-900 mb-4">Submission Types</h3>
            <div className="flex flex-wrap gap-2">
              {task.submissionTypes?.map((type, idx) => (
                <span key={idx} className="px-3 py-1 bg-gray-100 text-gray-700 rounded-md text-sm font-medium capitalize">
                  {type}
                </span>
              ))}
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <h3 className="font-bold text-gray-900 mb-4">Evaluation Criteria</h3>
            <div className="space-y-4">
              {normalizeEvaluationCriteria(task.evaluationCriteria).map((item, idx) => (
                <div key={idx}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">{item.criterion}</span>
                    <span className="font-medium text-gray-900">{item.weight}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${item.weight}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
