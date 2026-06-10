import mongoose, { Document, Schema } from 'mongoose';

export interface ITicket extends Document {
  tenantId: string;
  ticketNumber: string;
  conversationId?: mongoose.Types.ObjectId;
  sessionId?: string;
  customerName: string;
  customerEmail: string;
  subject: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  assignedTo?: mongoose.Types.ObjectId;
  escalationId?: mongoose.Types.ObjectId;
  tags: string[];
  resolvedAt?: Date;
  closedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const TicketSchema = new Schema<ITicket>(
  {
    tenantId: { type: String, required: true, index: true },
    ticketNumber: { type: String, unique: true },
    conversationId: { type: Schema.Types.ObjectId, ref: 'Conversation' },
    sessionId: String,
    customerName: { type: String, required: true },
    customerEmail: { type: String, required: true },
    subject: { type: String, required: true },
    description: { type: String, required: true },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
    },
    status: {
      type: String,
      enum: ['open', 'in_progress', 'resolved', 'closed'],
      default: 'open',
    },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User' },
    escalationId: { type: Schema.Types.ObjectId, ref: 'Escalation' },
    tags: [String],
    resolvedAt: Date,
    closedAt: Date,
  },
  { timestamps: true }
);

TicketSchema.index({ tenantId: 1, status: 1 });
TicketSchema.index({ tenantId: 1, priority: 1 });
TicketSchema.index({ tenantId: 1, createdAt: -1 });

// Auto-generate ticket number
TicketSchema.pre('save', async function (next) {
  if (this.isNew) {
    const count = await mongoose.model('Ticket').countDocuments({ tenantId: this.tenantId });
    this.ticketNumber = `TKT-${this.tenantId.substring(0, 6).toUpperCase()}-${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

export default mongoose.model<ITicket>('Ticket', TicketSchema);
