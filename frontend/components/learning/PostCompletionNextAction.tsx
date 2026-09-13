"use client";

import React from 'react';
import Link from 'next/link';
import { 
  CheckCircle2, 
  ArrowRight, 
  Zap, 
  BookOpen, 
  Code, 
  FileText, 
  Award, 
  Clock, 
  Sparkles,
  RotateCcw
} from 'lucide-react';
import { NextActionRecommendation } from '@/lib/pilot-engagement-audit';

interface PostCompletionNextActionProps {
  score: number;
  maxScore?: number;
  passed: boolean;
  taskTitle: string;
  nextAction: NextActionRecommendation;
  onRetake?: () => void;
  onReview?: () => void;
  showReviewButton?: boolean;
}

export function PostCompletionNextAction({
  score,
  maxScore = 100,
  passed,
  taskTitle,
  nextAction,
  onRetake,
  onReview,
  showReviewButton = true
}: PostCompletionNextActionProps) {
  const percentage = Math.round((score / maxScore) * 100);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'learning':
        return <BookOpen className="w-5 h-5 text-blue-600" />;
      case 'assessment':
        return <FileText className="w-5 h-5 text-indigo-600" />;
      case 'practice':
        return <Code className="w-5 h-5 text-emerald-600" />;
      case 'practical':
        return <Award className="w-5 h-5 text-purple-600" />;
      default:
        return <Zap className="w-5 h-5 text-yellow-500" />;
    }
  };

  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'learning':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'assessment':
        return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'practice':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'practical':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden my-6">
      {/* Top Banner: Outcome Summary */}
      <div className={`p-6 border-b ${passed ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-100' : 'bg-gradient-to-r from-amber-50 to-orange-50 border-amber-100'}`}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${passed ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}`}>
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${passed ? 'bg-green-200/80 text-green-900' : 'bg-amber-200/80 text-amber-900'}`}>
                  {passed ? 'Activity Completed' : 'Activity Finalized'}
                </span>
                <span className="text-xs text-gray-500 font-medium">Score: {percentage}%</span>
              </div>
              <h2 className="text-xl font-bold text-gray-900 mt-1">{taskTitle}</h2>
            </div>
          </div>

          <div className="text-right sm:text-right w-full sm:w-auto">
            <p className="text-xs text-gray-500 uppercase font-semibold">Mastery Context</p>
            <p className="text-sm font-bold text-gray-800">{nextAction.currentTopic} ({percentage}%)</p>
          </div>
        </div>

        {/* Demonstrated Competency */}
        <div className="mt-4 p-3 bg-white/80 rounded-xl border border-gray-200/60 text-sm text-gray-700 flex items-start gap-2">
          <Sparkles className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-gray-900">What you demonstrated: </span>
            {nextAction.demonstratedCompetency}
          </div>
        </div>
      </div>

      {/* Main Focus: One Clear Next Action */}
      <div className="p-6 sm:p-8 bg-gradient-to-b from-blue-50/40 to-white">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="text-center space-y-1">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-100 text-blue-800 border border-blue-200">
              <Zap className="w-3.5 h-3.5 text-blue-600" />
              Your Recommended Next Action
            </span>
            <h3 className="text-2xl font-black text-gray-900">
              Continue Your Momentum
            </h3>
            <p className="text-sm text-gray-600">
              Selected by your personalized adaptive curriculum to keep you in the optimal learning flow.
            </p>
          </div>

          {/* Next Task Card */}
          <div className="bg-white rounded-xl p-6 border-2 border-blue-200 shadow-md hover:border-blue-400 transition-all space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-50 rounded-lg">
                  {getTypeIcon(nextAction.nextTask.type)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-semibold uppercase px-2 py-0.5 rounded border ${getTypeBadgeColor(nextAction.nextTask.type)}`}>
                      {nextAction.nextTask.type}
                    </span>
                    <span className="text-xs text-gray-500 capitalize">
                      {nextAction.nextTask.difficulty}
                    </span>
                  </div>
                  <h4 className="text-lg font-bold text-gray-900 mt-1">
                    {nextAction.nextTask.title}
                  </h4>
                </div>
              </div>
            </div>

            {/* Pedagogical Explanation */}
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-100 space-y-1 text-xs text-gray-700">
              <p className="font-semibold text-gray-900 flex items-center gap-1.5">
                <span>Why this activity?</span>
              </p>
              <p className="text-gray-600 leading-relaxed">
                {nextAction.pedagogicalExplanation}
              </p>
              <p className="text-blue-700 font-medium pt-1">
                {nextAction.expectedDifficultyDescription}
              </p>
            </div>

            {/* The One Clear Next Action Button */}
            <div>
              <Link
                href={nextAction.nextTask.actionUrl}
                className="w-full inline-flex items-center justify-center gap-3 px-6 py-4 rounded-xl text-base font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md hover:shadow-lg transition-all hover:scale-[1.01]"
              >
                <span>Continue to Next Activity: {nextAction.nextTask.title}</span>
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>

          {/* Secondary Actions (Non-distracting) */}
          <div className="flex items-center justify-center gap-6 pt-2 text-sm text-gray-500">
            {showReviewButton && onReview && (
              <button
                onClick={onReview}
                className="hover:text-gray-800 underline transition-colors"
              >
                Review previous answers
              </button>
            )}
            {onRetake && (
              <button
                onClick={onRetake}
                className="inline-flex items-center hover:text-gray-800 underline transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1" />
                Retake this activity
              </button>
            )}
            <Link
              href="/dashboard/student"
              className="hover:text-gray-800 underline transition-colors"
            >
              Return to dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
