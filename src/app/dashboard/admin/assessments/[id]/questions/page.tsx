"use client";

import { useEffect, useState, useMemo, use } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, setDoc, deleteDoc, serverTimestamp, updateDoc, getDoc } from "firebase/firestore";
import { Loader2, Search, Plus, Edit2, Trash2, ArrowLeft, AlertCircle, HelpCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Question = {
  id: string;
  assessmentId: string;
  skillId: string;
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  difficulty: "easy" | "medium" | "hard";
  points: number;
  active: boolean;
};

type Assessment = {
  id: string;
  title: string;
  skillId: string;
  active: boolean;
};

export default function AdminAssessmentQuestionsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: assessmentId } = use(params);
  const router = useRouter();

  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  
  const [formData, setFormData] = useState<{
    question: string;
    options: string[];
    correctAnswer: string;
    explanation: string;
    difficulty: "easy" | "medium" | "hard";
    points: number;
    active: boolean;
  }>({
    question: "",
    options: ["", "", "", ""],
    correctAnswer: "",
    explanation: "",
    difficulty: "medium",
    points: 10,
    active: true
  });
  
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch assessment info
      const aSnap = await getDoc(doc(db, "assessments", assessmentId));
      if (!aSnap.exists()) {
        router.push("/dashboard/admin/assessments");
        return;
      }
      setAssessment({ id: aSnap.id, ...aSnap.data() } as Assessment);

      // Fetch questions
      const qSnap = await getDocs(query(collection(db, "questions"), where("assessmentId", "==", assessmentId)));
      const qData = qSnap.docs.map(d => ({ id: d.id, ...d.data() } as Question));
      setQuestions(qData);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [assessmentId]);

  const filteredQuestions = useMemo(() => {
    if (!searchQuery) return questions;
    const lower = searchQuery.toLowerCase();
    return questions.filter(
      (q) =>
        q.question.toLowerCase().includes(lower) ||
        q.explanation.toLowerCase().includes(lower)
    );
  }, [questions, searchQuery]);

  const handleOpenModal = (question?: Question) => {
    if (question) {
      setEditingQuestion(question);
      setFormData({
        question: question.question,
        options: [...question.options],
        correctAnswer: question.correctAnswer,
        explanation: question.explanation || "",
        difficulty: question.difficulty,
        points: question.points || 10,
        active: question.active
      });
    } else {
      setEditingQuestion(null);
      setFormData({
        question: "",
        options: ["", "", "", ""],
        correctAnswer: "",
        explanation: "",
        difficulty: "medium",
        points: 10,
        active: true
      });
    }
    setModalError("");
    setIsModalOpen(true);
  };

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...formData.options];
    newOptions[index] = value;
    setFormData({ ...formData, options: newOptions });
  };

  const addOption = () => {
    setFormData({ ...formData, options: [...formData.options, ""] });
  };

  const removeOption = (index: number) => {
    if (formData.options.length <= 2) return;
    const newOptions = formData.options.filter((_, i) => i !== index);
    setFormData({ ...formData, options: newOptions });
    
    // If the removed option was the correct answer, reset it
    if (formData.correctAnswer && !newOptions.includes(formData.correctAnswer)) {
      setFormData(prev => ({ ...prev, correctAnswer: "" }));
    }
  };

  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalLoading(true);
    setModalError("");

    try {
      if (!assessment) throw new Error("Assessment not loaded");

      // Validation
      const filledOptions = formData.options.filter(o => o.trim() !== "");
      if (filledOptions.length < 2) {
        throw new Error("You must provide at least 2 valid options.");
      }
      
      const hasDuplicates = new Set(filledOptions).size !== filledOptions.length;
      if (hasDuplicates) {
        throw new Error("Options must be unique.");
      }

      if (!filledOptions.includes(formData.correctAnswer)) {
        throw new Error("Correct answer must match one of the provided options exactly.");
      }

      // Check if deactivating this drops the active count below 10 for an active assessment
      if (!formData.active && assessment.active) {
        const activeCount = questions.filter(q => q.active && (editingQuestion ? q.id !== editingQuestion.id : true)).length;
        if (activeCount < 10) {
          throw new Error("Cannot deactivate this question. The assessment is currently active and must maintain at least 10 active questions.");
        }
      }

      const questionData = {
        assessmentId: assessment.id,
        skillId: assessment.skillId,
        question: formData.question,
        options: filledOptions,
        correctAnswer: formData.correctAnswer,
        explanation: formData.explanation,
        difficulty: formData.difficulty,
        points: Number(formData.points),
        active: formData.active
      };

      if (editingQuestion) {
        const qRef = doc(db, "questions", editingQuestion.id);
        await updateDoc(qRef, questionData);
      } else {
        const newRef = doc(collection(db, "questions"));
        await setDoc(newRef, {
          ...questionData,
          createdAt: serverTimestamp()
        });
      }

      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      setModalError(err.message || "Failed to save question.");
    } finally {
      setModalLoading(false);
    }
  };

  const toggleStatus = async (question: Question) => {
    try {
      if (!assessment) return;

      if (question.active && assessment.active) {
        const activeCount = questions.filter(q => q.active).length;
        if (activeCount <= 10) {
          window.alert("Cannot deactivate this question. The assessment is currently active and must maintain at least 10 active questions.");
          return;
        }
      }

      const qRef = doc(db, "questions", question.id);
      await updateDoc(qRef, { active: !question.active });
      setQuestions(questions.map(q => q.id === question.id ? { ...q, active: !q.active } : q));
    } catch (err) {
      console.error("Failed to toggle status", err);
      window.alert("Failed to toggle status.");
    }
  };

  const handleDelete = async (question: Question) => {
    if (!assessment) return;
    
    if (question.active && assessment.active) {
      const activeCount = questions.filter(q => q.active).length;
      if (activeCount <= 10) {
        window.alert("Cannot delete this active question while the assessment is active (must maintain at least 10). Deactivate the assessment first.");
        return;
      }
    }

    if (!window.confirm("Are you sure you want to delete this question? This action cannot be undone.")) return;
    
    try {
      await deleteDoc(doc(db, "questions", question.id));
      setQuestions(questions.filter(q => q.id !== question.id));
    } catch (err) {
      console.error("Failed to delete question", err);
      window.alert("An error occurred while deleting.");
    }
  };

  if (loading || !assessment) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  const activeCount = questions.filter(q => q.active).length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <div>
        <Link 
          href="/dashboard/admin/assessments"
          className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-500 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Assessments
        </Link>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Questions: {assessment.title}</h1>
            <p className="mt-2 text-gray-600">
              Manage the question bank for this assessment. Currently <b>{activeCount}</b> active questions.
              {assessment.active && activeCount < 10 && (
                <span className="text-red-600 ml-2 font-medium bg-red-50 px-2 py-0.5 rounded">
                  WARNING: Active assessment with less than 10 active questions.
                </span>
              )}
            </p>
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Question
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search questions or explanations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        <div className="divide-y divide-gray-200">
          {filteredQuestions.length > 0 ? (
            filteredQuestions.map((q, index) => (
              <div key={q.id} className="p-6 hover:bg-gray-50 transition-colors flex flex-col sm:flex-row gap-6">
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <h3 className="text-lg font-bold text-gray-900 mb-2">
                      <span className="text-gray-400 mr-2">Q{index + 1}.</span>
                      {q.question}
                    </h3>
                    <div className="flex flex-col items-end gap-2 ml-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium uppercase ${
                        q.difficulty === 'easy' ? 'bg-green-100 text-green-800' :
                        q.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {q.difficulty}
                      </span>
                      <span className="text-sm font-medium text-gray-500">{q.points} pts</span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                    {q.options.map((opt, i) => (
                      <div 
                        key={i} 
                        className={`p-3 rounded-lg border ${opt === q.correctAnswer ? 'border-green-500 bg-green-50' : 'border-gray-200 bg-white'}`}
                      >
                        <span className={`text-sm ${opt === q.correctAnswer ? 'font-medium text-green-800' : 'text-gray-600'}`}>
                          {opt}
                        </span>
                        {opt === q.correctAnswer && <span className="ml-2 text-xs font-bold text-green-600 uppercase tracking-wide">Correct</span>}
                      </div>
                    ))}
                  </div>
                  
                  {q.explanation && (
                    <div className="mt-4 p-4 bg-blue-50 rounded-lg text-sm text-blue-800 flex items-start">
                      <HelpCircle className="h-5 w-5 mr-2 text-blue-500 flex-shrink-0" />
                      <div>
                        <strong>Explanation:</strong> {q.explanation}
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="flex sm:flex-col items-center justify-start sm:justify-start gap-4 sm:w-32 border-t sm:border-t-0 sm:border-l border-gray-200 pt-4 sm:pt-0 sm:pl-6">
                  <div className="flex flex-col items-center">
                    <span className="text-xs text-gray-500 mb-1">Status</span>
                    <button
                      onClick={() => toggleStatus(q)}
                      className={`relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                        q.active ? 'bg-green-500' : 'bg-gray-300'
                      }`}
                    >
                      <span className="sr-only">Toggle active status</span>
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200 ${
                          q.active ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                    <span className="mt-1 text-xs font-medium text-gray-500 text-center">
                      {q.active ? "Active" : "Inactive"}
                    </span>
                  </div>
                  
                  <div className="flex sm:flex-col gap-2 w-full mt-auto">
                    <button
                      onClick={() => handleOpenModal(q)}
                      className="flex-1 flex justify-center items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                    >
                      <Edit2 className="h-4 w-4 sm:mr-2" />
                      <span className="hidden sm:inline">Edit</span>
                    </button>
                    <button
                      onClick={() => handleDelete(q)}
                      className="flex-1 flex justify-center items-center px-3 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
                    >
                      <Trash2 className="h-4 w-4 sm:mr-2" />
                      <span className="hidden sm:inline">Delete</span>
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="px-6 py-12 text-center text-gray-500">
              <HelpCircle className="mx-auto h-12 w-12 text-gray-400 mb-3" />
              <p className="text-lg font-medium text-gray-900">No questions found</p>
              <p className="text-sm text-gray-500">Add some questions to this assessment's bank.</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={() => setIsModalOpen(false)}></div>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl w-full">
              <form onSubmit={handleSaveQuestion}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4 max-h-[80vh] overflow-y-auto">
                  <div className="sm:flex sm:items-start">
                    <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                      <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                        {editingQuestion ? "Edit Question" : "Add New Question"}
                      </h3>
                      
                      {modalError && (
                        <div className="mt-4 bg-red-50 p-3 rounded-md flex items-start text-sm text-red-600">
                          <AlertCircle className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                          <span>{modalError}</span>
                        </div>
                      )}

                      <div className="mt-6 space-y-6">
                        <div>
                          <label htmlFor="question" className="block text-sm font-medium text-gray-700">Question Text</label>
                          <textarea
                            id="question"
                            required
                            rows={3}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            value={formData.question}
                            onChange={(e) => setFormData({...formData, question: e.target.value})}
                          />
                        </div>

                        <div>
                          <div className="flex justify-between items-center mb-2">
                            <label className="block text-sm font-medium text-gray-700">Options</label>
                            {formData.options.length < 6 && (
                              <button
                                type="button"
                                onClick={addOption}
                                className="text-xs text-blue-600 font-medium flex items-center hover:text-blue-800"
                              >
                                <Plus className="h-3 w-3 mr-1" /> Add Option
                              </button>
                            )}
                          </div>
                          
                          <div className="space-y-3">
                            {formData.options.map((opt, idx) => (
                              <div key={idx} className="flex items-center gap-2">
                                <span className="text-sm font-medium text-gray-500 w-6">{idx + 1}.</span>
                                <input
                                  type="text"
                                  required
                                  placeholder={`Option ${idx + 1}`}
                                  className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                  value={opt}
                                  onChange={(e) => handleOptionChange(idx, e.target.value)}
                                />
                                {formData.options.length > 2 && (
                                  <button
                                    type="button"
                                    onClick={() => removeOption(idx)}
                                    className="p-2 text-gray-400 hover:text-red-500"
                                    title="Remove option"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                )}
                                <div className="flex items-center ml-2">
                                  <input
                                    type="radio"
                                    name="correctAnswer"
                                    required
                                    className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300"
                                    checked={formData.correctAnswer === opt && opt !== ""}
                                    onChange={() => setFormData({...formData, correctAnswer: opt})}
                                    disabled={!opt.trim()}
                                  />
                                  <span className="ml-2 text-xs text-gray-500">Correct</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div>
                          <label htmlFor="explanation" className="block text-sm font-medium text-gray-700">Explanation (Optional)</label>
                          <textarea
                            id="explanation"
                            rows={2}
                            placeholder="Explain why the answer is correct..."
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            value={formData.explanation}
                            onChange={(e) => setFormData({...formData, explanation: e.target.value})}
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
                              <option value="easy">Easy</option>
                              <option value="medium">Medium</option>
                              <option value="hard">Hard</option>
                            </select>
                          </div>
                          <div>
                            <label htmlFor="points" className="block text-sm font-medium text-gray-700">Points</label>
                            <input
                              type="number"
                              id="points"
                              required
                              min="1"
                              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                              value={formData.points}
                              onChange={(e) => setFormData({...formData, points: Number(e.target.value)})}
                            />
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
                          <label htmlFor="active" className="ml-2 block text-sm text-gray-900">
                            Active (Can be selected for student assessments)
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse border-t border-gray-200">
                  <button
                    type="submit"
                    disabled={modalLoading}
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                  >
                    {modalLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Save Question"}
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
