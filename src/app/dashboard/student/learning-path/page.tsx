"use client";

import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import { RecommendedTask } from "@/types";
import { Loader2, Zap, GraduationCap } from "lucide-react";
import Link from "next/link";

import { useAuth } from "@/contexts/AuthContext";
import { RecommendedTaskCard } from "@/components/learning/RecommendedTaskCard";

export default function StudentLearningPathPage() {
  const { user } = useAuth();
  const [recommendations, setRecommendations] = useState<RecommendedTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const fetchAllData = async () => {
      setLoading(true);
      try {
        const token = await auth.currentUser?.getIdToken();
        const res = await fetch('/api/recommendations/generate', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!res.ok) {
          throw new Error('Failed to fetch recommendations');
        }
        
        const data = await res.json();
        setRecommendations(data.recommendations || []);
      } catch (err: any) {
        console.error("Error generating recommendations:", err);
        setError(err.message || "Failed to load adaptive learning path.");
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, [user]);

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-64 gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        <p className="text-gray-500 text-sm animate-pulse">Analyzing your performance and generating next best actions...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 p-6 rounded-xl border border-red-100 text-center">
        <p className="text-red-700 font-medium">{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-white text-red-600 rounded-md border border-red-200 shadow-sm hover:bg-red-50"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (recommendations.length === 0) {
    return (
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Adaptive Learning Path</h1>
          <p className="mt-2 text-gray-600">Your personalized journey based on your skill progress and mastery.</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <GraduationCap className="mx-auto h-16 w-16 text-blue-300 mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">You're All Caught Up!</h2>
          <p className="text-gray-500 max-w-md mx-auto mb-6">
            We don't have any specific recommendations for you right now. Try exploring the skill catalog to start a new learning journey.
          </p>
          <Link
            href="/dashboard/student/skills"
            className="inline-flex items-center px-6 py-3 border border-transparent rounded-xl shadow-sm text-base font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            Explore Skills
          </Link>
        </div>
      </div>
    );
  }

  const [heroTask, ...otherTasks] = recommendations;

  return (
    <div className="max-w-5xl mx-auto space-y-10">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <Zap className="h-8 w-8 text-yellow-500" />
          Adaptive Learning Path
        </h1>
        <p className="mt-2 text-gray-600">Your personalized journey dynamically generated based on your performance, knowledge gaps, and verified skills.</p>
      </div>

      <section>
        <h2 className="sr-only">Next Best Action</h2>
        <RecommendedTaskCard task={heroTask} isHero={true} />
      </section>

      {otherTasks.length > 0 && (
        <section className="space-y-6">
          <div className="flex items-center justify-between border-b border-gray-200 pb-2">
            <h2 className="text-xl font-bold text-gray-900">Up Next in Your Queue</h2>
            <span className="text-sm font-medium text-gray-500">{otherTasks.length} tasks generated</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {otherTasks.map((task, idx) => (
              <RecommendedTaskCard key={`${task.id}-${idx}`} task={task} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
