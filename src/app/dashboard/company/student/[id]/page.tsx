"use client";

import { use, useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { Loader2, ArrowLeft, GraduationCap, GitBranch, Briefcase, Award, Code, CheckCircle, Mail, AlertCircle, Target, Zap, Send, MessageSquare, Lock } from "lucide-react";
import { isCandidateStrongMatch } from "@/lib/candidate-matching";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";

type Props = {
  params: Promise<{ id: string }>;
};

type Profile = {
  fullName: string;
  college: string;
  branch: string;
  shortBio: string;
  githubUrl?: string;
  linkedinUrl?: string;
  targetRoleId?: string;
};
type SkillScoreDisplay = {
  id: string;
  name: string;
  theoryScore: number | null;
  practicalScore: number | null;
  overallScore: number | null;
  isVerified: boolean;
  projectEvidence?: {
    taskId: string;
    taskTitle: string;
    githubUrl?: string | null;
    liveUrl?: string | null;
    highestPracticalAttemptId?: string;
  };
};

export default function StudentDetailView({ params }: Props) {
  const { id: studentId } = use(params);
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscriptionChecked, setSubscriptionChecked] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [email, setEmail] = useState<string>("");
  const [skillScores, setSkillScores] = useState<SkillScoreDisplay[]>([]);

  const [targetRole, setTargetRole] = useState<any>(null);
  const [roleProgress, setRoleProgress] = useState<{ verified: number, total: number }>({ verified: 0, total: 0 });
  const [companyChallenges, setCompanyChallenges] = useState<any[]>([]);
  const [evaluatedProjects, setEvaluatedProjects] = useState<any[]>([]);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      try {
        setLoading(true);

        // 1. Check Subscription Status
        const companyDoc = await getDoc(doc(db, "companyProfiles", user.uid));
        const subscribed = companyDoc.exists() && companyDoc.data().subscriptionStatus === 'active';
        setIsSubscribed(subscribed);
        setSubscriptionChecked(true);

        if (!subscribed) {
          setLoading(false);
          return;
        }

        // 2. Fetch Student Profile (Company-facing verified evidence)
        const profileDoc = await getDoc(doc(db, "studentProfiles", studentId));
        let pData = null;
        if (profileDoc.exists()) {
          pData = profileDoc.data();
          setProfile(pData as Profile);
          setEmail(pData.contactEmail || pData.email || "");
        } else {
          setProfile({
            fullName: "Verified Student Candidate",
            college: "Verified College",
            branch: "Technical Branch",
            shortBio: "No bio provided."
          });
        }

        // Optional user check if permitted
        try {
          const userDoc = await getDoc(doc(db, "users", studentId));
          if (userDoc.exists() && userDoc.data().email) {
            setEmail(userDoc.data().email);
          }
        } catch (e) {
          // Users collection is owner-only per firestore.rules; ignore permission error
        }

        // Fetch dictionaries
        const skillsSnap = await getDocs(collection(db, "skills"));
        const skillDict: Record<string, string> = {};
        skillsSnap.forEach(d => skillDict[d.id] = d.data().name);

        // Fetch Skill Scores instead of raw attempts
        const skillScoresSnap = await getDocs(
          query(collection(db, "skillScores"), where("studentId", "==", studentId))
        );

        const scores: SkillScoreDisplay[] = [];
        skillScoresSnap.forEach(d => {
          const data = d.data();
          if (data.skillId) {
            scores.push({
              id: data.skillId,
              name: skillDict[data.skillId] || "Unknown Skill",
              theoryScore: data.theoryScore ?? null,
              practicalScore: data.practicalScore ?? null,
              overallScore: data.overallScore ?? null,
              isVerified: !!data.isVerified,
              projectEvidence: data.projectEvidence ? {
                ...data.projectEvidence,
                highestPracticalAttemptId: data.highestPracticalAttemptId
              } : undefined
            });
          }
        });

        setSkillScores(scores.sort((a, b) => (b.overallScore || 0) - (a.overallScore || 0)));

        // Fetch Evaluated Projects (Practical Proof) using explicit IDs to avoid collection-wide reads
        const evaluated: any[] = [];
        const taskIds = new Set<string>();

        // Collect highestPracticalAttemptIds from the loaded scores
        const attemptIds = scores
          .filter(s => s.isVerified && s.projectEvidence && s.projectEvidence.highestPracticalAttemptId)
          .map(s => s.projectEvidence!.highestPracticalAttemptId as string);

        if (attemptIds.length > 0) {
          const attemptPromises = attemptIds.map(async (aId) => {
            try {
              const attemptDoc = await getDoc(doc(db, "practicalTaskAttempts", aId));
              if (attemptDoc.exists()) {
                const data = attemptDoc.data();
                if (data.evaluation && data.evaluation.status === 'evaluated') {
                  evaluated.push({ id: attemptDoc.id, ...data });
                  if (data.taskId) taskIds.add(data.taskId);
                }
              }
            } catch (err) {
              console.warn("Could not fetch attempt:", aId, err);
            }
          });
          await Promise.all(attemptPromises);
        }

        const taskTitleDict: Record<string, string> = {};
        if (taskIds.size > 0) {
          const taskPromises = Array.from(taskIds).map(async (tId) => {
            const tDoc = await getDoc(doc(db, "practicalTasks", tId));
            if (tDoc.exists()) {
              taskTitleDict[tId] = tDoc.data().title;
            }
          });
          await Promise.all(taskPromises);
        }

        const enrichedProjects = evaluated.map(p => ({
          ...p,
          taskTitle: taskTitleDict[p.taskId] || "Practical Project",
          skillName: skillDict[p.skillId] || "Unknown Skill"
        }));
        setEvaluatedProjects(enrichedProjects.sort((a, b) => (b.evaluation.percentage || 0) - (a.evaluation.percentage || 0)));

        // Fetch Role if targetRoleId exists
        if (pData?.targetRoleId) {
          const roleDoc = await getDoc(doc(db, "roles", pData.targetRoleId));
          if (roleDoc.exists()) {
            const roleData = roleDoc.data();
            setTargetRole({ id: roleDoc.id, ...roleData });

            if (roleData.requiredSkillIds) {
              const total = roleData.requiredSkillIds.length;
              const verified = roleData.requiredSkillIds.filter((reqId: string) =>
                scores.some(s => s.id === reqId && s.isVerified)
              ).length;
              setRoleProgress({ verified, total });
            }
          }
        }

        // Fetch company challenges
        const challengesSnap = await getDocs(
          query(collection(db, "companyChallenges"), where("companyId", "==", user.uid), where("status", "==", "published"))
        );
        const challengesData: any[] = [];
        challengesSnap.forEach(c => challengesData.push({ id: c.id, ...c.data() }));
        setCompanyChallenges(challengesData);

      } catch (err) {
        console.error("Error fetching student details:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [studentId, user]);

  const handleInvite = (challengeId: string) => {
    // In a real implementation, this would write to an 'invitations' collection
    setInviteSuccess(`Invitation sent successfully for challenge ID: ${challengeId}`);
    setTimeout(() => setInviteSuccess(null), 3000);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!isSubscribed) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8 mt-12">
        <Link href="/dashboard/company/search" className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-500 mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Talent Discovery
        </Link>
        <div className="bg-white rounded-xl shadow-md overflow-hidden text-center p-12 border border-gray-200">
          <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-blue-100 mb-6">
            <Lock className="h-10 w-10 text-blue-600" />
          </div>
          <h2 className="text-3xl font-extrabold text-gray-900 mb-4">
            Verified Talent Access Required
          </h2>
          <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
            Detailed student profiles, including evaluated projects and verified scores, are only available to subscribed companies.
          </p>
          <div className="bg-gray-50 rounded-lg p-6 max-w-lg mx-auto border border-gray-100">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Subscription Features</h3>
            <ul className="text-left space-y-3">
              <li className="flex items-start">
                <CheckCircle className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
                <span className="text-gray-700">Full visibility of candidate profiles</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
                <span className="text-gray-700">Review raw project code and instructor feedback</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
                <span className="text-gray-700">Send direct interview invitations</span>
              </li>
            </ul>
          </div>
          <div className="mt-8 text-sm text-gray-500">
            Current Status: <span className="font-semibold text-red-600">Inactive</span>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold text-gray-800">Student Not Found</h2>
        <p className="text-gray-500 mt-2">The requested student profile does not exist.</p>
        <Link href="/dashboard/company/search" className="mt-4 inline-flex items-center text-blue-600 hover:underline">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Search
        </Link>
      </div>
    );
  }

  const verifiedSkills = skillScores.filter(s => s.isVerified);
  const unverifiedSkills = skillScores.filter(s => !s.isVerified);

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <Link href="/dashboard/company/search" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-900 transition-colors">
        <ArrowLeft className="w-4 h-4 mr-1" /> Back to Talent Search
      </Link>

      {inviteSuccess && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md flex items-center">
          <CheckCircle className="w-5 h-5 mr-2" />
          {inviteSuccess}
        </div>
      )}

      {/* 1. Student Overview Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 md:p-8 flex flex-col md:flex-row gap-6 items-start">
        <div className="w-24 h-24 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-bold text-4xl flex-shrink-0">
          {profile?.fullName?.charAt(0).toUpperCase()}
        </div>

        <div className="flex-1 space-y-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{profile?.fullName}</h1>
            <p className="text-lg text-gray-500 flex items-center mt-1">
              <GraduationCap className="w-5 h-5 mr-2" />
              {profile?.branch} @ {profile?.college}
            </p>
          </div>

          <p className="text-gray-700 max-w-2xl">{profile?.shortBio}</p>

          <div className="flex flex-wrap gap-4 pt-2">
            <Link
              href={`/profile/${studentId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center text-sm font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors border border-indigo-200"
            >
              <Award className="w-4 h-4 mr-2 text-indigo-600" /> Shareable Public Profile
            </Link>
            <a href={`mailto:${email}`} className="inline-flex items-center text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg transition-colors">
              <Mail className="w-4 h-4 mr-2 text-gray-500" /> Contact
            </a>
            {profile?.githubUrl && (
              <a href={profile.githubUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg transition-colors">
                <GitBranch className="w-4 h-4 mr-2 text-gray-500" /> GitHub
              </a>
            )}
            {profile?.linkedinUrl && (
              <a href={profile.linkedinUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg transition-colors">
                <Briefcase className="w-4 h-4 mr-2 text-blue-500" /> LinkedIn
              </a>
            )}
          </div>
        </div>
      </div>

      {/* 2. Role Relevance */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
          <Target className="w-6 h-6 mr-2 text-blue-600" />
          Role Relevance
        </h2>
        {targetRole ? (
          <div className="flex flex-col md:flex-row gap-6 items-center">
            <div className="flex-1">
              <h3 className="text-lg font-bold text-gray-900">{targetRole.title}</h3>
              <p className="text-sm text-gray-600 mt-1">{targetRole.description}</p>
            </div>
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 text-center min-w-[150px]">
              <div className="text-xs text-blue-600 font-bold uppercase tracking-wider mb-1">Target Match</div>
              <div className="text-3xl font-black text-blue-700">
                {roleProgress.verified} <span className="text-lg font-medium text-blue-500">/ {roleProgress.total}</span>
              </div>
              <div className="text-xs text-blue-600 mt-1">Skills Verified</div>
            </div>
          </div>
        ) : (
          <div className="text-center py-6 text-gray-500">
            <p>This student has not selected a target role.</p>
          </div>
        )}
      </div>

      {/* 3. Company Opportunities (Strong Match) */}
      {companyChallenges.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 border-l-4 border-l-purple-500">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
            <Briefcase className="w-6 h-6 mr-2 text-purple-600" />
            Relevant Company Opportunities
          </h2>
          <div className="space-y-4">
            {companyChallenges.map(challenge => {
              const reqSkills = challenge.requiredSkillIds || [];
              const verifiedSet = new Set(skillScores.filter(s => s.isVerified).map(s => s.id));
              const isStrongMatch = isCandidateStrongMatch(reqSkills, verifiedSet);

              return (
                <div key={challenge.id} className="border border-gray-200 rounded-lg p-4 flex flex-col md:flex-row justify-between items-center bg-gray-50 hover:bg-gray-100 transition-colors">
                  <div>
                    <h3 className="font-bold text-gray-900">{challenge.title}</h3>
                    <div className="text-sm text-gray-500 mt-1 flex items-center gap-2">
                      <span className="capitalize">{challenge.difficulty}</span>
                      <span>&bull;</span>
                      <span>{reqSkills.length} Required Skills</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 mt-4 md:mt-0">
                    {isStrongMatch ? (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                        <Zap className="w-4 h-4 mr-1 text-green-600" /> Strong Match
                      </span>
                    ) : (
                      <span className="text-sm text-gray-500">Does not meet all requirements</span>
                    )}
                    <button
                      onClick={() => handleInvite(challenge.id)}
                      className={`inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white focus:outline-none ${isStrongMatch ? 'bg-purple-600 hover:bg-purple-700' : 'bg-gray-400 hover:bg-gray-500'}`}
                    >
                      <Send className="w-4 h-4 mr-2" /> Invite to Apply
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. Verified Technical Skills */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
          <Award className="w-6 h-6 mr-2 text-blue-600" />
          Verified Technical Skills
        </h2>

        {verifiedSkills.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {verifiedSkills.map(skill => (
              <div key={skill.id} className="border border-gray-200 rounded-xl p-5 bg-gray-50/50 hover:border-blue-200 transition-colors">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="font-bold text-lg text-gray-900 flex items-center">
                    {skill.name}
                    <span title="Verified Skill"><CheckCircle className="w-4 h-4 text-green-500 ml-2" /></span>
                  </h3>
                  <div className="text-right">
                    <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Overall Score</div>
                    <div className="font-bold text-2xl text-blue-600">
                      {skill.overallScore != null ? `${skill.overallScore}%` : 'N/A'}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-100">
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Theory</div>
                    <div className="font-semibold text-gray-900">{skill.theoryScore != null ? `${skill.theoryScore}%` : 'N/A'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Practical</div>
                    <div className="font-semibold text-gray-900">{skill.practicalScore != null ? `${skill.practicalScore}%` : 'N/A'}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <AlertCircle className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p>No verified technical skills found for this student.</p>
          </div>
        )}
      </div>

      {/* 5. Verified Project Evidence */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
          <Code className="w-6 h-6 mr-2 text-indigo-600" />
          Verified Project Evidence
        </h2>

        {evaluatedProjects.length > 0 ? (
          <div className="space-y-6">
            {evaluatedProjects.map(proj => (
              <div key={proj.id} className="border border-indigo-100 rounded-xl overflow-hidden">
                <div className="bg-indigo-50/50 p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <div className="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-1 flex items-center">
                      <CheckCircle className="w-3 h-3 mr-1 text-indigo-600" /> Officially Evaluated
                    </div>
                    <h3 className="font-bold text-lg text-gray-900">{proj.taskTitle}</h3>
                    <p className="text-sm text-gray-600 mt-1">Skill: <span className="font-medium text-gray-800">{proj.skillName}</span></p>
                  </div>

                  <div className="flex flex-col items-end">
                    <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Evaluation Score</div>
                    <div className="font-bold text-3xl text-indigo-700">{proj.evaluation.percentage}%</div>
                  </div>
                </div>

                <div className="p-5 border-t border-indigo-50 bg-white">
                  <div className="flex flex-wrap gap-3 mb-5">
                    {proj.submission?.githubUrl && (
                      <a href={proj.submission.githubUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-lg transition-colors border border-gray-200">
                        <GitBranch className="w-4 h-4 mr-2 text-gray-500" /> Source Code
                      </a>
                    )}
                    {proj.submission?.liveUrl && (
                      <a href={proj.submission.liveUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-sm font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-2 rounded-lg transition-colors border border-indigo-100">
                        <Zap className="w-4 h-4 mr-2 text-indigo-500" /> Live Demo
                      </a>
                    )}
                  </div>

                  {proj.evaluation.feedback && (
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                      <div className="flex items-start">
                        <MessageSquare className="w-5 h-5 text-gray-400 mr-3 mt-0.5 flex-shrink-0" />
                        <div>
                          <h4 className="text-sm font-bold text-gray-900 mb-1">Evaluator Feedback</h4>
                          <p className="text-sm text-gray-700 whitespace-pre-wrap">{proj.evaluation.feedback}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-10 text-gray-500">
            <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p>No verified project evidence available yet.</p>
            <p className="text-sm mt-1">The student has not completed any evaluated practical projects.</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="text-center py-8 text-gray-500 flex flex-col items-center">
            <AlertCircle className="w-12 h-12 text-gray-300 mb-3" />
            <p>Detailed assessment and practice history is restricted.</p>
            <p className="text-sm mt-1">Companies can only view verified skill aggregations and project evidence.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
