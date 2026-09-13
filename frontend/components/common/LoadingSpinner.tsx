import React from "react";
import { Loader2 } from "lucide-react";

export interface LoadingSpinnerProps {
  message?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function LoadingSpinner({
  message = "Loading...",
  size = "md",
  className = "",
}: LoadingSpinnerProps) {
  const sizeClass = size === "sm" ? "h-5 w-5" : size === "lg" ? "h-12 w-12" : "h-8 w-8";

  return (
    <div className={`flex flex-col items-center justify-center p-8 space-y-3 ${className}`}>
      <Loader2 className={`animate-spin text-blue-600 ${sizeClass}`} />
      {message && <p className="text-sm font-medium text-gray-500">{message}</p>}
    </div>
  );
}
