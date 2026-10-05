import API_URL from "../api";
import { useEffect, useMemo, useState } from "react";

function Resources() {
  const [resources, setResources] = useState([]);

  const [form, setForm] = useState({
    name: "",
    quantity: "",
  });

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadResources = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `${API_URL}/api/resources/`,
        {
          credentials: "include",
        }
      );

      const data = await response.json();

      if (response.ok) {
        setResources(data.resources || []);
      } else {
        setError(data.message || "Could not load resources");
      }
    } catch (error) {
      setError("Could not connect to Django");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadResources();
  }, []);

  const handleChange = (event) => {
    setForm({
      ...form,
      [event.target.name]: event.target.value,
    });
  };

  const saveResource = async (event) => {
    event.preventDefault();

    setMessage("");
    setError("");

    if (!form.name.trim()) {
      setError("Resource name is required");
      return;
    }

    if (!form.quantity || Number(form.quantity) <= 0) {
      setError("Quantity must be greater than 0");
      return;
    }

    const url = editingId
      ? `${API_URL}/api/resources/${editingId}/`
      : `${API_URL}/api/resources/`;

    const method = editingId ? "PUT" : "POST";

    try {
      const response = await fetch(url, {
        method,
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: form.name.trim(),
          quantity: Number(form.quantity),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(
          editingId
            ? "Resource updated successfully"
            : "Resource created successfully"
        );

        setForm({
          name: "",
          quantity: "",
        });

        setEditingId(null);

        loadResources();
      } else {
        setError(data.message || "Could not save resource");
      }
    } catch (error) {
      setError("Could not connect to Django");
    }
  };

  const editResource = (resource) => {
    setEditingId(resource.id);

    setForm({
      name: resource.name,
      quantity: resource.quantity,
    });

    setMessage("");
    setError("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const cancelEdit = () => {
    setEditingId(null);

    setForm({
      name: "",
      quantity: "",
    });

    setMessage("");
    setError("");
  };

  const deleteResource = async (resourceId) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this resource?"
    );

    if (!confirmed) {
      return;
    }

    setMessage("");
    setError("");

    try {
      const response = await fetch(
        `${API_URL}/api/resources/${resourceId}/`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      const data = await response.json();

      if (response.ok) {
        setMessage("Resource deleted successfully");
        loadResources();
      } else {
        setError(
          data.message || "Could not delete resource"
        );
      }
    } catch (error) {
      setError("Could not connect to Django");
    }
  };

  const filteredResources = useMemo(() => {
    const searchText = search.toLowerCase().trim();

    if (!searchText) {
      return resources;
    }

    return resources.filter((resource) =>
      resource.name.toLowerCase().includes(searchText)
    );
  }, [resources, search]);

  const totalResources = resources.length;

  const totalQuantity = resources.reduce(
    (sum, resource) =>
      sum + Number(resource.quantity || 0),
    0
  );

  const totalAvailable = resources.reduce(
    (sum, resource) =>
      sum + Number(resource.available || 0),
    0
  );

  const totalAllocated = resources.reduce(
    (sum, resource) =>
      sum + Number(resource.allocated || 0),
    0
  );

  const getAvailability = (resource) => {
    const total = Number(resource.quantity || 0);
    const available = Number(resource.available || 0);

    if (total === 0) {
      return 0;
    }

    return Math.round((available / total) * 100);
  };

  const getStatus = (resource) => {
    const available = Number(resource.available || 0);

    if (available === 0) {
      return {
        text: "Fully Allocated",
        background: "#fee2e2",
        color: "#b91c1c",
      };
    }

    if (available <= 2) {
      return {
        text: "Low Availability",
        background: "#fef3c7",
        color: "#92400e",
      };
    }

    return {
      text: "Available",
      background: "#dcfce7",
      color: "#166534",
    };
  };

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <p style={styles.eyebrow}>RESOURCE MANAGEMENT</p>

          <h1 style={styles.title}>Resources</h1>

          <p style={styles.subtitle}>
            Manage event resources, track availability, and monitor
            allocations.
          </p>
        </div>
      </div>

      {/* Statistics */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={styles.statIcon}>📦</div>

          <div>
            <p style={styles.statLabel}>Total Resources</p>
            <h2 style={styles.statValue}>{totalResources}</h2>
          </div>
        </div>

        <div style={styles.statCard}>
          <div style={styles.statIcon}>🔢</div>

          <div>
            <p style={styles.statLabel}>Total Quantity</p>
            <h2 style={styles.statValue}>{totalQuantity}</h2>
          </div>
        </div>

        <div style={styles.statCard}>
          <div style={styles.statIcon}>🟢</div>

          <div>
            <p style={styles.statLabel}>Available</p>
            <h2 style={styles.statValue}>{totalAvailable}</h2>
          </div>
        </div>

        <div style={styles.statCard}>
          <div style={styles.statIcon}>📌</div>

          <div>
            <p style={styles.statLabel}>Allocated</p>
            <h2 style={styles.statValue}>{totalAllocated}</h2>
          </div>
        </div>
      </div>

      {/* Messages */}
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

      {/* Create / Update Form */}
      <div style={styles.formCard}>
        <div style={styles.formHeader}>
          <div>
            <h2 style={styles.sectionTitle}>
              {editingId
                ? "Update Resource"
                : "Add New Resource"}
            </h2>

            <p style={styles.sectionSubtitle}>
              {editingId
                ? "Update the resource information below."
                : "Add equipment or resources that can be allocated to events."}
            </p>
          </div>

          {editingId && (
            <span style={styles.editBadge}>
              Editing
            </span>
          )}
        </div>

        <form onSubmit={saveResource}>
          <div style={styles.formGrid}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>
                Resource Name
              </label>

              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Example: Projector"
                style={styles.input}
                required
              />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>
                Total Quantity
              </label>

              <input
                type="number"
                name="quantity"
                value={form.quantity}
                onChange={handleChange}
                placeholder="Example: 5"
                min="1"
                style={styles.input}
                required
              />
            </div>
          </div>

          <div style={styles.formActions}>
            <button
              type="submit"
              style={styles.primaryButton}
            >
              {editingId
                ? "✓ Update Resource"
                : "+ Create Resource"}
            </button>

            {editingId && (
              <button
                type="button"
                onClick={cancelEdit}
                style={styles.cancelButton}
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Resource List */}
      <div style={styles.listHeader}>
        <div>
          <h2 style={styles.sectionTitle}>
            Available Resources
          </h2>

          <p style={styles.sectionSubtitle}>
            View and manage all registered resources.
          </p>
        </div>

        <div style={styles.searchBox}>
          <span>🔎</span>

          <input
            type="text"
            placeholder="Search resources..."
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
          <div style={styles.loadingIcon}>⏳</div>
          <h3>Loading resources...</h3>
          <p>Please wait while resources are loaded.</p>
        </div>
      ) : filteredResources.length === 0 ? (
        <div style={styles.emptyCard}>
          <div style={styles.emptyIcon}>📦</div>

          <h3>
            {search
              ? "No matching resources"
              : "No resources found"}
          </h3>

          <p>
            {search
              ? "Try a different search term."
              : "Create your first resource using the form above."}
          </p>
        </div>
      ) : (
        <div style={styles.resourceGrid}>
          {filteredResources.map((resource) => {
            const availability =
              getAvailability(resource);

            const status = getStatus(resource);

            return (
              <div
                key={resource.id}
                style={styles.resourceCard}
              >
                <div style={styles.resourceTop}>
                  <div style={styles.resourceIcon}>
                    📦
                  </div>

                  <span
                    style={{
                      ...styles.statusBadge,
                      background: status.background,
                      color: status.color,
                    }}
                  >
                    {status.text}
                  </span>
                </div>

                <h3 style={styles.resourceName}>
                  {resource.name}
                </h3>

                <div style={styles.quantityRow}>
                  <div>
                    <p style={styles.quantityLabel}>
                      Available
                    </p>

                    <p style={styles.availableValue}>
                      {resource.available}
                    </p>
                  </div>

                  <div style={styles.quantityDivider} />

                  <div>
                    <p style={styles.quantityLabel}>
                      Allocated
                    </p>

                    <p style={styles.allocatedValue}>
                      {resource.allocated}
                    </p>
                  </div>

                  <div style={styles.quantityDivider} />

                  <div>
                    <p style={styles.quantityLabel}>
                      Total
                    </p>

                    <p style={styles.totalValue}>
                      {resource.quantity}
                    </p>
                  </div>
                </div>

                <div style={styles.progressSection}>
                  <div style={styles.progressHeader}>
                    <span>Availability</span>

                    <strong>
                      {availability}%
                    </strong>
                  </div>

                  <div style={styles.progressBackground}>
                    <div
                      style={{
                        ...styles.progressBar,
                        width: `${availability}%`,
                      }}
                    />
                  </div>
                </div>

                <div style={styles.cardActions}>
                  <button
                    onClick={() =>
                      editResource(resource)
                    }
                    style={styles.editButton}
                  >
                    ✏ Edit
                  </button>

                  <button
                    onClick={() =>
                      deleteResource(resource.id)
                    }
                    style={styles.deleteButton}
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
    boxShadow: "0 2px 8px rgba(15, 23, 42, 0.04)",
  },

  statIcon: {
    width: "46px",
    height: "46px",
    borderRadius: "12px",
    background: "#eff6ff",
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
    boxShadow: "0 2px 8px rgba(15, 23, 42, 0.04)",
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
      "repeat(auto-fit, minmax(240px, 1fr))",
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
    width: "260px",
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

  resourceGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(290px, 1fr))",
    gap: "18px",
  },

  resourceCard: {
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "17px",
    padding: "21px",
    boxShadow: "0 2px 8px rgba(15, 23, 42, 0.04)",
  },

  resourceTop: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "16px",
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

  statusBadge: {
    padding: "6px 9px",
    borderRadius: "999px",
    fontSize: "11px",
    fontWeight: "700",
  },

  resourceName: {
    margin: "0 0 18px",
    fontSize: "18px",
    fontWeight: "700",
  },

  quantityRow: {
    display: "grid",
    gridTemplateColumns: "1fr auto 1fr auto 1fr",
    alignItems: "center",
    textAlign: "center",
    background: "#f8fafc",
    borderRadius: "12px",
    padding: "13px 8px",
  },

  quantityLabel: {
    margin: "0 0 4px",
    fontSize: "10px",
    color: "#64748b",
    textTransform: "uppercase",
    fontWeight: "700",
    letterSpacing: "0.5px",
  },

  availableValue: {
    margin: "0",
    fontSize: "20px",
    fontWeight: "750",
    color: "#16a34a",
  },

  allocatedValue: {
    margin: "0",
    fontSize: "20px",
    fontWeight: "750",
    color: "#d97706",
  },

  totalValue: {
    margin: "0",
    fontSize: "20px",
    fontWeight: "750",
    color: "#2563eb",
  },

  quantityDivider: {
    height: "32px",
    width: "1px",
    background: "#e2e8f0",
  },

  progressSection: {
    marginTop: "18px",
  },

  progressHeader: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: "12px",
    color: "#64748b",
    marginBottom: "7px",
  },

  progressBackground: {
    height: "7px",
    background: "#e2e8f0",
    borderRadius: "999px",
    overflow: "hidden",
  },

  progressBar: {
    height: "100%",
    background: "#2563eb",
    borderRadius: "999px",
    transition: "width 0.3s ease",
  },

  cardActions: {
    display: "flex",
    gap: "9px",
    marginTop: "19px",
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

  loadingIcon: {
    fontSize: "30px",
    marginBottom: "10px",
  },
};

export default Resources;
