"use client";

import { useEffect, useState, useMemo } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { Loader2, Search, GraduationCap, Filter, Award, Code, CheckCircle, ChevronRight, AlertCircle, Lock } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/contexts/AuthContext";
import { doc, getDoc } from "firebase/firestore";

type StudentData = {
  id: string;
  fullName: string;
  college: string;
  branch: string;
  bio: string;
  skillScores: any[]; // Raw scores for this student
  displayOverallScore: number | null;
  displayTheoryScore: number | null;
  displayPracticalScore: number | null;
  displaySkillIds: string[];
};

type Skill = {
  id: string;
  name: string;
};

export default function TalentDiscoveryPage() {
  const { user } = useAuth();
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscriptionChecked, setSubscriptionChecked] = useState(false);
  
  // Raw Fetched Data
  const [rawProfiles, setRawProfiles] = useState<Record<string, any>>({});
  const [rawScores, setRawScores] = useState<any[]>([]);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSkill, setSelectedSkill] = useState("");
  const [minOverallScore, setMinOverallScore] = useState(0);
  const [minTheoryScore, setMinTheoryScore] = useState(0);
  const [minPracticalScore, setMinPracticalScore] = useState(0);
  const [requireVerified, setRequireVerified] = useState(false);

  // 1. Fetch Subscription Status & Skills
  useEffect(() => {
    const fetchInitData = async () => {
      if (!user) return;
      try {
        const companyDoc = await getDoc(doc(db, "companyProfiles", user.uid));
        if (companyDoc.exists() && companyDoc.data().subscriptionStatus === 'active') {
          setIsSubscribed(true);
        }
        setSubscriptionChecked(true);

        const skillsSnap = await getDocs(collection(db, "skills"));
        const skillsArray: Skill[] = [];
        skillsSnap.forEach(d => {
          skillsArray.push({ id: d.id, name: d.data().name });
        });
        setSkills(skillsArray.sort((a, b) => a.name.localeCompare(b.name)));
      } catch (err) {
        console.error("Error fetching init data:", err);
        setSubscriptionChecked(true);
      }
    };
    fetchInitData();
  }, [user]);

  // 2. Fetch SkillScores and Profiles based on selectedSkill
  useEffect(() => {
    if (!subscriptionChecked || !isSubscribed) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        let scoresQuery;
        if (selectedSkill) {
          scoresQuery = query(collection(db, "skillScores"), where("skillId", "==", selectedSkill));
        } else {
          // If no skill is selected, we fetch all skillScores to allow global discovery.
          // This avoids fetching all users/profiles.
          scoresQuery = query(collection(db, "skillScores"));
        }

        const skillScoresSnap = await getDocs(scoresQuery);
        const fetchedScores: any[] = [];
        const studentIds = new Set<string>();

        skillScoresSnap.forEach(doc => {
          const data = doc.data();
          if (data.studentId) {
            fetchedScores.push(data);
            studentIds.add(data.studentId);
          }
        });

        setRawScores(fetchedScores);

        // Fetch corresponding profiles in chunks of 30 (Firestore 'in' limit)
        const profileDocs: Record<string, any> = {};
        const idsArray = Array.from(studentIds);
        const chunkSize = 30;
        
        for (let i = 0; i < idsArray.length; i += chunkSize) {
          const chunk = idsArray.slice(i, i + chunkSize);
          const profilesQ = query(collection(db, "studentProfiles"), where("__name__", "in", chunk));
          const pSnap = await getDocs(profilesQ);
          pSnap.forEach(d => {
            profileDocs[d.id] = { id: d.id, ...d.data() };
          });
        }

        setRawProfiles(profileDocs);
      } catch (err) {
        console.error("Error fetching talent:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedSkill, subscriptionChecked, isSubscribed]); // Refetch from Firestore ONLY when skill changes

  // 3. Client-side filtering and aggregation
  const filteredStudents = useMemo(() => {
    // Group raw scores by student
    const scoresByStudent: Record<string, any[]> = {};
    rawScores.forEach(score => {
      // Pre-filter scores based on score thresholds before grouping
      if (requireVerified && !score.isVerified) return;
      if (minOverallScore > 0 && (score.overallScore == null || score.overallScore < minOverallScore)) return;
      if (minTheoryScore > 0 && (score.theoryScore == null || score.theoryScore < minTheoryScore)) return;
      if (minPracticalScore > 0 && (score.practicalScore == null || score.practicalScore < minPracticalScore)) return;

      const sid = score.studentId;
      if (!scoresByStudent[sid]) scoresByStudent[sid] = [];
      scoresByStudent[sid].push(score);
    });

    const results: StudentData[] = [];

    Object.keys(scoresByStudent).forEach(uid => {
      const profile = rawProfiles[uid];
      if (!profile) return; // Skip if no profile (e.g., student didn't complete onboarding)
      
      const studentScores = scoresByStudent[uid];
      if (studentScores.length === 0) return; // Filtered out

      // Free text search
      if (searchQuery) {
        const lower = searchQuery.toLowerCase();
        if (
          !(profile.fullName || "").toLowerCase().includes(lower) &&
          !(profile.college || "").toLowerCase().includes(lower) &&
          !(profile.branch || "").toLowerCase().includes(lower)
        ) {
          return; // Skip this student
        }
      }

      // If a specific skill is selected, display that skill's exact scores.
      // If no skill is selected, we aggregate their top score for display.
      let displayOverall = 0;
      let displayTheory = 0;
      let displayPractical = 0;
      const displaySkillIds = new Set<string>();

      if (selectedSkill) {
        const skillScore = studentScores.find(s => s.skillId === selectedSkill);
        displayOverall = skillScore?.overallScore ?? 0;
        displayTheory = skillScore?.theoryScore ?? 0;
        displayPractical = skillScore?.practicalScore ?? 0;
        if (skillScore) displaySkillIds.add(skillScore.skillId);
      } else {
        // Average across the filtered scores
        let oSum = 0, tSum = 0, pSum = 0;
        let oCount = 0, tCount = 0, pCount = 0;
        
        studentScores.forEach(s => {
          if (s.overallScore != null) { oSum += s.overallScore; oCount++; }
          if (s.theoryScore != null) { tSum += s.theoryScore; tCount++; }
          if (s.practicalScore != null) { pSum += s.practicalScore; pCount++; }
          if (s.skillId) displaySkillIds.add(s.skillId);
        });

        displayOverall = oCount > 0 ? oSum / oCount : 0;
        displayTheory = tCount > 0 ? tSum / tCount : 0;
        displayPractical = pCount > 0 ? pSum / pCount : 0;
      }

      results.push({
        id: uid,
        fullName: profile.fullName || "Anonymous Student",
        college: profile.college || "Unknown College",
        branch: profile.branch || "Unknown Branch",
        bio: profile.shortBio || "No bio provided.",
        skillScores: studentScores,
        displayOverallScore: displayOverall > 0 ? Math.round(displayOverall) : null,
        displayTheoryScore: displayTheory > 0 ? Math.round(displayTheory) : null,
        displayPracticalScore: displayPractical > 0 ? Math.round(displayPractical) : null,
        displaySkillIds: Array.from(displaySkillIds),
      });
    });

    // Sort by overall score descending
    return results.sort((a, b) => (b.displayOverallScore || 0) - (a.displayOverallScore || 0));
  }, [rawScores, rawProfiles, searchQuery, selectedSkill, minOverallScore, minTheoryScore, minPracticalScore, requireVerified]);

  const getSkillName = (id: string) => {
    return skills.find(s => s.id === id)?.name || id;
  };

  if (!subscriptionChecked) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!isSubscribed) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8 mt-12">
        <div className="bg-white rounded-xl shadow-md overflow-hidden text-center p-12 border border-gray-200">
          <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-blue-100 mb-6">
            <Lock className="h-10 w-10 text-blue-600" />
          </div>
          <h2 className="text-3xl font-extrabold text-gray-900 mb-4">
            Verified Talent Access
          </h2>
          <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
            Subscribe to access SkillBridge's verified student talent pool. 
            Discover top performers, review their practical work, and hire with confidence.
          </p>
          <div className="bg-gray-50 rounded-lg p-6 max-w-lg mx-auto border border-gray-100">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Subscription Features</h3>
            <ul className="text-left space-y-3">
              <li className="flex items-start">
                <CheckCircle className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
                <span className="text-gray-700">Unrestricted access to the Verified Talent Pool</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
                <span className="text-gray-700">Detailed performance scores (Theory & Practical)</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
                <span className="text-gray-700">Directly review candidates' real-world project code</span>
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

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Discover Talent</h1>
        <p className="mt-2 text-gray-600">Find and filter students securely using their verified skill profiles.</p>
      </div>

      {/* Filters Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6 space-y-4">
        {/* Top Row: Search & Skill */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, college, or branch..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div className="w-full md:w-72">
            <select
              className="w-full border border-gray-300 rounded-md py-2 px-3 focus:ring-blue-500 focus:border-blue-500"
              value={selectedSkill}
              onChange={(e) => setSelectedSkill(e.target.value)}
            >
              <option value="">All Verified Skills</option>
              {skills.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Bottom Row: Score Sliders */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 pt-4 border-t border-gray-100">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-700 flex justify-between">
              <span>Min Overall Score</span>
              <span className="text-blue-600">{minOverallScore}%</span>
            </label>
            <input 
              type="range" min="0" max="100" step="5"
              value={minOverallScore} onChange={(e) => setMinOverallScore(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
          </div>
          
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-700 flex justify-between">
              <span>Min Theory Score</span>
              <span className="text-blue-600">{minTheoryScore}%</span>
            </label>
            <input 
              type="range" min="0" max="100" step="5"
              value={minTheoryScore} onChange={(e) => setMinTheoryScore(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-700 flex justify-between">
              <span>Min Practical Score</span>
              <span className="text-blue-600">{minPracticalScore}%</span>
            </label>
            <input 
              type="range" min="0" max="100" step="5"
              value={minPracticalScore} onChange={(e) => setMinPracticalScore(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          <div className="flex items-center">
            <label className="flex items-center space-x-3 cursor-pointer">
              <input 
                type="checkbox"
                checked={requireVerified}
                onChange={(e) => setRequireVerified(e.target.checked)}
                className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">Only Verified</span>
            </label>
          </div>
        </div>
      </div>

      {/* Results Section */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredStudents.length > 0 ? (
            filteredStudents.map(student => (
              <div key={student.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:border-blue-300 transition-colors flex flex-col">
                <div className="p-6 flex-1">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-bold text-xl flex-shrink-0">
                        {student.fullName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 line-clamp-1 text-lg">{student.fullName}</h3>
                        <p className="text-sm text-gray-500 line-clamp-1 flex items-center">
                          <GraduationCap className="w-3 h-3 mr-1" />
                          {student.branch} @ {student.college}
                        </p>
                      </div>
                    </div>
                  </div>

                  <p className="mt-4 text-sm text-gray-600 line-clamp-2 min-h-[2.5rem]">
                    {student.bio}
                  </p>

                  <div className="mt-5 grid grid-cols-3 gap-2 text-center divide-x divide-gray-100 bg-gray-50 rounded-lg py-2 border border-gray-100">
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Overall</div>
                      <div className="font-bold text-gray-900 text-lg flex items-center justify-center">
                        {student.displayOverallScore ? `${student.displayOverallScore}%` : '-'}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-1 flex items-center justify-center gap-1">
                        <Award className="w-3 h-3 text-purple-500" /> Theory
                      </div>
                      <div className="font-semibold text-gray-700">
                        {student.displayTheoryScore ? `${student.displayTheoryScore}%` : '-'}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-1 flex items-center justify-center gap-1">
                        <Code className="w-3 h-3 text-blue-500" /> Practical
                      </div>
                      <div className="font-semibold text-gray-700">
                        {student.displayPracticalScore ? `${student.displayPracticalScore}%` : '-'}
                      </div>
                    </div>
                  </div>

                  {student.displaySkillIds.length > 0 && (
                    <div className="mt-4">
                      <div className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">Filtered Skills</div>
                      <div className="flex flex-wrap gap-1.5">
                        {student.displaySkillIds.slice(0, 4).map(skillId => (
                          <span key={skillId} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            {getSkillName(skillId)}
                          </span>
                        ))}
                        {student.displaySkillIds.length > 4 && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                            +{student.displaySkillIds.length - 4} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="border-t border-gray-100 p-4 bg-gray-50">
                  <Link 
                    href={`/dashboard/company/student/${student.id}`}
                    className="w-full flex items-center justify-center text-blue-600 font-medium hover:text-blue-700 text-sm"
                  >
                    View Full Profile <ChevronRight className="w-4 h-4 ml-1" />
                  </Link>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full flex flex-col items-center justify-center py-16 bg-white rounded-xl border border-dashed border-gray-300">
              <Filter className="w-12 h-12 text-gray-300 mb-4" />
              <h3 className="text-lg font-bold text-gray-900">No students found</h3>
              <p className="text-gray-500 mt-1">Try adjusting your filters or search query.</p>
              <button 
                onClick={() => { setSearchQuery(""); setSelectedSkill(""); setMinOverallScore(0); setMinTheoryScore(0); setMinPracticalScore(0); setRequireVerified(false); }}
                className="mt-4 px-4 py-2 text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 font-medium text-sm transition-colors"
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
