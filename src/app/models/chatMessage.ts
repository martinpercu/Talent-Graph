export interface ChatMessage {
  role?: string;
  message?: string;
  content?: string;
}

export interface ThreadHistoryResponse {
  exists: boolean;
  isEmpty: boolean;
  hasUserMessages: boolean;
  messageCount: number;
  threadId: string;
  lastUpdated: string | null;
  messages: ChatMessage[];
}
