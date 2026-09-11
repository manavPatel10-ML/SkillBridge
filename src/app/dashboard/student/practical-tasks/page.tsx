"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState, useMemo } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where, getDoc, doc } from "firebase/firestore";
import { Loader2, Code, Clock, Activity, Search, Filter, CheckCircle2, PlayCircle, ArrowRight, BookOpen, Layers, Sparkles, AlertCircle } from "lucide-react";
import Link from "next/link";
import { PracticalTask, PracticalTaskAttempt } from "@/types";

type Skill = {
  id: string;
  name: string;
  category?: string;
};

type Role = {
  id: string;
  title: string;
  requiredSkillIds: string[];
};

export default function PracticalTasksPage() {
  const { user } = useAuth();
  
  const [tasks, setTasks] = useState<PracticalTask[]>([]);
  const [skills, setSkills] = useState<Record<string, Skill>>({});
  const [roles, setRoles] = useState<Role[]>([]);
  const [attempts, setAttempts] = useState<Record<string, PracticalTaskAttempt>>({});
  const [loading, setLoading] = useState(true);
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTrack, setSelectedTrack] = useState<string>("all");
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("all");
  const [selectedSkillFilter, setSelectedSkillFilter] = useState<string>("all");
  
  const [studentSkillIds, setStudentSkillIds] = useState<string[]>([]);
  const [targetRoleId, setTargetRoleId] = useState<string | null>(null);

  useEffect(() => {
    // Read skillId from URL query param if present
    const params = new URLSearchParams(window.location.search);
    const skillParam = params.get("skillId");
    if (skillParam) {
      setSelectedSkillFilter(skillParam);
    }
  }, []);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      try {
        setLoading(true);

        // 1. Fetch Student Profile for selected skills and target role
        const profileRef = doc(db, "studentProfiles", user.uid);
        const profileSnap = await getDoc(profileRef);
        let selectedSkills: string[] = [];
        let roleId: string | null = null;
        if (profileSnap.exists()) {
          const pData = profileSnap.data();
          selectedSkills = pData.selectedSkills || [];
          roleId = pData.targetRoleId || null;
          setStudentSkillIds(selectedSkills);
          setTargetRoleId(roleId);
        }

        // 2. Fetch all active practical tasks
        const tasksSnap = await getDocs(
          query(collection(db, "practicalTasks"), where("active", "==", true))
        );
        const tasksData = tasksSnap.docs.map(d => ({ id: d.id, ...d.data() } as PracticalTask));
        setTasks(tasksData);

        // 3. Fetch skills mapping
        const skillsSnap = await getDocs(collection(db, "skills"));
        const skillsMap: Record<string, Skill> = {};
        skillsSnap.forEach(d => {
          skillsMap[d.id] = { id: d.id, ...d.data() } as Skill;
        });
        setSkills(skillsMap);

        // 4. Fetch roles
        const rolesSnap = await getDocs(query(collection(db, "roles"), where("active", "==", true)));
        const rolesData = rolesSnap.docs.map(d => ({ id: d.id, ...d.data() } as Role));
        setRoles(rolesData);

        // 5. Fetch student's practical task attempts to track progress
        const attemptsSnap = await getDocs(
          query(collection(db, "practicalTaskAttempts"), where("studentId", "==", user.uid))
        );
        const attemptsMap: Record<string, PracticalTaskAttempt> = {};
        attemptsSnap.forEach(d => {
          const data = { id: d.id, ...d.data() } as PracticalTaskAttempt;
          // If multiple attempts, prioritize in_progress or completed
          if (!attemptsMap[data.taskId] || data.status === 'completed' || data.status === 'in_progress') {
            attemptsMap[data.taskId] = data;
          }
        });
        setAttempts(attemptsMap);

      } catch (error) {
        console.error("Error fetching practical tasks:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const activeRole = roles.find(r => r.id === targetRoleId);

  // Track to skills mapping
  const trackSkillsMap: Record<string, string[]> = useMemo(() => {
    const map: Record<string, string[]> = {
      all: [],
      frontend: ["html-css", "javascript", "react", "git-github"],
      backend: ["nodejs", "sql", "rest-apis", "auth-security", "computer-networks"],
      fullstack: ["html-css", "javascript", "react", "nodejs", "sql", "rest-apis", "auth-security", "fullstack-integration"]
    };
    return map;
  }, []);

  // Filter tasks based on track, difficulty, search term, and skill filter
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      // 1. Skill filter from query or selector
      if (selectedSkillFilter !== "all" && task.skillId !== selectedSkillFilter) {
        return false;
      }

      // 2. Track filter
      if (selectedTrack !== "all") {
        const allowedSkills = trackSkillsMap[selectedTrack] || [];
        if (!allowedSkills.includes(task.skillId)) {
          return false;
        }
      }

      // 3. Difficulty filter
      if (selectedDifficulty !== "all") {
        if (task.difficulty.toLowerCase() !== selectedDifficulty.toLowerCase()) {
          return false;
        }
      }

      // 4. Search query
      if (searchTerm.trim()) {
        const queryLower = searchTerm.toLowerCase();
        const skillName = (skills[task.skillId]?.name || "").toLowerCase();
        const titleMatches = task.title.toLowerCase().includes(queryLower);
        const descMatches = (task.description || "").toLowerCase().includes(queryLower);
        const skillMatches = skillName.includes(queryLower);
        if (!titleMatches && !descMatches && !skillMatches) {
          return false;
        }
      }

      return true;
    });
  }, [tasks, skills, selectedTrack, selectedDifficulty, selectedSkillFilter, searchTerm, trackSkillsMap]);

  // Group stats
  const stats = useMemo(() => {
    const total = tasks.length;
    const completed = Object.values(attempts).filter(a => a.status === "completed").length;
    const inProgress = Object.values(attempts).filter(a => a.status === "in_progress").length;
    return { total, completed, inProgress };
  }, [tasks, attempts]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 rounded-2xl p-8 text-white shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Code className="w-64 h-64 text-blue-400" />
        </div>
        
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30 mb-3">
            <Sparkles className="w-3.5 h-3.5 mr-1.5" />
            Engineering Projects & Practical Tasks
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl mb-3">
            Practical Engineering Challenges
          </h1>
          <p className="text-slate-300 text-base leading-relaxed mb-6">
            Build real-world web applications, resilient REST APIs, and full-stack systems. Complete hands-on deliverables with real code, automated validation rubrics, and verified evaluation.
          </p>

          {/* Metrics ribbon */}
          <div className="flex flex-wrap gap-4 pt-4 border-t border-slate-800">
            <div className="flex items-center space-x-2">
              <span className="text-2xl font-bold text-white">{tasks.length}</span>
              <span className="text-xs text-slate-400 font-medium">Available Tasks</span>
            </div>
            <div className="h-6 w-px bg-slate-800 self-center" />
            <div className="flex items-center space-x-2">
              <span className="text-2xl font-bold text-green-400">{stats.completed}</span>
              <span className="text-xs text-slate-400 font-medium">Completed</span>
            </div>
            <div className="h-6 w-px bg-slate-800 self-center" />
            <div className="flex items-center space-x-2">
              <span className="text-2xl font-bold text-amber-400">{stats.inProgress}</span>
              <span className="text-xs text-slate-400 font-medium">In Progress</span>
            </div>
          </div>
        </div>
      </div>

      {/* Active Track Banner if student has enrolled role */}
      {activeRole && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg text-blue-700">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-semibold text-blue-800 uppercase tracking-wider">Active Career Track</span>
              <h3 className="text-base font-bold text-gray-900">{activeRole.title}</h3>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                if (activeRole.id.includes("front")) setSelectedTrack("frontend");
                else if (activeRole.id.includes("back")) setSelectedTrack("backend");
                else if (activeRole.id.includes("full")) setSelectedTrack("fullstack");
              }}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-md transition-colors shadow-sm"
            >
              Filter to My Track
            </button>
            <Link
              href="/dashboard/student/roles"
              className="px-3 py-1.5 bg-white border border-blue-300 text-blue-700 hover:bg-blue-50 text-xs font-semibold rounded-md transition-colors"
            >
              Change Track
            </Link>
          </div>
        </div>
      )}

      {/* Controls & Filters Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center">
          {/* Search Input */}
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              className="block w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Search by title, description, or skill..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Track Filter Tabs */}
          <div className="flex items-center space-x-1 bg-gray-100 p-1 rounded-lg self-start md:self-auto overflow-x-auto">
            {[
              { id: "all", label: "All Tracks" },
              { id: "frontend", label: "Frontend" },
              { id: "backend", label: "Backend" },
              { id: "fullstack", label: "Full Stack" }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedTrack(tab.id)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                  selectedTrack === tab.id
                    ? "bg-white text-blue-700 shadow-sm font-semibold"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Secondary Filter Row */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-gray-100 text-xs">
          <span className="text-gray-500 font-medium flex items-center">
            <Filter className="w-3.5 h-3.5 mr-1" />
            Filters:
          </span>

          {/* Difficulty Filter */}
          <select
            value={selectedDifficulty}
            onChange={(e) => setSelectedDifficulty(e.target.value)}
            className="border border-gray-300 rounded-md py-1 px-2.5 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="all">All Difficulties</option>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>

          {/* Skill Filter Dropdown */}
          <select
            value={selectedSkillFilter}
            onChange={(e) => setSelectedSkillFilter(e.target.value)}
            className="border border-gray-300 rounded-md py-1 px-2.5 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500 max-w-[200px]"
          >
            <option value="all">All Skills</option>
            {Object.values(skills).map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>

          {/* Active Filter Clear Button */}
          {(searchTerm || selectedTrack !== "all" || selectedDifficulty !== "all" || selectedSkillFilter !== "all") && (
            <button
              onClick={() => {
                setSearchTerm("");
                setSelectedTrack("all");
                setSelectedDifficulty("all");
                setSelectedSkillFilter("all");
              }}
              className="text-blue-600 hover:text-blue-800 font-medium ml-auto"
            >
              Reset All Filters
            </button>
          )}
        </div>
      </div>

      {/* Practical Tasks Cards Grid */}
      {filteredTasks.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTasks.map(task => {
            const skill = skills[task.skillId];
            const attempt = attempts[task.id];
            const isCompleted = attempt?.status === "completed";
            const isInProgress = attempt?.status === "in_progress";
            const isEvaluated = attempt?.evaluation?.status === "evaluated";

            // Difficulty styling
            const diffLower = (task.difficulty || "beginner").toLowerCase();
            const diffBadgeClass = 
              diffLower === "beginner" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
              diffLower === "intermediate" ? "bg-blue-50 text-blue-700 border-blue-200" :
              "bg-purple-50 text-purple-700 border-purple-200";

            return (
              <div 
                key={task.id} 
                className="bg-white rounded-xl shadow-sm border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group"
              >
                <div className="p-6">
                  {/* Top metadata tags */}
                  <div className="flex justify-between items-start mb-3 gap-2">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-800">
                      {skill?.name || task.skillId}
                    </span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold border ${diffBadgeClass}`}>
                      <Activity className="w-3 h-3 mr-1" />
                      {task.difficulty}
                    </span>
                  </div>

                  {/* Task Title & Description */}
                  <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors line-clamp-2">
                    {task.title}
                  </h3>
                  <p className="text-sm text-gray-600 line-clamp-3 mb-4 leading-relaxed">
                    {task.description}
                  </p>

                  {/* Task Specs */}
                  <div className="flex items-center space-x-4 text-xs text-gray-500 pt-3 border-t border-gray-100">
                    <span className="flex items-center">
                      <Clock className="w-3.5 h-3.5 mr-1 text-gray-400" />
                      {task.durationMinutes || 60} mins
                    </span>
                    <span className="flex items-center">
                      <Code className="w-3.5 h-3.5 mr-1 text-gray-400" />
                      {task.requirements?.length || 0} requirements
                    </span>
                  </div>
                </div>

                {/* Card Action Footer */}
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                  {/* Attempt Status Badge */}
                  <div>
                    {isCompleted ? (
                      <span className="inline-flex items-center text-xs font-semibold text-green-700">
                        <CheckCircle2 className="w-4 h-4 mr-1 text-green-600" />
                        {isEvaluated ? `${attempt?.evaluation?.percentage}% Scored` : "Submitted"}
                      </span>
                    ) : isInProgress ? (
                      <span className="inline-flex items-center text-xs font-semibold text-amber-700 animate-pulse">
                        <Clock className="w-4 h-4 mr-1 text-amber-600" />
                        In Progress
                      </span>
                    ) : (
                      <span className="text-xs font-medium text-gray-500">
                        Not Started
                      </span>
                    )}
                  </div>

                  {/* Action Link */}
                  <Link
                    href={`/dashboard/student/practical-tasks/${task.id}`}
                    className={`inline-flex items-center px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm ${
                      isCompleted 
                        ? "bg-white border border-gray-300 text-gray-700 hover:bg-gray-100" 
                        : isInProgress
                        ? "bg-amber-600 hover:bg-amber-700 text-white"
                        : "bg-blue-600 hover:bg-blue-700 text-white"
                    }`}
                  >
                    {isCompleted ? "View Work" : isInProgress ? "Resume" : "Start Task"}
                    <ArrowRight className="w-3 h-3 ml-1" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-12 text-center max-w-xl mx-auto space-y-4">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto text-gray-400">
            <Filter className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-gray-900">No Practical Tasks Match Your Filter</h3>
          <p className="text-sm text-gray-600">
            Try adjusting your track or difficulty filters, or search for different keywords.
          </p>
          <button
            onClick={() => {
              setSearchTerm("");
              setSelectedTrack("all");
              setSelectedDifficulty("all");
              setSelectedSkillFilter("all");
            }}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
          >
            Clear All Filters
          </button>
        </div>
      )}
    </div>
  );
}
