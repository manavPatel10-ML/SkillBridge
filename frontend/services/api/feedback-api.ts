import { apiClient } from "./client";
import { BetaFeedbackCategory } from "@shared/types";

export interface SubmitFeedbackPayload {
  category: BetaFeedbackCategory;
  severity: "low" | "medium" | "high" | "critical";
  description: string;
  affectedFlow?: string;
}

export async function submitBetaFeedback(payload: SubmitFeedbackPayload) {
  return apiClient<{ success: boolean; id: string }>("/api/beta/feedback", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
