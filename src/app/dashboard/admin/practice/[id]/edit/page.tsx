"use client";

import { useState, useEffect, use } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { Loader2, ArrowLeft, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { PracticeProblem } from "@/types";

type Skill = { id: string; name: string };

export default function EditPracticeProblemPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const problemId = resolvedParams.id;
  const router = useRouter();
  
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    skillId: "",
    title: "",
    topic: "",
    description: "",
    difficulty: "beginner" as any,
    expectedOutput: "",
    active: true,
  });

  const [examples, setExamples] = useState<{input: string, output: string, explanation: string}[]>([
    { input: "", output: "", explanation: "" }
  ]);
  const [constraints, setConstraints] = useState<string[]>([""]);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const snap = await getDocs(collection(db, "skills"));
        setSkills(snap.docs.map(d => ({ id: d.id, name: d.data().name })));

        const problemRef = doc(db, "practiceProblems", problemId);
        const problemSnap = await getDoc(problemRef);
        if (problemSnap.exists()) {
          const data = problemSnap.data() as PracticeProblem;
          setFormData({
            skillId: data.skillId || "",
            title: data.title || "",
            topic: data.topic || "",
            description: data.description || "",
            difficulty: data.difficulty || "beginner",
            expectedOutput: data.expectedOutput || "",
            active: data.active ?? true,
          });
          if (data.examples && data.examples.length > 0) setExamples(data.examples as any);
          if (data.constraints && data.constraints.length > 0) setConstraints(data.constraints);
        } else {
          setError("Problem not found");
        }
      } catch (err: any) {
        setError(err.message || "Failed to load data");
      } finally {
        setLoading(false);
      }
    };
    
    fetchInitialData();
  }, [problemId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      if (!formData.skillId) throw new Error("Please select a skill");
      
      const cleanExamples = examples.filter(ex => ex.input.trim() || ex.output.trim());
      const cleanConstraints = constraints.filter(c => c.trim());

      await updateDoc(doc(db, "practiceProblems", problemId), {
        ...formData,
        examples: cleanExamples,
        constraints: cleanConstraints,
        updatedAt: serverTimestamp()
      });

      router.push("/dashboard/admin/practice");
    } catch (err: any) {
      setError(err.message || "Failed to update practice problem");
      setSaving(false);
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
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center space-x-4">
        <Link href="/dashboard/admin/practice" className="p-2 hover:bg-gray-100 rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Edit Practice Problem</h1>
          <p className="text-gray-500 text-sm mt-1">Update problem statement or test cases.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-lg text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Skill</label>
              <select
                required
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={formData.skillId}
                onChange={e => setFormData({ ...formData, skillId: e.target.value })}
              >
                <option value="" disabled>Select Skill</option>
                {skills.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Topic</label>
              <input
                required
                type="text"
                placeholder="e.g. Arrays, Functions, Joins"
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={formData.topic}
                onChange={e => setFormData({ ...formData, topic: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input
                required
                type="text"
                placeholder="Problem Title"
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={formData.title}
                onChange={e => setFormData({ ...formData, title: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Difficulty</label>
              <select
                required
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={formData.difficulty}
                onChange={e => setFormData({ ...formData, difficulty: e.target.value as any })}
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Problem Statement</label>
            <textarea
              required
              rows={4}
              placeholder="Describe the problem clearly..."
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-gray-700">Examples</label>
              <button
                type="button"
                onClick={() => setExamples([...examples, { input: "", output: "", explanation: "" }])}
                className="text-xs flex items-center text-blue-600 hover:text-blue-800"
              >
                <Plus className="w-3 h-3 mr-1" /> Add Example
              </button>
            </div>
            <div className="space-y-4">
              {examples.map((ex, i) => (
                <div key={i} className="flex gap-4 items-start p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex-1 space-y-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Input</label>
                      <input type="text" className="w-full p-1.5 text-sm border rounded" value={ex.input} onChange={e => {
                        const newEx = [...examples];
                        newEx[i].input = e.target.value;
                        setExamples(newEx);
                      }} />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Output</label>
                      <input type="text" className="w-full p-1.5 text-sm border rounded" value={ex.output} onChange={e => {
                        const newEx = [...examples];
                        newEx[i].output = e.target.value;
                        setExamples(newEx);
                      }} />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Explanation (Optional)</label>
                      <input type="text" className="w-full p-1.5 text-sm border rounded" value={ex.explanation} onChange={e => {
                        const newEx = [...examples];
                        newEx[i].explanation = e.target.value;
                        setExamples(newEx);
                      }} />
                    </div>
                  </div>
                  {examples.length > 1 && (
                    <button type="button" onClick={() => setExamples(examples.filter((_, idx) => idx !== i))} className="text-red-500 p-1 hover:bg-red-50 rounded">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-gray-700">Constraints</label>
              <button
                type="button"
                onClick={() => setConstraints([...constraints, ""])}
                className="text-xs flex items-center text-blue-600 hover:text-blue-800"
              >
                <Plus className="w-3 h-3 mr-1" /> Add Constraint
              </button>
            </div>
            <div className="space-y-2">
              {constraints.map((c, i) => (
                <div key={i} className="flex gap-2">
                  <input type="text" placeholder="e.g. 1 <= nums.length <= 10^4" className="flex-1 p-2 border border-gray-300 rounded-lg text-sm" value={c} onChange={e => {
                    const newC = [...constraints];
                    newC[i] = e.target.value;
                    setConstraints(newC);
                  }} />
                  {constraints.length > 1 && (
                    <button type="button" onClick={() => setConstraints(constraints.filter((_, idx) => idx !== i))} className="text-red-500 p-2 hover:bg-red-50 rounded-lg">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Expected Output String</label>
            <p className="text-xs text-gray-500 mb-2">For simplicity, this string will be matched against the student's submitted code or answer (case-insensitive includes). E.g. "SELECT * FROM users"</p>
            <input
              type="text"
              required
              placeholder="String that must be present in a correct answer"
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
              value={formData.expectedOutput}
              onChange={e => setFormData({ ...formData, expectedOutput: e.target.value })}
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="active"
              className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
              checked={formData.active}
              onChange={e => setFormData({ ...formData, active: e.target.checked })}
            />
            <label htmlFor="active" className="ml-2 text-sm text-gray-700">Active (Visible to students)</label>
          </div>

          <div className="pt-4 border-t border-gray-200 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center"
            >
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
