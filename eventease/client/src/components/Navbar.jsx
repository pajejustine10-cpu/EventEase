
import { Menu, UserRound } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function Navbar({ onMenuClick }) {
  const { user } = useAuth();

  return (
    <header className="dashboard-navbar">
      <div className="navbar-left">
        <button
          className="menu-toggle"
          onClick={onMenuClick}
          aria-label="Open navigation"
        >
          <Menu size={23} />
        </button>

        <div>
          <h2>EventEase</h2>
          <p>Event Management Platform</p>
        </div>
      </div>

      <div className="navbar-right">
        <div className="navbar-profile">
          <div className="navbar-avatar">
            <UserRound size={20} />
          </div>
          <div className="navbar-user-details">
            <strong>{user?.name}</strong>
            <span>{user?.role === "admin" ? "Admin" : "Member"}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
