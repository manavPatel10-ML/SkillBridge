"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import { Loader2, Library, BookOpen, ChevronRight, Lock } from "lucide-react";
import Link from "next/link";
import { LearningTopic } from "@/types";
import { useAuth } from "@/contexts/AuthContext";

type Skill = {
  id: string;
  name: string;
};

export default function StudentLearnPage() {
  const { user } = useAuth();
  const [skills, setSkills] = useState<Skill[]>([]);
  const [topics, setTopics] = useState<LearningTopic[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const skillsSnap = await getDocs(collection(db, "skills"));
        const skillsData = skillsSnap.docs.map(d => ({ id: d.id, name: d.data().name }));
        setSkills(skillsData);

        const topicsQ = query(collection(db, "learningTopics"), where("active", "==", true));
        const topicsSnap = await getDocs(topicsQ);
        const topicsData = topicsSnap.docs.map(d => ({ id: d.id, ...d.data() } as LearningTopic));
        
        // Sort by order
        topicsData.sort((a, b) => (a.order || 0) - (b.order || 0));
        
        setTopics(topicsData);
      } catch (error) {
        console.error("Error fetching learning data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  const skillsWithTopics = skills.filter(skill => 
    topics.some(topic => topic.skillId === skill.id)
  );

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Learning Center</h1>
        <p className="mt-2 text-gray-600">Review structured technical concepts before diving into practice.</p>
      </div>

      {skillsWithTopics.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <Library className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">No Learning Content Available</h2>
          <p className="text-gray-500 mb-6">Check back later for new technical learning materials.</p>
          <Link
            href="/dashboard/student/practice"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            Go to Coding Practice
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {skillsWithTopics.map(skill => {
            const skillTopics = topics.filter(t => t.skillId === skill.id);
            return (
              <div key={skill.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-gray-50 border-b border-gray-200 p-4">
                  <h2 className="text-xl font-bold text-gray-900 flex items-center">
                    <BookOpen className="h-5 w-5 mr-2 text-blue-600" />
                    {skill.name}
                  </h2>
                </div>
                <div className="divide-y divide-gray-100">
                  {skillTopics.map((topic, index) => (
                    <Link
                      key={topic.id}
                      href={`/dashboard/student/learn/${topic.id}`}
                      className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors group"
                    >
                      <div className="flex items-center">
                        <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm mr-4">
                          {index + 1}
                        </div>
                        <div>
                          <h3 className="text-md font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                            {topic.title}
                          </h3>
                          <p className="text-sm text-gray-500">{topic.topic}</p>
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
