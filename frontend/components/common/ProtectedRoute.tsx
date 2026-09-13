"use client";

import { useAuth } from "../../context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: ("student" | "company" | "admin")[];
  requireRole?: boolean;
}

export function ProtectedRoute({
  children,
  allowedRoles,
  requireRole = true,
}: ProtectedRouteProps) {
  const { user, role, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push("/auth/login");
      } else if (allowedRoles && role && !allowedRoles.includes(role)) {
        if (role === "student") {
          router.push("/dashboard/student");
        } else if (role === "company") {
          router.push("/dashboard/company");
        } else if (role === "admin") {
          router.push("/dashboard/admin");
        }
      } else if (user && !role && requireRole) {
        router.push("/onboarding");
      }
    }
  }, [user, role, loading, router, allowedRoles, requireRole]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (allowedRoles && role && !allowedRoles.includes(role)) {
    return null;
  }

  if (user && !role && requireRole) {
    return null;
  }

  return <>{user ? children : null}</>;
}
