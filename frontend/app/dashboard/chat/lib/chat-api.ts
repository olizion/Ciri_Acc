import { API_BASE_URL } from "@/lib/api";

export interface ChatResponseAction {
  type: string;
  label: string;
  target?: string;
}

export interface ChatApiResponse {
  id: string;
  role: "assistant";
  content: string;
  timestamp: string;
  actions?: ChatResponseAction[];
  metadata?: {
    model?: string;
    tokens_used?: number;
    cached?: boolean;
  };
}

export interface Suggestion {
  icon: string;
  label: string;
  query: string;
}

export async function sendChatMessage(
  message: string,
  context?: Record<string, unknown>
): Promise<ChatApiResponse> {
  const res = await fetch(`${API_BASE_URL}/api/ciri/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, context: context ?? null })
  });
  if (!res.ok) {
    throw new Error(`Chat API error: ${res.status}`);
  }
  return res.json();
}

export async function getSuggestions(
  page: string = "dashboard",
  limit: number = 5
): Promise<Suggestion[]> {
  const res = await fetch(
    `${API_BASE_URL}/api/ciri/suggestions?page=${encodeURIComponent(page)}&limit=${limit}`
  );
  if (!res.ok) {
    throw new Error(`Suggestions API error: ${res.status}`);
  }
  return res.json();
}
