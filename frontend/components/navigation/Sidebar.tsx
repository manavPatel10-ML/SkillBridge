"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { GraduationCap, LogOut, ShieldCheck } from "lucide-react";

export interface NavigationLink {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

export interface SidebarProps {
  links: NavigationLink[];
  role: "student" | "company" | "admin" | null;
  userEmail?: string | null;
  onSignOut: () => void;
  className?: string;
}

export function Sidebar({
  links,
  role,
  userEmail,
  onSignOut,
  className = "",
}: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className={`w-64 bg-white border-r border-gray-200 flex flex-col hidden md:flex ${className}`}>
      <div className="h-16 flex items-center px-6 border-b border-gray-200">
        <Link href="/" className="flex items-center font-bold text-xl text-blue-600">
          <GraduationCap className="h-6 w-6 mr-2" />
          SkillBridge
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.name}
              href={link.href}
              className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                isActive
                  ? "bg-blue-50 text-blue-700 font-semibold"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              <Icon className={`mr-3 flex-shrink-0 h-5 w-5 ${isActive ? "text-blue-700" : "text-gray-400"}`} />
              {link.name}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center mb-4 px-2">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center font-bold uppercase shrink-0 ${
              role === "admin" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"
            }`}
          >
            {userEmail?.[0] || "U"}
          </div>
          <div className="ml-3 overflow-hidden">
            <p className="text-sm font-medium text-gray-700 truncate">{userEmail}</p>
            <div className="flex items-center">
              <p className="text-xs text-gray-500 capitalize">{role || "User"}</p>
              {role === "admin" && (
                <span className="ml-2 inline-flex items-center rounded-full bg-purple-100 px-1.5 py-0.5 text-xs font-medium text-purple-700">
                  <ShieldCheck className="w-3 h-3 mr-1" />
                  Admin
                </span>
              )}
            </div>
          </div>
        </div>
        <button
          onClick={onSignOut}
          className="flex w-full items-center px-3 py-2 text-sm font-medium text-red-600 rounded-md hover:bg-red-50 transition-colors"
        >
          <LogOut className="mr-3 h-5 w-5 text-red-500" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
