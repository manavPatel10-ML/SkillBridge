import { apiClient } from "./client";

export interface GenerateRecommendationsResponse {
  recommendations: any[];
  cached?: boolean;
}

export async function fetchRecommendations(): Promise<GenerateRecommendationsResponse> {
  return apiClient<GenerateRecommendationsResponse>("/api/recommendations/generate");
}
