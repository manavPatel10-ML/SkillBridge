"use client";

import { useEffect, useState, useMemo } from "react";
import { db } from "@/lib/firebase";
import { collection, query, getDocs, doc, setDoc, deleteDoc, serverTimestamp, updateDoc } from "firebase/firestore";
import { Loader2, Search, Plus, Edit2, Trash2, Code2, AlertCircle, ListPlus, CheckCircle2 } from "lucide-react";

type Criterion = { criterion: string; weight: number };

type PracticalTask = {
  id: string;
  title: string;
  description: string;
  skillId: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  durationMinutes: number;
  instructions: string;
  requirements: string[];
  submissionTypes: string[];
  evaluationCriteria: Criterion[];
  active: boolean;
  createdAt: any;
};

type Skill = {
  id: string;
  name: string;
};

export default function AdminPracticalTasksPage() {
  const [tasks, setTasks] = useState<PracticalTask[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<PracticalTask | null>(null);
  
  const [formData, setFormData] = useState<{
    id: string;
    title: string;
    description: string;
    skillId: string;
    difficulty: "beginner" | "intermediate" | "advanced";
    durationMinutes: number;
    instructions: string;
    requirements: string[];
    submissionTypes: string[];
    evaluationCriteria: Criterion[];
    active: boolean;
  }>({
    id: "",
    title: "",
    description: "",
    skillId: "",
    difficulty: "beginner",
    durationMinutes: 60,
    instructions: "",
    requirements: [""],
    submissionTypes: ["github", "live_url"],
    evaluationCriteria: [{ criterion: "", weight: 100 }],
    active: true
  });
  
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      const skillsSnap = await getDocs(collection(db, "skills"));
      const skillsData = skillsSnap.docs.map(d => ({ id: d.id, name: d.data().name }));
      setSkills(skillsData);

      const tasksSnap = await getDocs(collection(db, "practicalTasks"));
      const tasksData = tasksSnap.docs.map(d => ({ id: d.id, ...d.data() } as PracticalTask));
      setTasks(tasksData);
    } catch (error) {
      console.error("Error fetching tasks:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredTasks = useMemo(() => {
    if (!searchQuery) return tasks;
    const lower = searchQuery.toLowerCase();
    return tasks.filter(
      (t) =>
        t.title.toLowerCase().includes(lower) ||
        t.skillId.toLowerCase().includes(lower) ||
        t.id.toLowerCase().includes(lower)
    );
  }, [tasks, searchQuery]);

  const handleOpenModal = (task?: PracticalTask) => {
    if (task) {
      setEditingTask(task);
      setFormData({
        id: task.id,
        title: task.title,
        description: task.description,
        skillId: task.skillId,
        difficulty: task.difficulty,
        durationMinutes: task.durationMinutes,
        instructions: task.instructions,
        requirements: [...task.requirements],
        submissionTypes: [...task.submissionTypes],
        evaluationCriteria: task.evaluationCriteria.map(c => ({...c})),
        active: task.active
      });
    } else {
      setEditingTask(null);
      setFormData({
        id: "",
        title: "",
        description: "",
        skillId: skills.length > 0 ? skills[0].id : "",
        difficulty: "intermediate",
        durationMinutes: 60,
        instructions: "",
        requirements: [""],
        submissionTypes: ["github", "live_url"],
        evaluationCriteria: [{ criterion: "", weight: 100 }],
        active: true
      });
    }
    setModalError("");
    setIsModalOpen(true);
  };

  const handleListChange = (listType: 'requirements' | 'submissionTypes', index: number, value: string) => {
    const newList = [...formData[listType]];
    newList[index] = value;
    setFormData({ ...formData, [listType]: newList });
  };

  const addListItem = (listType: 'requirements' | 'submissionTypes') => {
    setFormData({ ...formData, [listType]: [...formData[listType], ""] });
  };

  const removeListItem = (listType: 'requirements' | 'submissionTypes', index: number) => {
    if (formData[listType].length <= 1) return;
    const newList = formData[listType].filter((_, i) => i !== index);
    setFormData({ ...formData, [listType]: newList });
  };

  const handleCriterionChange = (index: number, field: 'criterion' | 'weight', value: string | number) => {
    const newCriteria = [...formData.evaluationCriteria];
    newCriteria[index] = { ...newCriteria[index], [field]: value };
    setFormData({ ...formData, evaluationCriteria: newCriteria });
  };

  const addCriterion = () => {
    setFormData({ ...formData, evaluationCriteria: [...formData.evaluationCriteria, { criterion: "", weight: 0 }] });
  };

  const removeCriterion = (index: number) => {
    if (formData.evaluationCriteria.length <= 1) return;
    const newCriteria = formData.evaluationCriteria.filter((_, i) => i !== index);
    setFormData({ ...formData, evaluationCriteria: newCriteria });
  };

  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalLoading(true);
    setModalError("");

    try {
      if (!editingTask) {
        const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
        if (!slugRegex.test(formData.id)) {
          throw new Error("ID must be a lowercase slug (e.g., 'build-rest-api').");
        }
        
        const existing = tasks.find(t => t.id === formData.id);
        if (existing) {
          throw new Error("A task with this ID already exists.");
        }
      }

      // Filter empty list items
      const validRequirements = formData.requirements.filter(r => r.trim() !== "");
      const validSubmissionTypes = formData.submissionTypes.filter(s => s.trim() !== "");
      const validCriteria = formData.evaluationCriteria.filter(c => c.criterion.trim() !== "");

      if (validCriteria.length === 0) {
        throw new Error("At least one evaluation criterion is required.");
      }

      // Validate total weight is exactly 100
      const totalWeight = validCriteria.reduce((sum, c) => sum + Number(c.weight), 0);
      if (totalWeight !== 100) {
        throw new Error(`Evaluation criteria weights must sum exactly to 100. Current sum is ${totalWeight}.`);
      }

      const taskRef = doc(db, "practicalTasks", formData.id);
      const dataToSave = {
        title: formData.title,
        description: formData.description,
        skillId: formData.skillId,
        difficulty: formData.difficulty,
        durationMinutes: Number(formData.durationMinutes),
        instructions: formData.instructions,
        requirements: validRequirements,
        submissionTypes: validSubmissionTypes,
        evaluationCriteria: validCriteria.map(c => ({ ...c, weight: Number(c.weight) })),
        active: formData.active
      };
      
      if (editingTask) {
        await updateDoc(taskRef, dataToSave);
      } else {
        await setDoc(taskRef, {
          ...dataToSave,
          createdAt: serverTimestamp()
        });
      }

      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      setModalError(err.message || "Failed to save task.");
    } finally {
      setModalLoading(false);
    }
  };

  const toggleStatus = async (task: PracticalTask) => {
    try {
      const taskRef = doc(db, "practicalTasks", task.id);
      await updateDoc(taskRef, { active: !task.active });
      setTasks(tasks.map(t => t.id === task.id ? { ...t, active: !t.active } : t));
    } catch (err) {
      console.error("Failed to toggle status", err);
      window.alert("Failed to toggle status.");
    }
  };

  const handleDelete = async (taskId: string) => {
    if (!window.confirm("Are you sure you want to delete this practical task?")) return;
    
    try {
      const attemptsSnap = await getDocs(query(collection(db, "practicalTaskAttempts")));
      const hasAttempts = attemptsSnap.docs.some(d => d.data().taskId === taskId);
      
      if (hasAttempts) {
        window.alert("Cannot delete this task because students have already attempted it. Deactivate it instead.");
        return;
      }
      
      await deleteDoc(doc(db, "practicalTasks", taskId));
      setTasks(tasks.filter(t => t.id !== taskId));
    } catch (err) {
      console.error("Failed to delete task", err);
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

  const currentTotalWeight = formData.evaluationCriteria.reduce((sum, c) => sum + Number(c.weight || 0), 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Practical Tasks</h1>
          <p className="mt-2 text-gray-600">Manage real-world assignments and evaluation criteria.</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Task
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by title, ID, or skill..."
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
                  Task
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Skill & Level
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Details
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
              {filteredTasks.length > 0 ? (
                filteredTasks.map((task) => (
                  <tr key={task.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-orange-100 rounded-lg flex items-center justify-center text-orange-600">
                          <Code2 className="h-5 w-5" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-bold text-gray-900">{task.title}</div>
                          <div className="text-xs text-gray-500 font-mono mt-0.5">ID: {task.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{getSkillName(task.skillId)}</div>
                      <div className="text-xs text-gray-500 capitalize mt-1">
                         {task.difficulty}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                         {task.durationMinutes} minutes
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {task.evaluationCriteria.length} Criteria • {task.submissionTypes.join(', ')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => toggleStatus(task)}
                        className={`relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                          task.active ? 'bg-green-500' : 'bg-gray-300'
                        }`}
                      >
                        <span className="sr-only">Toggle active status</span>
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200 ${
                            task.active ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                      <span className="ml-2 text-xs font-medium text-gray-500 align-text-bottom">
                        {task.active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleOpenModal(task)}
                        className="text-blue-600 hover:text-blue-900 p-2 rounded-full hover:bg-blue-50 mr-2 transition-colors"
                        title="Edit Task"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(task.id)}
                        className="text-red-600 hover:text-red-900 p-2 rounded-full hover:bg-red-50 transition-colors"
                        title="Delete Task"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    <Code2 className="mx-auto h-12 w-12 text-gray-400 mb-3" />
                    <p className="text-lg font-medium text-gray-900">No practical tasks found</p>
                    <p className="text-sm text-gray-500">Add a new task to get started.</p>
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

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl w-full">
              <form onSubmit={handleSaveTask}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4 max-h-[80vh] overflow-y-auto">
                  <div className="sm:flex sm:items-start">
                    <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                      <h3 className="text-lg leading-6 font-medium text-gray-900 border-b pb-2 mb-4" id="modal-title">
                        {editingTask ? "Edit Practical Task" : "Add New Practical Task"}
                      </h3>
                      
                      {modalError && (
                        <div className="mb-4 bg-red-50 p-3 rounded-md flex items-start text-sm text-red-600">
                          <AlertCircle className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                          <span>{modalError}</span>
                        </div>
                      )}

                      <div className="space-y-6">
                        
                        {/* Basic Info */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {!editingTask && (
                            <div>
                              <label className="block text-sm font-medium text-gray-700">Task ID (Slug)</label>
                              <input
                                type="text"
                                required
                                placeholder="e.g., build-rest-api"
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                value={formData.id}
                                onChange={(e) => setFormData({...formData, id: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')})}
                              />
                            </div>
                          )}
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Associated Skill</label>
                            <select
                              required
                              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                              value={formData.skillId}
                              onChange={(e) => setFormData({...formData, skillId: e.target.value})}
                            >
                              <option value="" disabled>Select a skill</option>
                              {skills.map(s => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700">Title</label>
                          <input
                            type="text"
                            required
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            value={formData.title}
                            onChange={(e) => setFormData({...formData, title: e.target.value})}
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700">Description</label>
                          <textarea
                            required
                            rows={2}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            value={formData.description}
                            onChange={(e) => setFormData({...formData, description: e.target.value})}
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Difficulty</label>
                            <select
                              required
                              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                              value={formData.difficulty}
                              onChange={(e) => setFormData({...formData, difficulty: e.target.value as any})}
                            >
                              <option value="beginner">Beginner</option>
                              <option value="intermediate">Intermediate</option>
                              <option value="advanced">Advanced</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Duration (Minutes)</label>
                            <input
                              type="number"
                              required
                              min="15"
                              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                              value={formData.durationMinutes}
                              onChange={(e) => setFormData({...formData, durationMinutes: Number(e.target.value)})}
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700">Detailed Instructions (Markdown supported)</label>
                          <textarea
                            required
                            rows={4}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500 sm:text-sm font-mono"
                            value={formData.instructions}
                            onChange={(e) => setFormData({...formData, instructions: e.target.value})}
                          />
                        </div>

                        {/* Lists */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Requirements */}
                          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                            <div className="flex justify-between items-center mb-2">
                              <label className="block text-sm font-medium text-gray-700">Requirements</label>
                              <button type="button" onClick={() => addListItem('requirements')} className="text-xs text-blue-600 flex items-center">
                                <Plus className="h-3 w-3 mr-1" /> Add
                              </button>
                            </div>
                            <div className="space-y-2">
                              {formData.requirements.map((req, idx) => (
                                <div key={idx} className="flex items-center gap-2">
                                  <input
                                    type="text"
                                    required
                                    className="block w-full border border-gray-300 rounded-md shadow-sm py-1.5 px-3 focus:ring-blue-500 sm:text-sm"
                                    value={req}
                                    onChange={(e) => handleListChange('requirements', idx, e.target.value)}
                                  />
                                  {formData.requirements.length > 1 && (
                                    <button type="button" onClick={() => removeListItem('requirements', idx)} className="text-gray-400 hover:text-red-500">
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                          
                          {/* Submission Types */}
                          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                            <div className="flex justify-between items-center mb-2">
                              <label className="block text-sm font-medium text-gray-700">Submission Types</label>
                              <button type="button" onClick={() => addListItem('submissionTypes')} className="text-xs text-blue-600 flex items-center">
                                <Plus className="h-3 w-3 mr-1" /> Add
                              </button>
                            </div>
                            <div className="space-y-2">
                              {formData.submissionTypes.map((type, idx) => (
                                <div key={idx} className="flex items-center gap-2">
                                  <input
                                    type="text"
                                    required
                                    placeholder="e.g. github, live_url, file_upload"
                                    className="block w-full border border-gray-300 rounded-md shadow-sm py-1.5 px-3 focus:ring-blue-500 sm:text-sm"
                                    value={type}
                                    onChange={(e) => handleListChange('submissionTypes', idx, e.target.value)}
                                  />
                                  {formData.submissionTypes.length > 1 && (
                                    <button type="button" onClick={() => removeListItem('submissionTypes', idx)} className="text-gray-400 hover:text-red-500">
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Evaluation Criteria */}
                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                          <div className="flex justify-between items-center mb-4">
                            <div>
                              <label className="block text-sm font-bold text-gray-900">Evaluation Criteria</label>
                              <p className="text-xs text-gray-500">Weights must sum up to exactly 100.</p>
                            </div>
                            <button type="button" onClick={addCriterion} className="text-sm bg-white border border-gray-300 px-3 py-1 rounded text-blue-600 flex items-center shadow-sm">
                              <Plus className="h-4 w-4 mr-1" /> Add Criterion
                            </button>
                          </div>
                          
                          <div className="space-y-3">
                            {formData.evaluationCriteria.map((c, idx) => (
                              <div key={idx} className="flex items-center gap-3 bg-white p-2 rounded border border-gray-200">
                                <div className="flex-1">
                                  <input
                                    type="text"
                                    required
                                    placeholder="e.g. Code Quality"
                                    className="block w-full border border-gray-300 rounded-md shadow-sm py-1.5 px-3 focus:ring-blue-500 sm:text-sm"
                                    value={c.criterion}
                                    onChange={(e) => handleCriterionChange(idx, 'criterion', e.target.value)}
                                  />
                                </div>
                                <div className="w-24">
                                  <input
                                    type="number"
                                    required
                                    min="1"
                                    max="100"
                                    className="block w-full border border-gray-300 rounded-md shadow-sm py-1.5 px-3 focus:ring-blue-500 sm:text-sm text-center"
                                    value={c.weight}
                                    onChange={(e) => handleCriterionChange(idx, 'weight', Number(e.target.value))}
                                  />
                                </div>
                                <div className="text-gray-500 text-sm font-medium">%</div>
                                {formData.evaluationCriteria.length > 1 && (
                                  <button type="button" onClick={() => removeCriterion(idx)} className="text-gray-400 hover:text-red-500 p-1">
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                          
                          <div className={`mt-4 flex justify-end items-center font-bold text-sm ${currentTotalWeight === 100 ? 'text-green-600' : 'text-red-600'}`}>
                            {currentTotalWeight === 100 && <CheckCircle2 className="w-4 h-4 mr-1" />}
                            Total Weight: {currentTotalWeight} / 100
                          </div>
                        </div>

                        <div className="flex items-center pt-2">
                          <input
                            id="active"
                            type="checkbox"
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            checked={formData.active}
                            onChange={(e) => setFormData({...formData, active: e.target.checked})}
                          />
                          <label htmlFor="active" className="ml-2 block text-sm font-medium text-gray-900">
                            Active (Visible to students)
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse border-t border-gray-200">
                  <button
                    type="submit"
                    disabled={modalLoading || currentTotalWeight !== 100}
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                  >
                    {modalLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Save Task"}
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
