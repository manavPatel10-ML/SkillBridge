"use client";

import { useEffect, useState, Suspense } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, getDocs } from "firebase/firestore";
import { Loader2, ArrowLeft, Terminal, AlertTriangle, Lightbulb, Code2 } from "lucide-react";
import Link from "next/link";
import { LearningTopic } from "@/types";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

export default function StudentLearningContentPage({ params }: { params: { id: string } }) {
  return (
    <Suspense fallback={<div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-blue-500" /></div>}>
      <LearningContentInner params={params} />
    </Suspense>
  );
}

function LearningContentInner({ params }: { params: { id: string } }) {
  const searchParams = useSearchParams();
  const returnTo = searchParams.get('returnTo');

  const [topic, setTopic] = useState<LearningTopic | null>(null);
  const [skillName, setSkillName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { user } = useAuth();
  const recId = searchParams.get('recId');

  useEffect(() => {
    // Record ML Telemetry for viewing learning content
    if (recId && user && topic) {
      const recordView = async () => {
        try {
          const token = await user.getIdToken();
          await fetch('/api/ml-telemetry/outcome', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              recommendationId: recId,
              score: 100, // 100% since it's just content consumption
              passed: true,
              attempts: 1,
              evaluationStatus: 'completed'
            })
          });
        } catch (e) {
          console.error("Failed to record learning telemetry:", e);
        }
      };
      // Adding a small delay to simulate meaningful reading time
      const timer = setTimeout(() => recordView(), 3000);
      return () => clearTimeout(timer);
    }
  }, [recId, user, topic?.id]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const docRef = doc(db, "learningTopics", params.id);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data() as LearningTopic;
          if (!data.active) {
            setError("This learning content is currently inactive.");
            return;
          }
          setTopic({ id: docSnap.id, ...data });

          // Fetch skill name
          const skillSnap = await getDoc(doc(db, "skills", data.skillId));
          if (skillSnap.exists()) {
            setSkillName(skillSnap.data().name);
          } else {
            setSkillName("Unknown Skill");
          }
        } else {
          setError("Learning content not found.");
        }
      } catch (err: any) {
        console.error(err);
        setError("Failed to load learning content.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [params.id]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error || !topic) {
    return (
      <div className="text-center mt-12">
        <AlertTriangle className="mx-auto h-12 w-12 text-red-500 mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Unavailable</h2>
        <p className="text-gray-500 mb-6">{error}</p>
        <Link href="/dashboard/student/learn" className="text-blue-600 hover:underline">
          Return to Learning Center
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center space-x-4 mb-2">
        <Link
          href={returnTo ? `/dashboard/student/practice/${returnTo}` : "/dashboard/student/learn"}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-gray-500" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{topic.title}</h1>
          <p className="mt-1 text-sm text-blue-600 font-semibold">{skillName} &bull; {topic.topic}</p>
        </div>
      </div>

      <div className="bg-white shadow-sm border border-gray-200 rounded-xl overflow-hidden">
        {/* Overview */}
        <div className="p-6 md:p-8 border-b border-gray-100 bg-blue-50/30">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
            <Lightbulb className="h-5 w-5 mr-2 text-yellow-500" />
            Overview
          </h2>
          <div className="prose max-w-none text-gray-700 font-medium whitespace-pre-wrap">
            {topic.overview}
          </div>
        </div>

        {/* Key Concepts */}
        {topic.concepts && (
          <div className="p-6 md:p-8 border-b border-gray-100">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Key Concepts</h2>
            <div className="prose max-w-none text-gray-700 whitespace-pre-wrap">
              {topic.concepts}
            </div>
          </div>
        )}

        {/* Examples */}
        {topic.examples && (
          <div className="p-6 md:p-8 border-b border-gray-100 bg-gray-50">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
              <Code2 className="h-5 w-5 mr-2 text-blue-500" />
              Examples
            </h2>
            <div className="prose max-w-none text-gray-800 whitespace-pre-wrap font-mono text-sm">
              {topic.examples}
            </div>
          </div>
        )}

        {/* Common Mistakes */}
        {topic.commonMistakes && (
          <div className="p-6 md:p-8">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2 text-red-500" />
              Common Mistakes to Avoid
            </h2>
            <div className="prose max-w-none text-gray-700 whitespace-pre-wrap">
              {topic.commonMistakes}
            </div>
          </div>
        )}
      </div>

      {/* Action Area */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-xl p-8 text-center shadow-md">
        <h2 className="text-2xl font-bold text-white mb-2">
          {returnTo ? "Ready to try again?" : "Ready to test your knowledge?"}
        </h2>
        <p className="text-blue-100 mb-6 max-w-xl mx-auto">
          {returnTo 
            ? "Now that you've reviewed the concept, go back and solve the problem."
            : "Put what you've just learned into practice by solving real coding problems for this topic."}
        </p>
        <Link
          href={returnTo ? `/dashboard/student/practice/${returnTo}` : `/dashboard/student/practice?search=${encodeURIComponent(topic.topic)}`}
          className="inline-flex items-center px-6 py-3 border border-transparent text-base font-bold rounded-lg text-blue-700 bg-white hover:bg-gray-50 transition-colors shadow-sm"
        >
          {returnTo ? (
            <>
              <ArrowLeft className="h-5 w-5 mr-2" />
              Return to Problem
            </>
          ) : (
            <>
              <Terminal className="h-5 w-5 mr-2" />
              Practice {topic.topic} Now
            </>
          )}
        </Link>
      </div>
    </div>
  );
}
