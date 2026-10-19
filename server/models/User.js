
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },

    password: {
      type: String,
      required: true,
      select: false
    },

    role: {
      type: String,
      enum: ["admin", "user"],
      default: "user"
    },

    // Invalidates previous JWTs after password changes
    tokenVersion: {
      type: Number,
      default: 0
    },

    // Hashed password-reset token
    resetPasswordToken: {
      type: String,
      select: false
    },

    // Password-reset expiration date
    resetPasswordExpires: {
      type: Date,
      select: false
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("User", userSchema);


