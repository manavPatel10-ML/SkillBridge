"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useParams, useRouter } from "next/navigation";
import { CompanyChallenge } from "@/types";
import Link from "next/link";
import { 
  ArrowLeft, 
  Loader2, 
  Save,
  AlertTriangle,
  Edit2
} from "lucide-react";

export default function EditChallengePage() {
  const { user } = useAuth();
  const params = useParams();
  const router = useRouter();
  
  const [challenge, setChallenge] = useState<CompanyChallenge | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [applicationDeadline, setApplicationDeadline] = useState("");
  const [maxApplicants, setMaxApplicants] = useState<string>("100");

  useEffect(() => {
    let isMounted = true;
    
    async function fetchChallenge() {
      if (!user || !params.id || challenge) return;
      try {
        const docRef = doc(db, "companyChallenges", params.id as string);
        const docSnap = await getDoc(docRef);
        
        if (!isMounted) return;
        
        if (docSnap.exists()) {
          const data = { id: docSnap.id, ...docSnap.data() } as CompanyChallenge;
          if (data.companyId !== user.uid) {
            setError("You do not have permission to edit this vacancy.");
          } else if (data.status === 'closed' || data.status === 'archived') {
            setError("Closed or archived vacancies cannot be edited.");
          } else {
            setChallenge(data);
            setTitle(data.title);
            setDescription(data.description);
            // Convert ISO string to YYYY-MM-DD for date input
            const dateStr = new Date(data.applicationDeadline).toISOString().split('T')[0];
            setApplicationDeadline(dateStr);
            setMaxApplicants(data.maxApplicants.toString());
          }
        } else {
          setError("Vacancy not found.");
        }
      } catch (err) {
        console.error("Error fetching vacancy:", err);
        if (isMounted) setError("Failed to load vacancy details.");
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchChallenge();
    return () => { isMounted = false; };
  }, [user, params.id, challenge]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!challenge) return;

    if (!title.trim() || !description.trim() || !applicationDeadline) {
      setError("Please fill in all required fields.");
      return;
    }

    if (challenge.status === 'published') {
      if (!confirm("This vacancy is currently published. Are you sure you want to save these changes? It may affect current applicants.")) {
        return;
      }
    }

    setSaving(true);
    setError(null);

    try {
      const updateData: Partial<CompanyChallenge> = {
        title,
        description,
        applicationDeadline: new Date(applicationDeadline).toISOString(),
        maxApplicants: Number(maxApplicants) || 0,
        updatedAt: new Date().toISOString()
      };
      
      await updateDoc(doc(db, "companyChallenges", challenge.id!), updateData);
      router.push(`/dashboard/company/challenges/${challenge.id}`);
    } catch (err) {
      console.error("Error updating vacancy:", err);
      setError("Failed to update vacancy.");
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={["company"]}>
        <div className="flex justify-center items-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </ProtectedRoute>
    );
  }

  if (error || !challenge) {
    return (
      <ProtectedRoute allowedRoles={["company"]}>
        <div className="max-w-4xl mx-auto space-y-6">
          <Link href={`/dashboard/company/challenges/${params.id}`} className="inline-flex items-center text-blue-600 hover:underline">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Vacancy
          </Link>
          <div className="bg-red-50 text-red-700 p-4 rounded-md text-sm border border-red-200">
            {error || "Vacancy not found."}
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={["company"]}>
      <div className="max-w-3xl mx-auto space-y-6 pb-12">
        <Link href={`/dashboard/company/challenges/${challenge.id}`} className="inline-flex items-center text-blue-600 hover:underline mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Vacancy Details
        </Link>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-200">
            <Edit2 className="w-6 h-6 text-gray-400" />
            <div>
              <h1 className="text-xl font-bold text-gray-900">Edit Vacancy</h1>
              <p className="text-sm text-gray-500">Update basic information for this vacancy.</p>
            </div>
          </div>

          {challenge.status === 'published' && (
            <div className="mb-6 bg-yellow-50 text-yellow-800 p-4 rounded-md text-sm border border-yellow-200 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 shrink-0 text-yellow-600" />
              <div>
                <p className="font-semibold">This vacancy is currently published.</p>
                <p className="mt-1">Making changes to a live vacancy might confuse active applicants. Proceed with caution.</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">Vacancy Title</label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <textarea
                rows={5}
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">Application Deadline</label>
                <input
                  type="date"
                  value={applicationDeadline}
                  onChange={e => setApplicationDeadline(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Maximum Applicants</label>
                <input
                  type="number"
                  min="1"
                  value={maxApplicants}
                  onChange={e => setMaxApplicants(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                  required
                />
              </div>
            </div>

            <div className="pt-4 border-t border-gray-200 flex justify-end">
              <button
                type="button"
                onClick={() => router.push(`/dashboard/company/challenges/${challenge.id}`)}
                className="mr-3 px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    {challenge.status === 'draft' ? 'Save as Draft' : 'Save Changes'}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </ProtectedRoute>
  );
}
