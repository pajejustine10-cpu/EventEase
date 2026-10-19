
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  CalendarDays,
  LockKeyhole,
  Eye,
  EyeOff,
  Check,
  Circle,
  CheckCircle2,
  ArrowLeft
} from "lucide-react";

import api from "../services/api";
import "../styles/Auth.css";
import "../styles/ResetPassword.css";

const getRequirements = (password) => [
  {
    label: "At least 8 characters",
    valid: password.length >= 8
  },
  {
    label: "One uppercase letter",
    valid: /[A-Z]/.test(password)
  },
  {
    label: "One lowercase letter",
    valid: /[a-z]/.test(password)
  },
  {
    label: "One number",
    valid: /[0-9]/.test(password)
  },
  {
    label: "One special character",
    valid: /[^A-Za-z0-9]/.test(password)
  },
  {
    label: "Maximum 72 bytes",
    valid: new TextEncoder().encode(password).length <= 72
  }
];

export default function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const requirements = getRequirements(newPassword);
  const allValid = requirements.every((item) => item.valid);

  const passwordsMatch =
    confirmPassword.length > 0 &&
    newPassword === confirmPassword;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (loading) return;

    setError("");

    if (!allValid) {
      setError("Please meet all password requirements.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (!token || !/^[a-f0-9]{64}$/.test(token)) {
      setError("Invalid password reset link.");
      return;
    }

    try {
      setLoading(true);

      await api.post(
        `/auth/reset-password/${token}`,
        {
          newPassword,
          confirmPassword
        }
      );

      setSuccess(true);

      // Clear form values after successful reset.
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      if (err.response?.status === 429) {
        setError(
          "Too many attempts. Please try again in 15 minutes."
        );
      } else {
        setError(
          err.response?.data?.message ||
            "Unable to reset password. Please request a new link."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card reset-password-card">
        <div className="auth-logo">
          <CalendarDays size={30} />
          <span>EventEase</span>
        </div>

        {success ? (
          <div className="reset-success">
            <div className="reset-success-icon">
              <CheckCircle2 size={30} />
            </div>

            <h1>Password updated!</h1>

            <p className="auth-subtitle">
              Your password has been reset successfully.
              You can now sign in using your new password.
            </p>

            <button
              type="button"
              className="auth-button"
              onClick={() =>
                navigate("/login", { replace: true })
              }
            >
              Back to Login
            </button>
          </div>
        ) : (
          <>
            <div className="reset-header-icon">
              <LockKeyhole size={26} />
            </div>

            <h1>Reset your password</h1>

            <p className="auth-subtitle">
              Create a new secure password for your
              EventEase account.
            </p>

            {error && (
              <div className="auth-error" role="alert">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <label htmlFor="reset-new-password">
                New Password
              </label>

              <div className="auth-password-wrapper">
                <input
                  id="reset-new-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) =>
                    setNewPassword(e.target.value)
                  }
                  required
                />

                <button
                  type="button"
                  className="auth-password-toggle"
                  onClick={() =>
                    setShowPassword((previous) => !previous)
                  }
                  aria-label={
                    showPassword
                      ? "Hide new password"
                      : "Show new password"
                  }
                >
                  {showPassword ? (
                    <EyeOff size={19} />
                  ) : (
                    <Eye size={19} />
                  )}
                </button>
              </div>

              <div className="reset-requirements">
                <p>Password requirements</p>

                {requirements.map((item) => (
                  <div
                    key={item.label}
                    className={
                      item.valid
                        ? "reset-requirement valid"
                        : "reset-requirement"
                    }
                  >
                    {item.valid ? (
                      <Check size={15} />
                    ) : (
                      <Circle size={13} />
                    )}

                    <span>{item.label}</span>
                  </div>
                ))}
              </div>

              <label htmlFor="reset-confirm-password">
                Confirm New Password
              </label>

              <div className="auth-password-wrapper">
                <input
                  id="reset-confirm-password"
                  type={
                    showConfirmPassword
                      ? "text"
                      : "password"
                  }
                  autoComplete="new-password"
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChange={(e) =>
                    setConfirmPassword(e.target.value)
                  }
                  required
                />

                <button
                  type="button"
                  className="auth-password-toggle"
                  onClick={() =>
                    setShowConfirmPassword(
                      (previous) => !previous
                    )
                  }
                  aria-label={
                    showConfirmPassword
                      ? "Hide confirmation password"
                      : "Show confirmation password"
                  }
                >
                  {showConfirmPassword ? (
                    <EyeOff size={19} />
                  ) : (
                    <Eye size={19} />
                  )}
                </button>
              </div>

              {confirmPassword && (
                <p
                  className={
                    passwordsMatch
                      ? "reset-match valid"
                      : "reset-match invalid"
                  }
                >
                  {passwordsMatch
                    ? "Passwords match"
                    : "Passwords do not match"}
                </p>
              )}

              <button
                className="auth-button"
                type="submit"
                disabled={loading || !allValid || !passwordsMatch}
              >
                {loading
                  ? "Resetting Password..."
                  : "Reset Password"}
              </button>
            </form>

            <Link
              to="/login"
              className="reset-back-link"
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
