import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  address: string;
  totalInvested: number;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema = new Schema({
  address: { type: String, required: true, unique: true },
  totalInvested: { type: Number, default: 0 },
}, {
  timestamps: true
});

export const User = mongoose.model<IUser>('User', UserSchema);