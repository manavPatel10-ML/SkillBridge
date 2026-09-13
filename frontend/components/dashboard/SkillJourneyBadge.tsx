import React from "react";
import { CheckCircle2, Award, Terminal, BookOpen, Clock } from "lucide-react";

export type SkillJourneyState = "verified" | "competent" | "practicing" | "learning" | "not_started";

export interface SkillJourneyBadgeProps {
  state: SkillJourneyState;
  className?: string;
}

export function SkillJourneyBadge({ state, className = "" }: SkillJourneyBadgeProps) {
  const config = {
    verified: { bg: "bg-green-100", text: "text-green-700", label: "Verified", icon: <CheckCircle2 className="w-3 h-3 mr-1" /> },
    competent: { bg: "bg-purple-100", text: "text-purple-700", label: "Competent", icon: <Award className="w-3 h-3 mr-1" /> },
    practicing: { bg: "bg-blue-100", text: "text-blue-700", label: "Practicing", icon: <Terminal className="w-3 h-3 mr-1" /> },
    learning: { bg: "bg-yellow-100", text: "text-yellow-700", label: "Learning", icon: <BookOpen className="w-3 h-3 mr-1" /> },
    not_started: { bg: "bg-gray-100", text: "text-gray-600", label: "Not Started", icon: <Clock className="w-3 h-3 mr-1" /> },
  };

  const current = config[state] || config.not_started;

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${current.bg} ${current.text} ${className}`}>
      {current.icon}
      {current.label}
    </span>
  );
}
