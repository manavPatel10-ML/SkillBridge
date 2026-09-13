"use client";

import React from "react";
import Link from "next/link";
import { Activity, PlayCircle, CheckCircle2, ArrowRight } from "lucide-react";
import { PracticalTask, PracticalTaskAttempt } from "@shared/types";

export interface PracticalTaskCardProps {
  task: PracticalTask;
  skillName?: string;
  attempt?: PracticalTaskAttempt;
}

export function PracticalTaskCard({ task, skillName, attempt }: PracticalTaskCardProps) {
  const isCompleted = attempt?.status === "completed";
  const isInProgress = attempt?.status === "in_progress";
  const isEvaluated = attempt?.evaluation?.status === "evaluated";

  const diffLower = (task.difficulty || "beginner").toLowerCase();
  const diffBadgeClass =
    diffLower === "beginner"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : diffLower === "intermediate"
      ? "bg-blue-50 text-blue-700 border-blue-200"
      : "bg-purple-50 text-purple-700 border-purple-200";

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group">
      <div className="p-6">
        <div className="flex justify-between items-start mb-3 gap-2">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-800">
            {skillName || task.skillId}
          </span>
          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold border ${diffBadgeClass}`}>
            <Activity className="w-3 h-3 mr-1" />
            {task.difficulty}
          </span>
        </div>

        <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors line-clamp-2">
          {task.title}
        </h3>

        <p className="text-sm text-gray-600 mb-4 line-clamp-3 leading-relaxed">
          {task.description}
        </p>
      </div>

      <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between mt-auto">
        <div className="flex items-center">
          {isCompleted ? (
            <span className="inline-flex items-center text-xs font-semibold text-emerald-700">
              <CheckCircle2 className="w-4 h-4 mr-1 text-emerald-600" />
              {isEvaluated ? `Score: ${attempt?.evaluation?.score ?? 100}%` : "Completed"}
            </span>
          ) : isInProgress ? (
            <span className="inline-flex items-center text-xs font-semibold text-amber-700">
              <PlayCircle className="w-4 h-4 mr-1 text-amber-600" />
              In Progress
            </span>
          ) : (
            <span className="text-xs text-gray-500 font-medium">Not Started</span>
          )}
        </div>

        <Link
          href={`/dashboard/student/practical-tasks/${task.id}`}
          className={`inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            isCompleted
              ? "text-gray-700 hover:bg-gray-200 border border-gray-200 bg-white"
              : isInProgress
              ? "bg-amber-600 hover:bg-amber-700 text-white"
              : "bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
          }`}
        >
          <span>{isCompleted ? "Review Task" : isInProgress ? "Continue" : "Start Task"}</span>
          <ArrowRight className="w-3.5 h-3.5 ml-1" />
        </Link>
      </div>
    </div>
  );
}
