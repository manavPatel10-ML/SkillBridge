"use client";

import React from "react";
import { Sidebar, NavigationLink } from "../navigation/Sidebar";
import { MobileHeader } from "../navigation/MobileHeader";

export interface DashboardShellProps {
  children: React.ReactNode;
  links: NavigationLink[];
  role: "student" | "company" | "admin" | null;
  userEmail?: string | null;
  onSignOut: () => void;
}

export function DashboardShell({
  children,
  links,
  role,
  userEmail,
  onSignOut,
}: DashboardShellProps) {
  return (
    <div className="flex h-screen bg-gray-50">
      {/* Desktop Sidebar */}
      <Sidebar
        links={links}
        role={role}
        userEmail={userEmail}
        onSignOut={onSignOut}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Header */}
        <MobileHeader
          links={links}
          role={role}
          userEmail={userEmail}
          onSignOut={onSignOut}
        />

        {/* Scrollable Page Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
