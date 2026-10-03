import { useEffect, useMemo, useState } from "react";

function Allocations() {
  const [events, setEvents] = useState([]);
  const [resources, setResources] = useState([]);
  const [allocations, setAllocations] = useState([]);

  const [form, setForm] = useState({
    event_id: "",
    resource_id: "",
    quantity: "",
    start_time: "",
    end_time: "",
  });

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const loadEvents = async () => {
    try {
      const response = await fetch(
        "http://localhost:8000/api/events/",
        {
          credentials: "include",
        }
      );

      const data = await response.json();

      if (response.ok) {
        setEvents(data.events || []);
      } else {
        setError(data.message || "Could not load events");
      }
    } catch (error) {
      setError("Could not load events");
    }
  };

  const loadResources = async () => {
    try {
      const response = await fetch(
        "http://localhost:8000/api/resources/",
        {
          credentials: "include",
        }
      );

      const data = await response.json();

      if (response.ok) {
        setResources(data.resources || []);
      } else {
        setError(
          data.message || "Could not load resources"
        );
      }
    } catch (error) {
      setError("Could not load resources");
    }
  };

  const loadAllocations = async () => {
    try {
      setLoading(true);

      const response = await fetch(
        "http://localhost:8000/api/allocations/",
        {
          credentials: "include",
        }
      );

      const data = await response.json();

      if (response.ok) {
        setAllocations(data.allocations || []);
      } else {
        setError(
          data.message || "Could not load allocations"
        );
      }
    } catch (error) {
      setError("Could not load allocations");
    } finally {
      setLoading(false);
    }
  };

  const loadAllData = async () => {
    setMessage("");
    setError("");

    await Promise.all([
      loadEvents(),
      loadResources(),
      loadAllocations(),
    ]);
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const handleChange = (event) => {
    setForm({
      ...form,
      [event.target.name]: event.target.value,
    });
  };

  const createAllocation = async (event) => {
    event.preventDefault();

    setMessage("");
    setError("");

    if (!form.event_id) {
      setError("Please select an event");
      return;
    }

    if (!form.resource_id) {
      setError("Please select a resource");
      return;
    }

    if (!form.quantity || Number(form.quantity) <= 0) {
      setError("Quantity must be greater than 0");
      return;
    }

    if (!form.start_time || !form.end_time) {
      setError("Start time and end time are required");
      return;
    }

    if (form.start_time >= form.end_time) {
      setError("End time must be after start time");
      return;
    }

    try {
      const response = await fetch(
        "http://localhost:8000/api/allocations/",
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            event_id: Number(form.event_id),
            resource_id: Number(form.resource_id),
            quantity: Number(form.quantity),
            start_time: form.start_time,
            end_time: form.end_time,
          }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        setMessage(
          "Resource allocated successfully"
        );

        setForm({
          event_id: "",
          resource_id: "",
          quantity: "",
          start_time: "",
          end_time: "",
        });

        loadAllocations();
        loadResources();
      } else {
        setError(
          data.message || "Could not create allocation"
        );
      }
    } catch (error) {
      setError("Could not connect to Django");
    }
  };

  const deleteAllocation = async (allocationId) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this allocation?"
    );

    if (!confirmed) {
      return;
    }

    setMessage("");
    setError("");

    try {
      const response = await fetch(
        `http://localhost:8000/api/allocations/${allocationId}/`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      const data = await response.json();

      if (response.ok) {
        setMessage(
          "Allocation deleted successfully"
        );

        loadAllocations();
        loadResources();
      } else {
        setError(
          data.message ||
            "Could not delete allocation"
        );
      }
    } catch (error) {
      setError("Could not connect to Django");
    }
  };

  const getEventName = (eventId) => {
    const event = events.find(
      (item) => item.id === eventId
    );

    return event
      ? event.name
      : `Event ${eventId}`;
  };

  const getEventDate = (eventId) => {
    const event = events.find(
      (item) => item.id === eventId
    );

    return event?.date || "";
  };

  const getResourceName = (resourceId) => {
    const resource = resources.find(
      (item) => item.id === resourceId
    );

    return resource
      ? resource.name
      : `Resource ${resourceId}`;
  };

  const getResource = (resourceId) => {
    return resources.find(
      (item) => item.id === resourceId
    );
  };

  const filteredAllocations = useMemo(() => {
    const searchText = search.toLowerCase().trim();

    if (!searchText) {
      return allocations;
    }

    return allocations.filter((allocation) => {
      const eventName = getEventName(
        allocation.event_id
      ).toLowerCase();

      const resourceName = getResourceName(
        allocation.resource_id
      ).toLowerCase();

      return (
        eventName.includes(searchText) ||
        resourceName.includes(searchText)
      );
    });
  }, [allocations, events, resources, search]);

  const totalAllocations = allocations.length;

  const totalAllocatedQuantity = allocations.reduce(
    (sum, allocation) =>
      sum + Number(allocation.quantity || 0),
    0
  );

  const resourceTypesUsed = new Set(
    allocations.map(
      (allocation) => allocation.resource_id
    )
  ).size;

  const eventTypesUsed = new Set(
    allocations.map(
      (allocation) => allocation.event_id
    )
  ).size;

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <p style={styles.eyebrow}>
            RESOURCE COORDINATION
          </p>

          <h1 style={styles.title}>
            Resource Allocations
          </h1>

          <p style={styles.subtitle}>
            Assign resources to events while tracking
            quantities and schedules.
          </p>
        </div>
      </div>

      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div
            style={{
              ...styles.statIcon,
              background: "#eff6ff",
            }}
          >
            📌
          </div>

          <div>
            <p style={styles.statLabel}>
              Total Allocations
            </p>

            <h2 style={styles.statValue}>
              {totalAllocations}
            </h2>
          </div>
        </div>

        <div style={styles.statCard}>
          <div
            style={{
              ...styles.statIcon,
              background: "#ecfdf5",
            }}
          >
            📦
          </div>

          <div>
            <p style={styles.statLabel}>
              Quantity Allocated
            </p>

            <h2 style={styles.statValue}>
              {totalAllocatedQuantity}
            </h2>
          </div>
        </div>

        <div style={styles.statCard}>
          <div
            style={{
              ...styles.statIcon,
              background: "#fff7ed",
            }}
          >
            🗂️
          </div>

          <div>
            <p style={styles.statLabel}>
              Resources Used
            </p>

            <h2 style={styles.statValue}>
              {resourceTypesUsed}
            </h2>
          </div>
        </div>

        <div style={styles.statCard}>
          <div
            style={{
              ...styles.statIcon,
              background: "#f5f3ff",
            }}
          >
            🎯
          </div>

          <div>
            <p style={styles.statLabel}>
              Events Using Resources
            </p>

            <h2 style={styles.statValue}>
              {eventTypesUsed}
            </h2>
          </div>
        </div>
      </div>

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

      <div style={styles.formCard}>
        <div style={styles.formHeader}>
          <div>
            <h2 style={styles.sectionTitle}>
              Allocate Resource
            </h2>

            <p style={styles.sectionSubtitle}>
              Select an event, resource, quantity, and
              time period.
            </p>
          </div>

          <div style={styles.infoBadge}>
            Conflict checking enabled
          </div>
        </div>

        <form onSubmit={createAllocation}>
          <div style={styles.formGrid}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>
                Event
              </label>

              <select
                name="event_id"
                value={form.event_id}
                onChange={handleChange}
                style={styles.input}
                required
              >
                <option value="">
                  Select Event
                </option>

                {events.map((event) => (
                  <option
                    key={event.id}
                    value={event.id}
                  >
                    {event.name} - {event.date}
                  </option>
                ))}
              </select>
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>
                Resource
              </label>

              <select
                name="resource_id"
                value={form.resource_id}
                onChange={handleChange}
                style={styles.input}
                required
              >
                <option value="">
                  Select Resource
                </option>

                {resources.map((resource) => (
                  <option
                    key={resource.id}
                    value={resource.id}
                  >
                    {resource.name} — Available:{" "}
                    {resource.available}
                  </option>
                ))}
              </select>
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>
                Quantity
              </label>

              <input
                type="number"
                name="quantity"
                value={form.quantity}
                onChange={handleChange}
                min="1"
                placeholder="Example: 5"
                style={styles.input}
                required
              />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>
                Start Time
              </label>

              <input
                type="time"
                name="start_time"
                value={form.start_time}
                onChange={handleChange}
                style={styles.input}
                required
              />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>
                End Time
              </label>

              <input
                type="time"
                name="end_time"
                value={form.end_time}
                onChange={handleChange}
                style={styles.input}
                required
              />
            </div>
          </div>

          {form.resource_id && (
            <div style={styles.selectedResource}>
              <div>
                <span style={styles.selectedLabel}>
                  Selected Resource
                </span>

                <strong>
                  {getResourceName(
                    Number(form.resource_id)
                  )}
                </strong>
              </div>

              <div>
                <span style={styles.selectedLabel}>
                  Available
                </span>

                <strong>
                  {getResource(
                    Number(form.resource_id)
                  )?.available ?? 0}
                </strong>
              </div>

              <div>
                <span style={styles.selectedLabel}>
                  Total
                </span>

                <strong>
                  {getResource(
                    Number(form.resource_id)
                  )?.quantity ?? 0}
                </strong>
              </div>
            </div>
          )}

          <div style={styles.formActions}>
            <button
              type="submit"
              style={styles.primaryButton}
            >
              + Allocate Resource
            </button>
          </div>
        </form>
      </div>

      <div style={styles.listHeader}>
        <div>
          <h2 style={styles.sectionTitle}>
            Current Allocations
          </h2>

          <p style={styles.sectionSubtitle}>
            Resources currently assigned to events.
          </p>
        </div>

        <div style={styles.searchBox}>
          <span>🔎</span>

          <input
            type="text"
            placeholder="Search event or resource..."
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            style={styles.searchInput}
          />
        </div>
      </div>

      {loading ? (
        <div style={styles.emptyCard}>
          <div style={styles.emptyIcon}>
            ⏳
          </div>

          <h3>Loading allocations...</h3>

          <p>
            Please wait while allocation data is
            loaded.
          </p>
        </div>
      ) : filteredAllocations.length === 0 ? (
        <div style={styles.emptyCard}>
          <div style={styles.emptyIcon}>
            📦
          </div>

          <h3>
            {search
              ? "No matching allocations"
              : "No allocations found"}
          </h3>

          <p>
            {search
              ? "Try a different search term."
              : "Create an allocation using the form above."}
          </p>
        </div>
      ) : (
        <div style={styles.allocationGrid}>
          {filteredAllocations.map((allocation) => {
            const resource = getResource(
              allocation.resource_id
            );

            return (
              <div
                key={allocation.id}
                style={styles.allocationCard}
              >
                <div style={styles.cardTop}>
                  <div style={styles.resourceIcon}>
                    📦
                  </div>

                  <span style={styles.allocationBadge}>
                    Allocated
                  </span>
                </div>

                <h3 style={styles.resourceName}>
                  {getResourceName(
                    allocation.resource_id
                  )}
                </h3>

                <div style={styles.eventBox}>
                  <span style={styles.eventIcon}>
                    🎯
                  </span>

                  <div>
                    <p style={styles.detailLabel}>
                      Event
                    </p>

                    <p style={styles.eventName}>
                      {getEventName(
                        allocation.event_id
                      )}
                    </p>

                    {getEventDate(
                      allocation.event_id
                    ) && (
                      <p style={styles.eventDate}>
                        📅{" "}
                        {getEventDate(
                          allocation.event_id
                        )}
                      </p>
                    )}
                  </div>
                </div>

                <div style={styles.detailsGrid}>
                  <div style={styles.detailBox}>
                    <span style={styles.detailLabel}>
                      Quantity
                    </span>

                    <strong
                      style={styles.quantityValue}
                    >
                      {allocation.quantity}
                    </strong>
                  </div>

                  <div style={styles.detailBox}>
                    <span style={styles.detailLabel}>
                      Available
                    </span>

                    <strong
                      style={styles.availableValue}
                    >
                      {resource?.available ?? "—"}
                    </strong>
                  </div>
                </div>

                <div style={styles.timeBox}>
                  <span>🕐</span>

                  <div>
                    <p style={styles.detailLabel}>
                      Allocation Time
                    </p>

                    <strong>
                      {allocation.start_time ||
                        "Not specified"}{" "}
                      –{" "}
                      {allocation.end_time ||
                        "Not specified"}
                    </strong>
                  </div>
                </div>

                <button
                  onClick={() =>
                    deleteAllocation(
                      allocation.id
                    )
                  }
                  style={styles.deleteButton}
                >
                  🗑 Delete Allocation
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const styles = {
  page: {
    marginLeft: "250px",
    minHeight: "100vh",
    background: "#f8fafc",
    padding: "36px 40px 60px",
    boxSizing: "border-box",
    fontFamily:
      "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    color: "#0f172a",
  },

  header: {
    marginBottom: "28px",
  },

  eyebrow: {
    margin: "0 0 6px",
    fontSize: "12px",
    fontWeight: "700",
    letterSpacing: "1.5px",
    color: "#2563eb",
  },

  title: {
    margin: "0",
    fontSize: "32px",
    fontWeight: "750",
    letterSpacing: "-0.7px",
  },

  subtitle: {
    margin: "8px 0 0",
    color: "#64748b",
    fontSize: "15px",
  },

  statsGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(190px, 1fr))",
    gap: "16px",
    marginBottom: "24px",
  },

  statCard: {
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "16px",
    padding: "20px",
    display: "flex",
    alignItems: "center",
    gap: "15px",
    boxShadow:
      "0 2px 8px rgba(15, 23, 42, 0.04)",
  },

  statIcon: {
    width: "46px",
    height: "46px",
    borderRadius: "12px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "21px",
  },

  statLabel: {
    margin: "0 0 4px",
    fontSize: "12px",
    color: "#64748b",
    fontWeight: "600",
  },

  statValue: {
    margin: "0",
    fontSize: "24px",
    fontWeight: "750",
  },

  successMessage: {
    padding: "13px 16px",
    background: "#ecfdf5",
    border: "1px solid #a7f3d0",
    color: "#047857",
    borderRadius: "10px",
    marginBottom: "18px",
    fontSize: "14px",
    fontWeight: "600",
  },

  errorMessage: {
    padding: "13px 16px",
    background: "#fef2f2",
    border: "1px solid #fecaca",
    color: "#b91c1c",
    borderRadius: "10px",
    marginBottom: "18px",
    fontSize: "14px",
    fontWeight: "600",
  },

  formCard: {
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "18px",
    padding: "26px",
    marginBottom: "32px",
    boxShadow:
      "0 2px 8px rgba(15, 23, 42, 0.04)",
  },

  formHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "20px",
    marginBottom: "22px",
  },

  sectionTitle: {
    margin: "0",
    fontSize: "20px",
    fontWeight: "700",
  },

  sectionSubtitle: {
    margin: "6px 0 0",
    color: "#64748b",
    fontSize: "13px",
  },

  infoBadge: {
    background: "#eff6ff",
    color: "#2563eb",
    padding: "7px 11px",
    borderRadius: "999px",
    fontSize: "11px",
    fontWeight: "700",
    whiteSpace: "nowrap",
  },

  formGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(210px, 1fr))",
    gap: "18px",
  },

  inputGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },

  label: {
    fontSize: "13px",
    fontWeight: "650",
    color: "#334155",
  },

  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: "12px 14px",
    border: "1px solid #cbd5e1",
    borderRadius: "10px",
    fontSize: "14px",
    outline: "none",
    background: "#ffffff",
    color: "#0f172a",
  },

  selectedResource: {
    marginTop: "20px",
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: "12px",
    padding: "14px 16px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "20px",
    flexWrap: "wrap",
  },

  selectedLabel: {
    display: "block",
    fontSize: "10px",
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    fontWeight: "700",
    marginBottom: "4px",
  },

  formActions: {
    marginTop: "20px",
  },

  primaryButton: {
    border: "none",
    background: "#2563eb",
    color: "#ffffff",
    padding: "11px 18px",
    borderRadius: "9px",
    fontSize: "14px",
    fontWeight: "650",
    cursor: "pointer",
  },

  listHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "20px",
    marginBottom: "18px",
  },

  searchBox: {
    width: "280px",
    display: "flex",
    alignItems: "center",
    gap: "9px",
    background: "#ffffff",
    border: "1px solid #cbd5e1",
    borderRadius: "10px",
    padding: "9px 12px",
    boxSizing: "border-box",
  },

  searchInput: {
    border: "none",
    outline: "none",
    width: "100%",
    fontSize: "13px",
    background: "transparent",
  },

  allocationGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(310px, 1fr))",
    gap: "18px",
  },

  allocationCard: {
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "17px",
    padding: "21px",
    boxShadow:
      "0 2px 8px rgba(15, 23, 42, 0.04)",
  },

  cardTop: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "15px",
  },

  resourceIcon: {
    width: "44px",
    height: "44px",
    borderRadius: "12px",
    background: "#eff6ff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "20px",
  },

  allocationBadge: {
    background: "#dcfce7",
    color: "#166534",
    padding: "6px 9px",
    borderRadius: "999px",
    fontSize: "11px",
    fontWeight: "700",
  },

  resourceName: {
    margin: "0 0 17px",
    fontSize: "18px",
    fontWeight: "700",
  },

  eventBox: {
    display: "flex",
    alignItems: "flex-start",
    gap: "11px",
    background: "#f8fafc",
    borderRadius: "12px",
    padding: "13px",
    marginBottom: "14px",
  },

  eventIcon: {
    fontSize: "18px",
  },

  detailLabel: {
    margin: "0 0 4px",
    fontSize: "10px",
    color: "#64748b",
    textTransform: "uppercase",
    fontWeight: "700",
    letterSpacing: "0.5px",
  },

  eventName: {
    margin: "0",
    fontSize: "14px",
    fontWeight: "700",
    color: "#0f172a",
  },

  eventDate: {
    margin: "4px 0 0",
    fontSize: "11px",
    color: "#64748b",
  },

  detailsGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "10px",
    marginBottom: "12px",
  },

  detailBox: {
    background: "#f8fafc",
    borderRadius: "11px",
    padding: "12px",
  },

  quantityValue: {
    fontSize: "20px",
    color: "#2563eb",
  },

  availableValue: {
    fontSize: "20px",
    color: "#16a34a",
  },

  timeBox: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    background: "#f8fafc",
    borderRadius: "11px",
    padding: "12px",
    marginBottom: "16px",
  },

  deleteButton: {
    width: "100%",
    border: "1px solid #fecaca",
    background: "#fef2f2",
    color: "#dc2626",
    padding: "9px",
    borderRadius: "9px",
    fontSize: "13px",
    fontWeight: "650",
    cursor: "pointer",
  },

  emptyCard: {
    background: "#ffffff",
    border: "1px dashed #cbd5e1",
    borderRadius: "17px",
    padding: "55px 20px",
    textAlign: "center",
    color: "#64748b",
  },

  emptyIcon: {
    fontSize: "38px",
    marginBottom: "10px",
  },
};

export default Allocations;