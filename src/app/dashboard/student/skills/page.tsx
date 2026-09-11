"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { 
  collection, 
  getDocs, 
  doc, 
  getDoc, 
  updateDoc, 
  query, 
  where,
  getCountFromServer
} from "firebase/firestore";
import { Award, Plus, Check, Loader2, BookOpen, Clock, Activity, Code, Terminal, CheckCircle, ArrowRight, Play } from "lucide-react";
import Link from "next/link";
import { getSkillJourneyState, getSkillJourneyAction, SkillJourneyState } from "@/lib/mastery";

function StateBadge({ state }: { state: SkillJourneyState }) {
  const config = {
    verified: { bg: 'bg-green-100', text: 'text-green-700', label: 'Verified', icon: <CheckCircle className="w-3 h-3 mr-1" /> },
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

type Skill = {
  id: string;
  name: string;
  category: string;
  description: string;
};

type Assessment = {
  id: string;
  skillId: string;
  title: string;
  difficulty: string;
};

type PracticalTask = {
  id: string;
  skillId: string;
  title: string;
  difficulty: string;
};

type Attempt = {
  id: string;
  assessmentId: string;
  score: number;
  percentage: number;
  status: string;
};

export default function MySkillsPage() {
  const { user } = useAuth();
  
  const [allSkills, setAllSkills] = useState<Skill[]>([]);
  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [practicalTasks, setPracticalTasks] = useState<PracticalTask[]>([]);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [practiceAttempts, setPracticeAttempts] = useState<any[]>([]);
  const [skillScores, setSkillScores] = useState<any[]>([]);
  const [topics, setTopics] = useState<any[]>([]);
  const [practiceProblems, setPracticeProblems] = useState<any[]>([]);
  const [questionCounts, setQuestionCounts] = useState<Record<string, number>>({});
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      try {
        // 1. Fetch Student Profile for selected skills
        const profileRef = doc(db, "studentProfiles", user.uid);
        const profileSnap = await getDoc(profileRef);
        let studentSkills: string[] = [];
        if (profileSnap.exists()) {
          studentSkills = profileSnap.data().selectedSkills || [];
          setSelectedSkillIds(studentSkills);
        }

        // 2. Fetch all active skills
        const skillsSnap = await getDocs(query(collection(db, "skills"), where("active", "==", true)));
        const skillsData = skillsSnap.docs.map(d => ({ 
          id: d.id, 
          hasCatalog: d.data().hasCatalog ?? (d.id !== 'ml-basics'),
          ...d.data() 
        } as Skill & { hasCatalog?: boolean }));
        
        // Prioritize catalog skills
        skillsData.sort((a, b) => {
          if (a.hasCatalog && !b.hasCatalog) return -1;
          if (!a.hasCatalog && b.hasCatalog) return 1;
          return a.name.localeCompare(b.name);
        });
        setAllSkills(skillsData);

        // 3. Fetch content for selected skills
        if (studentSkills.length > 0) {
          const querySkills = studentSkills.slice(0, 10);

          const [assessmentsSnap, tasksSnap, topicsSnap, practiceProblemsSnap] = await Promise.all([
            getDocs(query(collection(db, "assessments"), where("active", "==", true), where("skillId", "in", querySkills))),
            getDocs(query(collection(db, "practicalTasks"), where("active", "==", true), where("skillId", "in", querySkills))),
            getDocs(query(collection(db, "learningTopics"), where("active", "==", true), where("skillId", "in", querySkills))),
            getDocs(query(collection(db, "practiceProblems"), where("active", "==", true), where("skillId", "in", querySkills)))
          ]);

          const loadedAssessments = assessmentsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Assessment));
          setAssessments(loadedAssessments);

          const loadedTasks = tasksSnap.docs.map(d => ({ id: d.id, ...d.data() } as PracticalTask));
          setPracticalTasks(loadedTasks);

          const topicsList = topicsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
          setTopics(topicsList);

          const problemsList = practiceProblemsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
          setPracticeProblems(problemsList);

          // Fetch question counts for these assessments
          const counts: Record<string, number> = {};
          await Promise.all(loadedAssessments.map(async (assessment) => {
            const countSnap = await getCountFromServer(
              query(collection(db, "assessmentQuestions"), where("assessmentId", "==", assessment.id), where("active", "==", true))
            );
            counts[assessment.id] = countSnap.data().count;
          }));
          setQuestionCounts(counts);
        }

        // 4. Fetch student's assessment attempts
        const attemptsSnap = await getDocs(
          query(collection(db, "assessmentAttempts"), where("studentId", "==", user.uid))
        );
        setAttempts(attemptsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Attempt)));

        const practiceSnap = await getDocs(
          query(collection(db, "practiceAttempts"), where("studentId", "==", user.uid))
        );
        setPracticeAttempts(practiceSnap.docs.map(d => ({ id: d.id, ...d.data() })));

        const scoresSnap = await getDocs(
          query(collection(db, "skillScores"), where("studentId", "==", user.uid))
        );
        setSkillScores(scoresSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const toggleSkill = async (skillId: string) => {
    if (!user) return;
    setSaving(skillId);
    try {
      const isSelected = selectedSkillIds.includes(skillId);
      const newSkills = isSelected 
        ? selectedSkillIds.filter(id => id !== skillId)
        : [...selectedSkillIds, skillId];
        
      const profileRef = doc(db, "studentProfiles", user.uid);
      await updateDoc(profileRef, {
        selectedSkills: newSkills
      });
      
      setSelectedSkillIds(newSkills);

      // Re-fetch content for new skills
      if (newSkills.length > 0) {
        const querySkills = newSkills.slice(0, 10);
        const [assessmentsSnap, tasksSnap, topicsSnap, practiceProblemsSnap] = await Promise.all([
          getDocs(query(collection(db, "assessments"), where("active", "==", true), where("skillId", "in", querySkills))),
          getDocs(query(collection(db, "practicalTasks"), where("active", "==", true), where("skillId", "in", querySkills))),
          getDocs(query(collection(db, "learningTopics"), where("active", "==", true), where("skillId", "in", querySkills))),
          getDocs(query(collection(db, "practiceProblems"), where("active", "==", true), where("skillId", "in", querySkills)))
        ]);

        const loadedAssessments = assessmentsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Assessment));
        setAssessments(loadedAssessments);
        
        const tasks = tasksSnap.docs.map(d => ({ id: d.id, ...d.data() } as PracticalTask));
        setPracticalTasks(tasks);

        setTopics(topicsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        setPracticeProblems(practiceProblemsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        
        // Fetch question counts for these assessments
        const counts: Record<string, number> = {};
        await Promise.all(loadedAssessments.map(async (assessment) => {
          const countSnap = await getCountFromServer(
            query(collection(db, "assessmentQuestions"), where("assessmentId", "==", assessment.id), where("active", "==", true))
          );
          counts[assessment.id] = countSnap.data().count;
        }));
        setQuestionCounts(prev => ({ ...prev, ...counts }));
      } else {
        setAssessments([]);
        setPracticalTasks([]);
        setTopics([]);
        setPracticeProblems([]);
      }
    } catch (error) {
      console.error("Error toggling skill:", error);
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  const selectedSkillsData = allSkills.filter(s => selectedSkillIds.includes(s.id));
  const unselectedSkillsData = allSkills.filter(s => !selectedSkillIds.includes(s.id));

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">My Skills</h1>
        <p className="mt-2 text-gray-600">Select skills you want to practice and verify through assessments.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Skill Selection */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <h2 className="font-semibold text-gray-900 flex items-center">
                <Award className="w-5 h-5 mr-2 text-blue-600" />
                Available Skills
              </h2>
            </div>
            <div className="p-4 space-y-3 max-h-[600px] overflow-y-auto">
              {allSkills.map(skill => {
                const isSelected = selectedSkillIds.includes(skill.id);
                const isSaving = saving === skill.id;
                
                return (
                  <div 
                    key={skill.id} 
                    className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                      isSelected ? "border-blue-200 bg-blue-50" : "border-gray-200 hover:border-gray-300 bg-white"
                    }`}
                  >
                    <div>
                      <div className="flex items-center">
                        <h3 className="font-medium text-sm text-gray-900">{skill.name}</h3>
                        {(skill as any).hasCatalog === false ? (
                          <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800">
                            In Dev
                          </span>
                        ) : (
                          <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-green-100 text-green-800">
                            Active
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">{skill.category}</p>
                    </div>
                    <button
                      onClick={() => toggleSkill(skill.id)}
                      disabled={isSaving}
                      className={`p-2 rounded-full flex-shrink-0 transition-colors ${
                        isSelected 
                          ? "bg-blue-600 text-white hover:bg-blue-700" 
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      {isSaving ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : isSelected ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <Plus className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                );
              })}
              {allSkills.length === 0 && (
                <div className="text-center py-4 text-sm text-gray-500">
                  No skills available. (Need to run the seed script!)
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Your Assessments */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <h2 className="font-semibold text-gray-900 flex items-center">
                <BookOpen className="w-5 h-5 mr-2 text-blue-600" />
                Your Skill Content
              </h2>
            </div>
            
            <div className="p-6">
              {selectedSkillIds.length === 0 ? (
                <div className="text-center py-12">
                  <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <Award className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900">No skills selected</h3>
                  <p className="mt-1 text-gray-500">Select skills from the list to see related assessments.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {selectedSkillsData.map(skill => {
                    const skillAssessments = assessments.filter(a => a.skillId === skill.id);
                    const hasActiveAssessment = skillAssessments.length > 0 && skillAssessments.some(a => (questionCounts[a.id] || 0) > 0);
                    
                    const skillTasks = practicalTasks.filter(t => t.skillId === skill.id);
                    const hasActiveTasks = skillTasks.length > 0;
                    
                    const skillTopics = topics.filter(t => (t as any).skillId === skill.id);
                    const skillProblems = practiceProblems.filter(p => (p as any).skillId === skill.id);
                    
                    const hasAnyContent = hasActiveAssessment || hasActiveTasks || skillTopics.length > 0 || skillProblems.length > 0;
                    const isComingSoon = !hasAnyContent;
                    
                    return (
                      <div key={skill.id} className="border border-gray-200 shadow-sm rounded-xl p-6 bg-white transition-all hover:border-blue-200 relative overflow-hidden">
                        
                        <div className="flex justify-between items-start mb-6">
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-bold text-xl text-gray-900">{skill.name}</h3>
                              {hasAnyContent ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                  Catalog Active
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
                                  Curriculum in Development
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-500 mt-1">{skill.category}</p>
                          </div>
                          
                          {(() => {
                            const skillPractice = practiceAttempts.filter(a => a.skillId === skill.id);
                            const skillScore = skillScores.find(s => s.skillId === skill.id);
                            const skillAssessments = attempts.filter(a => assessments.some(ass => ass.id === a.assessmentId && ass.skillId === skill.id));
                            
                            const journeyState = getSkillJourneyState({
                              skillId: skill.id,
                              skillScore,
                              practiceAttempts: skillPractice,
                              assessmentAttempts: skillAssessments as any
                            });
                            
                            const nextAction = getSkillJourneyAction(journeyState, skill.id);

                            return (
                              <div className="flex flex-col items-end">
                                <StateBadge state={journeyState} />
                                {hasAnyContent && (
                                  <Link 
                                    href={nextAction.href}
                                    className={`mt-3 inline-flex items-center text-sm font-medium transition-colors ${
                                      nextAction.type === 'primary' ? 'text-blue-600 hover:text-blue-800' : 'text-gray-600 hover:text-gray-800'
                                    }`}
                                  >
                                    {nextAction.label}
                                    <ArrowRight className="ml-1 w-4 h-4" />
                                  </Link>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                        
                        {!isComingSoon ? (
                          <div className="space-y-6">
                            <div className="flex flex-col sm:flex-row gap-3 mb-2">
                              <Link 
                                href={`/dashboard/student/learn?skillId=${skill.id}`}
                                className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-blue-200 text-sm font-medium rounded-md shadow-sm text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors"
                              >
                                <BookOpen className="h-4 w-4 mr-2" />
                                Learning Modules ({skillTopics.length})
                              </Link>
                              <Link 
                                href={`/dashboard/student/practice?skillId=${skill.id}`}
                                className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-blue-200 text-sm font-medium rounded-md shadow-sm text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors"
                              >
                                <Terminal className="h-4 w-4 mr-2" />
                                Coding Practice ({skillProblems.length})
                              </Link>
                            </div>

                            {hasActiveAssessment && (
                              <div>
                                <h4 className="font-medium text-sm text-gray-700 mb-3 uppercase tracking-wider">Theory Assessments</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {skillAssessments.map(assessment => {
                                    const qCount = questionCounts[assessment.id] || 0;
                                    if (qCount === 0) return null;

                                    const myAttempts = attempts.filter(a => a.assessmentId === assessment.id);
                                    const completed = myAttempts.filter(a => a.status === "completed");
                                    const bestScore = completed.length > 0 
                                      ? Math.max(...completed.map(a => a.percentage)) 
                                      : null;
                                    
                                    const inProgress = myAttempts.find(a => a.status === "in_progress");

                                    return (
                                      <div key={assessment.id} className="bg-gray-50 p-4 rounded-md border border-gray-200">
                                        <h4 className="font-semibold text-gray-900 mb-1">{assessment.title}</h4>
                                        <div className="flex items-center text-xs text-gray-500 mb-3 space-x-3">
                                          <span className="flex items-center">
                                            <Activity className="w-3 h-3 mr-1" />
                                            {assessment.difficulty}
                                          </span>
                                          <span className="flex items-center">
                                            <Clock className="w-3 h-3 mr-1" />
                                            {myAttempts.length} attempt{myAttempts.length !== 1 && 's'}
                                          </span>
                                        </div>
                                        
                                        <div className="flex items-center justify-between mt-4">
                                          <div>
                                            {bestScore !== null ? (
                                              <div className="flex flex-col">
                                                <span className="text-xs text-gray-500">Best Score</span>
                                                <span className={`font-bold ${bestScore >= 70 ? 'text-green-600' : 'text-orange-600'}`}>
                                                  {bestScore}%
                                                </span>
                                              </div>
                                            ) : (
                                              <span className="text-sm text-gray-500 italic">Not taken yet</span>
                                            )}
                                          </div>
                                          <Link 
                                            href={`/dashboard/student/assessments/${assessment.id}`}
                                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors"
                                          >
                                            {inProgress ? "Resume" : bestScore !== null ? "Retake" : "Start"}
                                          </Link>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {hasActiveTasks && (
                              <div>
                                <h4 className="font-medium text-sm text-gray-700 mb-3 uppercase tracking-wider">Practical Tasks</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {skillTasks.map(task => (
                                    <div key={task.id} className="bg-gray-50 p-4 rounded-md border border-gray-200">
                                      <h4 className="font-semibold text-gray-900 mb-1">{task.title}</h4>
                                      <div className="flex items-center text-xs text-gray-500 mb-3 space-x-3">
                                        <span className="flex items-center">
                                          <Code className="w-3 h-3 mr-1" />
                                          {task.difficulty}
                                        </span>
                                      </div>
                                      <div className="flex items-center justify-end mt-4">
                                        <Link 
                                          href={`/dashboard/student/practical-tasks/${task.id}`}
                                          className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-md transition-colors"
                                        >
                                          Start Task
                                        </Link>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="bg-amber-50/50 p-5 rounded-lg border border-amber-200">
                            <div className="flex items-start gap-3">
                              <div className="p-2 bg-amber-100 rounded-lg text-amber-700 mt-0.5">
                                <BookOpen className="w-5 h-5" />
                              </div>
                              <div className="flex-1">
                                <h4 className="font-semibold text-gray-900 mb-1">Curriculum in Development</h4>
                                <p className="text-sm text-gray-600 mb-4">
                                  Learning modules and practice exercises for {skill.name} are currently in development.
                                  To start learning immediately with active coding problems and assessments, choose from our available career paths:
                                  <span className="font-medium text-gray-800"> Frontend, Backend, or Full Stack Development</span>.
                                </p>
                                <div className="flex items-center gap-3">
                                  <Link
                                    href="/dashboard/student/roles"
                                    className="inline-flex items-center px-3.5 py-2 border border-amber-300 shadow-sm text-sm font-medium rounded-md text-amber-900 bg-amber-100 hover:bg-amber-200 transition-colors"
                                  >
                                    Explore Career Paths
                                    <ArrowRight className="ml-1.5 w-4 h-4" />
                                  </Link>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
