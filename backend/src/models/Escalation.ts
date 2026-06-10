import mongoose, { Document, Schema } from 'mongoose';

export interface IEscalation extends Document {
  tenantId: string;
  ticketId: mongoose.Types.ObjectId;
  conversationId: mongoose.Types.ObjectId;
  sessionId: string;
  customerName: string;
  customerEmail: string;
  reason: string;
  triggerPhrase?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'acknowledged' | 'resolved';
  resolvedBy?: mongoose.Types.ObjectId;
  resolvedAt?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const EscalationSchema = new Schema<IEscalation>(
  {
    tenantId: { type: String, required: true, index: true },
    ticketId: { type: Schema.Types.ObjectId, ref: 'Ticket', required: true },
    conversationId: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true },
    sessionId: { type: String, required: true },
    customerName: { type: String, required: true },
    customerEmail: { type: String, required: true },
    reason: { type: String, required: true },
    triggerPhrase: String,
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'high',
    },
    status: {
      type: String,
      enum: ['pending', 'acknowledged', 'resolved'],
      default: 'pending',
    },
    resolvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    resolvedAt: Date,
    notes: String,
  },
  { timestamps: true }
);

EscalationSchema.index({ tenantId: 1, status: 1 });
EscalationSchema.index({ tenantId: 1, priority: 1 });

export default mongoose.model<IEscalation>('Escalation', EscalationSchema);
