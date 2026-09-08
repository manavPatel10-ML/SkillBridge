"use client";

import { useState } from "react";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/lib/firebase";
import Link from "next/link";
import { GraduationCap, Loader2, ArrowLeft, CheckCircle2, AlertCircle, Mail } from "lucide-react";

// [M2 FIX] Client-side cooldown duration after a reset email is sent.
// Firebase has its own server-side rate limiting, but a UI-level cooldown:
//  1. Reduces pointless duplicate requests
//  2. Gives clear feedback to users on when they can try again
const RESET_COOLDOWN_SECONDS = 60;

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  // [M2 FIX] Track cooldown expiry time (epoch ms). 0 means no active cooldown.
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);

  const startCooldown = () => {
    const expiresAt = Date.now() + RESET_COOLDOWN_SECONDS * 1000;
    setCooldownUntil(expiresAt);
    
    // Update the countdown every second
    const interval = setInterval(() => {
      const remaining = Math.ceil((expiresAt - Date.now()) / 1000);
      if (remaining <= 0) {
        setCooldownRemaining(0);
        setCooldownUntil(0);
        clearInterval(interval);
      } else {
        setCooldownRemaining(remaining);
      }
    }, 1000);
    setCooldownRemaining(RESET_COOLDOWN_SECONDS);
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError("Please enter your email address.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      // Firebase Authentication official password reset method
      await sendPasswordResetEmail(auth, trimmedEmail);
      setSubmitted(true);
      startCooldown(); // [M2 FIX] Start cooldown after successful (or treated-as-successful) submission
    } catch (err: any) {
      console.error("Password reset error:", err);
      // Security: Do NOT reveal whether an email exists.
      // Firebase may return 'auth/user-not-found', which must be treated as success.
      if (err.code === "auth/user-not-found") {
        setSubmitted(true);
        startCooldown(); // [M2 FIX] Apply cooldown even for non-existent email (prevents enumeration timing)
      } else if (err.code === "auth/invalid-email") {
        setError("Please enter a valid email address.");
      } else if (err.code === "auth/too-many-requests") {
        setError("Too many requests. Please wait a few moments before trying again.");
      } else {
        setError("Unable to process request at this time. Please try again later.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSendAnother = () => {
    setSubmitted(false);
    setEmail("");
    setError("");
    // Note: we do NOT reset the cooldown here. If they click "Send another",
    // they still see the remaining cooldown and cannot spam.
  };

  const isCoolingDown = cooldownUntil > Date.now();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-sm border border-gray-200">
        <div className="text-center flex flex-col items-center">
          <GraduationCap className="h-12 w-12 text-blue-600 mb-2" />
          <h2 className="mt-2 text-3xl font-extrabold text-gray-900">
            {submitted ? "Check your email" : "Reset your password"}
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {submitted
              ? "We have dispatched password reset instructions."
              : "Enter your registered email address and we'll send you a link to reset your password."}
          </p>
        </div>

        {submitted ? (
          <div className="space-y-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-5 flex items-start space-x-3">
              <CheckCircle2 className="h-6 w-6 text-green-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-green-900 space-y-2">
                <p className="font-semibold">Reset instructions sent!</p>
                <p>
                  If an account exists for <span className="font-medium">{email}</span>, you will receive an email shortly with instructions on how to reset your password.
                </p>
                <p className="text-xs text-green-800">
                  Please check your inbox as well as your spam or junk folder.
                </p>
              </div>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-xs text-gray-600">
              <p>
                <strong>Security Notice:</strong> To protect student privacy, we do not confirm whether a specific email address is registered on SkillBridge.
              </p>
            </div>

            <div className="flex flex-col space-y-3">
              <button
                type="button"
                onClick={handleSendAnother}
                disabled={isCoolingDown}
                className="w-full py-2.5 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isCoolingDown
                  ? `Send another reset link (${cooldownRemaining}s)`
                  : "Send another reset link"}
              </button>
              
              <Link
                href="/auth/login"
                className="w-full flex items-center justify-center py-2.5 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Return to Sign In
              </Link>
            </div>
          </div>
        ) : (
          <form className="mt-8 space-y-6" onSubmit={handleReset}>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-md text-sm flex items-center space-x-2">
                <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label htmlFor="reset-email" className="block text-sm font-medium text-gray-700 mb-1">
                Student Email address
              </label>
              <div className="relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="reset-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="appearance-none relative block w-full pl-10 pr-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="student@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                id="submit-reset-btn"
                disabled={loading || !email.trim()}
                className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
              >
                {loading ? (
                  <span className="flex items-center">
                    <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" />
                    Sending reset link...
                  </span>
                ) : (
                  "Send Reset Link"
                )}
              </button>
            </div>

            <div className="flex items-center justify-between text-sm">
              <Link
                href="/auth/login"
                className="flex items-center font-medium text-blue-600 hover:text-blue-500 transition-colors"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back to Sign In
              </Link>
              <Link
                href="/auth/register"
                className="font-medium text-gray-600 hover:text-gray-900 transition-colors"
              >
                Create new account
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
