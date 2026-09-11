"use client";

import { useState } from "react";
import { Copy, Check, Share2, ExternalLink } from "lucide-react";

interface ProfileShareControlsProps {
  studentName: string;
  studentId: string;
  shareUrl?: string;
}

function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.2V10.9H6.46M7.83 6.64a1.64 1.64 0 1 0 0 3.28 1.64 1.64 0 0 0 0-3.28z" />
    </svg>
  );
}

export default function ProfileShareControls({
  studentName,
  studentId,
  shareUrl,
}: ProfileShareControlsProps) {
  const [copied, setCopied] = useState(false);

  // Fallback to window.location.href or constructed URL if shareUrl not passed
  const getShareUrl = () => {
    if (shareUrl) return shareUrl;
    if (typeof window !== "undefined") {
      return `${window.location.origin}/profile/${studentId}`;
    }
    return `https://skillbridge-one-delta.vercel.app/profile/${studentId}`;
  };

  const handleCopyLink = async () => {
    const url = getShareUrl();
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        // Fallback for older browsers / iframe restrictions
        const textArea = document.createElement("textarea");
        textArea.value = url;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand("copy");
        textArea.remove();
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error("Failed to copy link:", err);
    }
  };

  const handleLinkedInShare = () => {
    const url = getShareUrl();
    const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
    window.open(linkedinUrl, "_blank", "noopener,noreferrer,width=600,height=600");
  };

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <button
        onClick={handleCopyLink}
        className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-all duration-150 border ${
          copied
            ? "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-700"
            : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700 dark:hover:bg-slate-750"
        } shadow-sm active:scale-95`}
        title="Copy verified profile URL"
      >
        {copied ? (
          <>
            <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 animate-in zoom-in-50 duration-150" />
            <span>Copied to Clipboard!</span>
          </>
        ) : (
          <>
            <Copy className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
            <span>Copy Profile Link</span>
          </>
        )}
      </button>

      <button
        onClick={handleLinkedInShare}
        className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-[#0A66C2] hover:bg-[#004182] rounded-lg transition-all duration-150 shadow-sm active:scale-95"
        title="Share verified profile on LinkedIn"
      >
        <LinkedInIcon className="w-3.5 h-3.5 fill-current" />
        <span>Share on LinkedIn</span>
      </button>
    </div>
  );
}
