
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";

import { Link } from "react-router-dom";

import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  MapPin,
  Ticket,
  Trash2,
  X
} from "lucide-react";

import { Toaster, toast } from "sonner";

import api from "../services/api";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";

import "../styles/Dashboard.css";
import "../styles/MyRegistrations.css";

// Converts locally uploaded images into full backend URLs.
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
    imagePath.startsWith("/")
      ? imagePath
      : `/${imagePath}`
  }`;
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

function getEventId(event) {
  if (!event) return "";

  return String(
    typeof event === "object"
      ? event._id || ""
      : event
  );
}

// Cancellation confirmation modal.
function CancelConfirmation({
  event,
  busy,
  onClose,
  onConfirm
}) {
  const keepButtonRef = useRef(null);

  useEffect(() => {
    if (!event) return;

    const previousOverflow =
      document.body.style.overflow;

    const previousFocus =
      document.activeElement;

    document.body.style.overflow = "hidden";

    keepButtonRef.current?.focus();

    const handleKeyDown = (e) => {
      if (e.key === "Escape" && !busy) {
        onClose();
      }

      if (e.key === "Tab") {
        const modal = document.querySelector(
          ".myreg-confirm-dialog"
        );

        if (!modal) return;

        const buttons = Array.from(
          modal.querySelectorAll(
            "button:not(:disabled)"
          )
        );

        if (!buttons.length) return;

        const first = buttons[0];
        const last = buttons[buttons.length - 1];

        if (
          e.shiftKey &&
          document.activeElement === first
        ) {
          e.preventDefault();
          last.focus();
        } else if (
          !e.shiftKey &&
          document.activeElement === last
        ) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      document.body.style.overflow =
        previousOverflow;

      document.removeEventListener(
        "keydown",
        handleKeyDown
      );

      previousFocus?.focus?.();
    };
  }, [event, busy, onClose]);

  if (!event) return null;

  return (
    <div
      className="myreg-modal-overlay"
      onMouseDown={(e) => {
        if (
          e.target === e.currentTarget &&
          !busy
        ) {
          onClose();
        }
      }}
    >
      <section
        className="myreg-confirm-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="myreg-confirm-title"
        aria-describedby="myreg-confirm-description"
      >
        <button
          type="button"
          className="myreg-modal-x"
          onClick={onClose}
          disabled={busy}
          aria-label="Close confirmation"
        >
          <X size={19} />
        </button>

        <span className="myreg-warning-icon">
          <AlertTriangle size={25} />
        </span>

        <h2 id="myreg-confirm-title">
          Cancel registration?
        </h2>

        <p id="myreg-confirm-description">
          Are you sure you want to cancel your
          registration for{" "}
          <strong>{event.title}</strong>?

          Your reserved slot will become
          available to other participants.
        </p>

        <div className="myreg-modal-actions">
          <button
            ref={keepButtonRef}
            type="button"
            className="myreg-keep-button"
            onClick={onClose}
            disabled={busy}
          >
            Keep Registration
          </button>

          <button
            type="button"
            className="myreg-confirm-button"
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? (
              "Cancelling..."
            ) : (
              <>
                <Trash2 size={16} />
                Yes, Cancel
              </>
            )}
          </button>
        </div>
      </section>
    </div>
  );
}

export default function MyRegistrations() {
  const [sidebarOpen, setSidebarOpen] =
    useState(false);

  const [registrations, setRegistrations] =
    useState([]);

  const [events, setEvents] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [cancelTarget, setCancelTarget] =
    useState(null);

  const [cancellingId, setCancellingId] =
    useState(null);

  // Load both registrations and event records.
  // Event records provide the image when registration
  // population does not include the image field.
  const loadRegistrations = useCallback(
    async () => {
      try {
        setLoading(true);
        setError("");

        const [registrationsResponse, eventsResponse] =
          await Promise.all([
            api.get("/registrations/my"),
            api.get("/events")
          ]);

        setRegistrations(
          Array.isArray(registrationsResponse.data)
            ? registrationsResponse.data
            : []
        );

        setEvents(
          Array.isArray(eventsResponse.data)
            ? eventsResponse.data
            : []
        );
      } catch (err) {
        const message =
          err.response?.data?.message ||
          "Unable to load registrations.";

        setError(message);
        toast.error(message);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    loadRegistrations();
  }, [loadRegistrations]);

  // Build an event lookup using MongoDB event IDs.
  const eventLookup = useMemo(() => {
    return new Map(
      events.map((event) => [
        String(event._id),
        event
      ])
    );
  }, [events]);

  // Combine populated registration information
  // with the full event record from /api/events.
  const detailedRegistrations = useMemo(() => {
    return registrations
      .map((registration) => {
        const eventId = getEventId(
          registration.event
        );

        const populatedEvent =
          registration.event &&
          typeof registration.event === "object"
            ? registration.event
            : null;

        const fullEvent =
          eventLookup.get(eventId);

        if (!populatedEvent && !fullEvent) {
          return null;
        }

        const event = {
          ...(populatedEvent || {}),
          ...(fullEvent || {})
        };

        return {
          ...registration,
          event
        };
      })
      .filter(Boolean);
  }, [registrations, eventLookup]);

  const now = Date.now();

  const upcomingCount =
    detailedRegistrations.filter(
      (registration) =>
        new Date(
          registration.event.date
        ).getTime() > now
    ).length;

  const completedCount =
    detailedRegistrations.length -
    upcomingCount;

  const closeCancelModal = useCallback(() => {
    if (!cancellingId) {
      setCancelTarget(null);
    }
  }, [cancellingId]);

  const confirmCancel = async () => {
    if (!cancelTarget || cancellingId) {
      return;
    }

    const eventId = String(
      cancelTarget._id
    );

    try {
      setCancellingId(eventId);

      await api.delete(
        `/registrations/${eventId}`
      );

      setRegistrations((previous) =>
        previous.filter(
          (registration) =>
            getEventId(
              registration.event
            ) !== eventId
        )
      );

      setCancelTarget(null);

      toast.success(
        "Registration cancelled successfully!"
      );
    } catch (err) {
      toast.error(
        err.response?.data?.message ||
        "Unable to cancel registration."
      );
    } finally {
      setCancellingId(null);
    }
  };

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
        onClose={() =>
          setSidebarOpen(false)
        }
      />

      <div className="dashboard-main">
        <Navbar
          onMenuClick={() =>
            setSidebarOpen(true)
          }
        />

        <main className="dashboard-content myreg-page">
          {/* PAGE HEADER */}
          <header className="myreg-page-header">
            <div>
              <span className="myreg-overline">
                MY EVENT ACTIVITY
              </span>

              <h1>
                My Registrations
                <span>.</span>
              </h1>

              <p>
                Keep track of your events and
                manage your upcoming registrations.
              </p>
            </div>

            <Link
              to="/events"
              className="myreg-browse-link"
            >
              Browse Events
              <ArrowRight size={17} />
            </Link>
          </header>

          {/* STATISTICS */}
          {!loading && !error && (
            <div className="myreg-summary-grid">
              <div className="myreg-summary-card">
                <span className="myreg-summary-icon">
                  <Ticket size={21} />
                </span>

                <div>
                  <strong>
                    {detailedRegistrations.length}
                  </strong>

                  <span>
                    Total Registrations
                  </span>
                </div>
              </div>

              <div className="myreg-summary-card">
                <span className="myreg-summary-icon">
                  <CalendarDays size={21} />
                </span>

                <div>
                  <strong>{upcomingCount}</strong>
                  <span>Upcoming Events</span>
                </div>
              </div>

              <div className="myreg-summary-card">
                <span className="myreg-summary-icon">
                  <CheckCircle2 size={21} />
                </span>

                <div>
                  <strong>{completedCount}</strong>
                  <span>Past Events</span>
                </div>
              </div>
            </div>
          )}

          {/* REGISTERED EVENTS */}
          <div className="myreg-list-heading">
            <div>
              <h2>Registered Events</h2>

              <p>
                Events you've reserved a spot for.
              </p>
            </div>
          </div>

          {loading ? (
            <div
              className="myreg-empty"
              role="status"
            >
              <Ticket size={35} />
              <h3>
                Loading registrations...
              </h3>
            </div>
          ) : error ? (
            <div
              className="myreg-empty"
              role="alert"
            >
              <AlertTriangle size={35} />

              <h3>
                Unable to load registrations
              </h3>

              <p>{error}</p>

              <button
                type="button"
                onClick={loadRegistrations}
              >
                Try Again
              </button>
            </div>
          ) : detailedRegistrations.length === 0 ? (
            <div className="myreg-empty">
              <Ticket size={38} />

              <h3>No registrations yet</h3>

              <p>
                Discover upcoming events and
                reserve your first spot.
              </p>

              <Link to="/events">
                Explore Events
                <ArrowRight size={16} />
              </Link>
            </div>
          ) : (
            <div className="myreg-events-grid">
              {detailedRegistrations.map(
                (registration) => {
                  const event =
                    registration.event;

                  const isPast =
                    new Date(
                      event.date
                    ).getTime() <= now;

                  const imageUrl =
                    getImageUrl(
                      event.image
                    );

                  return (
                    <article
                      className="myreg-event-card"
                      key={registration._id}
                    >
                      {/* EVENT IMAGE */}
                      <div className="myreg-event-cover">
                        {imageUrl ? (
                          <img
                            src={imageUrl}
                            alt={`${event.title} event`}
                            loading="lazy"
                          />
                        ) : (
                          <div className="myreg-image-placeholder">
                            <CalendarDays size={39} />
                            <span>EventEase</span>
                          </div>
                        )}

                        <span
                          className={`myreg-status ${
                            isPast
                              ? "completed"
                              : "registered"
                          }`}
                        >
                          {isPast ? (
                            <CheckCircle2 size={14} />
                          ) : (
                            <Ticket size={14} />
                          )}

                          {isPast
                            ? "Completed"
                            : "Registered"}
                        </span>
                      </div>

                      {/* EVENT INFORMATION */}
                      <div className="myreg-event-content">
                        <div className="myreg-event-date">
                          <CalendarDays size={15} />
                          {formatDate(
                            event.date
                          )}
                        </div>

                        <h3>{event.title}</h3>

                        <p className="myreg-event-description">
                          {event.description ||
                            "No description available."}
                        </p>

                        <div className="myreg-event-details">
                          <span>
                            <Clock3 size={16} />
                            {formatTime(
                              event.date
                            )}
                          </span>

                          <span>
                            <MapPin size={16} />

                            {event.location ||
                              "To be announced"}
                          </span>
                        </div>

                        <div className="myreg-event-footer">
                          {isPast ? (
                            <span className="myreg-complete-message">
                              <CheckCircle2 size={17} />
                              Event completed
                            </span>
                          ) : (
                            <button
                              type="button"
                              className="myreg-cancel-button"
                              disabled={
                                cancellingId !== null
                              }
                              onClick={() =>
                                setCancelTarget(
                                  event
                                )
                              }
                            >
                              <Trash2 size={16} />
                              Cancel Registration
                            </button>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                }
              )}
            </div>
          )}
        </main>
      </div>

      <CancelConfirmation
        event={cancelTarget}
        busy={cancellingId !== null}
        onClose={closeCancelModal}
        onConfirm={confirmCancel}
      />
    </div>
  );
}




