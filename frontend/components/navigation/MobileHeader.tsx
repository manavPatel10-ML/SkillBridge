"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { GraduationCap, Menu, X, LogOut, ShieldCheck } from "lucide-react";
import { NavigationLink } from "./Sidebar";

export interface MobileHeaderProps {
  links: NavigationLink[];
  role: "student" | "company" | "admin" | null;
  userEmail?: string | null;
  onSignOut: () => void;
}

export function MobileHeader({
  links,
  role,
  userEmail,
  onSignOut,
}: MobileHeaderProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <>
      <header className="md:hidden h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setOpen(!open)}
            className="p-2 text-gray-700 hover:bg-gray-100 rounded-md focus:outline-none"
            aria-label="Toggle Navigation Menu"
          >
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
          <Link href="/" className="flex items-center font-bold text-xl text-blue-600">
            <GraduationCap className="h-6 w-6 mr-2" />
            SkillBridge
          </Link>
        </div>
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center font-bold uppercase ${
            role === "admin" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"
          }`}
        >
          {userEmail?.[0] || "U"}
        </div>
      </header>

      {open && (
        <div className="fixed inset-0 top-16 z-40 bg-black/30 md:hidden animate-in fade-in-50 duration-150">
          <div className="bg-white w-3/4 max-w-xs h-[calc(100vh-4rem)] flex flex-col justify-between shadow-xl border-r border-gray-200">
            <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
              {links.map((link) => {
                const Icon = link.icon;
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.name}
                    href={link.href}
                    onClick={() => setOpen(false)}
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
              <div className="flex items-center mb-3">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-bold uppercase shrink-0 ${
                    role === "admin" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"
                  }`}
                >
                  {userEmail?.[0] || "U"}
                </div>
                <div className="ml-3 overflow-hidden">
                  <p className="text-sm font-medium text-gray-700 truncate">{userEmail}</p>
                  <p className="text-xs text-gray-500 capitalize">{role || "User"}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setOpen(false);
                  onSignOut();
                }}
                className="flex w-full items-center px-3 py-2 text-sm font-medium text-red-600 rounded-md hover:bg-red-50"
              >
                <LogOut className="mr-3 h-5 w-5 text-red-500" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
