"use client";

import { useEffect, useState, useMemo } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import { Loader2, Search, Terminal, Code2, CheckCircle2, AlertCircle, Target, TrendingUp, AlertTriangle, ArrowRight, Zap, Trophy, BookOpen, Award } from "lucide-react";
import Link from "next/link";
import { PracticeProblem, PracticeAttempt, LearningTopic } from "@/types";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";

type Skill = {
  id: string;
  name: string;
};

type ProgressMetrics = {
  overall: {
    attempted: number; // unique problems
    solved: number; // unique problems
  };
  bySkill: Record<string, {
    totalProblems: number;
    attempted: number;
    solved: number;
  }>;
  weakTopics: {
    skillId: string;
    skillName: string;
    topic: string;
    totalAttempts: number;
    successRate: number;
  }[];
};

type Recommendation = {
  problems: PracticeProblem[];
  reason: string;
  type: 'assessment' | 'weak_topic' | 'general' | 'completed';
  learningTopicId?: string;
  assessmentId?: string;
};

export default function StudentPracticePage() {
  const { user } = useAuth();
  const [problems, setProblems] = useState<PracticeProblem[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [allAttempts, setAllAttempts] = useState<PracticeAttempt[]>([]);
  const [learningTopics, setLearningTopics] = useState<LearningTopic[]>([]);
  const [passedAssessments, setPassedAssessments] = useState<Set<string>>(new Set());
  const [assessments, setAssessments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const router = useRouter();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const s = params.get('search');
    const skillParam = params.get('skillId');
    if (s) {
      setSearchQuery(s);
    } else if (skillParam) {
      setSearchQuery(skillParam);
    }
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      
      setLoading(true);
      try {
        // Fetch skills
        const skillsSnap = await getDocs(collection(db, "skills"));
        const skillsData = skillsSnap.docs.map(d => ({ id: d.id, name: d.data().name }));
        setSkills(skillsData);

        // Fetch active practice problems
        const problemsQ = query(collection(db, "practiceProblems"), where("active", "==", true));
        const problemsSnap = await getDocs(problemsQ);
        const problemsData = problemsSnap.docs.map(d => ({ 
          id: d.id, 
          ...d.data()
        } as PracticeProblem));
        setProblems(problemsData);

        // Fetch user's ALL practice attempts
        const attemptsQ = query(
          collection(db, "practiceAttempts"),
          where("studentId", "==", user.uid)
        );
        const attemptsSnap = await getDocs(attemptsQ);
        const attemptsData = attemptsSnap.docs.map(d => ({ id: d.id, ...d.data() } as PracticeAttempt));
        
        // Sort by newest first
        attemptsData.sort((a, b) => {
          const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
          const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
          return timeB - timeA;
        });

        setAllAttempts(attemptsData);
        
        // Fetch active learning topics for recommendations
        const topicsQ = query(collection(db, "learningTopics"), where("active", "==", true));
        const topicsSnap = await getDocs(topicsQ);
        setLearningTopics(topicsSnap.docs.map(d => ({ id: d.id, ...d.data() } as LearningTopic)));

        // Fetch Assessments to recommend
        const assessQ = query(collection(db, "assessments"), where("active", "==", true));
        const assessSnap = await getDocs(assessQ);
        setAssessments(assessSnap.docs.map(d => ({ id: d.id, ...d.data() })));

        // Fetch Assessment Attempts to see what they passed
        const assessAttemptsQ = query(collection(db, "assessmentAttempts"), where("studentId", "==", user.uid), where("status", "==", "completed"));
        const assessAttemptsSnap = await getDocs(assessAttemptsQ);
        const passedSet = new Set<string>();
        assessAttemptsSnap.forEach(doc => {
          if (doc.data().percentage >= 70) {
            passedSet.add(doc.data().assessmentId);
          }
        });
        setPassedAssessments(passedSet);
        
        
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const completedProblems = useMemo(() => {
    return new Set(allAttempts.filter(a => a.passed).map(a => a.problemId));
  }, [allAttempts]);

  const metrics = useMemo<ProgressMetrics>(() => {
    const m: ProgressMetrics = {
      overall: { attempted: 0, solved: 0 },
      bySkill: {},
      weakTopics: [],
    };

    if (!problems.length) return m;

    const attemptedSet = new Set(allAttempts.map(a => a.problemId));
    m.overall.attempted = attemptedSet.size;
    m.overall.solved = completedProblems.size;

    // Initialize skill tracking
    skills.forEach(s => {
      m.bySkill[s.id] = { totalProblems: 0, attempted: 0, solved: 0 };
    });

    problems.forEach(p => {
      if (!m.bySkill[p.skillId]) {
        m.bySkill[p.skillId] = { totalProblems: 0, attempted: 0, solved: 0 };
      }
      m.bySkill[p.skillId].totalProblems += 1;
    });

    const topicStats: Record<string, { attempts: number; passed: number, skillId: string }> = {};

    allAttempts.forEach(attempt => {
      const p = problems.find(prob => prob.id === attempt.problemId);
      if (!p) return;

      const topicKey = `${p.skillId}::${p.topic}`;
      if (!topicStats[topicKey]) {
        topicStats[topicKey] = { attempts: 0, passed: 0, skillId: p.skillId };
      }
      topicStats[topicKey].attempts += 1;
      if (attempt.passed) {
        topicStats[topicKey].passed += 1;
      }
    });

    // Populate skill attempted/solved counts
    attemptedSet.forEach(probId => {
      const p = problems.find(prob => prob.id === probId);
      if (p && m.bySkill[p.skillId]) {
        m.bySkill[p.skillId].attempted += 1;
      }
    });
    completedProblems.forEach(probId => {
      const p = problems.find(prob => prob.id === probId);
      if (p && m.bySkill[p.skillId]) {
        m.bySkill[p.skillId].solved += 1;
      }
    });

    // Determine Weak Topics
    // Rule: At least 3 attempts, < 60% success rate
    Object.entries(topicStats).forEach(([key, stats]) => {
      const [skillId, topic] = key.split("::");
      if (stats.attempts >= 3) {
        const successRate = stats.passed / stats.attempts;
        if (successRate < 0.6) {
          m.weakTopics.push({
            skillId,
            skillName: skills.find(s => s.id === skillId)?.name || skillId,
            topic,
            totalAttempts: stats.attempts,
            successRate: successRate * 100
          });
        }
      }
    });

    // Sort weak topics: lowest success rate first. If tied, most attempts first.
    m.weakTopics.sort((a, b) => {
      if (a.successRate === b.successRate) {
        return b.totalAttempts - a.totalAttempts;
      }
      return a.successRate - b.successRate;
    });

    return m;
  }, [allAttempts, problems, skills, completedProblems]);

  const recommendedData = useMemo<Recommendation>(() => {
    const unsolvedProblems = problems.filter(p => p.id && !completedProblems.has(p.id));

    if (unsolvedProblems.length === 0) {
      return { 
        problems: [], 
        reason: "Amazing job! You have solved all available practice problems.", 
        type: 'completed' 
      };
    }

    const difficulties = ['beginner', 'intermediate', 'advanced'] as const;

    // 0. Ready for Assessment Strategy
    // Find a skill where they have attempted at least 5 problems and have >= 80% success rate overall
    for (const skillId of Object.keys(metrics.bySkill)) {
      const stats = metrics.bySkill[skillId];
      if (stats.attempted >= 5) {
        const successRate = stats.solved / stats.attempted;
        if (successRate >= 0.8) {
          const matchingAssessment = assessments.find(a => a.skillId === skillId);
          if (matchingAssessment && !passedAssessments.has(matchingAssessment.id)) {
            const sName = skills.find(s => s.id === skillId)?.name || "this skill";
            return {
              problems: [],
              reason: `You have an excellent success rate in ${sName}. Ready to get verified?`,
              type: 'assessment',
              assessmentId: matchingAssessment.id
            };
          }
        }
      }
    }

    // 1. Weak Topic Strategy
    for (const weakTopic of metrics.weakTopics) {
      const unsolvedInTopic = unsolvedProblems.filter(p => p.skillId === weakTopic.skillId && p.topic === weakTopic.topic);
      
      if (unsolvedInTopic.length > 0) {
        const allInTopic = problems.filter(p => p.skillId === weakTopic.skillId && p.topic === weakTopic.topic);
        
        const lTopic = learningTopics.find(t => t.skillId === weakTopic.skillId && t.topic === weakTopic.topic);

        // Find the lowest difficulty level with unsolved problems
        for (const diff of difficulties) {
          const diffProblems = allInTopic.filter(p => p.difficulty === diff);
          if (diffProblems.length === 0) continue; 
          
          const unsolvedInDiff = unsolvedInTopic.filter(p => p.difficulty === diff);
          if (unsolvedInDiff.length > 0) {
            return {
              problems: unsolvedInDiff.slice(0, 3),
              reason: `Because you need more practice in ${weakTopic.topic}:`,
              type: 'weak_topic',
              learningTopicId: lTopic?.id
            };
          }
        }
        
        return {
          problems: unsolvedInTopic.slice(0, 3),
          reason: `Because you need more practice in ${weakTopic.topic}:`,
          type: 'weak_topic',
          learningTopicId: lTopic?.id
        };
      }
    }

    // 2. Keep Improving Strategy
    const recentSkillIds = new Set(allAttempts.slice(0, 10).map(a => a.skillId));
    let recommendations: PracticeProblem[] = [];

    // Fill with recent skills first, progressing by difficulty
    for (const diff of difficulties) {
      if (recommendations.length >= 3) break;
      const candidates = unsolvedProblems.filter(p => recentSkillIds.has(p.skillId) && p.difficulty === diff);
      recommendations.push(...candidates.slice(0, 3 - recommendations.length));
    }

    // Fill the rest with any unsolved, progressing by difficulty
    for (const diff of difficulties) {
      if (recommendations.length >= 3) break;
      const candidates = unsolvedProblems.filter(p => !recommendations.includes(p) && p.difficulty === diff);
      recommendations.push(...candidates.slice(0, 3 - recommendations.length));
    }

    return {
      problems: recommendations,
      reason: "Keep improving your skills with these challenges:",
      type: 'general'
    };
  }, [problems, completedProblems, metrics.weakTopics, allAttempts, learningTopics]);

  const filteredProblems = useMemo(() => {
    if (!searchQuery) return problems;
    const lower = searchQuery.toLowerCase();
    return problems.filter(
      (p) =>
        p.title.toLowerCase().includes(lower) ||
        p.topic.toLowerCase().includes(lower) ||
        p.skillId.toLowerCase().includes(lower)
    );
  }, [problems, searchQuery]);

  const getSkillName = (skillId: string) => {
    return skills.find(s => s.id === skillId)?.name || skillId;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Coding Practice</h1>
        <p className="mt-2 text-gray-600">Practice your coding skills with real-world problems. Solving these will not affect your verified hiring scores.</p>
      </div>

      {/* Progress Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Overall Progress */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col">
          <h2 className="text-lg font-bold text-gray-900 flex items-center mb-4">
            <Target className="h-5 w-5 mr-2 text-blue-600" /> Overall Practice
          </h2>
          <div className="flex-1 flex flex-col justify-center gap-4">
            <div className="flex justify-between items-end border-b border-gray-100 pb-2">
              <span className="text-gray-500">Problems Solved</span>
              <span className="text-2xl font-bold text-gray-900">{metrics.overall.solved}</span>
            </div>
            <div className="flex justify-between items-end border-b border-gray-100 pb-2">
              <span className="text-gray-500">Problems Attempted</span>
              <span className="text-2xl font-bold text-gray-900">{metrics.overall.attempted}</span>
            </div>
            <div className="flex justify-between items-end pb-2">
              <span className="text-gray-500">Total Available</span>
              <span className="text-2xl font-bold text-gray-900">{problems.length}</span>
            </div>
          </div>
        </div>

        {/* Skills Progress */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col h-64 overflow-y-auto">
          <h2 className="text-lg font-bold text-gray-900 flex items-center mb-4">
            <TrendingUp className="h-5 w-5 mr-2 text-green-600" /> Skill Progress
          </h2>
          <div className="space-y-4">
            {skills.map(skill => {
              const stats = metrics.bySkill[skill.id];
              if (!stats || stats.totalProblems === 0) return null;
              const percent = Math.round((stats.solved / stats.totalProblems) * 100);
              return (
                <div key={skill.id}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-gray-700">{skill.name}</span>
                    <span className="text-gray-500">{percent}% ({stats.solved}/{stats.totalProblems})</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-green-500 h-2 rounded-full" style={{ width: `${percent}%` }}></div>
                  </div>
                </div>
              );
            })}
            {skills.length === 0 && <p className="text-gray-500 text-sm">No skills found.</p>}
          </div>
        </div>

        {/* Weak Topics */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col">
          <h2 className="text-lg font-bold text-gray-900 flex items-center mb-4">
            <AlertTriangle className="h-5 w-5 mr-2 text-amber-500" /> Needs Practice
          </h2>
          <div className="flex-1 overflow-y-auto">
            {metrics.weakTopics.length > 0 ? (
              <ul className="space-y-3">
                {metrics.weakTopics.map((wt, i) => (
                  <li key={i} className="bg-amber-50 rounded-lg p-3 border border-amber-100 flex justify-between items-center">
                    <div>
                      <p className="text-sm font-semibold text-amber-900">{wt.topic}</p>
                      <p className="text-xs text-amber-700">{wt.skillName}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-amber-900">{wt.successRate.toFixed(0)}%</p>
                      <p className="text-[10px] text-amber-700 uppercase tracking-wide">Success</p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-gray-500">
                <CheckCircle2 className="h-8 w-8 text-green-400 mb-2" />
                <p className="text-sm text-center">No weak topics identified yet. Keep practicing!</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Personalized Recommendations Section */}
      <div className={`mt-8 ${recommendedData.type === 'assessment' ? 'bg-green-50/50 border-green-100' : 'bg-blue-50/50 border-blue-100'} rounded-2xl p-6 border`}>
        <h2 className="text-xl font-bold text-gray-900 flex items-center mb-1">
          {recommendedData.type === 'assessment' ? (
            <><Award className="h-5 w-5 mr-2 text-green-600" /> Verify Your Skills</>
          ) : recommendedData.type === 'weak_topic' ? (
            <><Zap className="h-5 w-5 mr-2 text-blue-600 fill-blue-600" /> Recommended for You</>
          ) : recommendedData.type === 'general' ? (
            <><TrendingUp className="h-5 w-5 mr-2 text-blue-600" /> Keep Improving</>
          ) : (
            <><Trophy className="h-5 w-5 mr-2 text-yellow-500" /> Outstanding!</>
          )}
        </h2>
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
          <p className="text-sm text-gray-600">{recommendedData.reason}</p>
          
          {recommendedData.learningTopicId && (
            <Link
              href={`/dashboard/student/learn/${recommendedData.learningTopicId}`}
              className="inline-flex items-center px-4 py-2 border border-blue-600 text-sm font-medium rounded-md shadow-sm text-blue-600 bg-white hover:bg-blue-50 transition-colors shrink-0"
            >
              <BookOpen className="h-4 w-4 mr-2" />
              Learn Concept
            </Link>
          )}
          {recommendedData.assessmentId && (
            <Link
              href={`/dashboard/student/assessments/${recommendedData.assessmentId}`}
              className="inline-flex items-center px-4 py-2 border border-green-600 text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 transition-colors shrink-0"
            >
              <Award className="h-4 w-4 mr-2" />
              Take Assessment
            </Link>
          )}
        </div>
        
        {recommendedData.problems.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {recommendedData.problems.map(rp => (
              <Link key={rp.id} href={`/dashboard/student/practice/${rp.id}`} className="bg-white border border-blue-200 rounded-xl p-5 hover:shadow-lg transition-all flex flex-col group relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-blue-500 group-hover:w-2 transition-all"></div>
                <div className="pl-3">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{rp.title}</h3>
                    <span className={`px-2 py-0.5 inline-flex text-[10px] leading-5 font-semibold rounded-full ${
                      rp.difficulty === 'beginner' ? 'bg-green-100 text-green-800' :
                      rp.difficulty === 'intermediate' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {rp.difficulty}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mb-4 flex-1">{getSkillName(rp.skillId)} &bull; {rp.topic}</p>
                  <div className="flex items-center text-sm font-bold text-blue-600">
                    Solve Problem <ArrowRight className="ml-1 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Full Problem List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mt-8">
        <div className="p-4 border-b border-gray-200 bg-gray-50 flex flex-col sm:flex-row justify-between items-center gap-4">
          <h2 className="font-bold text-gray-900">All Practice Problems</h2>
          <div className="relative w-full sm:w-auto sm:min-w-[300px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by title, topic, or skill..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Problem
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Skill & Topic
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Difficulty
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredProblems.length > 0 ? (
                filteredProblems.map((problem) => {
                  const isCompleted = problem.id ? completedProblems.has(problem.id) : false;
                  
                  return (
                    <tr key={problem.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        {isCompleted ? (
                          <div className="flex items-center text-green-600">
                            <CheckCircle2 className="h-5 w-5" />
                            <span className="ml-1 text-sm font-medium">Solved</span>
                          </div>
                        ) : (
                          <div className="flex items-center text-gray-400">
                            <Terminal className="h-5 w-5" />
                            <span className="ml-1 text-sm">Todo</span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-bold text-gray-900">{problem.title}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{getSkillName(problem.skillId)}</div>
                        <div className="text-xs text-gray-500 mt-1">{problem.topic}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          problem.difficulty === 'beginner' ? 'bg-green-100 text-green-800' :
                          problem.difficulty === 'intermediate' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {problem.difficulty}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Link
                          href={`/dashboard/student/practice/${problem.id}`}
                          className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                          <Code2 className="h-4 w-4 mr-1" />
                          Solve
                        </Link>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    <Code2 className="mx-auto h-12 w-12 text-gray-400 mb-3" />
                    <p className="text-lg font-medium text-gray-900">
                      {searchQuery ? `No practice problems found for "${searchQuery}"` : "No practice problems available"}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      {searchQuery 
                        ? "Try clearing your search query or selecting another skill." 
                        : "Practice problems are being configured for your active curriculum."}
                    </p>
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery("")}
                        className="mt-4 inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                      >
                        Clear Filter
                      </button>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
