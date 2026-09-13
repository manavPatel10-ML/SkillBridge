import React from "react";

export interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  iconBgColor?: string;
  iconColor?: string;
  helperText?: React.ReactNode;
  className?: string;
}

export function StatCard({
  label,
  value,
  icon: Icon,
  iconBgColor = "bg-blue-50",
  iconColor = "text-blue-600",
  helperText,
  className = "",
}: StatCardProps) {
  return (
    <div className={`bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between ${className}`}>
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm font-medium text-gray-500">{label}</p>
          <h3 className="text-2xl font-bold text-gray-900 mt-1">{value}</h3>
        </div>
        <div className={`p-2 rounded-lg ${iconBgColor} ${iconColor}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      {helperText && (
        <div className="text-xs text-gray-500 mt-4 flex items-center">
          {helperText}
        </div>
      )}
    </div>
  );
}
