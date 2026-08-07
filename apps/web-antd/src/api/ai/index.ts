import { requestClient } from '#/api/request';

/** AI 多轮工具调用可能超过默认 10s */
const AI_REQUEST_TIMEOUT_MS = 120_000;

export namespace AiApi {
  export interface ChatMessage {
    content: string;
    role: 'assistant' | 'system' | 'user';
  }

  export interface CitedCost {
    id: number;
    summary: string;
    title: string;
    type: 'fumigation' | 'road' | 'sea';
  }

  export interface ProposedCost {
    payload: Record<string, unknown>;
    summary: string;
    title: string;
    type: 'fumigation' | 'road' | 'sea';
    warnings?: string[];
  }

  export interface OpenPage {
    page: string;
    routeName: string;
    title: string;
  }

  export interface ChatResponse {
    citedCosts: CitedCost[];
    model: string;
    openPages?: OpenPage[];
    proposedCosts?: ProposedCost[];
    reply: string;
    toolCalls: string[];
  }

  export interface ParseResponse {
    explanation: string;
    fields: Record<string, unknown>;
    sourceExcerpt: string;
  }
}

export function chatWithAi(messages: AiApi.ChatMessage[], enableTools = true) {
  return requestClient.post<AiApi.ChatResponse>(
    '/ai/chat',
    {
      enableTools,
      messages,
    },
    { timeout: AI_REQUEST_TIMEOUT_MS },
  );
}

export function parseAiText(text: string, hint?: string) {
  return requestClient.post<AiApi.ParseResponse>(
    '/ai/parse',
    {
      hint,
      text,
    },
    { timeout: AI_REQUEST_TIMEOUT_MS },
  );
}

export function parseAiFile(file: File, hint?: string) {
  const form = new FormData();
  form.append('file', file);
  if (hint) {
    form.append('hint', hint);
  }
  return requestClient.post<AiApi.ParseResponse>('/ai/parse/file', form, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    timeout: AI_REQUEST_TIMEOUT_MS,
  });
}
