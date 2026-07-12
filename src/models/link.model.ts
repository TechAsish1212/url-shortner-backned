import { model } from "mongoose";
import { Schema, Types } from "mongoose";

export interface ILink {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  originalUrl: string;
  shortCode: string;
  customAlis?: string;
  isActive: boolean;
  totalClicks: number;
  uniqueClicks: number;
  expiresAt: Date;
  createdAt: Date;
  updateAt: Date;
}

const linkSchema = new Schema<ILink>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  originalUrl: {
    type: String,
    required: true,
  },
  shortCode: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  totalClicks: {
    type: Number,
    default: 0,
  },
  uniqueClicks: {
    type: Number,
    default: 0,
  },
  customAlis: String,
  expiresAt: Date,
},{
    timestamps:true,
});



export const Link=model<ILink>("Link",linkSchema);