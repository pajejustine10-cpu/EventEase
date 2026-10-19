
const express = require("express");
const rateLimit = require("express-rate-limit");

const router = express.Router();

const {
  register,
  login,
  changePassword,
  forgotPassword,
  resetPassword
} = require("../controllers/authController");

const {
  protect
} = require("../middleware/authMiddleware");

// Rate limit password reset email requests.
// Maximum 3 requests per IP address every 15 minutes.
const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 3,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    message:
      "Too many password reset requests. Please try again in 15 minutes."
  }
});

// Rate limit password reset submissions.
// Maximum 5 attempts per IP address every 15 minutes.
const resetPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    message:
      "Too many reset attempts. Please try again in 15 minutes."
  }
});

// Existing public routes
router.post("/register", register);
router.post("/login", login);

// Existing protected route
router.put("/change-password", protect, changePassword);

// Forgot Password - public route
router.post(
  "/forgot-password",
  forgotPasswordLimiter,
  forgotPassword
);

// Reset Password - public route
router.post(
  "/reset-password/:token",
  resetPasswordLimiter,
  resetPassword
);

module.exports = router;


