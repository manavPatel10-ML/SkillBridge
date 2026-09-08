"use client";

import { useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  GraduationCap, 
  LayoutDashboard, 
  BookOpen, 
  Briefcase, 
  Code, 
  Award, 
  User, 
  LogOut,
  Users,
  Search,
  History,
  ShieldCheck,
  Building2,
  CheckCircle2,
  Terminal,
  Library,
  Map,
  Target,
  Zap
} from "lucide-react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { role, signOut, user } = useAuth();
  const pathname = usePathname();

  const studentLinks = [
    { name: "Overview", href: "/dashboard/student", icon: LayoutDashboard },
    { name: "Learning Path", href: "/dashboard/student/learning-path", icon: Zap },
    { name: "Job Readiness", href: "/dashboard/student/readiness", icon: Target },
    { name: "Career Paths", href: "/dashboard/student/roles", icon: Map },
    { name: "My Skills", href: "/dashboard/student/skills", icon: Award },
    { name: "Learn", href: "/dashboard/student/learn", icon: Library },
    { name: "Coding Practice", href: "/dashboard/student/practice", icon: Terminal },
    { name: "Practical Tasks", href: "/dashboard/student/practical-tasks", icon: Code },
    { name: "Assessments", href: "/dashboard/student/assessments", icon: BookOpen },
    { name: "History", href: "/dashboard/student/history", icon: History },
    { name: "Company Challenges", href: "/dashboard/student/company-challenges", icon: Briefcase },
    { name: "My Profile", href: "/dashboard/student/profile", icon: User },
  ];

  const companyLinks = [
    { name: "Overview", href: "/dashboard/company", icon: LayoutDashboard },
    { name: "Find Candidates", href: "/dashboard/company/search", icon: Search },
    { name: "My Challenges", href: "/dashboard/company/challenges", icon: Code },
    { name: "Applications", href: "/dashboard/company/applications", icon: Users },
    { name: "Company Profile", href: "/dashboard/company/profile", icon: User },
  ];

  const adminLinks = [
    { name: "Overview", href: "/dashboard/admin", icon: LayoutDashboard },
    { name: "Role Paths", href: "/dashboard/admin/roles", icon: Map },
    { name: "Skills", href: "/dashboard/admin/skills", icon: Award },
    { name: "Theory Assessments", href: "/dashboard/admin/assessments", icon: BookOpen },
    { name: "Learning Content", href: "/dashboard/admin/learning", icon: Library },
    { name: "Practice Problems", href: "/dashboard/admin/practice", icon: Terminal },
    { name: "Practical Tasks", href: "/dashboard/admin/practical-tasks", icon: Code },
    { name: "Evaluations", href: "/dashboard/admin/evaluations", icon: CheckCircle2 },
    { name: "Students", href: "/dashboard/admin/students", icon: Users },
    { name: "Companies", href: "/dashboard/admin/companies", icon: Building2 },
  ];

  const links = role === "admin" ? adminLinks : role === "company" ? companyLinks : studentLinks;

  return (
    <ProtectedRoute allowedRoles={["student", "company", "admin"]}>
      <div className="flex h-screen bg-gray-50">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r border-gray-200 flex flex-col hidden md:flex">
          <div className="h-16 flex items-center px-6 border-b border-gray-200">
            <Link href="/" className="flex items-center font-bold text-xl text-blue-600">
              <GraduationCap className="h-6 w-6 mr-2" />
              SkillBridge
            </Link>
          </div>
          
          <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
            {links.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    isActive
                      ? "bg-blue-50 text-blue-700"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <Icon className={`mr-3 flex-shrink-0 h-5 w-5 ${isActive ? "text-blue-700" : "text-gray-400"}`} />
                  {link.name}
                </Link>
              );
            })}
          </nav>

          <div className="p-4 border-t border-gray-200">
            <div className="flex items-center mb-4 px-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold uppercase shrink-0 ${role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                {user?.email?.[0]}
              </div>
              <div className="ml-3 overflow-hidden">
                <p className="text-sm font-medium text-gray-700 truncate">{user?.email}</p>
                <div className="flex items-center">
                  <p className="text-xs text-gray-500 capitalize">{role}</p>
                  {role === 'admin' && (
                    <span className="ml-2 inline-flex items-center rounded-full bg-purple-100 px-1.5 py-0.5 text-xs font-medium text-purple-700">
                      <ShieldCheck className="w-3 h-3 mr-1" />
                      Admin
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={signOut}
              className="flex w-full items-center px-3 py-2 text-sm font-medium text-red-600 rounded-md hover:bg-red-50 transition-colors"
            >
              <LogOut className="mr-3 h-5 w-5 text-red-500" />
              Sign Out
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Mobile Header */}
          <header className="md:hidden h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4">
            <Link href="/" className="flex items-center font-bold text-xl text-blue-600">
              <GraduationCap className="h-6 w-6 mr-2" />
              SkillBridge
            </Link>
            <button
              onClick={signOut}
              className="p-2 text-red-600 hover:bg-red-50 rounded-md"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </header>
          
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
            {children}
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
