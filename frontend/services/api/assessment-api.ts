import { apiClient } from "./client";

export interface SubmitAssessmentPayload {
  attemptId: string;
  answers: Record<string, number | string>;
}

export interface SubmitAssessmentResponse {
  score: number;
  percentage: number;
  passed: boolean;
  totalQuestions: number;
  correctAnswers: number;
}

export async function fetchAssessmentQuestions(assessmentId: string, attemptId: string) {
  return apiClient<{ questions: any[] }>(`/api/assessments/${assessmentId}/questions?attemptId=${attemptId}`);
}

export async function submitAssessment(payload: SubmitAssessmentPayload): Promise<SubmitAssessmentResponse> {
  return apiClient<SubmitAssessmentResponse>("/api/assessments/submit", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
