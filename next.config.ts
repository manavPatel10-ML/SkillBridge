import type { NextConfig } from "next";

/**
 * Security Headers Policy
 *
 * Applied via Next.js headers() — these headers are sent for every response
 * (SSR pages, API routes, and static assets), regardless of the CDN edge cache
 * layer. The Vercel CDN-layer headers in vercel.json serve as a secondary fallback.
 *
 * References:
 *  - OWASP Secure Headers Project: https://owasp.org/www-project-secure-headers/
 *  - MDN: https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers
 */

const securityHeaders = [
  // ── Transport Security ──────────────────────────────────────────────────────
  // Force HTTPS for 2 years. includeSubDomains + preload prepares for HSTS preload list.
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },

  // ── Content Type ────────────────────────────────────────────────────────────
  // Prevent browsers from MIME-sniffing a response away from the declared content-type.
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },

  // ── Clickjacking ────────────────────────────────────────────────────────────
  // Deny embedding in any frame (complements CSP frame-ancestors).
  {
    key: "X-Frame-Options",
    value: "DENY",
  },

  // ── Referrer Policy ─────────────────────────────────────────────────────────
  // Send full URL to same-origin; only origin to cross-origin HTTPS; nothing to HTTP.
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },

  // ── XSS Protection ──────────────────────────────────────────────────────────
  // Disabled intentionally: modern browsers rely on CSP. The legacy header can
  // create XSS vulnerabilities in older IE browsers when set to "1; mode=block".
  {
    key: "X-XSS-Protection",
    value: "0",
  },

  // ── Permissions Policy ──────────────────────────────────────────────────────
  // Deny access to sensitive browser features not needed by this application.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
  },

  // ── Content Security Policy ─────────────────────────────────────────────────
  // Structured but permissive enough for Firebase, Google Fonts, and Next.js HMR.
  // 'unsafe-inline' for styles is required by Tailwind/CSS-in-JS patterns.
  // 'unsafe-eval' is NOT included — Next.js does not require it in production.
  // Update connect-src if additional third-party APIs are added.
  {
    key: "Content-Security-Policy",
    value: [
      // Base: only allow resources from our own origin by default
      "default-src 'self'",
      // Scripts: self + next.js chunk loading + Firebase SDK
      "script-src 'self' 'unsafe-inline' https://apis.google.com https://www.gstatic.com",
      // Styles: self + inline styles (required by CSS modules/Tailwind)
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      // Fonts: Google Fonts CDN
      "font-src 'self' https://fonts.gstatic.com",
      // Images: self + data URIs + Firebase Storage
      "img-src 'self' data: https://*.googleapis.com https://*.gstatic.com https://firebasestorage.googleapis.com",
      // API connections: Firebase Auth/Firestore/Storage endpoints
      "connect-src 'self' https://*.googleapis.com https://*.firebaseapp.com https://*.firebase.com wss://*.firebaseio.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://emkc.org",
      // Frames: none
      "frame-ancestors 'none'",
      // Prevent form submissions to untrusted origins
      "form-action 'self'",
      // Only load base URI from self
      "base-uri 'self'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  serverExternalPackages: ["firebase-admin"],

  async headers() {
    return [
      {
        // Apply security headers to ALL routes (pages, API routes, static assets)
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
