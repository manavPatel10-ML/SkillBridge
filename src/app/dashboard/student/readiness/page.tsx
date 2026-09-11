"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, getDoc, updateDoc, setDoc } from "firebase/firestore";
import { Loader2, Target, CheckCircle2, Circle, ArrowRight, PlayCircle, BookOpen, Briefcase, Activity, AlertCircle, Code, MessageSquare, ExternalLink } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { RolePath, StudentSkillScore, PracticeAttempt, CompanyChallenge, ChallengeApplication, LearningTopic, PracticeProblem } from "@/types";
import { 
  getJobReadinessState, 
  getPrimaryNextAction, 
  ReadinessState, 
  StudentActivityData,
  PracticalTaskAttemptLike,
  AssessmentAttemptLike
} from "@/lib/job-readiness";

export default function JobReadinessHub() {
  const { user } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<RolePath[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string>("");
  const [selectedRole, setSelectedRole] = useState<RolePath | null>(null);
  const [skillDict, setSkillDict] = useState<Record<string, string>>({});
  
  const [activity, setActivity] = useState<StudentActivityData>({
    skillScores: [],
    practiceAttempts: [],
    practicalAttempts: [],
    assessmentAttempts: []
  });
  
  const [opportunities, setOpportunities] = useState<CompanyChallenge[]>([]);
  const [applications, setApplications] = useState<ChallengeApplication[]>([]);
  
  const [readinessState, setReadinessState] = useState<ReadinessState>('NOT_STARTED');
  const [nextAction, setNextAction] = useState<any>(null);

  const [activeTab, setActiveTab] = useState<'overview' | 'prep'>('overview');
  const [prepTopics, setPrepTopics] = useState<LearningTopic[]>([]);
  const [prepProblems, setPrepProblems] = useState<PracticeProblem[]>([]);

  useEffect(() => {
    if (!user) return;

    const fetchInitialData = async () => {
      try {
        setLoading(true);

        // Fetch skills for mapping
        const skillsSnap = await getDocs(collection(db, "skills"));
        const sDict: Record<string, string> = {};
        skillsSnap.forEach(d => sDict[d.id] = d.data().name);
        setSkillDict(sDict);

        // Fetch roles
        const rolesSnap = await getDocs(query(collection(db, "roles"), where("active", "==", true)));
        const loadedRoles = rolesSnap.docs.map(d => ({ id: d.id, ...d.data() } as RolePath));
        setRoles(loadedRoles);

        // Fetch student profile for target role
        const profileRef = doc(db, "studentProfiles", user.uid);
        const profileSnap = await getDoc(profileRef);
        let targetRoleId = "";
        
        if (profileSnap.exists() && profileSnap.data().targetRoleId) {
          targetRoleId = profileSnap.data().targetRoleId;
        }
        
        if (targetRoleId && loadedRoles.some(r => r.id === targetRoleId)) {
          setSelectedRoleId(targetRoleId);
          await loadRoleData(targetRoleId, loadedRoles);
        } else {
          setLoading(false); // No role selected, just show empty state
        }
      } catch (err) {
        console.error("Error loading readiness hub", err);
        setLoading(false);
      }
    };

    fetchInitialData();
  }, [user]);

  const loadRoleData = async (roleId: string, availableRoles = roles) => {
    if (!user) return;
    setLoading(true);
    
    try {
      const activeRole = availableRoles.find(r => r.id === roleId) || null;
      setSelectedRole(activeRole);

      if (!activeRole) {
        setLoading(false);
        return;
      }

      // Fetch Activity Data
      const [scoresSnap, practiceSnap, practicalSnap, assessSnap, appsSnap] = await Promise.all([
        getDocs(query(collection(db, "skillScores"), where("studentId", "==", user.uid))),
        getDocs(query(collection(db, "practiceAttempts"), where("studentId", "==", user.uid))),
        getDocs(query(collection(db, "practicalTaskAttempts"), where("studentId", "==", user.uid))),
        getDocs(query(collection(db, "assessmentAttempts"), where("studentId", "==", user.uid))),
        getDocs(query(collection(db, "challengeApplications"), where("studentId", "==", user.uid)))
      ]);

      const loadedActivity: StudentActivityData = {
        skillScores: scoresSnap.docs.map(d => d.data() as StudentSkillScore),
        practiceAttempts: practiceSnap.docs.map(d => d.data() as PracticeAttempt),
        practicalAttempts: practicalSnap.docs.map(d => d.data() as PracticalTaskAttemptLike),
        assessmentAttempts: assessSnap.docs.map(d => d.data() as AssessmentAttemptLike)
      };

      setActivity(loadedActivity);

      // Compute Deterministic State
      const state = getJobReadinessState(activeRole, loadedActivity);
      setReadinessState(state);
      setNextAction(getPrimaryNextAction(activeRole, state, loadedActivity));

      // Filter matching opportunities (opportunities where all required skills are required by the role, or subsets)
      let matchingOpps: CompanyChallenge[] = [];
      if (activeRole.requiredSkillIds && activeRole.requiredSkillIds.length > 0) {
        const querySkills = activeRole.requiredSkillIds.slice(0, 10);
        const oppsSnap = await getDocs(
          query(
            collection(db, "companyChallenges"), 
            where("status", "==", "published"),
            where("requiredSkillIds", "array-contains-any", querySkills)
          )
        );
        matchingOpps = oppsSnap.docs.map(d => ({ id: d.id, ...d.data() } as CompanyChallenge))
          .filter(c => c.requiredSkillIds && c.requiredSkillIds.length > 0 && c.requiredSkillIds.every(skill => activeRole.requiredSkillIds.includes(skill)));
      }
      setOpportunities(matchingOpps);

      setApplications(appsSnap.docs.map(d => ({ id: d.id, ...d.data() } as ChallengeApplication)));
      
      // Load Prep Materials (Deterministic)
      if (activeRole.requiredSkillIds.length > 0) {
        // We divide requiredSkillIds into chunks of 10 if there are more than 10, but usually there are <= 5.
        // For safety, just take the first 10 for the "in" query
        const querySkills = activeRole.requiredSkillIds.slice(0, 10);
        
        const topicsPromise = getDocs(query(collection(db, "learningTopics"), where("skillId", "in", querySkills), where("active", "==", true)));
        const problemsPromise = getDocs(query(collection(db, "practiceProblems"), where("skillId", "in", querySkills), where("active", "==", true), where("difficulty", "==", "advanced")));
        
        const [tSnap, pSnap] = await Promise.all([topicsPromise, problemsPromise]);
        
        setPrepTopics(tSnap.docs.map(d => ({ id: d.id, ...d.data() } as LearningTopic)));
        setPrepProblems(pSnap.docs.map(d => ({ id: d.id, ...d.data() } as PracticeProblem)));
      } else {
        setPrepTopics([]);
        setPrepProblems([]);
      }
      
    } catch (err) {
      console.error("Error loading role data", err);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleSelect = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const roleId = e.target.value;
    setSelectedRoleId(roleId);
    
    if (user && roleId) {
      try {
        const profileRef = doc(db, "studentProfiles", user.uid);
        const profileSnap = await getDoc(profileRef);
        if (profileSnap.exists()) {
          await updateDoc(profileRef, { targetRoleId: roleId });
        } else {
          await setDoc(profileRef, { targetRoleId: roleId, fullName: "Student" });
        }
        await loadRoleData(roleId);
      } catch (err) {
        console.error("Failed to save target role", err);
      }
    }
  };

  const getStateInfo = (state: ReadinessState) => {
    switch (state) {
      case 'READY': return { color: 'text-green-700', bg: 'bg-green-100', text: 'You are READY! Apply to jobs.' };
      case 'VERIFYING': return { color: 'text-purple-700', bg: 'bg-purple-100', text: 'You are VERIFYING your skills.' };
      case 'BUILDING': return { color: 'text-orange-700', bg: 'bg-orange-100', text: 'You are currently BUILDING projects.' };
      case 'PRACTICING': return { color: 'text-blue-700', bg: 'bg-blue-100', text: 'You are PRACTICING your coding skills.' };
      case 'LEARNING': return { color: 'text-yellow-700', bg: 'bg-yellow-100', text: 'You are LEARNING the foundations.' };
      case 'NOT_STARTED': return { color: 'text-gray-700', bg: 'bg-gray-100', text: 'You have NOT STARTED yet.' };
      default: return { color: 'text-gray-700', bg: 'bg-gray-100', text: 'Unknown State' };
    }
  };

  const stateInfo = getStateInfo(readinessState);

  const renderActionLink = () => {
    if (!nextAction) return null;
    let href = "/dashboard/student";
    switch (nextAction.type) {
      case 'LEARN': href = "/dashboard/student/learn" + (nextAction.targetSkillId ? `?skillId=${nextAction.targetSkillId}` : ""); break;
      case 'PRACTICE': href = "/dashboard/student/practice" + (nextAction.targetSkillId ? `?skillId=${nextAction.targetSkillId}` : ""); break;
      case 'BUILD': href = "/dashboard/student/practical-tasks" + (nextAction.targetSkillId ? `?skillId=${nextAction.targetSkillId}` : ""); break;
      case 'VERIFY': href = "/dashboard/student/assessments" + (nextAction.targetSkillId ? `?skillId=${nextAction.targetSkillId}` : ""); break;
      case 'APPLY': href = "/dashboard/student/company-challenges"; break;
    }
    
    return (
      <Link href={href} className="mt-4 inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 w-full sm:w-auto justify-center">
        {nextAction.label}
        <ArrowRight className="w-5 h-5 ml-2" />
      </Link>
    );
  };

  if (loading && !selectedRole) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Job Readiness Hub</h1>
          <p className="text-gray-500 mt-1">Track your progress from learning to getting hired.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3">
          {user && (
            <Link
              href={`/profile/${user.uid}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-200 transition-colors h-10"
            >
              <span>View Public Profile</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          )}
          <div className="w-full sm:w-64">
            <label className="block text-sm font-medium text-gray-700 mb-1">Target Career Role</label>
            <select
              value={selectedRoleId}
              onChange={handleRoleSelect}
              className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-2 border bg-white"
            >
              <option value="">-- Select a Career Path --</option>
              {roles.map(r => (
                <option key={r.id} value={r.id}>{r.title}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {!selectedRole ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center shadow-sm">
          <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Target className="w-8 h-8 text-blue-500" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Explore Career Paths</h3>
          <p className="text-gray-500 max-w-md mx-auto mb-6">
            To view your job readiness, select a target career path from the dropdown above to see the required skills and track your journey.
          </p>
          <Link href="/dashboard/student/roles" className="inline-flex items-center text-blue-600 font-medium hover:underline">
            Browse available roles <ArrowRight className="w-4 h-4 ml-1" />
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('overview')}
                className={`${
                  activeTab === 'overview'
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              >
                Journey Overview
              </button>
              <button
                onClick={() => setActiveTab('prep')}
                className={`${
                  activeTab === 'prep'
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                Technical Interview Prep
              </button>
            </nav>
          </div>

          {activeTab === 'overview' ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main State Banner */}
          <div className="lg:col-span-3">
            <div className={`p-8 rounded-2xl border ${stateInfo.bg.replace('bg-', 'border-')} ${stateInfo.bg} flex flex-col md:flex-row items-start md:items-center justify-between gap-6`}>
              <div className="flex-1">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide mb-3 ${stateInfo.color} bg-white/60 border ${stateInfo.bg.replace('bg-', 'border-')}`}>
                  Current Phase
                </span>
                <h2 className={`text-3xl font-black mb-2 ${stateInfo.color}`}>{stateInfo.text}</h2>
                <p className="text-gray-700 max-w-2xl text-lg">
                  {nextAction?.description || "Select a role to begin."}
                </p>
                {renderActionLink()}
              </div>
              <div className="hidden md:block text-gray-200 opacity-20">
                <Activity className="w-32 h-32" />
              </div>
            </div>
          </div>

          {/* Left Column: Skill Journey Checklist */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center border-b pb-4">
                <BookOpen className="w-5 h-5 mr-2 text-blue-600" />
                Required Skills for {selectedRole.title}
              </h3>
              
              <div className="space-y-4">
                {selectedRole.requiredSkillIds.map((skillId) => {
                  const score = activity.skillScores.find(s => s.skillId === skillId);
                  const isVerified = score?.isVerified;
                  const hasPractice = activity.practiceAttempts.some(p => p.skillId === skillId);
                  const hasProject = activity.practicalAttempts.some(p => p.skillId === skillId);
                  const skillName = skillDict[skillId] || skillId;

                  return (
                    <div key={skillId} className={`p-4 rounded-xl border ${isVerified ? 'bg-green-50/50 border-green-100' : 'bg-gray-50 border-gray-200'} flex items-center justify-between`}>
                      <div className="flex items-center gap-3">
                        {isVerified ? (
                          <CheckCircle2 className="w-6 h-6 text-green-500 flex-shrink-0" />
                        ) : (
                          <Circle className="w-6 h-6 text-gray-300 flex-shrink-0" />
                        )}
                        <div>
                          <div className="font-bold text-gray-900">{skillName}</div>
                          <div className="text-xs text-gray-500 mt-0.5 flex gap-2">
                            <span className={hasPractice ? "text-blue-600" : ""}>{hasPractice ? "✓ Practiced" : "○ Not practiced"}</span>
                            <span>•</span>
                            <span className={hasProject ? "text-orange-600" : ""}>{hasProject ? "✓ Project Built" : "○ No project"}</span>
                          </div>
                        </div>
                      </div>
                      
                      {!isVerified && (
                         <Link href={`/dashboard/student/practice?skillId=${skillId}`} className="text-sm font-medium text-blue-600 hover:underline">
                           Practice
                         </Link>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            
            {/* Project Experience Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                 <h4 className="font-bold text-gray-900 mb-2 flex items-center">
                   <Activity className="w-4 h-4 mr-2 text-blue-500" />
                   Coding Practice
                 </h4>
                 <div className="text-3xl font-black text-gray-800 my-4">
                   {activity.practiceAttempts.filter(p => p.passed).length} <span className="text-sm text-gray-500 font-medium">Problems Solved</span>
                 </div>
                 <Link href="/dashboard/student/practice" className="text-sm text-blue-600 hover:underline">Continue Coding Practice →</Link>
               </div>
               
               <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                 <h4 className="font-bold text-gray-900 mb-2 flex items-center">
                   <PlayCircle className="w-4 h-4 mr-2 text-orange-500" />
                   Project Experience
                 </h4>
                 <div className="text-3xl font-black text-gray-800 my-4">
                   {activity.practicalAttempts.filter(p => p.status === 'completed').length} <span className="text-sm text-gray-500 font-medium">Projects Submitted</span>
                 </div>
                 <Link href="/dashboard/student/practical-tasks" className="text-sm text-blue-600 hover:underline">Build more projects →</Link>
               </div>
            </div>
          </div>

          {/* Right Column: Opportunities */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
               <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center border-b pb-4">
                 <Briefcase className="w-5 h-5 mr-2 text-indigo-600" />
                 Hiring Opportunities
               </h3>
               
               {opportunities.length === 0 ? (
                 <div className="text-center py-6 text-gray-500 bg-gray-50 rounded-lg border border-gray-100">
                   <AlertCircle className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                   <p className="text-sm">No matching challenges available yet. Keep building your skills!</p>
                 </div>
               ) : (
                 <div className="space-y-4">
                   {opportunities.map(opp => {
                     const isApplied = applications.some(a => a.challengeId === opp.id);
                     return (
                       <div key={opp.id} className="border border-gray-200 rounded-lg p-4 hover:border-indigo-300 transition-colors">
                         <h4 className="font-bold text-gray-900 text-sm mb-1 line-clamp-1">{opp.title}</h4>
                         <p className="text-xs text-gray-500 mb-3">{opp.jobRole}</p>
                         
                         {isApplied ? (
                           <div className="text-xs font-medium text-green-700 bg-green-50 px-2 py-1 rounded inline-flex items-center">
                             <CheckCircle2 className="w-3 h-3 mr-1" /> Applied
                           </div>
                         ) : readinessState === 'READY' ? (
                           <Link href={`/dashboard/student/company-challenges/${opp.id}`} className="text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded transition-colors w-full text-center block">
                             View Challenge
                           </Link>
                         ) : (
                           <div className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded">
                             Skill requirements unmet
                           </div>
                         )}
                       </div>
                     );
                   })}
                 </div>
               )}
            </div>
            
            {/* Active Applications Summary */}
            {applications.length > 0 && (
               <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                 <h4 className="font-bold text-gray-900 mb-3 text-sm uppercase tracking-wider text-gray-500">Active Applications</h4>
                 <div className="space-y-3">
                   {applications.map(app => {
                     const challenge = opportunities.find(o => o.id === app.challengeId) || { title: 'Unknown Challenge' };
                     return (
                       <div key={app.id} className="text-sm border-l-2 border-indigo-500 pl-3 py-1">
                         <div className="font-medium text-gray-900 truncate">{challenge.title}</div>
                         <div className="text-xs text-indigo-600 font-medium capitalize mt-0.5">{app.status.replace('_', ' ')}</div>
                       </div>
                     );
                   })}
                 </div>
               </div>
            )}
          </div>
          </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <h3 className="text-xl font-bold text-gray-900 mb-2">Technical Interview Preparation</h3>
                <p className="text-gray-600 mb-6">
                  Review advanced theoretical concepts and practice challenging problems tailored to the required skills for {selectedRole.title}.
                </p>

                <div className="space-y-8">
                  {/* Topics Section */}
                  <div>
                    <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center border-b pb-2">
                      <BookOpen className="w-5 h-5 mr-2 text-blue-600" />
                      Theory Review
                    </h4>
                    {prepTopics.length === 0 ? (
                      <p className="text-gray-500 text-sm italic">No theory topics available for this role yet.</p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {prepTopics.map(topic => (
                          <Link href={`/dashboard/student/learn?skillId=${topic.skillId}`} key={topic.id} className="block p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors bg-blue-50/30">
                            <h5 className="font-bold text-gray-900 text-sm mb-1">{topic.title}</h5>
                            <p className="text-xs text-gray-500 line-clamp-2">{topic.overview}</p>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Practice Section */}
                  <div>
                    <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center border-b pb-2">
                      <Code className="w-5 h-5 mr-2 text-indigo-600" />
                      Advanced Practice Problems
                    </h4>
                    {prepProblems.length === 0 ? (
                      <p className="text-gray-500 text-sm italic">No advanced practice problems available for this role yet.</p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {prepProblems.map(problem => (
                          <Link href={`/dashboard/student/practice?skillId=${problem.skillId}`} key={problem.id} className="block p-4 border border-gray-200 rounded-lg hover:border-indigo-300 transition-colors bg-indigo-50/30">
                            <h5 className="font-bold text-gray-900 text-sm mb-1">{problem.title}</h5>
                            <p className="text-xs text-gray-500 mb-2">Difficulty: <span className="text-indigo-600 font-medium capitalize">{problem.difficulty}</span></p>
                            <p className="text-xs text-gray-500 line-clamp-2">{problem.description}</p>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
