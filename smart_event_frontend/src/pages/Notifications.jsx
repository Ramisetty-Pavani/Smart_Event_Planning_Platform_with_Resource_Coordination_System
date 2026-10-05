import API_URL from "../api";
import { useEffect, useState } from "react";

function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState(null);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `${API_URL}/api/notifications/`,
        {
          credentials: "include",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to load notifications"
        );
      }

      setNotifications(data.notifications || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const markAsRead = async (notificationId) => {
    try {
      setUpdatingId(notificationId);

      const response = await fetch(
        `${API_URL}/api/notifications/`,
        {
          method: "PUT",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id: notificationId,
            status: "Read",
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to mark as read"
        );
      }

      setNotifications((current) =>
        current.map((notification) =>
          notification.id === notificationId
            ? {
                ...notification,
                status: "Read",
              }
            : notification
        )
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setUpdatingId(null);
    }
  };

  const getNotificationDetails = (type) => {
    const details = {
      Registration: {
        icon: "📝",
        color: "#2563eb",
        background: "#eff6ff",
      },
      Attendance: {
        icon: "✓",
        color: "#16a34a",
        background: "#f0fdf4",
      },
      Event: {
        icon: "📅",
        color: "#7c3aed",
        background: "#f5f3ff",
      },
      Resource: {
        icon: "📦",
        color: "#0891b2",
        background: "#ecfeff",
      },
      Vendor: {
        icon: "🏢",
        color: "#ea580c",
        background: "#fff7ed",
      },
      Budget: {
        icon: "₹",
        color: "#ca8a04",
        background: "#fefce8",
      },
      Approval: {
        icon: "✓",
        color: "#db2777",
        background: "#fdf2f8",
      },
      General: {
        icon: "🔔",
        color: "#475569",
        background: "#f8fafc",
      },
    };

    return (
      details[type] || {
        icon: "🔔",
        color: "#475569",
        background: "#f8fafc",
      }
    );
  };

  const unreadCount = notifications.filter(
    (notification) => notification.status === "Unread"
  ).length;

  const readCount =
    notifications.length - unreadCount;

  return (
    <div
      style={{
        minHeight: "100%",
        padding: "30px",
        background: "#f8fafc",
      }}
    >
      {/* HEADER */}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "28px",
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: "30px",
              color: "#111827",
            }}
          >
            Notifications
          </h1>

          <p
            style={{
              margin: "6px 0 0",
              color: "#64748b",
            }}
          >
            Stay updated with your event activities
          </p>
        </div>

        <button
          onClick={fetchNotifications}
          style={{
            border: "none",
            borderRadius: "10px",
            padding: "11px 18px",
            background: "#111827",
            color: "#ffffff",
            cursor: "pointer",
            fontWeight: "600",
          }}
        >
          ↻ Refresh
        </button>
      </div>

      {/* SUMMARY */}

      {!loading && !error && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "16px",
            marginBottom: "28px",
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "15px",
              padding: "18px",
              border: "1px solid #e2e8f0",
            }}
          >
            <div style={{ color: "#64748b" }}>
              Total
            </div>

            <strong
              style={{
                fontSize: "25px",
                color: "#111827",
              }}
            >
              {notifications.length}
            </strong>
          </div>

          <div
            style={{
              background: "#ffffff",
              borderRadius: "15px",
              padding: "18px",
              border: "1px solid #e2e8f0",
            }}
          >
            <div style={{ color: "#64748b" }}>
              Unread
            </div>

            <strong
              style={{
                fontSize: "25px",
                color: "#ea580c",
              }}
            >
              {unreadCount}
            </strong>
          </div>

          <div
            style={{
              background: "#ffffff",
              borderRadius: "15px",
              padding: "18px",
              border: "1px solid #e2e8f0",
            }}
          >
            <div style={{ color: "#64748b" }}>
              Read
            </div>

            <strong
              style={{
                fontSize: "25px",
                color: "#16a34a",
              }}
            >
              {readCount}
            </strong>
          </div>
        </div>
      )}

      {/* ERROR */}

      {error && (
        <div
          style={{
            background: "#fef2f2",
            color: "#991b1b",
            padding: "15px",
            borderRadius: "12px",
            marginBottom: "20px",
          }}
        >
          {error}
        </div>
      )}

      {/* LOADING */}

      {loading && (
        <div
          style={{
            background: "#ffffff",
            padding: "50px",
            textAlign: "center",
            borderRadius: "15px",
          }}
        >
          Loading notifications...
        </div>
      )}

      {/* EMPTY */}

      {!loading &&
        !error &&
        notifications.length === 0 && (
          <div
            style={{
              background: "#ffffff",
              padding: "60px",
              textAlign: "center",
              borderRadius: "15px",
            }}
          >
            <div style={{ fontSize: "45px" }}>
              🔕
            </div>

            <h3>You're all caught up</h3>

            <p style={{ color: "#64748b" }}>
              New notifications will appear here.
            </p>
          </div>
        )}

      {/* NOTIFICATIONS */}

      {!loading &&
        !error &&
        notifications.length > 0 && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "15px",
            }}
          >
            {notifications.map((notification) => {
              const isUnread =
                notification.status === "Unread";

              const details =
                getNotificationDetails(
                  notification.notification_type
                );

              return (
                <div
                  key={notification.id}
                  style={{
                    background: "#ffffff",
                    borderRadius: "16px",
                    padding: "20px",
                    border: isUnread
                      ? `1px solid ${details.color}`
                      : "1px solid #e2e8f0",
                    boxShadow:
                      "0 3px 12px rgba(15,23,42,0.05)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      gap: "16px",
                    }}
                  >
                    {/* ICON */}

                    <div
                      style={{
                        width: "50px",
                        height: "50px",
                        borderRadius: "14px",
                        background:
                          details.background,
                        color: details.color,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "22px",
                        flexShrink: 0,
                      }}
                    >
                      {details.icon}
                    </div>

                    {/* CONTENT */}

                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent:
                            "space-between",
                          alignItems: "center",
                          marginBottom: "8px",
                        }}
                      >
                        <span
                          style={{
                            color: details.color,
                            fontWeight: "700",
                            fontSize: "12px",
                            textTransform:
                              "uppercase",
                          }}
                        >
                          {
                            notification.notification_type
                          }
                        </span>

                        <span
                          style={{
                            color: isUnread
                              ? "#ea580c"
                              : "#16a34a",
                            fontSize: "12px",
                            fontWeight: "600",
                          }}
                        >
                          {isUnread
                            ? "● Unread"
                            : "✓ Read"}
                        </span>
                      </div>

                      <h3
                        style={{
                          margin: "0 0 10px",
                          color: "#1e293b",
                        }}
                      >
                        {
                          notification.notification_type
                        }{" "}
                        Notification
                      </h3>

                      {/* EVENT NAME */}

                      <div
                        style={{
                          display: "inline-block",
                          background: "#f1f5f9",
                          color: "#334155",
                          padding: "7px 12px",
                          borderRadius: "8px",
                          fontSize: "13px",
                          fontWeight: "600",
                          marginBottom: "12px",
                        }}
                      >
                        📅{" "}
                        {notification.event_name ||
                          "Unknown Event"}
                      </div>

                      <p
                        style={{
                          margin: "0 0 15px",
                          color: "#475569",
                          lineHeight: "1.6",
                        }}
                      >
                        {notification.message}
                      </p>

                      <div
                        style={{
                          borderTop:
                            "1px solid #f1f5f9",
                          paddingTop: "13px",
                          display: "flex",
                          justifyContent:
                            "flex-end",
                        }}
                      >
                        {isUnread ? (
                          <button
                            onClick={() =>
                              markAsRead(
                                notification.id
                              )
                            }
                            disabled={
                              updatingId ===
                              notification.id
                            }
                            style={{
                              border: "none",
                              borderRadius: "8px",
                              padding:
                                "8px 14px",
                              background:
                                details.color,
                              color: "#ffffff",
                              cursor: "pointer",
                              fontWeight: "600",
                            }}
                          >
                            {updatingId ===
                            notification.id
                              ? "Saving..."
                              : "✓ Mark as Read"}
                          </button>
                        ) : (
                          <span
                            style={{
                              color: "#16a34a",
                              fontWeight: "600",
                              fontSize: "13px",
                            }}
                          >
                            ✓ Read
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
    </div>
  );
}

export default Notifications;
