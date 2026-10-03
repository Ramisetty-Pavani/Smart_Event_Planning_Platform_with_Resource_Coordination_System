import { useEffect, useState } from "react";

function Events() {
  const [events, setEvents] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(null);

  const user = JSON.parse(
    localStorage.getItem("user") || "null"
  );

  const isParticipant = user?.role === "Participant";
  const isStaff = user?.role === "Staff";

  const [form, setForm] = useState({
    name: "",
    date: "",
    start_time: "",
    end_time: "",
    location: "",
    budget: "",
    capacity: "",
  });

  const loadEvents = () => {
    setLoading(true);

   fetch("http://localhost:8000/api/events/", {
  credentials: "include",
})

      .then((response) => response.json())
      .then((data) => {
        setEvents(data.events || []);
        setLoading(false);
      })
      .catch(() => {
        setMessage("Could not load events");
        setLoading(false);
      });
  };

  const loadRegistrations = () => {
    if (!isParticipant) {
      return;
    }

    fetch("http://localhost:8000/api/registrations/")
      .then((response) => response.json())
      .then((data) => {
        setRegistrations(data.registrations || data || []);
      })
      .catch(() => {
        setRegistrations([]);
      });
  };

  useEffect(() => {
    loadEvents();
    loadRegistrations();
  }, []);

  const handleChange = (event) => {
    setForm({
      ...form,
      [event.target.name]: event.target.value,
    });
  };

  const createEvent = async (event) => {
    event.preventDefault();

    setMessage("");

    try {
      const response = await fetch(
        "http://localhost:8000/api/events/",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: form.name,
            date: form.date,
            start_time: form.start_time || null,
            end_time: form.end_time || null,
            location: form.location,
            budget: Number(form.budget),
            capacity: form.capacity
              ? Number(form.capacity)
              : null,
          }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        setMessage("Event created successfully");

        setForm({
          name: "",
          date: "",
          start_time: "",
          end_time: "",
          location: "",
          budget: "",
          capacity: "",
        });

        loadEvents();
      } else {
        setMessage(
          data.message || "Could not create event"
        );
      }
    } catch (error) {
      setMessage("Could not connect to Django");
    }
  };

  const registerForEvent = async (eventId) => {
    if (!user) {
      setMessage("Please login to register");
      return;
    }

    setRegistering(eventId);
    setMessage("");

    try {
      const response = await fetch(
        "http://localhost:8000/api/registrations/",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            event_id: eventId,
            name:
              user.full_name ||
              user.username ||
              "Participant",
            email: user.email || "",
            phone: user.phone || "",
          }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        setMessage(
          "Registration completed successfully"
        );

        loadRegistrations();
        loadEvents();
      } else {
        setMessage(
          data.message ||
            "Could not register for this event"
        );
      }
    } catch (error) {
      setMessage("Could not connect to Django");
    } finally {
      setRegistering(null);
    }
  };

  /*
    Check whether an event has already completed.

    Completed when:
    1. Event date is before today
    2. Event is today and its end time has passed
  */
  const isEventCompleted = (event) => {
    if (!event?.date) {
      return false;
    }

    const now = new Date();

    const eventDate = new Date(
      `${event.date}T00:00:00`
    );

    const today = new Date();

    today.setHours(0, 0, 0, 0);

    eventDate.setHours(0, 0, 0, 0);

    // Event date has already passed
    if (eventDate < today) {
      return true;
    }

    // Event is today
    if (
      eventDate.getTime() === today.getTime() &&
      event.end_time
    ) {
      const [hours, minutes] = event.end_time
        .split(":")
        .map(Number);

      const eventEndTime = new Date();

      eventEndTime.setHours(
        hours,
        minutes,
        0,
        0
      );

      return now >= eventEndTime;
    }

    return false;
  };

  const isRegistered = (eventId) => {
    return registrations.some(
      (registration) =>
        Number(registration.event_id) ===
          Number(eventId) &&
        registration.status !== "Cancelled"
    );
  };

  const filteredEvents = events.filter((event) => {
    const searchText = search.toLowerCase();

    return (
      event.name
        ?.toLowerCase()
        .includes(searchText) ||
      event.location
        ?.toLowerCase()
        .includes(searchText) ||
      event.date
        ?.toLowerCase()
        .includes(searchText)
    );
  });

  const formatBudget = (budget) => {
    return Number(budget || 0).toLocaleString(
      "en-IN"
    );
  };

  return (
    <div style={styles.page}>
      <div style={styles.container}>

        {/* Page Header */}
        <div style={styles.header}>
          <div>
            <p style={styles.smallHeading}>
              {isParticipant
                ? "EVENTS"
                : isStaff
                ? "EVENTS"
                : "EVENT MANAGEMENT"}
            </p>

            <h1 style={styles.title}>
              Events
            </h1>

            <p style={styles.subtitle}>
              {isParticipant
                ? "Browse available events and register for the events you want to attend."
                : isStaff
                ? "View scheduled events and event information."
                : "Create and manage all your events from one place."}
            </p>
          </div>

          <div style={styles.eventCount}>
            <strong>{events.length}</strong>

            <span>
              {isParticipant
                ? "Total Events"
                : "Total Events"}
            </span>
          </div>
        </div>

        {/* Create Event Section - Admin/Organizer only */}
        {!isParticipant && !isStaff && (
          <div style={styles.formCard}>
            <div style={styles.sectionHeader}>
              <div>
                <h2 style={styles.sectionTitle}>
                  Create New Event
                </h2>

                <p style={styles.sectionSubtitle}>
                  Enter the event details below.
                </p>
              </div>

              <div style={styles.plusIcon}>
                +
              </div>
            </div>

            <form onSubmit={createEvent}>
              <div style={styles.formGrid}>

                {/* Event Name */}
                <div style={styles.inputGroup}>
                  <label style={styles.label}>
                    Event Name
                  </label>

                  <input
                    style={styles.input}
                    name="name"
                    placeholder="Enter event name"
                    value={form.name}
                    onChange={handleChange}
                    required
                  />
                </div>

                {/* Date */}
                <div style={styles.inputGroup}>
                  <label style={styles.label}>
                    Event Date
                  </label>

                  <input
                    style={styles.input}
                    name="date"
                    type="date"
                    value={form.date}
                    onChange={handleChange}
                    required
                  />
                </div>

                {/* Start Time */}
                <div style={styles.inputGroup}>
                  <label style={styles.label}>
                    Start Time
                  </label>

                  <input
                    style={styles.input}
                    name="start_time"
                    type="time"
                    value={form.start_time}
                    onChange={handleChange}
                  />
                </div>

                {/* End Time */}
                <div style={styles.inputGroup}>
                  <label style={styles.label}>
                    End Time
                  </label>

                  <input
                    style={styles.input}
                    name="end_time"
                    type="time"
                    value={form.end_time}
                    onChange={handleChange}
                  />
                </div>

                {/* Location */}
                <div style={styles.inputGroup}>
                  <label style={styles.label}>
                    Location
                  </label>

                  <input
                    style={styles.input}
                    name="location"
                    placeholder="Enter event location"
                    value={form.location}
                    onChange={handleChange}
                    required
                  />
                </div>

                {/* Budget */}
                <div style={styles.inputGroup}>
                  <label style={styles.label}>
                    Budget
                  </label>

                  <div
                    style={
                      styles.inputWithPrefix
                    }
                  >
                    <span style={styles.prefix}>
                      ₹
                    </span>

                    <input
                      style={
                        styles.inputWithPrefixField
                      }
                      name="budget"
                      type="number"
                      min="0"
                      placeholder="Enter budget"
                      value={form.budget}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>

                {/* Capacity */}
                <div style={styles.inputGroup}>
                  <label style={styles.label}>
                    Capacity
                  </label>

                  <input
                    style={styles.input}
                    name="capacity"
                    type="number"
                    min="1"
                    placeholder="Optional"
                    value={form.capacity}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div style={styles.formFooter}>
                <p style={styles.requiredText}>
                  * Required fields
                </p>

                <button
                  type="submit"
                  style={styles.createButton}
                >
                  + Create Event
                </button>
              </div>
            </form>

            {message && (
              <div
                style={{
                  ...styles.message,
                  background: message.includes(
                    "successfully"
                  )
                    ? "#dcfce7"
                    : "#fee2e2",
                  color: message.includes(
                    "successfully"
                  )
                    ? "#166534"
                    : "#991b1b",
                }}
              >
                {message}
              </div>
            )}
          </div>
        )}

        {/* Participant / Staff message */}
        {(isParticipant || isStaff) &&
          message && (
            <div
              style={{
                ...styles.message,
                background: message.includes(
                  "successfully"
                )
                  ? "#dcfce7"
                  : "#fee2e2",
                color: message.includes(
                  "successfully"
                )
                  ? "#166534"
                  : "#991b1b",
              }}
            >
              {message}
            </div>
          )}

        {/* Events List */}
        <div style={styles.eventsSection}>

          <div style={styles.eventsHeader}>
            <div>
              <h2 style={styles.sectionTitle}>
                {isParticipant
                  ? "Available Events"
                  : "All Events"}
              </h2>

              <p style={styles.sectionSubtitle}>
                {isParticipant
                  ? "View event details and register for an event."
                  : isStaff
                  ? "View your scheduled events."
                  : "View and manage your scheduled events."}
              </p>
            </div>

            {/* Search */}
            <div style={styles.searchContainer}>
              <span style={styles.searchIcon}>
                ⌕
              </span>

              <input
                style={styles.searchInput}
                type="text"
                placeholder="Search events..."
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
              />
            </div>
          </div>

          {/* Loading */}
          {loading && (
            <div style={styles.emptyState}>
              <div style={styles.spinner}></div>

              <p>Loading events...</p>
            </div>
          )}

          {/* No Events */}
          {!loading &&
            filteredEvents.length === 0 && (
              <div style={styles.emptyState}>
                <div style={styles.emptyIcon}>
                  📅
                </div>

                <h3>
                  {search
                    ? "No matching events"
                    : "No events found"}
                </h3>

                <p>
                  {search
                    ? "Try a different search term."
                    : isParticipant
                    ? "There are no events at the moment."
                    : "Create your first event using the form above."}
                </p>
              </div>
            )}

          {/* Event Cards */}
          {!loading &&
            filteredEvents.length > 0 && (
              <div style={styles.eventGrid}>

                {filteredEvents.map((event) => {
                  const completed =
                    isEventCompleted(event);

                  return (
                    <div
                      key={event.id}
                      style={styles.eventCard}
                    >

                      {/* Card Header */}
                      <div style={styles.cardTop}>

                        <div
                          style={
                            styles.calendarIcon
                          }
                        >
                          📅
                        </div>

                        <span
                          style={{
                            ...styles.activeBadge,
                            background: completed
                              ? "#e2e8f0"
                              : "#dcfce7",
                            color: completed
                              ? "#475569"
                              : "#166534",
                          }}
                        >
                          {completed
                            ? "Completed"
                            : "Available"}
                        </span>

                      </div>

                      {/* Event Name */}
                      <h3 style={styles.eventName}>
                        {event.name}
                      </h3>

                      {/* Details */}
                      <div style={styles.details}>

                        <div
                          style={styles.detailRow}
                        >
                          <span
                            style={
                              styles.detailIcon
                            }
                          >
                            📅
                          </span>

                          <div>
                            <span
                              style={
                                styles.detailLabel
                              }
                            >
                              Date
                            </span>

                            <strong
                              style={
                                styles.detailValue
                              }
                            >
                              {event.date}
                            </strong>
                          </div>
                        </div>

                        <div
                          style={styles.detailRow}
                        >
                          <span
                            style={
                              styles.detailIcon
                            }
                          >
                            ⏰
                          </span>

                          <div>
                            <span
                              style={
                                styles.detailLabel
                              }
                            >
                              Time
                            </span>

                            <strong
                              style={
                                styles.detailValue
                              }
                            >
                              {event.start_time ||
                                "Not specified"}
                              {" - "}
                              {event.end_time ||
                                "Not specified"}
                            </strong>
                          </div>
                        </div>

                        <div
                          style={styles.detailRow}
                        >
                          <span
                            style={
                              styles.detailIcon
                            }
                          >
                            📍
                          </span>

                          <div>
                            <span
                              style={
                                styles.detailLabel
                              }
                            >
                              Location
                            </span>

                            <strong
                              style={
                                styles.detailValue
                              }
                            >
                              {event.location}
                            </strong>
                          </div>
                        </div>

                      </div>

                      {/* Participant Information */}
                      {isParticipant && (
                        <div
                          style={
                            styles.participantFooter
                          }
                        >

                          <div>
                            <span
                              style={
                                styles.footerLabel
                              }
                            >
                              Capacity
                            </span>

                            <strong
                              style={
                                styles.capacity
                              }
                            >
                              {event.capacity ||
                                "Not specified"}
                            </strong>
                          </div>

                          {completed ? (
                            <span
                              style={{
                                ...styles.registerButton,
                                background:
                                  "#f1f5f9",
                                color: "#64748b",
                              }}
                            >
                              Completed
                            </span>
                          ) : (
                            <button
                              onClick={() =>
                                registerForEvent(
                                  event.id
                                )
                              }
                              disabled={
                                isRegistered(
                                  event.id
                                ) ||
                                registering ===
                                  event.id
                              }
                              style={{
                                ...styles.registerButton,
                                background:
                                  isRegistered(
                                    event.id
                                  )
                                    ? "#dcfce7"
                                    : "#2563eb",
                                color:
                                  isRegistered(
                                    event.id
                                  )
                                    ? "#166534"
                                    : "#ffffff",
                                cursor:
                                  isRegistered(
                                    event.id
                                  ) ||
                                  registering ===
                                    event.id
                                    ? "not-allowed"
                                    : "pointer",
                              }}
                            >
                              {registering ===
                              event.id
                                ? "Registering..."
                                : isRegistered(
                                    event.id
                                  )
                                ? "✓ Registered"
                                : "Register"}
                            </button>
                          )}

                        </div>
                      )}

                      {/* Staff Information */}
                      {isStaff && (
                        <div
                          style={styles.cardFooter}
                        >
                          <div>
                            <span
                              style={
                                styles.footerLabel
                              }
                            >
                              Capacity
                            </span>

                            <strong
                              style={
                                styles.capacity
                              }
                            >
                              {event.capacity ||
                                "Not specified"}
                            </strong>
                          </div>
                        </div>
                      )}

                      {/* Admin / Organizer Information */}
                      {!isParticipant &&
                        !isStaff && (
                          <div
                            style={
                              styles.cardFooter
                            }
                          >

                            <div>
                              <span
                                style={
                                  styles.footerLabel
                                }
                              >
                                Budget
                              </span>

                              <strong
                                style={
                                  styles.budget
                                }
                              >
                                ₹
                                {formatBudget(
                                  event.budget
                                )}
                              </strong>
                            </div>

                            <div
                              style={
                                styles.capacityBox
                              }
                            >
                              <span
                                style={
                                  styles.footerLabel
                                }
                              >
                                Capacity
                              </span>

                              <strong
                                style={
                                  styles.capacity
                                }
                              >
                                {event.capacity ||
                                  "Not specified"}
                              </strong>
                            </div>

                          </div>
                        )}

                    </div>
                  );
                })}

              </div>
            )}

        </div>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    marginLeft: "250px",
    background: "#f5f7fb",
    padding: "30px",
    boxSizing: "border-box",
  },

  container: {
    maxWidth: "1400px",
    margin: "0 auto",
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "25px",
  },

  smallHeading: {
    margin: 0,
    color: "#2563eb",
    fontSize: "12px",
    fontWeight: "700",
    letterSpacing: "1px",
  },

  title: {
    margin: "5px 0",
    fontSize: "30px",
    color: "#0f172a",
  },

  subtitle: {
    margin: 0,
    color: "#64748b",
    fontSize: "14px",
  },

  eventCount: {
    background: "#ffffff",
    padding: "14px 20px",
    borderRadius: "12px",
    boxShadow:
      "0 4px 18px rgba(15, 23, 42, 0.05)",
    textAlign: "center",
    display: "flex",
    flexDirection: "column",
    gap: "3px",
  },

  plusIcon: {
    width: "38px",
    height: "38px",
    borderRadius: "10px",
    background: "#eff6ff",
    color: "#2563eb",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "24px",
    fontWeight: "600",
  },

  formCard: {
    background: "#ffffff",
    borderRadius: "16px",
    padding: "25px",
    boxShadow:
      "0 4px 18px rgba(15, 23, 42, 0.05)",
    marginBottom: "25px",
  },

  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "22px",
  },

  sectionTitle: {
    margin: 0,
    fontSize: "20px",
    color: "#0f172a",
  },

  sectionSubtitle: {
    margin: "5px 0 0",
    color: "#64748b",
    fontSize: "13px",
  },

  formGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "18px",
  },

  inputGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "7px",
  },

  label: {
    color: "#334155",
    fontSize: "13px",
    fontWeight: "600",
  },

  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: "11px 13px",
    border: "1px solid #dbe2ea",
    borderRadius: "8px",
    fontSize: "14px",
    color: "#0f172a",
    outline: "none",
    background: "#ffffff",
  },

  inputWithPrefix: {
    display: "flex",
    alignItems: "center",
    border: "1px solid #dbe2ea",
    borderRadius: "8px",
    overflow: "hidden",
  },

  prefix: {
    padding: "11px 12px",
    background: "#f8fafc",
    color: "#64748b",
    borderRight: "1px solid #dbe2ea",
  },

  inputWithPrefixField: {
    flex: 1,
    minWidth: 0,
    padding: "11px 12px",
    border: "none",
    outline: "none",
    fontSize: "14px",
  },

  formFooter: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: "22px",
    paddingTop: "18px",
    borderTop: "1px solid #eef2f7",
  },

  requiredText: {
    margin: 0,
    color: "#94a3b8",
    fontSize: "12px",
  },

  createButton: {
    border: "none",
    background: "#2563eb",
    color: "#ffffff",
    padding: "11px 20px",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "600",
    fontSize: "14px",
  },

  message: {
    marginBottom: "18px",
    padding: "11px 14px",
    borderRadius: "8px",
    fontSize: "13px",
    fontWeight: "500",
  },

  eventsSection: {
    background: "#ffffff",
    borderRadius: "16px",
    padding: "25px",
    boxShadow:
      "0 4px 18px rgba(15, 23, 42, 0.05)",
  },

  eventsHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "20px",
    marginBottom: "22px",
  },

  searchContainer: {
    display: "flex",
    alignItems: "center",
    width: "260px",
    border: "1px solid #dbe2ea",
    borderRadius: "8px",
    background: "#ffffff",
    padding: "0 12px",
  },

  searchIcon: {
    color: "#64748b",
    fontSize: "20px",
  },

  searchInput: {
    width: "100%",
    border: "none",
    outline: "none",
    padding: "11px 8px",
    fontSize: "13px",
  },

  eventGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(280px, 1fr))",
    gap: "18px",
  },

  eventCard: {
    border: "1px solid #e2e8f0",
    borderRadius: "14px",
    padding: "20px",
    transition: "transform 0.2s ease",
  },

  cardTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "15px",
  },

  calendarIcon: {
    width: "42px",
    height: "42px",
    borderRadius: "10px",
    background: "#eff6ff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "20px",
  },

  activeBadge: {
    padding: "5px 9px",
    borderRadius: "20px",
    fontSize: "11px",
    fontWeight: "600",
  },

  eventName: {
    margin: "0 0 18px",
    color: "#0f172a",
    fontSize: "18px",
  },

  details: {
    display: "flex",
    flexDirection: "column",
    gap: "13px",
  },

  detailRow: {
    display: "flex",
    alignItems: "flex-start",
    gap: "10px",
  },

  detailIcon: {
    fontSize: "15px",
    width: "20px",
  },

  detailLabel: {
    display: "block",
    color: "#94a3b8",
    fontSize: "11px",
    marginBottom: "2px",
  },

  detailValue: {
    display: "block",
    color: "#475569",
    fontSize: "13px",
    fontWeight: "500",
  },

  cardFooter: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    borderTop: "1px solid #eef2f7",
    marginTop: "18px",
    paddingTop: "15px",
  },

  participantFooter: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    borderTop: "1px solid #eef2f7",
    marginTop: "18px",
    paddingTop: "15px",
    gap: "15px",
  },

  footerLabel: {
    display: "block",
    color: "#94a3b8",
    fontSize: "11px",
    marginBottom: "3px",
  },

  budget: {
    color: "#2563eb",
    fontSize: "15px",
  },

  capacityBox: {
    textAlign: "right",
  },

  capacity: {
    color: "#334155",
    fontSize: "14px",
  },

  registerButton: {
    border: "none",
    padding: "10px 16px",
    borderRadius: "8px",
    fontWeight: "600",
    fontSize: "13px",
  },

  emptyState: {
    textAlign: "center",
    padding: "55px 20px",
    color: "#64748b",
  },

  emptyIcon: {
    fontSize: "40px",
    marginBottom: "10px",
  },

  spinner: {
    width: "30px",
    height: "30px",
    border: "3px solid #e2e8f0",
    borderTop: "3px solid #2563eb",
    borderRadius: "50%",
    margin: "0 auto 15px",
  },
};

export default Events;