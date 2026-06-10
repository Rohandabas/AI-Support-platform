// ============================
// Core Types for the Platform
// ============================

export interface User {
  _id: string;
  name: string;
  email: string;
  role: 'super_admin' | 'business_admin' | 'agent';
  tenantId: string;
  isActive: boolean;
  createdAt: string;
}

export interface BusinessConfig {
  botName: string;
  welcomeMessage: string;
  personality: 'professional' | 'friendly' | 'technical';
  primaryColor: string;
  escalationRules: string[];
  suggestedQuestions: string[];
}

export interface Business {
  _id: string;
  tenantId: string;
  name: string;
  email: string;
  website?: string;
  config: BusinessConfig;
  plan: 'free' | 'pro' | 'enterprise';
  createdAt: string;
}

export interface AuthState {
  user: User | null;
  business: Business | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface KBDocument {
  _id: string;
  tenantId: string;
  filename: string;
  originalName: string;
  fileType: 'pdf' | 'docx' | 'txt' | 'md';
  fileSize: number;
  status: 'pending' | 'processing' | 'indexed' | 'failed';
  chunkCount: number;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  role: 'user' | 'assistant' | 'agent' | 'system';
  content: string;
  timestamp: string;
  escalationFlag?: boolean;
  escalationReason?: string;
  responseTime?: number;
}

export interface Conversation {
  _id: string;
  tenantId: string;
  sessionId: string;
  customerName?: string;
  customerEmail?: string;
  messages: Message[];
  status: 'active' | 'resolved' | 'escalated' | 'abandoned';
  isEscalated: boolean;
  ticketId?: string;
  agentJoined: boolean;
  agentName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Ticket {
  _id: string;
  tenantId: string;
  ticketNumber: string;
  conversationId?: string;
  customerName: string;
  customerEmail: string;
  subject: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  tags: string[];
  resolvedAt?: string;
  closedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Escalation {
  _id: string;
  tenantId: string;
  ticketId: string | Ticket;
  conversationId: string | Conversation;
  sessionId: string;
  customerName: string;
  customerEmail: string;
  reason: string;
  triggerPhrase?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'acknowledged' | 'resolved';
  resolvedAt?: string;
  notes?: string;
  createdAt: string;
}

export interface DashboardStats {
  totalConversations: number;
  openTickets: number;
  resolvedTickets: number;
  escalatedTickets: number;
  aiResolutionRate: number;
  pendingEscalations: number;
  documents: number;
  weeklyTrend: number;
  recentConversations: number;
}

export interface AnalyticsData {
  overview: {
    totalConversations: number;
    resolvedConversations: number;
    escalatedConversations: number;
    resolutionRate: number;
    escalationRate: number;
    avgResponseTime: number;
    openTickets: number;
    resolvedTickets: number;
    pendingEscalations: number;
  };
  charts: {
    dailyConversations: Array<{
      _id: string;
      count: number;
      resolved: number;
      escalated: number;
    }>;
    ticketsByPriority: Record<string, number>;
    escalationsByPriority: Record<string, number>;
  };
  knowledgeBase: {
    documents: KBDocument[];
    totalDocuments: number;
  };
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}
