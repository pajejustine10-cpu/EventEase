
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";

import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  ImagePlus,
  MapPin,
  Pencil,
  Plus,
  Search,
  SlidersHorizontal,
  Trash2,
  Upload,
  Users,
  X
} from "lucide-react";

import { Toaster, toast } from "sonner";

import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";

import "../styles/Dashboard.css";
import "../styles/ManageEvents.css";

const EMPTY_FORM = {
  title: "",
  description: "",
  date: "",
  location: "",
  capacity: 1
};

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp"
];

function getImageUrl(imagePath) {
  if (!imagePath || typeof imagePath !== "string") {
    return "";
  }

  if (/^https?:\/\//i.test(imagePath)) {
    return imagePath;
  }

  const apiBase =
    api.defaults.baseURL || "http://localhost:5000/api";

  const serverOrigin = new URL(
    apiBase,
    window.location.origin
  ).origin;

  return `${serverOrigin}${
    imagePath.startsWith("/")
      ? imagePath
      : `/${imagePath}`
  }`;
}

function toLocalInput(date) {
  const value = new Date(date);

  if (Number.isNaN(value.getTime())) {
    return "";
  }

  const local = new Date(
    value.getTime() - value.getTimezoneOffset() * 60000
  );

  return local.toISOString().slice(0, 16);
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

function getRegisteredCount(event) {
  return Math.max(0, Number(event.registeredCount || 0));
}

function getAvailableSlots(event) {
  return Math.max(
    0,
    Number(event.capacity || 0) - getRegisteredCount(event)
  );
}

function getStatus(event) {
  if (new Date(event.date).getTime() <= Date.now()) {
    return "past";
  }

  if (getAvailableSlots(event) === 0) {
    return "full";
  }

  return "upcoming";
}

function DeleteDialog({
  event,
  busy,
  onClose,
  onConfirm
}) {
  const keepButtonRef = useRef(null);

  useEffect(() => {
    if (!event) return;

    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement;

    document.body.style.overflow = "hidden";
    keepButtonRef.current?.focus();

    function handleKeyDown(e) {
      if (e.key === "Escape" && !busy) {
        onClose();
      }

      if (e.key === "Tab") {
        const dialog = document.querySelector(
          ".managev5-delete-dialog"
        );

        const buttons = Array.from(
          dialog?.querySelectorAll("button:not(:disabled)") || []
        );

        if (!buttons.length) return;

        const first = buttons[0];
        const last = buttons[buttons.length - 1];

        if (e.shiftKey && document.activeElement === first) {
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
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      previousFocus?.focus?.();
    };
  }, [event, busy, onClose]);

  if (!event) return null;

  return (
    <div
      className="managev5-modal-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) {
          onClose();
        }
      }}
    >
      <section
        className="managev5-delete-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="managev5-delete-title"
        aria-describedby="managev5-delete-description"
      >
        <span className="managev5-delete-icon">
          <AlertTriangle size={26} />
        </span>

        <h2 id="managev5-delete-title">
          Delete this event?
        </h2>

        <p id="managev5-delete-description">
          Are you sure you want to delete{" "}
          <strong>{event.title}</strong>? This action
          cannot be undone. Associated registrations
          will also be affected.
        </p>

        <div className="managev5-dialog-actions">
          <button
            ref={keepButtonRef}
            type="button"
            className="managev5-button-outline"
            onClick={onClose}
            disabled={busy}
          >
            Keep Event
          </button>

          <button
            type="button"
            className="managev5-button-danger"
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? (
              "Deleting..."
            ) : (
              <>
                <Trash2 size={16} />
                Delete Event
              </>
            )}
          </button>
        </div>
      </section>
    </div>
  );
}

export default function ManageEvents() {
  const { user } = useAuth();

  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");

  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [existingImage, setExistingImage] = useState("");

  const [participants, setParticipants] = useState(null);
  const [participantsLoading, setParticipantsLoading] =
    useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const formRef = useRef(null);
  const participantsRef = useRef(null);

  useEffect(() => {
    if (!selectedImage) {
      setImagePreview("");
      return;
    }

    const objectURL = URL.createObjectURL(selectedImage);

    setImagePreview(objectURL);

    return () => URL.revokeObjectURL(objectURL);
  }, [selectedImage]);

  const loadEvents = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError("");

      const { data } = await api.get("/events");

      setEvents(Array.isArray(data) ? data : []);
    } catch (err) {
      const message =
        err.response?.data?.message ||
        "Unable to load events.";

      setLoadError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.role === "admin") {
      loadEvents();
    }
  }, [user?.role, loadEvents]);

  const eventStats = useMemo(() => {
    let upcoming = 0;
    let past = 0;
    let registered = 0;

    events.forEach((event) => {
      if (new Date(event.date).getTime() > Date.now()) {
        upcoming += 1;
      } else {
        past += 1;
      }

      registered += getRegisteredCount(event);
    });

    return {
      total: events.length,
      upcoming,
      past,
      registered
    };
  }, [events]);

  const filteredEvents = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return events
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

        const status = getStatus(event);

        if (filter === "upcoming" && status === "past") {
          return false;
        }

        if (filter === "past" && status !== "past") {
          return false;
        }

        if (filter === "full" && status !== "full") {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "soonest") {
          return new Date(a.date) - new Date(b.date);
        }

        if (sortBy === "title") {
          return String(a.title || "").localeCompare(
            String(b.title || "")
          );
        }

        return new Date(b.date) - new Date(a.date);
      });
  }, [events, search, filter, sortBy]);

  const resetForm = () => {
    setForm({ ...EMPTY_FORM });
    setEditingId(null);
    setSelectedImage(null);
    setExistingImage("");
  };

  const scrollToForm = () => {
    requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    });
  };

  const openCreate = () => {
    resetForm();
    setShowForm(true);
    scrollToForm();
  };

  const openEdit = (event) => {
    setForm({
      title: event.title || "",
      description: event.description || "",
      date: toLocalInput(event.date),
      location: event.location || "",
      capacity: event.capacity ?? 1
    });

    setEditingId(event._id);
    setSelectedImage(null);
    setExistingImage(
      typeof event.image === "string" ? event.image : ""
    );
    setShowForm(true);
    scrollToForm();
  };

  const closeForm = () => {
    if (saving) return;

    setShowForm(false);
    resetForm();
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((previous) => ({
      ...previous,
      [name]: value
    }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];

    if (!file) return;

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      toast.error("Only JPG, PNG, and WebP images are allowed.");
      e.target.value = "";
      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      toast.error("Image must not exceed 5 MB.");
      e.target.value = "";
      return;
    }

    setSelectedImage(file);
    e.target.value = "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (saving) return;

    const date = new Date(form.date);
    const capacity = Number(form.capacity);

    if (
      !form.title.trim() ||
      !form.description.trim() ||
      !form.location.trim() ||
      !form.date ||
      Number.isNaN(date.getTime()) ||
      date <= new Date() ||
      !Number.isInteger(capacity) ||
      capacity < 1
    ) {
      toast.error(
        "Please provide valid event details and a future date."
      );
      return;
    }

    const payload = new FormData();

    payload.append("title", form.title.trim());
    payload.append("description", form.description.trim());
    payload.append("location", form.location.trim());
    payload.append("date", date.toISOString());
    payload.append("capacity", String(capacity));

    if (selectedImage) {
      payload.append("image", selectedImage);
    }

    try {
      setSaving(true);

      const config = {
        headers: {
          "Content-Type": "multipart/form-data"
        }
      };

      if (editingId) {
        await api.put(
          `/events/${editingId}`,
          payload,
          config
        );

        toast.success("Event updated successfully!");
      } else {
        await api.post("/events", payload, config);
        toast.success("Event created successfully!");
      }

      setShowForm(false);
      resetForm();

      await loadEvents();
    } catch (err) {
      toast.error(
        err.response?.data?.message ||
        "Unable to save event."
      );
    } finally {
      setSaving(false);
    }
  };

  const closeDelete = useCallback(() => {
    if (!deleting) {
      setDeleteTarget(null);
    }
  }, [deleting]);

  const confirmDelete = async () => {
    if (!deleteTarget || deleting) return;

    try {
      setDeleting(true);

      await api.delete(`/events/${deleteTarget._id}`);

      toast.success("Event deleted successfully!");

      if (editingId === deleteTarget._id) {
        setShowForm(false);
        resetForm();
      }

      if (participants?.eventId === deleteTarget._id) {
        setParticipants(null);
      }

      setDeleteTarget(null);

      await loadEvents();
    } catch (err) {
      toast.error(
        err.response?.data?.message ||
        "Unable to delete event."
      );
    } finally {
      setDeleting(false);
    }
  };

  const viewParticipants = async (event) => {
    setParticipants({
      eventId: event._id,
      title: event.title,
      users: []
    });

    setParticipantsLoading(true);

    requestAnimationFrame(() => {
      participantsRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    });

    try {
      const { data } = await api.get(
        `/registrations/event/${event._id}`
      );

      setParticipants({
        eventId: event._id,
        title: event.title,
        users: Array.isArray(data) ? data : []
      });
    } catch (err) {
      setParticipants(null);
      toast.error(
        err.response?.data?.message ||
        "Unable to load participants."
      );
    } finally {
      setParticipantsLoading(false);
    }
  };

  if (user?.role !== "admin") {
    return (
      <div className="manage-denied">
        <AlertTriangle size={27} />
        <h2>Admin access required</h2>
        <p>
          You do not have permission to manage events.
        </p>
      </div>
    );
  }

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

        <main className="dashboard-content managev5-page">
          {/* HEADER */}
          <div className="managev5-header">
            <div>
              <span className="managev5-overline">
                ADMINISTRATION
              </span>

              <h1>
                Manage Events<span>.</span>
              </h1>

              <p>
                Create, organize, and manage your
                events in one place.
              </p>
            </div>

            <button
              type="button"
              className="managev5-create-button"
              onClick={openCreate}
            >
              <Plus size={18} />
              Create Event
            </button>
          </div>

          {/* STATISTICS */}
          <div className="managev5-stats">
            <div className="managev5-stat">
              <span className="managev5-stat-icon">
                <CalendarDays size={21} />
              </span>
              <div>
                <strong>{eventStats.total}</strong>
                <span>Total Events</span>
              </div>
            </div>

            <div className="managev5-stat">
              <span className="managev5-stat-icon">
                <Clock3 size={21} />
              </span>
              <div>
                <strong>{eventStats.upcoming}</strong>
                <span>Upcoming Events</span>
              </div>
            </div>

            <div className="managev5-stat">
              <span className="managev5-stat-icon">
                <Users size={21} />
              </span>
              <div>
                <strong>{eventStats.registered}</strong>
                <span>Registered Spots</span>
              </div>
            </div>
          </div>

          {/* CREATE / EDIT FORM */}
          {showForm && (
            <section
              className="managev5-panel managev5-form-panel"
              ref={formRef}
            >
              <div className="managev5-panel-heading">
                <div>
                  <span className="managev5-overline">
                    EVENT DETAILS
                  </span>
                  <h2>
                    {editingId
                      ? "Edit Event"
                      : "Create New Event"}
                  </h2>
                  <p>
                    Complete the details below to
                    {editingId
                      ? " update this event."
                      : " publish a new event."}
                  </p>
                </div>

                <button
                  type="button"
                  className="managev5-close-icon"
                  onClick={closeForm}
                  disabled={saving}
                  aria-label="Close event form"
                >
                  <X size={20} />
                </button>
              </div>

              <form
                className="managev5-form"
                onSubmit={handleSubmit}
              >
                <div className="managev5-field">
                  <label htmlFor="manage-title">
                    Event Title
                  </label>
                  <input
                    id="manage-title"
                    name="title"
                    type="text"
                    value={form.title}
                    onChange={handleChange}
                    placeholder="Enter event title"
                    maxLength={150}
                    disabled={saving}
                    required
                  />
                </div>

                <div className="managev5-field">
                  <label htmlFor="manage-description">
                    Description
                  </label>
                  <textarea
                    id="manage-description"
                    name="description"
                    rows={4}
                    value={form.description}
                    onChange={handleChange}
                    placeholder="Describe the event..."
                    disabled={saving}
                    required
                  />
                </div>

                <div className="managev5-form-grid">
                  <div className="managev5-field">
                    <label htmlFor="manage-date">
                      Date and Time
                    </label>
                    <input
                      id="manage-date"
                      type="datetime-local"
                      name="date"
                      value={form.date}
                      onChange={handleChange}
                      disabled={saving}
                      required
                    />
                  </div>

                  <div className="managev5-field">
                    <label htmlFor="manage-capacity">
                      Event Capacity
                    </label>
                    <input
                      id="manage-capacity"
                      type="number"
                      name="capacity"
                      min={1}
                      step={1}
                      value={form.capacity}
                      onChange={handleChange}
                      disabled={saving}
                      required
                    />
                  </div>
                </div>

                <div className="managev5-field">
                  <label htmlFor="manage-location">
                    Location
                  </label>
                  <input
                    id="manage-location"
                    name="location"
                    type="text"
                    value={form.location}
                    onChange={handleChange}
                    placeholder="Enter event location"
                    disabled={saving}
                    required
                  />
                </div>

                <div className="managev5-image-field">
                  <div className="managev5-image-heading">
                    <strong>Event Cover Photo</strong>
                    <span>Optional</span>
                  </div>

                  <p>
                    JPG, PNG, or WebP. Maximum 5 MB.
                    A 16:9 image works best.
                  </p>

                  {imagePreview ||
                  (!selectedImage && existingImage) ? (
                    <div className="managev5-image-preview">
                      <img
                        src={
                          imagePreview ||
                          getImageUrl(existingImage)
                        }
                        alt="Selected event cover"
                      />
                    </div>
                  ) : (
                    <div className="managev5-image-placeholder">
                      <ImagePlus size={36} />
                      <strong>
                        Add an event cover photo
                      </strong>
                      <span>
                        Give your event a visual identity
                      </span>
                    </div>
                  )}

                  <div className="managev5-image-actions">
                    <label className="managev5-upload-button">
                      <Upload size={17} />

                      {selectedImage || existingImage
                        ? "Change Photo"
                        : "Choose Photo"}

                      <input
                        type="file"
                        name="image"
                        accept=".jpg,.jpeg,.png,.webp"
                        onChange={handleImageChange}
                        disabled={saving}
                      />
                    </label>

                    {selectedImage && (
                      <button
                        type="button"
                        className="managev5-undo-button"
                        onClick={() => setSelectedImage(null)}
                        disabled={saving}
                      >
                        <X size={16} />
                        Undo Selection
                      </button>
                    )}
                  </div>

                  {selectedImage && (
                    <small>
                      Selected: {selectedImage.name}
                    </small>
                  )}

                  {!selectedImage && existingImage && (
                    <small>
                      Current photo will be kept unless
                      you choose a replacement.
                    </small>
                  )}
                </div>

                <div className="managev5-form-actions">
                  <button
                    type="button"
                    className="managev5-button-outline"
                    onClick={closeForm}
                    disabled={saving}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="managev5-create-button"
                    disabled={saving}
                  >
                    {saving
                      ? "Saving..."
                      : editingId
                      ? "Save Changes"
                      : "Create Event"}

                    {!saving && <ArrowRight size={17} />}
                  </button>
                </div>
              </form>
            </section>
          )}

          {/* ALL EVENTS PANEL */}
          <section className="managev5-panel">
            <div className="managev5-panel-heading">
              <div>
                <span className="managev5-overline">
                  EVENT MANAGEMENT
                </span>

                <h2>All Events</h2>

                <p>
                  View and manage all events
                  created on EventEase.
                </p>
              </div>

              <span className="managev5-count">
                {events.length} total
              </span>
            </div>

            <div className="managev5-toolbar">
              <label className="managev5-search">
                <Search size={18} />
                <input
                  type="search"
                  placeholder="Search event title or location..."
                  value={search}
                  onChange={(e) =>
                    setSearch(e.target.value)
                  }
                />
              </label>

              <label className="managev5-select">
                <SlidersHorizontal size={16} />
                <select
                  value={filter}
                  onChange={(e) =>
                    setFilter(e.target.value)
                  }
                  aria-label="Filter events"
                >
                  <option value="all">All Events</option>
                  <option value="upcoming">
                    Upcoming
                  </option>
                  <option value="past">
                    Past Events
                  </option>
                  <option value="full">
                    Fully Booked
                  </option>
                </select>
              </label>

              <label className="managev5-select">
                <select
                  value={sortBy}
                  onChange={(e) =>
                    setSortBy(e.target.value)
                  }
                  aria-label="Sort events"
                >
                  <option value="newest">
                    Latest Date
                  </option>
                  <option value="soonest">
                    Earliest Date
                  </option>
                  <option value="title">
                    Title A–Z
                  </option>
                </select>
              </label>
            </div>

            <p className="managev5-results">
              {filteredEvents.length}{" "}
              {filteredEvents.length === 1
                ? "event"
                : "events"}{" "}
              found
            </p>

            {loading ? (
              <div
                className="managev5-empty"
                role="status"
              >
                Loading events...
              </div>
            ) : loadError ? (
              <div
                className="managev5-empty"
                role="alert"
              >
                <AlertTriangle size={29} />
                <h3>Unable to load events</h3>
                <p>{loadError}</p>
                <button
                  type="button"
                  onClick={loadEvents}
                  className="managev5-create-button"
                >
                  Try Again
                </button>
              </div>
            ) : filteredEvents.length === 0 ? (
              <div className="managev5-empty">
                <CalendarDays size={34} />
                <h3>No events found</h3>
                <p>
                  Try adjusting your search or
                  create a new event.
                </p>
              </div>
            ) : (
              <div className="managev5-event-list">
                {filteredEvents.map((event) => {
                  const image = getImageUrl(event.image);
                  const status = getStatus(event);
                  const remaining = getAvailableSlots(event);

                  return (
                    <article
                      className="managev5-event-row"
                      key={event._id}
                    >
                      <div className="managev5-event-thumb">
                        {image ? (
                          <img
                            src={image}
                            alt={`${event.title} cover`}
                            loading="lazy"
                          />
                        ) : (
                          <div className="managev5-thumb-fallback">
                            <CalendarDays size={27} />
                          </div>
                        )}
                      </div>

                      <div className="managev5-event-info">
                        <div className="managev5-event-title">
                          <h3>{event.title}</h3>

                          <span
                            className={`managev5-status ${status}`}
                          >
                            {status === "past"
                              ? "Completed"
                              : status === "full"
                              ? "Fully Booked"
                              : "Upcoming"}
                          </span>
                        </div>

                        <div className="managev5-event-meta">
                          <span>
                            <CalendarDays size={15} />
                            {formatDate(event.date)}
                            {" · "}
                            {formatTime(event.date)}
                          </span>

                          <span>
                            <MapPin size={15} />
                            {event.location}
                          </span>

                          <span>
                            <Users size={15} />
                            {getRegisteredCount(event)} of{" "}
                            {event.capacity} registered
                            {" · "}
                            {remaining} spots left
                          </span>
                        </div>
                      </div>

                      <div className="managev5-event-actions">
                        <button
                          type="button"
                          onClick={() =>
                            viewParticipants(event)
                          }
                        >
                          <Users size={16} />
                          Participants
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            openEdit(event)
                          }
                        >
                          <Pencil size={16} />
                          Edit
                        </button>

                        <button
                          type="button"
                          className="managev5-danger-action"
                          onClick={() =>
                            setDeleteTarget(event)
                          }
                        >
                          <Trash2 size={16} />
                          Delete
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          {/* PARTICIPANTS */}
          {participants && (
            <section
              className="managev5-panel"
              ref={participantsRef}
            >
              <div className="managev5-panel-heading">
                <div>
                  <span className="managev5-overline">
                    REGISTRATIONS
                  </span>
                  <h2>
                    Participants
                  </h2>
                  <p>
                    {participants.title}
                  </p>
                </div>

                <button
                  type="button"
                  className="managev5-close-icon"
                  onClick={() =>
                    setParticipants(null)
                  }
                  aria-label="Close participants"
                >
                  <X size={20} />
                </button>
              </div>

              {participantsLoading ? (
                <div className="managev5-empty">
                  Loading participants...
                </div>
              ) : participants.users.length === 0 ? (
                <div className="managev5-empty">
                  <Users size={30} />
                  <h3>No participants yet</h3>
                </div>
              ) : (
                <div className="managev5-participants-list">
                  {participants.users.map(
                    (registration) => (
                      <div
                        key={registration._id}
                        className="managev5-participant"
                      >
                        <div className="managev5-avatar">
                          {(
                            registration.user?.name || "U"
                          )
                            .charAt(0)
                            .toUpperCase()}
                        </div>

                        <div>
                          <strong>
                            {registration.user?.name ||
                              "Unknown user"}
                          </strong>

                          <span>
                            {registration.user?.email ||
                              "No email available"}
                          </span>
                        </div>

                        <span className="managev5-participant-badge">
                          <CheckCircle2 size={14} />
                          Registered
                        </span>
                      </div>
                    )
                  )}
                </div>
              )}
            </section>
          )}
        </main>
      </div>

      <DeleteDialog
        event={deleteTarget}
        busy={deleting}
        onClose={closeDelete}
        onConfirm={confirmDelete}
      />
    </div>
  );
}


