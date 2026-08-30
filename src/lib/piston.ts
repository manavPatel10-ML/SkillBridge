// Client for the Piston Code Execution API
// https://github.com/engineer-man/piston

export interface PistonExecuteRequest {
  language: string;
  version: string;
  files: {
    name?: string;
    content: string;
  }[];
  stdin?: string;
  args?: string[];
  compile_timeout?: number;
  run_timeout?: number;
  compile_memory_limit?: number;
  run_memory_limit?: number;
}

export interface PistonExecuteResponse {
  language: string;
  version: string;
  run: {
    stdout: string;
    stderr: string;
    code: number;
    signal: string | null;
    output: string;
  };
  compile?: {
    stdout: string;
    stderr: string;
    code: number;
    signal: string | null;
    output: string;
  };
  message?: string; // If error
}

const PISTON_API_URL = process.env.PISTON_API_URL || 'https://emkc.org/api/v2/piston';

// Map our platform languages to Piston languages
const LANGUAGE_MAP: Record<string, { language: string; version: string }> = {
  python: { language: 'python', version: '3.10.0' },
  javascript: { language: 'javascript', version: '18.15.0' },
};

export async function executeCode(
  language: string,
  sourceCode: string,
  input: string = ''
): Promise<PistonExecuteResponse> {
  const pistonLang = LANGUAGE_MAP[language.toLowerCase()];
  
  if (!pistonLang) {
    throw new Error(`Unsupported execution language: ${language}`);
  }

  const payload: PistonExecuteRequest = {
    language: pistonLang.language,
    version: pistonLang.version,
    files: [
      {
        content: sourceCode,
      },
    ],
    stdin: input,
    run_timeout: 2000, // 2 seconds max
  };

  const response = await fetch(`${PISTON_API_URL}/execute`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Piston API Error: ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<PistonExecuteResponse>;
}
