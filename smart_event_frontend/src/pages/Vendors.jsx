import { useEffect, useMemo, useState } from "react";

function Vendors() {
  const [vendors, setVendors] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState("");

  const [form, setForm] = useState({
    event_id: "",
    name: "",
    company: "",
    service: "",
    cost: "",
    status: "Pending",
  });

  const API_URL =
    "http://localhost:8000/api/vendors/";

  const EVENTS_URL =
    "http://localhost:8000/api/events/";

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError("");

    try {
      const [vendorsResponse, eventsResponse] =
        await Promise.all([
          fetch(API_URL, {
            credentials: "include",
          }),
          fetch(EVENTS_URL, {
            credentials: "include",
          }),
        ]);

      const vendorsText =
        await vendorsResponse.text();

      const eventsText =
        await eventsResponse.text();

      let vendorsData;
      let eventsData;

      try {
        vendorsData = JSON.parse(vendorsText);
      } catch {
        throw new Error(
          "Invalid response received from vendors API"
        );
      }

      try {
        eventsData = JSON.parse(eventsText);
      } catch {
        throw new Error(
          "Invalid response received from events API"
        );
      }

      if (!vendorsResponse.ok) {
        throw new Error(
          vendorsData.message ||
            "Could not load vendors"
        );
      }

      if (!eventsResponse.ok) {
        throw new Error(
          eventsData.message ||
            "Could not load events"
        );
      }

      setVendors(vendorsData.vendors || []);

      setEvents(
        Array.isArray(eventsData)
          ? eventsData
          : eventsData.events || []
      );
    } catch (err) {
      setError(
        err.message ||
          "Could not connect to Django"
      );
    } finally {
      setLoading(false);
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

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const resetForm = () => {
    setForm({
      event_id: "",
      name: "",
      company: "",
      service: "",
      cost: "",
      status: "Pending",
    });

    setEditingId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setMessage("");
    setError("");

    if (!form.event_id) {
      setError("Please select an event");
      return;
    }

    if (!form.name.trim()) {
      setError("Please enter vendor name");
      return;
    }

    if (!form.company.trim()) {
      setError("Please enter vendor company");
      return;
    }

    if (!form.service.trim()) {
      setError("Please enter vendor service");
      return;
    }

    if (!form.cost || Number(form.cost) <= 0) {
      setError("Cost must be greater than 0");
      return;
    }

    const payload = {
      event_id: Number(form.event_id),
      name: form.name.trim(),
      company: form.company.trim(),
      service: form.service.trim(),
      cost: Number(form.cost),
      status: form.status,
    };

    if (editingId !== null) {
      payload.id = editingId;
    }

    try {
      const response = await fetch(API_URL, {
        method:
          editingId !== null ? "PUT" : "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const responseText =
        await response.text();

      let data;

      try {
        data = JSON.parse(responseText);
      } catch {
        throw new Error(
          `Django returned an invalid response. Status: ${response.status}`
        );
      }

      if (!response.ok) {
        throw new Error(
          data.message ||
            `Request failed with status ${response.status}`
        );
      }

      setMessage(
        editingId !== null
          ? "Vendor updated successfully"
          : "Vendor created successfully"
      );

      resetForm();

      await loadData();
    } catch (err) {
      setError(
        err.message ||
          "Could not connect to Django"
      );
    }
  };

  const handleEdit = (vendor) => {
    setEditingId(vendor.id);

    setForm({
      event_id: String(vendor.event_id),
      name: vendor.name,
      company: vendor.company,
      service: vendor.service,
      cost: String(vendor.cost),
      status: vendor.status,
    });

    setMessage("");
    setError("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const handleDelete = async (id) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this vendor?"
    );

    if (!confirmed) {
      return;
    }

    setMessage("");
    setError("");

    try {
      const response = await fetch(API_URL, {
        method: "DELETE",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: id,
        }),
      });

      const responseText =
        await response.text();

      let data;

      try {
        data = JSON.parse(responseText);
      } catch {
        throw new Error(
          `Django returned an invalid response. Status: ${response.status}`
        );
      }

      if (!response.ok) {
        throw new Error(
          data.message ||
            `Delete failed with status ${response.status}`
        );
      }

      setMessage(
        data.message ||
          "Vendor deleted successfully"
      );

      if (editingId === id) {
        resetForm();
      }

      await loadData();
    } catch (err) {
      setError(
        err.message ||
          "Could not connect to Django"
      );
    }
  };

  const filteredVendors = useMemo(() => {
    const searchText =
      search.toLowerCase().trim();

    if (!searchText) {
      return vendors;
    }

    return vendors.filter((vendor) => {
      const eventName =
        getEventName(
          vendor.event_id
        ).toLowerCase();

      return (
        vendor.name
          .toLowerCase()
          .includes(searchText) ||
        vendor.company
          .toLowerCase()
          .includes(searchText) ||
        vendor.service
          .toLowerCase()
          .includes(searchText) ||
        vendor.status
          .toLowerCase()
          .includes(searchText) ||
        eventName.includes(searchText)
      );
    });
  }, [vendors, events, search]);

  const totalVendors = vendors.length;

  const confirmedVendors = vendors.filter(
    (vendor) =>
      vendor.status === "Confirmed"
  ).length;

  const pendingVendors = vendors.filter(
    (vendor) =>
      vendor.status === "Pending"
  ).length;

  const totalCost = vendors.reduce(
    (sum, vendor) =>
      sum + Number(vendor.cost || 0),
    0
  );

  const getStatusStyle = (status) => {
    if (status === "Confirmed") {
      return {
        background: "#dcfce7",
        color: "#166534",
      };
    }

    if (status === "Completed") {
      return {
        background: "#dbeafe",
        color: "#1d4ed8",
      };
    }

    if (status === "Cancelled") {
      return {
        background: "#fee2e2",
        color: "#b91c1c",
      };
    }

    return {
      background: "#fef3c7",
      color: "#92400e",
    };
  };

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <p style={styles.eyebrow}>
            VENDOR MANAGEMENT
          </p>

          <h1 style={styles.title}>
            Vendors
          </h1>

          <p style={styles.subtitle}>
            Manage external service providers,
            costs, assignments, and vendor status.
          </p>
        </div>

        <button
          onClick={loadData}
          style={styles.refreshButton}
        >
          ↻ Refresh
        </button>
      </div>

      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div
            style={{
              ...styles.statIcon,
              background: "#eff6ff",
            }}
          >
            🏢
          </div>

          <div>
            <p style={styles.statLabel}>
              Total Vendors
            </p>

            <h2 style={styles.statValue}>
              {totalVendors}
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
            ✓
          </div>

          <div>
            <p style={styles.statLabel}>
              Confirmed
            </p>

            <h2 style={styles.statValue}>
              {confirmedVendors}
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
            ⏳
          </div>

          <div>
            <p style={styles.statLabel}>
              Pending
            </p>

            <h2 style={styles.statValue}>
              {pendingVendors}
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
            ₹
          </div>

          <div>
            <p style={styles.statLabel}>
              Total Vendor Cost
            </p>

            <h2 style={styles.costValue}>
              ₹
              {totalCost.toLocaleString(
                "en-IN"
              )}
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
              {editingId !== null
                ? "Edit Vendor"
                : "Add Vendor"}
            </h2>

            <p style={styles.sectionSubtitle}>
              {editingId !== null
                ? "Update the vendor details below."
                : "Add an external service provider to an event."}
            </p>
          </div>

          {editingId !== null && (
            <span style={styles.editBadge}>
              Editing
            </span>
          )}
        </div>

        <form onSubmit={handleSubmit}>
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
                    {event.name}
                  </option>
                ))}
              </select>
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>
                Vendor Name
              </label>

              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Example: Ravi Kumar"
                style={styles.input}
                required
              />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>
                Company
              </label>

              <input
                type="text"
                name="company"
                value={form.company}
                onChange={handleChange}
                placeholder="Example: ABC Events"
                style={styles.input}
                required
              />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>
                Service
              </label>

              <input
                type="text"
                name="service"
                value={form.service}
                onChange={handleChange}
                placeholder="Catering / Decoration"
                style={styles.input}
                required
              />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>
                Cost
              </label>

              <input
                type="number"
                name="cost"
                value={form.cost}
                onChange={handleChange}
                placeholder="Enter cost"
                min="1"
                style={styles.input}
                required
              />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>
                Status
              </label>

              <select
                name="status"
                value={form.status}
                onChange={handleChange}
                style={styles.input}
              >
                <option value="Pending">
                  Pending
                </option>

                <option value="Confirmed">
                  Confirmed
                </option>

                <option value="Completed">
                  Completed
                </option>

                <option value="Cancelled">
                  Cancelled
                </option>
              </select>
            </div>
          </div>

          <div style={styles.formActions}>
            <button
              type="submit"
              style={styles.primaryButton}
            >
              {editingId !== null
                ? "✓ Update Vendor"
                : "+ Add Vendor"}
            </button>

            {editingId !== null && (
              <button
                type="button"
                onClick={resetForm}
                style={styles.cancelButton}
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      <div style={styles.listHeader}>
        <div>
          <h2 style={styles.sectionTitle}>
            Vendor List
          </h2>

          <p style={styles.sectionSubtitle}>
            {filteredVendors.length} vendor
            {filteredVendors.length !== 1
              ? "s"
              : ""}{" "}
            displayed
          </p>
        </div>

        <div style={styles.searchBox}>
          <span>🔎</span>

          <input
            type="text"
            placeholder="Search vendors..."
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

          <h3>Loading vendors...</h3>

          <p>
            Please wait while vendor data is
            loaded.
          </p>
        </div>
      ) : filteredVendors.length === 0 ? (
        <div style={styles.emptyCard}>
          <div style={styles.emptyIcon}>
            🏢
          </div>

          <h3>
            {search
              ? "No matching vendors"
              : "No vendors found"}
          </h3>

          <p>
            {search
              ? "Try a different search term."
              : "Add your first vendor using the form above."}
          </p>
        </div>
      ) : (
        <div style={styles.vendorGrid}>
          {filteredVendors.map((vendor) => {
            const statusStyle =
              getStatusStyle(
                vendor.status
              );

            return (
              <div
                key={vendor.id}
                style={styles.vendorCard}
              >
                <div style={styles.cardTop}>
                  <div style={styles.vendorIcon}>
                    🏢
                  </div>

                  <span
                    style={{
                      ...styles.statusBadge,
                      background:
                        statusStyle.background,
                      color:
                        statusStyle.color,
                    }}
                  >
                    {vendor.status}
                  </span>
                </div>

                <h3 style={styles.companyName}>
                  {vendor.company}
                </h3>

                <p style={styles.vendorName}>
                  {vendor.name}
                </p>

                <div style={styles.infoList}>
                  <div style={styles.infoRow}>
                    <span style={styles.infoIcon}>
                      🎯
                    </span>

                    <div>
                      <p
                        style={
                          styles.infoLabel
                        }
                      >
                        Event
                      </p>

                      <strong>
                        {getEventName(
                          vendor.event_id
                        )}
                      </strong>

                      {getEventDate(
                        vendor.event_id
                      ) && (
                        <p
                          style={
                            styles.eventDate
                          }
                        >
                          📅{" "}
                          {getEventDate(
                            vendor.event_id
                          )}
                        </p>
                      )}
                    </div>
                  </div>

                  <div style={styles.infoRow}>
                    <span style={styles.infoIcon}>
                      🛠️
                    </span>

                    <div>
                      <p
                        style={
                          styles.infoLabel
                        }
                      >
                        Service
                      </p>

                      <strong>
                        {vendor.service}
                      </strong>
                    </div>
                  </div>

                  <div style={styles.infoRow}>
                    <span style={styles.infoIcon}>
                      ₹
                    </span>

                    <div>
                      <p
                        style={
                          styles.infoLabel
                        }
                      >
                        Cost
                      </p>

                      <strong
                        style={
                          styles.costText
                        }
                      >
                        ₹
                        {Number(
                          vendor.cost || 0
                        ).toLocaleString(
                          "en-IN"
                        )}
                      </strong>
                    </div>
                  </div>
                </div>

                <div style={styles.cardActions}>
                  <button
                    onClick={() =>
                      handleEdit(vendor)
                    }
                    style={styles.editButton}
                  >
                    ✏ Edit
                  </button>

                  <button
                    onClick={() =>
                      handleDelete(
                        vendor.id
                      )
                    }
                    style={
                      styles.deleteButton
                    }
                  >
                    🗑 Delete
                  </button>
                </div>
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
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "20px",
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

  refreshButton: {
    border: "1px solid #cbd5e1",
    background: "#ffffff",
    color: "#334155",
    padding: "10px 15px",
    borderRadius: "9px",
    fontSize: "13px",
    fontWeight: "650",
    cursor: "pointer",
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

  costValue: {
    margin: "0",
    fontSize: "20px",
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

  editBadge: {
    background: "#eff6ff",
    color: "#2563eb",
    padding: "6px 11px",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: "700",
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

  formActions: {
    display: "flex",
    gap: "10px",
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

  cancelButton: {
    border: "1px solid #cbd5e1",
    background: "#ffffff",
    color: "#334155",
    padding: "11px 18px",
    borderRadius: "9px",
    fontSize: "14px",
    fontWeight: "600",
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
    width: "270px",
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

  vendorGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(310px, 1fr))",
    gap: "18px",
  },

  vendorCard: {
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "17px",
    padding: "21px",
    boxShadow:
      "0 2px 8px rgba(15, 23, 42, 0.04)",
  },

  cardTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "15px",
  },

  vendorIcon: {
    width: "44px",
    height: "44px",
    borderRadius: "12px",
    background: "#eff6ff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "20px",
  },

  statusBadge: {
    padding: "6px 10px",
    borderRadius: "999px",
    fontSize: "11px",
    fontWeight: "700",
  },

  companyName: {
    margin: "0",
    fontSize: "19px",
    fontWeight: "700",
  },

  vendorName: {
    margin: "5px 0 18px",
    color: "#64748b",
    fontSize: "13px",
  },

  infoList: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },

  infoRow: {
    display: "flex",
    alignItems: "flex-start",
    gap: "11px",
    background: "#f8fafc",
    borderRadius: "11px",
    padding: "11px",
  },

  infoIcon: {
    width: "30px",
    height: "30px",
    borderRadius: "8px",
    background: "#ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },

  infoLabel: {
    margin: "0 0 3px",
    fontSize: "10px",
    color: "#64748b",
    textTransform: "uppercase",
    fontWeight: "700",
    letterSpacing: "0.5px",
  },

  eventDate: {
    margin: "4px 0 0",
    color: "#64748b",
    fontSize: "11px",
  },

  costText: {
    color: "#2563eb",
  },

  cardActions: {
    display: "flex",
    gap: "9px",
    marginTop: "17px",
  },

  editButton: {
    flex: 1,
    border: "1px solid #bfdbfe",
    background: "#eff6ff",
    color: "#2563eb",
    padding: "9px",
    borderRadius: "9px",
    fontSize: "13px",
    fontWeight: "650",
    cursor: "pointer",
  },

  deleteButton: {
    flex: 1,
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

export default Vendors;