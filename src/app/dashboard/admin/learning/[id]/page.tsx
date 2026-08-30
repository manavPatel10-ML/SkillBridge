"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc, collection, getDocs, serverTimestamp, deleteDoc } from "firebase/firestore";
import { ArrowLeft, Save, Loader2, AlertCircle, Trash2 } from "lucide-react";
import Link from "next/link";
import { LearningTopic } from "@/types";

type Skill = {
  id: string;
  name: string;
};

export default function EditLearningTopicPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const [formData, setFormData] = useState({
    skillId: "",
    topic: "",
    title: "",
    overview: "",
    concepts: "",
    examples: "",
    commonMistakes: "",
    order: 0,
    active: true
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const skillsSnap = await getDocs(collection(db, "skills"));
        setSkills(skillsSnap.docs.map(d => ({ id: d.id, name: d.data().name })));

        const topicSnap = await getDoc(doc(db, "learningTopics", params.id));
        if (topicSnap.exists()) {
          const data = topicSnap.data() as LearningTopic;
          setFormData({
            skillId: data.skillId || "",
            topic: data.topic || "",
            title: data.title || "",
            overview: data.overview || "",
            concepts: data.concepts || "",
            examples: data.examples || "",
            commonMistakes: data.commonMistakes || "",
            order: data.order || 0,
            active: data.active ?? true
          });
        } else {
          setError("Learning topic not found.");
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setFetching(false);
      }
    };
    fetchData();
  }, [params.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formData.skillId || !formData.topic || !formData.title || !formData.overview) {
      setError("Please fill in all required fields (Skill, Topic, Title, Overview).");
      return;
    }

    setLoading(true);
    try {
      const topicData = {
        ...formData,
        order: Number(formData.order),
        updatedAt: serverTimestamp(),
      };

      await updateDoc(doc(db, "learningTopics", params.id), topicData);
      router.push("/dashboard/admin/learning");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to update learning topic.");
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this topic? This cannot be undone.")) return;
    
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, "learningTopics", params.id));
      router.push("/dashboard/admin/learning");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to delete topic.");
      setIsDeleting(false);
    }
  };

  if (fetching) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error && !formData.skillId) {
    return (
      <div className="text-center mt-12">
        <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Error Loading Topic</h2>
        <p className="text-gray-500 mb-6">{error}</p>
        <Link href="/dashboard/admin/learning" className="text-blue-600 hover:underline">
          Return to Learning Content
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link
            href="/dashboard/admin/learning"
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-gray-500" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Edit Learning Topic</h1>
            <p className="mt-1 text-sm text-gray-500">Update structured knowledge for students.</p>
          </div>
        </div>
        
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
        >
          {isDeleting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Trash2 className="h-4 w-4 mr-1" />}
          Delete Topic
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-md flex items-start">
          <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 mr-3 flex-shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 bg-white shadow-sm rounded-xl border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Target Skill <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.skillId}
              onChange={(e) => setFormData(prev => ({ ...prev, skillId: e.target.value }))}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              required
            >
              {skills.map(skill => (
                <option key={skill.id} value={skill.id}>{skill.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Topic Group <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.topic}
              onChange={(e) => setFormData(prev => ({ ...prev, topic: e.target.value }))}
              placeholder="e.g. Variables, OOP, Functions"
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              required
            />
            <p className="mt-1 text-xs text-gray-500">Must exactly match the practice problem topic.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Display Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="e.g. Introduction to Object-Oriented Programming"
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Order
            </label>
            <input
              type="number"
              value={formData.order}
              onChange={(e) => setFormData(prev => ({ ...prev, order: Number(e.target.value) }))}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Overview <span className="text-red-500">*</span>
          </label>
          <textarea
            value={formData.overview}
            onChange={(e) => setFormData(prev => ({ ...prev, overview: e.target.value }))}
            rows={3}
            placeholder="A brief introduction to the topic..."
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 font-mono text-sm"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Key Concepts (Markdown)
          </label>
          <textarea
            value={formData.concepts}
            onChange={(e) => setFormData(prev => ({ ...prev, concepts: e.target.value }))}
            rows={5}
            placeholder="- Concept 1...&#10;- Concept 2..."
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 font-mono text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Examples (Markdown/Code)
          </label>
          <textarea
            value={formData.examples}
            onChange={(e) => setFormData(prev => ({ ...prev, examples: e.target.value }))}
            rows={5}
            placeholder="```python&#10;def hello():&#10;    pass&#10;```"
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 font-mono text-sm bg-gray-50"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Common Mistakes (Markdown)
          </label>
          <textarea
            value={formData.commonMistakes}
            onChange={(e) => setFormData(prev => ({ ...prev, commonMistakes: e.target.value }))}
            rows={4}
            placeholder="- Forgetting to return a value...&#10;- Off-by-one errors..."
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 font-mono text-sm"
          />
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="active"
            checked={formData.active}
            onChange={(e) => setFormData(prev => ({ ...prev, active: e.target.checked }))}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="active" className="ml-2 block text-sm text-gray-900">
            Topic is active and visible to students
          </label>
        </div>

        <div className="pt-5 border-t border-gray-200 flex justify-end">
          <Link
            href="/dashboard/admin/learning"
            className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 mr-3"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {loading ? (
              <><Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5" /> Saving...</>
            ) : (
              <><Save className="-ml-1 mr-2 h-5 w-5" /> Update Topic</>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
