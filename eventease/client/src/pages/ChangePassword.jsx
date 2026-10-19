
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  LockKeyhole,
  Eye,
  EyeOff,
  ShieldCheck,
  Check,
  Circle
} from "lucide-react";
import { toast, Toaster } from "sonner";

import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";

import "../styles/Dashboard.css";
import "../styles/ChangePassword.css";

const requirementsFor = (password) => [
  {
    label: "At least 8 characters",
    valid: password.length >= 8
  },
  {
    label: "Uppercase letter",
    valid: /[A-Z]/.test(password)
  },
  {
    label: "Lowercase letter",
    valid: /[a-z]/.test(password)
  },
  {
    label: "Number",
    valid: /[0-9]/.test(password)
  },
  {
    label: "Special character",
    valid: /[^A-Za-z0-9]/.test(password)
  },
  {
    label: "Maximum 72 bytes",
    valid: new TextEncoder().encode(password).length <= 72
  }
];

function PasswordInput({
  id,
  label,
  value,
  onChange,
  placeholder,
  autoComplete
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="change-password-field">
      <label htmlFor={id}>{label}</label>

      <div className="change-password-input-wrap">
        <input
          id={id}
          type={visible ? "text" : "password"}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required
        />

        <button
          type="button"
          className="change-password-eye"
          onClick={() => setVisible((previous) => !previous)}
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
        >
          {visible ? <EyeOff size={19} /> : <Eye size={19} />}
        </button>
      </div>
    </div>
  );
}

export default function ChangePassword() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const requirements = requirementsFor(newPassword);
  const allValid = requirements.every((item) => item.valid);

  const confirmMatches =
    confirmPassword.length > 0 &&
    newPassword === confirmPassword;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!allValid) {
      setError("Please meet all new password requirements.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }

    if (currentPassword === newPassword) {
      setError("Your new password must be different.");
      return;
    }

    try {
      setLoading(true);

      await api.put("/auth/change-password", {
        currentPassword,
        newPassword,
        confirmPassword
      });

      // The backend invalidates all previous access tokens.
      // Clear the current session so the user can sign in again.
      if (typeof logout === "function") {
        await logout();
      }

      toast.success("Password changed successfully.");

      navigate("/login", { replace: true });
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to change password."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dashboard-layout">
      <Toaster
        position="top-right"
        richColors
        closeButton
      />

      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="dashboard-main">
        <Navbar
          onMenuClick={() => setSidebarOpen(true)}
        />

        <main className="dashboard-content">
          <div className="dashboard-welcome">
            <div>
              <p className="dashboard-eyebrow">
                ACCOUNT SECURITY
              </p>

              <h1>Change Password</h1>

              <p>
                Update your password to keep your
                EventEase account secure.
              </p>
            </div>
          </div>

          <div className="change-password-card">
            <div className="change-password-card-heading">
              <div className="change-password-heading-icon">
                <LockKeyhole size={25} />
              </div>

              <div>
                <h2>Update Password</h2>
                <p>
                  Enter your current password and create
                  a new one.
                </p>
              </div>
            </div>

            {error && (
              <div className="change-password-error" role="alert">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <PasswordInput
                id="current-password"
                label="Current Password"
                value={currentPassword}
                onChange={(e) =>
                  setCurrentPassword(e.target.value)
                }
                placeholder="Enter current password"
                autoComplete="current-password"
              />

              <PasswordInput
                id="new-password"
                label="New Password"
                value={newPassword}
                onChange={(e) =>
                  setNewPassword(e.target.value)
                }
                placeholder="Create a new password"
                autoComplete="new-password"
              />

              <div className="change-password-requirements">
                <p>Password requirements</p>

                {requirements.map((requirement) => (
                  <div
                    className={
                      requirement.valid
                        ? "change-password-requirement valid"
                        : "change-password-requirement"
                    }
                    key={requirement.label}
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

              <PasswordInput
                id="confirm-new-password"
                label="Confirm New Password"
                value={confirmPassword}
                onChange={(e) =>
                  setConfirmPassword(e.target.value)
                }
                placeholder="Re-enter new password"
                autoComplete="new-password"
              />

              {confirmPassword && (
                <p
                  className={
                    confirmMatches
                      ? "change-password-match valid"
                      : "change-password-match invalid"
                  }
                >
                  {confirmMatches
                    ? "Passwords match"
                    : "Passwords do not match"}
                </p>
              )}

              <div className="change-password-note">
                <ShieldCheck size={20} />

                <span>
                  After changing your password, you will
                  be signed out and need to sign in again.
                </span>
              </div>

              <button
                type="submit"
                className="change-password-submit"
                disabled={loading}
              >
                <LockKeyhole size={18} />
                {loading
                  ? "Updating Password..."
                  : "Update Password"}
              </button>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
}

