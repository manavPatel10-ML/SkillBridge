"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc, serverTimestamp, collection, query, where, getDocs } from "firebase/firestore";
import ProfileShareControls from "@/components/profile/ProfileShareControls";
import { Loader2, User, Award, ExternalLink, Save, CheckCircle2, ShieldCheck, Mail, MapPin, GraduationCap, Code, Globe, AlertCircle, Share2 } from "lucide-react";
import Link from "next/link";
import { StudentSkillScore } from "@/types";

export default function StudentProfilePage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const [formData, setFormData] = useState({
    fullName: "",
    college: "",
    degree: "",
    branch: "",
    graduationYear: "",
    location: "",
    shortBio: "",
    githubUrl: "",
    linkedinUrl: ""
  });

  const [verifiedScores, setVerifiedScores] = useState<StudentSkillScore[]>([]);
  const [skillsMap, setSkillsMap] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!user) return;

    const fetchProfile = async () => {
      try {
        setLoading(true);
        // 1. Fetch Profile
        const docRef = doc(db, "studentProfiles", user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setFormData({
            fullName: data.fullName || "",
            college: data.college || "",
            degree: data.degree || "",
            branch: data.branch || "",
            graduationYear: data.graduationYear || "",
            location: data.location || "",
            shortBio: data.shortBio || "",
            githubUrl: data.githubUrl || "",
            linkedinUrl: data.linkedinUrl || ""
          });
        }

        // 2. Fetch Skills catalog
        const skillsSnap = await getDocs(collection(db, "skills"));
        const sMap: Record<string, string> = {};
        skillsSnap.forEach(d => {
          sMap[d.id] = d.data().name;
        });
        setSkillsMap(sMap);

        // 3. Fetch Verified Skill Scores
        const scoresSnap = await getDocs(
          query(
            collection(db, "skillScores"),
            where("studentId", "==", user.uid)
          )
        );
        const scores = scoresSnap.docs.map(d => d.data() as StudentSkillScore);
        setVerifiedScores(scores);

      } catch (err: any) {
        console.error("Error loading profile:", err);
        setErrorMsg("Failed to load profile details.");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setSuccessMsg("");
    setErrorMsg("");

    try {
      const docRef = doc(db, "studentProfiles", user.uid);
      await updateDoc(docRef, {
        fullName: formData.fullName,
        college: formData.college,
        degree: formData.degree,
        branch: formData.branch,
        graduationYear: formData.graduationYear,
        location: formData.location,
        shortBio: formData.shortBio,
        githubUrl: formData.githubUrl,
        linkedinUrl: formData.linkedinUrl,
        updatedAt: serverTimestamp()
      });
      setSuccessMsg("Profile updated successfully!");
    } catch (err: any) {
      console.error("Error saving profile:", err);
      setErrorMsg("Failed to save profile. Please check your inputs.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Student Profile</h1>
          <p className="mt-1 text-gray-600">Manage your public verified profile presented to hiring companies.</p>
        </div>
        <Link
          href="/dashboard/student/readiness"
          className="inline-flex items-center px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
        >
          <Award className="w-4 h-4 mr-2" />
          View Job Readiness
        </Link>
      </div>

      {successMsg && (
        <div className="p-4 bg-green-50 border border-green-200 text-green-800 rounded-xl flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
          <p className="text-sm font-medium">{successMsg}</p>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          <p className="text-sm font-medium">{errorMsg}</p>
        </div>
      )}

      {/* Shareable Verified Public Profile Card */}
      {user && (
        <div className="bg-gradient-to-br from-indigo-50/90 via-white to-emerald-50/40 rounded-2xl border border-indigo-100 p-6 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="p-1 rounded-md bg-indigo-600 text-white">
                  <Share2 className="w-4 h-4" />
                </span>
                <h2 className="text-lg font-bold text-gray-900">
                  Shareable Verified Profile
                </h2>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" /> Public & Live
                </span>
              </div>
              <p className="text-xs text-gray-600 max-w-xl">
                Add this link to your resume, portfolio, and LinkedIn. Recruiters see your verified skills and practical build evidence without exposing your private email or personal account details.
              </p>
              <p className="text-xs font-mono text-indigo-700 pt-1">
                /profile/{user.uid}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <Link
                href={`/profile/${user.uid}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors"
              >
                <span>View Public Profile</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
              <ProfileShareControls
                studentName={formData.fullName || "Student"}
                studentId={user.uid}
              />
            </div>
          </div>
        </div>
      )}

      {/* Verified Evidence Summary */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4">
          <ShieldCheck className="w-5 h-5 text-green-600" />
          Verified Skills & Project Evidence
        </h2>
        {verifiedScores.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {verifiedScores.map((score) => {
              const skillName = skillsMap[score.skillId] || score.skillId;
              return (
                <div key={score.skillId} className="p-4 rounded-xl border border-gray-100 bg-gray-50 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start">
                      <span className="font-semibold text-gray-900">{skillName}</span>
                      {score.isVerified && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                          Verified
                        </span>
                      )}
                    </div>
                    <div className="mt-3 flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-gray-900">{score.overallScore ?? score.theoryScore ?? 0}%</span>
                      <span className="text-xs text-gray-500">Overall Score</span>
                    </div>
                  </div>
                  {score.projectEvidence?.githubUrl && (
                    <a
                      href={score.projectEvidence.githubUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-4 inline-flex items-center text-xs text-blue-600 hover:underline"
                    >
                      <Code className="w-3.5 h-3.5 mr-1" />
                      View Project Code
                      <ExternalLink className="w-3 h-3 ml-1" />
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-6 text-gray-500 text-sm">
            <p>No verified skills yet. Complete theory assessments or practical tasks to earn verified credentials!</p>
            <Link href="/dashboard/student/skills" className="mt-2 inline-block text-blue-600 font-medium hover:underline">
              Explore Available Skills →
            </Link>
          </div>
        )}
      </div>

      {/* Editable Profile Form */}
      <form onSubmit={handleSave} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <User className="w-5 h-5 text-blue-600" />
          Academic & Personal Details
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <input
              type="text"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
            <input
              type="email"
              value={user?.email || ""}
              disabled
              className="w-full px-3 py-2 border border-gray-200 bg-gray-50 text-gray-500 rounded-lg cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">College / University</label>
            <input
              type="text"
              name="college"
              value={formData.college}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Branch / Major</label>
            <input
              type="text"
              name="branch"
              value={formData.branch}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Degree</label>
            <input
              type="text"
              name="degree"
              value={formData.degree}
              onChange={handleChange}
              placeholder="e.g. B.Tech / B.E. / B.Sc"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Graduation Year</label>
            <input
              type="text"
              name="graduationYear"
              value={formData.graduationYear}
              onChange={handleChange}
              placeholder="e.g. 2026"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleChange}
              placeholder="e.g. New York, NY"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">GitHub Profile URL</label>
            <input
              type="url"
              name="githubUrl"
              value={formData.githubUrl}
              onChange={handleChange}
              placeholder="https://github.com/your-username"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">LinkedIn Profile URL</label>
            <input
              type="url"
              name="linkedinUrl"
              value={formData.linkedinUrl}
              onChange={handleChange}
              placeholder="https://linkedin.com/in/your-profile"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
            <textarea
              name="shortBio"
              rows={3}
              value={formData.shortBio}
              onChange={handleChange}
              placeholder="Brief professional summary of your technical background and goals..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t border-gray-100">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-sm transition-colors disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
