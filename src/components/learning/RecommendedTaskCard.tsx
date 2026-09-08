import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BookOpen, FileText, Code, ArrowRight, Play, Briefcase, Loader2 } from 'lucide-react';
import { RecommendedTask } from '@/types';
import { auth } from '@/lib/firebase';

interface RecommendedTaskCardProps {
  task: RecommendedTask;
  isHero?: boolean;
}

export function RecommendedTaskCard({ task, isHero = false }: RecommendedTaskCardProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  
  const getIcon = () => {
    switch (task.type) {
      case 'learning': return <BookOpen className={isHero ? "h-8 w-8 text-blue-600" : "h-5 w-5 text-blue-500"} />;
      case 'assessment': return <FileText className={isHero ? "h-8 w-8 text-indigo-600" : "h-5 w-5 text-indigo-500"} />;
      case 'practice': return <Code className={isHero ? "h-8 w-8 text-emerald-600" : "h-5 w-5 text-emerald-500"} />;
      case 'challenge': return <Briefcase className={isHero ? "h-8 w-8 text-orange-600" : "h-5 w-5 text-orange-500"} />;
      case 'practical': return <Code className={isHero ? "h-8 w-8 text-purple-600" : "h-5 w-5 text-purple-500"} />;
    }
  };

  const getBadgeColor = () => {
    switch (task.type) {
      case 'learning': return 'bg-blue-100 text-blue-800';
      case 'assessment': return 'bg-indigo-100 text-indigo-800';
      case 'practice': return 'bg-emerald-100 text-emerald-800';
      case 'challenge': return 'bg-orange-100 text-orange-800';
      case 'practical': return 'bg-purple-100 text-purple-800';
    }
  };

  const getActionLink = () => {
    let base = '';
    switch (task.type) {
      case 'learning': base = `/dashboard/student/learn/${task.itemId}`; break;
      case 'assessment': base = `/dashboard/student/assessments/${task.itemId}`; break;
      case 'practice': base = `/dashboard/student/practice/${task.itemId}`; break;
      case 'challenge': base = `/dashboard/student/company-challenges/${task.itemId}`; break;
      case 'practical': base = `/dashboard/student/practical-tasks/${task.itemId}`; break;
    }
    return task.recommendationId ? `${base}?recId=${task.recommendationId}` : base;
  };

  const getActionText = () => {
    switch (task.type) {
      case 'learning': return 'Read Topic';
      case 'assessment': return 'Take Assessment';
      case 'practice': return 'Start Practice';
      case 'challenge': return 'View Challenge';
      case 'practical': return 'Start Practical';
    }
  };

  const handleStart = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);

    try {
      if (task.recommendationId && auth.currentUser) {
        const token = await auth.currentUser.getIdToken();
        await fetch('/api/ml-telemetry/record', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            recommendationId: task.recommendationId,
            topicId: task.type === 'learning' ? task.itemId : null,
            skillId: task.skillId,
            taskId: task.itemId,
            taskType: task.type,
            difficulty: 'UNKNOWN', // Extract from metadata if possible
            priorityScore: task.priorityScore,
            reason: task.reason
          })
        });
      }
    } catch (err) {
      console.error("Failed to record telemetry", err);
    } finally {
      router.push(getActionLink());
    }
  };

  if (isHero) {
    return (
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 sm:p-8 border border-blue-100 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-blue-500 opacity-5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 -mb-4 -ml-4 w-32 h-32 bg-indigo-500 opacity-5 rounded-full blur-3xl"></div>
        
        <div className="flex flex-col md:flex-row gap-6 items-start md:items-center relative z-10">
          <div className="flex-shrink-0 h-16 w-16 bg-white rounded-2xl shadow-sm border border-gray-100 flex items-center justify-center">
            {getIcon()}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wide ${getBadgeColor()}`}>
                Next Best Action
              </span>
              <span className="text-sm font-medium text-gray-500 uppercase tracking-wider">{task.type}</span>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">{task.title}</h3>
            <p className="text-gray-600 mb-4 text-lg">{task.description}</p>
            <div className="bg-white/60 rounded-lg p-3 border border-white flex items-start gap-2 max-w-2xl">
              <div className="mt-0.5 text-blue-500 shrink-0">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4"></path><path d="M12 8h.01"></path></svg>
              </div>
              <p className="text-sm text-gray-700 font-medium">Why? {task.reason}</p>
            </div>
          </div>
          <div className="mt-4 md:mt-0">
            <button 
              onClick={handleStart}
              disabled={loading}
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-xl shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all hover:scale-105 disabled:opacity-70 disabled:hover:scale-100"
            >
              {loading ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <Play className="h-5 w-5 mr-2" />}
              {getActionText()}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm hover:shadow-md transition-shadow flex flex-col h-full">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${
            task.type === 'learning' ? 'bg-blue-50' :
            task.type === 'assessment' ? 'bg-indigo-50' :
            task.type === 'challenge' ? 'bg-orange-50' :
            'bg-emerald-50'
          }`}>
            {getIcon()}
          </div>
          <span className={`px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wider ${getBadgeColor()}`}>
            {task.type}
          </span>
        </div>
        <span className="text-xs font-medium text-gray-400">Score: {task.priorityScore}</span>
      </div>
      
      <h4 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2">{task.title}</h4>
      <p className="text-sm text-gray-600 mb-4 line-clamp-3 flex-1">{task.description}</p>
      
      <div className="bg-gray-50 rounded-md p-3 mb-4 text-xs text-gray-700 border border-gray-100">
        <span className="font-semibold block mb-1">Recommendation Reason:</span>
        {task.reason}
      </div>
      
      <button 
        onClick={handleStart}
        disabled={loading}
        className="mt-auto w-full inline-flex justify-center items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-70"
      >
        {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : getActionText()}
        {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
      </button>
    </div>
  );
}
