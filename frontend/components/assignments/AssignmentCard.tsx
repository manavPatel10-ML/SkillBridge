"use client";

import React from "react";
import Link from "next/link";
import { FileText, Clock, CheckCircle2, AlertCircle, ArrowRight } from "lucide-react";

export interface AssignmentCardProps {
  id: string;
  title: string;
  description: string;
  skillName?: string;
  dueDate?: string;
  status?: "pending" | "in_progress" | "submitted" | "graded";
  score?: number;
  href?: string;
}

export function AssignmentCard({
  id,
  title,
  description,
  skillName,
  dueDate,
  status = "pending",
  score,
  href = `/dashboard/student/assessments/${id}`,
}: AssignmentCardProps) {
  const statusConfig = {
    pending: { label: "Pending", bg: "bg-gray-100 text-gray-700", icon: Clock },
    in_progress: { label: "In Progress", bg: "bg-blue-100 text-blue-700", icon: Clock },
    submitted: { label: "Submitted", bg: "bg-yellow-100 text-yellow-700", icon: AlertCircle },
    graded: { label: "Graded", bg: "bg-green-100 text-green-700", icon: CheckCircle2 },
  };

  const currentStatus = statusConfig[status] || statusConfig.pending;
  const StatusIcon = currentStatus.icon;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all flex flex-col justify-between overflow-hidden">
      <div className="p-6">
        <div className="flex justify-between items-start mb-3 gap-2">
          {skillName && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-800">
              {skillName}
            </span>
          )}
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${currentStatus.bg}`}>
            <StatusIcon className="w-3 h-3 mr-1" />
            {currentStatus.label}
          </span>
        </div>

        <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2">{title}</h3>
        <p className="text-sm text-gray-600 mb-4 line-clamp-3 leading-relaxed">{description}</p>

        {dueDate && (
          <p className="text-xs text-gray-500 flex items-center pt-2 border-t border-gray-100">
            <Clock className="w-3.5 h-3.5 mr-1 text-gray-400" />
            Due: {dueDate}
          </p>
        )}
      </div>

      <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between mt-auto">
        {score !== undefined ? (
          <span className="text-xs font-semibold text-emerald-700">Score: {score}%</span>
        ) : (
          <span className="text-xs text-gray-400">Not Graded</span>
        )}

        <Link
          href={href}
          className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-colors"
        >
          <span>Open</span>
          <ArrowRight className="w-3.5 h-3.5 ml-1" />
        </Link>
      </div>
    </div>
  );
}
