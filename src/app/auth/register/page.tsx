"use client";

import { useState, Suspense } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { GraduationCap, Loader2 } from "lucide-react";

function RegisterForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const roleParam = searchParams.get("role");

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setError("Password should be at least 6 characters");
      return;
    }

    setLoading(true);

    let success = false;
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      success = true;
      // Pass the role to the onboarding page if it was specified
      const redirectUrl = roleParam ? `/onboarding?role=${roleParam}` : "/onboarding";
      router.push(redirectUrl);
    } catch (err: any) {
      console.error(err);
      if (err.code === "auth/email-already-in-use") {
        setError("This email is already in use. Please sign in instead.");
      } else {
        setError(err.message || "Failed to create account");
      }
    } finally {
      if (!success) {
        setLoading(false);
      }
    }
  };

  return (
    <form className="mt-8 space-y-6" onSubmit={handleRegister}>
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-md text-sm text-center">
          {error}
        </div>
      )}
      <div className="space-y-4">
        <div>
          <label htmlFor="email-address" className="block text-sm font-medium text-gray-700 mb-1">
            Email address
          </label>
          <input
            id="email-address"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 mb-1">
            Confirm Password
          </label>
          <input
            id="confirm-password"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            required
            className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            placeholder="••••••••"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>
      </div>

      <div>
        <button
          type="submit"
          disabled={loading}
          className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
        >
          {loading ? (
            <span className="flex items-center">
              <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" />
              Creating account...
            </span>
          ) : (
            "Create account"
          )}
        </button>
      </div>
    </form>
  );
}

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-sm border border-gray-200">
        <div className="text-center flex flex-col items-center">
          <GraduationCap className="h-12 w-12 text-blue-600 mb-2" />
          <h2 className="mt-2 text-3xl font-extrabold text-gray-900">Create an account</h2>
          <p className="mt-2 text-sm text-gray-600">
            Or{" "}
            <Link href="/auth/login" className="font-medium text-blue-600 hover:text-blue-500 transition-colors">
              sign in to your existing account
            </Link>
          </p>
        </div>
        
        <Suspense fallback={
          <div className="mt-8 flex justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          </div>
        }>
          <RegisterForm />
        </Suspense>
      </div>
    </div>
  );
}
