"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where, getDoc, doc } from "firebase/firestore";
import { Loader2, Code, Clock, Activity, Search, Filter } from "lucide-react";
import Link from "next/link";

type PracticalTask = {
  id: string;
  skillId: string;
  title: string;
  description: string;
  difficulty: string;
  durationMinutes: number;
};

type Skill = {
  id: string;
  name: string;
};

export default function PracticalTasksPage() {
  const { user } = useAuth();
  
  const [tasks, setTasks] = useState<PracticalTask[]>([]);
  const [skills, setSkills] = useState<Record<string, Skill>>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const [studentSkillIds, setStudentSkillIds] = useState<string[]>([]);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      try {
        // Fetch Student Profile for selected skills
        const profileRef = doc(db, "studentProfiles", user.uid);
        const profileSnap = await getDoc(profileRef);
        let selectedSkills: string[] = [];
        if (profileSnap.exists()) {
          selectedSkills = profileSnap.data().selectedSkills || [];
          setStudentSkillIds(selectedSkills);
        }

        // Fetch all active practical tasks
        const tasksSnap = await getDocs(
          query(collection(db, "practicalTasks"), where("active", "==", true))
        );
        const tasksData = tasksSnap.docs.map(d => ({ id: d.id, ...d.data() } as PracticalTask));
        
        // Fetch skills mapping
        const skillsSnap = await getDocs(collection(db, "skills"));
        const skillsMap: Record<string, Skill> = {};
        skillsSnap.forEach(d => {
          skillsMap[d.id] = { id: d.id, ...d.data() } as Skill;
        });
        setSkills(skillsMap);

        // Filter tasks based on student's selected skills
        const availableTasks = tasksData.filter(
          (task) => selectedSkills.includes(task.skillId)
        );
        
        setTasks(availableTasks);

      } catch (error) {
        console.error("Error fetching practical tasks:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const filteredSkillIds = studentSkillIds.filter(skillId => {
    const skill = skills[skillId];
    const task = tasks.find(t => t.skillId === skillId);
    const search = searchTerm.toLowerCase();
    
    if (skill?.name.toLowerCase().includes(search)) return true;
    if (task?.title.toLowerCase().includes(search)) return true;
    if (task?.description.toLowerCase().includes(search)) return true;
    
    return false;
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Practical Tasks</h1>
          <p className="mt-2 text-gray-600">Apply your knowledge with real-world scenarios.</p>
        </div>
        
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            placeholder="Search tasks..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredSkillIds.length > 0 ? (
          filteredSkillIds.map(skillId => {
            const skill = skills[skillId];
            const task = tasks.find(t => t.skillId === skillId);
            const isSupported = !!task;

            if (isSupported) {
              return (
                <div key={task.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow flex flex-col">
                  <div className="p-6 flex-grow">
                    <div className="flex justify-between items-start mb-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {skill?.name || task.skillId}
                      </span>
                      <span className="inline-flex items-center text-xs text-gray-500 font-medium">
                        <Activity className="w-3 h-3 mr-1" />
                        {task.difficulty}
                      </span>
                    </div>
                    
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{task.title}</h3>
                    <p className="text-sm text-gray-600 line-clamp-3 mb-4">{task.description}</p>
                    
                    <div className="flex items-center space-x-4 text-sm text-gray-500 mb-6">
                      <span className="flex items-center">
                        <Clock className="w-4 h-4 mr-1.5 text-gray-400" />
                        {task.durationMinutes} Minutes
                      </span>
                    </div>
                  </div>
                  
                  <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
                    <Link
                      href={`/dashboard/student/practical-tasks/${task.id}`}
                      className="w-full flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      View Task
                    </Link>
                  </div>
                </div>
              );
            } else {
              return (
                <div key={skillId} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col opacity-80">
                  <div className="p-6 flex-grow flex flex-col items-center justify-center text-center space-y-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 self-start">
                      {skill?.name || skillId}
                    </span>
                    <div className="bg-orange-50 p-4 rounded-full mt-4">
                      <Clock className="w-8 h-8 text-orange-500" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">Curriculum in Development</h3>
                      <p className="text-sm text-gray-500 mt-2 max-w-[240px] mx-auto">
                        Practical projects for this skill are in development. Explore our active Frontend, Backend, or Full Stack tracks.
                      </p>
                    </div>
                  </div>
                  
                  <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
                    <Link
                      href="/dashboard/student/roles"
                      className="w-full flex justify-center items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                    >
                      Explore Career Tracks
                    </Link>
                  </div>
                </div>
              );
            }
          })
        ) : (
          <div className="col-span-full flex flex-col items-center justify-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
            <Filter className="w-12 h-12 text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900">No practical tasks found</h3>
            <p className="mt-1 text-gray-500">
              {studentSkillIds.length === 0 
                ? "You haven't added any skills yet. Go to My Skills to add some."
                : "No tasks match your search criteria."}
            </p>
            {studentSkillIds.length === 0 && (
              <div className="mt-6">
                <Link
                  href="/dashboard/student/skills"
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none"
                >
                  <Code className="w-4 h-4 mr-2" />
                  Add Skills
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
