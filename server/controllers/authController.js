
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { Resend } = require("resend");

// JWT GENERATOR
const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      tokenVersion: user.tokenVersion ?? 0
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "1d",
      algorithm: "HS256"
    }
  );
};

// PASSWORD VALIDATION
const validatePassword = (password) => {
  if (typeof password !== "string") {
    return "Password is required";
  }

  if (password.length < 8) {
    return "Password must be at least 8 characters";
  }

  if (Buffer.byteLength(password, "utf8") > 72) {
    return "Password must not exceed 72 bytes";
  }

  if (!/[A-Z]/.test(password)) {
    return "Password must contain an uppercase letter";
  }

  if (!/[a-z]/.test(password)) {
    return "Password must contain a lowercase letter";
  }

  if (!/[0-9]/.test(password)) {
    return "Password must contain a number";
  }

  if (!/[^A-Za-z0-9]/.test(password)) {
    return "Password must contain a special character";
  }

  return null;
};

// EMAIL VALIDATION
const isValidEmail = (email) => {
  return (
    typeof email === "string" &&
    email.length <= 254 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  );
};

// HASH RESET TOKEN
const hashResetToken = (token) => {
  return crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
};

// REGISTER USER
exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (
      typeof name !== "string" ||
      typeof email !== "string" ||
      typeof password !== "string" ||
      !name.trim() ||
      !email.trim() ||
      !password
    ) {
      return res.status(400).json({
        message: "All fields are required"
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (!isValidEmail(normalizedEmail)) {
      return res.status(400).json({
        message: "Invalid email address"
      });
    }

    const passwordError = validatePassword(password);

    if (passwordError) {
      return res.status(400).json({
        message: passwordError
      });
    }

    const existingUser = await User.findOne({
      email: normalizedEmail
    });

    if (existingUser) {
      return res.status(409).json({
        message: "Email already registered"
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      role: "user"
    });

    return res.status(201).json({
      message: "Registration successful",
      token: generateToken(user),
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "Email already registered"
      });
    }

    console.error("Registration error:", error);

    return res.status(500).json({
      message: "Server error"
    });
  }
};

// LOGIN USER
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      !email.trim() ||
      !password
    ) {
      return res.status(400).json({
        message: "Email and password are required"
      });
    }

    const user = await User.findOne({
      email: email.trim().toLowerCase()
    }).select("+password");

    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password"
      });
    }

    const isMatch = await bcrypt.compare(
      password,
      user.password
    );

    if (!isMatch) {
      return res.status(401).json({
        message: "Invalid email or password"
      });
    }

    return res.status(200).json({
      message: "Login successful",
      token: generateToken(user),
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({
      message: "Server error"
    });
  }
};

// CHANGE PASSWORD
exports.changePassword = async (req, res) => {
  try {
    const {
      currentPassword,
      newPassword,
      confirmPassword
    } = req.body;

    if (
      typeof currentPassword !== "string" ||
      typeof newPassword !== "string" ||
      typeof confirmPassword !== "string" ||
      !currentPassword ||
      !newPassword ||
      !confirmPassword
    ) {
      return res.status(400).json({
        message: "All password fields are required"
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        message: "New passwords do not match"
      });
    }

    const passwordError = validatePassword(newPassword);

    if (passwordError) {
      return res.status(400).json({
        message: passwordError
      });
    }

    const user = await User.findById(
      req.user._id
    ).select("+password");

    if (!user) {
      return res.status(401).json({
        message: "User not found"
      });
    }

    const isCurrentPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password
    );

    if (!isCurrentPasswordValid) {
      return res.status(401).json({
        message: "Current password is incorrect"
      });
    }

    const isSamePassword = await bcrypt.compare(
      newPassword,
      user.password
    );

    if (isSamePassword) {
      return res.status(400).json({
        message:
          "New password must be different from your current password"
      });
    }

    const newHash = await bcrypt.hash(newPassword, 12);

    const updatedUser = await User.findOneAndUpdate(
      {
        _id: user._id,
        password: user.password
      },
      {
        $set: { password: newHash },
        $inc: { tokenVersion: 1 },
        $unset: {
          resetPasswordToken: "",
          resetPasswordExpires: ""
        }
      },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(409).json({
        message:
          "Password changed during this request. Please sign in again."
      });
    }

    return res.status(200).json({
      message:
        "Password changed successfully. Please sign in again."
    });
  } catch (error) {
    console.error("Change password error:", error);

    return res.status(500).json({
      message: "Server error"
    });
  }
};

// FORGOT PASSWORD
exports.forgotPassword = async (req, res) => {
  const genericMessage =
    "If an account exists with that email, a password reset link will be sent.";

  try {
    const { email } = req.body;

    if (
      typeof email !== "string" ||
      !isValidEmail(email.trim().toLowerCase())
    ) {
      return res.status(400).json({
        message: "Please provide a valid email address"
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await User.findOne({
      email: normalizedEmail
    });

    // Do not reveal whether an email is registered.
    if (!user) {
      return res.status(200).json({
        message: genericMessage
      });
    }

    if (
      !process.env.RESEND_API_KEY ||
      !process.env.RESEND_FROM_EMAIL ||
      !process.env.CLIENT_URL
    ) {
      console.error("Password reset email is not configured.");

      return res.status(200).json({
        message: genericMessage
      });
    }

    // Generate a cryptographically secure reset token.
    const resetToken = crypto.randomBytes(32).toString("hex");

    // Store only the hash in MongoDB.
    const hashedToken = hashResetToken(resetToken);

    const expiresAt = new Date(
      Date.now() + 15 * 60 * 1000
    );

    // A new request replaces any previous reset link.
    await User.findByIdAndUpdate(user._id, {
      $set: {
        resetPasswordToken: hashedToken,
        resetPasswordExpires: expiresAt
      }
    });

    const clientUrl = process.env.CLIENT_URL.replace(/\/$/, "");

    const resetLink =
      `${clientUrl}/reset-password/${encodeURIComponent(resetToken)}`;

    const resend = new Resend(process.env.RESEND_API_KEY);

    const { error: emailError } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL,
      to: user.email,
      subject: "Reset Your EventEase Password",
      html: `
        <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:30px;color:#182230;">
          <div style="padding:20px;background:#f0f2ff;border-radius:12px;text-align:center;">
            <h1 style="color:#5956e9;margin:0;font-size:25px;">
              EventEase
            </h1>
          </div>

          <h2 style="margin-top:30px;">
            Reset your password
          </h2>

          <p style="font-size:15px;line-height:1.7;color:#475467;">
            We received a request to reset the password
            for your EventEase account.
          </p>

          <p style="font-size:15px;line-height:1.7;color:#475467;">
            Click the button below to create a new password.
          </p>

          <div style="text-align:center;margin:34px 0;">
            <a href="${resetLink}"
               style="background:#5956e9;color:white;padding:15px 28px;text-decoration:none;border-radius:10px;font-weight:bold;display:inline-block;">
              Reset Password
            </a>
          </div>

          <p style="font-size:13px;color:#667085;">
            This link expires in 15 minutes and can only
            be used once.
          </p>

          <p style="font-size:13px;color:#667085;">
            If you did not request this password reset,
            you can ignore this email.
          </p>

          <hr style="border:none;border-top:1px solid #eaecf0;margin:28px 0;"/>

          <p style="font-size:12px;color:#98a2b3;text-align:center;">
            EventEase — Event Management System
          </p>
        </div>
      `
    });

    if (emailError) {
      console.error(
        "Password reset email delivery failed:",
        emailError
      );

      // Clear this token only if it is still the same
      // token we attempted to email.
      await User.updateOne(
        {
          _id: user._id,
          resetPasswordToken: hashedToken
        },
        {
          $unset: {
            resetPasswordToken: "",
            resetPasswordExpires: ""
          }
        }
      );
    }

    return res.status(200).json({
      message: genericMessage
    });
  } catch (error) {
    console.error("Forgot password error:", error);

    // Avoid exposing account existence through the response.
    return res.status(200).json({
      message: genericMessage
    });
  }
};

// RESET PASSWORD
exports.resetPassword = async (req, res) => {
  try {
    const { token } = req.params;

    const {
      newPassword,
      confirmPassword
    } = req.body;

    if (
      typeof token !== "string" ||
      !/^[a-f0-9]{64}$/.test(token)
    ) {
      return res.status(400).json({
        message: "Invalid or expired password reset link"
      });
    }

    if (
      typeof newPassword !== "string" ||
      typeof confirmPassword !== "string"
    ) {
      return res.status(400).json({
        message: "Both password fields are required"
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        message: "Passwords do not match"
      });
    }

    const passwordError = validatePassword(newPassword);

    if (passwordError) {
      return res.status(400).json({
        message: passwordError
      });
    }

    const hashedToken = hashResetToken(token);

    // Check token existence and expiry.
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: new Date() }
    }).select("+password");

    if (!user) {
      return res.status(400).json({
        message: "Invalid or expired password reset link"
      });
    }

    const isSamePassword = await bcrypt.compare(
      newPassword,
      user.password
    );

    if (isSamePassword) {
      return res.status(400).json({
        message: "Please choose a different password"
      });
    }

    const hashedPassword = await bcrypt.hash(
      newPassword,
      12
    );

    // Atomically consume the token and update the password.
    // Concurrent requests cannot reuse the same reset token.
    const updatedUser = await User.findOneAndUpdate(
      {
        _id: user._id,
        resetPasswordToken: hashedToken,
        resetPasswordExpires: { $gt: new Date() }
      },
      {
        $set: {
          password: hashedPassword
        },
        $unset: {
          resetPasswordToken: "",
          resetPasswordExpires: ""
        },
        $inc: {
          tokenVersion: 1
        }
      },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(400).json({
        message: "Invalid or expired password reset link"
      });
    }

    return res.status(200).json({
      message:
        "Password reset successful. Please sign in with your new password."
    });
  } catch (error) {
    console.error("Reset password error:", error);

    return res.status(500).json({
      message: "Unable to reset password"
    });
  }
};



