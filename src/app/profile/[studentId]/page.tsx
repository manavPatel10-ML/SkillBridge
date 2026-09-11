import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { adminDb } from "@/lib/firebase-admin";
import ProfileShareControls from "@/components/profile/ProfileShareControls";
import {
  ShieldCheck,
  Award,
  CheckCircle2,
  GraduationCap,
  Briefcase,
  Code,
  Globe,
  ExternalLink,
  Layers,
  Sparkles,
  Terminal,
  Check,
  Building2,
  MapPin,
  Calendar,
  AlertCircle
} from "lucide-react";

interface PageProps {
  params: Promise<{ studentId: string }>;
}

interface PublicProfileData {
  studentId: string;
  fullName: string;
  college?: string;
  degree?: string;
  branch?: string;
  graduationYear?: string;
  location?: string;
  shortBio?: string;
  githubUrl?: string;
  linkedinUrl?: string;
  targetRoleTitle?: string;
  verifiedSkills: Array<{
    skillId: string;
    skillName: string;
    category?: string;
    theoryScore: number | null;
    practicalScore: number | null;
    overallScore: number | null;
    isVerified: boolean;
    projectEvidence?: {
      taskId: string;
      taskTitle: string;
      githubUrl?: string | null;
      liveUrl?: string | null;
      description?: string;
    };
  }>;
  practicalProjects: Array<{
    taskId: string;
    taskTitle: string;
    skillName: string;
    githubUrl?: string | null;
    liveUrl?: string | null;
    description?: string;
  }>;
}

async function getPublicProfile(studentId: string): Promise<PublicProfileData | null> {
  try {
    const profileSnap = await adminDb.collection("studentProfiles").doc(studentId).get();
    if (!profileSnap.exists) {
      return null;
    }
    const pData = profileSnap.data() || {};

    // Fetch role if targetRoleId exists
    let targetRoleTitle = "";
    if (pData.targetRoleId) {
      try {
        const roleSnap = await adminDb.collection("roles").doc(pData.targetRoleId).get();
        if (roleSnap.exists) {
          targetRoleTitle = roleSnap.data()?.title || "";
        }
      } catch (e) {
        console.warn("[getPublicProfile] Error fetching role:", e);
      }
    }

    // Fetch skills dictionary
    const skillsSnap = await adminDb.collection("skills").get();
    const skillDict: Record<string, { name: string; category?: string }> = {};
    skillsSnap.forEach((d) => {
      skillDict[d.id] = {
        name: d.data().name || d.id,
        category: d.data().category || "Technical Skill",
      };
    });

    // Fetch skillScores for this student
    const scoresSnap = await adminDb
      .collection("skillScores")
      .where("studentId", "==", studentId)
      .get();

    const taskIds = new Set<string>();
    const rawScores: any[] = [];
    scoresSnap.forEach((d) => {
      const data = d.data();
      if (data.skillId) {
        rawScores.push(data);
        if (data.projectEvidence?.taskId) {
          taskIds.add(data.projectEvidence.taskId);
        }
      }
    });

    // Fetch practical task descriptions
    const taskMeta: Record<string, { title: string; description: string }> = {};
    if (taskIds.size > 0) {
      const taskDocs = await Promise.all(
        Array.from(taskIds).map((tId) =>
          adminDb.collection("practicalTasks").doc(tId).get().catch(() => null)
        )
      );
      taskDocs.forEach((tSnap) => {
        if (tSnap && tSnap.exists) {
          const td = tSnap.data();
          taskMeta[tSnap.id] = {
            title: td?.title || "Practical Build Challenge",
            description: td?.description || "Real-world practical implementation evaluated by SkillBridge.",
          };
        }
      });
    }

    // Map verified skills
    const verifiedSkills = rawScores
      .map((s) => {
        const sInfo = skillDict[s.skillId] || { name: s.skillId, category: "Core Skill" };
        const pEvidence = s.projectEvidence
          ? {
              taskId: s.projectEvidence.taskId,
              taskTitle:
                taskMeta[s.projectEvidence.taskId]?.title ||
                s.projectEvidence.taskTitle ||
                "Practical Project",
              githubUrl: s.projectEvidence.githubUrl || null,
              liveUrl: s.projectEvidence.liveUrl || null,
              description: taskMeta[s.projectEvidence.taskId]?.description || "",
            }
          : undefined;

        return {
          skillId: s.skillId,
          skillName: sInfo.name,
          category: sInfo.category,
          theoryScore: s.theoryScore ?? null,
          practicalScore: s.practicalScore ?? null,
          overallScore: s.overallScore ?? null,
          isVerified: !!s.isVerified,
          projectEvidence: pEvidence,
        };
      })
      .sort((a, b) => {
        if (a.isVerified !== b.isVerified) return a.isVerified ? -1 : 1;
        return (b.overallScore || 0) - (a.overallScore || 0);
      });

    // Deduplicated practical projects
    const seenTasks = new Set<string>();
    const practicalProjects: Array<{
      taskId: string;
      taskTitle: string;
      skillName: string;
      githubUrl?: string | null;
      liveUrl?: string | null;
      description?: string;
    }> = [];

    for (const s of verifiedSkills) {
      if (s.projectEvidence && !seenTasks.has(s.projectEvidence.taskId)) {
        seenTasks.add(s.projectEvidence.taskId);
        practicalProjects.push({
          taskId: s.projectEvidence.taskId,
          taskTitle: s.projectEvidence.taskTitle,
          skillName: s.skillName,
          githubUrl: s.projectEvidence.githubUrl,
          liveUrl: s.projectEvidence.liveUrl,
          description: s.projectEvidence.description,
        });
      }
    }

    return {
      studentId,
      fullName: pData.fullName || "Verified Student Candidate",
      college: pData.college || undefined,
      degree: pData.degree || undefined,
      branch: pData.branch || undefined,
      graduationYear: pData.graduationYear || undefined,
      location: pData.location || undefined,
      shortBio: pData.shortBio || undefined,
      githubUrl: pData.githubUrl || undefined,
      linkedinUrl: pData.linkedinUrl || undefined,
      targetRoleTitle: targetRoleTitle || undefined,
      verifiedSkills,
      practicalProjects,
    };
  } catch (err) {
    console.error("[getPublicProfile] Error fetching public profile:", err);
    return null;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { studentId } = await params;
  const profile = await getPublicProfile(studentId);

  if (!profile) {
    return {
      title: "Profile Not Found | SkillBridge",
      description: "The requested SkillBridge talent profile does not exist.",
    };
  }

  const roleText = profile.targetRoleTitle ? ` • ${profile.targetRoleTitle}` : "";
  const title = `${profile.fullName}${roleText} | SkillBridge Verified Profile`;
  const description = profile.shortBio
    ? `${profile.fullName}'s verified skill profile on SkillBridge: ${profile.shortBio.slice(0, 140)}...`
    : `Explore ${profile.fullName}'s verified skills, evidence-based project submissions, and evaluation scores on SkillBridge.`;

  const canonicalUrl = `https://skillbridge-one-delta.vercel.app/profile/${studentId}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: "SkillBridge Talent Platform",
      type: "profile",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function PublicProfilePage({ params }: PageProps) {
  const { studentId } = await params;
  const profile = await getPublicProfile(studentId);

  if (!profile) {
    notFound();
  }

  const verifiedSkillsCount = profile.verifiedSkills.filter((s) => s.isVerified).length;
  const practicalProjectsCount = profile.practicalProjects.length;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans">
      {/* Top Header / SkillBridge Trust Banner */}
      <header className="sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-base shadow-sm group-hover:bg-indigo-700 transition-colors">
              S
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-slate-900 dark:text-white text-base tracking-tight leading-none">
                SkillBridge
              </span>
              <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1 mt-0.5">
                <ShieldCheck className="w-3 h-3 inline" /> Verified Talent
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/auth/register?role=company"
              className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 px-3 py-1.5 rounded-lg border border-indigo-200 dark:border-indigo-800/60 bg-indigo-50/50 dark:bg-indigo-950/30 transition-colors"
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Hire on SkillBridge</span>
            </Link>

            <ProfileShareControls
              studentName={profile.fullName}
              studentId={profile.studentId}
            />
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Candidate Hero Card */}
        <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-sm relative overflow-hidden">
          {/* Subtle Background Accent */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-indigo-500/10 via-emerald-500/5 to-transparent rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

          <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
              {/* Profile Avatar / Initials */}
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white flex items-center justify-center text-2xl sm:text-3xl font-bold shadow-md shadow-indigo-600/10 shrink-0">
                {profile.fullName
                  .split(" ")
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join("")
                  .toUpperCase()}
              </div>

              {/* Identity & Career Meta */}
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                    {profile.fullName}
                  </h1>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/80">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    Verified Profile
                  </span>
                </div>

                {profile.targetRoleTitle && (
                  <p className="text-base font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                    <Briefcase className="w-4 h-4" />
                    <span>{profile.targetRoleTitle}</span>
                  </p>
                )}

                {/* Education and Location */}
                <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-500 dark:text-slate-400 pt-0.5">
                  {(profile.college || profile.branch || profile.degree) && (
                    <span className="flex items-center gap-1">
                      <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
                      {[profile.degree, profile.branch, profile.college]
                        .filter(Boolean)
                        .join(" • ")}
                    </span>
                  )}

                  {profile.graduationYear && (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      Class of {profile.graduationYear}
                    </span>
                  )}

                  {profile.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      {profile.location}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* External Links */}
            <div className="flex items-center gap-2.5 self-stretch sm:self-auto justify-end pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-800">
              {profile.githubUrl && (
                <a
                  href={profile.githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-750 transition-colors"
                >
                  <Code className="w-3.5 h-3.5" />
                  <span>GitHub</span>
                  <ExternalLink className="w-3 h-3 opacity-60" />
                </a>
              )}

              {profile.linkedinUrl && (
                <a
                  href={profile.linkedinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-750 transition-colors"
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>LinkedIn</span>
                  <ExternalLink className="w-3 h-3 opacity-60" />
                </a>
              )}
            </div>
          </div>

          {/* Bio / Summary */}
          {profile.shortBio && (
            <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
              <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300 max-w-3xl">
                {profile.shortBio}
              </p>
            </div>
          )}

          {/* Quick Metrics Bar */}
          <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3.5 border border-slate-100 dark:border-slate-800/80">
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                Verified Skills
              </span>
              <span className="text-2xl font-bold text-slate-900 dark:text-white mt-1 block">
                {verifiedSkillsCount}
              </span>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3.5 border border-slate-100 dark:border-slate-800/80">
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                Practical Projects
              </span>
              <span className="text-2xl font-bold text-slate-900 dark:text-white mt-1 block">
                {practicalProjectsCount}
              </span>
            </div>

            <div className="col-span-2 sm:col-span-1 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-xl p-3.5 border border-emerald-100 dark:border-emerald-900/40">
              <span className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400 uppercase tracking-wider block">
                Evaluation Standard
              </span>
              <span className="text-sm font-semibold text-emerald-900 dark:text-emerald-200 mt-1 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Evidence-Backed</span>
              </span>
            </div>
          </div>
        </section>

        {/* Section: Verified Skills */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Verified Skills & Capability Scores
              </h2>
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Deterministic server-evaluated benchmarks
            </span>
          </div>

          {profile.verifiedSkills.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-8 text-center">
              <Award className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                This student has not yet verified skills on SkillBridge.
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                Verified badges are earned by completing server-timed assessments and practical build challenges.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {profile.verifiedSkills.map((skill) => (
                <div
                  key={skill.skillId}
                  className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white">
                        {skill.skillName}
                      </h3>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {skill.category || "Software Engineering"}
                      </span>
                    </div>

                    {skill.isVerified ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/80">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        Verified
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                        In Progress
                      </span>
                    )}
                  </div>

                  {/* Score Breakdown Bars */}
                  <div className="space-y-2.5">
                    {skill.overallScore !== null && (
                      <div>
                        <div className="flex justify-between text-xs font-semibold mb-1">
                          <span className="text-slate-700 dark:text-slate-300">
                            Overall Skill Score
                          </span>
                          <span className="text-indigo-600 dark:text-indigo-400">
                            {Math.round(skill.overallScore)}%
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(100, Math.max(0, skill.overallScore))}%` }}
                          />
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3 pt-1 text-xs">
                      <div className="bg-slate-50 dark:bg-slate-800/60 rounded-lg p-2.5 border border-slate-100 dark:border-slate-800">
                        <span className="text-slate-500 dark:text-slate-400 block text-[11px]">
                          Theory Mastery
                        </span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200 text-sm mt-0.5 block">
                          {skill.theoryScore !== null ? `${Math.round(skill.theoryScore)}%` : "Not assessed"}
                        </span>
                      </div>

                      <div className="bg-slate-50 dark:bg-slate-800/60 rounded-lg p-2.5 border border-slate-100 dark:border-slate-800">
                        <span className="text-slate-500 dark:text-slate-400 block text-[11px]">
                          Practical Build
                        </span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200 text-sm mt-0.5 block">
                          {skill.practicalScore !== null ? `${Math.round(skill.practicalScore)}%` : "Pending task"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Project Evidence Tag if available */}
                  {skill.projectEvidence && (
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
                      <span className="text-slate-500 dark:text-slate-400 truncate max-w-[200px]">
                        Task: {skill.projectEvidence.taskTitle}
                      </span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Project Evaluated
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Section: Practical Projects & Build Evidence */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Practical Project Evidence
              </h2>
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Functional submissions and repository proof
            </span>
          </div>

          {profile.practicalProjects.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-8 text-center">
              <Code className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                No evaluated practical build projects yet.
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                Completed hands-on practical tasks will appear here with functional links to GitHub repositories and live deployments.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {profile.practicalProjects.map((proj) => (
                <div
                  key={proj.taskId}
                  className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-3.5 flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="text-base font-bold text-slate-900 dark:text-white">
                        {proj.taskTitle}
                      </h3>
                      <span className="px-2 py-0.5 text-[11px] font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 rounded border border-indigo-200 dark:border-indigo-800/80 shrink-0">
                        {proj.skillName}
                      </span>
                    </div>

                    {proj.description && (
                      <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-3 leading-relaxed">
                        {proj.description}
                      </p>
                    )}
                  </div>

                  {/* Links and Verification Stamp */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2">
                      {proj.githubUrl && (
                        <a
                          href={proj.githubUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 rounded-lg transition-colors"
                        >
                          <Code className="w-3.5 h-3.5" />
                          <span>View Code</span>
                          <ExternalLink className="w-3 h-3 opacity-60" />
                        </a>
                      )}

                      {proj.liveUrl && (
                        <a
                          href={proj.liveUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 rounded-lg transition-colors"
                        >
                          <Globe className="w-3.5 h-3.5" />
                          <span>Live Demo</span>
                          <ExternalLink className="w-3 h-3 opacity-60" />
                        </a>
                      )}
                    </div>

                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>SkillBridge Verified</span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Section: Verification Standard & Trust */}
        <section className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white rounded-2xl p-6 sm:p-8 shadow-sm relative overflow-hidden">
          <div className="relative space-y-4">
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4" />
              <span>SkillBridge Verification Standard</span>
            </div>

            <h3 className="text-xl font-bold tracking-tight">
              Evidence-Based, Tamper-Resistant Capability Proof
            </h3>

            <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
              SkillBridge profiles cannot be self-certified by resume claims. All verified skills and scores reflect:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-1">
                <span className="text-emerald-400 font-bold text-sm block">1. Timed Theory</span>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Anti-cheat monitored assessments evaluating conceptual understanding.
                </p>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-1">
                <span className="text-emerald-400 font-bold text-sm block">2. Practical Builds</span>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Real code implementations evaluated against strict criteria and unit tests.
                </p>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-1">
                <span className="text-emerald-400 font-bold text-sm block">3. Immutable Scores</span>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Client-side writes cannot manufacture verified scores or project evidence.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Public Footer */}
      <footer className="mt-auto border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-6">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800 dark:text-slate-200">SkillBridge</span>
            <span>• Verified Talent Platform</span>
          </div>
          <div>
            <span>Verified Candidate ID: <code className="text-slate-700 dark:text-slate-300 font-mono">{profile.studentId.slice(0, 8)}...</code></span>
          </div>
          <div>
            <Link href="/" className="hover:underline text-indigo-600 dark:text-indigo-400 font-medium">
              skillbridge.com
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
