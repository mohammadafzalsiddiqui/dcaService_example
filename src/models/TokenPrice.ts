import mongoose, { Schema, Document } from 'mongoose';

export interface ITokenPrice extends Document {
  symbol: string;
  price: number;
  timestamp: Date;
}

const TokenPriceSchema: Schema = new Schema({
  symbol: { type: String, required: true },
  price: { type: Number, required: true },
  timestamp: { type: Date, default: Date.now }
});

// Create index for efficient querying
TokenPriceSchema.index({ symbol: 1, timestamp: -1 });

export const TokenPrice = mongoose.model<ITokenPrice>('TokenPrice', TokenPriceSchema);