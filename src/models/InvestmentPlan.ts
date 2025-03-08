import mongoose, { Schema, Document } from 'mongoose';

export interface IInvestmentPlan extends Document {
  userId: Schema.Types.ObjectId;
  tokenSymbol: string;
  amount: number;
  frequency: string; // 'minute', 'hour', 'day'
  toAddress: string;
  isActive: boolean;
  lastExecutionTime: Date;
  totalInvested: number;
  createdAt: Date;
  updatedAt: Date;
}

const InvestmentPlanSchema: Schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  tokenSymbol: { type: String, required: true },
  amount: { type: Number, required: true },
  frequency: { 
    type: String, 
    required: true,
    enum: ['minute', 'hour', 'day']
  },
  toAddress: { type: String, required: true },
  isActive: { type: Boolean, default: true },
  lastExecutionTime: { type: Date, default: null },
  totalInvested: { type: Number, default: 0 }
}, {
  timestamps: true
});

export const InvestmentPlan = mongoose.model<IInvestmentPlan>('InvestmentPlan', InvestmentPlanSchema);