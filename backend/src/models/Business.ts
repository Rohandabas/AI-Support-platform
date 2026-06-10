import mongoose, { Document, Schema } from 'mongoose';

export interface IBusinessConfig {
  botName: string;
  welcomeMessage: string;
  personality: 'professional' | 'friendly' | 'technical';
  primaryColor: string;
  escalationRules: string[];
  suggestedQuestions: string[];
}

export interface IBusiness extends Document {
  tenantId: string;
  name: string;
  email: string;
  website?: string;
  logo?: string;
  config: IBusinessConfig;
  isActive: boolean;
  plan: 'free' | 'pro' | 'enterprise';
  createdAt: Date;
  updatedAt: Date;
}

const BusinessSchema = new Schema<IBusiness>(
  {
    tenantId: {
      type: String,
      required: true,
      unique: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
    },
    website: String,
    logo: String,
    config: {
      botName: { type: String, default: 'SupportBot' },
      welcomeMessage: {
        type: String,
        default: 'Hello! How can I help you today?',
      },
      personality: {
        type: String,
        enum: ['professional', 'friendly', 'technical'],
        default: 'professional',
      },
      primaryColor: { type: String, default: '#6366f1' },
      escalationRules: {
        type: [String],
        default: [
          'refund requested',
          'legal complaint',
          'customer angry',
          'human requested',
          'payment failure',
          'service outage',
        ],
      },
      suggestedQuestions: {
        type: [String],
        default: [
          'Track my order',
          'Pricing',
          'Refund policy',
          'Contact support',
        ],
      },
    },
    isActive: { type: Boolean, default: true },
    plan: {
      type: String,
      enum: ['free', 'pro', 'enterprise'],
      default: 'free',
    },
  },
  { timestamps: true }
);

export default mongoose.model<IBusiness>('Business', BusinessSchema);
