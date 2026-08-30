"use client";

import { useEffect, useState, useMemo } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { Loader2, Search, GraduationCap } from "lucide-react";

type StudentData = {
  id: string;
  email: string;
  fullName: string;
  college: string;
  branch: string;
  skillsCount: number;
  assessmentCount: number;
  taskCount: number;
  status: string;
};

export default function AdminStudentsPage() {
  const [students, setStudents] = useState<StudentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch users with role 'student'
        const usersSnap = await getDocs(query(collection(db, "users"), where("role", "==", "student")));
        const userDocs: Record<string, any> = {};
        usersSnap.forEach(d => {
          userDocs[d.id] = { id: d.id, ...d.data() };
        });

        // Fetch student profiles
        const profilesSnap = await getDocs(collection(db, "studentProfiles"));
        const profileDocs: Record<string, any> = {};
        profilesSnap.forEach(d => {
          profileDocs[d.id] = { id: d.id, ...d.data() };
        });

        // Fetch assessment attempts
        const assessmentAttemptsSnap = await getDocs(collection(db, "assessmentAttempts"));
        const assessmentCounts: Record<string, number> = {};
        assessmentAttemptsSnap.forEach(d => {
          const data = d.data();
          if (data.status === "completed") {
            assessmentCounts[data.studentId] = (assessmentCounts[data.studentId] || 0) + 1;
          }
        });

        // Fetch practical task attempts
        const taskAttemptsSnap = await getDocs(collection(db, "practicalTaskAttempts"));
        const taskCounts: Record<string, number> = {};
        taskAttemptsSnap.forEach(d => {
          const data = d.data();
          if (data.status === "completed") {
            taskCounts[data.studentId] = (taskCounts[data.studentId] || 0) + 1;
          }
        });

        // Merge
        const merged: StudentData[] = Object.keys(userDocs).map(uid => {
          const user = userDocs[uid];
          const profile = profileDocs[uid] || {};
          return {
            id: uid,
            email: user.email || "N/A",
            fullName: profile.fullName || "Incomplete Profile",
            college: profile.college || "N/A",
            branch: profile.branch || "N/A",
            skillsCount: profile.skills ? profile.skills.length : 0,
            assessmentCount: assessmentCounts[uid] || 0,
            taskCount: taskCounts[uid] || 0,
            status: "Active",
          };
        });

        setStudents(merged);
      } catch (error) {
        console.error("Error fetching students:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const filteredStudents = useMemo(() => {
    if (!searchQuery) return students;
    const lower = searchQuery.toLowerCase();
    return students.filter(
      (s) =>
        s.fullName.toLowerCase().includes(lower) ||
        s.email.toLowerCase().includes(lower) ||
        s.college.toLowerCase().includes(lower) ||
        s.branch.toLowerCase().includes(lower)
    );
  }, [students, searchQuery]);

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
          <h1 className="text-3xl font-bold text-gray-900">Students</h1>
          <p className="mt-2 text-gray-600">Manage and view registered students on the platform.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, email, college, or branch..."
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
                  Student Details
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Education
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Engagement
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredStudents.length > 0 ? (
                filteredStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">
                          {student.fullName.charAt(0).toUpperCase()}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{student.fullName}</div>
                          <div className="text-sm text-gray-500">{student.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{student.college}</div>
                      <div className="text-sm text-gray-500">{student.branch}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {student.skillsCount} Skills Selected
                      </div>
                      <div className="text-xs text-gray-500">
                        {student.assessmentCount} Assessments • {student.taskCount} Tasks
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        {student.status}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                    <GraduationCap className="mx-auto h-12 w-12 text-gray-400 mb-3" />
                    <p className="text-lg font-medium text-gray-900">No students found</p>
                    <p className="text-sm text-gray-500">Try adjusting your search criteria.</p>
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
