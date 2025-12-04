export interface ChatData {
  threadId: string;
  name: string;
}

export interface Recruiter {
  recruiterUID: string;
  email: string,
  username: string;
  displayname?: string;
  lastname?: string;
  id?: string;
  subscriptionLevel: number;
  businessName?: string;
  cellphone?: string;
  whatsapp?: string;
  allowWhatsapp?: boolean;
  useExams?: boolean;
  useManager?: boolean;
  useAgentsAI?: boolean;
  chatsData?: ChatData[];  // Array de threads con ID y nombre fijo
}
