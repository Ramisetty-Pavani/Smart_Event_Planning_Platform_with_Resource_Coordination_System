import API_URL from "../api";
import { useEffect, useMemo, useState } from "react";

const CONFLICTS_URL =
  `${API_URL}/api/dashboard/conflicts/`;

const EVENTS_URL =
  `${API_URL}/api/events/`;

const RESOURCES_URL =
  `${API_URL}/api/resources/`;

function Conflicts() {
  const [conflicts, setConflicts] = useState([]);
  const [events, setEvents] = useState([]);
  const [resources, setResources] = useState([]);

  const [currentCount, setCurrentCount] =
    useState(0);

  const [preventedCount, setPreventedCount] =
    useState(0);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] =
    useState(false);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] =
    useState("");

  // =====================================================
  // LOAD DATA
  // =====================================================

  const loadData = async (
    showLoader = true
  ) => {
    setError("");

    if (showLoader) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    try {
      const [
        conflictsResponse,
        eventsResponse,
        resourcesResponse,
      ] = await Promise.all([
        fetch(CONFLICTS_URL, {
          credentials: "include",
        }),
        fetch(EVENTS_URL, {
          credentials: "include",
        }),
        fetch(RESOURCES_URL, {
          credentials: "include",
        }),
      ]);

      const conflictsText =
        await conflictsResponse.text();

      const eventsText =
        await eventsResponse.text();

      const resourcesText =
        await resourcesResponse.text();

      let conflictsData;
      let eventsData;
      let resourcesData;

      try {
        conflictsData =
          JSON.parse(conflictsText);

        eventsData =
          JSON.parse(eventsText);

        resourcesData =
          JSON.parse(resourcesText);
      } catch {
        throw new Error(
          "Invalid response received from Django"
        );
      }

      if (!conflictsResponse.ok) {
        throw new Error(
          conflictsData.message ||
            "Could not load conflicts"
        );
      }

      if (!eventsResponse.ok) {
        throw new Error(
          eventsData.message ||
            "Could not load events"
        );
      }

      if (!resourcesResponse.ok) {
        throw new Error(
          resourcesData.message ||
            "Could not load resources"
        );
      }

      setConflicts(
        conflictsData.prevented_conflicts ||
          []
      );

      setCurrentCount(
        conflictsData.current_conflict_count ||
          0
      );

      setPreventedCount(
        conflictsData.prevented_conflict_count ||
          0
      );

      setEvents(
        Array.isArray(eventsData)
          ? eventsData
          : eventsData.events || []
      );

      setResources(
        Array.isArray(resourcesData)
          ? resourcesData
          : resourcesData.resources || []
      );
    } catch (err) {
      setError(
        err.message ||
          "Could not connect to Django"
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

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
      : eventId
      ? `Event ${eventId}`
      : "Not specified";
  };

  // =====================================================
  // RESOURCE NAME
  // =====================================================

  const getResourceName = (
    resourceId
  ) => {
    const resource = resources.find(
      (item) =>
        Number(item.id) ===
        Number(resourceId)
    );

    return resource
      ? resource.name
      : resourceId
      ? `Resource ${resourceId}`
      : "Not specified";
  };

  // =====================================================
  // FORMAT DATE
  // =====================================================

  const formatDate = (
    date
  ) => {
    if (!date) {
      return "Not available";
    }

    const parsedDate =
      new Date(date);

    if (
      Number.isNaN(
        parsedDate.getTime()
      )
    ) {
      return date;
    }

    return parsedDate.toLocaleString(
      "en-IN"
    );
  };

  // =====================================================
  // CONFLICT TYPES
  // =====================================================

  const conflictTypes =
    useMemo(() => {
      return [
        ...new Set(
          conflicts
            .map(
              (item) =>
                item.conflict_type
            )
            .filter(Boolean)
        ),
      ];
    }, [conflicts]);

  // =====================================================
  // FILTER CONFLICTS
  // =====================================================

  const filteredConflicts =
    useMemo(() => {
      const searchText =
        search
          .toLowerCase()
          .trim();

      return conflicts.filter(
        (conflict) => {
          const eventName =
            getEventName(
              conflict.event_id
            ).toLowerCase();

          const conflictingEvent =
            getEventName(
              conflict.conflicting_event_id
            ).toLowerCase();

          const resourceName =
            getResourceName(
              conflict.resource_id
            ).toLowerCase();

          const conflictType =
            (
              conflict.conflict_type ||
              ""
            ).toLowerCase();

          const description =
            (
              conflict.description ||
              ""
            ).toLowerCase();

          const matchesSearch =
            !searchText ||
            eventName.includes(
              searchText
            ) ||
            conflictingEvent.includes(
              searchText
            ) ||
            resourceName.includes(
              searchText
            ) ||
            conflictType.includes(
              searchText
            ) ||
            description.includes(
              searchText
            );

          const matchesType =
            !typeFilter ||
            conflict.conflict_type ===
              typeFilter;

          return (
            matchesSearch &&
            matchesType
          );
        }
      );
    }, [
      conflicts,
      events,
      resources,
      search,
      typeFilter,
    ]);

  // =====================================================
  // CONFLICT TYPE COUNT
  // =====================================================

  const getTypeCount = (
    type
  ) => {
    return conflicts.filter(
      (conflict) =>
        conflict.conflict_type ===
        type
    ).length;
  };

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <div style={styles.loadingPage}>
        <div
          style={styles.loadingIcon}
        >
          ⚠
        </div>

        <h2>
          Loading conflict data...
        </h2>

        <p>
          Checking the latest
          conflict records.
        </p>
      </div>
    );
  }

  // =====================================================
  // PAGE
  // =====================================================

  return (
    <div style={styles.page}>

      {/* =================================================
          HEADER
      ================================================= */}

      <div style={styles.header}>

        <div>
          <div style={styles.eyebrow}>
            SYSTEM MONITORING
          </div>

          <h1 style={styles.title}>
            Conflict Management
          </h1>

          <p style={styles.subtitle}>
            Monitor scheduling and resource
            conflicts detected and prevented
            by the platform.
          </p>
        </div>

        <button
          onClick={() =>
            loadData(false)
          }
          disabled={refreshing}
          style={{
            ...styles.refreshButton,
            opacity:
              refreshing ? 0.7 : 1,
          }}
        >
          {refreshing
            ? "Refreshing..."
            : "↻ Refresh"}
        </button>

      </div>

      {/* =================================================
          ERROR
      ================================================= */}

      {error && (
        <div style={styles.errorAlert}>

          <div
            style={
              styles.alertIcon
            }
          >
            !
          </div>

          <div>
            <strong>
              Unable to load conflict data
            </strong>

            <div>
              {error}
            </div>
          </div>

        </div>
      )}

      {/* =================================================
          STATUS BANNER
      ================================================= */}

      <div
        style={{
          ...styles.statusBanner,
          background:
            currentCount > 0
              ? "#fff7ed"
              : "#f0fdf4",
          borderColor:
            currentCount > 0
              ? "#fed7aa"
              : "#bbf7d0",
        }}
      >

        <div
          style={{
            ...styles.statusIcon,
            background:
              currentCount > 0
                ? "#ffedd5"
                : "#dcfce7",
            color:
              currentCount > 0
                ? "#c2410c"
                : "#15803d",
          }}
        >
          {currentCount > 0
            ? "!"
            : "✓"}
        </div>

        <div>

          <strong
            style={
              styles.statusTitle
            }
          >
            {currentCount > 0
              ? "Attention Required"
              : "No Active Conflicts"}
          </strong>

          <p
            style={
              styles.statusText
            }
          >
            {currentCount > 0
              ? `${currentCount} conflict${
                  currentCount === 1
                    ? ""
                    : "s"
                } currently require attention.`
              : "The system currently has no active conflicts requiring attention."}
          </p>

        </div>

      </div>

      {/* =================================================
          SUMMARY CARDS
      ================================================= */}

      <div
        style={
          styles.summaryGrid
        }
      >

        <SummaryCard
          title="Current Conflicts"
          value={currentCount}
          icon="⚠"
          color={
            currentCount > 0
              ? "#ea580c"
              : "#16a34a"
          }
          description="Issues currently requiring attention"
        />

        <SummaryCard
          title="Prevented Conflicts"
          value={preventedCount}
          icon="✓"
          color="#2563eb"
          description="Conflicts blocked by validation rules"
        />

        <SummaryCard
          title="Recorded Conflicts"
          value={conflicts.length}
          icon="▣"
          color="#7c3aed"
          description="Conflict records displayed below"
        />

      </div>

      {/* =================================================
          CONFLICT TYPES
      ================================================= */}

      {conflictTypes.length >
        0 && (
        <div
          style={
            styles.sectionCard
          }
        >

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
                Conflict Types
              </h2>

              <p
                style={
                  styles.sectionSubtitle
                }
              >
                Breakdown of recorded
                prevented conflicts.
              </p>
            </div>

          </div>

          <div
            style={
              styles.typeGrid
            }
          >

            {conflictTypes.map(
              (type) => (
                <div
                  key={type}
                  style={
                    styles.typeCard
                  }
                >

                  <div
                    style={
                      styles.typeIcon
                    }
                  >
                    ⚠
                  </div>

                  <div>
                    <div
                      style={
                        styles.typeName
                      }
                    >
                      {type}
                    </div>

                    <div
                      style={
                        styles.typeCount
                      }
                    >
                      {getTypeCount(
                        type
                      )}{" "}
                      record
                      {getTypeCount(
                        type
                      ) === 1
                        ? ""
                        : "s"}
                    </div>
                  </div>

                </div>
              )
            )}

          </div>

        </div>
      )}

      {/* =================================================
          FILTERS
      ================================================= */}

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
            Prevented Conflicts
          </h2>

          <p
            style={
              styles.sectionSubtitle
            }
          >
            Search and filter recorded
            conflict events.
          </p>
        </div>

        <div
          style={
            styles.filterControls
          }
        >

          <input
            type="text"
            value={search}
            onChange={(e) =>
              setSearch(
                e.target.value
              )
            }
            placeholder="Search event, resource or description..."
            style={
              styles.searchInput
            }
          />

          <select
            value={typeFilter}
            onChange={(e) =>
              setTypeFilter(
                e.target.value
              )
            }
            style={
              styles.filterSelect
            }
          >

            <option value="">
              All Conflict Types
            </option>

            {conflictTypes.map(
              (type) => (
                <option
                  key={type}
                  value={type}
                >
                  {type}
                </option>
              )
            )}

          </select>

        </div>

      </div>

      {/* =================================================
          RESULTS COUNT
      ================================================= */}

      <div
        style={
          styles.resultsHeader
        }
      >

        <span>
          Showing{" "}
          <strong>
            {
              filteredConflicts.length
            }
          </strong>{" "}
          of{" "}
          <strong>
            {conflicts.length}
          </strong>{" "}
          records
        </span>

        {(search ||
          typeFilter) && (
          <button
            onClick={() => {
              setSearch("");
              setTypeFilter("");
            }}
            style={
              styles.clearButton
            }
          >
            Clear filters
          </button>
        )}

      </div>

      {/* =================================================
          EMPTY STATE
      ================================================= */}

      {filteredConflicts.length ===
      0 ? (
        <div
          style={
            styles.emptyCard
          }
        >

          <div
            style={
              styles.emptyIcon
            }
          >
            ✓
          </div>

          <h3>
            {conflicts.length ===
            0
              ? "No prevented conflicts"
              : "No matching conflicts"}
          </h3>

          <p>
            {conflicts.length ===
            0
              ? "No conflict records are currently available."
              : "Try changing your search or conflict type filter."}
          </p>

        </div>
      ) : (
        /* =================================================
           CONFLICT LIST
        ================================================= */

        <div
          style={
            styles.conflictList
          }
        >

          {filteredConflicts.map(
            (conflict) => (
              <ConflictCard
                key={
                  conflict.id
                }
                conflict={
                  conflict
                }
                getEventName={
                  getEventName
                }
                getResourceName={
                  getResourceName
                }
                formatDate={
                  formatDate
                }
              />
            )
          )}

        </div>
      )}

    </div>
  );
}

// =======================================================
// SUMMARY CARD
// =======================================================

function SummaryCard({
  title,
  value,
  icon,
  color,
  description,
}) {
  return (
    <div
      style={{
        ...styles.summaryCard,
        borderTop:
          `3px solid ${color}`,
      }}
    >

      <div
        style={
          styles.summaryTop
        }
      >

        <div>
          <p
            style={
              styles.cardLabel
            }
          >
            {title}
          </p>

          <h2
            style={{
              ...styles.cardNumber,
              color,
            }}
          >
            {value}
          </h2>
        </div>

        <div
          style={{
            ...styles.summaryIcon,
            color,
            background:
              `${color}12`,
          }}
        >
          {icon}
        </div>

      </div>

      <p
        style={
          styles.cardDescription
        }
      >
        {description}
      </p>

    </div>
  );
}

// =======================================================
// CONFLICT CARD
// =======================================================

function ConflictCard({
  conflict,
  getEventName,
  getResourceName,
  formatDate,
}) {
  const conflictType =
    conflict.conflict_type ||
    "General";

  const isPrevented =
    conflict.status
      ?.toLowerCase()
      .includes("prevent");

  return (
    <div
      style={
        styles.conflictCard
      }
    >

      {/* CARD HEADER */}

      <div
        style={
          styles.conflictHeader
        }
      >

        <div
          style={
            styles.conflictHeaderLeft
          }
        >

          <div
            style={
              styles.conflictIcon
            }
          >
            ⚠
          </div>

          <div>

            <div
              style={
                styles.badgeRow
              }
            >

              <span
                style={
                  styles.typeBadge
                }
              >
                {conflictType}
              </span>

              <span
                style={
                  styles.statusBadge
                }
              >
                {conflict.status ||
                  "Prevented"}
              </span>

            </div>

            <h3
              style={
                styles.conflictTitle
              }
            >
              {conflictType} Conflict
            </h3>

          </div>

        </div>

      </div>

      {/* DETAILS */}

      <div
        style={
          styles.detailsGrid
        }
      >

        <DetailItem
          icon="📅"
          label="Event"
          value={getEventName(
            conflict.event_id
          )}
        />

        <DetailItem
          icon="⚡"
          label="Conflicting Event"
          value={
            conflict.conflicting_event_id
              ? getEventName(
                  conflict.conflicting_event_id
                )
              : "Not specified"
          }
        />

        <DetailItem
          icon="📦"
          label="Resource"
          value={
            conflict.resource_id
              ? getResourceName(
                  conflict.resource_id
                )
              : "Not specified"
          }
        />

        <DetailItem
          icon="🕒"
          label="Created At"
          value={formatDate(
            conflict.created_at
          )}
        />

      </div>

      {/* DESCRIPTION */}

      <div
        style={
          styles.descriptionBox
        }
      >

        <div
          style={
            styles.descriptionHeader
          }
        >
          <span>
            Conflict Explanation
          </span>

          <span
            style={
              isPrevented
                ? styles.preventedLabel
                : styles.recordedLabel
            }
          >
            {isPrevented
              ? "✓ Blocked"
              : "Recorded"}
          </span>
        </div>

        <p
          style={
            styles.description
          }
        >
          {conflict.description ||
            "No description provided."}
        </p>

      </div>

    </div>
  );
}

// =======================================================
// DETAIL ITEM
// =======================================================

function DetailItem({
  icon,
  label,
  value,
}) {
  return (
    <div
      style={
        styles.detailItem
      }
    >

      <div
        style={
          styles.detailIcon
        }
      >
        {icon}
      </div>

      <div>

        <p
          style={
            styles.detailLabel
          }
        >
          {label}
        </p>

        <p
          style={
            styles.detailValue
          }
        >
          {value}
        </p>

      </div>

    </div>
  );
}

// =======================================================
// STYLES
// =======================================================

const styles = {
  page: {
    marginLeft: "250px",
    padding: "32px",
    minHeight: "100vh",
    background: "#f8fafc",
    boxSizing: "border-box",
  },

  loadingPage: {
    marginLeft: "250px",
    minHeight: "100vh",
    background: "#f8fafc",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    color: "#64748b",
  },

  loadingIcon: {
    width: "58px",
    height: "58px",
    borderRadius: "16px",
    background: "#fff7ed",
    color: "#ea580c",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "25px",
    marginBottom: "14px",
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "20px",
    marginBottom: "25px",
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
    margin:
      "8px 0 0",
    color: "#64748b",
    fontSize: "15px",
  },

  refreshButton: {
    border: "none",
    borderRadius: "9px",
    padding: "11px 18px",
    background: "#2563eb",
    color: "white",
    fontSize: "14px",
    fontWeight: "650",
    cursor: "pointer",
    whiteSpace: "nowrap",
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
    background: "white",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "800",
  },

  statusBanner: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
    border:
      "1px solid",
    borderRadius: "14px",
    padding: "17px 19px",
    marginBottom: "20px",
  },

  statusIcon: {
    width: "42px",
    height: "42px",
    borderRadius: "12px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "19px",
    fontWeight: "800",
  },

  statusTitle: {
    color: "#1f2937",
    fontSize: "15px",
  },

  statusText: {
    margin:
      "4px 0 0",
    color: "#64748b",
    fontSize: "13px",
  },

  summaryGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "16px",
    marginBottom: "22px",
  },

  summaryCard: {
    background: "white",
    border:
      "1px solid #e2e8f0",
    borderRadius: "14px",
    padding: "20px",
    boxShadow:
      "0 2px 8px rgba(15, 23, 42, 0.04)",
  },

  summaryTop: {
    display: "flex",
    justifyContent:
      "space-between",
    alignItems: "flex-start",
  },

  cardLabel: {
    margin: 0,
    color: "#64748b",
    fontSize: "13px",
    fontWeight: "600",
  },

  cardNumber: {
    margin:
      "8px 0 0",
    fontSize: "29px",
    fontWeight: "750",
  },

  summaryIcon: {
    width: "40px",
    height: "40px",
    borderRadius: "10px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "18px",
    fontWeight: "800",
  },

  cardDescription: {
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
    padding: "23px",
    marginBottom: "20px",
    boxShadow:
      "0 2px 8px rgba(15, 23, 42, 0.04)",
  },

  sectionHeader: {
    marginBottom: "18px",
  },

  sectionTitle: {
    margin: 0,
    color: "#111827",
    fontSize: "20px",
  },

  sectionSubtitle: {
    margin:
      "5px 0 0",
    color: "#64748b",
    fontSize: "13px",
  },

  typeGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(190px, 1fr))",
    gap: "12px",
  },

  typeCard: {
    display: "flex",
    alignItems: "center",
    gap: "11px",
    border:
      "1px solid #e2e8f0",
    borderRadius: "11px",
    padding: "13px",
    background: "#f8fafc",
  },

  typeIcon: {
    width: "38px",
    height: "38px",
    borderRadius: "9px",
    background: "#fff7ed",
    color: "#ea580c",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  typeName: {
    fontSize: "13px",
    fontWeight: "700",
    color: "#334155",
  },

  typeCount: {
    marginTop: "3px",
    fontSize: "12px",
    color: "#94a3b8",
  },

  filterCard: {
    display: "grid",
    gridTemplateColumns:
      "minmax(220px, 1fr) minmax(400px, 2fr)",
    gap: "20px",
    alignItems: "center",
    background: "white",
    border:
      "1px solid #e2e8f0",
    borderRadius: "16px",
    padding: "20px 23px",
    marginBottom: "15px",
  },

  filterControls: {
    display: "grid",
    gridTemplateColumns:
      "2fr 1fr",
    gap: "10px",
  },

  searchInput: {
    width: "100%",
    boxSizing: "border-box",
    padding: "11px 13px",
    border:
      "1px solid #cbd5e1",
    borderRadius: "9px",
    outline: "none",
    fontSize: "13px",
  },

  filterSelect: {
    width: "100%",
    padding: "11px 13px",
    border:
      "1px solid #cbd5e1",
    borderRadius: "9px",
    background: "white",
    outline: "none",
    fontSize: "13px",
  },

  resultsHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    color: "#64748b",
    fontSize: "13px",
    marginBottom: "13px",
  },

  clearButton: {
    border: "none",
    background: "transparent",
    color: "#2563eb",
    cursor: "pointer",
    fontWeight: "600",
  },

  conflictList: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },

  conflictCard: {
    background: "white",
    border:
      "1px solid #e2e8f0",
    borderLeft:
      "4px solid #f97316",
    borderRadius: "14px",
    padding: "21px",
    boxShadow:
      "0 2px 8px rgba(15, 23, 42, 0.04)",
  },

  conflictHeader: {
    display: "flex",
    justifyContent:
      "space-between",
    alignItems: "flex-start",
    marginBottom: "20px",
  },

  conflictHeaderLeft: {
    display: "flex",
    alignItems: "flex-start",
    gap: "12px",
  },

  conflictIcon: {
    width: "44px",
    height: "44px",
    borderRadius: "11px",
    background: "#fff7ed",
    color: "#ea580c",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "19px",
  },

  badgeRow: {
    display: "flex",
    gap: "7px",
    flexWrap: "wrap",
  },

  typeBadge: {
    display: "inline-flex",
    alignItems: "center",
    background: "#eff6ff",
    color: "#1d4ed8",
    padding:
      "5px 9px",
    borderRadius: "999px",
    fontSize: "11px",
    fontWeight: "700",
  },

  statusBadge: {
    display: "inline-flex",
    alignItems: "center",
    background: "#dcfce7",
    color: "#166534",
    padding:
      "5px 9px",
    borderRadius: "999px",
    fontSize: "11px",
    fontWeight: "700",
  },

  conflictTitle: {
    margin:
      "8px 0 0",
    color: "#111827",
    fontSize: "19px",
  },

  detailsGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "12px",
    marginBottom: "18px",
  },

  detailItem: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "12px",
    background: "#f8fafc",
    borderRadius: "10px",
  },

  detailIcon: {
    width: "32px",
    height: "32px",
    borderRadius: "8px",
    background: "white",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "14px",
  },

  detailLabel: {
    margin: 0,
    color: "#94a3b8",
    fontSize: "10px",
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },

  detailValue: {
    margin:
      "3px 0 0",
    color: "#334155",
    fontSize: "13px",
    fontWeight: "600",
  },

  descriptionBox: {
    background: "#f8fafc",
    borderRadius: "10px",
    padding: "14px",
  },

  descriptionHeader: {
    display: "flex",
    justifyContent:
      "space-between",
    alignItems: "center",
    gap: "10px",
    marginBottom: "7px",
    color: "#475569",
    fontSize: "12px",
    fontWeight: "700",
  },

  preventedLabel: {
    color: "#15803d",
    background: "#dcfce7",
    padding:
      "4px 8px",
    borderRadius: "999px",
    fontSize: "10px",
  },

  recordedLabel: {
    color: "#b45309",
    background: "#fef3c7",
    padding:
      "4px 8px",
    borderRadius: "999px",
    fontSize: "10px",
  },

  description: {
    margin: 0,
    color: "#475569",
    lineHeight: "1.6",
    fontSize: "13px",
  },

  emptyCard: {
    background: "white",
    border:
      "1px solid #e2e8f0",
    borderRadius: "16px",
    padding: "50px 20px",
    textAlign: "center",
  },

  emptyIcon: {
    width: "58px",
    height: "58px",
    borderRadius: "16px",
    background: "#dcfce7",
    color: "#16a34a",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin:
      "0 auto 13px",
    fontSize: "25px",
    fontWeight: "800",
  },
};

export default Conflicts;
