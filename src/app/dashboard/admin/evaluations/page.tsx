"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, getDoc, orderBy } from "firebase/firestore";
import { Loader2, Search, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import Link from "next/link";

// Simple relative time formatter
function formatDistanceToNow(date: Date) {
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

type Attempt = {
  id: string;
  studentId: string;
  taskId: string;
  skillId: string;
  status: string;
  submittedAt: any;
  timeSpent: number;
  evaluation?: {
    status: 'pending' | 'evaluated';
    percentage: number;
  };
  // joined data
  studentEmail?: string;
  taskTitle?: string;
};

export default function AdminEvaluationsPage() {
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'evaluated'>('pending');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const attemptsQuery = query(
          collection(db, "practicalTaskAttempts"),
          where("status", "==", "completed")
        );
        const attemptsSnap = await getDocs(attemptsQuery);
        
        const attemptsData: Attempt[] = [];
        
        // Fetch related data
        for (const docSnap of attemptsSnap.docs) {
          const data = docSnap.data();
          
          let studentEmail = "Unknown Student";
          let taskTitle = "Unknown Task";
          
          try {
            const userDoc = await getDoc(doc(db, "users", data.studentId));
            if (userDoc.exists()) studentEmail = userDoc.data().email;
            
            const taskDoc = await getDoc(doc(db, "practicalTasks", data.taskId));
            if (taskDoc.exists()) taskTitle = taskDoc.data().title;
          } catch (err) {
            console.error("Error joining data", err);
          }
          
          attemptsData.push({
            id: docSnap.id,
            studentId: data.studentId,
            taskId: data.taskId,
            skillId: data.skillId,
            status: data.status,
            submittedAt: data.submittedAt,
            timeSpent: data.timeSpent,
            evaluation: data.evaluation,
            studentEmail,
            taskTitle
          });
        }
        
        // Sort by submittedAt descending
        attemptsData.sort((a, b) => {
          const aTime = a.submittedAt?.toMillis() || 0;
          const bTime = b.submittedAt?.toMillis() || 0;
          return bTime - aTime;
        });

        setAttempts(attemptsData);
      } catch (error) {
        console.error("Error fetching evaluations:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const filteredAttempts = attempts.filter(a => {
    if (filter === 'all') return true;
    const isEvaluated = a.evaluation?.status === 'evaluated';
    if (filter === 'evaluated') return isEvaluated;
    return !isEvaluated; // pending
  });

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Practical Evaluations</h1>
          <p className="text-gray-600 mt-1">Review and grade student practical task submissions.</p>
        </div>
        
        <div className="flex bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setFilter('pending')}
            className={`px-4 py-2 text-sm font-medium rounded-md ${filter === 'pending' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
          >
            Pending
          </button>
          <button
            onClick={() => setFilter('evaluated')}
            className={`px-4 py-2 text-sm font-medium rounded-md ${filter === 'evaluated' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
          >
            Evaluated
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 text-sm font-medium rounded-md ${filter === 'all' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
          >
            All
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : filteredAttempts.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="w-12 h-12 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">No submissions found</h3>
          <p className="text-gray-500">
            {filter === 'pending' ? "You're all caught up! There are no pending evaluations." : "No submissions match this filter."}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Task</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Submitted</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredAttempts.map((attempt) => {
                const isEvaluated = attempt.evaluation?.status === 'evaluated';
                return (
                  <tr key={attempt.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{attempt.studentEmail}</div>
                      <div className="text-sm text-gray-500 font-mono text-xs mt-0.5">{attempt.studentId.substring(0, 8)}...</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{attempt.taskTitle}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {attempt.submittedAt ? formatDistanceToNow(attempt.submittedAt.toDate()) : 'Unknown'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {isEvaluated ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Evaluated ({attempt.evaluation?.percentage}%)
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                          <Clock className="w-3 h-3 mr-1" />
                          Pending Review
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Link 
                        href={`/dashboard/admin/evaluations/${attempt.id}`}
                        className="text-blue-600 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-md transition-colors"
                      >
                        {isEvaluated ? 'View / Edit' : 'Evaluate'}
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
