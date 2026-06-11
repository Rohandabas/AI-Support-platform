import { getChatModel, generateEmbedding } from '../config/gemini';
import { queryCollection } from './vectorService';
import { IMessage } from '../models/Conversation';
import { IBusinessConfig } from '../models/Business';

export interface ChatResponse {
  content: string;
  escalationFlag: boolean;
  escalationReason?: string;
  suggestedQuestions: string[];
  sourceDocuments: string[];
  resolved: boolean;
  responseTime: number;
}

const ESCALATION_TRIGGERS = [
  'refund',
  'legal',
  'lawsuit',
  'attorney',
  'lawyer',
  'angry',
  'furious',
  'terrible',
  'awful',
  'worst',
  'unacceptable',
  'fraud',
  'scam',
  'police',
  'complaint',
  'sue',
  'human',
  'agent',
  'representative',
  'person',
  'payment failed',
  'charge',
  'outage',
  'down',
  'broken',
];

const detectEscalation = (
  userMessage: string,
  aiResponse: string,
  escalationRules: string[]
): { flag: boolean; reason?: string } => {
  const combinedText = `${userMessage} ${aiResponse}`.toLowerCase();
  const customRules = escalationRules.map((r) => r.toLowerCase());
  const allTriggers = [...ESCALATION_TRIGGERS, ...customRules];

  for (const trigger of allTriggers) {
    // Escape special regex characters in the trigger word
    const escapedTrigger = trigger.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    // Match only full words (word boundaries) to avoid false positives like "pursued" matching "sue"
    const regex = new RegExp(`\\b${escapedTrigger}\\b`, 'i');
    if (regex.test(combinedText)) {
      return { flag: true, reason: `Detected: "${trigger}"` };
    }
  }

  // AI couldn't resolve detection
  if (
    aiResponse.toLowerCase().includes("i don't know") ||
    aiResponse.toLowerCase().includes("i cannot help") ||
    aiResponse.toLowerCase().includes("i'm not sure") ||
    aiResponse.toLowerCase().includes("please contact")
  ) {
    return { flag: true, reason: 'AI could not resolve the issue' };
  }

  return { flag: false };
};

const getPersonalityPrompt = (personality: string): string => {
  switch (personality) {
    case 'friendly':
      return 'You are a warm, friendly, and empathetic support assistant. Use a conversational tone, be encouraging, and show genuine care for the customer.';
    case 'technical':
      return 'You are a precise, technical support specialist. Provide detailed, accurate technical information. Use technical terminology when appropriate and structure your responses clearly.';
    default:
      return 'You are a professional customer support assistant. Be concise, clear, and helpful. Maintain a professional tone throughout the conversation.';
  }
};

export const generateAIResponse = async (
  userMessage: string,
  tenantId: string,
  config: IBusinessConfig,
  conversationHistory: IMessage[]
): Promise<ChatResponse> => {
  const startTime = Date.now();

  try {
    // 1. Embed the user message
    const queryEmbedding = await generateEmbedding(userMessage);

    // 2. Query vector store for relevant context
    const relevantChunks = await queryCollection(tenantId, queryEmbedding, 5);
    const context = relevantChunks.map((c) => c.text).join('\n\n---\n\n');
    const sourceDocuments = relevantChunks
      .map((c) => (c.metadata.documentId as string) || '')
      .filter(Boolean);

    // 3. Build conversation history for context
    const historyText = conversationHistory
      .slice(-10) // Last 10 messages
      .map((m) => `${m.role === 'user' ? 'Customer' : 'Assistant'}: ${m.content}`)
      .join('\n');

    // 4. Compose the system prompt
    const systemPrompt = `${getPersonalityPrompt(config.personality)}

Your name is ${config.botName}.

KNOWLEDGE BASE CONTEXT (use this to answer questions):
${context || 'No specific context available for this query.'}

CONVERSATION HISTORY:
${historyText || 'This is the start of the conversation.'}

INSTRUCTIONS:
- Answer ONLY based on the knowledge base context provided
- If you cannot find relevant information in the context, say so honestly and suggest contacting support
- Format responses clearly using markdown when helpful (bullet points, numbered lists)
- Keep responses concise but complete
- If the customer's issue requires a refund, involves legal matters, payment failures, or they express extreme frustration, indicate this needs human attention
- Generate 3 relevant follow-up questions the customer might ask

Respond in this exact JSON format:
{
  "answer": "Your detailed answer here",
  "canResolve": true or false,
  "suggestedQuestions": ["Question 1?", "Question 2?", "Question 3?"]
}`;

    // 5. Call Gemini
    const model = getChatModel();
    const result = await model.generateContent([
      { text: systemPrompt },
      { text: `Customer question: ${userMessage}` },
    ]);

    const responseText = result.response.text();

    // 6. Parse JSON response
    let parsed: { answer: string; canResolve: boolean; suggestedQuestions: string[] };
    try {
      // Extract JSON from the response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        parsed = {
          answer: responseText,
          canResolve: true,
          suggestedQuestions: config.suggestedQuestions.slice(0, 3),
        };
      }
    } catch {
      parsed = {
        answer: responseText,
        canResolve: true,
        suggestedQuestions: config.suggestedQuestions.slice(0, 3),
      };
    }

    // 7. Detect escalation
    const escalation = detectEscalation(userMessage, parsed.answer, config.escalationRules);

    const responseTime = Date.now() - startTime;

    return {
      content: parsed.answer,
      escalationFlag: escalation.flag || !parsed.canResolve,
      escalationReason: escalation.reason,
      suggestedQuestions: parsed.suggestedQuestions || [],
      sourceDocuments,
      resolved: parsed.canResolve && !escalation.flag,
      responseTime,
    };
  } catch (error) {
    console.error('AI Service error:', error);
    return {
      content: `I apologize, but I'm having trouble processing your request right now. Please try again or contact our support team directly.`,
      escalationFlag: true,
      escalationReason: 'AI service error',
      suggestedQuestions: config.suggestedQuestions.slice(0, 3),
      sourceDocuments: [],
      resolved: false,
      responseTime: Date.now() - startTime,
    };
  }
};
