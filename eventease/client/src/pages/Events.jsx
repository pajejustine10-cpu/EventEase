
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  MapPin,
  Search,
  SlidersHorizontal,
  Ticket,
  Users,
  X
} from "lucide-react";
import { Toaster, toast } from "sonner";

import api from "../services/api";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";

import "../styles/Dashboard.css";
import "../styles/Events.css";

function getImageUrl(path) {
  if (!path || typeof path !== "string") return "";

  if (/^https?:\/\//i.test(path)) return path;

  const apiBase =
    api.defaults.baseURL || "http://localhost:5000/api";

  const origin = new URL(
    apiBase,
    window.location.origin
  ).origin;

  return `${origin}${path.startsWith("/") ? path : `/${path}`}`;
}

function getRemainingSlots(event) {
  return Math.max(
    0,
    Number(event.capacity || 0) -
      Number(event.registeredCount || 0)
  );
}

function formatDate(date) {
  return new Date(date).toLocaleDateString("en-PH", {
    month: "long",
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

function EventDetailsModal({
  event,
  isRegistered,
  busy,
  onClose,
  onRegister
}) {
  const closeRef = useRef(null);

  useEffect(() => {
    if (!event) return;

    const oldOverflow = document.body.style.overflow;
    const oldFocus = document.activeElement;

    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    const handleKeyDown = (e) => {
      if (e.key === "Escape" && !busy) onClose();

      if (e.key === "Tab") {
        const modal = document.querySelector(".events-detail-modal");

        if (!modal) return;

        const controls = Array.from(
          modal.querySelectorAll(
            'button:not(:disabled), a[href], [tabindex]:not([tabindex="-1"])'
          )
        );

        if (!controls.length) return;

        const first = controls[0];
        const last = controls[controls.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = oldOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      oldFocus?.focus?.();
    };
  }, [event, busy, onClose]);

  if (!event) return null;

  const image = getImageUrl(event.image);
  const remaining = getRemainingSlots(event);
  const full = remaining === 0;

  return (
    <div
      className="events-modal-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <section
        className="events-detail-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="events-detail-title"
      >
        <button
          ref={closeRef}
          type="button"
          className="events-modal-close"
          onClick={onClose}
          disabled={busy}
          aria-label="Close event details"
        >
          <X size={20} />
        </button>

        <div className="events-modal-cover">
          {image ? (
            <img src={image} alt={`${event.title} cover`} />
          ) : (
            <div className="events-modal-fallback">
              <CalendarDays size={50} />
              <span>EventEase</span>
            </div>
          )}
        </div>

        <div className="events-modal-body">
          <span className="events-overline">EVENT DETAILS</span>

          <h2 id="events-detail-title">{event.title}</h2>

          <p className="events-modal-description">
            {event.description || "No description available."}
          </p>

          <div className="events-modal-information">
            <div>
              <CalendarDays size={19} />
              <span>
                <small>Date</small>
                <strong>{formatDate(event.date)}</strong>
              </span>
            </div>

            <div>
              <Clock3 size={19} />
              <span>
                <small>Time</small>
                <strong>{formatTime(event.date)}</strong>
              </span>
            </div>

            <div>
              <MapPin size={19} />
              <span>
                <small>Location</small>
                <strong>{event.location || "To be announced"}</strong>
              </span>
            </div>

            <div>
              <Users size={19} />
              <span>
                <small>Availability</small>
                <strong>
                  {full ? "Fully booked" : `${remaining} spots available`}
                </strong>
              </span>
            </div>
          </div>

          <div className="events-modal-actions">
            <button
              type="button"
              className="events-modal-secondary"
              onClick={onClose}
              disabled={busy}
            >
              Close
            </button>

            {isRegistered ? (
              <Link
                to="/my-registrations"
                className="events-modal-primary"
              >
                My Registration <ArrowUpRight size={17} />
              </Link>
            ) : (
              <button
                type="button"
                className="events-modal-primary"
                disabled={full || busy}
                onClick={() => onRegister(event._id)}
              >
                {busy
                  ? "Registering..."
                  : full
                  ? "Event Fully Booked"
                  : "Register for Event"}
                {!busy && !full && <ArrowRight size={17} />}
              </button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

export default function Events() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [events, setEvents] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [search, setSearch] = useState("");
  const [availability, setAvailability] = useState("all");
  const [sortBy, setSortBy] = useState("soonest");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [registeringId, setRegisteringId] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);

  const loadEvents = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      setLoadError("");

      const [eventsRes, registrationsRes] = await Promise.all([
        api.get("/events"),
        api.get("/registrations/my")
      ]);

      setEvents(Array.isArray(eventsRes.data) ? eventsRes.data : []);
      setRegistrations(
        Array.isArray(registrationsRes.data)
          ? registrationsRes.data
          : []
      );

      return true;
    } catch (err) {
      const message =
        err.response?.data?.message ||
        "Unable to load events. Please try again.";

      setLoadError(message);
      toast.error(message);
      return false;
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const registeredIds = useMemo(() => {
    return new Set(
      registrations
        .map((reg) => {
          const event = reg.event;

          return event && typeof event === "object"
            ? String(event._id || "")
            : String(event || "");
        })
        .filter(Boolean)
    );
  }, [registrations]);

  const upcomingEvents = useMemo(() => {
    const now = Date.now();

    return events.filter(
      (event) => new Date(event.date).getTime() > now
    );
  }, [events]);

  const filteredEvents = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return upcomingEvents
      .filter((event) => {
        const searchable = [
          event.title,
          event.description,
          event.location
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        if (keyword && !searchable.includes(keyword)) {
          return false;
        }

        const remaining = getRemainingSlots(event);

        if (availability === "available" && remaining === 0) {
          return false;
        }

        if (availability === "full" && remaining > 0) {
          return false;
        }

        if (
          availability === "registered" &&
          !registeredIds.has(String(event._id))
        ) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "latest") {
          return new Date(b.date) - new Date(a.date);
        }

        if (sortBy === "title") {
          return String(a.title || "").localeCompare(
            String(b.title || "")
          );
        }

        return new Date(a.date) - new Date(b.date);
      });
  }, [
    upcomingEvents,
    search,
    availability,
    sortBy,
    registeredIds
  ]);

  const availableCount = upcomingEvents.filter(
    (event) => getRemainingSlots(event) > 0
  ).length;

  const registeredCount = upcomingEvents.filter(
    (event) => registeredIds.has(String(event._id))
  ).length;

  const handleRegister = async (eventId) => {
    if (registeringId) return;

    try {
      setRegisteringId(eventId);

      await api.post(`/registrations/${eventId}`);

      toast.success(
        "You have successfully registered for the event!"
      );

      await loadEvents(false);

      setSelectedEvent(null);
    } catch (err) {
      toast.error(
        err.response?.data?.message ||
          "Unable to register for this event."
      );
    } finally {
      setRegisteringId(null);
    }
  };

  const clearFilters = () => {
    setSearch("");
    setAvailability("all");
    setSortBy("soonest");
  };

  const isFiltering =
    search.trim() !== "" ||
    availability !== "all" ||
    sortBy !== "soonest";

  return (
    <div className="dashboard-layout">
      <Toaster
        position="top-right"
        richColors
        closeButton
        duration={3500}
      />

      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="dashboard-main">
        <Navbar
          onMenuClick={() => setSidebarOpen(true)}
        />

        <main className="dashboard-content events-v5-page">
          {/* PAGE HEADER */}
          <div className="events-v5-header">
            <div>
              <span className="events-overline">EVENT DISCOVERY</span>

              <h1>Explore Events<span>.</span></h1>

              <p>
                Discover upcoming experiences, check availability,
                and reserve your place with ease.
              </p>
            </div>

            <Link to="/my-registrations" className="events-my-link">
              <Ticket size={17} />
              My Registrations
              <ArrowUpRight size={17} />
            </Link>
          </div>

          {/* SUMMARY STRIP */}
          <div className="events-summary-strip">
            <div>
              <span className="events-summary-icon">
                <CalendarDays size={20} />
              </span>
              <span>
                <strong>{upcomingEvents.length}</strong>
                <small>Upcoming Events</small>
              </span>
            </div>

            <div>
              <span className="events-summary-icon">
                <Users size={20} />
              </span>
              <span>
                <strong>{availableCount}</strong>
                <small>Events With Spots</small>
              </span>
            </div>

            <div>
              <span className="events-summary-icon">
                <CheckCircle2 size={20} />
              </span>
              <span>
                <strong>{registeredCount}</strong>
                <small>My Upcoming Events</small>
              </span>
            </div>
          </div>

          {/* SEARCH AND FILTER */}
          <div className="events-v5-toolbar">
            <label className="events-v5-search">
              <Search size={19} />

              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by event name or location..."
                aria-label="Search upcoming events"
              />

              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  aria-label="Clear search"
                >
                  <X size={17} />
                </button>
              )}
            </label>

            <label className="events-v5-select">
              <SlidersHorizontal size={17} />
              <span className="events-sr-only">
                Filter by availability
              </span>

              <select
                value={availability}
                onChange={(e) => setAvailability(e.target.value)}
              >
                <option value="all">All Events</option>
                <option value="available">Available Spots</option>
                <option value="full">Fully Booked</option>
                <option value="registered">My Registered Events</option>
              </select>
            </label>

            <label className="events-v5-select">
              <span className="events-sr-only">
                Sort events
              </span>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="soonest">Soonest First</option>
                <option value="latest">Latest First</option>
                <option value="title">Title A–Z</option>
              </select>
            </label>
          </div>

          {/* RESULTS HEADER */}
          <div className="events-v5-results-heading">
            <div>
              <h2>Upcoming Events</h2>
              <p>
                {loading
                  ? "Loading events..."
                  : `${filteredEvents.length} ${
                      filteredEvents.length === 1
                        ? "event"
                        : "events"
                    } found`}
              </p>
            </div>

            {isFiltering && (
              <button
                type="button"
                className="events-clear-filters"
                onClick={clearFilters}
              >
                Clear Filters
                <X size={15} />
              </button>
            )}
          </div>

          {/* CONTENT */}
          {loading ? (
            <div className="events-v5-empty" role="status">
              <CalendarDays size={36} />
              <h3>Loading upcoming events</h3>
              <p>Fetching the latest event information.</p>
            </div>
          ) : loadError ? (
            <div className="events-v5-empty" role="alert">
              <CalendarDays size={36} />
              <h3>Unable to load events</h3>
              <p>{loadError}</p>

              <button
                type="button"
                onClick={() => loadEvents()}
              >
                Try Again
                <ArrowRight size={16} />
              </button>
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="events-v5-empty">
              <Search size={36} />
              <h3>No matching events found</h3>
              <p>
                Try a different search term or change your filters.
              </p>

              <button type="button" onClick={clearFilters}>
                Clear Filters
                <ArrowRight size={16} />
              </button>
            </div>
          ) : (
            <div className="events-v5-grid">
              {filteredEvents.map((event) => {
                const isRegistered = registeredIds.has(
                  String(event._id)
                );

                const slots = getRemainingSlots(event);
                const full = slots === 0;
                const image = getImageUrl(event.image);
                const busy = registeringId === event._id;

                return (
                  <article
                    className="events-v5-card"
                    key={event._id}
                  >
                    <button
                      type="button"
                      className="events-v5-cover"
                      onClick={() => setSelectedEvent(event)}
                      aria-label={`View ${event.title} details`}
                    >
                      {image ? (
                        <img
                          src={image}
                          alt={`${event.title} cover`}
                          loading="lazy"
                        />
                      ) : (
                        <div className="events-v5-placeholder">
                          <CalendarDays size={41} />
                          <strong>EventEase</strong>
                        </div>
                      )}

                      <span
                        className={`events-v5-badge ${
                          isRegistered
                            ? "is-registered"
                            : full
                            ? "is-full"
                            : ""
                        }`}
                      >
                        {isRegistered
                          ? "Registered"
                          : full
                          ? "Fully Booked"
                          : "Upcoming"}
                      </span>

                      <span className="events-v5-view-icon">
                        <ArrowUpRight size={18} />
                      </span>
                    </button>

                    <div className="events-v5-card-body">
                      <div className="events-v5-date">
                        <CalendarDays size={15} />
                        {formatDate(event.date)}
                      </div>

                      <h3>{event.title}</h3>

                      <p className="events-v5-description">
                        {event.description ||
                          "Discover more about this event."}
                      </p>

                      <div className="events-v5-info">
                        <span>
                          <Clock3 size={16} />
                          {formatTime(event.date)}
                        </span>

                        <span>
                          <MapPin size={16} />
                          {event.location || "To be announced"}
                        </span>

                        <span>
                          <Users size={16} />
                          {full
                            ? "No spots remaining"
                            : `${slots} of ${event.capacity} spots available`}
                        </span>
                      </div>

                      <div className="events-v5-card-footer">
                        <button
                          type="button"
                          className="events-v5-details-button"
                          onClick={() => setSelectedEvent(event)}
                        >
                          Details
                        </button>

                        <button
                          type="button"
                          className={`events-register-button ${
                            isRegistered ? "registered" : ""
                          }`}
                          disabled={
                            isRegistered ||
                            full ||
                            registeringId !== null
                          }
                          onClick={() => handleRegister(event._id)}
                        >
                          {isRegistered ? (
                            <>
                              <CheckCircle2 size={17} />
                              Registered
                            </>
                          ) : busy ? (
                            "Registering..."
                          ) : full ? (
                            "Event Full"
                          ) : (
                            <>
                              <Ticket size={17} />
                              Register
                              <ArrowRight size={16} />
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </main>
      </div>

      <EventDetailsModal
        event={selectedEvent}
        isRegistered={
          selectedEvent
            ? registeredIds.has(String(selectedEvent._id))
            : false
        }
        busy={registeringId !== null}
        onClose={() => setSelectedEvent(null)}
        onRegister={handleRegister}
      />
    </div>
  );
}

