"use client";

import { useState, useEffect, Suspense } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { useRouter, useSearchParams } from "next/navigation";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Loader2 } from "lucide-react";

function OnboardingForm() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [role, setRole] = useState<"student" | "company" | null>(
    (searchParams.get("role") as "student" | "company") || null
  );
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Student Fields
  const [fullName, setFullName] = useState("");
  const [college, setCollege] = useState("");
  const [degree, setDegree] = useState("");
  const [branch, setBranch] = useState("");
  const [graduationYear, setGraduationYear] = useState("");

  // Company Fields
  const [companyName, setCompanyName] = useState("");
  const [industry, setIndustry] = useState("");
  const [website, setWebsite] = useState("");
  const [contactPerson, setContactPerson] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !role) return;

    setLoading(true);
    setError("");

    try {
      // 1. Create the user role document
      await setDoc(doc(db, "users", user.uid), {
        role,
        createdAt: serverTimestamp(),
        email: user.email,
      });

      // 2. Create the specific profile document
      if (role === "student") {
        await setDoc(doc(db, "studentProfiles", user.uid), {
          fullName,
          college,
          degree,
          branch,
          graduationYear,
          location: "",
          shortBio: "",
          skills: [],
          careerInterests: [],
          githubUrl: "",
          linkedinUrl: "",
          updatedAt: serverTimestamp(),
        });
        // Force reload to re-evaluate AuthContext role
        window.location.href = "/dashboard/student";
      } else {
        await setDoc(doc(db, "companyProfiles", user.uid), {
          companyName,
          industry,
          website,
          contactPerson,
          companyDescription: "",
          location: "",
          verificationStatus: "pending",
          subscriptionStatus: "inactive",
          subscriptionTier: "free",
          updatedAt: serverTimestamp(),
        });
        window.location.href = "/dashboard/company";
      }
    } catch (err: any) {
      console.error(err);
      setError("Failed to save profile. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!role) {
    return (
      <div className="flex flex-col items-center justify-center space-y-6">
        <h2 className="text-2xl font-bold">Select your role to continue</h2>
        <div className="flex gap-4">
          <button
            onClick={() => setRole("student")}
            className="px-6 py-4 bg-white border-2 border-blue-100 hover:border-blue-500 rounded-xl shadow-sm text-center flex flex-col items-center space-y-2 transition-all"
          >
            <span className="text-xl font-bold text-gray-800">Student</span>
            <span className="text-sm text-gray-500">I want to practice and get hired</span>
          </button>
          <button
            onClick={() => setRole("company")}
            className="px-6 py-4 bg-white border-2 border-gray-100 hover:border-gray-500 rounded-xl shadow-sm text-center flex flex-col items-center space-y-2 transition-all"
          >
            <span className="text-xl font-bold text-gray-800">Company</span>
            <span className="text-sm text-gray-500">I want to discover talent</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl w-full mx-auto bg-white p-8 rounded-xl shadow-sm border border-gray-200">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">
          Complete your {role === "student" ? "Student" : "Company"} Profile
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Let's get some basic information to set up your account.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-md text-sm text-center">
            {error}
          </div>
        )}

        {role === "student" ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Full Name</label>
              <input
                required
                type="text"
                name="fullName"
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">College / University</label>
              <input
                required
                type="text"
                name="college"
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                value={college}
                onChange={(e) => setCollege(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Degree</label>
                <input
                  required
                  type="text"
                  name="degree"
                  placeholder="e.g. B.Tech"
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  value={degree}
                  onChange={(e) => setDegree(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Branch</label>
                <input
                  required
                  type="text"
                  name="branch"
                  placeholder="e.g. Computer Science"
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Expected Graduation Year</label>
              <input
                required
                type="text"
                name="graduationYear"
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                value={graduationYear}
                onChange={(e) => setGraduationYear(e.target.value)}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Company Name</label>
              <input
                required
                type="text"
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Industry</label>
              <input
                required
                type="text"
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Website</label>
              <input
                required
                type="url"
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Contact Person (Your Name)</label>
              <input
                required
                type="text"
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
              />
            </div>
          </div>
        )}

        <div className="flex gap-4 pt-4">
          <button
            type="button"
            onClick={() => setRole(null)}
            className="w-1/3 flex justify-center py-3 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Back
          </button>
          <button
            type="submit"
            disabled={loading}
            className="w-2/3 flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
          >
            {loading ? (
              <span className="flex items-center">
                <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" />
                Saving...
              </span>
            ) : (
              "Complete Setup"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <ProtectedRoute requireRole={false}>
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Suspense fallback={
          <div className="flex justify-center items-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          </div>
        }>
          <OnboardingForm />
        </Suspense>
      </div>
    </ProtectedRoute>
  );
}
