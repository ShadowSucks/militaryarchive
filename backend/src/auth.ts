// src/auth.ts
import mongoose, { Document, Schema } from "mongoose";
import crypto from "crypto";

// ---- Mongoose User Schema ----
export interface IUser extends Document {
  username: string;
  passwordHash: string; // SHA256 of the plaintext
}

const UserSchema = new Schema<IUser>({
  username: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
});

export const User = mongoose.model<IUser>("User", UserSchema);

// ---- Helper to create a user ----
export async function createUser(username: string, plainPassword: string) {
  const passwordHash = crypto
    .createHash("sha256")
    .update(plainPassword)
    .digest("hex");
  const user = new User({ username, passwordHash });
  return user.save();
}

// ---- Simple verify function ----
export async function verifyUser(username: string, plainPassword: string) {
  const passwordHash = crypto
    .createHash("sha256")
    .update(plainPassword)
    .digest("hex");
  return User.exists({ username, passwordHash });
}
