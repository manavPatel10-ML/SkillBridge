"use client";

import { useEffect, useState, useMemo } from "react";
import { db } from "@/lib/firebase";
import { collection, query, getDocs, doc, deleteDoc, updateDoc } from "firebase/firestore";
import { Loader2, Search, Plus, Edit2, Trash2, Terminal, BookOpen, AlertCircle } from "lucide-react";
import Link from "next/link";
import { PracticeProblem } from "@/types";

type Skill = {
  id: string;
  name: string;
};

export default function AdminPracticePage() {
  const [problems, setProblems] = useState<PracticeProblem[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch skills
      const skillsSnap = await getDocs(collection(db, "skills"));
      const skillsData = skillsSnap.docs.map(d => ({ id: d.id, name: d.data().name }));
      setSkills(skillsData);

      // Fetch practice problems
      const problemsSnap = await getDocs(collection(db, "practiceProblems"));
      const problemsData = problemsSnap.docs.map(d => ({ 
        id: d.id, 
        ...d.data()
      } as PracticeProblem));
      
      setProblems(problemsData);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredProblems = useMemo(() => {
    if (!searchQuery) return problems;
    const lower = searchQuery.toLowerCase();
    return problems.filter(
      (p) =>
        p.title.toLowerCase().includes(lower) ||
        p.topic.toLowerCase().includes(lower) ||
        p.skillId.toLowerCase().includes(lower)
    );
  }, [problems, searchQuery]);

  const toggleStatus = async (problem: PracticeProblem) => {
    try {
      if (!problem.id) return;
      const problemRef = doc(db, "practiceProblems", problem.id);
      await updateDoc(problemRef, { active: !problem.active });
      setProblems(problems.map(p => p.id === problem.id ? { ...p, active: !p.active } : p));
    } catch (err) {
      console.error("Failed to toggle status", err);
      window.alert("Failed to toggle status.");
    }
  };

  const handleDelete = async (problemId: string) => {
    if (!window.confirm("Are you sure you want to delete this practice problem?")) return;
    
    try {
      await deleteDoc(doc(db, "practiceProblems", problemId));
      setProblems(problems.filter(p => p.id !== problemId));
    } catch (err) {
      console.error("Failed to delete practice problem", err);
      window.alert("An error occurred while deleting.");
    }
  };

  const getSkillName = (skillId: string) => {
    return skills.find(s => s.id === skillId)?.name || skillId;
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
          <h1 className="text-3xl font-bold text-gray-900">Coding Practice</h1>
          <p className="mt-2 text-gray-600">Manage practice problems for students to hone their skills.</p>
        </div>
        <Link
          href="/dashboard/admin/practice/create"
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Problem
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by title, topic, or skill..."
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
                  Problem
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Skill & Topic
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Difficulty
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
              {filteredProblems.length > 0 ? (
                filteredProblems.map((problem) => (
                  <tr key={problem.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
                          <Terminal className="h-5 w-5" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-bold text-gray-900">{problem.title}</div>
                          <div className="text-xs text-gray-500 font-mono mt-0.5">ID: {problem.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{getSkillName(problem.skillId)}</div>
                      <div className="text-xs text-gray-500 mt-1">{problem.topic}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        problem.difficulty === 'beginner' ? 'bg-green-100 text-green-800' :
                        problem.difficulty === 'intermediate' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {problem.difficulty}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => toggleStatus(problem)}
                        className={`relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                          problem.active ? 'bg-green-500' : 'bg-gray-300'
                        }`}
                      >
                        <span className="sr-only">Toggle active status</span>
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200 ${
                            problem.active ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                      <span className="ml-2 text-xs font-medium text-gray-500 align-text-bottom">
                        {problem.active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Link
                        href={`/dashboard/admin/practice/${problem.id}/edit`}
                        className="text-blue-600 hover:text-blue-900 p-2 rounded-full hover:bg-blue-50 mr-2 transition-colors inline-flex"
                        title="Edit Problem"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Link>
                      <button
                        onClick={() => problem.id && handleDelete(problem.id)}
                        className="text-red-600 hover:text-red-900 p-2 rounded-full hover:bg-red-50 transition-colors"
                        title="Delete Problem"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    <Terminal className="mx-auto h-12 w-12 text-gray-400 mb-3" />
                    <p className="text-lg font-medium text-gray-900">No practice problems found</p>
                    <p className="text-sm text-gray-500">Add a new problem to get started.</p>
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
