"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { Loader2, Map, ArrowRight, BookOpen } from "lucide-react";
import Link from "next/link";
import { RolePath } from "@/types";
import { useAuth } from "@/contexts/AuthContext";

export default function StudentRolesPage() {
  const { user } = useAuth();
  const [roles, setRoles] = useState<RolePath[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchRoles = async () => {
      try {
        const q = query(collection(db, "roles"), where("active", "==", true));
        const snap = await getDocs(q);
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as RolePath));
        setRoles(data);
      } catch (err) {
        console.error("Failed to fetch roles", err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchRoles();
  }, [user]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-8 text-white shadow-md">
        <h1 className="text-3xl font-bold mb-2">Career Paths</h1>
        <p className="text-blue-100 max-w-2xl text-lg">
          Not sure where to start? Choose a career path to get a structured roadmap of skills you need to learn and master to achieve your goals.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {roles.map(role => (
          <Link 
            href={`/dashboard/student/roles/${role.id}`}
            key={role.id}
            className="group bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col h-full hover:border-blue-300"
          >
            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 mb-4 group-hover:scale-110 transition-transform">
              <Map className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">{role.title}</h3>
            <p className="text-gray-600 text-sm flex-1 mb-6 line-clamp-3">
              {role.description}
            </p>
            
            <div className="mt-auto pt-4 border-t border-gray-100 flex items-center justify-between">
              <div className="flex items-center text-sm font-medium text-gray-500 bg-gray-50 px-3 py-1 rounded-full">
                <BookOpen className="w-4 h-4 mr-1.5" />
                {role.requiredSkillIds?.length || 0} Skills Required
              </div>
              
              <div className="flex items-center text-blue-600 font-medium text-sm group-hover:translate-x-1 transition-transform">
                View Path <ArrowRight className="w-4 h-4 ml-1" />
              </div>
            </div>
          </Link>
        ))}
      </div>
      
      {roles.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center shadow-sm">
          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Map className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">No Career Paths Available</h3>
          <p className="text-gray-500 max-w-sm mx-auto">
            We are currently building new career roadmaps. Please check back later!
          </p>
        </div>
      )}
    </div>
  );
}
