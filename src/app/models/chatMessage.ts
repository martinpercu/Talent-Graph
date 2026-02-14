export interface ChatMessage {
  role?: string;
  message?: string;
  content?: string;
}

export type AgentState = 'booking' | 'email' | 'question' | 'chat' | null;

export interface ThreadHistoryResponse {
  exists: boolean;
  isEmpty: boolean;
  hasUserMessages: boolean;
  messageCount: number;
  threadId: string;
  lastUpdated: string | null;
  current_state?: AgentState;
  messages: ChatMessage[];
}
