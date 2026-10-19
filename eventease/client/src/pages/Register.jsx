
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  CalendarDays,
  Eye,
  EyeOff,
  Check,
  Circle
} from "lucide-react";

import { useAuth } from "../context/AuthContext";
import "../styles/Auth.css";

const getPasswordRequirements = (password) => [
  {
    label: "At least 8 characters",
    valid: password.length >= 8
  },
  {
    label: "At least one uppercase letter",
    valid: /[A-Z]/.test(password)
  },
  {
    label: "At least one lowercase letter",
    valid: /[a-z]/.test(password)
  },
  {
    label: "At least one number",
    valid: /[0-9]/.test(password)
  },
  {
    label: "At least one special character",
    valid: /[^A-Za-z0-9]/.test(password)
  }
];

const getPasswordStrength = (password) => {
  if (!password) {
    return {
      label: "",
      level: 0,
      className: ""
    };
  }

  const requirements = getPasswordRequirements(password);
  const passed = requirements.filter(
    (requirement) => requirement.valid
  ).length;

  if (passed <= 2) {
    return {
      label: "Weak",
      level: 1,
      className: "weak"
    };
  }

  if (passed === 3) {
    return {
      label: "Fair",
      level: 2,
      className: "fair"
    };
  }

  if (passed === 4) {
    return {
      label: "Good",
      level: 3,
      className: "good"
    };
  }

  return {
    label: "Strong",
    level: 4,
    className: "strong"
  };
};

export default function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: ""
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const requirements = getPasswordRequirements(
    form.password
  );

  const strength = getPasswordStrength(
    form.password
  );

  const allRequirementsMet = requirements.every(
    (requirement) => requirement.valid
  );

  const passwordsMatch =
    form.confirmPassword.length > 0 &&
    form.password === form.confirmPassword;

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((previous) => ({
      ...previous,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.name.trim()) {
      setError("Please enter your full name.");
      return;
    }

    if (!allRequirementsMet) {
      setError(
        "Please meet all password requirements."
      );
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      await register(
        form.name.trim(),
        form.email.trim(),
        form.password
      );

      navigate("/dashboard");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Registration failed."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <CalendarDays size={30} />
          <span>EventEase</span>
        </div>

        <h1>Create account</h1>

        <p className="auth-subtitle">
          Join EventEase to discover upcoming events.
        </p>

        {error && (
          <div className="auth-error" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <label htmlFor="register-name">
            Full Name
          </label>

          <input
            id="register-name"
            type="text"
            name="name"
            placeholder="Enter your full name"
            autoComplete="name"
            value={form.name}
            onChange={handleChange}
            required
          />

          <label htmlFor="register-email">
            Email Address
          </label>

          <input
            id="register-email"
            type="email"
            name="email"
            placeholder="Enter your email"
            autoComplete="email"
            value={form.email}
            onChange={handleChange}
            required
          />

          <label htmlFor="register-password">
            Password
          </label>

          <div className="auth-password-wrapper">
            <input
              id="register-password"
              type={
                showPassword ? "text" : "password"
              }
              name="password"
              placeholder="Create a strong password"
              autoComplete="new-password"
              value={form.password}
              onChange={handleChange}
              minLength={8}
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
                  ? "Hide password"
                  : "Show password"
              }
              aria-pressed={showPassword}
            >
              {showPassword ? (
                <EyeOff size={19} />
              ) : (
                <Eye size={19} />
              )}
            </button>
          </div>

          {form.password.length > 0 && (
            <div className="auth-password-security">
              <div className="auth-strength-header">
                <span>Password Strength</span>

                <strong className={strength.className}>
                  {strength.label}
                </strong>
              </div>

              <div className="auth-strength-bars">
                {[1, 2, 3, 4].map((level) => (
                  <span
                    key={level}
                    className={
                      level <= strength.level
                        ? `strength-active ${strength.className}`
                        : ""
                    }
                  />
                ))}
              </div>
            </div>
          )}

          <div className="auth-requirements">
            <p>Password must contain:</p>

            {requirements.map((requirement) => (
              <div
                key={requirement.label}
                className={
                  requirement.valid
                    ? "auth-requirement valid"
                    : "auth-requirement"
                }
              >
                {requirement.valid ? (
                  <Check size={15} />
                ) : (
                  <Circle size={13} />
                )}

                <span>{requirement.label}</span>
              </div>
            ))}
          </div>

          <label htmlFor="register-confirm-password">
            Confirm Password
          </label>

          <div className="auth-password-wrapper">
            <input
              id="register-confirm-password"
              type={
                showConfirmPassword
                  ? "text"
                  : "password"
              }
              name="confirmPassword"
              placeholder="Re-enter your password"
              autoComplete="new-password"
              value={form.confirmPassword}
              onChange={handleChange}
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
              aria-pressed={showConfirmPassword}
            >
              {showConfirmPassword ? (
                <EyeOff size={19} />
              ) : (
                <Eye size={19} />
              )}
            </button>
          </div>

          {form.confirmPassword.length > 0 && (
            <p
              className={
                passwordsMatch
                  ? "auth-password-match valid"
                  : "auth-password-match invalid"
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
            disabled={loading}
          >
            {loading
              ? "Creating account..."
              : "Create Account"}
          </button>
        </form>

        <p className="auth-footer">
          Already have an account?{" "}
          <Link to="/login">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

