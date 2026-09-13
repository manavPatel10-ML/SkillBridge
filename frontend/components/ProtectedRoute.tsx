"use client";

import { useAuth } from "../context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function ProtectedRoute({
  children,
  allowedRoles,
  requireRole = true,
}: {
  children: React.ReactNode;
  allowedRoles?: ("student" | "company" | "admin")[];
  requireRole?: boolean;
}) {
  const { user, role, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push("/auth/login");
      } else if (allowedRoles && role && !allowedRoles.includes(role)) {
        // Redirect to their respective dashboard if they try to access a page they don't have permission for
        if (role === "student") {
          router.push("/dashboard/student");
        } else if (role === "company") {
          router.push("/dashboard/company");
        } else if (role === "admin") {
          router.push("/dashboard/admin");
        }
      } else if (user && !role && requireRole) {
         // User is authenticated but doesn't have a role assigned yet, send to onboarding
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

  // If we require specific roles and the user doesn't have it, don't render children
  if (allowedRoles && role && !allowedRoles.includes(role)) {
    return null;
  }

  // If user is authenticated but has no role and the route requires it, don't render children (redirecting to onboarding)
  if (user && !role && requireRole) {
    return null;
  }

  return <>{user ? children : null}</>;
}
