import { cn } from "@shared/utils/formatting";

export { cn };

/**
 * Formats duration in seconds into human-readable string (e.g. "15 Minutes" or "10 Minutes 30 Seconds")
 */
export function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (seconds === 0) {
    return `${minutes} Minutes`;
  }

  return `${minutes} Minutes ${seconds} Seconds`;
}

/**
 * Returns color classes for score badges (e.g. green for >= 70, amber for >= 50, red for < 50)
 */
export function getScoreColorClass(score: number): {
  bg: string;
  text: string;
  border: string;
} {
  if (score >= 70) {
    return {
      bg: "bg-emerald-50",
      text: "text-emerald-700",
      border: "border-emerald-200",
    };
  }
  if (score >= 50) {
    return {
      bg: "bg-amber-50",
      text: "text-amber-700",
      border: "border-amber-200",
    };
  }
  return {
    bg: "bg-rose-50",
    text: "text-rose-700",
    border: "border-rose-200",
  };
}

/**
 * Returns badge styling for difficulty levels
 */
export function getDifficultyBadgeClass(difficulty: string = "beginner"): string {
  const lower = difficulty.toLowerCase();
  if (lower === "beginner") {
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  }
  if (lower === "intermediate") {
    return "bg-blue-50 text-blue-700 border-blue-200";
  }
  return "bg-purple-50 text-purple-700 border-purple-200";
}
