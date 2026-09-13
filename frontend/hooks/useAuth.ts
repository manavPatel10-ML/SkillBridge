"use client";

import { useAuth as useAuthContext } from "../context/AuthContext";

/**
 * Convenient hook to access client authentication state, user object, and role.
 */
export function useAuth() {
  return useAuthContext();
}
