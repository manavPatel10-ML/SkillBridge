"use client";

import React from "react";
import Link from "next/link";
import { BookOpen, Clock, Activity, ArrowRight } from "lucide-react";

export interface AssessmentItem {
  id: string;
  skillId: string;
  title: string;
  description: string;
  difficulty: string;
  totalQuestions?: number;
  passingScore: number;
  timePerQuestionSeconds?: number;
}

export interface AssessmentCardProps {
  assessment: AssessmentItem;
  skillName?: string;
  questionCount?: number;
}

export function AssessmentCard({ assessment, skillName, questionCount }: AssessmentCardProps) {
  const diffLower = (assessment.difficulty || "beginner").toLowerCase();
  const diffBadgeClass =
    diffLower === "beginner"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : diffLower === "intermediate"
      ? "bg-blue-50 text-blue-700 border-blue-200"
      : "bg-purple-50 text-purple-700 border-purple-200";

  const totalQuestions = questionCount ?? assessment.totalQuestions ?? 0;
  const timePerQuestion = assessment.timePerQuestionSeconds || 60;
  const durationMinutes = Math.ceil((totalQuestions * timePerQuestion) / 60);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group">
      <div className="p-6">
        <div className="flex justify-between items-start mb-3 gap-2">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-800">
            {skillName || assessment.skillId}
          </span>
          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold border ${diffBadgeClass}`}>
            <Activity className="w-3 h-3 mr-1" />
            {assessment.difficulty}
          </span>
        </div>

        <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors line-clamp-2">
          {assessment.title}
        </h3>

        <p className="text-sm text-gray-600 mb-4 line-clamp-3 leading-relaxed">
          {assessment.description}
        </p>

        <div className="flex flex-wrap gap-4 text-xs text-gray-500 pt-2 border-t border-gray-100">
          <span className="flex items-center">
            <BookOpen className="w-3.5 h-3.5 mr-1 text-gray-400" />
            {totalQuestions} Questions
          </span>
          <span className="flex items-center">
            <Clock className="w-3.5 h-3.5 mr-1 text-gray-400" />
            ~{durationMinutes} mins
          </span>
        </div>
      </div>

      <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between mt-auto">
        <span className="text-xs font-medium text-gray-500">
          Pass: {assessment.passingScore}%
        </span>
        <Link
          href={`/dashboard/student/assessments/${assessment.id}`}
          className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-colors"
        >
          <span>View Assessment</span>
          <ArrowRight className="w-3.5 h-3.5 ml-1" />
        </Link>
      </div>
    </div>
  );
}
