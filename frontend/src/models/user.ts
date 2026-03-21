import { Schema, model, models } from "mongoose";

const userSchema = new Schema(
  {
    email: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    image: { type: String },
    passwordHash: { type: String },
    provider: { type: String, enum: ["credentials", "google"], required: true },
  },
  { timestamps: true },
);

export const UserModel = models.User || model("User", userSchema);
