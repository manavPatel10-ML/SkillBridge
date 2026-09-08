"use client";

import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, Activity, Database, AlertCircle, CheckCircle, BrainCircuit } from "lucide-react";
import Link from "next/link";

export default function MLReadinessDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    
    const fetchData = async () => {
      try {
        const token = await auth.currentUser?.getIdToken();
        const res = await fetch('/api/admin/ml-readiness', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!res.ok) throw new Error("Failed to load readiness data");
        
        const json = await res.json();
        setData(json);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [user]);

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-4" />
        <p className="text-gray-500">Calculating Model Data Readiness...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-red-50 p-6 rounded-xl text-center">
        <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
        <h2 className="text-xl font-bold text-red-700">Access Denied or Error</h2>
        <p className="text-red-600 mt-2">{error}</p>
      </div>
    );
  }

  const renderStatusBadge = (status: string) => {
    if (status === 'READY' || status === 'VALIDATED' || status === 'PRODUCTION') {
      return <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1"/> {status}</span>;
    }
    if (status === 'EXPERIMENTAL') {
      return <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800"><BrainCircuit className="w-3 h-3 mr-1"/> {status}</span>;
    }
    return <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-800"><Activity className="w-3 h-3 mr-1"/> {status}</span>;
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <Database className="h-8 w-8 text-blue-600" />
          ML Data Readiness Dashboard
        </h1>
        <p className="mt-2 text-gray-600">
          Monitor the progression of real-world data collection needed to safely train and activate SkillBridge ML models.
          Production engines strictly use deterministic baselines until real telemetry requirements are satisfied.
        </p>
      </div>

      {/* Development vs Production Separation Banner */}
      {data.developmentData && (
        <div className="bg-slate-900 text-white rounded-xl p-6 shadow-md border border-slate-800">
          <div className="flex items-center justify-between pb-4 border-b border-slate-700">
            <div>
              <span className="text-xs uppercase tracking-wider font-semibold text-purple-400">Environment: Local Development</span>
              <h3 className="text-xl font-bold text-white mt-1">Development Data (Synthetic Training & Validation)</h3>
            </div>
            <span className="text-xs bg-purple-900/60 border border-purple-500 text-purple-200 px-3 py-1 rounded-full font-mono">
              STATUS: EXPERIMENTAL
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
            <div className="bg-slate-800/80 rounded-lg p-4 border border-slate-700">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-slate-300">Model 1: Performance Prediction</span>
                {renderStatusBadge(data.developmentData.model1.status)}
              </div>
              <p className="text-2xl font-bold text-white mt-2">{data.developmentData.model1.syntheticObservations.toLocaleString()} <span className="text-xs font-normal text-slate-400">synthetic observations</span></p>
              <p className="text-xs text-slate-400 mt-1 font-mono">Version: {data.developmentData.model1.version}</p>
            </div>
            <div className="bg-slate-800/80 rounded-lg p-4 border border-slate-700">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-slate-300">Model 2: Adaptive Assignment</span>
                {renderStatusBadge(data.developmentData.model2.status)}
              </div>
              <p className="text-2xl font-bold text-white mt-2">{data.developmentData.model2.syntheticObservations.toLocaleString()} <span className="text-xs font-normal text-slate-400">synthetic observations</span></p>
              <p className="text-xs text-slate-400 mt-1 font-mono">Version: {data.developmentData.model2.version}</p>
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-4 italic">
            * Note: Synthetic data is segregated in ml/dev-data/ and is NEVER counted toward genuine production readiness gates below.
          </p>
        </div>
      )}

      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5 text-blue-600" />
          Production Real Data Gates (Strict Real User Telemetry)
        </h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Model 1 Panel */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 p-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <BrainCircuit className="w-5 h-5 text-indigo-500" /> Model 1: Performance Prediction
            </h2>
            {renderStatusBadge(data.model1.status)}
          </div>
          
          <div className="p-6 space-y-6">
            <div className="flex justify-between items-end border-b border-gray-100 pb-4">
              <div>
                <p className="text-sm font-medium text-gray-500 uppercase">Training Eligibility</p>
                <div className="mt-1">{renderStatusBadge(data.model1.trainingEligibility)}</div>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-gray-900">{data.model1.observations}</p>
                <p className="text-xs text-gray-500">Valid Observations / 5000 req.</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                <span className="text-gray-500 block mb-1">Unique Students</span>
                <span className="font-semibold text-gray-900 text-lg">{data.model1.uniqueStudents}</span>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                <span className="text-gray-500 block mb-1">Unique Skills/Topics</span>
                <span className="font-semibold text-gray-900 text-lg">{data.model1.uniqueSkills} / {data.model1.uniqueTopics}</span>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                <span className="text-gray-500 block mb-1">Cold-Start %</span>
                <span className="font-semibold text-gray-900 text-lg">{data.model1.coldStartPercent}%</span>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                <span className="text-gray-500 block mb-1">Metadata Version</span>
                <span className="font-mono text-gray-900">{data.model1.version}</span>
              </div>
            </div>

            {data.model1.reasons.length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
                <p className="font-semibold mb-1 flex items-center gap-1"><AlertCircle className="w-4 h-4"/> Blockers:</p>
                <ul className="list-disc pl-5">
                  {data.model1.reasons.map((r: string, i: number) => <li key={i}>{r}</li>)}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Model 2 Panel */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 p-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <BrainCircuit className="w-5 h-5 text-emerald-500" /> Model 2: Adaptive Assignment
            </h2>
            {renderStatusBadge(data.model2.status)}
          </div>
          
          <div className="p-6 space-y-6">
            <div className="flex justify-between items-end border-b border-gray-100 pb-4">
              <div>
                <p className="text-sm font-medium text-gray-500 uppercase">Training Eligibility</p>
                <div className="mt-1">{renderStatusBadge(data.model2.trainingEligibility)}</div>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-gray-900">{data.model2.completed}</p>
                <p className="text-xs text-gray-500">Completed Recs / 1000 req.</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                <span className="text-gray-500 block mb-1">Total Recommended</span>
                <span className="font-semibold text-gray-900 text-lg">{data.model2.recommendations}</span>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                <span className="text-gray-500 block mb-1">Conversion (Started)</span>
                <span className="font-semibold text-gray-900 text-lg">{data.model2.started}</span>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                <span className="text-gray-500 block mb-1">Abandoned</span>
                <span className="font-semibold text-gray-900 text-lg">{data.model2.abandoned}</span>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                <span className="text-gray-500 block mb-1">Metadata Version</span>
                <span className="font-mono text-gray-900">{data.model2.version}</span>
              </div>
            </div>

            {data.model2.reasons.length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
                <p className="font-semibold mb-1 flex items-center gap-1"><AlertCircle className="w-4 h-4"/> Blockers:</p>
                <ul className="list-disc pl-5">
                  {data.model2.reasons.map((r: string, i: number) => <li key={i}>{r}</li>)}
                </ul>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
