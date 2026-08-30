"use client";

import { use, useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { Loader2, ArrowLeft, GraduationCap, GitBranch, Briefcase, Award, Code, CheckCircle, Mail, AlertCircle } from "lucide-react";
import Link from "next/link";

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
  };
};

export default function StudentDetailView({ params }: Props) {
  const { id: studentId } = use(params);

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [email, setEmail] = useState<string>("");
  const [skillScores, setSkillScores] = useState<SkillScoreDisplay[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch User (for email)
        const userDoc = await getDoc(doc(db, "users", studentId));
        if (!userDoc.exists() || userDoc.data().role !== "student") {
          setLoading(false);
          return;
        }
        setEmail(userDoc.data().email || "");

        // Fetch Profile
        const profileDoc = await getDoc(doc(db, "studentProfiles", studentId));
        if (profileDoc.exists()) {
          setProfile(profileDoc.data() as Profile);
        } else {
          setProfile({
            fullName: "Anonymous Student",
            college: "Unknown College",
            branch: "Unknown Branch",
            shortBio: "No bio provided."
          });
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
              projectEvidence: data.projectEvidence
            });
          }
        });
        
        setSkillScores(scores.sort((a, b) => (b.overallScore || 0) - (a.overallScore || 0)));

      } catch (err) {
        console.error("Error fetching student details:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [studentId]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!profile && !email) {
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

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <Link href="/dashboard/company/search" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-900 transition-colors">
        <ArrowLeft className="w-4 h-4 mr-1" /> Back to Talent Search
      </Link>

      {/* Header Profile Card */}
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

      {/* Aggregated Skills Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
          <Award className="w-6 h-6 mr-2 text-blue-600" />
          Skill Intelligence Profile
        </h2>

        {skillScores.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {skillScores.map(skill => (
              <div 
                key={skill.id} 
                className={`border rounded-xl p-5 ${skill.isVerified ? 'bg-blue-50/50 border-blue-100' : 'bg-gray-50 border-gray-200'}`}
              >
                <div className="flex justify-between items-start mb-4">
                  <h3 className="font-bold text-lg text-gray-900 flex items-center">
                    {skill.name}
                    {skill.isVerified && (
                      <span title="Verified Skill"><CheckCircle className="w-4 h-4 text-green-500 ml-2" /></span>
                    )}
                  </h3>
                  <div className="text-right">
                    <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Overall</div>
                    <div className="font-bold text-2xl text-blue-600">
                      {skill.overallScore != null ? `${skill.overallScore}%` : '-'}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-200/60">
                  <div>
                    <div className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                      <Award className="w-3 h-3 text-purple-500" /> Theory Score
                    </div>
                    <div className="font-semibold text-gray-800">
                      {skill.theoryScore != null ? `${skill.theoryScore}%` : <span className="text-gray-400 font-normal">Not evaluated</span>}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                      <Code className="w-3 h-3 text-blue-500" /> Practical Score
                    </div>
                    <div className="font-semibold text-gray-800">
                      {skill.practicalScore != null ? `${skill.practicalScore}%` : <span className="text-gray-400 font-normal">Not evaluated</span>}
                    </div>
                  </div>
                </div>

                {/* Phase 15B: Project Evidence */}
                {skill.projectEvidence && (skill.projectEvidence.githubUrl || skill.projectEvidence.liveUrl) && (
                  <div className="mt-4 pt-4 border-t border-gray-200/60">
                    <div className="text-xs text-gray-500 mb-2 uppercase tracking-wider font-semibold">
                      Verified Project Evidence
                    </div>
                    <div className="text-sm font-medium text-gray-800 mb-2">
                      {skill.projectEvidence.taskTitle}
                    </div>
                    <div className="flex gap-3">
                      {skill.projectEvidence.githubUrl && (
                        <a href={skill.projectEvidence.githubUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded-md transition-colors border border-blue-200">
                          <Code className="w-3 h-3 mr-1.5" /> Repository
                        </a>
                      )}
                      {skill.projectEvidence.liveUrl && (
                        <a href={skill.projectEvidence.liveUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 px-2.5 py-1.5 rounded-md transition-colors border border-green-200">
                          <CheckCircle className="w-3 h-3 mr-1.5" /> Live Demo
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p>No skill data available for this student.</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="text-center py-8 text-gray-500 flex flex-col items-center">
            <Briefcase className="w-12 h-12 text-gray-300 mb-3" />
            <p>Detailed assessment and practical history is restricted.</p>
            <p className="text-sm mt-1">Companies can only view verified skill aggregations.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
