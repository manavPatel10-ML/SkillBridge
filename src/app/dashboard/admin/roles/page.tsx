"use client";

import { useEffect, useState, useMemo } from "react";
import { db } from "@/lib/firebase";
import { collection, query, getDocs, doc, deleteDoc, updateDoc } from "firebase/firestore";
import { Loader2, Search, Plus, Edit2, Trash2, Map, Users } from "lucide-react";
import { RolePath } from "@/types";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function AdminRolesPage() {
  const [roles, setRoles] = useState<RolePath[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const router = useRouter();

  const fetchRoles = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, "roles"));
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as RolePath));
      setRoles(data);
    } catch (error) {
      console.error("Error fetching roles:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  const filteredRoles = useMemo(() => {
    if (!searchQuery) return roles;
    const lower = searchQuery.toLowerCase();
    return roles.filter(
      (r) =>
        r.title.toLowerCase().includes(lower) ||
        r.id?.toLowerCase().includes(lower)
    );
  }, [roles, searchQuery]);

  const toggleStatus = async (role: RolePath) => {
    try {
      if (!role.id) return;
      const roleRef = doc(db, "roles", role.id);
      await updateDoc(roleRef, { active: !role.active });
      setRoles(roles.map(r => r.id === role.id ? { ...r, active: !r.active } : r));
    } catch (err) {
      console.error("Failed to toggle status", err);
    }
  };

  const handleDelete = async (roleId: string) => {
    if (!window.confirm("Are you sure you want to delete this Role Path?")) return;
    
    try {
      await deleteDoc(doc(db, "roles", roleId));
      setRoles(roles.filter(r => r.id !== roleId));
    } catch (err) {
      console.error("Failed to delete role", err);
      window.alert("An error occurred while deleting the Role Path.");
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
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Role Paths Management</h1>
          <p className="mt-2 text-gray-600">Create, update, and manage career roadmaps (Role Paths) for students.</p>
        </div>
        <Link
          href="/dashboard/admin/roles/create"
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add New Role Path
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search Role Paths..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role Path
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Required Skills
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredRoles.length > 0 ? (
                filteredRoles.map((role) => (
                  <tr key={role.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600">
                          <Map className="h-5 w-5" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-bold text-gray-900">{role.title}</div>
                          <div className="text-xs text-gray-500 font-mono mt-0.5">ID: {role.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 line-clamp-2">{role.description}</div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {role.requiredSkillIds?.length || 0} skills
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => toggleStatus(role)}
                        className={`relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                          role.active ? 'bg-green-500' : 'bg-gray-300'
                        }`}
                      >
                        <span className="sr-only">Toggle active status</span>
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200 ${
                            role.active ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                      <span className="ml-2 text-xs font-medium text-gray-500 align-text-bottom">
                        {role.active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Link
                        href={`/dashboard/admin/roles/${role.id}`}
                        className="inline-flex text-blue-600 hover:text-blue-900 p-2 rounded-full hover:bg-blue-50 mr-2 transition-colors"
                        title="Edit Role Path"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Link>
                      <button
                        onClick={() => role.id && handleDelete(role.id)}
                        className="text-red-600 hover:text-red-900 p-2 rounded-full hover:bg-red-50 transition-colors"
                        title="Delete Role Path"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    <Map className="mx-auto h-12 w-12 text-gray-400 mb-3" />
                    <p className="text-lg font-medium text-gray-900">No Role Paths found</p>
                    <p className="text-sm text-gray-500">Add a new Role Path to get started.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
