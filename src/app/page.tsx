import Link from "next/link";
import { ArrowRight, Briefcase, GraduationCap, Code, CheckCircle } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="px-6 lg:px-8 h-16 flex items-center border-b bg-white">
        <Link href="/" className="flex items-center justify-center font-bold text-xl text-blue-600">
          <GraduationCap className="h-6 w-6 mr-2" />
          SkillBridge
        </Link>
        <nav className="ml-auto flex gap-4 sm:gap-6 items-center">
          <Link href="/auth/login" className="text-sm font-medium hover:text-blue-600">
            Login
          </Link>
          <Link
            href="/auth/register"
            className="text-sm font-medium bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            Get Started
          </Link>
        </nav>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {/* Hero Section */}
        <section className="w-full py-24 lg:py-32 xl:py-48 bg-gradient-to-b from-blue-50 to-white">
          <div className="container mx-auto px-4 md:px-6">
            <div className="flex flex-col items-center space-y-6 text-center">
              <div className="space-y-4 max-w-3xl">
                <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl text-gray-900">
                  Bridge the gap between <span className="text-blue-600">college learning</span> and <span className="text-blue-600">company hiring</span>.
                </h1>
                <p className="mx-auto max-w-[700px] text-gray-600 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  Students practice real-world challenges. Companies discover verified practical talent. 
                  Say goodbye to the theory-only resume.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 w-full justify-center mt-8">
                <Link
                  href="/auth/register?role=student"
                  className="inline-flex h-12 items-center justify-center rounded-md bg-blue-600 px-8 text-sm font-medium text-white shadow transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-700 disabled:pointer-events-none disabled:opacity-50"
                >
                  I'm a Student
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
                <Link
                  href="/auth/register?role=company"
                  className="inline-flex h-12 items-center justify-center rounded-md border border-gray-200 bg-white px-8 text-sm font-medium shadow-sm transition-colors hover:bg-gray-100 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gray-950 disabled:pointer-events-none disabled:opacity-50"
                >
                  I'm a Company
                  <Briefcase className="ml-2 h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Problem/Solution Section */}
        <section className="w-full py-20 bg-white">
          <div className="container mx-auto px-4 md:px-6">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <div className="inline-block rounded-lg bg-red-100 px-3 py-1 text-sm text-red-800 mb-4 font-semibold">The Problem</div>
                <h2 className="text-3xl font-bold tracking-tight mb-4">The Theory Trap</h2>
                <p className="text-gray-600 text-lg mb-6">
                  Students spend years learning computer science theory, but struggle to pass technical interviews or complete real-world practical tasks. Resumes look identical, making it hard for companies to find true talent.
                </p>
              </div>
              <div className="bg-gray-50 p-8 rounded-xl border border-gray-100 shadow-sm">
                <div className="inline-block rounded-lg bg-green-100 px-3 py-1 text-sm text-green-800 mb-4 font-semibold">The Solution</div>
                <h2 className="text-2xl font-bold tracking-tight mb-4">Verified Practical Skills</h2>
                <ul className="space-y-4">
                  <li className="flex items-start">
                    <CheckCircle className="h-6 w-6 text-green-600 mr-2 flex-shrink-0" />
                    <span className="text-gray-700">Continuous access to real-world tasks and technical interviews for students.</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-6 w-6 text-green-600 mr-2 flex-shrink-0" />
                    <span className="text-gray-700">Automated evaluation building a verified skill profile over time.</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-6 w-6 text-green-600 mr-2 flex-shrink-0" />
                    <span className="text-gray-700">Companies hire based on demonstrated practical ability, not just pedigree.</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="w-full py-20 bg-gray-50 border-t border-gray-100">
          <div className="container mx-auto px-4 md:px-6 text-center">
            <h2 className="text-3xl font-bold tracking-tight mb-12">How It Works</h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="flex flex-col items-center p-6 bg-white rounded-xl shadow-sm border border-gray-100">
                <div className="p-4 bg-blue-100 rounded-full mb-4">
                  <Code className="h-8 w-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold mb-2">Practice Real Tasks</h3>
                <p className="text-gray-600 text-center">Solve actual industry challenges and technical interview questions.</p>
              </div>
              <div className="flex flex-col items-center p-6 bg-white rounded-xl shadow-sm border border-gray-100">
                <div className="p-4 bg-blue-100 rounded-full mb-4">
                  <CheckCircle className="h-8 w-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold mb-2">Build Verified Profile</h3>
                <p className="text-gray-600 text-center">Your successful solutions automatically build your verified practical resume.</p>
              </div>
              <div className="flex flex-col items-center p-6 bg-white rounded-xl shadow-sm border border-gray-100">
                <div className="p-4 bg-blue-100 rounded-full mb-4">
                  <Briefcase className="h-8 w-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold mb-2">Get Discovered</h3>
                <p className="text-gray-600 text-center">Companies search for candidates based on proven skills, bringing opportunities to you.</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="py-6 w-full shrink-0 border-t bg-white px-4 md:px-6">
        <div className="container mx-auto flex flex-col sm:flex-row justify-between items-center">
          <p className="text-xs text-gray-500">
            © 2026 SkillBridge. All rights reserved.
          </p>
          <nav className="sm:ml-auto flex gap-4 sm:gap-6 mt-4 sm:mt-0">
            <Link className="text-xs hover:underline underline-offset-4 text-gray-500" href="#">
              Terms of Service
            </Link>
            <Link className="text-xs hover:underline underline-offset-4 text-gray-500" href="#">
              Privacy
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
