"use client";

import { useState } from "react";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, Database, ShieldAlert, CheckCircle, BookOpen, Layers, Terminal, Award } from "lucide-react";
import { seedCatalog } from "@/lib/content-catalog/seeder";
import { getCatalogSummary } from "@/lib/content-catalog";

export default function SeedPage() {
  const { user, role } = useAuth();
  const [loading, setLoading] = useState(false);
  const [forceReset, setForceReset] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [success, setSuccess] = useState(false);

  const summary = getCatalogSummary();

  const handleSeed = async () => {
    setLoading(true);
    setLogs([]);
    setSuccess(false);

    try {
      const result = await seedCatalog(db, {
        forceReset,
      });

      setLogs(result.logs);
      setSuccess(result.success);
    } catch (error: any) {
      console.error("Seed execution failure:", error);
      setLogs((prev) => [...prev, `Error: ${error.message}`]);
    } finally {
      setLoading(false);
    }
  };

  if (!user || role !== "admin") {
    return (
      <div className="max-w-xl mx-auto mt-16 p-8 bg-white border border-gray-200 rounded-xl text-center shadow-sm">
        <ShieldAlert className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">Access Denied</h2>
        <p className="text-gray-600 text-sm">
          You must be logged in as an <strong>Administrator</strong> to run the curriculum content seeder.
        </p>
      </div>
    );
  }

  const isProduction = process.env.NEXT_PUBLIC_APP_ENV === "production";

  return (
    <div className="max-w-3xl mx-auto mt-12 p-8 bg-white border border-gray-200 rounded-2xl shadow-sm space-y-8">
      <div>
        <div className="flex items-center space-x-3 mb-2">
          <Database className="w-7 h-7 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900">Curriculum Content Catalog Seeder</h1>
        </div>
        <p className="text-gray-600 text-sm">
          Idempotent, deterministic seeder for SkillBridge educational catalog: Frontend, Backend, and Full Stack tracks.
        </p>
      </div>

      {isProduction && (
        <div className="p-4 border border-yellow-300 bg-yellow-50 rounded-xl flex items-start space-x-3">
          <ShieldAlert className="w-5 h-5 text-yellow-700 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-yellow-900 space-y-1">
            <p className="font-semibold">Production Environment Notice</p>
            <p className="text-xs text-yellow-800">
              You are seeding to <strong>Production</strong>. This operation writes deterministic curriculum documents
              (skills, roles, topics, problems, assessments, practical tasks). It will <strong>NOT</strong> create fake users,
              students, companies, or ML telemetry.
            </p>
          </div>
        </div>
      )}

      {/* Catalog Preview Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="bg-gray-50 border border-gray-200 p-4 rounded-xl text-center">
          <Layers className="w-5 h-5 text-blue-600 mx-auto mb-1" />
          <p className="text-2xl font-bold text-gray-900">{summary.rolesCount}</p>
          <p className="text-xs text-gray-500 font-medium">Career Tracks</p>
        </div>
        <div className="bg-gray-50 border border-gray-200 p-4 rounded-xl text-center">
          <Award className="w-5 h-5 text-indigo-600 mx-auto mb-1" />
          <p className="text-2xl font-bold text-gray-900">{summary.skillsCount}</p>
          <p className="text-xs text-gray-500 font-medium">Skills</p>
        </div>
        <div className="bg-gray-50 border border-gray-200 p-4 rounded-xl text-center">
          <BookOpen className="w-5 h-5 text-emerald-600 mx-auto mb-1" />
          <p className="text-2xl font-bold text-gray-900">{summary.learningTopicsCount}</p>
          <p className="text-xs text-gray-500 font-medium">Learning Topics</p>
        </div>
        <div className="bg-gray-50 border border-gray-200 p-4 rounded-xl text-center">
          <Terminal className="w-5 h-5 text-purple-600 mx-auto mb-1" />
          <p className="text-2xl font-bold text-gray-900">{summary.practiceProblemsCount}</p>
          <p className="text-xs text-gray-500 font-medium">Practice Problems</p>
        </div>
        <div className="bg-gray-50 border border-gray-200 p-4 rounded-xl text-center">
          <CheckCircle className="w-5 h-5 text-amber-600 mx-auto mb-1" />
          <p className="text-2xl font-bold text-gray-900">{summary.assessmentsCount}</p>
          <p className="text-xs text-gray-500 font-medium">Assessments ({summary.assessmentQuestionsCount} Qs)</p>
        </div>
        <div className="bg-gray-50 border border-gray-200 p-4 rounded-xl text-center">
          <Database className="w-5 h-5 text-cyan-600 mx-auto mb-1" />
          <p className="text-2xl font-bold text-gray-900">{summary.practicalTasksCount}</p>
          <p className="text-xs text-gray-500 font-medium">Practical Tasks</p>
        </div>
      </div>

      <div className="flex items-center space-x-3 p-4 bg-gray-50 border border-gray-200 rounded-xl">
        <input
          type="checkbox"
          id="forceReset"
          checked={forceReset}
          onChange={(e) => setForceReset(e.target.checked)}
          className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
        />
        <label htmlFor="forceReset" className="text-sm text-gray-700 font-medium cursor-pointer">
          Force Reset (Cleans existing curriculum collections before writing deterministic catalog)
        </label>
      </div>

      <button
        onClick={handleSeed}
        disabled={loading}
        className="w-full sm:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl shadow-sm transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Seeding Curriculum Catalog...</span>
          </>
        ) : (
          <span>Execute Idempotent Catalog Seed</span>
        )}
      </button>

      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-xl flex items-center space-x-3 text-green-900 text-sm">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
          <span>Curriculum content catalog has been successfully written to Firestore!</span>
        </div>
      )}

      {logs.length > 0 && (
        <div className="bg-gray-950 text-green-400 p-5 rounded-xl font-mono text-xs max-h-72 overflow-y-auto space-y-1">
          {logs.map((log, index) => (
            <div key={index}>{log}</div>
          ))}
        </div>
      )}
    </div>
  );
}
