"use client";

import { useEffect, useState, useMemo } from "react";
import { db } from "@/lib/firebase";
import { collection, query, getDocs, doc, setDoc, deleteDoc, serverTimestamp, updateDoc } from "firebase/firestore";
import { Loader2, Search, Plus, Edit2, Trash2, FileText, AlertCircle, Clock, BookOpen } from "lucide-react";
import Link from "next/link";

type Assessment = {
  id: string;
  skillId: string;
  title: string;
  description: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  passingScore: number;
  timePerQuestionSeconds: number;
  active: boolean;
  createdAt: any;
};

type Skill = {
  id: string;
  name: string;
};

export default function AdminAssessmentsPage() {
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAssessment, setEditingAssessment] = useState<Assessment | null>(null);
  
  const [formData, setFormData] = useState<{
    id: string;
    title: string;
    description: string;
    skillId: string;
    difficulty: "beginner" | "intermediate" | "advanced";
    timePerQuestionSeconds: number;
    active: boolean;
    passingScore: number;
  }>({
    id: "",
    title: "",
    description: "",
    skillId: "",
    difficulty: "intermediate",
    timePerQuestionSeconds: 30,
    active: true,
    passingScore: 70
  });
  
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch skills
      const skillsSnap = await getDocs(collection(db, "skills"));
      const skillsData = skillsSnap.docs.map(d => ({ id: d.id, name: d.data().name }));
      setSkills(skillsData);

      // Fetch assessments
      const assessmentsSnap = await getDocs(collection(db, "assessments"));
      const assessmentsData = assessmentsSnap.docs.map(d => ({ 
        id: d.id, 
        ...d.data(),
        timePerQuestionSeconds: d.data().timePerQuestionSeconds || 30 // Provide fallback for old records
      } as Assessment));
      
      setAssessments(assessmentsData);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredAssessments = useMemo(() => {
    if (!searchQuery) return assessments;
    const lower = searchQuery.toLowerCase();
    return assessments.filter(
      (a) =>
        a.title.toLowerCase().includes(lower) ||
        a.skillId.toLowerCase().includes(lower) ||
        a.id.toLowerCase().includes(lower)
    );
  }, [assessments, searchQuery]);

  const handleOpenModal = (assessment?: Assessment) => {
    if (assessment) {
      setEditingAssessment(assessment);
      setFormData({
        id: assessment.id,
        skillId: assessment.skillId,
        title: assessment.title,
        description: assessment.description,
        difficulty: assessment.difficulty,
        passingScore: assessment.passingScore,
        timePerQuestionSeconds: assessment.timePerQuestionSeconds || 30,
        active: assessment.active
      });
    } else {
      setEditingAssessment(null);
      setFormData({ 
        id: "", 
        skillId: skills.length > 0 ? skills[0].id : "", 
        title: "", 
        description: "", 
        difficulty: "beginner", 
        passingScore: 70, 
        timePerQuestionSeconds: 30,
        active: false 
      });
    }
    setModalError("");
    setIsModalOpen(true);
  };

  const handleSaveAssessment = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalLoading(true);
    setModalError("");

    try {
      if (!editingAssessment) {
        const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
        if (!slugRegex.test(formData.id)) {
          throw new Error("ID must be a lowercase slug (e.g., 'python-basics').");
        }
        
        const existing = assessments.find(a => a.id === formData.id);
        if (existing) {
          throw new Error("An assessment with this ID already exists.");
        }
      }

      // If trying to activate, check question count
      if (formData.active && (!editingAssessment || !editingAssessment.active || editingAssessment.active !== formData.active)) {
        const questionsSnap = await getDocs(query(collection(db, "questions")));
        const activeQuestionsCount = questionsSnap.docs.filter(
          d => d.data().assessmentId === (editingAssessment ? editingAssessment.id : formData.id) && d.data().active
        ).length;

        if (activeQuestionsCount < 10) {
          throw new Error(`Cannot activate assessment. It has ${activeQuestionsCount} active questions, but requires at least 10.`);
        }
      }

      const assessmentRef = doc(db, "assessments", formData.id);
      const dataToSave = {
        skillId: formData.skillId,
        title: formData.title,
        description: formData.description,
        difficulty: formData.difficulty,
        passingScore: Number(formData.passingScore),
        timePerQuestionSeconds: Number(formData.timePerQuestionSeconds),
        active: formData.active
      };
      
      if (editingAssessment) {
        await updateDoc(assessmentRef, dataToSave);
      } else {
        await setDoc(assessmentRef, {
          ...dataToSave,
          createdAt: serverTimestamp()
        });
      }

      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      setModalError(err.message || "Failed to save assessment.");
    } finally {
      setModalLoading(false);
    }
  };

  const toggleStatus = async (assessment: Assessment) => {
    try {
      if (!assessment.active) {
        // Trying to activate, check questions
        const questionsSnap = await getDocs(query(collection(db, "questions")));
        const activeQuestionsCount = questionsSnap.docs.filter(
          d => d.data().assessmentId === assessment.id && d.data().active
        ).length;

        if (activeQuestionsCount < 10) {
          window.alert(`Cannot activate. This assessment only has ${activeQuestionsCount} active questions. Requires 10.`);
          return;
        }
      }

      const assessmentRef = doc(db, "assessments", assessment.id);
      await updateDoc(assessmentRef, { active: !assessment.active });
      setAssessments(assessments.map(a => a.id === assessment.id ? { ...a, active: !a.active } : a));
    } catch (err) {
      console.error("Failed to toggle status", err);
      window.alert("Failed to toggle status.");
    }
  };

  const handleDelete = async (assessmentId: string) => {
    if (!window.confirm("Are you sure you want to delete this assessment?")) return;
    
    try {
      // Check for associated attempts
      const attemptsSnap = await getDocs(collection(db, "assessmentAttempts"));
      const hasAttempts = attemptsSnap.docs.some(d => d.data().assessmentId === assessmentId);
      
      if (hasAttempts) {
        window.alert("Cannot delete this assessment because students have already attempted it. Deactivate it instead.");
        return;
      }

      // Check for questions and delete them (or warn)
      const questionsSnap = await getDocs(collection(db, "questions"));
      const hasQuestions = questionsSnap.docs.some(d => d.data().assessmentId === assessmentId);

      if (hasQuestions) {
         if (!window.confirm("This assessment has associated questions. Are you SURE you want to delete it? You will need to manually clean up the questions.")) return;
      }
      
      await deleteDoc(doc(db, "assessments", assessmentId));
      setAssessments(assessments.filter(a => a.id !== assessmentId));
    } catch (err) {
      console.error("Failed to delete assessment", err);
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
          <h1 className="text-3xl font-bold text-gray-900">Theory Assessments</h1>
          <p className="mt-2 text-gray-600">Manage assessments, timings, and passing criteria.</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Assessment
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
                  Assessment
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Skill & Level
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Configuration
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
              {filteredAssessments.length > 0 ? (
                filteredAssessments.map((assessment) => (
                  <tr key={assessment.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-emerald-100 rounded-lg flex items-center justify-center text-emerald-600">
                          <FileText className="h-5 w-5" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-bold text-gray-900">{assessment.title}</div>
                          <div className="text-xs text-gray-500 font-mono mt-0.5">ID: {assessment.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{getSkillName(assessment.skillId)}</div>
                      <div className="text-xs text-gray-500 capitalize mt-1 flex items-center">
                         {assessment.difficulty}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 flex items-center">
                         <Clock className="h-4 w-4 mr-1 text-gray-400" />
                         {assessment.timePerQuestionSeconds}s / question
                      </div>
                      <div className="text-xs text-gray-500 mt-1">Pass: {assessment.passingScore}%</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => toggleStatus(assessment)}
                        className={`relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                          assessment.active ? 'bg-green-500' : 'bg-gray-300'
                        }`}
                      >
                        <span className="sr-only">Toggle active status</span>
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200 ${
                            assessment.active ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                      <span className="ml-2 text-xs font-medium text-gray-500 align-text-bottom">
                        {assessment.active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Link
                        href={`/dashboard/admin/assessments/${assessment.id}/questions`}
                        className="text-emerald-600 hover:text-emerald-900 p-2 rounded-full hover:bg-emerald-50 mr-2 transition-colors inline-flex items-center"
                        title="Manage Questions"
                      >
                        <BookOpen className="h-4 w-4 mr-1" />
                        <span className="text-xs">Questions</span>
                      </Link>
                      <button
                        onClick={() => handleOpenModal(assessment)}
                        className="text-blue-600 hover:text-blue-900 p-2 rounded-full hover:bg-blue-50 mr-2 transition-colors"
                        title="Edit Assessment"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(assessment.id)}
                        className="text-red-600 hover:text-red-900 p-2 rounded-full hover:bg-red-50 transition-colors"
                        title="Delete Assessment"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    <FileText className="mx-auto h-12 w-12 text-gray-400 mb-3" />
                    <p className="text-lg font-medium text-gray-900">No assessments found</p>
                    <p className="text-sm text-gray-500">Add a new assessment to get started.</p>
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
              <form onSubmit={handleSaveAssessment}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4 max-h-[80vh] overflow-y-auto">
                  <div className="sm:flex sm:items-start">
                    <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                      <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                        {editingAssessment ? "Edit Assessment" : "Add New Assessment"}
                      </h3>
                      
                      {modalError && (
                        <div className="mt-4 bg-red-50 p-3 rounded-md flex items-start text-sm text-red-600">
                          <AlertCircle className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                          <span>{modalError}</span>
                        </div>
                      )}

                      <div className="mt-4 space-y-4">
                        {!editingAssessment && (
                          <div>
                            <label htmlFor="id" className="block text-sm font-medium text-gray-700">Assessment ID (Slug)</label>
                            <input
                              type="text"
                              id="id"
                              required
                              placeholder="e.g., python-fundamentals"
                              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                              value={formData.id}
                              onChange={(e) => setFormData({...formData, id: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')})}
                            />
                          </div>
                        )}
                        
                        <div>
                          <label htmlFor="skillId" className="block text-sm font-medium text-gray-700">Associated Skill</label>
                          <select
                            id="skillId"
                            required
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            value={formData.skillId}
                            onChange={(e) => setFormData({...formData, skillId: e.target.value})}
                          >
                            <option value="" disabled>Select a skill</option>
                            {skills.map(s => (
                              <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label htmlFor="title" className="block text-sm font-medium text-gray-700">Title</label>
                          <input
                            type="text"
                            id="title"
                            required
                            placeholder="e.g., Python Fundamentals"
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            value={formData.title}
                            onChange={(e) => setFormData({...formData, title: e.target.value})}
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

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label htmlFor="difficulty" className="block text-sm font-medium text-gray-700">Difficulty</label>
                            <select
                              id="difficulty"
                              required
                              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                              value={formData.difficulty}
                              onChange={(e) => setFormData({...formData, difficulty: e.target.value as any})}
                            >
                              <option value="beginner">Beginner</option>
                              <option value="intermediate">Intermediate</option>
                              <option value="advanced">Advanced</option>
                            </select>
                          </div>
                          <div>
                            <label htmlFor="passingScore" className="block text-sm font-medium text-gray-700">Passing Score (%)</label>
                            <input
                              type="number"
                              id="passingScore"
                              required
                              min="1"
                              max="100"
                              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                              value={formData.passingScore}
                              onChange={(e) => setFormData({...formData, passingScore: Number(e.target.value)})}
                            />
                          </div>
                        </div>

                        <div>
                          <label htmlFor="timePerQuestionSeconds" className="block text-sm font-medium text-gray-700">Time Per Question (Seconds)</label>
                          <input
                            type="number"
                            id="timePerQuestionSeconds"
                            required
                            min="5"
                            max="300"
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            value={formData.timePerQuestionSeconds}
                            onChange={(e) => setFormData({...formData, timePerQuestionSeconds: Number(e.target.value)})}
                          />
                          <p className="mt-1 text-xs text-gray-500">Standard is 30 seconds.</p>
                        </div>

                        <div className="flex items-center pt-2">
                          <input
                            id="active"
                            type="checkbox"
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            checked={formData.active}
                            onChange={(e) => setFormData({...formData, active: e.target.checked})}
                          />
                          <label htmlFor="active" className="ml-2 block text-sm text-gray-900">
                            Active (Requires at least 10 active questions)
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
                    {modalLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Save Assessment"}
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
