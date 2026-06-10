import mongoose, { Document, Schema } from 'mongoose';

export interface IMessage {
  role: 'user' | 'assistant' | 'agent' | 'system';
  content: string;
  timestamp: Date;
  escalationFlag?: boolean;
  escalationReason?: string;
  ticketCreated?: boolean;
  metadata?: Record<string, unknown>;
  responseTime?: number; // ms
}

export interface IConversation extends Document {
  tenantId: string;
  sessionId: string;
  customerName?: string;
  customerEmail?: string;
  messages: IMessage[];
  status: 'active' | 'resolved' | 'escalated' | 'abandoned';
  isEscalated: boolean;
  ticketId?: mongoose.Types.ObjectId;
  agentJoined: boolean;
  agentName?: string;
  startedAt: Date;
  endedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema = new Schema<IMessage>(
  {
    role: {
      type: String,
      enum: ['user', 'assistant', 'agent', 'system'],
      required: true,
    },
    content: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    escalationFlag: { type: Boolean, default: false },
    escalationReason: String,
    ticketCreated: { type: Boolean, default: false },
    metadata: { type: Schema.Types.Mixed },
    responseTime: Number,
  },
  { _id: false }
);

const ConversationSchema = new Schema<IConversation>(
  {
    tenantId: { type: String, required: true, index: true },
    sessionId: { type: String, required: true, unique: true },
    customerName: String,
    customerEmail: String,
    messages: [MessageSchema],
    status: {
      type: String,
      enum: ['active', 'resolved', 'escalated', 'abandoned'],
      default: 'active',
    },
    isEscalated: { type: Boolean, default: false },
    ticketId: { type: Schema.Types.ObjectId, ref: 'Ticket' },
    agentJoined: { type: Boolean, default: false },
    agentName: String,
    startedAt: { type: Date, default: Date.now },
    endedAt: Date,
  },
  { timestamps: true }
);

ConversationSchema.index({ tenantId: 1, createdAt: -1 });
ConversationSchema.index({ tenantId: 1, status: 1 });

export default mongoose.model<IConversation>('Conversation', ConversationSchema);
