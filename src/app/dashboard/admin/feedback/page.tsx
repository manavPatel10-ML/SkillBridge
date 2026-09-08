"use client";

import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, MessageSquare, AlertCircle, CheckCircle2, Filter, ShieldAlert } from "lucide-react";
import { BetaFeedback, BetaFeedbackCategory } from "@/types";

export default function AdminBetaFeedbackPage() {
  const { user } = useAuth();
  const [feedbacks, setFeedbacks] = useState<BetaFeedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");

  useEffect(() => {
    if (!user) return;

    const fetchFeedbacks = async () => {
      try {
        const token = await auth.currentUser?.getIdToken();
        const res = await fetch('/api/beta/feedback', {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!res.ok) {
          throw new Error("Failed to load feedback records");
        }

        const data = await res.json();
        setFeedbacks(data.feedbacks || []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchFeedbacks();
  }, [user]);

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-4" />
        <p className="text-gray-500">Loading Beta User Feedback...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 p-6 rounded-xl text-center">
        <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
        <h2 className="text-xl font-bold text-red-700">Error Loading Feedback</h2>
        <p className="text-red-600 mt-2">{error}</p>
      </div>
    );
  }

  const filteredFeedbacks = categoryFilter === "ALL" 
    ? feedbacks 
    : feedbacks.filter(f => f.category === categoryFilter);

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <span className="px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-800 uppercase">Critical</span>;
      case 'high':
        return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-orange-100 text-orange-800 uppercase">High</span>;
      case 'medium':
        return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-yellow-100 text-yellow-800 uppercase">Medium</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-gray-100 text-gray-800 uppercase">Low</span>;
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <MessageSquare className="h-8 w-8 text-indigo-600" />
            Beta User Feedback & Issues
          </h1>
          <p className="mt-2 text-gray-600">
            Real user feedback reported during the controlled beta period.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-500" />
          <select 
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm bg-white"
          >
            <option value="ALL">All Categories ({feedbacks.length})</option>
            <option value="AUTH">Auth</option>
            <option value="ONBOARDING">Onboarding</option>
            <option value="LEARNING">Learning</option>
            <option value="PRACTICE">Practice</option>
            <option value="ASSESSMENT">Assessment</option>
            <option value="PRACTICAL">Practical</option>
            <option value="RECOMMENDATION">Recommendation</option>
            <option value="PROFILE">Profile</option>
            <option value="COMPANY">Company</option>
            <option value="HIRING">Hiring</option>
            <option value="PERFORMANCE">Performance</option>
            <option value="SECURITY">Security</option>
            <option value="OTHER">Other</option>
          </select>
        </div>
      </div>

      {filteredFeedbacks.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-gray-900">No Beta Issues Reported</h3>
          <p className="text-gray-500 mt-1">No feedback matching the selected filter has been submitted by beta users.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredFeedbacks.map((item) => (
            <div key={item.id} className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-3">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-blue-100 text-blue-800">
                    {item.category}
                  </span>
                  {getSeverityBadge(item.severity)}
                  <span className="text-xs text-gray-500 font-mono">Flow: {item.affectedFlow}</span>
                </div>
                <span className="text-xs text-gray-400">
                  {item.timestamp ? new Date(item.timestamp).toLocaleString() : 'Recent'}
                </span>
              </div>

              <p className="text-gray-900 font-medium text-base">{item.description}</p>

              <div className="flex items-center gap-4 text-xs text-gray-500 pt-2 border-t border-gray-100">
                <span>Reporter: <span className="font-semibold text-gray-700">{item.userEmail || item.userId}</span></span>
                <span>Role: <span className="capitalize font-semibold text-gray-700">{item.userRole}</span></span>
                <span>Env: <span className="font-mono">{item.environment}</span></span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
