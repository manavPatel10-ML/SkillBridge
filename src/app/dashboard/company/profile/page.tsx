"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { Loader2, Building2, Save, CheckCircle2, ShieldCheck, Globe, Mail, MapPin, AlertCircle, Sparkles, Lock } from "lucide-react";
import Link from "next/link";

export default function CompanyProfilePage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const [formData, setFormData] = useState({
    companyName: "",
    industry: "",
    website: "",
    contactPerson: "",
    companyDescription: "",
    location: "",
    subscriptionStatus: "inactive",
    verificationStatus: "pending"
  });

  useEffect(() => {
    if (!user) return;

    const fetchCompanyProfile = async () => {
      try {
        setLoading(true);
        const docRef = doc(db, "companyProfiles", user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setFormData({
            companyName: data.companyName || "",
            industry: data.industry || "",
            website: data.website || "",
            contactPerson: data.contactPerson || "",
            companyDescription: data.companyDescription || "",
            location: data.location || "",
            subscriptionStatus: data.subscriptionStatus || "inactive",
            verificationStatus: data.verificationStatus || "pending"
          });
        }
      } catch (err: any) {
        console.error("Error loading company profile:", err);
        setErrorMsg("Failed to load company profile.");
      } finally {
        setLoading(false);
      }
    };

    fetchCompanyProfile();
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
      const docRef = doc(db, "companyProfiles", user.uid);
      // Notice: subscriptionStatus is intentionally excluded to enforce server-side security rule!
      await updateDoc(docRef, {
        companyName: formData.companyName,
        industry: formData.industry,
        website: formData.website,
        contactPerson: formData.contactPerson,
        companyDescription: formData.companyDescription,
        location: formData.location,
        updatedAt: serverTimestamp()
      });
      setSuccessMsg("Company details updated successfully!");
    } catch (err: any) {
      console.error("Error saving company profile:", err);
      setErrorMsg("Failed to update profile. Please verify your fields.");
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

  const isSubscribed = formData.subscriptionStatus === "active";

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Company Profile</h1>
          <p className="mt-1 text-gray-600">Manage your company branding and view talent access subscription status.</p>
        </div>
        <Link
          href="/dashboard/company/search"
          className="inline-flex items-center px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
        >
          <Building2 className="w-4 h-4 mr-2" />
          Browse Candidates
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

      {/* Subscription & Access Status Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-xl ${isSubscribed ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
            {isSubscribed ? <Sparkles className="w-6 h-6" /> : <Lock className="w-6 h-6" />}
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Talent Pool Subscription</h2>
            <p className="text-sm text-gray-500">
              {isSubscribed 
                ? "Your company has active, verified talent pool access." 
                : "Active subscription required to search and inspect verified candidate evidence."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
            isSubscribed ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
          }`}>
            {isSubscribed ? "Active Subscription" : "Subscription Inactive"}
          </span>
        </div>
      </div>

      {/* Editable Company Profile Form */}
      <form onSubmit={handleSave} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <Building2 className="w-5 h-5 text-blue-600" />
          Organization Details
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
            <input
              type="text"
              name="companyName"
              value={formData.companyName}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Registered Account Email</label>
            <input
              type="email"
              value={user?.email || ""}
              disabled
              className="w-full px-3 py-2 border border-gray-200 bg-gray-50 text-gray-500 rounded-lg cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Industry</label>
            <input
              type="text"
              name="industry"
              value={formData.industry}
              onChange={handleChange}
              placeholder="e.g. Software, Fintech, EdTech"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contact Person</label>
            <input
              type="text"
              name="contactPerson"
              value={formData.contactPerson}
              onChange={handleChange}
              placeholder="e.g. Hiring Manager Name"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
            <input
              type="url"
              name="website"
              value={formData.website}
              onChange={handleChange}
              placeholder="https://company.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Headquarters / Location</label>
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleChange}
              placeholder="e.g. San Francisco, CA"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Company Description</label>
            <textarea
              name="companyDescription"
              rows={4}
              value={formData.companyDescription}
              onChange={handleChange}
              placeholder="Describe your company mission, tech stack, and what candidates will build..."
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
