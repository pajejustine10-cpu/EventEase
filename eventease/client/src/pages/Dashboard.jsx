
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarCheck2,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Compass,
  MapPin,
  Ticket,
  Users
} from "lucide-react";

import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import "../styles/Dashboard.css";

function getImageUrl(imagePath) {
  if (!imagePath || typeof imagePath !== "string") {
    return "";
  }

  if (/^https?:\/\//i.test(imagePath)) {
    return imagePath;
  }

  const apiBase =
    api.defaults.baseURL || "http://localhost:5000/api";

  const origin = new URL(
    apiBase,
    window.location.origin
  ).origin;

  return `${origin}${
    imagePath.startsWith("/") ? imagePath : `/${imagePath}`
  }`;
}

function formatDate(date) {
  return new Date(date).toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "Asia/Manila"
  });
}

function formatTime(date) {
  return new Date(date).toLocaleTimeString("en-PH", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Manila"
  });
}

function remainingSpots(event) {
  return Math.max(
    0,
    Number(event.capacity || 0) -
      Number(event.registeredCount || 0)
  );
}

function EventPreviewCard({ event, isRegistered }) {
  const imageUrl = getImageUrl(event.image);
  const slots = remainingSpots(event);

  return (
    <article className="dashboard-event-card">
      <div className="dashboard-event-cover">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={`${event.title} event cover`}
            loading="lazy"
          />
        ) : (
          <div className="dashboard-event-placeholder">
            <CalendarDays size={38} strokeWidth={1.5} />
            <span>EventEase</span>
          </div>
        )}

        <span
          className={`dashboard-event-badge ${
            isRegistered ? "registered" : ""
          }`}
        >
          {isRegistered ? (
            <CheckCircle2 size={13} />
          ) : (
            <Clock3 size={13} />
          )}

          {isRegistered ? "Registered" : "Upcoming"}
        </span>
      </div>

      <div className="dashboard-event-inner">
        <div className="dashboard-event-date">
          <CalendarDays size={14} />
          {formatDate(event.date)} · {formatTime(event.date)}
        </div>

        <h3>{event.title}</h3>

        <p className="event-description">
          {event.description || "Explore this upcoming event."}
        </p>

        <div className="event-meta">
          <span>
            <MapPin size={16} />
            {event.location || "Location to be announced"}
          </span>

          <span>
            <Users size={16} />
            {slots === 0
              ? "Fully booked"
              : `${slots} spots available`}
          </span>
        </div>

        <Link
          to={
            isRegistered
              ? "/my-registrations"
              : "/events"
          }
          className="event-card-action"
        >
          {isRegistered ? "My Registration" : "View Event"}
          <ArrowUpRight size={17} />
        </Link>
      </div>
    </article>
  );
}

export default function Dashboard() {
  const { user } = useAuth();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [events, setEvents] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadDashboard() {
      try {
        setLoading(true);
        setError("");

        const [eventsResponse, registrationsResponse] =
          await Promise.all([
            api.get("/events"),
            api.get("/registrations/my")
          ]);

        if (!active) return;

        setEvents(
          Array.isArray(eventsResponse.data)
            ? eventsResponse.data
            : []
        );

        setRegistrations(
          Array.isArray(registrationsResponse.data)
            ? registrationsResponse.data
            : []
        );
      } catch (err) {
        if (!active) return;

        setError(
          err.response?.data?.message ||
            "Unable to load dashboard information."
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadDashboard();

    return () => {
      active = false;
    };
  }, []);

  const upcomingEvents = useMemo(() => {
    const now = Date.now();

    return events
      .filter(
        (event) =>
          new Date(event.date).getTime() > now
      )
      .sort(
        (a, b) =>
          new Date(a.date) - new Date(b.date)
      );
  }, [events]);

  const registeredEventIds = useMemo(() => {
    return new Set(
      registrations
        .map((registration) => {
          const event = registration.event;

          return typeof event === "object" &&
            event !== null
            ? String(event._id)
            : String(event || "");
        })
        .filter(Boolean)
    );
  }, [registrations]);

  const firstName =
    user?.name?.trim().split(/\s+/)[0] || "there";

  const nextRegisteredEvent = upcomingEvents.find(
    (event) =>
      registeredEventIds.has(String(event._id))
  );

  return (
    <div className="dashboard-layout">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="dashboard-main">
        <Navbar
          onMenuClick={() => setSidebarOpen(true)}
        />

        <main className="dashboard-content">
          {/* WELCOME */}
          <div className="dashboard-welcome">
            <div>
              <p className="dashboard-eyebrow">
                YOUR OVERVIEW
              </p>

              <h1>
                Good to see you, {firstName}
                <span className="dashboard-title-period">
                  .
                </span>
              </h1>

              <p>
                Here's everything happening with your events.
              </p>
            </div>

            <Link
              to="/events"
              className="primary-action"
            >
              Explore Events
              <ArrowUpRight size={17} />
            </Link>
          </div>

          {error && (
            <div className="dashboard-error" role="alert">
              {error}
            </div>
          )}

          {loading ? (
            <div className="empty-events" role="status">
              <CalendarDays size={30} />

              <h3>Loading your dashboard</h3>

              <p>
                Getting the latest event information...
              </p>
            </div>
          ) : error ? (
            <div className="empty-events">
              <h3>Unable to load dashboard</h3>

              <p>
                Check your backend connection and
                refresh the page.
              </p>
            </div>
          ) : (
            <>
              {/* STATISTICS */}
              <div
                className="stats-grid"
                aria-label="Event statistics"
              >
                <div className="stat-card">
                  <div className="stat-card-top">
                    <span>Total Events</span>

                    <div className="stat-icon purple">
                      <CalendarDays size={21} />
                    </div>
                  </div>

                  <h2>{events.length}</h2>

                  <p>Events on the platform</p>
                </div>

                <div className="stat-card">
                  <div className="stat-card-top">
                    <span>Upcoming Events</span>

                    <div className="stat-icon blue">
                      <Clock3 size={21} />
                    </div>
                  </div>

                  <h2>{upcomingEvents.length}</h2>

                  <p>Scheduled in the future</p>
                </div>

                <div className="stat-card">
                  <div className="stat-card-top">
                    <span>My Registrations</span>

                    <div className="stat-icon green">
                      <Ticket size={21} />
                    </div>
                  </div>

                  <h2>{registrations.length}</h2>

                  <p>Registration records</p>
                </div>
              </div>

              {/* EVENT HIGHLIGHT */}
              <div className="dashboard-highlight-row">
                <div className="dashboard-highlight-copy">
                  <span className="dashboard-highlight-label">
                    <Compass size={14} />
                    YOUR EVENT SPACE
                  </span>

                  <h2>
                    {nextRegisteredEvent
                      ? "You're all set for what's next."
                      : "Your next great experience starts here."}
                  </h2>

                  <p>
                    {nextRegisteredEvent
                      ? `Your next registered event is ${
                          nextRegisteredEvent.title
                        } on ${formatDate(
                          nextRegisteredEvent.date
                        )}.`
                      : "Explore upcoming experiences and find an event worth attending."}
                  </p>

                  <Link
                    to={
                      nextRegisteredEvent
                        ? "/my-registrations"
                        : "/events"
                    }
                  >
                    {nextRegisteredEvent
                      ? "My Registrations"
                      : "Find an Event"}

                    <ArrowRight size={16} />
                  </Link>
                </div>

                <div
                  className="dashboard-highlight-art"
                  aria-hidden="true"
                >
                  <div>
                    <CalendarCheck2
                      size={53}
                      strokeWidth={1.3}
                    />
                  </div>
                </div>
              </div>

              {/* UPCOMING EVENTS */}
              <section
                className="dashboard-section"
                aria-labelledby="upcoming-heading"
              >
                <div className="section-heading">
                  <div>
                    <p className="dashboard-section-overline">
                      DISCOVER
                    </p>

                    <h2 id="upcoming-heading">
                      Upcoming Events
                    </h2>

                    <p>
                      See what's happening next on EventEase.
                    </p>
                  </div>

                  <Link
                    to="/events"
                    className="view-all-link"
                  >
                    View All Events
                    <ArrowRight size={17} />
                  </Link>
                </div>

                {upcomingEvents.length === 0 ? (
                  <div className="empty-events">
                    <CalendarCheck2 size={35} />

                    <h3>No upcoming events yet</h3>

                    <p>
                      New events will appear here
                      once they're added.
                    </p>
                  </div>
                ) : (
                  <div className="dashboard-events-grid">
                    {upcomingEvents
                      .slice(0, 3)
                      .map((event) => (
                        <EventPreviewCard
                          key={event._id}
                          event={event}
                          isRegistered={registeredEventIds.has(
                            String(event._id)
                          )}
                        />
                      ))}
                  </div>
                )}
              </section>

              {/* QUICK LINKS */}
              <section
                className="dashboard-bottom-links"
                aria-label="Quick links"
              >
                <Link to="/events">
                  <Compass size={18} />
                  <span>Browse more events</span>
                  <ArrowRight size={17} />
                </Link>

                <Link to="/my-registrations">
                  <Ticket size={18} />
                  <span>Manage my registrations</span>
                  <ArrowRight size={17} />
                </Link>
              </section>
            </>
          )}
        </main>
      </div>
    </div>
  );
}




