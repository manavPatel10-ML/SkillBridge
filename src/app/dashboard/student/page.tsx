"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { 
  CheckCircle, 
  Code, 
  BookOpen,
  TrendingUp,
  Clock,
  Terminal,
  CheckCircle2,
  ArrowRight,
  Award,
  Zap
} from "lucide-react";
import Link from "next/link";
import { getSkillJourneyState, getSkillJourneyAction, SkillJourneyState } from "@/lib/mastery";
import { EngagementAuditService } from "@/lib/pilot-engagement-audit";

function StateBadge({ state }: { state: SkillJourneyState }) {
  const config = {
    verified: { bg: 'bg-green-100', text: 'text-green-700', label: 'Verified', icon: <CheckCircle2 className="w-3 h-3 mr-1" /> },
    competent: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Competent', icon: <Award className="w-3 h-3 mr-1" /> },
    practicing: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Practicing', icon: <Terminal className="w-3 h-3 mr-1" /> },
    learning: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Learning', icon: <BookOpen className="w-3 h-3 mr-1" /> },
    not_started: { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Not Started', icon: <Clock className="w-3 h-3 mr-1" /> }
  };
  const current = config[state];
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${current.bg} ${current.text}`}>
      {current.icon}
      {current.label}
    </span>
  );
}

export default function StudentDashboard() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState({
    verifiedSkills: 0,
    completedAssessments: 0,
    completedTasks: 0,
    practiceAttempts: 0,
    practiceSolved: 0
  });
  const [loading, setLoading] = useState(true);
  const [recommendedTasks, setRecommendedTasks] = useState<any[]>([]);
  const [selectedSkills, setSelectedSkills] = useState<any[]>([]);
  const [skillScores, setSkillScores] = useState<any[]>([]);
  const [practiceAttempts, setPracticeAttempts] = useState<any[]>([]);
  const [assessmentAttempts, setAssessmentAttempts] = useState<any[]>([]);
  const [targetRole, setTargetRole] = useState<any>(null);
  const [topRecommendation, setTopRecommendation] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      
      try {
        // Fetch Profile
        const docRef = doc(db, "studentProfiles", user.uid);
        const docSnap = await getDoc(docRef);
        let profileData = null;
        if (docSnap.exists()) {
          profileData = docSnap.data();
          setProfile(profileData);
        }

        // Fetch Assessment Attempts
        const attemptsSnap = await getDocs(
          query(
            collection(db, "assessmentAttempts"), 
            where("studentId", "==", user.uid),
            where("status", "==", "completed")
          )
        );
        
        let completed = 0;
        const passedAssessments = new Set<string>();
        
        // For MVP, we'll assume a hardcoded passing score of 70 since we'd otherwise need to fetch all assessments
        // A better approach would be to join the data, but this works for overview stats
        const allAssessments = attemptsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        setAssessmentAttempts(allAssessments);
        
        allAssessments.forEach((data: any) => {
          completed++;
          if (data.percentage >= 70) {
            passedAssessments.add(data.assessmentId);
          }
        });

        // Fetch Practical Task Attempts
        const taskAttemptsSnap = await getDocs(
          query(
            collection(db, "practicalTaskAttempts"),
            where("studentId", "==", user.uid),
            where("status", "==", "completed")
          )
        );

        // Fetch Practice Attempts
        const practiceSnap = await getDocs(
          query(
            collection(db, "practiceAttempts"),
            where("studentId", "==", user.uid)
          )
        );
        const allPractice = practiceSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        setPracticeAttempts(allPractice);
        
        const solvedPracticeProblems = new Set<string>();
        allPractice.forEach((data: any) => {
          if (data.passed) {
            solvedPracticeProblems.add(data.problemId);
          }
        });

        setStats({
          verifiedSkills: passedAssessments.size,
          completedAssessments: completed,
          completedTasks: taskAttemptsSnap.size,
          practiceAttempts: practiceSnap.size,
          practiceSolved: solvedPracticeProblems.size
        });

        // Fetch Recommended Tasks and Skills Data
        let activeSkillIds: string[] = [];
        
        if (profileData && profileData.targetRoleId) {
          const roleDoc = await getDoc(doc(db, "roles", profileData.targetRoleId));
          if (roleDoc.exists()) {
            setTargetRole({ id: roleDoc.id, ...roleDoc.data() });
            activeSkillIds = roleDoc.data().requiredSkillIds || [];
          }
        }
        
        // Safe fallback for legacy users without targetRoleId but with selectedSkills
        if (activeSkillIds.length === 0 && profileData && profileData.selectedSkills && profileData.selectedSkills.length > 0) {
          activeSkillIds = profileData.selectedSkills;
        }

        if (activeSkillIds.length > 0) {
          // Chunk the skills array if it exceeds Firestore's 10-item limit for 'in' queries
          const querySkills = activeSkillIds.slice(0, 10);
          
          if (querySkills.length > 0) {
            const tasksQuery = query(
              collection(db, "practicalTasks"),
              where("skillId", "in", querySkills),
              where("active", "==", true)
            );
            const tasksSnap = await getDocs(tasksQuery);
            const tasks = tasksSnap.docs.map(d => ({ id: d.id, ...d.data() }));
            setRecommendedTasks(tasks.slice(0, 3)); // Show up to 3

            // Also fetch the skills themselves
            const skillsQuery = query(
              collection(db, "skills"),
              where("__name__", "in", querySkills)
            );
            const skillsSnap = await getDocs(skillsQuery);
            setSelectedSkills(skillsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
          }
        }

        // Fetch Skill Scores
        const scoresSnap = await getDocs(
          query(collection(db, "skillScores"), where("studentId", "==", user.uid))
        );
        setSkillScores(scoresSnap.docs.map(d => ({ id: d.id, ...d.data() })));

        // Fetch Deterministic Adaptive Recommendations from server-side engine
        try {
          const token = await user.getIdToken();
          const recRes = await fetch('/api/recommendations/generate', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (recRes.ok) {
            const recJson = await recRes.json();
            if (recJson.recommendations && recJson.recommendations.length > 0) {
              setTopRecommendation(recJson.recommendations[0]);
            }
          }
        } catch (recErr) {
          console.warn("Could not fetch adaptive recommendations for dashboard:", recErr);
        }

      } catch (error) {
        console.error("Error fetching overview data:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [user]);

  if (loading) {
    return <div className="animate-pulse space-y-4">
      <div className="h-8 bg-gray-200 rounded w-1/4"></div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="h-32 bg-gray-200 rounded-xl"></div>
        <div className="h-32 bg-gray-200 rounded-xl"></div>
        <div className="h-32 bg-gray-200 rounded-xl"></div>
      </div>
    </div>;
  }

  const hasSkills = profile?.selectedSkills && profile.selectedSkills.length > 0;
  const hasAssessments = stats.completedAssessments > 0;
  const hasPractice = stats.practiceAttempts > 0;
  
  let completionPercentage = 40; // Basic Info and Education
  if (hasSkills) completionPercentage += 20;
  if (hasPractice) completionPercentage += 20;
  if (hasAssessments) completionPercentage += 20;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {profile?.fullName?.split(" ")[0] || "Student"}!
        </h1>
        <p className="text-gray-500 mt-1">Here's a summary of your practical hiring journey.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500">Verified Skills</p>
              <h3 className="text-2xl font-bold text-gray-900 mt-1">{stats.verifiedSkills}</h3>
            </div>
            <div className="p-2 bg-green-50 text-green-600 rounded-lg">
              <Award className="w-5 h-5" />
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-4 flex items-center">
            <TrendingUp className="w-3 h-3 mr-1 text-green-500" /> Pass assessments to earn
          </p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500">Completed Tasks</p>
              <h3 className="text-2xl font-bold text-gray-900 mt-1">{stats.completedTasks}</h3>
            </div>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Code className="w-5 h-5" />
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-4">
            {stats.completedTasks > 0 ? 'Great job on practicals!' : 'Start your first practical task'}
          </p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500">Assessments</p>
              <h3 className="text-2xl font-bold text-gray-900 mt-1">{stats.completedAssessments}</h3>
            </div>
            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
              <BookOpen className="w-5 h-5" />
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-4">
            {hasAssessments ? 'Keep up the good work!' : 'No assessments completed'}
          </p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500">Applications</p>
              <h3 className="text-2xl font-bold text-gray-900 mt-1">0</h3>
            </div>
            <div className="p-2 bg-orange-50 text-orange-600 rounded-lg">
              <CheckCircle className="w-5 h-5" />
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-4">Apply for challenges to see here</p>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          
          {/* Adaptive Next Task from Deterministic Engine */}
          {topRecommendation ? (
            <div className="bg-white p-6 rounded-xl border-2 border-blue-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-100 text-blue-800">
                    <Zap className="w-3 h-3 text-blue-600" />
                    Adaptive Next Task
                  </span>
                  <span className="text-xs text-gray-500 font-medium capitalize">
                    {topRecommendation.type}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-gray-900">
                  {topRecommendation.title}
                </h3>
                <p className="text-sm text-gray-600 max-w-lg">
                  {topRecommendation.reason || topRecommendation.description}
                </p>
              </div>
              <Link
                href={
                  topRecommendation.type === 'learning'
                    ? `/dashboard/student/learn/${topRecommendation.itemId}?recId=${topRecommendation.recommendationId || 'rec_dash'}`
                    : topRecommendation.type === 'assessment'
                    ? `/dashboard/student/assessments/${topRecommendation.itemId}?recId=${topRecommendation.recommendationId || 'rec_dash'}`
                    : topRecommendation.type === 'practical'
                    ? `/dashboard/student/practical-tasks/${topRecommendation.itemId}?recId=${topRecommendation.recommendationId || 'rec_dash'}`
                    : `/dashboard/student/practice/${topRecommendation.itemId}?recId=${topRecommendation.recommendationId || 'rec_dash'}`
                }
                className="shrink-0 inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors shadow-sm"
              >
                <span>
                  {topRecommendation.type === 'learning' ? 'Learn Concept' : topRecommendation.type === 'assessment' ? 'Take Assessment' : 'Start Task'}
                </span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-indigo-100 text-indigo-800">
                    <Zap className="w-3 h-3 text-indigo-600" />
                    Getting Started
                  </span>
                </div>
                <h3 className="text-lg font-bold text-gray-900">
                  {targetRole ? `Career Track: ${targetRole.title}` : "Begin Your Adaptive Learning Journey"}
                </h3>
                <p className="text-sm text-gray-600 max-w-lg">
                  {targetRole 
                    ? `Explore foundational topics and coding problems aligned with ${targetRole.title}.`
                    : "Select a target career path to receive personalized, performance-based adaptive recommendations."}
                </p>
              </div>
              <Link
                href={targetRole ? "/dashboard/student/learn" : "/dashboard/student/roles"}
                className="shrink-0 inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors shadow-sm"
              >
                <span>{targetRole ? "Start Learning" : "Select Role"}</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )}

          {/* Career Path Banner */}
          {targetRole ? (
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 rounded-xl border border-transparent shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-white">
              <div>
                <div className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-blue-500/40 text-blue-100 mb-2 uppercase tracking-wide">
                  Active Career Path
                </div>
                <h3 className="text-xl font-bold mb-1">{targetRole.title}</h3>
                <p className="text-blue-100 text-sm max-w-lg">
                  {targetRole.description || "Master industry-standard skills and advance through progressive learning modules, coding practice, and verification assessments."}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Link 
                  href="/dashboard/student/skills" 
                  className="shrink-0 px-4 py-2 bg-blue-500 hover:bg-blue-400 text-white font-medium text-sm rounded-lg transition-colors"
                >
                  View Skills
                </Link>
                <Link 
                  href="/dashboard/student/roles" 
                  className="shrink-0 px-4 py-2 bg-white text-blue-700 font-bold text-sm rounded-lg hover:bg-blue-50 transition-colors shadow-sm"
                >
                  Change Path
                </Link>
              </div>
            </div>
          ) : (
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 rounded-xl border border-transparent shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-white">
              <div>
                <h3 className="text-xl font-bold mb-1">Choose Your Career Path</h3>
                <p className="text-blue-100 text-sm max-w-lg">
                  Not sure what to learn next? Explore our structured career roadmaps to guide your learning and practice journey towards your dream role.
                </p>
              </div>
              <Link 
                href="/dashboard/student/roles" 
                className="shrink-0 px-5 py-2.5 bg-white text-blue-700 font-bold rounded-lg hover:bg-blue-50 transition-colors shadow-sm"
              >
                Explore Paths
              </Link>
            </div>
          )}

          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-1 flex items-center">
                <Terminal className="w-5 h-5 mr-2 text-blue-600" />
                Coding Practice
              </h3>
              <p className="text-sm text-gray-500">
                {hasPractice 
                  ? `You've solved ${stats.practiceSolved} practice problems. Keep learning to improve your skills!`
                  : "Start practicing your coding skills to identify weak topics before taking an assessment."}
              </p>
            </div>
            <Link href="/dashboard/student/practice" className="shrink-0 px-4 py-2 bg-blue-50 text-blue-700 font-medium rounded-md hover:bg-blue-100 transition-colors">
              {hasPractice ? "Resume Practice" : "Start Practicing"}
            </Link>
          </div>

          {/* Skill Journey Overview */}
          {selectedSkills.length > 0 && (
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-900">Your Skill Journey</h3>
                <Link href="/dashboard/student/skills" className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                  View All
                </Link>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {selectedSkills.slice(0, 4).map(skill => {
                  const sPractice = practiceAttempts.filter(a => a.skillId === skill.id);
                  const sScore = skillScores.find(s => s.skillId === skill.id);
                  const sAssessments = assessmentAttempts.filter(a => a.skillId === skill.id);

                  const state = getSkillJourneyState({
                    skillId: skill.id,
                    skillScore: sScore,
                    practiceAttempts: sPractice,
                    assessmentAttempts: sAssessments
                  });
                  const action = getSkillJourneyAction(state, skill.id);

                  return (
                    <div key={skill.id} className="border border-gray-100 p-4 rounded-lg bg-gray-50 hover:bg-white hover:border-gray-300 transition-all flex flex-col justify-between">
                      <div className="flex justify-between items-start mb-3">
                        <h4 className="font-semibold text-gray-900">{skill.name}</h4>
                        <StateBadge state={state} />
                      </div>
                      <Link 
                        href={action.href}
                        className={`text-sm font-medium flex items-center transition-colors ${
                          action.type === 'primary' ? 'text-blue-600 hover:text-blue-800' : 'text-gray-600 hover:text-gray-800'
                        }`}
                      >
                        {action.label}
                        <ArrowRight className="w-4 h-4 ml-1" />
                      </Link>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-900">Recommended Practical Tasks</h3>
              <Link href="/dashboard/student/practical-tasks" className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                View All
              </Link>
            </div>
            
            {recommendedTasks.length > 0 ? (
              <div className="space-y-4">
                {recommendedTasks.map(task => (
                  <Link 
                    key={task.id} 
                    href={`/dashboard/student/practical-tasks/${task.id}`}
                    className="block p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-sm transition-all group"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h4 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                          {task.title}
                        </h4>
                        <p className="text-sm text-gray-500 mt-1 line-clamp-2">{task.description}</p>
                        <div className="flex items-center mt-3 text-xs font-medium space-x-3">
                          <span className="text-blue-600 bg-blue-50 px-2 py-1 rounded capitalize font-medium">
                            {task.difficulty}
                          </span>
                          <span className="text-gray-500 flex items-center">
                            <Clock className="w-3 h-3 mr-1" />
                            {task.durationMinutes || task.estimatedMinutes || 60} min
                          </span>
                        </div>
                      </div>
                      <span className="shrink-0 inline-flex items-center text-sm font-semibold text-blue-600 group-hover:translate-x-0.5 transition-transform">
                        Start Task <ArrowRight className="w-4 h-4 ml-1" />
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                  <Code className="w-8 h-8 text-gray-400" />
                </div>
                <h4 className="text-md font-medium text-gray-900">Explore Practical Tasks</h4>
                <p className="text-sm text-gray-500 mt-1 max-w-sm mb-4">
                  Hands-on projects and coding challenges are available across Frontend, Backend, and Full Stack career paths.
                </p>
                <Link
                  href="/dashboard/student/practical-tasks"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-lg transition-colors"
                >
                  Browse Task Catalog
                </Link>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Profile Completion</h3>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">{completionPercentage}%</span>
              <span className="text-sm text-gray-500">{completionPercentage === 100 ? 'Completed' : 'Almost there'}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
              <div className="bg-blue-600 h-2.5 rounded-full transition-all" style={{ width: `${completionPercentage}%` }}></div>
            </div>
            <ul className="space-y-3 mt-4">
              <li className="flex items-center text-sm text-green-600">
                <CheckCircle className="w-4 h-4 mr-2" /> Basic Info
              </li>
              <li className="flex items-center text-sm text-green-600">
                <CheckCircle className="w-4 h-4 mr-2" /> Education Details
              </li>
              <li className={`flex items-center text-sm ${hasSkills ? 'text-green-600' : 'text-gray-500'}`}>
                {hasSkills ? <CheckCircle className="w-4 h-4 mr-2" /> : <Clock className="w-4 h-4 mr-2 text-gray-400" />}
                Add Skills
              </li>
              <li className={`flex items-center text-sm ${hasPractice ? 'text-green-600' : 'text-gray-500'}`}>
                {hasPractice ? <CheckCircle className="w-4 h-4 mr-2" /> : <Clock className="w-4 h-4 mr-2 text-gray-400" />}
                Solve a Practice Problem
              </li>
              <li className={`flex items-center text-sm ${hasAssessments ? 'text-green-600' : 'text-gray-500'}`}>
                {hasAssessments ? <CheckCircle className="w-4 h-4 mr-2" /> : <Clock className="w-4 h-4 mr-2 text-gray-400" />}
                Pass an Assessment
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
