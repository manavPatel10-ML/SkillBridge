"use client";

import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { CompanyChallenge } from "@/types";
import { isCandidateStrongMatch } from "@/lib/candidate-matching";
import Link from "next/link";
import { 
  Briefcase, 
  Search, 
  Loader2, 
  Filter,
  Users,
  Calendar,
  BookOpen,
  Code,
  MessageSquare,
  CheckCircle,
  AlertCircle
} from "lucide-react";

type ChallengeWithCompany = CompanyChallenge & { companyName: string };

type MatchTier = 'strong' | 'partial' | 'none';

type ChallengeWithMatch = ChallengeWithCompany & {
  matchTier: MatchTier;
  matchedNames: string[];
  missingNames: string[];
};

export default function StudentCompanyChallengesPage() {
  const { user } = useAuth();
  const [challenges, setChallenges] = useState<ChallengeWithCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState("all");
  
  const [verifiedSkills, setVerifiedSkills] = useState<Set<string>>(new Set());
  const [skillsMap, setSkillsMap] = useState<Record<string, string>>({});

  useEffect(() => {
    async function fetchData() {
      if (!user) return;
      try {
        // 1. Fetch skills dictionary
        const skillsSnap = await getDocs(collection(db, "skills"));
        const smap: Record<string, string> = {};
        skillsSnap.forEach(doc => {
          smap[doc.id] = doc.data().name;
        });
        setSkillsMap(smap);

        // 2. Fetch challenges
        const q = query(
          collection(db, "companyChallenges"),
          where("status", "==", "published")
        );
        const snapshot = await getDocs(q);
        
        const now = new Date();
        const activeChallenges: CompanyChallenge[] = [];

        snapshot.forEach((doc) => {
          const data = { id: doc.id, ...doc.data() } as CompanyChallenge;
          const deadline = new Date(data.applicationDeadline);
          if (deadline >= now) {
            activeChallenges.push(data);
          }
        });

        // 3. Fetch company names
        const companyIds = Array.from(new Set(activeChallenges.map(c => c.companyId)));
        const companyNames: Record<string, string> = {};
        
        for (const cid of companyIds) {
          try {
            const cSnap = await getDocs(query(collection(db, "users"), where("uid", "==", cid)));
            if (!cSnap.empty) {
              const profileRef = collection(db, "companyProfiles");
              const pSnap = await getDocs(query(profileRef, where("__name__", "==", cid)));
              if (!pSnap.empty) {
                 companyNames[cid] = pSnap.docs[0].data().companyName || "Unknown Company";
              } else {
                 companyNames[cid] = "Unknown Company";
              }
            } else {
              companyNames[cid] = "Unknown Company";
            }
          } catch (e) {
            console.error("Error fetching company", e);
            companyNames[cid] = "Unknown Company";
          }
        }

        const enriched = activeChallenges.map(c => ({
          ...c,
          companyName: companyNames[c.companyId]
        }));
        
        setChallenges(enriched);

        // 4. Fetch verified skills for this student
        const scoresSnap = await getDocs(
          query(collection(db, "skillScores"), where("studentId", "==", user.uid), where("isVerified", "==", true))
        );
        const verifiedIds = new Set<string>();
        scoresSnap.forEach(doc => {
          verifiedIds.add(doc.data().skillId);
        });
        setVerifiedSkills(verifiedIds);

      } catch (err) {
        console.error("Error fetching data:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [user]);

  // Derive matches and sort/filter
  const processedChallenges = useMemo(() => {
    let result: ChallengeWithMatch[] = challenges.map(c => {
      const required = c.requiredSkillIds || [];
      const matchedIds = required.filter(id => verifiedSkills.has(id));
      const missingIds = required.filter(id => !verifiedSkills.has(id));
      
      let matchTier: MatchTier = 'none';
      if (required.length > 0) {
        if (isCandidateStrongMatch(required, verifiedSkills)) matchTier = 'strong';
        else if (matchedIds.length > 0) matchTier = 'partial';
      }

      return {
        ...c,
        matchTier,
        matchedNames: matchedIds.map(id => skillsMap[id] || "Unknown Skill"),
        missingNames: missingIds.map(id => skillsMap[id] || "Unknown Skill"),
      };
    });

    // Filter
    result = result.filter(c => {
      const matchesSearch = c.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            c.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            c.jobRole.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesDifficulty = difficultyFilter === "all" || c.difficulty === difficultyFilter;
      return matchesSearch && matchesDifficulty;
    });

    // Sort: Strong Match first, then Partial, then None, then by deadline
    result.sort((a, b) => {
      const tierScore = { strong: 3, partial: 2, none: 1 };
      if (tierScore[a.matchTier] !== tierScore[b.matchTier]) {
        return tierScore[b.matchTier] - tierScore[a.matchTier];
      }
      return new Date(a.applicationDeadline).getTime() - new Date(b.applicationDeadline).getTime();
    });

    return result;
  }, [challenges, verifiedSkills, skillsMap, searchTerm, difficultyFilter]);

  return (
    <ProtectedRoute allowedRoles={["student"]}>
      <div className="max-w-7xl mx-auto space-y-6 pb-12">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Company Vacancies</h1>
            <p className="text-sm text-gray-500 mt-1">Discover vacancies matched to your verified skills.</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search vacancies, roles, or companies..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
          </div>
          <div className="relative w-full sm:w-48">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <select
              value={difficultyFilter}
              onChange={(e) => setDifficultyFilter(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm appearance-none bg-white"
            >
              <option value="all">All Difficulties</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : processedChallenges.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-lg border border-gray-200">
            <Briefcase className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900">No vacancies found</h3>
            <p className="text-gray-500 mt-2 text-sm">
              Try adjusting your search filters or check back later for new opportunities.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {processedChallenges.map(challenge => (
              <Link key={challenge.id} href={`/dashboard/student/company-challenges/${challenge.id}`}>
                <div className={`bg-white rounded-lg shadow-sm border ${
                  challenge.matchTier === 'strong' ? 'border-green-300 hover:border-green-500 ring-1 ring-green-100' :
                  challenge.matchTier === 'partial' ? 'border-blue-200 hover:border-blue-400' :
                  'border-gray-200 hover:border-blue-500'
                } transition-all p-6 h-full flex flex-col cursor-pointer relative overflow-hidden`}>
                  
                  {challenge.matchTier === 'strong' && (
                    <div className="absolute top-0 right-0 w-16 h-16 overflow-hidden pointer-events-none">
                      <div className="absolute transform rotate-45 bg-green-500 text-white text-[10px] font-bold py-1 right-[-35px] top-[15px] w-[120px] text-center shadow-sm">
                        TOP MATCH
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between items-start mb-4 pr-10">
                    <div>
                      <h2 className="text-lg font-bold text-gray-900">{challenge.title}</h2>
                      <p className="text-sm font-medium text-blue-600 mt-1">{challenge.companyName}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${
                        challenge.difficulty === 'easy' ? 'bg-green-100 text-green-800' :
                        challenge.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {challenge.difficulty}
                      </span>
                    </div>
                  </div>

                  {/* Matching Transparency Section */}
                  {challenge.matchTier === 'strong' && (
                    <div className="mb-4 bg-green-50 rounded-md p-2.5 border border-green-100">
                      <div className="flex items-start">
                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 mr-2 shrink-0" />
                        <div>
                          <p className="text-xs font-semibold text-green-800">Perfect Match</p>
                          <p className="text-xs text-green-700 mt-0.5">
                            Matches your verified {challenge.matchedNames.join(", ")}.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {challenge.matchTier === 'partial' && (
                    <div className="mb-4 bg-blue-50 rounded-md p-2.5 border border-blue-100">
                      <div className="flex items-start">
                        <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5 mr-2 shrink-0" />
                        <div>
                          <p className="text-xs font-semibold text-blue-800">Partial Match</p>
                          <p className="text-xs text-blue-700 mt-0.5">
                            Matches: {challenge.matchedNames.join(", ")}. <br/>
                            Missing: {challenge.missingNames.join(", ")}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <p className="text-sm text-gray-600 mb-6 line-clamp-2 flex-1">
                    {challenge.description}
                  </p>

                  <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm text-gray-500 mb-6">
                    <div className="flex items-center">
                      <Briefcase className="w-4 h-4 mr-2 text-gray-400" />
                      <span className="truncate">{challenge.jobRole}</span>
                    </div>
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                      <span>{new Date(challenge.applicationDeadline).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center">
                      <Users className="w-4 h-4 mr-2 text-gray-400" />
                      <span>{challenge.applicantCount} / {challenge.maxApplicants} Applicants</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-100">
                    {challenge.theoryRequired && (
                      <span className="inline-flex items-center px-2 py-1 rounded bg-slate-50 text-slate-700 text-xs font-medium border border-slate-200">
                        <BookOpen className="w-3 h-3 mr-1" /> Theory
                      </span>
                    )}
                    {challenge.practicalRequired && (
                      <span className="inline-flex items-center px-2 py-1 rounded bg-slate-50 text-slate-700 text-xs font-medium border border-slate-200">
                        <Code className="w-3 h-3 mr-1" /> Hiring Task
                      </span>
                    )}
                    {challenge.interviewRequired && (
                      <span className="inline-flex items-center px-2 py-1 rounded bg-slate-50 text-slate-700 text-xs font-medium border border-slate-200">
                        <MessageSquare className="w-3 h-3 mr-1" /> Interview
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
