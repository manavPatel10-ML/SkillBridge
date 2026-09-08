"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, deleteDoc, updateDoc } from "firebase/firestore";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { CompanyChallenge } from "@/types";
import Link from "next/link";
import { 
  Plus, 
  Loader2, 
  Briefcase, 
  Calendar, 
  Users, 
  MoreVertical,
  Edit2,
  Trash2,
  Eye,
  CheckCircle,
  Archive,
  XCircle
} from "lucide-react";

export default function CompanyChallengesPage() {
  const { user } = useAuth();
  const [challenges, setChallenges] = useState<CompanyChallenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchChallenges() {
      if (!user) return;
      try {
        const q = query(
          collection(db, "companyChallenges"),
          where("companyId", "==", user.uid)
        );
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as CompanyChallenge[];
        
        // Sort by createdAt descending
        data.sort((a, b) => {
          const timeA = (a.createdAt as any)?.toMillis ? (a.createdAt as any).toMillis() : new Date(a.createdAt).getTime();
          const timeB = (b.createdAt as any)?.toMillis ? (b.createdAt as any).toMillis() : new Date(b.createdAt).getTime();
          return timeB - timeA;
        });
        setChallenges(data);
      } catch (err: any) {
        console.error("Error fetching challenges:", err);
        setError("Failed to load challenges.");
      } finally {
        setLoading(false);
      }
    }

    fetchChallenges();
  }, [user]);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this challenge? This action cannot be undone.")) return;
    
    setDeletingId(id);
    try {
      await deleteDoc(doc(db, "companyChallenges", id));
      setChallenges(prev => prev.filter(c => c.id !== id));
    } catch (err) {
      console.error("Error deleting challenge:", err);
      alert("Failed to delete challenge.");
    } finally {
      setDeletingId(null);
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: CompanyChallenge['status']) => {
    try {
      const updateData: Partial<CompanyChallenge> = {
        status: newStatus,
        updatedAt: new Date().toISOString()
      };
      
      if (newStatus === 'published') {
        updateData.publishedAt = new Date().toISOString();
      }
      
      await updateDoc(doc(db, "companyChallenges", id), updateData);
      setChallenges(prev => prev.map(c => c.id === id ? { ...c, ...updateData } : c));
    } catch (err) {
      console.error("Error updating status:", err);
      alert("Failed to update challenge status.");
    }
  };

  const getStatusBadge = (status: CompanyChallenge['status']) => {
    switch (status) {
      case 'published':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" /> Published</span>;
      case 'draft':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800"><Edit2 className="w-3 h-3 mr-1" /> Draft</span>;
      case 'closed':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800"><XCircle className="w-3 h-3 mr-1" /> Closed</span>;
      case 'archived':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800"><Archive className="w-3 h-3 mr-1" /> Archived</span>;
      default:
        return null;
    }
  };

  return (
    <ProtectedRoute allowedRoles={["company"]}>
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Vacancies & Opportunities</h1>
            <p className="text-sm text-gray-500 mt-1">Create and manage your hiring vacancies to discover top talent.</p>
          </div>
          <Link
            href="/dashboard/company/challenges/create"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Plus className="w-4 h-4 mr-2" />
            Post Vacancy
          </Link>
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 p-4 rounded-md text-sm border border-red-200">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : challenges.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <Briefcase className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No vacancies yet</h3>
            <p className="text-gray-500 mb-6">Create your first vacancy to start assessing candidates.</p>
            <Link
              href="/dashboard/company/challenges/create"
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Post Vacancy
            </Link>
          </div>
        ) : (
          <div className="bg-white shadow overflow-hidden sm:rounded-md border border-gray-200">
            <ul className="divide-y divide-gray-200">
              {challenges.map((challenge) => (
                <li key={challenge.id}>
                  <div className="px-4 py-4 sm:px-6 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 truncate">
                        <Link href={`/dashboard/company/challenges/${challenge.id}`} className="text-sm font-medium text-blue-600 truncate hover:underline">
                          {challenge.title}
                        </Link>
                        {getStatusBadge(challenge.status)}
                      </div>
                      <div className="flex items-center gap-2">
                        {challenge.status === 'draft' && (
                          <button
                            onClick={() => handleUpdateStatus(challenge.id!, 'published')}
                            className="text-xs font-medium text-green-600 hover:text-green-900 bg-green-50 hover:bg-green-100 px-2.5 py-1.5 rounded transition-colors"
                          >
                            Publish
                          </button>
                        )}
                        {challenge.status === 'published' && (
                          <button
                            onClick={() => handleUpdateStatus(challenge.id!, 'closed')}
                            className="text-xs font-medium text-red-600 hover:text-red-900 bg-red-50 hover:bg-red-100 px-2.5 py-1.5 rounded transition-colors"
                          >
                            Close
                          </button>
                        )}
                        {(challenge.status === 'published' || challenge.status === 'closed') && (
                          <button
                            onClick={() => handleUpdateStatus(challenge.id!, 'archived')}
                            className="text-xs font-medium text-yellow-600 hover:text-yellow-900 bg-yellow-50 hover:bg-yellow-100 px-2.5 py-1.5 rounded transition-colors"
                          >
                            Archive
                          </button>
                        )}
                        
                        <div className="ml-2 flex items-center space-x-2 border-l pl-4 border-gray-200">
                          <Link
                            href={`/dashboard/company/challenges/${challenge.id}`}
                            className="p-1.5 text-gray-400 hover:text-blue-600 rounded-md hover:bg-blue-50 transition-colors"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
                          {(challenge.status === 'draft' || challenge.status === 'published') && (
                            <Link
                              href={`/dashboard/company/challenges/${challenge.id}/edit`}
                              className="p-1.5 text-gray-400 hover:text-blue-600 rounded-md hover:bg-blue-50 transition-colors"
                              title="Edit Vacancy"
                            >
                              <Edit2 className="w-4 h-4" />
                            </Link>
                          )}
                          <button
                            onClick={() => handleDelete(challenge.id!)}
                            disabled={deletingId === challenge.id}
                            className="p-1.5 text-gray-400 hover:text-red-600 rounded-md hover:bg-red-50 transition-colors disabled:opacity-50"
                            title="Delete Vacancy"
                          >
                            {deletingId === challenge.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="mt-2 sm:flex sm:justify-between">
                      <div className="sm:flex sm:space-x-6 text-sm text-gray-500">
                        <p className="flex items-center">
                          <Briefcase className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                          {challenge.jobRole}
                        </p>
                        <p className="mt-2 flex items-center sm:mt-0">
                          <Users className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                          {challenge.applicantCount} / {challenge.maxApplicants} applicants
                        </p>
                      </div>
                      <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                        <Calendar className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                        <p>
                          Deadline: {new Date(challenge.applicationDeadline).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
