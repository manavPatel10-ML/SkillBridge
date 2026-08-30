"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, setDoc, serverTimestamp } from "firebase/firestore";
import { Loader2, ArrowLeft, AlertCircle, Save, Plus, X, ArrowUp, ArrowDown } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { RolePath } from "@/types";

type SkillPreview = { id: string; name: string; category: string };

export default function CreateRolePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [allSkills, setAllSkills] = useState<SkillPreview[]>([]);
  
  const [formData, setFormData] = useState({
    id: "",
    title: "",
    description: "",
    active: true
  });
  
  const [selectedSkills, setSelectedSkills] = useState<SkillPreview[]>([]);
  
  useEffect(() => {
    const fetchSkills = async () => {
      try {
        const snap = await getDocs(collection(db, "skills"));
        const data = snap.docs.map(d => ({ 
          id: d.id, 
          name: d.data().name, 
          category: d.data().category 
        }));
        setAllSkills(data);
      } catch (err) {
        console.error("Failed to fetch skills", err);
      }
    };
    fetchSkills();
  }, []);

  const handleAddSkill = (skillId: string) => {
    const skillToAdd = allSkills.find(s => s.id === skillId);
    if (skillToAdd && !selectedSkills.some(s => s.id === skillId)) {
      setSelectedSkills([...selectedSkills, skillToAdd]);
    }
  };

  const handleRemoveSkill = (skillId: string) => {
    setSelectedSkills(selectedSkills.filter(s => s.id !== skillId));
  };

  const moveSkill = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === selectedSkills.length - 1) return;
    
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    const newSkills = [...selectedSkills];
    const temp = newSkills[index];
    newSkills[index] = newSkills[newIndex];
    newSkills[newIndex] = temp;
    
    setSelectedSkills(newSkills);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
      if (!slugRegex.test(formData.id)) {
        throw new Error("ID must be a lowercase slug (e.g., 'frontend-developer'). No spaces allowed.");
      }

      if (selectedSkills.length === 0) {
        throw new Error("You must select at least one skill for this Role Path.");
      }

      const roleRef = doc(db, "roles", formData.id);
      
      const newRole: RolePath = {
        title: formData.title,
        description: formData.description,
        requiredSkillIds: selectedSkills.map(s => s.id),
        active: formData.active,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await setDoc(roleRef, newRole);
      router.push("/dashboard/admin/roles");
    } catch (err: any) {
      setError(err.message || "Failed to create Role Path.");
      setLoading(false);
    }
  };

  const unselectedSkills = allSkills.filter(s => !selectedSkills.some(ss => ss.id === s.id));

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <div className="flex items-center gap-4">
        <Link 
          href="/dashboard/admin/roles"
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <ArrowLeft className="h-6 w-6 text-gray-600" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Create Role Path</h1>
          <p className="text-gray-600 mt-1">Design a new career roadmap by assembling skills.</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 p-4 rounded-md flex items-start text-red-600">
          <AlertCircle className="h-5 w-5 mr-3 mt-0.5 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Details */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
          <h2 className="text-xl font-bold text-gray-900 border-b pb-4">Role Details</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="id" className="block text-sm font-medium text-gray-700">Role ID (Slug)</label>
              <input
                type="text"
                id="id"
                required
                placeholder="e.g., frontend-developer"
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                value={formData.id}
                onChange={(e) => setFormData({...formData, id: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')})}
              />
              <p className="mt-1 text-xs text-gray-500">Used in URLs. Only lowercase letters, numbers, and hyphens.</p>
            </div>

            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700">Title</label>
              <input
                type="text"
                id="title"
                required
                placeholder="e.g., Frontend Developer"
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
              />
            </div>
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description</label>
            <textarea
              id="description"
              required
              rows={3}
              placeholder="Describe what this role does and the skills required..."
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
            <label htmlFor="active" className="ml-2 block text-sm text-gray-900 font-medium">
              Active (Visible to students)
            </label>
          </div>
        </div>

        {/* Skill Assembly */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Available Skills */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col h-[500px]">
            <div className="p-4 border-b bg-gray-50">
              <h2 className="font-bold text-gray-900">Available Skills</h2>
              <p className="text-xs text-gray-500">Click to add to roadmap</p>
            </div>
            <div className="p-4 flex-1 overflow-y-auto space-y-2">
              {unselectedSkills.map(skill => (
                <div 
                  key={skill.id}
                  onClick={() => handleAddSkill(skill.id)}
                  className="p-3 border rounded-lg hover:border-blue-500 hover:bg-blue-50 cursor-pointer flex justify-between items-center transition-colors"
                >
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{skill.name}</p>
                    <p className="text-xs text-gray-500">{skill.category}</p>
                  </div>
                  <Plus className="h-4 w-4 text-gray-400" />
                </div>
              ))}
              {unselectedSkills.length === 0 && (
                <p className="text-center text-gray-500 text-sm mt-8">All skills added.</p>
              )}
            </div>
          </div>

          {/* Required Skills (Roadmap) */}
          <div className="bg-white rounded-xl shadow-sm border border-blue-200 flex flex-col h-[500px]">
            <div className="p-4 border-b bg-blue-50">
              <h2 className="font-bold text-blue-900">Role Roadmap (Required Skills)</h2>
              <p className="text-xs text-blue-700">Order determines learning progression</p>
            </div>
            <div className="p-4 flex-1 overflow-y-auto space-y-2">
              {selectedSkills.map((skill, index) => (
                <div 
                  key={skill.id}
                  className="p-3 border border-blue-200 bg-blue-50 rounded-lg flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex items-center justify-center h-6 w-6 rounded-full bg-blue-200 text-blue-800 text-xs font-bold">
                      {index + 1}
                    </span>
                    <div>
                      <p className="font-medium text-blue-900 text-sm">{skill.name}</p>
                      <p className="text-xs text-blue-700">{skill.category}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => moveSkill(index, 'up')}
                      disabled={index === 0}
                      className="p-1 text-gray-500 hover:text-blue-700 hover:bg-blue-100 rounded disabled:opacity-30"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveSkill(index, 'down')}
                      disabled={index === selectedSkills.length - 1}
                      className="p-1 text-gray-500 hover:text-blue-700 hover:bg-blue-100 rounded disabled:opacity-30"
                    >
                      <ArrowDown className="h-4 w-4" />
                    </button>
                    <div className="w-px h-4 bg-gray-300 mx-1"></div>
                    <button
                      type="button"
                      onClick={() => handleRemoveSkill(skill.id)}
                      className="p-1 text-red-500 hover:bg-red-100 rounded"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
              {selectedSkills.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gray-500">
                  <p className="text-sm">No skills added yet.</p>
                  <p className="text-xs mt-1">Select skills from the left pane to build the roadmap.</p>
                </div>
              )}
            </div>
          </div>

        </div>

        <div className="flex justify-end gap-4 border-t pt-6">
          <Link
            href="/dashboard/admin/roles"
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading || selectedSkills.length === 0}
            className="flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Save Role Path
          </button>
        </div>
      </form>
    </div>
  );
}
