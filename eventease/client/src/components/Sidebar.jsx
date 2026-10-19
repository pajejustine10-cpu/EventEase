
import { NavLink } from "react-router-dom";
import {
  CalendarDays,
  LayoutDashboard,
  CalendarCheck,
  Ticket,
  LockKeyhole,
  LogOut,
  X
} from "lucide-react";

import { useAuth } from "../context/AuthContext";

export default function Sidebar({ isOpen, onClose }) {
  const { user } = useAuth();

  // TEMPORARY TEST
  const handleLogout = () => {
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");
    window.location.replace("/");
  };

  const links = [
    {
      to: "/dashboard",
      icon: LayoutDashboard,
      label: "Dashboard"
    },
    {
      to: "/events",
      icon: CalendarDays,
      label: "Browse Events"
    },
    {
      to: "/my-registrations",
      icon: Ticket,
      label: "My Registrations"
    }
  ];

  if (user?.role === "admin") {
    links.push({
      to: "/manage-events",
      icon: CalendarCheck,
      label: "Manage Events"
    });
  }

  return (
    <>
      {isOpen && (
        <div
          className="sidebar-overlay"
          onClick={onClose}
        />
      )}

      <aside
        className={`sidebar ${
          isOpen ? "sidebar-open" : ""
        }`}
      >
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <div className="brand-icon">
              <CalendarDays size={22} />
            </div>

            <span>EventEase</span>
          </div>

          <button
            type="button"
            className="sidebar-close"
            onClick={onClose}
            aria-label="Close sidebar"
          >
            <X size={20} />
          </button>
        </div>

        <div className="sidebar-content">
          <p className="sidebar-label">
            MAIN MENU
          </p>

          <nav className="sidebar-nav">
            {links.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                onClick={onClose}
                className={({ isActive }) =>
                  `sidebar-link ${
                    isActive ? "active" : ""
                  }`
                }
              >
                <Icon size={19} />
                <span>{label}</span>
              </NavLink>
            ))}
          </nav>

          <p className="sidebar-label sidebar-settings-label">
            ACCOUNT SETTINGS
          </p>

          <nav
            className="sidebar-nav"
            aria-label="Account settings"
          >
            <NavLink
              to="/change-password"
              onClick={onClose}
              className={({ isActive }) =>
                `sidebar-link ${
                  isActive ? "active" : ""
                }`
              }
            >
              <LockKeyhole size={19} />
              <span>Change Password</span>
            </NavLink>
          </nav>
        </div>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="user-avatar">
              {user?.name?.charAt(0).toUpperCase() || "U"}
            </div>

            <div className="user-info">
              <strong>{user?.name}</strong>
              <span>
                {user?.role === "admin"
                  ? "Administrator"
                  : "User"}
              </span>
            </div>
          </div>

          <button
            type="button"
            className="logout-button"
            onClick={handleLogout}
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </aside>
    </>
  );
}




