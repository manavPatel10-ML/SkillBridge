"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { 
  verifyPasswordResetCode, 
  confirmPasswordReset, 
  sendPasswordResetEmail 
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import Link from "next/link";
import { 
  GraduationCap, 
  Loader2, 
  ArrowLeft, 
  CheckCircle2, 
  AlertCircle, 
  Mail, 
  Lock,
  Eye,
  EyeOff
} from "lucide-react";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const oobCode = searchParams.get("oobCode");

  // State for request mode (when no oobCode)
  const [email, setEmail] = useState("");
  const [reqSubmitted, setReqSubmitted] = useState(false);
  const [reqLoading, setReqLoading] = useState(false);
  const [reqError, setReqError] = useState("");

  // State for confirm mode (when oobCode is present)
  const [verifying, setVerifying] = useState(false);
  const [verifiedEmail, setVerifiedEmail] = useState<string | null>(null);
  const [codeError, setCodeError] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [confirmSuccess, setConfirmSuccess] = useState(false);
  const [confirmError, setConfirmError] = useState("");

  // If oobCode is present, verify it on mount
  useEffect(() => {
    if (!oobCode) return;

    let isMounted = true;
    setVerifying(true);
    setCodeError("");

    verifyPasswordResetCode(auth, oobCode)
      .then((userEmail) => {
        if (isMounted) {
          setVerifiedEmail(userEmail);
          setVerifying(false);
        }
      })
      .catch((err) => {
        console.error("Code verification error:", err);
        if (isMounted) {
          setCodeError("This password reset link is invalid or has expired. Please request a new one.");
          setVerifying(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [oobCode]);

  // Handler for requesting reset link
  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (reqLoading) return;

    const trimmed = email.trim();
    if (!trimmed) {
      setReqError("Please enter your email address.");
      return;
    }

    setReqError("");
    setReqLoading(true);

    try {
      await sendPasswordResetEmail(auth, trimmed);
      setReqSubmitted(true);
    } catch (err: any) {
      console.error("Password reset error:", err);
      // Security: Do NOT reveal whether an email exists
      if (err.code === "auth/user-not-found") {
        setReqSubmitted(true);
      } else if (err.code === "auth/invalid-email") {
        setReqError("Please enter a valid email address.");
      } else if (err.code === "auth/too-many-requests") {
        setReqError("Too many requests. Please wait a few moments before trying again.");
      } else {
        setReqError("Unable to process request at this time. Please try again later.");
      }
    } finally {
      setReqLoading(false);
    }
  };

  // Handler for setting new password
  const handleConfirmReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oobCode || confirmLoading) return;

    setConfirmError("");

    if (newPassword.length < 8) {
      setConfirmError("Password must be at least 8 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setConfirmError("Passwords do not match.");
      return;
    }

    setConfirmLoading(true);

    try {
      await confirmPasswordReset(auth, oobCode, newPassword);
      setConfirmSuccess(true);
    } catch (err: any) {
      console.error("Confirm password error:", err);
      if (err.code === "auth/expired-action-code") {
        setConfirmError("This reset link has expired. Please request a new one.");
      } else if (err.code === "auth/invalid-action-code") {
        setConfirmError("This reset link is invalid or has already been used.");
      } else if (err.code === "auth/weak-password") {
        setConfirmError("Password is too weak. Please choose a stronger password.");
      } else {
        setConfirmError(err.message || "Failed to reset password. Please try again.");
      }
    } finally {
      setConfirmLoading(false);
    }
  };

  // 1. Verifying Action Code State
  if (oobCode && verifying) {
    return (
      <div className="text-center py-8 space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600 mx-auto" />
        <p className="text-gray-600 text-sm">Verifying your password reset link...</p>
      </div>
    );
  }

  // 2. Action Code Invalid or Expired State
  if (oobCode && codeError) {
    return (
      <div className="space-y-6 text-center">
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg text-sm flex items-start space-x-3 text-left">
          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
          <span>{codeError}</span>
        </div>
        <Link
          href="/auth/forgot-password"
          className="inline-flex items-center justify-center w-full py-2.5 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors"
        >
          Request a new reset link
        </Link>
        <div>
          <Link
            href="/auth/login"
            className="text-sm font-medium text-blue-600 hover:text-blue-500 transition-colors inline-flex items-center"
          >
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Sign In
          </Link>
        </div>
      </div>
    );
  }

  // 3. New Password Reset Success State
  if (oobCode && confirmSuccess) {
    return (
      <div className="space-y-6 text-center">
        <div className="bg-green-50 border border-green-200 rounded-lg p-5 flex items-start space-x-3 text-left">
          <CheckCircle2 className="h-6 w-6 text-green-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-green-900 space-y-1">
            <p className="font-semibold">Password Reset Complete!</p>
            <p>Your password has been successfully updated. You can now sign in with your new password.</p>
          </div>
        </div>

        <Link
          href="/auth/login"
          className="inline-flex items-center justify-center w-full py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors"
        >
          Sign in to your account
        </Link>
      </div>
    );
  }

  // 4. Action Code Valid -> Set New Password Form
  if (oobCode && verifiedEmail) {
    return (
      <form className="mt-6 space-y-5" onSubmit={handleConfirmReset}>
        <div className="text-sm text-gray-600 bg-blue-50 border border-blue-200 p-3 rounded-md">
          Setting new password for: <strong className="text-blue-900">{verifiedEmail}</strong>
        </div>

        {confirmError && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-md text-sm flex items-center space-x-2">
            <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
            <span>{confirmError}</span>
          </div>
        )}

        <div>
          <label htmlFor="new-password" className="block text-sm font-medium text-gray-700 mb-1">
            New Password
          </label>
          <div className="relative rounded-md shadow-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock className="h-5 w-5 text-gray-400" />
            </div>
            <input
              id="new-password"
              name="newPassword"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              required
              minLength={8}
              className="appearance-none relative block w-full pl-10 pr-10 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="••••••••"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <p className="mt-1 text-xs text-gray-500">Must be at least 8 characters</p>
        </div>

        <div>
          <label htmlFor="confirm-new-password" className="block text-sm font-medium text-gray-700 mb-1">
            Confirm New Password
          </label>
          <div className="relative rounded-md shadow-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock className="h-5 w-5 text-gray-400" />
            </div>
            <input
              id="confirm-new-password"
              name="confirmPassword"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              required
              minLength={8}
              className="appearance-none relative block w-full pl-10 pr-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={confirmLoading}
          className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
        >
          {confirmLoading ? (
            <span className="flex items-center">
              <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" />
              Updating password...
            </span>
          ) : (
            "Update Password"
          )}
        </button>
      </form>
    );
  }

  // 5. Default: Request Reset Email State (if visited directly without oobCode)
  return (
    <div className="space-y-6">
      {reqSubmitted ? (
        <div className="space-y-6">
          <div className="bg-green-50 border border-green-200 rounded-lg p-5 flex items-start space-x-3">
            <CheckCircle2 className="h-6 w-6 text-green-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-green-900 space-y-2">
              <p className="font-semibold">Reset instructions sent!</p>
              <p>
                If an account exists for <span className="font-medium">{email}</span>, you will receive an email with reset instructions shortly.
              </p>
              <p className="text-xs text-green-800">
                Please check your inbox as well as your spam folder.
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
              onClick={() => {
                setReqSubmitted(false);
                setEmail("");
                setReqError("");
              }}
              className="w-full py-2.5 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              Send another reset link
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
        <form className="mt-6 space-y-6" onSubmit={handleRequestReset}>
          {reqError && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-md text-sm flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
              <span>{reqError}</span>
            </div>
          )}

          <div>
            <label htmlFor="student-reset-email" className="block text-sm font-medium text-gray-700 mb-1">
              Student Email address
            </label>
            <div className="relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="student-reset-email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none relative block w-full pl-10 pr-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="student@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={reqLoading}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={reqLoading || !email.trim()}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
            >
              {reqLoading ? (
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
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-sm border border-gray-200">
        <div className="text-center flex flex-col items-center">
          <GraduationCap className="h-12 w-12 text-blue-600 mb-2" />
          <h2 className="mt-2 text-3xl font-extrabold text-gray-900">
            Reset your password
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            SkillBridge Student Account Security
          </p>
        </div>

        <Suspense
          fallback={
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          }
        >
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
