"use client";

import { useState, useEffect, use } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, query, where, getDocs, limit } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { Loader2, ArrowLeft, Play, CheckCircle2, XCircle, Code2, AlertCircle, Terminal, BookOpen } from "lucide-react";
import Link from "next/link";
import { PracticeProblem, PracticeAttempt, LearningTopic } from "@/types";
import { useAuth } from "@/contexts/AuthContext";
import Editor from "@monaco-editor/react";

export default function SolvePracticeProblemPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const problemId = resolvedParams.id;
  const router = useRouter();
  const { user } = useAuth();
  
  const [problem, setProblem] = useState<PracticeProblem | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState<"python" | "javascript">("python");
  const [result, setResult] = useState<{ passed: boolean; message: string; log?: string } | null>(null);
  const [pastAttempts, setPastAttempts] = useState<PracticeAttempt[]>([]);
  const [activeTab, setActiveTab] = useState<"problem" | "submissions">("problem");
  const [relatedTopic, setRelatedTopic] = useState<LearningTopic | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      
      try {
        const problemSnap = await getDoc(doc(db, "practiceProblems", problemId));
        if (problemSnap.exists()) {
          const p = { id: problemSnap.id, ...problemSnap.data() } as PracticeProblem;
          setProblem(p);
          if (p.allowedLanguages && p.allowedLanguages.length > 0) {
            setLanguage(p.allowedLanguages[0] as any);
          }

          // Fetch related learning topic
          const topicQ = query(
            collection(db, "learningTopics"),
            where("skillId", "==", p.skillId),
            where("topic", "==", p.topic),
            where("active", "==", true),
            limit(1)
          );
          const topicSnap = await getDocs(topicQ);
          if (!topicSnap.empty) {
            setRelatedTopic({ id: topicSnap.docs[0].id, ...topicSnap.docs[0].data() } as LearningTopic);
          }
        }

        // Fetch past attempts for this user and this problem
        const attemptsQ = query(
          collection(db, "practiceAttempts"),
          where("studentId", "==", user.uid),
          where("problemId", "==", problemId)
        );
        const attemptsSnap = await getDocs(attemptsQ);
        const attemptsData = attemptsSnap.docs.map(d => ({ id: d.id, ...d.data() } as PracticeAttempt));
        
        attemptsData.sort((a, b) => {
          const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
          const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
          return timeB - timeA;
        });
        
        setPastAttempts(attemptsData);
        
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [problemId, user]);

  const handleSubmit = async () => {
    if (!user || !problem || !code.trim()) return;
    
    setSubmitting(true);
    setResult(null);
    
    try {
      const token = await user.getIdToken();
      
      const response = await fetch('/api/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          problemId: problem.id,
          language,
          sourceCode: code
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setResult({ passed: false, message: data.error || 'Server Error' });
        return;
      }

      const { attemptId, passed, resultStatus, passedTests, totalTests, errorLog } = data;

      const newAttempt: PracticeAttempt = {
        id: attemptId,
        studentId: user.uid,
        problemId: problem.id as string,
        skillId: problem.skillId,
        submittedCode: code,
        passed,
        language,
        resultStatus,
        passedTests,
        totalTests,
        errorLog,
        createdAt: { toMillis: () => Date.now() } 
      } as any;
      
      setPastAttempts([newAttempt, ...pastAttempts]);
      
      if (passed) {
        setResult({ passed: true, message: `Success! Passed all ${totalTests} test cases.` });
      } else {
        setResult({ 
          passed: false, 
          message: `${resultStatus}: Passed ${passedTests}/${totalTests} tests.`,
          log: errorLog
        });
      }
      
    } catch (error) {
      console.error("Error submitting code:", error);
      setResult({ passed: false, message: "An error occurred while communicating with the execution server." });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!problem) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900">Problem Not Found</h2>
        <p className="text-gray-500 mt-2">The practice problem you're looking for doesn't exist or is inactive.</p>
        <Link href="/dashboard/student/practice" className="mt-4 inline-block text-blue-600 hover:underline">
          Return to Practice
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center space-x-4">
        <Link href="/dashboard/student/practice" className="p-2 hover:bg-gray-100 rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{problem.title}</h1>
            <span className={`px-2 py-1 inline-flex text-xs font-semibold rounded-full ${
              problem.difficulty === 'beginner' ? 'bg-green-100 text-green-800' :
              problem.difficulty === 'intermediate' ? 'bg-yellow-100 text-yellow-800' :
              'bg-red-100 text-red-800'
            }`}>
              {problem.difficulty}
            </span>
          </div>
          <p className="text-gray-500 text-sm mt-1">Topic: {problem.topic}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left Column: Problem Statement */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col h-[calc(100vh-150px)] min-h-[600px]">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab("problem")}
              className={`flex-1 py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "problem" 
                  ? "border-blue-600 text-blue-600 bg-blue-50/50" 
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              }`}
            >
              Problem Description
            </button>
            <button
              onClick={() => setActiveTab("submissions")}
              className={`flex-1 py-3 px-4 text-sm font-medium border-b-2 transition-colors flex justify-center items-center gap-2 ${
                activeTab === "submissions" 
                  ? "border-blue-600 text-blue-600 bg-blue-50/50" 
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              }`}
            >
              Submissions
              <span className="bg-gray-100 text-gray-600 py-0.5 px-2 rounded-full text-xs">
                {pastAttempts.length}
              </span>
            </button>
          </div>
          
          <div className="p-6 overflow-y-auto flex-1">
            {activeTab === "problem" ? (
              <div className="space-y-6">
                <div className="prose prose-blue max-w-none">
                  <p className="text-gray-700 whitespace-pre-wrap">{problem.description}</p>
                </div>
                
                {problem.examples && problem.examples.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-lg text-gray-900 mb-4">Examples</h3>
                    <div className="space-y-4">
                      {problem.examples.map((ex, idx) => (
                        <div key={idx} className="bg-gray-50 border border-gray-200 rounded-lg p-4 font-mono text-sm">
                          <div className="font-semibold text-gray-700 mb-1">Example {idx + 1}:</div>
                          <div className="mb-2">
                            <span className="text-gray-500 font-bold">Input: </span>
                            <span className="text-gray-900">{ex.input}</span>
                          </div>
                          <div className="mb-2">
                            <span className="text-gray-500 font-bold">Output: </span>
                            <span className="text-gray-900">{ex.output}</span>
                          </div>
                          {ex.explanation && (
                            <div>
                              <span className="text-gray-500 font-bold">Explanation: </span>
                              <span className="text-gray-900">{ex.explanation}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {problem.constraints && problem.constraints.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-lg text-gray-900 mb-2">Constraints</h3>
                    <ul className="list-disc list-inside space-y-1 text-sm text-gray-700 font-mono bg-gray-50 border border-gray-200 p-4 rounded-lg">
                      {problem.constraints.map((c, idx) => (
                        <li key={idx}>{c}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {pastAttempts.length > 0 ? (
                  pastAttempts.map((attempt) => (
                    <div key={attempt.id} className={`p-4 rounded-lg border ${attempt.passed ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {attempt.passed ? (
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-600" />
                          )}
                          <span className={`font-semibold ${attempt.passed ? 'text-green-900' : 'text-red-900'}`}>
                            {attempt.resultStatus || (attempt.passed ? 'Accepted' : 'Wrong Answer')}
                          </span>
                        </div>
                        <span className="text-xs text-gray-500">
                          {attempt.createdAt?.toMillis ? new Date(attempt.createdAt.toMillis()).toLocaleString() : 'Just now'}
                        </span>
                      </div>
                      
                      <div className="flex gap-4 mb-3 text-xs text-gray-600">
                        {attempt.language && <span>Lang: <span className="font-mono">{attempt.language}</span></span>}
                        {attempt.passedTests !== undefined && <span>Tests: {attempt.passedTests}/{attempt.totalTests}</span>}
                        {attempt.executionTimeMs !== undefined && <span>Time: {attempt.executionTimeMs}ms</span>}
                      </div>

                      <div className="bg-gray-900 rounded p-3 overflow-x-auto">
                        <pre className="text-gray-300 font-mono text-xs whitespace-pre-wrap">{attempt.submittedCode}</pre>
                      </div>

                      {!attempt.passed && attempt.errorLog && (
                        <div className="mt-3 bg-red-900/10 border border-red-200 rounded p-3 overflow-x-auto">
                          <pre className="text-red-800 font-mono text-xs whitespace-pre-wrap">{attempt.errorLog}</pre>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No submissions yet. Write your code and submit!
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Code Editor */}
        <div className="bg-[#1e1e1e] rounded-xl shadow-lg border border-gray-800 flex flex-col h-[calc(100vh-150px)] min-h-[600px] overflow-hidden">
          <div className="bg-[#2d2d2d] px-4 py-2 border-b border-gray-700 flex justify-between items-center">
            <div className="flex items-center text-gray-400 text-sm">
              <Code2 className="w-4 h-4 mr-2" />
              <span>Solution Workspace</span>
            </div>
            <select 
              value={language} 
              onChange={(e) => setLanguage(e.target.value as any)}
              className="bg-[#1e1e1e] text-gray-300 border border-gray-600 text-sm rounded px-2 py-1 outline-none"
            >
              {(problem.allowedLanguages || ["python", "javascript"]).map(l => (
                <option key={l} value={l}>{l.charAt(0).toUpperCase() + l.slice(1)}</option>
              ))}
            </select>
          </div>
          
          <div className="flex-1 relative">
            <Editor
              height="100%"
              language={language}
              theme="vs-dark"
              value={code}
              onChange={(val) => setCode(val || "")}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                padding: { top: 16 },
                scrollBeyondLastLine: false,
              }}
            />
          </div>
          
          <div className="bg-[#2d2d2d] border-t border-gray-700 flex flex-col">
            
            {result && (
              <div className="p-4 border-b border-gray-700 max-h-48 overflow-y-auto">
                <div className={`flex items-start gap-3 ${result.passed ? 'text-green-400' : 'text-red-400'}`}>
                  {result.passed ? (
                    <CheckCircle2 className="h-5 w-5 mt-0.5 shrink-0" />
                  ) : (
                    <XCircle className="h-5 w-5 mt-0.5 shrink-0" />
                  )}
                  <div className="flex-1">
                    <p className="font-semibold text-sm">{result.message}</p>
                    {result.log && (
                      <div className="mt-2 bg-[#1e1e1e] p-2 rounded border border-gray-800 font-mono text-xs whitespace-pre-wrap">
                        {result.log}
                      </div>
                    )}
                    {!result.passed && relatedTopic && (
                      <div className="mt-3">
                        <Link 
                          href={`/dashboard/student/learn/${relatedTopic.id}?returnTo=${problem.id}`}
                          className="inline-flex items-center px-3 py-1.5 bg-blue-600/20 text-blue-400 border border-blue-500/30 hover:bg-blue-600/30 rounded-md text-sm font-medium transition-colors"
                        >
                          <BookOpen className="w-4 h-4 mr-2" />
                          Review Concept
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            <div className="p-4 flex justify-between items-center">
              <div className="text-xs text-gray-500 flex items-center gap-2">
                <Terminal className="w-4 h-4" />
                Execution secured by sandbox
              </div>
              <button
                onClick={handleSubmit}
                disabled={submitting || !code.trim()}
                className="flex items-center px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 font-medium"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Play className="w-4 h-4 mr-2 fill-current" />
                )}
                Submit Code
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
