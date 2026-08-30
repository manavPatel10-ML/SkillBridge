"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import { Loader2, History, CheckCircle2, XCircle } from "lucide-react";
import Link from "next/link";

type Assessment = {
  id: string;
  title: string;
  passingScore: number;
};

type Attempt = {
  id: string;
  assessmentId: string;
  score: number;
  percentage: number;
  status: string;
  completedAt: any;
};

type TaskAttempt = {
  id: string;
  taskId: string;
  skillId: string;
  status: string;
  submittedAt: any;
  timeSpent: number;
};

type PracticalTask = {
  id: string;
  title: string;
};

export default function HistoryPage() {
  const { user } = useAuth();
  
  const [activeTab, setActiveTab] = useState<"assessments" | "tasks" | "applications">("assessments");
  
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [assessments, setAssessments] = useState<Record<string, Assessment>>({});
  
  const [taskAttempts, setTaskAttempts] = useState<TaskAttempt[]>([]);
  const [tasks, setTasks] = useState<Record<string, PracticalTask>>({});

  const [applications, setApplications] = useState<any[]>([]);
  const [challenges, setChallenges] = useState<Record<string, any>>({});
  
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      try {
        // Fetch completed attempts for student
        const attemptsSnap = await getDocs(
          query(
            collection(db, "assessmentAttempts"), 
            where("studentId", "==", user.uid),
            where("status", "==", "completed")
          )
        );
        const attemptsData = attemptsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Attempt));
        setAttempts(attemptsData.sort((a, b) => b.completedAt?.toMillis() - a.completedAt?.toMillis()));

        // Fetch assessments metadata to display titles
        const assessmentIds = Array.from(new Set(attemptsData.map(a => a.assessmentId)));
        
        if (assessmentIds.length > 0) {
          const assessmentsSnap = await getDocs(
            query(collection(db, "assessments"), where("active", "==", true)) // Simplified fetch all active since in is limited to 10
          );
          
          const assessmentsMap: Record<string, Assessment> = {};
          assessmentsSnap.forEach(doc => {
            assessmentsMap[doc.id] = { id: doc.id, ...doc.data() } as Assessment;
          });
          setAssessments(assessmentsMap);
        }

        // Fetch practical task attempts
        const taskAttemptsSnap = await getDocs(
          query(
            collection(db, "practicalTaskAttempts"),
            where("studentId", "==", user.uid),
            where("status", "==", "completed")
          )
        );
        const taskAttemptsData = taskAttemptsSnap.docs.map(d => ({ id: d.id, ...d.data() } as TaskAttempt));
        setTaskAttempts(taskAttemptsData.sort((a, b) => b.submittedAt?.toMillis() - a.submittedAt?.toMillis()));

        // Fetch tasks metadata
        const taskIds = Array.from(new Set(taskAttemptsData.map(a => a.taskId)));
        if (taskIds.length > 0) {
          const tasksSnap = await getDocs(
            query(collection(db, "practicalTasks"), where("active", "==", true))
          );
          const tasksMap: Record<string, PracticalTask> = {};
          tasksSnap.forEach(doc => {
            tasksMap[doc.id] = { id: doc.id, ...doc.data() } as PracticalTask;
          });
          setTasks(tasksMap);
        }

        // Fetch applications
        const appsSnap = await getDocs(
          query(
            collection(db, "challengeApplications"),
            where("studentId", "==", user.uid)
          )
        );
        const appsData = appsSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));
        // Sort by appliedAt or similar date if available, fallback to completedAt
        setApplications(appsData.sort((a, b) => (b.appliedAt?.toMillis() || b.completedAt?.toMillis() || 0) - (a.appliedAt?.toMillis() || a.completedAt?.toMillis() || 0)));

        const appChallengeIds = Array.from(new Set(appsData.map(a => a.challengeId)));
        if (appChallengeIds.length > 0) {
          const challengesSnap = await getDocs(
            query(collection(db, "companyChallenges"))
          );
          const challengesMap: Record<string, any> = {};
          challengesSnap.forEach(doc => {
            challengesMap[doc.id] = { id: doc.id, ...doc.data() };
          });
          setChallenges(challengesMap);
        }

      } catch (error) {
        console.error("Error fetching history:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Activity History</h1>
        <p className="mt-2 text-gray-600">Review your past assessments and practical tasks.</p>
      </div>

      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab("assessments")}
            className={`${
              activeTab === "assessments"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Assessments
          </button>
          <button
            onClick={() => setActiveTab("tasks")}
            className={`${
              activeTab === "tasks"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Practical Tasks
          </button>
          <button
            onClick={() => setActiveTab("applications")}
            className={`${
              activeTab === "applications"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Applications
          </button>
        </nav>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {activeTab === "assessments" ? (
          attempts.length > 0 ? (
            <div className="divide-y divide-gray-200">
            {attempts.map(attempt => {
              const assessment = assessments[attempt.assessmentId];
              if (!assessment) return null;
              
              const passed = attempt.percentage >= assessment.passingScore;
              
              return (
                <div key={attempt.id} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-gray-50 transition-colors">
                  <div className="flex items-center mb-4 sm:mb-0">
                    <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center mr-4 ${passed ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                      {passed ? <CheckCircle2 className="w-6 h-6" /> : <XCircle className="w-6 h-6" />}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">{assessment.title}</h3>
                      <p className="text-sm text-gray-500">
                        {attempt.completedAt ? new Date(attempt.completedAt.toDate()).toLocaleString() : 'Completed recently'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto space-x-6">
                    <div className="text-right">
                      <p className={`text-xl font-bold ${passed ? 'text-green-600' : 'text-red-600'}`}>
                        {attempt.percentage}%
                      </p>
                      <p className="text-xs text-gray-500 font-medium uppercase">
                        {passed ? 'Passed' : 'Failed'}
                      </p>
                    </div>
                    
                    <Link
                      href={`/dashboard/student/assessments/${assessment.id}/result/${attempt.id}`}
                      className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                    >
                      View Details
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <History className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900">No history yet</h3>
            <p className="mt-1 text-gray-500 text-center max-w-sm">
              You haven't completed any assessments yet. Head over to the Assessments page to get started.
            </p>
            <Link 
              href="/dashboard/student/assessments"
              className="mt-6 px-4 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 transition-colors"
            >
              Browse Assessments
            </Link>
          </div>
        )
        ) : activeTab === "tasks" ? (
          taskAttempts.length > 0 ? (
            <div className="divide-y divide-gray-200">
              {taskAttempts.map(attempt => {
                const task = tasks[attempt.taskId];
                if (!task) return null;
                
                return (
                  <div key={attempt.id} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-gray-50 transition-colors">
                    <div className="flex items-center mb-4 sm:mb-0">
                      <div className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center mr-4 bg-blue-100 text-blue-600">
                        <CheckCircle2 className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">{task.title}</h3>
                        <p className="text-sm text-gray-500">
                          {attempt.submittedAt ? new Date(attempt.submittedAt.toDate()).toLocaleString() : 'Completed recently'}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto space-x-6">
                      <div className="text-right">
                        <p className="text-sm text-gray-500 font-medium">
                          Time Spent
                        </p>
                        <p className="text-lg font-bold text-gray-900">
                          {Math.floor(attempt.timeSpent / 60)}m {attempt.timeSpent % 60}s
                        </p>
                      </div>
                      
                      <Link
                        href={`/dashboard/student/practical-tasks/${attempt.taskId}`}
                        className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                      >
                        View Task
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <History className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900">No tasks history yet</h3>
              <p className="mt-1 text-gray-500 text-center max-w-sm">
                You haven't completed any practical tasks yet. Head over to the Practical Tasks page to get started.
              </p>
              <Link 
                href="/dashboard/student/practical-tasks"
                className="mt-6 px-4 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 transition-colors"
              >
                Browse Tasks
              </Link>
            </div>
          )
        ) : (
          applications.length > 0 ? (
            <div className="divide-y divide-gray-200">
              {applications.map(app => {
                const challenge = challenges[app.challengeId];
                if (!challenge) return null;
                
                return (
                  <div key={app.id} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-gray-50 transition-colors">
                    <div className="flex items-center mb-4 sm:mb-0">
                      <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center mr-4 ${
                        app.status === 'shortlisted' ? 'bg-green-100 text-green-600' : 
                        app.status === 'rejected' ? 'bg-red-100 text-red-600' : 
                        'bg-blue-100 text-blue-600'
                      }`}>
                        {app.status === 'shortlisted' ? <CheckCircle2 className="w-6 h-6" /> : 
                         app.status === 'rejected' ? <XCircle className="w-6 h-6" /> : 
                         <History className="w-6 h-6" />}
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">{challenge.title}</h3>
                        <p className="text-sm text-gray-500">
                          {app.completedAt ? new Date(app.completedAt).toLocaleString() : 'Recently'}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto space-x-6">
                      <div className="text-right">
                        <p className={`text-sm font-bold capitalize ${
                          app.status === 'shortlisted' ? 'text-green-600' : 
                          app.status === 'rejected' ? 'text-red-600' : 
                          'text-blue-600'
                        }`}>
                          {app.status.replace('_', ' ')}
                        </p>
                        {app.overallScore > 0 && (
                          <p className="text-xs text-gray-500 font-medium mt-1">
                            Score: {app.overallScore}%
                          </p>
                        )}
                      </div>
                      
                      <Link
                        href={`/dashboard/student/company-challenges/${app.challengeId}/attempt`}
                        className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                      >
                        View Dashboard
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <History className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900">No applications yet</h3>
              <p className="mt-1 text-gray-500 text-center max-w-sm">
                You haven't applied to any company challenges yet. Head over to the Challenges page to discover opportunities.
              </p>
              <Link 
                href="/dashboard/student/company-challenges"
                className="mt-6 px-4 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 transition-colors"
              >
                Browse Challenges
              </Link>
            </div>
          )
        )}
      </div>
    </div>
  );
}
