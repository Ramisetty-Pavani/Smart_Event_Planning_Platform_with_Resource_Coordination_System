import API_URL from "../api";
import { useEffect, useMemo, useState } from "react";

const SPONSORS_URL = `${API_URL}/api/sponsors/`;

const EVENTS_URL =
  `${API_URL}/api/events/`;

function Sponsors() {
  const [sponsors, setSponsors] = useState([]);
  const [events, setEvents] = useState([]);

  const [form, setForm] = useState({
    event_id: "",
    name: "",
    company: "",
    amount: "",
  });

  const [editingId, setEditingId] = useState(null);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] =
    useState(true);

  const [search, setSearch] = useState("");
  const [eventFilter, setEventFilter] =
    useState("");

  // =====================================================
  // LOAD SPONSORS
  // =====================================================

  const fetchSponsors = async () => {
    try {
      const response = await fetch(API_URL, {
        credentials: "include",
      });

      const text =
        await response.text();

      let data;

      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(
          "Invalid sponsor response from Django"
        );
      }

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to load sponsors"
        );
      }

      setSponsors(
        Array.isArray(data)
          ? data
          : data.sponsors || []
      );
    } catch (err) {
      setError(
        err.message ||
          "Failed to load sponsors"
      );
    }
  };

  // =====================================================
  // LOAD EVENTS
  // =====================================================

  const fetchEvents = async () => {
    try {
      const response =
        await fetch(EVENTS_URL, {
          credentials: "include",
        });

      const text =
        await response.text();

      let data;

      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(
          "Invalid event response from Django"
        );
      }

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to load events"
        );
      }

      const eventList =
        Array.isArray(data)
          ? data
          : data.events || [];

      setEvents(eventList);
    } catch (err) {
      setError(
        err.message ||
          "Failed to load events"
      );
    }
  };

  // =====================================================
  // INITIAL LOAD
  // =====================================================

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoadingData(true);
    setError("");

    try {
      await Promise.all([
        fetchSponsors(),
        fetchEvents(),
      ]);
    } finally {
      setLoadingData(false);
    }
  };

  // =====================================================
  // EVENT NAME
  // =====================================================

  const getEventName = (
    eventId
  ) => {
    const event = events.find(
      (item) =>
        Number(item.id) ===
        Number(eventId)
    );

    return event
      ? event.name
      : `Event ${eventId}`;
  };

  // =====================================================
  // EVENT DETAILS
  // =====================================================

  const getEventDetails = (
    eventId
  ) => {
    return events.find(
      (item) =>
        Number(item.id) ===
        Number(eventId)
    );
  };

  // =====================================================
  // HANDLE INPUT
  // =====================================================

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]:
        e.target.value,
    });
  };

  // =====================================================
  // RESET FORM
  // =====================================================

  const resetForm = () => {
    setForm({
      event_id: "",
      name: "",
      company: "",
      amount: "",
    });

    setEditingId(null);
  };

  // =====================================================
  // SUBMIT
  // =====================================================

  const handleSubmit = async (
    e
  ) => {
    e.preventDefault();

    setMessage("");
    setError("");

    if (!form.event_id) {
      setError(
        "Please select an event."
      );
      return;
    }

    if (!form.name.trim()) {
      setError(
        "Sponsor name is required."
      );
      return;
    }

    if (!form.company.trim()) {
      setError(
        "Company name is required."
      );
      return;
    }

    if (form.amount === "") {
      setError(
        "Amount is required."
      );
      return;
    }

    if (
      Number(form.amount) < 0
    ) {
      setError(
        "Amount cannot be negative."
      );
      return;
    }

    setLoading(true);

    try {
      const payload = {
        event_id:
          Number(form.event_id),

        name:
          form.name.trim(),

        company:
          form.company.trim(),

        amount:
          Number(form.amount),
      };

      if (editingId !== null) {
        payload.id = editingId;
      }

      const response = await fetch(
        API_URL,
        {
          method:
            editingId !== null
              ? "PUT"
              : "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          credentials: "include",

          body: JSON.stringify(
            payload
          ),
        }
      );

      const text =
        await response.text();

      let data;

      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(
          `Invalid Django response. Status: ${response.status}`
        );
      }

      if (!response.ok) {
        throw new Error(
          data.message ||
            (editingId !== null
              ? "Failed to update sponsor"
              : "Failed to add sponsor")
        );
      }

      setMessage(
        data.message ||
          (editingId !== null
            ? "Sponsor updated successfully"
            : "Sponsor added successfully")
      );

      resetForm();

      await fetchSponsors();
    } catch (err) {
      setError(
        err.message ||
          "Could not connect to Django"
      );
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // EDIT
  // =====================================================

  const handleEdit = (
    sponsor
  ) => {
    setEditingId(
      sponsor.id
    );

    setForm({
      event_id:
        sponsor.event_id,
      name:
        sponsor.name || "",
      company:
        sponsor.company || "",
      amount:
        sponsor.amount ?? "",
    });

    setMessage("");
    setError("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  // =====================================================
  // DELETE
  // =====================================================

  const handleDelete = async (
    id
  ) => {
    const confirmDelete =
      window.confirm(
        "Are you sure you want to delete this sponsor?"
      );

    if (!confirmDelete) {
      return;
    }

    setMessage("");
    setError("");

    try {
      const response = await fetch(
        API_URL,
        {
          method: "DELETE",

          headers: {
            "Content-Type":
              "application/json",
          },

          credentials: "include",

          body: JSON.stringify({
            id: id,
          }),
        }
      );

      const text =
        await response.text();

      let data;

      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(
          `Invalid Django response. Status: ${response.status}`
        );
      }

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to delete sponsor"
        );
      }

      setMessage(
        data.message ||
          "Sponsor deleted successfully"
      );

      await fetchSponsors();
    } catch (err) {
      setError(
        err.message ||
          "Could not connect to Django"
      );
    }
  };

  // =====================================================
  // FILTER SPONSORS
  // =====================================================

  const filteredSponsors =
    useMemo(() => {
      const searchText =
        search
          .toLowerCase()
          .trim();

      return sponsors.filter(
        (sponsor) => {
          const eventName =
            getEventName(
              sponsor.event_id
            ).toLowerCase();

          const matchesSearch =
            !searchText ||
            (sponsor.name || "")
              .toLowerCase()
              .includes(searchText) ||
            (sponsor.company || "")
              .toLowerCase()
              .includes(searchText) ||
            eventName.includes(
              searchText
            );

          const matchesEvent =
            !eventFilter ||
            Number(
              sponsor.event_id
            ) ===
              Number(eventFilter);

          return (
            matchesSearch &&
            matchesEvent
          );
        }
      );
    }, [
      sponsors,
      events,
      search,
      eventFilter,
    ]);

  // =====================================================
  // STATISTICS
  // =====================================================

  const totalSponsors =
    sponsors.length;

  const totalAmount =
    sponsors.reduce(
      (total, sponsor) =>
        total +
        Number(
          sponsor.amount || 0
        ),
      0
    );

  const averageAmount =
    totalSponsors > 0
      ? totalAmount /
        totalSponsors
      : 0;

  const sponsoredEvents =
    new Set(
      sponsors.map(
        (sponsor) =>
          sponsor.event_id
      )
    ).size;

  // =====================================================
  // FORMAT CURRENCY
  // =====================================================

  const formatCurrency = (
    amount
  ) => {
    return new Intl.NumberFormat(
      "en-IN",
      {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
      }
    ).format(
      Number(amount || 0)
    );
  };

  // =====================================================
  // SELECTED EVENT
  // =====================================================

  const selectedEvent =
    getEventDetails(
      form.event_id
    );

  return (
    <div style={styles.page}>

      <div style={styles.header}>

        <div>
          <div style={styles.eyebrow}>
            EVENT FUNDING
          </div>

          <h1 style={styles.title}>
            Sponsor Management
          </h1>

          <p style={styles.subtitle}>
            Manage sponsors and track
            their financial contributions
            across your events.
          </p>
        </div>

        <div style={styles.headerIcon}>
          ₹
        </div>

      </div>

      {message && (
        <div
          style={
            styles.successAlert
          }
        >
          <div
            style={
              styles.alertIcon
            }
          >
            ✓
          </div>

          <div>
            <strong>
              Success
            </strong>

            <div>
              {message}
            </div>
          </div>
        </div>
      )}

      {error && (
        <div
          style={
            styles.errorAlert
          }
        >
          <div
            style={
              styles.alertIcon
            }
          >
            !
          </div>

          <div>
            <strong>
              Something went wrong
            </strong>

            <div>
              {error}
            </div>
          </div>
        </div>
      )}

      <div style={styles.statsGrid}>

        <StatCard
          title="Total Sponsors"
          value={totalSponsors}
          icon="👥"
          description="Registered sponsors"
        />

        <StatCard
          title="Total Contributions"
          value={formatCurrency(
            totalAmount
          )}
          icon="₹"
          description="Combined sponsorship amount"
        />

        <StatCard
          title="Sponsored Events"
          value={sponsoredEvents}
          icon="📅"
          description="Events with sponsors"
        />

        <StatCard
          title="Average Contribution"
          value={formatCurrency(
            averageAmount
          )}
          icon="↗"
          description="Average per sponsor"
        />

      </div>

      <div style={styles.sectionCard}>

        <div
          style={
            styles.sectionHeader
          }
        >

          <div>
            <h2
              style={
                styles.sectionTitle
              }
            >
              {editingId !== null
                ? "Edit Sponsor"
                : "Add Sponsor"}
            </h2>

            <p
              style={
                styles.sectionSubtitle
              }
            >
              {editingId !== null
                ? "Update the sponsor information below."
                : "Add a sponsor and record their contribution."}
            </p>
          </div>

          <div
            style={
              styles.formIcon
            }
          >
            ₹
          </div>

        </div>

        <form
          onSubmit={handleSubmit}
        >

          <div
            style={
              styles.formGrid
            }
          >

            <div
              style={
                styles.formGroup
              }
            >

              <label
                style={
                  styles.label
                }
              >
                Event
              </label>

              <select
                name="event_id"
                value={
                  form.event_id
                }
                onChange={
                  handleChange
                }
                style={
                  styles.input
                }
              >

                <option value="">
                  Select Event
                </option>

                {events.map(
                  (event) => (
                    <option
                      key={
                        event.id
                      }
                      value={
                        event.id
                      }
                    >
                      {event.name}
                    </option>
                  )
                )}

              </select>

            </div>

            <div
              style={
                styles.formGroup
              }
            >

              <label
                style={
                  styles.label
                }
              >
                Sponsor Name
              </label>

              <input
                type="text"
                name="name"
                value={
                  form.name
                }
                onChange={
                  handleChange
                }
                placeholder="Enter sponsor name"
                style={
                  styles.input
                }
              />

            </div>

            <div
              style={
                styles.formGroup
              }
            >

              <label
                style={
                  styles.label
                }
              >
                Company
              </label>

              <input
                type="text"
                name="company"
                value={
                  form.company
                }
                onChange={
                  handleChange
                }
                placeholder="Enter company name"
                style={
                  styles.input
                }
              />

            </div>

            <div
              style={
                styles.formGroup
              }
            >

              <label
                style={
                  styles.label
                }
              >
                Sponsorship Amount
              </label>

              <div
                style={
                  styles.currencyInput
                }
              >

                <span
                  style={
                    styles.currencySymbol
                  }
                >
                  ₹
                </span>

                <input
                  type="number"
                  name="amount"
                  value={
                    form.amount
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="Enter amount"
                  min="0"
                  step="0.01"
                  style={
                    styles.currencyField
                  }
                />

              </div>

            </div>

          </div>

          {selectedEvent && (
            <div
              style={
                styles.selectedEvent
              }
            >

              <div
                style={
                  styles.selectedEventIcon
                }
              >
                📅
              </div>

              <div>
                <strong>
                  {selectedEvent.name}
                </strong>

                <div
                  style={
                    styles.selectedEventDetails
                  }
                >
                  {selectedEvent.date &&
                    `Date: ${selectedEvent.date}`}

                  {selectedEvent.location &&
                    ` • ${selectedEvent.location}`}
                </div>
              </div>

            </div>
          )}

          <div
            style={
              styles.formActions
            }
          >

            <button
              type="submit"
              disabled={
                loading
              }
              style={{
                ...styles.primaryButton,
                opacity:
                  loading
                    ? 0.7
                    : 1,
              }}
            >
              {loading
                ? "Saving..."
                : editingId !== null
                ? "Update Sponsor"
                : "Add Sponsor"}
            </button>

            {editingId !== null && (
              <button
                type="button"
                onClick={
                  resetForm
                }
                style={
                  styles.secondaryButton
                }
              >
                Cancel
              </button>
            )}

          </div>

        </form>

      </div>

      <div
        style={
          styles.filterCard
        }
      >

        <div>
          <h2
            style={
              styles.sectionTitle
            }
          >
            Sponsors
          </h2>

          <p
            style={
              styles.sectionSubtitle
            }
          >
            Search and filter sponsor
            records.
          </p>
        </div>

        <div
          style={
            styles.filterGrid
          }
        >

          <input
            type="text"
            placeholder="Search sponsor, company or event..."
            value={search}
            onChange={(e) =>
              setSearch(
                e.target.value
              )
            }
            style={
              styles.searchInput
            }
          />

          <select
            value={
              eventFilter
            }
            onChange={(e) =>
              setEventFilter(
                e.target.value
              )
            }
            style={
              styles.filterSelect
            }
          >

            <option value="">
              All Events
            </option>

            {events.map(
              (event) => (
                <option
                  key={
                    event.id
                  }
                  value={
                    event.id
                  }
                >
                  {event.name}
                </option>
              )
            )}

          </select>

        </div>

      </div>

      <div
        style={
          styles.sectionCard
        }
      >

        <div
          style={
            styles.listHeader
          }
        >

          <div>
            <h2
              style={
                styles.sectionTitle
              }
            >
              Sponsor Records
            </h2>

            <p
              style={
                styles.sectionSubtitle
              }
            >
              Showing{" "}
              {
                filteredSponsors.length
              }{" "}
              of{" "}
              {sponsors.length}{" "}
              sponsors
            </p>
          </div>

          <div
            style={
              styles.totalBadge
            }
          >
            {formatCurrency(
              totalAmount
            )}
          </div>

        </div>

        {loadingData ? (
          <div
            style={
              styles.emptyState
            }
          >

            <div
              style={
                styles.spinner
              }
            />

            <p>
              Loading sponsors...
            </p>

          </div>
        ) : filteredSponsors.length ===
          0 ? (
          <div
            style={
              styles.emptyState
            }
          >

            <div
              style={
                styles.emptyIcon
              }
            >
              ₹
            </div>

            <h3>
              No sponsors found
            </h3>

            <p>
              {sponsors.length ===
              0
                ? "Add your first sponsor using the form above."
                : "Try changing your search or event filter."}
            </p>

          </div>
        ) : (
          <div
            style={
              styles.sponsorGrid
            }
          >

            {filteredSponsors.map(
              (sponsor) => {

                const event =
                  getEventDetails(
                    sponsor.event_id
                  );

                return (
                  <div
                    key={
                      sponsor.id
                    }
                    style={
                      styles.sponsorCard
                    }
                  >

                    <div
                      style={
                        styles.sponsorTop
                      }
                    >

                      <div
                        style={
                          styles.sponsorAvatar
                        }
                      >
                        {(
                          sponsor.name ||
                          "S"
                        )
                          .charAt(
                            0
                          )
                          .toUpperCase()}
                      </div>

                      <div
                        style={
                          styles.sponsorInfo
                        }
                      >

                        <h3
                          style={
                            styles.sponsorName
                          }
                        >
                          {
                            sponsor.name
                          }
                        </h3>

                        <p
                          style={
                            styles.companyName
                          }
                        >
                          {
                            sponsor.company
                          }
                        </p>

                      </div>

                    </div>

                    <div
                      style={
                        styles.eventBox
                      }
                    >

                      <span
                        style={
                          styles.eventBoxLabel
                        }
                      >
                        EVENT
                      </span>

                      <strong>
                        {getEventName(
                          sponsor.event_id
                        )}
                      </strong>

                      {event?.date && (
                        <small>
                          📅{" "}
                          {
                            event.date
                          }
                        </small>
                      )}

                    </div>

                    <div
                      style={
                        styles.amountBox
                      }
                    >

                      <span>
                        Contribution
                      </span>

                      <strong>
                        {formatCurrency(
                          sponsor.amount
                        )}
                      </strong>

                    </div>

                    <div
                      style={
                        styles.cardActions
                      }
                    >

                      <button
                        onClick={() =>
                          handleEdit(
                            sponsor
                          )
                        }
                        style={
                          styles.editButton
                        }
                      >
                        ✏ Edit
                      </button>

                      <button
                        onClick={() =>
                          handleDelete(
                            sponsor.id
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
              }
            )}

          </div>
        )}

      </div>

    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
  description,
}) {
  return (
    <div
      style={
        styles.statCard
      }
    >

      <div
        style={
          styles.statTop
        }
      >

        <div>

          <p
            style={
              styles.statTitle
            }
          >
            {title}
          </p>

          <h2
            style={
              styles.statValue
            }
          >
            {value}
          </h2>

        </div>

        <div
          style={
            styles.statIcon
          }
        >
          {icon}
        </div>

      </div>

      <p
        style={
          styles.statDescription
        }
      >
        {description}
      </p>

    </div>
  );
}

const styles = {
  page: {
    marginLeft: "250px",
    padding: "32px",
    minHeight: "100vh",
    background: "#f8fafc",
    boxSizing: "border-box",
  },

  header: {
    display: "flex",
    justifyContent:
      "space-between",
    alignItems: "center",
    marginBottom: "28px",
  },

  eyebrow: {
    color: "#2563eb",
    fontSize: "12px",
    fontWeight: "700",
    letterSpacing: "1.5px",
    marginBottom: "6px",
  },

  title: {
    margin: 0,
    fontSize: "32px",
    color: "#111827",
    fontWeight: "750",
  },

  subtitle: {
    marginTop: "8px",
    color: "#64748b",
    fontSize: "15px",
  },

  headerIcon: {
    width: "60px",
    height: "60px",
    borderRadius: "16px",
    background: "#eff6ff",
    color: "#2563eb",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "28px",
    fontWeight: "800",
  },

  successAlert: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    background: "#f0fdf4",
    border:
      "1px solid #bbf7d0",
    color: "#166534",
    padding: "14px 16px",
    borderRadius: "12px",
    marginBottom: "18px",
  },

  errorAlert: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    background: "#fef2f2",
    border:
      "1px solid #fecaca",
    color: "#b91c1c",
    padding: "14px 16px",
    borderRadius: "12px",
    marginBottom: "18px",
  },

  alertIcon: {
    width: "30px",
    height: "30px",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "white",
    fontWeight: "800",
  },

  statsGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "16px",
    marginBottom: "22px",
  },

  statCard: {
    background: "white",
    border:
      "1px solid #e2e8f0",
    borderTop:
      "3px solid #2563eb",
    borderRadius: "14px",
    padding: "20px",
    boxShadow:
      "0 2px 8px rgba(15, 23, 42, 0.04)",
  },

  statTop: {
    display: "flex",
    justifyContent:
      "space-between",
    alignItems: "flex-start",
  },

  statTitle: {
    margin: 0,
    color: "#64748b",
    fontSize: "13px",
    fontWeight: "600",
  },

  statValue: {
    margin: "8px 0 0",
    color: "#111827",
    fontSize: "24px",
  },

  statIcon: {
    width: "40px",
    height: "40px",
    borderRadius: "10px",
    background: "#eff6ff",
    color: "#2563eb",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "17px",
    fontWeight: "800",
  },

  statDescription: {
    margin:
      "12px 0 0",
    color: "#94a3b8",
    fontSize: "12px",
  },

  sectionCard: {
    background: "white",
    border:
      "1px solid #e2e8f0",
    borderRadius: "16px",
    padding: "24px",
    marginBottom: "22px",
    boxShadow:
      "0 2px 8px rgba(15, 23, 42, 0.04)",
  },

  sectionHeader: {
    display: "flex",
    justifyContent:
      "space-between",
    alignItems: "flex-start",
    marginBottom: "20px",
  },

  sectionTitle: {
    margin: 0,
    fontSize: "20px",
    color: "#111827",
  },

  sectionSubtitle: {
    margin:
      "5px 0 0",
    color: "#64748b",
    fontSize: "13px",
  },

  formIcon: {
    width: "42px",
    height: "42px",
    borderRadius: "10px",
    background: "#eff6ff",
    color: "#2563eb",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "18px",
    fontWeight: "800",
  },

  formGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(230px, 1fr))",
    gap: "16px",
  },

  formGroup: {
    marginBottom: "4px",
  },

  label: {
    display: "block",
    marginBottom: "7px",
    fontSize: "13px",
    fontWeight: "600",
    color: "#374151",
  },

  input: {
    width: "100%",
    padding: "12px 13px",
    border:
      "1px solid #cbd5e1",
    borderRadius: "9px",
    background: "white",
    fontSize: "14px",
    boxSizing: "border-box",
    outline: "none",
  },

  currencyInput: {
    display: "flex",
    alignItems: "center",
    border:
      "1px solid #cbd5e1",
    borderRadius: "9px",
    overflow: "hidden",
    background: "white",
  },

  currencySymbol: {
    padding:
      "0 12px",
    color: "#64748b",
    fontWeight: "700",
  },

  currencyField: {
    flex: 1,
    minWidth: 0,
    border: "none",
    outline: "none",
    padding: "12px 10px",
    fontSize: "14px",
  },

  selectedEvent: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginTop: "20px",
    padding: "13px",
    borderRadius: "10px",
    background: "#f8fafc",
    border:
      "1px solid #e2e8f0",
  },

  selectedEventIcon: {
    width: "38px",
    height: "38px",
    borderRadius: "9px",
    background: "#eff6ff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  selectedEventDetails: {
    color: "#64748b",
    fontSize: "12px",
    marginTop: "3px",
  },

  formActions: {
    display: "flex",
    gap: "10px",
    marginTop: "20px",
  },

  primaryButton: {
    border: "none",
    borderRadius: "9px",
    padding: "11px 19px",
    background: "#2563eb",
    color: "white",
    fontWeight: "650",
    cursor: "pointer",
  },

  secondaryButton: {
    border:
      "1px solid #cbd5e1",
    borderRadius: "9px",
    padding: "10px 19px",
    background: "white",
    color: "#475569",
    fontWeight: "600",
    cursor: "pointer",
  },

  filterCard: {
    display: "grid",
    gridTemplateColumns:
      "minmax(200px, 1fr) minmax(400px, 2fr)",
    alignItems: "center",
    gap: "20px",
    background: "white",
    border:
      "1px solid #e2e8f0",
    borderRadius: "16px",
    padding: "20px 24px",
    marginBottom: "22px",
  },

  filterGrid: {
    display: "grid",
    gridTemplateColumns:
      "2fr 1fr",
    gap: "10px",
  },

  searchInput: {
    width: "100%",
    padding: "11px 13px",
    border:
      "1px solid #cbd5e1",
    borderRadius: "9px",
    boxSizing: "border-box",
    outline: "none",
  },

  filterSelect: {
    width: "100%",
    padding: "11px 13px",
    border:
      "1px solid #cbd5e1",
    borderRadius: "9px",
    background: "white",
    outline: "none",
  },

  listHeader: {
    display: "flex",
    justifyContent:
      "space-between",
    alignItems: "center",
    marginBottom: "20px",
  },

  totalBadge: {
    background: "#eff6ff",
    color: "#2563eb",
    borderRadius: "999px",
    padding: "8px 13px",
    fontSize: "13px",
    fontWeight: "700",
  },

  sponsorGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(300px, 1fr))",
    gap: "16px",
  },

  sponsorCard: {
    border:
      "1px solid #e2e8f0",
    borderRadius: "14px",
    padding: "18px",
    background: "white",
    transition:
      "transform 0.2s ease",
  },

  sponsorTop: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginBottom: "16px",
  },

  sponsorAvatar: {
    width: "48px",
    height: "48px",
    borderRadius: "13px",
    background: "#eff6ff",
    color: "#2563eb",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "18px",
    fontWeight: "800",
  },

  sponsorInfo: {
    minWidth: 0,
  },

  sponsorName: {
    margin: 0,
    color: "#111827",
    fontSize: "16px",
  },

  companyName: {
    margin:
      "4px 0 0",
    color: "#64748b",
    fontSize: "13px",
  },

  eventBox: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    padding: "12px",
    borderRadius: "10px",
    background: "#f8fafc",
    marginBottom: "12px",
  },

  eventBoxLabel: {
    color: "#94a3b8",
    fontSize: "10px",
    fontWeight: "700",
    letterSpacing: "1px",
  },

  amountBox: {
    display: "flex",
    justifyContent:
      "space-between",
    alignItems: "center",
    padding:
      "13px 0",
    borderTop:
      "1px solid #f1f5f9",
    borderBottom:
      "1px solid #f1f5f9",
    color: "#64748b",
    fontSize: "13px",
  },

  cardActions: {
    display: "flex",
    gap: "8px",
    marginTop: "14px",
  },

  editButton: {
    flex: 1,
    border:
      "1px solid #cbd5e1",
    background: "white",
    color: "#334155",
    borderRadius: "8px",
    padding: "9px",
    cursor: "pointer",
    fontWeight: "600",
  },

  deleteButton: {
    flex: 1,
    border: "none",
    background: "#fef2f2",
    color: "#dc2626",
    borderRadius: "8px",
    padding: "9px",
    cursor: "pointer",
    fontWeight: "600",
  },

  emptyState: {
    textAlign: "center",
    padding: "45px 20px",
    color: "#64748b",
  },

  emptyIcon: {
    width: "55px",
    height: "55px",
    borderRadius: "15px",
    background: "#f1f5f9",
    color: "#64748b",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin:
      "0 auto 12px",
    fontSize: "21px",
    fontWeight: "800",
  },

  spinner: {
    width: "22px",
    height: "22px",
    border:
      "3px solid #dbeafe",
    borderTop:
      "3px solid #2563eb",
    borderRadius: "50%",
    margin:
      "0 auto 12px",
  },
};

export default Sponsors;
