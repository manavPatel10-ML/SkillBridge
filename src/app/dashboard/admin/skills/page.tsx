"use client";

import { useEffect, useState, useMemo } from "react";
import { db } from "@/lib/firebase";
import { collection, query, getDocs, doc, setDoc, deleteDoc, serverTimestamp, updateDoc } from "firebase/firestore";
import { Loader2, Search, Plus, Edit2, Trash2, Award, AlertCircle } from "lucide-react";

type Skill = {
  id: string;
  name: string;
  description: string;
  category: string;
  active: boolean;
  createdAt: any;
};

export default function AdminSkillsPage() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSkill, setEditingSkill] = useState<Skill | null>(null);
  const [formData, setFormData] = useState({ id: "", name: "", description: "", category: "", active: true });
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState("");

  const fetchSkills = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, "skills"));
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as Skill));
      setSkills(data);
    } catch (error) {
      console.error("Error fetching skills:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSkills();
  }, []);

  const filteredSkills = useMemo(() => {
    if (!searchQuery) return skills;
    const lower = searchQuery.toLowerCase();
    return skills.filter(
      (s) =>
        s.name.toLowerCase().includes(lower) ||
        s.category.toLowerCase().includes(lower) ||
        s.id.toLowerCase().includes(lower)
    );
  }, [skills, searchQuery]);

  const handleOpenModal = (skill?: Skill) => {
    if (skill) {
      setEditingSkill(skill);
      setFormData({
        id: skill.id,
        name: skill.name,
        description: skill.description,
        category: skill.category,
        active: skill.active
      });
    } else {
      setEditingSkill(null);
      setFormData({ id: "", name: "", description: "", category: "", active: false });
    }
    setModalError("");
    setIsModalOpen(true);
  };

  const handleSaveSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalLoading(true);
    setModalError("");

    try {
      // Validate Slug ID format if it's new
      if (!editingSkill) {
        const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
        if (!slugRegex.test(formData.id)) {
          throw new Error("ID must be a lowercase slug (e.g., 'python-basics'). No spaces allowed.");
        }
        
        // Check for duplicate ID
        const existing = skills.find(s => s.id === formData.id);
        if (existing) {
          throw new Error("A skill with this ID already exists.");
        }
      }

      const skillRef = doc(db, "skills", formData.id);
      
      if (editingSkill) {
        await updateDoc(skillRef, {
          name: formData.name,
          description: formData.description,
          category: formData.category,
          active: formData.active
        });
      } else {
        await setDoc(skillRef, {
          name: formData.name,
          description: formData.description,
          category: formData.category,
          active: formData.active,
          createdAt: serverTimestamp()
        });
      }

      setIsModalOpen(false);
      fetchSkills();
    } catch (err: any) {
      setModalError(err.message || "Failed to save skill.");
    } finally {
      setModalLoading(false);
    }
  };

  const toggleStatus = async (skill: Skill) => {
    try {
      const skillRef = doc(db, "skills", skill.id);
      await updateDoc(skillRef, { active: !skill.active });
      setSkills(skills.map(s => s.id === skill.id ? { ...s, active: !s.active } : s));
    } catch (err) {
      console.error("Failed to toggle status", err);
    }
  };

  const handleDelete = async (skillId: string) => {
    if (!window.confirm("Are you sure you want to delete this skill?")) return;
    
    try {
      // Check for associated assessments
      const assessmentsSnap = await getDocs(query(collection(db, "assessments")));
      const hasAssessments = assessmentsSnap.docs.some(d => d.data().skillId === skillId);
      
      // Check for associated practical tasks
      const tasksSnap = await getDocs(query(collection(db, "practicalTasks")));
      const hasTasks = tasksSnap.docs.some(d => d.data().skillId === skillId);
      
      if (hasAssessments || hasTasks) {
        window.alert("Cannot delete this skill because it has associated assessments or practical tasks. Delete them first or deactivate this skill.");
        return;
      }
      
      await deleteDoc(doc(db, "skills", skillId));
      setSkills(skills.filter(s => s.id !== skillId));
    } catch (err) {
      console.error("Failed to delete skill", err);
      window.alert("An error occurred while deleting the skill.");
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
          <h1 className="text-3xl font-bold text-gray-900">Skills Management</h1>
          <p className="mt-2 text-gray-600">Create, update, and manage the platform's core skills.</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add New Skill
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search skills by name, ID, or category..."
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
                  Skill
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description & Category
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
              {filteredSkills.length > 0 ? (
                filteredSkills.map((skill) => (
                  <tr key={skill.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600">
                          <Award className="h-5 w-5" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-bold text-gray-900">{skill.name}</div>
                          <div className="text-xs text-gray-500 font-mono mt-0.5">ID: {skill.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 line-clamp-1">{skill.description}</div>
                      <div className="text-xs text-gray-500 mt-1">{skill.category}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => toggleStatus(skill)}
                        className={`relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                          skill.active ? 'bg-green-500' : 'bg-gray-300'
                        }`}
                      >
                        <span className="sr-only">Toggle active status</span>
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200 ${
                            skill.active ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                      <span className="ml-2 text-xs font-medium text-gray-500 align-text-bottom">
                        {skill.active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleOpenModal(skill)}
                        className="text-blue-600 hover:text-blue-900 p-2 rounded-full hover:bg-blue-50 mr-2 transition-colors"
                        title="Edit Skill"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(skill.id)}
                        className="text-red-600 hover:text-red-900 p-2 rounded-full hover:bg-red-50 transition-colors"
                        title="Delete Skill"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                    <Award className="mx-auto h-12 w-12 text-gray-400 mb-3" />
                    <p className="text-lg font-medium text-gray-900">No skills found</p>
                    <p className="text-sm text-gray-500">Add a new skill to get started.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={() => setIsModalOpen(false)}></div>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg w-full">
              <form onSubmit={handleSaveSkill}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="sm:flex sm:items-start">
                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                      <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                        {editingSkill ? "Edit Skill" : "Add New Skill"}
                      </h3>
                      
                      {modalError && (
                        <div className="mt-2 bg-red-50 p-3 rounded-md flex items-start text-sm text-red-600">
                          <AlertCircle className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                          <span>{modalError}</span>
                        </div>
                      )}

                      <div className="mt-4 space-y-4">
                        {!editingSkill && (
                          <div>
                            <label htmlFor="id" className="block text-sm font-medium text-gray-700">Skill ID (Slug)</label>
                            <input
                              type="text"
                              id="id"
                              required
                              placeholder="e.g., python-advanced"
                              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                              value={formData.id}
                              onChange={(e) => setFormData({...formData, id: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')})}
                            />
                            <p className="mt-1 text-xs text-gray-500">Used in URLs. Only lowercase letters, numbers, and hyphens.</p>
                          </div>
                        )}
                        
                        <div>
                          <label htmlFor="name" className="block text-sm font-medium text-gray-700">Name</label>
                          <input
                            type="text"
                            id="name"
                            required
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            value={formData.name}
                            onChange={(e) => setFormData({...formData, name: e.target.value})}
                          />
                        </div>

                        <div>
                          <label htmlFor="category" className="block text-sm font-medium text-gray-700">Category</label>
                          <input
                            type="text"
                            id="category"
                            required
                            placeholder="e.g., Programming Languages"
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            value={formData.category}
                            onChange={(e) => setFormData({...formData, category: e.target.value})}
                          />
                        </div>

                        <div>
                          <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description</label>
                          <textarea
                            id="description"
                            required
                            rows={3}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            value={formData.description}
                            onChange={(e) => setFormData({...formData, description: e.target.value})}
                          />
                        </div>

                        <div className="flex items-center">
                          <input
                            id="active"
                            type="checkbox"
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            checked={formData.active}
                            onChange={(e) => setFormData({...formData, active: e.target.checked})}
                          />
                          <label htmlFor="active" className="ml-2 block text-sm text-gray-900">
                            Active (Visible to students)
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="submit"
                    disabled={modalLoading}
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                  >
                    {modalLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Save Skill"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
