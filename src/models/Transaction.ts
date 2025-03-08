import mongoose, { Schema, Document } from 'mongoose';

export interface ITransaction extends Document {
  planId?: Schema.Types.ObjectId;
  userId: Schema.Types.ObjectId;
  tokenSymbol: string;
  amount: number;
  tokenAmount: number;
  tokenPrice: number;
  txHash: string;
  status: string;
  timestamp: Date;
}

const TransactionSchema: Schema = new Schema({
  planId: { type: Schema.Types.ObjectId, ref: 'InvestmentPlan' },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  tokenSymbol: { type: String, required: true },
  amount: { type: Number, required: true },
  tokenAmount: { type: Number, required: true },
  tokenPrice: { type: Number, required: true },
  txHash: { type: String, required: true },
  status: { 
    type: String, 
    required: true, 
    enum: ['pending', 'completed', 'failed'],
    default: 'pending'
  },
  timestamp: { type: Date, default: Date.now }
});

export const Transaction = mongoose.model<ITransaction>('Transaction', TransactionSchema);