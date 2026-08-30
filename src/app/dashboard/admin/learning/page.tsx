"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import { Library, Plus, Search, Edit2 } from "lucide-react";
import Link from "next/link";
import { LearningTopic } from "@/types";

type Skill = {
  id: string;
  name: string;
};

export default function AdminLearningPage() {
  const [topics, setTopics] = useState<LearningTopic[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const skillsSnap = await getDocs(collection(db, "skills"));
        const skillsData = skillsSnap.docs.map(d => ({ id: d.id, name: d.data().name }));
        setSkills(skillsData);

        const topicsSnap = await getDocs(collection(db, "learningTopics"));
        const topicsData = topicsSnap.docs.map(d => ({ id: d.id, ...d.data() } as LearningTopic));
        
        // Sort by skill name, then order
        topicsData.sort((a, b) => {
          const aSkill = skillsData.find(s => s.id === a.skillId)?.name || a.skillId;
          const bSkill = skillsData.find(s => s.id === b.skillId)?.name || b.skillId;
          if (aSkill !== bSkill) return aSkill.localeCompare(bSkill);
          return (a.order || 0) - (b.order || 0);
        });
        
        setTopics(topicsData);
      } catch (error) {
        console.error("Error fetching learning topics:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filteredTopics = topics.filter(t => {
    const search = searchQuery.toLowerCase();
    const skillName = skills.find(s => s.id === t.skillId)?.name?.toLowerCase() || "";
    return (
      t.title.toLowerCase().includes(search) ||
      t.topic.toLowerCase().includes(search) ||
      skillName.includes(search)
    );
  });

  const getSkillName = (skillId: string) => {
    return skills.find(s => s.id === skillId)?.name || skillId;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Learning Content</h1>
          <p className="mt-1 text-sm text-gray-500">Manage structured learning topics for students.</p>
        </div>
        <Link
          href="/dashboard/admin/learning/create"
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <Plus className="-ml-1 mr-2 h-5 w-5" />
          Create Topic
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search topics..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Topic Info</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Skill</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">Loading topics...</td>
                </tr>
              ) : filteredTopics.length > 0 ? (
                filteredTopics.map((topic) => (
                  <tr key={topic.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <Library className="h-5 w-5 text-blue-600" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{topic.title}</div>
                          <div className="text-sm text-gray-500">{topic.topic} (Order: {topic.order})</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                        {getSkillName(topic.skillId)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        topic.active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                      }`}>
                        {topic.active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Link
                        href={`/dashboard/admin/learning/${topic.id}`}
                        className="text-blue-600 hover:text-blue-900 inline-flex items-center"
                      >
                        <Edit2 className="h-4 w-4 mr-1" />
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                    <Library className="mx-auto h-12 w-12 text-gray-400 mb-3" />
                    <p className="text-lg font-medium text-gray-900">No learning topics found</p>
                    <p className="text-sm">Get started by creating a new topic.</p>
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
