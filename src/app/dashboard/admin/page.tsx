"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, getCountFromServer } from "firebase/firestore";
import { 
  Users, 
  Building2, 
  Award, 
  BookOpen, 
  HelpCircle, 
  Code, 
  CheckCircle2, 
  ClipboardCheck,
  Loader2
} from "lucide-react";

type Stats = {
  totalStudents: number;
  totalCompanies: number;
  totalSkills: number;
  activeAssessments: number;
  totalQuestions: number;
  activePracticalTasks: number;
  completedAssessments: number;
  practicalTaskSubmissions: number;
};

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [
          studentsSnap,
          companiesSnap,
          skillsSnap,
          activeAssessmentsSnap,
          questionsSnap,
          activeTasksSnap,
          completedAssessmentsSnap,
          completedTasksSnap
        ] = await Promise.all([
          getCountFromServer(query(collection(db, "users"), where("role", "==", "student"))),
          getCountFromServer(query(collection(db, "users"), where("role", "==", "company"))),
          getCountFromServer(collection(db, "skills")),
          getCountFromServer(query(collection(db, "assessments"), where("active", "==", true))),
          getCountFromServer(collection(db, "questions")),
          getCountFromServer(query(collection(db, "practicalTasks"), where("active", "==", true))),
          getCountFromServer(query(collection(db, "assessmentAttempts"), where("status", "==", "completed"))),
          getCountFromServer(query(collection(db, "practicalTaskAttempts"), where("status", "==", "completed")))
        ]);

        setStats({
          totalStudents: studentsSnap.data().count,
          totalCompanies: companiesSnap.data().count,
          totalSkills: skillsSnap.data().count,
          activeAssessments: activeAssessmentsSnap.data().count,
          totalQuestions: questionsSnap.data().count,
          activePracticalTasks: activeTasksSnap.data().count,
          completedAssessments: completedAssessmentsSnap.data().count,
          practicalTaskSubmissions: completedTasksSnap.data().count
        });
      } catch (error) {
        console.error("Error fetching admin stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  const statCards = [
    { name: "Total Students", value: stats?.totalStudents || 0, icon: Users, color: "text-blue-600", bg: "bg-blue-100" },
    { name: "Total Companies", value: stats?.totalCompanies || 0, icon: Building2, color: "text-purple-600", bg: "bg-purple-100" },
    { name: "Total Skills", value: stats?.totalSkills || 0, icon: Award, color: "text-indigo-600", bg: "bg-indigo-100" },
    { name: "Active Assessments", value: stats?.activeAssessments || 0, icon: BookOpen, color: "text-green-600", bg: "bg-green-100" },
    { name: "Total Questions", value: stats?.totalQuestions || 0, icon: HelpCircle, color: "text-orange-600", bg: "bg-orange-100" },
    { name: "Active Practical Tasks", value: stats?.activePracticalTasks || 0, icon: Code, color: "text-cyan-600", bg: "bg-cyan-100" },
    { name: "Completed Assessments", value: stats?.completedAssessments || 0, icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-100" },
    { name: "Practical Submissions", value: stats?.practicalTaskSubmissions || 0, icon: ClipboardCheck, color: "text-teal-600", bg: "bg-teal-100" },
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Admin Overview</h1>
        <p className="mt-2 text-gray-600">Platform statistics and activity at a glance.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.name} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex items-center">
              <div className={`p-4 rounded-full ${stat.bg} ${stat.color} mr-4`}>
                <Icon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">{stat.name}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value.toLocaleString()}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-4">
        <h2 className="text-xl font-bold text-gray-900">Beta Operations & Management</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <a
            href="/dashboard/admin/beta-health"
            className="p-4 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 transition-colors flex items-center justify-between"
          >
            <div>
              <p className="font-bold text-blue-900">Beta Health & Funnel</p>
              <p className="text-xs text-blue-700 mt-1">Real user activity, funnel conversions, KPIs</p>
            </div>
          </a>

          <a
            href="/dashboard/admin/feedback"
            className="p-4 rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 transition-colors flex items-center justify-between"
          >
            <div>
              <p className="font-bold text-indigo-900">Beta Feedback</p>
              <p className="text-xs text-indigo-700 mt-1">View reported issues by beta students & companies</p>
            </div>
          </a>

          <a
            href="/dashboard/admin/ml-readiness"
            className="p-4 rounded-xl border border-purple-200 bg-purple-50 hover:bg-purple-100 transition-colors flex items-center justify-between"
          >
            <div>
              <p className="font-bold text-purple-900">ML Training Gate</p>
              <p className="text-xs text-purple-700 mt-1">Observation counts & baseline fallback status</p>
            </div>
          </a>
        </div>
      </div>
    </div>
  );
}
