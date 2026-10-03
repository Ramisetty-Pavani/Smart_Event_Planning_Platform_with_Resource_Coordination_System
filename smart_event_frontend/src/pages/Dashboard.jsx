import { useEffect, useState } from "react";

const getEventStatus = (event) => {
  const now = new Date();

  const today =
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  const currentTime =
    `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  if (event.date < today) {
    return "Completed";
  }

  if (
    event.date === today &&
    event.end_time &&
    currentTime >= event.end_time
  ) {
    return "Completed";
  }

  return "Active";
};

function Dashboard({ user }) {
  const [events, setEvents] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);

  const isParticipant = user?.role === "Participant";

  useEffect(() => {
    loadDashboard();
  }, [user]);

  const loadDashboard = async () => {
    setLoading(true);

    try {
      const eventsResponse = await fetch(
        "http://localhost:8000/api/events/"
      );

      const eventsData = await eventsResponse.json();

      setEvents(eventsData.events || []);

      if (isParticipant) {
        const registrationsResponse = await fetch(
          "http://localhost:8000/api/registrations/"
        );

        const registrationsData =
          await registrationsResponse.json();

        const allRegistrations =
          registrationsData.registrations || [];

        const myRegistrations =
          allRegistrations.filter(
            (registration) =>
              registration.email?.toLowerCase() ===
              user?.email?.toLowerCase()
          );

        setRegistrations(myRegistrations);
      } else {
        const dashboardResponse = await fetch(
          "http://localhost:8000/api/dashboard/summary/"
        );

        const dashboardResult =
          await dashboardResponse.json();

        setDashboardData(dashboardResult);
      }
    } catch (error) {
      console.error(
        "Dashboard loading error:",
        error
      );
    } finally {
      setLoading(false);
    }
  };

  const getEventById = (eventId) => {
    return events.find(
      (event) =>
        Number(event.id) === Number(eventId)
    );
  };

  const upcomingEvents = events.filter((event) => {
    if (!event.date) {
      return false;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const eventDate = new Date(
      `${event.date}T00:00:00`
    );

    return eventDate >= today;
  });

  const presentCount = registrations.filter(
    (registration) =>
      registration.attendance === "Present"
  ).length;

  const attendanceRate =
    registrations.length > 0
      ? Math.round(
          (presentCount / registrations.length) * 100
        )
      : 0;

  if (loading) {
    return (
      <div style={styles.page}>
        <div style={styles.loading}>
          <div style={styles.spinner}></div>
          <p>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  /* =========================
     PARTICIPANT DASHBOARD
     ========================= */

  if (isParticipant) {
    return (
      <div style={styles.page}>
        <div style={styles.container}>

          {/* Header */}
          <div style={styles.header}>
            <div>
              <p style={styles.smallHeading}>
                PARTICIPANT DASHBOARD
              </p>

              <h1 style={styles.title}>
                Welcome back,
              </h1>

              <h2 style={styles.name}>
                {user?.full_name ||
                  user?.username ||
                  "Participant"}
              </h2>

              <p style={styles.subtitle}>
                Discover events and manage your
                registrations.
              </p>
            </div>

            <button
              onClick={loadDashboard}
              style={styles.refreshButton}
            >
              ↻ Refresh
            </button>
          </div>

          {/* Statistics */}
          <div style={styles.statsGrid}>

            <div style={styles.statCard}>
              <div style={styles.statIcon}>
                📅
              </div>

              <div>
                <p style={styles.statLabel}>
                  Upcoming Events
                </p>

                <h2 style={styles.statValue}>
                  {upcomingEvents.length}
                </h2>

                <p style={styles.statDescription}>
                  Events available
                </p>
              </div>
            </div>

            <div style={styles.statCard}>
              <div style={styles.statIcon}>
                🎟️
              </div>

              <div>
                <p style={styles.statLabel}>
                  My Registrations
                </p>

                <h2 style={styles.statValue}>
                  {registrations.length}
                </h2>

                <p style={styles.statDescription}>
                  Events you registered for
                </p>
              </div>
            </div>

            <div style={styles.statCard}>
              <div style={styles.statIcon}>
                ✅
              </div>

              <div>
                <p style={styles.statLabel}>
                  Attendance
                </p>

                <h2 style={styles.statValue}>
                  {attendanceRate}%
                </h2>

                <p style={styles.statDescription}>
                  Your attendance
                </p>
              </div>
            </div>

          </div>

          {/* Quick Actions */}
          <div style={styles.quickGrid}>

            <div
              style={styles.quickCard}
              onClick={() =>
                (window.location.href = "/events")
              }
            >
              <div style={styles.quickIcon}>
                📅
              </div>

              <div>
                <h3>
                  Browse Events
                </h3>

                <p>
                  View available events and
                  register.
                </p>
              </div>
            </div>

            <div
              style={styles.quickCard}
              onClick={() =>
                (window.location.href =
                  "/registrations")
              }
            >
              <div style={styles.quickIcon}>
                🎟️
              </div>

              <div>
                <h3>
                  My Registrations
                </h3>

                <p>
                  View your registrations and
                  attendance.
                </p>
              </div>
            </div>

          </div>

          {/* My Registrations */}
          <div style={styles.section}>
            <div style={styles.sectionHeader}>
              <div>
                <h2 style={styles.sectionTitle}>
                  My Registrations
                </h2>

                <p style={styles.sectionSubtitle}>
                  Your registered events
                </p>
              </div>
            </div>

            {registrations.length === 0 ? (
              <div style={styles.emptyState}>
                <div style={styles.emptyIcon}>
                  🎟️
                </div>

                <h3>
                  No registrations yet
                </h3>

                <p>
                  Browse available events and
                  register for one.
                </p>
              </div>
            ) : (
              <div style={styles.registrationList}>
                {registrations.map(
                  (registration) => {
                    const event =
                      getEventById(
                        registration.event_id
                      );

                    const eventStatus = event
                      ? getEventStatus(event)
                      : "Active";

                    return (
                      <div
                        key={registration.id}
                        style={
                          styles.registrationCard
                        }
                      >
                        <div>
                          <h3
                            style={
                              styles.registrationTitle
                            }
                          >
                            {event?.name ||
                              `Event #${registration.event_id}`}
                          </h3>

                          <p
                            style={
                              styles.registrationInfo
                            }
                          >
                            {event?.date ||
                              "Date not available"}
                            {" • "}
                            {event?.location ||
                              "Location not available"}
                          </p>
                        </div>

                        <div
                          style={
                            styles.registrationStatus
                          }
                        >

                          {/* Event Status */}
                          <span
                            style={{
                              ...styles.statusBadge,
                              background:
                                eventStatus ===
                                "Completed"
                                  ? "#e2e8f0"
                                  : "#dcfce7",
                              color:
                                eventStatus ===
                                "Completed"
                                  ? "#475569"
                                  : "#166534",
                            }}
                          >
                            {eventStatus}
                          </span>

                          {/* Registration Status */}
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

                          {/* Attendance */}
                          <span
                            style={
                              styles.attendanceBadge
                            }
                          >
                            {registration.attendance}
                          </span>

                        </div>
                      </div>
                    );
                  }
                )}
              </div>
            )}
          </div>

          {/* Upcoming Events */}
          <div style={styles.section}>
            <div style={styles.sectionHeader}>
              <div>
                <h2 style={styles.sectionTitle}>
                  Upcoming Events
                </h2>

                <p style={styles.sectionSubtitle}>
                  Events you can attend
                </p>
              </div>

              <span style={styles.countBadge}>
                {upcomingEvents.length} events
              </span>
            </div>

            {upcomingEvents.length === 0 ? (
              <div style={styles.emptyState}>
                <div style={styles.emptyIcon}>
                  📅
                </div>

                <h3>
                  No upcoming events
                </h3>

                <p>
                  Check back later for new events.
                </p>
              </div>
            ) : (
              <div style={styles.eventGrid}>
                {upcomingEvents.map((event) => (
                  <div
                    key={event.id}
                    style={styles.eventCard}
                  >
                    <div style={styles.cardTop}>
                      <div
                        style={
                          styles.calendarIcon
                        }
                      >
                        📅
                      </div>

                      <span
                        style={
                          styles.availableBadge
                        }
                      >
                        Available
                      </span>
                    </div>

                    <h3
                      style={styles.eventName}
                    >
                      {event.name}
                    </h3>

                    <div
                      style={styles.details}
                    >
                      <div
                        style={
                          styles.detailRow
                        }
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
                        style={
                          styles.detailRow
                        }
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
                        style={
                          styles.detailRow
                        }
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
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    );
  }

  /* =========================
     ADMIN / ORGANIZER DASHBOARD
     ========================= */

  const summary =
    dashboardData || {};

  return (
    <div style={styles.page}>
      <div style={styles.container}>

        <div style={styles.header}>
          <div>
            <p style={styles.smallHeading}>
              EVENT MANAGEMENT
            </p>

            <h1 style={styles.title}>
              Welcome back,
            </h1>

            <h2 style={styles.name}>
              {user?.full_name ||
                user?.username ||
                "User"}
            </h2>

            <p style={styles.subtitle}>
              Monitor your events, registrations,
              budgets, and conflicts.
            </p>
          </div>

          <button
            onClick={loadDashboard}
            style={styles.refreshButton}
          >
            ↻ Refresh
          </button>
        </div>

        <div style={styles.statsGrid}>

          <div style={styles.statCard}>
            <div style={styles.statIcon}>
              📅
            </div>

            <div>
              <p style={styles.statLabel}>
                Total Events
              </p>

              <h2 style={styles.statValue}>
                {summary.total_events || 0}
              </h2>
            </div>
          </div>

          <div style={styles.statCard}>
            <div style={styles.statIcon}>
              🎟️
            </div>

            <div>
              <p style={styles.statLabel}>
                Registrations
              </p>

              <h2 style={styles.statValue}>
                {summary.total_registered ||
                  0}
              </h2>
            </div>
          </div>

          <div style={styles.statCard}>
            <div style={styles.statIcon}>
              ⚠️
            </div>

            <div>
              <p style={styles.statLabel}>
                Active Conflicts
              </p>

              <h2 style={styles.statValue}>
                {summary.current_conflict_count ||
                  0}
              </h2>
            </div>
          </div>

          <div style={styles.statCard}>
            <div style={styles.statIcon}>
              💰
            </div>

            <div>
              <p style={styles.statLabel}>
                Budget Used
              </p>

              <h2 style={styles.statValue}>
                {summary.budget_utilization ||
                  0}
                %
              </h2>
            </div>
          </div>

        </div>

        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>
            Budget Overview
          </h2>

          <div style={styles.budgetGrid}>

            <div style={styles.budgetCard}>
              <span>Total Budget</span>

              <strong>
                ₹
                {Number(
                  summary.total_budget || 0
                ).toLocaleString("en-IN")}
              </strong>
            </div>

            <div style={styles.budgetCard}>
              <span>Total Expenses</span>

              <strong>
                ₹
                {Number(
                  summary.total_expenses || 0
                ).toLocaleString("en-IN")}
              </strong>
            </div>

            <div style={styles.budgetCard}>
              <span>Remaining</span>

              <strong>
                ₹
                {Number(
                  summary.remaining_budget || 0
                ).toLocaleString("en-IN")}
              </strong>
            </div>

          </div>
        </div>

        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>
            Attendance
          </h2>

          <div style={styles.attendanceBox}>
            <strong>
              {summary.attendance_rate || 0}%
            </strong>

            <span>
              {summary.total_present || 0} Present
              {" / "}
              {summary.total_expected || 0} Total
            </span>
          </div>
        </div>

        <div style={styles.section}>
          <div style={styles.sectionHeader}>
            <div>
              <h2 style={styles.sectionTitle}>
                Events
              </h2>

              <p style={styles.sectionSubtitle}>
                All scheduled events
              </p>
            </div>

            <span style={styles.countBadge}>
              {events.length} events
            </span>
          </div>

          <div style={styles.eventGrid}>
            {events.map((event) => {
              const eventStatus =
                getEventStatus(event);

              return (
                <div
                  key={event.id}
                  style={styles.eventCard}
                >
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
                        ...styles.availableBadge,
                        background:
                          eventStatus ===
                          "Completed"
                            ? "#e2e8f0"
                            : "#dcfce7",
                        color:
                          eventStatus ===
                          "Completed"
                            ? "#475569"
                            : "#166534",
                      }}
                    >
                      {eventStatus}
                    </span>
                  </div>

                  <h3
                    style={styles.eventName}
                  >
                    {event.name}
                  </h3>

                  <div
                    style={styles.details}
                  >
                    <div
                      style={
                        styles.detailRow
                      }
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
                      style={
                        styles.detailRow
                      }
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
                </div>
              );
            })}
          </div>
        </div>

        <div style={styles.systemStatus}>
          <span>System Status</span>

          <strong>
            {summary.system_status ||
              "All monitored event systems are operating normally."}
          </strong>
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
    margin: "5px 0 0",
    fontSize: "30px",
    color: "#0f172a",
  },

  name: {
    margin: "0 0 5px",
    fontSize: "28px",
    color: "#0f172a",
  },

  subtitle: {
    margin: 0,
    color: "#64748b",
    fontSize: "14px",
  },

  refreshButton: {
    border: "1px solid #dbe2ea",
    background: "#ffffff",
    color: "#334155",
    padding: "10px 16px",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "600",
  },

  statsGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "18px",
    marginBottom: "25px",
  },

  statCard: {
    background: "#ffffff",
    borderRadius: "14px",
    padding: "20px",
    boxShadow:
      "0 4px 18px rgba(15, 23, 42, 0.05)",
    display: "flex",
    alignItems: "center",
    gap: "15px",
  },

  statIcon: {
    width: "45px",
    height: "45px",
    borderRadius: "10px",
    background: "#eff6ff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "21px",
  },

  statLabel: {
    margin: 0,
    color: "#64748b",
    fontSize: "13px",
  },

  statValue: {
    margin: "4px 0",
    color: "#0f172a",
    fontSize: "25px",
  },

  statDescription: {
    margin: 0,
    color: "#94a3b8",
    fontSize: "11px",
  },

  quickGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(280px, 1fr))",
    gap: "18px",
    marginBottom: "25px",
  },

  quickCard: {
    background: "#ffffff",
    borderRadius: "14px",
    padding: "20px",
    display: "flex",
    alignItems: "center",
    gap: "15px",
    cursor: "pointer",
    boxShadow:
      "0 4px 18px rgba(15, 23, 42, 0.05)",
  },

  quickIcon: {
    width: "45px",
    height: "45px",
    borderRadius: "10px",
    background: "#eff6ff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "20px",
  },

  section: {
    background: "#ffffff",
    borderRadius: "16px",
    padding: "25px",
    marginBottom: "25px",
    boxShadow:
      "0 4px 18px rgba(15, 23, 42, 0.05)",
  },

  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "20px",
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

  countBadge: {
    background: "#eff6ff",
    color: "#2563eb",
    padding: "6px 10px",
    borderRadius: "20px",
    fontSize: "12px",
    fontWeight: "600",
  },

  emptyState: {
    textAlign: "center",
    padding: "45px 20px",
    color: "#64748b",
  },

  emptyIcon: {
    fontSize: "40px",
    marginBottom: "10px",
  },

  registrationList: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },

  registrationCard: {
    border: "1px solid #e2e8f0",
    borderRadius: "12px",
    padding: "16px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "15px",
  },

  registrationTitle: {
    margin: "0 0 5px",
    fontSize: "16px",
    color: "#0f172a",
  },

  registrationInfo: {
    margin: 0,
    color: "#64748b",
    fontSize: "13px",
  },

  registrationStatus: {
    display: "flex",
    gap: "8px",
    alignItems: "center",
    flexWrap: "wrap",
    justifyContent: "flex-end",
  },

  statusBadge: {
    padding: "5px 9px",
    borderRadius: "20px",
    fontSize: "11px",
    fontWeight: "600",
  },

  attendanceBadge: {
    background: "#f1f5f9",
    color: "#475569",
    padding: "5px 9px",
    borderRadius: "20px",
    fontSize: "11px",
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

  availableBadge: {
    background: "#dcfce7",
    color: "#166534",
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

  budgetGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(200px, 1fr))",
    gap: "15px",
    marginTop: "18px",
  },

  budgetCard: {
    background: "#f8fafc",
    borderRadius: "10px",
    padding: "18px",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },

  attendanceBox: {
    marginTop: "18px",
    background: "#f8fafc",
    borderRadius: "10px",
    padding: "20px",
    display: "flex",
    flexDirection: "column",
    gap: "5px",
  },

  systemStatus: {
    background: "#ffffff",
    borderRadius: "14px",
    padding: "20px",
    boxShadow:
      "0 4px 18px rgba(15, 23, 42, 0.05)",
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },

  loading: {
    minHeight: "70vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    color: "#64748b",
  },

  spinner: {
    width: "30px",
    height: "30px",
    border: "3px solid #e2e8f0",
    borderTop: "3px solid #2563eb",
    borderRadius: "50%",
    marginBottom: "15px",
  },
};

export default Dashboard;