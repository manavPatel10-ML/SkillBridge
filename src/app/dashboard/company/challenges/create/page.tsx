"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import { collection, addDoc, getDocs, writeBatch, doc } from "firebase/firestore";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useRouter } from "next/navigation";
import { 
  ChallengeInterviewQuestion, 
  ChallengePracticalTask, 
  ChallengeTheoryConfiguration, 
  CompanyChallenge 
} from "@/types";
import { 
  ArrowLeft, 
  ArrowRight, 
  Save, 
  Loader2, 
  Plus, 
  Trash2,
  CheckCircle,
  AlertCircle
} from "lucide-react";
import Link from "next/link";

interface Skill {
  id: string;
  name: string;
  category: string;
}

const STEPS = ["Basic Info", "Theory", "Hiring Task", "Interview", "Review"];

export default function CreateChallengePage() {
  const { user } = useAuth();
  const router = useRouter();
  
  const [currentStep, setCurrentStep] = useState(0);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [basicInfo, setBasicInfo] = useState({
    title: "",
    jobRole: "",
    description: "",
    requiredSkillIds: [] as string[],
    difficulty: "medium" as "easy" | "medium" | "hard",
    applicationDeadline: "",
    maxApplicants: "100",
  });

  const [theoryConfig, setTheoryConfig] = useState({
    enabled: false,
    requiredSkillIds: [] as string[],
    easyQuestionCount: "5",
    mediumQuestionCount: "3",
    hardQuestionCount: "2",
    timePerQuestionSeconds: "30",
    passingScore: "70"
  });

  const [practicalTask, setPracticalTask] = useState({
    enabled: false,
    title: "",
    instructions: "",
    expectedDeliverables: "",
    durationMinutes: "60",
    evaluationCriteria: [{ criterion: "", weight: "100" }]
  });

  const [interviewQuestions, setInterviewQuestions] = useState<any[]>([
    { question: "", category: "", difficulty: "medium", expectedKeyPoints: [""], maximumScore: "10", order: 0 }
  ]);
  const [interviewEnabled, setInterviewEnabled] = useState(false);

  useEffect(() => {
    async function fetchSkills() {
      try {
        const snapshot = await getDocs(collection(db, "skills"));
        setSkills(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Skill)));
      } catch (err) {
        console.error("Failed to load skills", err);
      }
    }
    fetchSkills();
  }, []);

  const totalTheoryQuestions = (Number(theoryConfig.easyQuestionCount) || 0) + (Number(theoryConfig.mediumQuestionCount) || 0) + (Number(theoryConfig.hardQuestionCount) || 0);
  const theoryDurationMinutes = (totalTheoryQuestions * (Number(theoryConfig.timePerQuestionSeconds) || 0)) / 60;
  const totalWeight = practicalTask.evaluationCriteria.reduce((sum, c) => sum + (Number(c.weight) || 0), 0);

  const validateStep = (step: number) => {
    setError(null);
    if (step === 0) {
      if (!basicInfo.title.trim() || !basicInfo.jobRole.trim() || !basicInfo.description.trim() || !basicInfo.applicationDeadline || basicInfo.maxApplicants === "") {
        setError("Please fill in all required fields.");
        return false;
      }
      if (basicInfo.requiredSkillIds.length === 0) {
        setError("Please select at least one required skill.");
        return false;
      }
    }
    if (step === 1 && theoryConfig.enabled) {
      if (theoryConfig.requiredSkillIds.length === 0) {
        setError("Please select at least one skill for the theory assessment.");
        return false;
      }
      if (theoryConfig.easyQuestionCount === "" || theoryConfig.mediumQuestionCount === "" || theoryConfig.hardQuestionCount === "" || theoryConfig.timePerQuestionSeconds === "" || theoryConfig.passingScore === "") {
        setError("Please fill in all theory numeric fields.");
        return false;
      }
      if (totalTheoryQuestions === 0) {
        setError("Total questions must be greater than 0.");
        return false;
      }
    }
    if (step === 2 && practicalTask.enabled) {
      if (!practicalTask.title.trim() || !practicalTask.instructions.trim() || practicalTask.durationMinutes === "") {
        setError("Please fill in all required practical task fields.");
        return false;
      }
      if (totalWeight !== 100) {
        setError(`Total evaluation weight must be exactly 100%. Currently it is ${totalWeight}%.`);
        return false;
      }
      for (const criteria of practicalTask.evaluationCriteria) {
        if (!criteria.criterion.trim() || criteria.weight === "") {
          setError("All evaluation criteria must have a description and a weight.");
          return false;
        }
      }
    }
    if (step === 3 && interviewEnabled) {
      for (const q of interviewQuestions) {
        if (!q.question.trim() || q.maximumScore === "") {
          setError("All interview questions must have text and a maximum score.");
          return false;
        }
      }
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => prev + 1);
      window.scrollTo(0, 0);
    }
  };

  const handleBack = () => {
    setCurrentStep(prev => prev - 1);
    setError(null);
    window.scrollTo(0, 0);
  };

  const handleSaveDraft = async () => {
    // Only basic info is strictly required for a draft (Step 0).
    // If we're on step 0, validate it. Otherwise, assume basic info is okay enough to save.
    if (currentStep === 0 && !validateStep(0)) return;
    if (!user) return;

    setSaving(true);
    setError(null);

    try {
      const batch = writeBatch(db);
      
      const challengeRef = doc(collection(db, "companyChallenges"));
      const challengeId = challengeRef.id;
      const now = new Date().toISOString();

      const challengeData: CompanyChallenge = {
        companyId: user.uid,
        title: basicInfo.title,
        jobRole: basicInfo.jobRole,
        description: basicInfo.description,
        requiredSkillIds: basicInfo.requiredSkillIds,
        difficulty: basicInfo.difficulty,
        applicationDeadline: basicInfo.applicationDeadline ? new Date(basicInfo.applicationDeadline).toISOString() : now,
        maxApplicants: Number(basicInfo.maxApplicants) || 0,
        status: 'draft',
        overallPassingScore: 70, // Can be made dynamic
        integrityMonitoringEnabled: true,
        theoryRequired: theoryConfig.enabled,
        practicalRequired: practicalTask.enabled,
        interviewRequired: interviewEnabled,
        applicantCount: 0,
        createdAt: now,
        updatedAt: now,
      };

      batch.set(challengeRef, challengeData);

      if (theoryConfig.enabled) {
        const theoryRef = doc(collection(db, "challengeTheoryConfiguration"));
        const theoryData: ChallengeTheoryConfiguration = {
          challengeId,
          requiredSkillIds: theoryConfig.requiredSkillIds,
          questionCount: totalTheoryQuestions,
          easyQuestionCount: Number(theoryConfig.easyQuestionCount) || 0,
          mediumQuestionCount: Number(theoryConfig.mediumQuestionCount) || 0,
          hardQuestionCount: Number(theoryConfig.hardQuestionCount) || 0,
          timePerQuestionSeconds: Number(theoryConfig.timePerQuestionSeconds) || 30,
          passingScore: Number(theoryConfig.passingScore) || 70,
          createdAt: now,
          updatedAt: now
        };
        batch.set(theoryRef, theoryData);
      }

      if (practicalTask.enabled) {
        const practicalRef = doc(collection(db, "challengePracticalTasks"));
        const practicalData: ChallengePracticalTask = {
          challengeId,
          title: practicalTask.title,
          instructions: practicalTask.instructions,
          expectedDeliverables: practicalTask.expectedDeliverables,
          durationMinutes: Number(practicalTask.durationMinutes) || 60,
          requirements: ["Follow the instructions provided"],
          submissionTypes: ["github", "live_url"],
          evaluationCriteria: practicalTask.evaluationCriteria.map(c => ({
            criterion: c.criterion,
            weight: Number(c.weight) || 0
          }))
        };
        batch.set(practicalRef, practicalData);
      }

      if (interviewEnabled) {
        interviewQuestions.forEach((q, idx) => {
          const qRef = doc(collection(db, "challengeInterviewQuestions"));
          const qData: ChallengeInterviewQuestion = {
            challengeId,
            question: q.question,
            category: q.category || 'General',
            difficulty: q.difficulty,
            expectedKeyPoints: q.expectedKeyPoints.filter((p: string) => p.trim() !== ""),
            maximumScore: Number(q.maximumScore) || 10,
            order: idx,
            createdAt: now
          };
          batch.set(qRef, qData);
        });
      }

      await batch.commit();
      router.push("/dashboard/company/challenges");
    } catch (err) {
      console.error("Error creating draft:", err);
      setError("Failed to save draft. Please try again.");
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    // Publish requires ALL steps to be valid
    if (!validateStep(0)) { setCurrentStep(0); return; }
    if (theoryConfig.enabled && !validateStep(1)) { setCurrentStep(1); return; }
    if (practicalTask.enabled && !validateStep(2)) { setCurrentStep(2); return; }
    if (interviewEnabled && !validateStep(3)) { setCurrentStep(3); return; }
    if (!validateStep(currentStep)) return;
    if (!user) return;

    setSaving(true);
    setError(null);

    try {
      const batch = writeBatch(db);
      
      const challengeRef = doc(collection(db, "companyChallenges"));
      const challengeId = challengeRef.id;
      const now = new Date().toISOString();

      const challengeData: CompanyChallenge = {
        companyId: user.uid,
        title: basicInfo.title,
        jobRole: basicInfo.jobRole,
        description: basicInfo.description,
        requiredSkillIds: basicInfo.requiredSkillIds,
        difficulty: basicInfo.difficulty,
        applicationDeadline: new Date(basicInfo.applicationDeadline).toISOString(),
        maxApplicants: Number(basicInfo.maxApplicants) || 0,
        status: 'published',
        overallPassingScore: 70, // Can be made dynamic
        integrityMonitoringEnabled: true,
        theoryRequired: theoryConfig.enabled,
        practicalRequired: practicalTask.enabled,
        interviewRequired: interviewEnabled,
        applicantCount: 0,
        createdAt: now,
        updatedAt: now,
        publishedAt: now
      };

      batch.set(challengeRef, challengeData);

      if (theoryConfig.enabled) {
        const theoryRef = doc(collection(db, "challengeTheoryConfiguration"));
        const theoryData: ChallengeTheoryConfiguration = {
          challengeId,
          requiredSkillIds: theoryConfig.requiredSkillIds,
          questionCount: totalTheoryQuestions,
          easyQuestionCount: Number(theoryConfig.easyQuestionCount) || 0,
          mediumQuestionCount: Number(theoryConfig.mediumQuestionCount) || 0,
          hardQuestionCount: Number(theoryConfig.hardQuestionCount) || 0,
          timePerQuestionSeconds: Number(theoryConfig.timePerQuestionSeconds) || 30,
          passingScore: Number(theoryConfig.passingScore) || 70,
          createdAt: now,
          updatedAt: now
        };
        batch.set(theoryRef, theoryData);
      }

      if (practicalTask.enabled) {
        const practicalRef = doc(collection(db, "challengePracticalTasks"));
        const practicalData: ChallengePracticalTask = {
          challengeId,
          title: practicalTask.title,
          instructions: practicalTask.instructions,
          expectedDeliverables: practicalTask.expectedDeliverables,
          durationMinutes: Number(practicalTask.durationMinutes) || 60,
          requirements: ["Follow the instructions provided"], // default for old creation flow
          submissionTypes: ["github", "live_url"], // default for old creation flow
          evaluationCriteria: practicalTask.evaluationCriteria.map(c => ({
            criterion: c.criterion,
            weight: Number(c.weight) || 0
          }))
        };
        batch.set(practicalRef, practicalData);
      }

      if (interviewEnabled) {
        interviewQuestions.forEach((q, idx) => {
          const qRef = doc(collection(db, "challengeInterviewQuestions"));
          const qData: ChallengeInterviewQuestion = {
            challengeId,
            question: q.question,
            category: q.category || 'General',
            difficulty: q.difficulty,
            expectedKeyPoints: q.expectedKeyPoints.filter((p: string) => p.trim() !== ""),
            maximumScore: Number(q.maximumScore) || 10,
            order: idx,
            createdAt: now
          };
          batch.set(qRef, qData);
        });
      }

      await batch.commit();
      router.push("/dashboard/company/challenges");
    } catch (err) {
      console.error("Error publishing challenge:", err);
      setError("Failed to publish challenge. Please try again.");
      setSaving(false);
    }
  };

  return (
    <ProtectedRoute allowedRoles={["company"]}>
      <div className="max-w-4xl mx-auto space-y-6 pb-12">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/company/challenges" className="text-gray-500 hover:text-gray-700">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Post New Vacancy</h1>
            <p className="text-sm text-gray-500 mt-1">Design a multi-stage assessment for this vacancy.</p>
          </div>
        </div>

        {/* Stepper */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            {STEPS.map((step, idx) => (
              <div key={step} className="flex flex-col items-center relative z-10 flex-1">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                  idx === currentStep ? 'bg-blue-600 text-white' : 
                  idx < currentStep ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-400'
                }`}>
                  {idx < currentStep ? <CheckCircle className="w-5 h-5" /> : idx + 1}
                </div>
                <span className={`mt-2 text-xs font-medium ${
                  idx === currentStep ? 'text-blue-600' : 
                  idx < currentStep ? 'text-green-600' : 'text-gray-400'
                }`}>
                  {step}
                </span>
              </div>
            ))}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 p-4 rounded-md text-sm border border-red-200 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          
          {/* STEP 0: Basic Info */}
          {currentStep === 0 && (
            <div className="space-y-6">
              <h2 className="text-lg font-bold text-gray-900 border-b pb-2">Basic Information</h2>
              
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Vacancy Title</label>
                  <input
                    type="text"
                    value={basicInfo.title}
                    onChange={e => setBasicInfo(prev => ({ ...prev, title: e.target.value }))}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                    placeholder="e.g. Senior Frontend Developer"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Job Role</label>
                  <input
                    type="text"
                    value={basicInfo.jobRole}
                    onChange={e => setBasicInfo(prev => ({ ...prev, jobRole: e.target.value }))}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Difficulty</label>
                  <select
                    value={basicInfo.difficulty}
                    onChange={e => setBasicInfo(prev => ({ ...prev, difficulty: e.target.value as any }))}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <textarea
                    rows={4}
                    value={basicInfo.description}
                    onChange={e => setBasicInfo(prev => ({ ...prev, description: e.target.value }))}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                    placeholder="Describe the overall challenge and expectations..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Application Deadline</label>
                  <input
                    type="date"
                    value={basicInfo.applicationDeadline}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={e => setBasicInfo(prev => ({ ...prev, applicationDeadline: e.target.value }))}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Maximum Applicants</label>
                  <input
                    type="number"
                    min="1"
                    value={basicInfo.maxApplicants}
                    onChange={e => setBasicInfo(prev => ({ ...prev, maxApplicants: e.target.value }))}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Required Skills (Select multiple)</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {skills.map(skill => (
                      <label key={skill.id} className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${basicInfo.requiredSkillIds.includes(skill.id) ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                        <input
                          type="checkbox"
                          className="hidden"
                          checked={basicInfo.requiredSkillIds.includes(skill.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setBasicInfo(prev => ({ ...prev, requiredSkillIds: [...prev.requiredSkillIds, skill.id] }));
                            } else {
                              setBasicInfo(prev => ({ ...prev, requiredSkillIds: prev.requiredSkillIds.filter(id => id !== skill.id) }));
                            }
                          }}
                        />
                        <span className={`text-sm font-medium ${basicInfo.requiredSkillIds.includes(skill.id) ? 'text-blue-700' : 'text-gray-700'}`}>
                          {skill.name}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 1: Theory Config */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b pb-2">
                <h2 className="text-lg font-bold text-gray-900">Theory Assessment</h2>
                <label className="flex items-center cursor-pointer">
                  <div className="relative">
                    <input type="checkbox" className="sr-only" checked={theoryConfig.enabled} onChange={e => setTheoryConfig(prev => ({...prev, enabled: e.target.checked}))} />
                    <div className={`block w-10 h-6 rounded-full transition-colors ${theoryConfig.enabled ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
                    <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${theoryConfig.enabled ? 'transform translate-x-4' : ''}`}></div>
                  </div>
                  <span className="ml-3 text-sm font-medium text-gray-900">Enable Theory Section</span>
                </label>
              </div>

              {theoryConfig.enabled ? (
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div className="sm:col-span-2 bg-blue-50 text-blue-800 p-4 rounded-lg border border-blue-200">
                    <p className="font-semibold flex items-center gap-2"><CheckCircle className="w-5 h-5" /> Summary</p>
                    <p className="text-sm mt-1">Total Questions: {totalTheoryQuestions}</p>
                    <p className="text-sm">Estimated Duration: {theoryDurationMinutes} minutes</p>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Select Assessment Skills</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {skills.map(skill => (
                        <label key={skill.id} className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${theoryConfig.requiredSkillIds.includes(skill.id) ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                          <input
                            type="checkbox"
                            className="hidden"
                            checked={theoryConfig.requiredSkillIds.includes(skill.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setTheoryConfig(prev => ({ ...prev, requiredSkillIds: [...prev.requiredSkillIds, skill.id] }));
                              } else {
                                setTheoryConfig(prev => ({ ...prev, requiredSkillIds: prev.requiredSkillIds.filter(id => id !== skill.id) }));
                              }
                            }}
                          />
                          <span className={`text-sm font-medium ${theoryConfig.requiredSkillIds.includes(skill.id) ? 'text-blue-700' : 'text-gray-700'}`}>
                            {skill.name}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Easy Questions</label>
                    <input type="number" min="0" value={theoryConfig.easyQuestionCount} onChange={e => setTheoryConfig(prev => ({...prev, easyQuestionCount: e.target.value}))} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none sm:text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Medium Questions</label>
                    <input type="number" min="0" value={theoryConfig.mediumQuestionCount} onChange={e => setTheoryConfig(prev => ({...prev, mediumQuestionCount: e.target.value}))} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none sm:text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Hard Questions</label>
                    <input type="number" min="0" value={theoryConfig.hardQuestionCount} onChange={e => setTheoryConfig(prev => ({...prev, hardQuestionCount: e.target.value}))} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none sm:text-sm" />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Time per Question (seconds)</label>
                    <input type="number" min="10" value={theoryConfig.timePerQuestionSeconds} onChange={e => setTheoryConfig(prev => ({...prev, timePerQuestionSeconds: e.target.value}))} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none sm:text-sm" />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Passing Score (%)</label>
                    <input type="number" min="1" max="100" value={theoryConfig.passingScore} onChange={e => setTheoryConfig(prev => ({...prev, passingScore: e.target.value}))} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none sm:text-sm" />
                  </div>

                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  Theory assessment is disabled for this vacancy.
                </div>
              )}
            </div>
          )}

          {/* STEP 2: Practical Task */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b pb-2">
                <h2 className="text-lg font-bold text-gray-900">Hiring Task</h2>
                <label className="flex items-center cursor-pointer">
                  <div className="relative">
                    <input type="checkbox" className="sr-only" checked={practicalTask.enabled} onChange={e => setPracticalTask(prev => ({...prev, enabled: e.target.checked}))} />
                    <div className={`block w-10 h-6 rounded-full transition-colors ${practicalTask.enabled ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
                    <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${practicalTask.enabled ? 'transform translate-x-4' : ''}`}></div>
                  </div>
                  <span className="ml-3 text-sm font-medium text-gray-900">Enable Hiring Task Section</span>
                </label>
              </div>

              {practicalTask.enabled ? (
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">Task Title</label>
                    <input type="text" value={practicalTask.title} onChange={e => setPracticalTask(prev => ({...prev, title: e.target.value}))} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none sm:text-sm" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">Instructions</label>
                    <textarea rows={4} value={practicalTask.instructions} onChange={e => setPracticalTask(prev => ({...prev, instructions: e.target.value}))} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none sm:text-sm" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">Expected Deliverables</label>
                    <textarea rows={2} value={practicalTask.expectedDeliverables} onChange={e => setPracticalTask(prev => ({...prev, expectedDeliverables: e.target.value}))} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none sm:text-sm" placeholder="e.g. GitHub Repository link and deployed URL" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Duration (Minutes)</label>
                    <input type="number" min="1" value={practicalTask.durationMinutes} onChange={e => setPracticalTask(prev => ({...prev, durationMinutes: e.target.value}))} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none sm:text-sm" />
                  </div>
                  
                  <div className="sm:col-span-2 border-t pt-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-md font-bold text-gray-900">Evaluation Criteria</h3>
                      <span className={`text-sm font-bold ${totalWeight === 100 ? 'text-green-600' : 'text-red-600'}`}>Total Weight: {totalWeight}%</span>
                    </div>
                    
                    <div className="space-y-3">
                      {practicalTask.evaluationCriteria.map((criteria, idx) => (
                        <div key={idx} className="flex items-start gap-3">
                          <div className="flex-1">
                            <input
                              type="text"
                              placeholder="Criterion description (e.g. Code Quality)"
                              value={criteria.criterion}
                              onChange={e => {
                                setPracticalTask(prev => {
                                  const newC = [...prev.evaluationCriteria];
                                  newC[idx].criterion = e.target.value;
                                  return { ...prev, evaluationCriteria: newC };
                                });
                              }}
                              className="block w-full rounded-md border border-gray-300 px-3 py-2 sm:text-sm"
                            />
                          </div>
                          <div className="w-24">
                            <div className="relative">
                              <input
                                type="number"
                                min="1"
                                max="100"
                                value={criteria.weight}
                                onChange={e => {
                                  setPracticalTask(prev => {
                                    const newC = [...prev.evaluationCriteria];
                                    newC[idx].weight = e.target.value;
                                    return { ...prev, evaluationCriteria: newC };
                                  });
                                }}
                                className="block w-full rounded-md border border-gray-300 px-3 py-2 sm:text-sm pr-6"
                              />
                              <span className="absolute right-3 top-2 text-gray-500 text-sm">%</span>
                            </div>
                          </div>
                          {practicalTask.evaluationCriteria.length > 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                setPracticalTask(prev => {
                                  const newC = [...prev.evaluationCriteria];
                                  newC.splice(idx, 1);
                                  return { ...prev, evaluationCriteria: newC };
                                });
                              }}
                              className="p-2 text-red-500 hover:bg-red-50 rounded-md mt-0.5"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setPracticalTask(prev => ({
                          ...prev,
                          evaluationCriteria: [...prev.evaluationCriteria, { criterion: "", weight: "10" }]
                        }));
                      }}
                      className="mt-4 inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-500"
                    >
                      <Plus className="w-4 h-4 mr-1" /> Add Criterion
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  Hiring task is disabled for this vacancy.
                </div>
              )}
            </div>
          )}

          {/* STEP 3: Interview */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b pb-2">
                <h2 className="text-lg font-bold text-gray-900">Technical Interview</h2>
                <label className="flex items-center cursor-pointer">
                  <div className="relative">
                    <input type="checkbox" className="sr-only" checked={interviewEnabled} onChange={e => setInterviewEnabled(e.target.checked)} />
                    <div className={`block w-10 h-6 rounded-full transition-colors ${interviewEnabled ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
                    <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${interviewEnabled ? 'transform translate-x-4' : ''}`}></div>
                  </div>
                  <span className="ml-3 text-sm font-medium text-gray-900">Enable Interview Section</span>
                </label>
              </div>

              {interviewEnabled ? (
                <div className="space-y-6">
                  {interviewQuestions.map((q, idx) => (
                    <div key={idx} className="bg-gray-50 p-4 rounded-lg border border-gray-200 relative">
                      <div className="absolute top-4 right-4 flex gap-2">
                        {idx > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              const newQ = [...interviewQuestions];
                              // Move up
                              const temp = newQ[idx - 1];
                              newQ[idx - 1] = newQ[idx];
                              newQ[idx] = temp;
                              setInterviewQuestions(newQ);
                            }}
                            className="text-gray-400 hover:text-blue-600"
                          >
                            ↑
                          </button>
                        )}
                        {idx < interviewQuestions.length - 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              const newQ = [...interviewQuestions];
                              // Move down
                              const temp = newQ[idx + 1];
                              newQ[idx + 1] = newQ[idx];
                              newQ[idx] = temp;
                              setInterviewQuestions(newQ);
                            }}
                            className="text-gray-400 hover:text-blue-600"
                          >
                            ↓
                          </button>
                        )}
                        {interviewQuestions.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              const newQ = [...interviewQuestions];
                              newQ.splice(idx, 1);
                              setInterviewQuestions(newQ);
                            }}
                            className="text-red-400 hover:text-red-600 ml-2"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mt-4">
                        <div className="sm:col-span-2">
                          <label className="block text-sm font-medium text-gray-700">Question {idx + 1}</label>
                          <textarea
                            rows={3}
                            value={q.question}
                            onChange={e => {
                              setInterviewQuestions(prev => {
                                const newQ = [...prev];
                                newQ[idx].question = e.target.value;
                                return newQ;
                              });
                            }}
                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 sm:text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Category</label>
                          <input
                            type="text"
                            value={q.category}
                            onChange={e => {
                              setInterviewQuestions(prev => {
                                const newQ = [...prev];
                                newQ[idx].category = e.target.value;
                                return newQ;
                              });
                            }}
                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 sm:text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Difficulty</label>
                          <select
                            value={q.difficulty}
                            onChange={e => {
                              setInterviewQuestions(prev => {
                                const newQ = [...prev];
                                newQ[idx].difficulty = e.target.value as any;
                                return newQ;
                              });
                            }}
                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 sm:text-sm"
                          >
                            <option value="easy">Easy</option>
                            <option value="medium">Medium</option>
                            <option value="hard">Hard</option>
                          </select>
                        </div>
                        <div className="sm:col-span-2">
                          <label className="block text-sm font-medium text-gray-700">Expected Key Points (comma separated)</label>
                          <input
                            type="text"
                            value={q.expectedKeyPoints.join(', ')}
                            onChange={e => {
                              setInterviewQuestions(prev => {
                                const newQ = [...prev];
                                newQ[idx].expectedKeyPoints = e.target.value.split(',').map(s => s.trim());
                                return newQ;
                              });
                            }}
                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 sm:text-sm"
                            placeholder="e.g. closures, lexical scope, memory"
                          />
                        </div>
                      </div>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={() => {
                      setInterviewQuestions([...interviewQuestions, { question: "", category: "", difficulty: "medium", expectedKeyPoints: [""], maximumScore: 10, order: interviewQuestions.length }]);
                    }}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
                  >
                    <Plus className="w-4 h-4 mr-2" /> Add Question
                  </button>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  Interview assessment is disabled for this challenge.
                </div>
              )}
            </div>
          )}

          {/* STEP 4: Review */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <h2 className="text-lg font-bold text-gray-900 border-b pb-2">Review Challenge</h2>
              
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-gray-500 uppercase">Basic Information</h3>
                  <p className="mt-1 text-lg font-medium text-gray-900">{basicInfo.title}</p>
                  <p className="text-sm text-gray-700">{basicInfo.jobRole} • {basicInfo.difficulty} • Max {basicInfo.maxApplicants} applicants</p>
                  <p className="text-sm text-gray-600 mt-2">{basicInfo.description}</p>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t pt-4">
                  <div>
                    <h3 className="text-sm font-bold text-gray-500 uppercase">Theory</h3>
                    <p className="mt-1 text-sm font-medium text-gray-900">{theoryConfig.enabled ? 'Enabled' : 'Disabled'}</p>
                    {theoryConfig.enabled && (
                      <p className="text-xs text-gray-600">{totalTheoryQuestions} questions, {theoryDurationMinutes} mins</p>
                    )}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-500 uppercase">Practical</h3>
                    <p className="mt-1 text-sm font-medium text-gray-900">{practicalTask.enabled ? 'Enabled' : 'Disabled'}</p>
                    {practicalTask.enabled && (
                      <p className="text-xs text-gray-600">{practicalTask.durationMinutes} mins</p>
                    )}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-500 uppercase">Interview</h3>
                    <p className="mt-1 text-sm font-medium text-gray-900">{interviewEnabled ? 'Enabled' : 'Disabled'}</p>
                    {interviewEnabled && (
                      <p className="text-xs text-gray-600">{interviewQuestions.length} questions</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <button
            type="button"
            onClick={handleBack}
            disabled={currentStep === 0 || saving}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </button>
          
          <div className="flex gap-3">
            {currentStep < STEPS.length - 1 ? (
              <button
                type="button"
                onClick={handleNext}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                Next Step
                <ArrowRight className="w-4 h-4 ml-2" />
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  disabled={saving}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save Draft
                </button>
                <button
                  type="button"
                  onClick={handlePublish}
                  disabled={saving}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none disabled:opacity-50"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Publish Challenge
                </button>
              </>
            )}
          </div>
        </div>
        
      </div>
    </ProtectedRoute>
  );
}
