"use client";

import { useEffect, useState, use } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, ArrowLeft, CheckCircle2, Circle, Clock, ArrowRight, Play, BookOpen, Lock, Briefcase, Award, Terminal } from "lucide-react";
import Link from "next/link";
import { RolePath, CompanyChallenge, StudentSkillScore } from "@/types";
import { getSkillJourneyState, getSkillJourneyAction, SkillJourneyState } from "@/lib/mastery";

type SkillState = {
  id: string;
  name: string;
  category: string;
  description: string;
  status: SkillJourneyState;
};

type MatchedChallenge = CompanyChallenge & { companyName: string };

export default function RoleRoadmapPage({ params }: { params: Promise<{ id: string }> }) {
  const { user } = useAuth();
  const { id: roleId } = use(params);
  
  const [role, setRole] = useState<RolePath | null>(null);
  const [skills, setSkills] = useState<SkillState[]>([]);
  const [relevantChallenges, setRelevantChallenges] = useState<MatchedChallenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      try {
        // 1. Fetch Role
        const roleDoc = await getDoc(doc(db, "roles", roleId));
        if (!roleDoc.exists()) {
          setError("Role Path not found.");
          setLoading(false);
          return;
        }
        const roleData = { id: roleDoc.id, ...roleDoc.data() } as RolePath;
        setRole(roleData);

        if (!roleData.requiredSkillIds || roleData.requiredSkillIds.length === 0) {
          setLoading(false);
          return;
        }

        // 2. Fetch Skills Data
        const skillIds = roleData.requiredSkillIds;
        const skillsDataMap = new Map();
        
        for (let i = 0; i < skillIds.length; i += 10) {
          const chunk = skillIds.slice(i, i + 10);
          const skillsSnap = await getDocs(query(collection(db, "skills"), where("__name__", "in", chunk)));
          skillsSnap.forEach(d => {
            skillsDataMap.set(d.id, d.data());
          });
        }

        // 3. Fetch Student Skill Scores
        const scoresSnap = await getDocs(
          query(collection(db, "skillScores"), where("studentId", "==", user.uid))
        );
        const allSkillScores = scoresSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));

        // 4. Fetch Practice Attempts
        const practiceSnap = await getDocs(
          query(collection(db, "practiceAttempts"), where("studentId", "==", user.uid))
        );
        const allPracticeAttempts = practiceSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));

        // 5. Assemble ordered SkillState
        const orderedSkills: SkillState[] = skillIds.map(id => {
          const sData = skillsDataMap.get(id);
          
          const sScore = allSkillScores.find(s => s.skillId === id);
          const sPractice = allPracticeAttempts.filter(a => a.skillId === id);

          const status = getSkillJourneyState({
            skillId: id,
            skillScore: sScore,
            practiceAttempts: sPractice,
            assessmentAttempts: [] // We rely on skillScore.theoryScore for Competent check
          });

          return {
            id,
            name: sData?.name || "Unknown Skill",
            category: sData?.category || "Unknown",
            description: sData?.description || "",
            status
          };
        });

        setSkills(orderedSkills);

        // 6. Fetch Relevant Opportunities
        const challengesSnap = await getDocs(query(collection(db, "companyChallenges"), where("status", "==", "published")));
        const now = new Date();
        const matchedActive: CompanyChallenge[] = [];
        
        challengesSnap.forEach(d => {
          const c = { id: d.id, ...d.data() } as CompanyChallenge;
          if (new Date(c.applicationDeadline) >= now && c.requiredSkillIds?.some(id => skillIds.includes(id))) {
             matchedActive.push(c);
          }
        });

        // Sort by deadline and take top 3
        matchedActive.sort((a, b) => new Date(a.applicationDeadline).getTime() - new Date(b.applicationDeadline).getTime());
        const topMatches = matchedActive.slice(0, 3);

        const companyIds = Array.from(new Set(topMatches.map(c => c.companyId)));
        const companyNames: Record<string, string> = {};
        for (const cid of companyIds) {
          try {
            const pSnap = await getDocs(query(collection(db, "companyProfiles"), where("__name__", "==", cid)));
            if (!pSnap.empty) {
               companyNames[cid] = pSnap.docs[0].data().companyName || "Unknown Company";
            } else {
               companyNames[cid] = "Unknown Company";
            }
          } catch (e) {
            companyNames[cid] = "Unknown Company";
          }
        }

        const enrichedMatches = topMatches.map(c => ({
          ...c,
          companyName: companyNames[c.companyId]
        }));

        setRelevantChallenges(enrichedMatches);

      } catch (err) {
        console.error("Failed to fetch roadmap data", err);
        setError("An error occurred while loading the roadmap.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, roleId]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error || !role) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500">{error}</p>
        <Link href="/dashboard/student/roles" className="text-blue-500 hover:underline mt-4 inline-block">
          Return to Career Paths
        </Link>
      </div>
    );
  }

  // Calculate Progress
  const totalSkills = skills.length;
  const verifiedCount = skills.filter(s => s.status === "verified").length;
  const progressPercentage = totalSkills > 0 ? Math.round((verifiedCount / totalSkills) * 100) : 0;

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div>
        <Link 
          href="/dashboard/student/roles"
          className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-900 mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Career Paths
        </Link>
        
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{role.title}</h1>
              <p className="text-gray-600 text-lg max-w-2xl">{role.description}</p>
            </div>
            
            <div className="bg-gray-50 rounded-xl p-4 min-w-[200px] border border-gray-100">
              <p className="text-sm font-medium text-gray-500 mb-1">Your Progress</p>
              <div className="flex items-end gap-2 mb-2">
                <span className="text-3xl font-bold text-blue-600">{progressPercentage}%</span>
                <span className="text-sm text-gray-500 font-medium mb-1">{verifiedCount} of {totalSkills} verified</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-1000" 
                  style={{ width: `${progressPercentage}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Roadmap Timeline */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-6">Learning Roadmap</h2>
        
        <div className="relative">
          {/* Vertical Line */}
          <div className="absolute left-8 top-8 bottom-8 w-0.5 bg-gray-200 hidden md:block"></div>
          
          <div className="space-y-6">
            {skills.map((skill, index) => {
              
              const isVerified = skill.status === "verified";
              const isCompetent = skill.status === "competent";
              const isPracticing = skill.status === "practicing";
              const isLearning = skill.status === "learning";
              const isNext = !isVerified && !isCompetent && (index === 0 || skills[index - 1].status === "verified" || skills[index - 1].status === "competent");
              
              return (
                <div key={skill.id} className="relative flex flex-col md:flex-row gap-6 group">
                  
                  {/* Timeline Node */}
                  <div className="hidden md:flex flex-col items-center z-10 w-16 pt-6">
                    <div className={`w-10 h-10 rounded-full border-4 flex items-center justify-center bg-white transition-colors duration-300
                      ${isVerified ? 'border-green-500 text-green-500' : 
                        isCompetent ? 'border-purple-500 text-purple-500' :
                        isPracticing ? 'border-blue-500 text-blue-500' : 
                        isLearning ? 'border-yellow-400 text-yellow-500' :
                        isNext ? 'border-indigo-500 text-indigo-500' : 'border-gray-200 text-gray-300'}`}
                    >
                      {isVerified ? (
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                      ) : isCompetent ? (
                        <Award className="w-5 h-5 text-purple-500" />
                      ) : isPracticing ? (
                        <Terminal className="w-5 h-5 text-blue-500" />
                      ) : isLearning ? (
                        <BookOpen className="w-5 h-5 text-yellow-500" />
                      ) : isNext ? (
                        <span className="w-3 h-3 bg-indigo-500 rounded-full animate-pulse"></span>
                      ) : (
                        <Lock className="w-4 h-4 text-gray-300" />
                      )}
                    </div>
                  </div>

                  {/* Content Card */}
                  <div className={`flex-1 bg-white rounded-xl border p-6 transition-all duration-300
                    ${isVerified ? 'border-green-200 shadow-sm' : 
                      isCompetent ? 'border-purple-200 shadow-md ring-1 ring-purple-400' :
                      isPracticing ? 'border-blue-200 shadow-md ring-1 ring-blue-400' : 
                      isLearning ? 'border-yellow-200 shadow-md' :
                      isNext ? 'border-indigo-200 shadow-md ring-1 ring-indigo-500' : 'border-gray-100 opacity-70'}`}
                  >
                    <div className="flex flex-col sm:flex-row justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-sm font-bold text-gray-400">Step {index + 1}</span>
                          <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full capitalize
                            ${isVerified ? 'bg-green-100 text-green-700' : 
                              isCompetent ? 'bg-purple-100 text-purple-700' :
                              isPracticing ? 'bg-blue-100 text-blue-700' : 
                              isLearning ? 'bg-yellow-100 text-yellow-800' :
                              isNext ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600'}`}
                          >
                            {isVerified ? 'Verified' : isCompetent ? 'Competent' : isPracticing ? 'Practicing' : isLearning ? 'Learning' : isNext ? 'Up Next' : 'Locked'}
                          </span>
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">{skill.name}</h3>
                        <p className="text-gray-600 text-sm max-w-xl">{skill.description}</p>
                      </div>

                      {/* Call to Actions */}
                      <div className="flex flex-row sm:flex-col justify-end gap-2 shrink-0">
                        {(() => {
                          const action = getSkillJourneyAction(skill.status, skill.id);
                          // For locked skills that aren't next, disable actions
                          const isLocked = !isVerified && !isCompetent && !isPracticing && !isLearning && !isNext;
                          
                          if (isLocked) {
                            return (
                              <button disabled className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-lg bg-gray-100 text-gray-400 pointer-events-none">
                                <Lock className="w-4 h-4 mr-2" />
                                Locked
                              </button>
                            );
                          }
                          
                          return (
                            <Link 
                              href={action.href}
                              className={`inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-lg transition-colors
                                ${action.type === 'primary' 
                                  ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm' 
                                  : 'bg-green-50 text-green-700 hover:bg-green-100'}`}
                            >
                              {action.type === 'primary' && action.label.includes('Practice') && <Terminal className="w-4 h-4 mr-2" />}
                              {action.type === 'primary' && action.label.includes('Learn') && <BookOpen className="w-4 h-4 mr-2" />}
                              {action.type === 'secondary' && <Award className="w-4 h-4 mr-2" />}
                              {action.label}
                            </Link>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      
      {/* Relevant Opportunities Section */}
      {relevantChallenges.length > 0 && (
        <div className="mt-12 pt-8 border-t border-gray-200">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-900">Relevant Opportunities</h2>
            <Link href="/dashboard/student/company-challenges" className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center">
              View All Matches <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {relevantChallenges.map(challenge => (
              <Link key={challenge.id} href={`/dashboard/student/company-challenges/${challenge.id}`}>
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:border-blue-500 transition-colors h-full flex flex-col">
                  <div className="mb-3">
                    <h3 className="font-bold text-gray-900 line-clamp-1">{challenge.title}</h3>
                    <p className="text-sm font-medium text-blue-600 line-clamp-1">{challenge.companyName}</p>
                  </div>
                  <div className="text-sm text-gray-500 mb-4 flex-1">
                    <div className="flex items-center mb-1.5">
                      <Briefcase className="w-4 h-4 mr-2 text-gray-400 shrink-0" />
                      <span className="truncate">{challenge.jobRole}</span>
                    </div>
                    <div className="flex items-center">
                      <Clock className="w-4 h-4 mr-2 text-gray-400 shrink-0" />
                      <span className="truncate">Deadline: {new Date(challenge.applicationDeadline).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                     <span className={`px-2 py-1 rounded-md text-xs font-medium capitalize ${
                        challenge.difficulty === 'easy' ? 'bg-green-100 text-green-800' :
                        challenge.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {challenge.difficulty}
                     </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
