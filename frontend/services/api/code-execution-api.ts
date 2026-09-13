import { apiClient } from "./client";

export interface ExecuteCodePayload {
  language: string;
  sourceCode: string;
  stdin?: string;
}

export interface ExecuteCodeResult {
  stdout: string;
  stderr: string;
  output: string;
  exitCode: number;
}

export async function executeCode(payload: ExecuteCodePayload): Promise<ExecuteCodeResult> {
  return apiClient<ExecuteCodeResult>("/api/execute", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
