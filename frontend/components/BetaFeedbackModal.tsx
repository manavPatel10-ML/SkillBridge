"use client";

import { useState } from "react";
import { auth } from "../services/firebase-client";
import { MessageSquare, X, Send, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { BetaFeedbackCategory } from "@shared/types";

const CATEGORIES: { label: string; value: BetaFeedbackCategory }[] = [
  { label: "Authentication & Login", value: "AUTH" },
  { label: "Onboarding Flow", value: "ONBOARDING" },
  { label: "Learning Path & Topics", value: "LEARNING" },
  { label: "Coding Practice", value: "PRACTICE" },
  { label: "Assessments", value: "ASSESSMENT" },
  { label: "Practical Tasks", value: "PRACTICAL" },
  { label: "Recommendations", value: "RECOMMENDATION" },
  { label: "Student Profile", value: "PROFILE" },
  { label: "Company Dashboard", value: "COMPANY" },
  { label: "Hiring Tasks & Vacancies", value: "HIRING" },
  { label: "Performance / Speed", value: "PERFORMANCE" },
  { label: "Security or Privacy", value: "SECURITY" },
  { label: "Other / General", value: "OTHER" },
];

export function BetaFeedbackModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [category, setCategory] = useState<BetaFeedbackCategory>("LEARNING");
  const [severity, setSeverity] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const [description, setDescription] = useState("");
  const [affectedFlow, setAffectedFlow] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      setError("Please provide a description of the issue or feedback.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) {
        throw new Error("You must be logged in to submit feedback.");
      }

      const res = await fetch("/api/beta/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          category,
          severity,
          description: description.trim(),
          affectedFlow: affectedFlow.trim() || window.location.pathname
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit feedback.");
      }

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setIsOpen(false);
        setDescription("");
        setAffectedFlow("");
      }, 2000);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2.5 rounded-full shadow-lg transition-all"
      >
        <MessageSquare className="w-4 h-4" />
        <span>Beta Feedback</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 relative">
            <div className="flex justify-between items-center border-b pb-3">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-gray-900 text-lg">Report Beta Feedback / Issue</h3>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {success ? (
              <div className="py-8 text-center space-y-2">
                <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto" />
                <h4 className="font-bold text-gray-900">Feedback Received!</h4>
                <p className="text-sm text-gray-600">Thank you for helping test the SkillBridge beta.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Area / Category</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as BetaFeedbackCategory)}
                      className="w-full border rounded-lg p-2 text-sm"
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Severity</label>
                    <select
                      value={severity}
                      onChange={(e) => setSeverity(e.target.value as any)}
                      className="w-full border rounded-lg p-2 text-sm"
                    >
                      <option value="low">Low (Minor annoyance)</option>
                      <option value="medium">Medium (Functionality issue)</option>
                      <option value="high">High (Blocked workflow)</option>
                      <option value="critical">Critical (Crash / Data issue)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Affected Page / Flow (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. /dashboard/student/learn/top_1"
                    value={affectedFlow}
                    onChange={(e) => setAffectedFlow(e.target.value)}
                    className="w-full border rounded-lg p-2 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Description</label>
                  <textarea
                    rows={4}
                    placeholder="Describe what happened, what was expected, or your feedback..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full border rounded-lg p-2 text-sm"
                    required
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    Submit Feedback
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
