import mongoose, { Schema } from "mongoose";
const subscriptionSchema = new Schema(
  {
    //one who is subscribing
    subscriber: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },

    //one who is subscribed
    channel: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);
export const Subscription = mongoose.model("Subscription", subscriptionSchema);
