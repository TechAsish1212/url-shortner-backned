import { Schema, model, Types } from "mongoose";

export interface IClickEvent {
  _id: Types.ObjectId;

  linkId: Types.ObjectId;

  visitorId: string;

  ipHash: string;

  country: string;

  city: string;

  deviceType: string;

  browser: string;

  os: string;

  referer?: string;

  clickedAt: Date;
}

const clickEventSchema = new Schema<IClickEvent>({
  linkId: {
    type: Schema.Types.ObjectId,
    ref: "Link",
    index: true,
  },

  visitorId: String,

  ipHash: String,

  country: String,

  city: String,

  deviceType: String,

  browser: String,

  os: String,

  referer: String,

  clickedAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
});

export const ClickEvent = model<IClickEvent>(
  "ClickEvent",
  clickEventSchema
);