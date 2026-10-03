import { useEffect, useState } from "react";

function Registrations() {
  const [events, setEvents] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState("");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [qrRegistration, setQrRegistration] = useState(null);

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
  });

  const loadEvents = async () => {
    try {
      const response = await fetch(
        "http://localhost:8000/api/events/",
        {
          credentials: "include",
        }
      );

      const data = await response.json();

      setEvents(data.events || []);
    } catch (error) {
      setError("Could not load events");
    }
  };

  const loadRegistrations = async (eventId) => {
    if (!eventId) {
      setRegistrations([]);
      return;
    }

    try {
      const response = await fetch(
        `http://localhost:8000/api/registrations/?event_id=${eventId}`
      );

      const data = await response.json();

      setRegistrations(data.registrations || []);
    } catch (error) {
      setError("Could not load registrations");
    }
  };

  useEffect(() => {
    loadEvents();
  }, []);

  const handleEventChange = (event) => {
    const eventId = event.target.value;

    setSelectedEvent(eventId);
    setMessage("");
    setError("");
    setQrRegistration(null);

    loadRegistrations(eventId);
  };

  const handleChange = (event) => {
    setForm({
      ...form,
      [event.target.name]: event.target.value,
    });
  };

  const registerParticipant = async (event) => {
    event.preventDefault();

    setMessage("");
    setError("");

    if (!selectedEvent) {
      setError("Please select an event");
      return;
    }

    try {
      const response = await fetch(
        `http://localhost:8000/api/registrations/?event_id=${selectedEvent}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            event_id: Number(selectedEvent),
            name: form.name,
            email: form.email,
            phone: form.phone,
          }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        setMessage("Participant registered successfully");

        setForm({
          name: "",
          email: "",
          phone: "",
        });

        loadRegistrations(selectedEvent);
      } else {
        setError(
          data.message || "Registration failed"
        );
      }
    } catch (error) {
      setError("Could not connect to Django");
    }
  };

  const generateQR = (registration) => {
    setQrRegistration(registration);
  };

  const cancelRegistration = async (registrationId) => {
    setMessage("");
    setError("");

    const confirmed = window.confirm(
      "Are you sure you want to cancel this participant's registration?"
    );

    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch(
        "http://localhost:8000/api/registrations/",
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id: registrationId,
            status: "Cancelled",
          }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        setMessage(
          "Participant cancelled successfully"
        );

        loadRegistrations(selectedEvent);
      } else {
        setError(
          data.message || "Cancellation failed"
        );
      }
    } catch (error) {
      setError("Could not connect to Django");
    }
  };

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

    if (eventDate < today) {
      return true;
    }

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

  const availableEvents = events.filter(
    (event) => !isEventCompleted(event)
  );

  const selectedEventData = events.find(
    (event) =>
      String(event.id) === String(selectedEvent)
  );

  const presentCount = registrations.filter(
    (registration) =>
      registration.attendance === "Present"
  ).length;

  const registeredCount = registrations.filter(
    (registration) =>
      registration.status !== "Cancelled"
  ).length;

  return (
    <div style={styles.page}>
      <div style={styles.container}>

        <div style={styles.header}>
          <div>
            <p style={styles.smallHeading}>
              PARTICIPANT MANAGEMENT
            </p>

            <h1 style={styles.title}>
              Registrations
            </h1>

            <p style={styles.subtitle}>
              Register participants and manage event attendance.
            </p>
          </div>

          <div style={styles.totalCard}>
            <strong>{registeredCount}</strong>
            <span>Registered</span>
          </div>
        </div>

        <div style={styles.eventSelectorCard}>
          <div>
            <h2 style={styles.sectionTitle}>
              Select Event
            </h2>

            <p style={styles.sectionSubtitle}>
              Choose an upcoming event to view or add participants.
            </p>
          </div>

          <select
            style={styles.select}
            value={selectedEvent}
            onChange={handleEventChange}
          >
            <option value="">
              Select an event
            </option>

            {availableEvents.map((event) => (
              <option
                key={event.id}
                value={event.id}
              >
                {event.name} - {event.date}
              </option>
            ))}
          </select>
        </div>

        {availableEvents.length === 0 && (
          <div style={styles.infoMessage}>
            No upcoming events are currently open for registration.
          </div>
        )}

        {selectedEvent && selectedEventData && (
          <div style={styles.eventInfoCard}>
            <div style={styles.eventInfoIcon}>
              📅
            </div>

            <div style={styles.eventInfoMain}>
              <h2>{selectedEventData.name}</h2>

              <div style={styles.eventInfoDetails}>
                <span>
                  📅 {selectedEventData.date}
                </span>

                <span>
                  📍 {selectedEventData.location}
                </span>

                {selectedEventData.capacity && (
                  <span>
                    👥 Capacity:{" "}
                    {selectedEventData.capacity}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {message && (
          <div style={styles.successMessage}>
            ✓ {message}
          </div>
        )}

        {error && (
          <div style={styles.errorMessage}>
            ⚠ {error}
          </div>
        )}

        {selectedEvent &&
          selectedEventData &&
          !isEventCompleted(selectedEventData) && (
            <div style={styles.formCard}>
              <div style={styles.sectionHeader}>
                <div>
                  <h2 style={styles.sectionTitle}>
                    Register Participant
                  </h2>

                  <p style={styles.sectionSubtitle}>
                    Enter participant details below.
                  </p>
                </div>

                <div style={styles.formIcon}>
                  +
                </div>
              </div>

              <form onSubmit={registerParticipant}>
                <div style={styles.formGrid}>

                  <div style={styles.inputGroup}>
                    <label style={styles.label}>
                      Full Name
                    </label>

                    <input
                      style={styles.input}
                      type="text"
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      placeholder="Enter participant name"
                      required
                    />
                  </div>

                  <div style={styles.inputGroup}>
                    <label style={styles.label}>
                      Email
                    </label>

                    <input
                      style={styles.input}
                      type="email"
                      name="email"
                      value={form.email}
                      onChange={handleChange}
                      placeholder="participant@example.com"
                      required
                    />
                  </div>

                  <div style={styles.inputGroup}>
                    <label style={styles.label}>
                      Phone
                    </label>

                    <input
                      style={styles.input}
                      type="tel"
                      name="phone"
                      value={form.phone}
                      onChange={handleChange}
                      placeholder="10 digit phone number"
                      maxLength="10"
                      required
                    />
                  </div>
                </div>

                <div style={styles.formFooter}>
                  <span style={styles.requiredText}>
                    * All fields are required
                  </span>

                  <button
                    type="submit"
                    style={styles.registerButton}
                  >
                    Register Participant
                  </button>
                </div>
              </form>
            </div>
          )}

        {selectedEvent && (
          <div style={styles.statsGrid}>

            <div style={styles.statCard}>
              <div style={styles.statIcon}>
                👥
              </div>

              <div>
                <span style={styles.statLabel}>
                  Total Registered
                </span>

                <strong style={styles.statValue}>
                  {registeredCount}
                </strong>
              </div>
            </div>

            <div style={styles.statCard}>
              <div style={styles.presentIcon}>
                ✓
              </div>

              <div>
                <span style={styles.statLabel}>
                  Present
                </span>

                <strong style={styles.statValue}>
                  {presentCount}
                </strong>
              </div>
            </div>

            <div style={styles.statCard}>
              <div style={styles.pendingIcon}>
                ⏱
              </div>

              <div>
                <span style={styles.statLabel}>
                  Not Present
                </span>

                <strong style={styles.statValue}>
                  {registeredCount - presentCount}
                </strong>
              </div>
            </div>

          </div>
        )}

        {selectedEvent && (
          <div style={styles.participantsCard}>

            <div style={styles.participantsHeader}>
              <div>
                <h2 style={styles.sectionTitle}>
                  Registered Participants
                </h2>

                <p style={styles.sectionSubtitle}>
                  Manage participant tickets and attendance.
                </p>
              </div>

              <span style={styles.countBadge}>
                {registeredCount} participants
              </span>
            </div>

            {registrations.length === 0 ? (
              <div style={styles.emptyState}>
                <div style={styles.emptyIcon}>
                  👥
                </div>

                <h3>
                  No participants registered
                </h3>

                <p>
                  Register the first participant using
                  the form above.
                </p>
              </div>
            ) : (
              <div style={styles.participantGrid}>
                {registrations.map(
                  (registration) => (
                    <div
                      key={registration.id}
                      style={styles.participantCard}
                    >

                      <div style={styles.participantTop}>
                        <div style={styles.avatar}>
                          {registration.name
                            ?.charAt(0)
                            ?.toUpperCase() || "P"}
                        </div>

                        <div style={styles.participantStatus}>
                          <span
                            style={{
                              ...styles.statusBadge,
                              background:
                                registration.status ===
                                "Cancelled"
                                  ? "#fee2e2"
                                  : "#dcfce7",
                              color:
                                registration.status ===
                                "Cancelled"
                                  ? "#991b1b"
                                  : "#166534",
                            }}
                          >
                            {registration.status}
                          </span>
                        </div>
                      </div>

                      <h3 style={styles.participantName}>
                        {registration.name}
                      </h3>

                      <div style={styles.contactInfo}>
                        <p>
                          ✉ {registration.email}
                        </p>

                        <p>
                          ☎ {registration.phone}
                        </p>
                      </div>

                      <div style={styles.attendanceRow}>
                        <span>
                          Attendance
                        </span>

                        <span
                          style={{
                            ...styles.attendanceBadge,
                            background:
                              registration.attendance ===
                              "Present"
                                ? "#dcfce7"
                                : "#fef3c7",
                            color:
                              registration.attendance ===
                              "Present"
                                ? "#166534"
                                : "#92400e",
                          }}
                        >
                          {registration.attendance ||
                            "Not Marked"}
                        </span>
                      </div>

                      <button
                        style={styles.qrButton}
                        onClick={() =>
                          generateQR(registration)
                        }
                      >
                        ▣ Generate QR Ticket
                      </button>

                      {registration.status !==
                        "Cancelled" && (
                        <button
                          style={styles.cancelButton}
                          onClick={() =>
                            cancelRegistration(
                              registration.id
                            )
                          }
                        >
                          ✕ Cancel Participant
                        </button>
                      )}

                    </div>
                  )
                )}
              </div>
            )}
          </div>
        )}

        {qrRegistration && (
          <div style={styles.modalOverlay}>
            <div style={styles.modal}>

              <button
                style={styles.closeButton}
                onClick={() =>
                  setQrRegistration(null)
                }
              >
                ×
              </button>

              <div style={styles.qrHeader}>
                <div style={styles.qrIcon}>
                  ▣
                </div>

                <h2>
                  QR Ticket
                </h2>

                <p>
                  Show this QR code at event check-in.
                </p>
              </div>

              <div style={styles.ticket}>
                <h3>
                  {qrRegistration.name}
                </h3>

                <p>
                  {selectedEventData?.name}
                </p>

                <div style={styles.qrContainer}>
                  <img
                    src={`http://localhost:8000/api/registrations/${qrRegistration.id}/qr/`}
                    alt="Registration QR"
                    style={styles.qrImage}
                  />
                </div>

                <p style={styles.ticketId}>
                  Registration #
                  {qrRegistration.id}
                </p>
              </div>

              <button
                style={styles.closeModalButton}
                onClick={() =>
                  setQrRegistration(null)
                }
              >
                Close
              </button>

            </div>
          </div>
        )}

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
    color: "#0f172a",
    fontSize: "30px",
  },

  subtitle: {
    margin: 0,
    color: "#64748b",
    fontSize: "14px",
  },

  totalCard: {
    background: "#ffffff",
    padding: "14px 22px",
    borderRadius: "12px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "3px",
    boxShadow:
      "0 4px 18px rgba(15, 23, 42, 0.05)",
  },

  eventSelectorCard: {
    background: "#ffffff",
    borderRadius: "16px",
    padding: "24px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "25px",
    boxShadow:
      "0 4px 18px rgba(15, 23, 42, 0.05)",
    marginBottom: "18px",
  },

  select: {
    width: "350px",
    padding: "12px 14px",
    border: "1px solid #dbe2ea",
    borderRadius: "8px",
    background: "#ffffff",
    color: "#334155",
    fontSize: "14px",
    outline: "none",
  },

  infoMessage: {
    background: "#f1f5f9",
    color: "#475569",
    padding: "12px 15px",
    borderRadius: "8px",
    marginBottom: "18px",
    fontSize: "13px",
  },

  eventInfoCard: {
    background: "#eff6ff",
    border: "1px solid #dbeafe",
    borderRadius: "14px",
    padding: "18px 22px",
    display: "flex",
    alignItems: "center",
    gap: "15px",
    marginBottom: "18px",
  },

  eventInfoIcon: {
    width: "45px",
    height: "45px",
    borderRadius: "10px",
    background: "#ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "21px",
  },

  eventInfoMain: {
    flex: 1,
  },

  eventInfoDetails: {
    display: "flex",
    gap: "20px",
    flexWrap: "wrap",
    marginTop: "6px",
    color: "#64748b",
    fontSize: "13px",
  },

  successMessage: {
    background: "#dcfce7",
    color: "#166534",
    padding: "12px 15px",
    borderRadius: "8px",
    marginBottom: "18px",
    fontSize: "13px",
    fontWeight: "500",
  },

  errorMessage: {
    background: "#fee2e2",
    color: "#991b1b",
    padding: "12px 15px",
    borderRadius: "8px",
    marginBottom: "18px",
    fontSize: "13px",
    fontWeight: "500",
  },

  formCard: {
    background: "#ffffff",
    borderRadius: "16px",
    padding: "25px",
    boxShadow:
      "0 4px 18px rgba(15, 23, 42, 0.05)",
    marginBottom: "20px",
  },

  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "22px",
  },

  sectionTitle: {
    margin: 0,
    color: "#0f172a",
    fontSize: "20px",
  },

  sectionSubtitle: {
    margin: "5px 0 0",
    color: "#64748b",
    fontSize: "13px",
  },

  formIcon: {
    width: "38px",
    height: "38px",
    borderRadius: "10px",
    background: "#eff6ff",
    color: "#2563eb",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "22px",
  },

  formGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(230px, 1fr))",
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
    outline: "none",
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
    color: "#94a3b8",
    fontSize: "12px",
  },

  registerButton: {
    border: "none",
    background: "#2563eb",
    color: "#ffffff",
    padding: "11px 20px",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "600",
    fontSize: "14px",
  },

  statsGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(200px, 1fr))",
    gap: "18px",
    marginBottom: "20px",
  },

  statCard: {
    background: "#ffffff",
    borderRadius: "14px",
    padding: "18px",
    display: "flex",
    alignItems: "center",
    gap: "13px",
    boxShadow:
      "0 4px 18px rgba(15, 23, 42, 0.05)",
  },

  statIcon: {
    width: "42px",
    height: "42px",
    borderRadius: "10px",
    background: "#eff6ff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "19px",
  },

  presentIcon: {
    width: "42px",
    height: "42px",
    borderRadius: "10px",
    background: "#dcfce7",
    color: "#166534",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "19px",
  },

  pendingIcon: {
    width: "42px",
    height: "42px",
    borderRadius: "10px",
    background: "#fef3c7",
    color: "#92400e",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "19px",
  },

  statLabel: {
    display: "block",
    color: "#64748b",
    fontSize: "12px",
    marginBottom: "3px",
  },

  statValue: {
    color: "#0f172a",
    fontSize: "21px",
  },

  participantsCard: {
    background: "#ffffff",
    borderRadius: "16px",
    padding: "25px",
    boxShadow:
      "0 4px 18px rgba(15, 23, 42, 0.05)",
  },

  participantsHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "22px",
  },

  countBadge: {
    background: "#eff6ff",
    color: "#2563eb",
    padding: "6px 11px",
    borderRadius: "20px",
    fontSize: "12px",
    fontWeight: "600",
  },

  participantGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(280px, 1fr))",
    gap: "18px",
  },

  participantCard: {
    border: "1px solid #e2e8f0",
    borderRadius: "14px",
    padding: "20px",
  },

  participantTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },

  avatar: {
    width: "44px",
    height: "44px",
    borderRadius: "50%",
    background: "#dbeafe",
    color: "#1d4ed8",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "700",
    fontSize: "17px",
  },

  participantStatus: {
    display: "flex",
    alignItems: "center",
  },

  statusBadge: {
    padding: "5px 9px",
    borderRadius: "20px",
    fontSize: "11px",
    fontWeight: "600",
  },

  participantName: {
    margin: "15px 0 10px",
    color: "#0f172a",
    fontSize: "17px",
  },

  contactInfo: {
    color: "#64748b",
    fontSize: "12px",
  },

  attendanceRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    borderTop: "1px solid #eef2f7",
    marginTop: "15px",
    paddingTop: "14px",
    fontSize: "12px",
    color: "#64748b",
  },

  attendanceBadge: {
    padding: "5px 9px",
    borderRadius: "20px",
    fontWeight: "600",
  },

  qrButton: {
    width: "100%",
    marginTop: "15px",
    padding: "10px",
    border: "1px solid #bfdbfe",
    background: "#eff6ff",
    color: "#1d4ed8",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "600",
  },

  cancelButton: {
    width: "100%",
    marginTop: "10px",
    padding: "10px",
    border: "1px solid #fecaca",
    background: "#fef2f2",
    color: "#dc2626",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "600",
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

  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(15, 23, 42, 0.65)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    padding: "20px",
  },

  modal: {
    position: "relative",
    width: "100%",
    maxWidth: "430px",
    background: "#ffffff",
    borderRadius: "18px",
    padding: "30px",
    textAlign: "center",
    boxSizing: "border-box",
  },

  closeButton: {
    position: "absolute",
    top: "12px",
    right: "15px",
    border: "none",
    background: "transparent",
    fontSize: "27px",
    color: "#64748b",
    cursor: "pointer",
  },

  qrHeader: {
    marginBottom: "20px",
  },

  qrIcon: {
    fontSize: "30px",
    color: "#2563eb",
  },

  ticket: {
    border: "1px dashed #cbd5e1",
    borderRadius: "12px",
    padding: "20px",
    background: "#f8fafc",
  },

  qrContainer: {
    background: "#ffffff",
    padding: "12px",
    display: "inline-block",
    borderRadius: "10px",
    margin: "15px 0",
  },

  qrImage: {
    width: "230px",
    height: "230px",
    display: "block",
  },

  ticketId: {
    color: "#94a3b8",
    fontSize: "11px",
  },

  closeModalButton: {
    marginTop: "20px",
    width: "100%",
    padding: "11px",
    border: "none",
    background: "#2563eb",
    color: "#ffffff",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "600",
  },
};

export default Registrations;