"use client";

import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { 
  Loader2, 
  Activity, 
  Users, 
  BookOpen, 
  CheckCircle2, 
  TrendingUp, 
  Award, 
  BarChart3, 
  AlertTriangle,
  ArrowRight,
  Building2,
  Briefcase
} from "lucide-react";

export default function AdminBetaHealthPage() {
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const fetchHealth = async () => {
      try {
        const token = await auth.currentUser?.getIdToken();
        const res = await fetch('/api/admin/beta-health', {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!res.ok) {
          throw new Error("Failed to load beta health metrics");
        }

        const json = await res.json();
        setData(json);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchHealth();
  }, [user]);

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-4" />
        <p className="text-gray-500">Aggregating Real Beta Health Metrics...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-red-50 p-6 rounded-xl text-center max-w-lg mx-auto">
        <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-2" />
        <h2 className="text-xl font-bold text-red-700">Unable to Load Metrics</h2>
        <p className="text-red-600 mt-2">{error || "No data returned."}</p>
      </div>
    );
  }

  const { studentMetrics, companyMetrics, recommendationMetrics, outcomesMetrics, funnel, companyFunnel = [] } = data;

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <Activity className="h-8 w-8 text-blue-600" />
          Beta Product Health & Dual-Sided Funnel
        </h1>
        <p className="mt-2 text-gray-600">
          Real-time metrics strictly derived from genuine beta student and company activity (automated test and simulator records excluded).
        </p>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Real Students</span>
            <Users className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900 mt-2">{studentMetrics?.registeredStudents || 0}</p>
          <p className="text-xs text-gray-500 mt-1">{studentMetrics?.activatedStudents || 0} activated ({outcomesMetrics?.progressionRate || 0}%)</p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Partner Companies</span>
            <Building2 className="w-5 h-5 text-indigo-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900 mt-2">{companyMetrics?.registeredCompanies || 0}</p>
          <p className="text-xs text-gray-500 mt-1">{companyMetrics?.activeSubscribers || 0} with talent access</p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Recommendations</span>
            <TrendingUp className="w-5 h-5 text-purple-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900 mt-2">{recommendationMetrics?.recommendationsGenerated || 0}</p>
          <p className="text-xs text-gray-500 mt-1">{recommendationMetrics?.recommendationsCompleted || 0} completed ({outcomesMetrics?.completionRate || 0}%)</p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Pass Rate</span>
            <Award className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900 mt-2">{outcomesMetrics?.passRate || 0}%</p>
          <p className="text-xs text-gray-500 mt-1">Avg Score: {outcomesMetrics?.averageScore || 0}/100</p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Tasks Scored</span>
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900 mt-2">{recommendationMetrics?.recommendationsScored || 0}</p>
          <p className="text-xs text-gray-500 mt-1">{recommendationMetrics?.recommendationsAbandoned || 0} abandoned</p>
        </div>
      </div>

      {/* Student Conversion Funnel */}
      <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm space-y-6">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-blue-600" />
          Student Conversion Funnel
        </h2>
        <p className="text-sm text-gray-500">
          Tracking student progression from signup through learning, practice, adaptive recommendation, and evaluated verified outcome.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          {funnel.map((step: any, idx: number) => {
            const isFirst = idx === 0;
            const prevCount = isFirst ? step.count : funnel[idx - 1].count;
            const convPct = prevCount > 0 ? Math.round((step.count / prevCount) * 100) : 0;

            return (
              <div key={step.step} className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex flex-col justify-between">
                <div>
                  <span className="text-xs font-bold text-blue-600">Step {idx + 1}</span>
                  <p className="text-sm font-semibold text-gray-800 mt-1 leading-tight">{step.step}</p>
                </div>
                <div className="mt-4 pt-3 border-t border-gray-200">
                  <p className="text-2xl font-bold text-gray-900">{step.count}</p>
                  {!isFirst && (
                    <p className="text-xs text-gray-500 mt-1">
                      {convPct}% conversion
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Company Conversion Funnel */}
      <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm space-y-6">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Building2 className="w-5 h-5 text-indigo-600" />
          Company Hiring Funnel
        </h2>
        <p className="text-sm text-gray-500">
          Tracking company progression from registration through talent access, vacancy creation, candidate applications, and evaluations.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
          {companyFunnel.map((step: any, idx: number) => {
            const isFirst = idx === 0;
            const prevCount = isFirst ? step.count : companyFunnel[idx - 1].count;
            const convPct = prevCount > 0 ? Math.round((step.count / prevCount) * 100) : 0;

            return (
              <div key={step.step} className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex flex-col justify-between">
                <div>
                  <span className="text-xs font-bold text-indigo-600">Step {idx + 1}</span>
                  <p className="text-sm font-semibold text-gray-800 mt-1 leading-tight">{step.step}</p>
                </div>
                <div className="mt-4 pt-3 border-t border-gray-200">
                  <p className="text-2xl font-bold text-gray-900">{step.count}</p>
                  {!isFirst && (
                    <p className="text-xs text-gray-500 mt-1">
                      {convPct}% conversion
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Activity Breakdown Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
          <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-600" />
            Learning & Practice
          </h3>
          <div className="space-y-3 divide-y divide-gray-100">
            <div className="flex justify-between items-center pt-2">
              <span className="text-sm text-gray-600">Learning Topics Started</span>
              <span className="font-semibold text-gray-900">{studentMetrics?.learningTopicsStarted || 0}</span>
            </div>
            <div className="flex justify-between items-center pt-2">
              <span className="text-sm text-gray-600">Learning Topics Completed</span>
              <span className="font-semibold text-gray-900">{studentMetrics?.learningTopicsCompleted || 0}</span>
            </div>
            <div className="flex justify-between items-center pt-2">
              <span className="text-sm text-gray-600">Practice Problems Started</span>
              <span className="font-semibold text-gray-900">{studentMetrics?.practiceStarted || 0}</span>
            </div>
            <div className="flex justify-between items-center pt-2">
              <span className="text-sm text-gray-600">Practice Problems Completed</span>
              <span className="font-semibold text-gray-900">{studentMetrics?.practiceCompleted || 0}</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
          <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
            <Award className="w-5 h-5 text-emerald-600" />
            Assessments & Practical Tasks
          </h3>
          <div className="space-y-3 divide-y divide-gray-100">
            <div className="flex justify-between items-center pt-2">
              <span className="text-sm text-gray-600">Assessments Started</span>
              <span className="font-semibold text-gray-900">{studentMetrics?.assessmentsStarted || 0}</span>
            </div>
            <div className="flex justify-between items-center pt-2">
              <span className="text-sm text-gray-600">Assessments Completed</span>
              <span className="font-semibold text-gray-900">{studentMetrics?.assessmentsCompleted || 0}</span>
            </div>
            <div className="flex justify-between items-center pt-2">
              <span className="text-sm text-gray-600">Practical Tasks Started</span>
              <span className="font-semibold text-gray-900">{studentMetrics?.practicalTasksStarted || 0}</span>
            </div>
            <div className="flex justify-between items-center pt-2">
              <span className="text-sm text-gray-600">Practical Tasks Completed</span>
              <span className="font-semibold text-gray-900">{studentMetrics?.practicalTasksCompleted || 0}</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
          <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-indigo-600" />
            Company Hiring Activity
          </h3>
          <div className="space-y-3 divide-y divide-gray-100">
            <div className="flex justify-between items-center pt-2">
              <span className="text-sm text-gray-600">Vacancies / Challenges</span>
              <span className="font-semibold text-gray-900">{companyMetrics?.vacanciesCreated || 0}</span>
            </div>
            <div className="flex justify-between items-center pt-2">
              <span className="text-sm text-gray-600">Applications Received</span>
              <span className="font-semibold text-gray-900">{companyMetrics?.applicationsReceived || 0}</span>
            </div>
            <div className="flex justify-between items-center pt-2">
              <span className="text-sm text-gray-600">Evaluations Completed</span>
              <span className="font-semibold text-gray-900">{companyMetrics?.evaluationsCompleted || 0}</span>
            </div>
            <div className="flex justify-between items-center pt-2">
              <span className="text-sm text-gray-600">In Interview / Shortlisted</span>
              <span className="font-semibold text-gray-900">{companyMetrics?.interviewing || 0}</span>
            </div>
            <div className="flex justify-between items-center pt-2">
              <span className="text-sm text-gray-600">Offers / Hires</span>
              <span className="font-semibold text-gray-900">{companyMetrics?.hired || 0}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
