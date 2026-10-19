
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  CalendarDays,
  Eye,
  EyeOff
} from "lucide-react";

import { useAuth } from "../context/AuthContext";
import "../styles/Auth.css";

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (loading) return;

    setError("");
    setLoading(true);

    try {
      await login(email.trim(), password);

      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to log in. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        {/* EVENTEASE LOGO */}
        <div className="auth-logo">
          <CalendarDays size={30} />
          <span>EventEase</span>
        </div>

        {/* LOGIN HEADER */}
        <h1>Welcome back</h1>

        <p className="auth-subtitle">
          Sign in to manage your events.
        </p>

        {/* ERROR MESSAGE */}
        {error && (
          <div className="auth-error" role="alert">
            {error}
          </div>
        )}

        {/* LOGIN FORM */}
        <form onSubmit={handleSubmit}>
          {/* EMAIL ADDRESS */}
          <label htmlFor="login-email">
            Email Address
          </label>

          <input
            id="login-email"
            type="email"
            name="email"
            placeholder="Enter your email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          {/* PASSWORD */}
          <label htmlFor="login-password">
            Password
          </label>

          <div className="auth-password-wrapper">
            <input
              id="login-password"
              type={showPassword ? "text" : "password"}
              name="password"
              placeholder="Enter your password"
              autoComplete="current-password"
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
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
                  ? "Hide password"
                  : "Show password"
              }
              aria-pressed={showPassword}
              title={
                showPassword
                  ? "Hide password"
                  : "Show password"
              }
            >
              {showPassword ? (
                <EyeOff size={19} />
              ) : (
                <Eye size={19} />
              )}
            </button>
          </div>

          {/* FORGOT PASSWORD LINK */}
          <div className="auth-forgot-row">
            <Link to="/forgot-password">
              Forgot Password?
            </Link>
          </div>

          {/* SIGN IN BUTTON */}
          <button
            className="auth-button"
            type="submit"
            disabled={loading}
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        {/* REGISTRATION LINK */}
        <p className="auth-footer">
          Don't have an account?{" "}
          <Link to="/register">
            Create account
          </Link>
        </p>
      </div>
    </div>
  );
}
