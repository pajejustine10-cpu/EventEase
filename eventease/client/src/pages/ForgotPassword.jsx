
import { useState } from "react";
import { Link } from "react-router-dom";
import {
  CalendarDays,
  Mail,
  ArrowLeft,
  Send,
  CheckCircle2
} from "lucide-react";

import api from "../services/api";
import "../styles/Auth.css";
import "../styles/ForgotPassword.css";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (loading) return;

    setError("");
    setSuccess(false);

    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }

    try {
      setLoading(true);

      await api.post("/auth/forgot-password", {
        email: email.trim()
      });

      setSuccess(true);
    } catch (err) {
      if (err.response?.status === 429) {
        setError(
          "Too many requests. Please try again in 15 minutes."
        );
      } else {
        setError(
          err.response?.data?.message ||
          "Unable to process your request. Please try again."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card forgot-password-card">
        <div className="auth-logo">
          <CalendarDays size={30} />
          <span>EventEase</span>
        </div>

        {success ? (
          <div className="forgot-success">
            <div className="forgot-success-icon">
              <CheckCircle2 size={30} />
            </div>

            <h1>Check your email</h1>

            <p className="auth-subtitle">
              If an EventEase account exists for
              that email address, we'll send a
              password-reset link.
            </p>

            <div className="forgot-email-display">
              <Mail size={18} />
              <span>{email}</span>
            </div>

            <p className="forgot-help-text">
              The reset link expires after 15 minutes.
              If you don't receive an email, check your
              spam folder.
            </p>

            <Link
              to="/login"
              className="forgot-back-link"
            >
              <ArrowLeft size={17} />
              Back to Login
            </Link>
          </div>
        ) : (
          <>
            <div className="forgot-header-icon">
              <Mail size={25} />
            </div>

            <h1>Forgot password?</h1>

            <p className="auth-subtitle">
              No worries! Enter your registered
              email address and we'll send you a
              link to reset your password.
            </p>

            {error && (
              <div
                className="auth-error"
                role="alert"
              >
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <label htmlFor="forgot-email">
                Email Address
              </label>

              <div className="forgot-input-wrap">
                <Mail size={19} />

                <input
                  id="forgot-email"
                  type="email"
                  name="email"
                  placeholder="Enter your email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) =>
                    setEmail(e.target.value)
                  }
                  required
                  autoFocus
                />
              </div>

              <button
                className="auth-button"
                type="submit"
                disabled={loading}
              >
                {loading ? (
                  "Sending Reset Link..."
                ) : (
                  <>
                    <Send size={18} />
                    Send Reset Link
                  </>
                )}
              </button>
            </form>

            <Link
              to="/login"
              className="forgot-back-link"
            >
              <ArrowLeft size={17} />
              Back to Login
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
