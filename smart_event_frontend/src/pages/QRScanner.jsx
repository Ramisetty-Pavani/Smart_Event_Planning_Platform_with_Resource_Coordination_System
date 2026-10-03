import { useEffect, useRef, useState } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";

const EVENTS_URL =
  "http://127.0.0.1:8000/api/events/";

const SCAN_URL =
  "http://127.0.0.1:8000/api/registrations/scan-attendance/";

function QRScanner() {
  const [events, setEvents] = useState([]);
  const [eventId, setEventId] = useState("");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [loadingEvents, setLoadingEvents] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [processing, setProcessing] = useState(false);

  const [lastScan, setLastScan] = useState(null);

  const processingRef = useRef(false);

  // =====================================================
  // LOAD EVENTS
  // =====================================================

  useEffect(() => {
    const fetchEvents = async () => {
      setLoadingEvents(true);
      setError("");

      try {
        const response = await fetch(EVENTS_URL);

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.message || "Could not load events"
          );
        }

        const eventList = Array.isArray(data)
          ? data
          : data.events || [];

        setEvents(eventList);
      } catch (err) {
        setError(
          err.message || "Could not load events"
        );
      } finally {
        setLoadingEvents(false);
      }
    };

    fetchEvents();
  }, []);

  // =====================================================
  // SELECTED EVENT
  // =====================================================

  const selectedEvent = events.find(
    (event) =>
      Number(event.id) === Number(eventId)
  );

  // =====================================================
  // QR SCANNER
  // =====================================================

  useEffect(() => {
    if (!eventId) {
      setScanning(false);
      return;
    }

    setMessage("");
    setError("");
    setScanning(true);

    processingRef.current = false;

    const scanner = new Html5QrcodeScanner(
      "qr-reader",
      {
        fps: 10,

        qrbox: {
          width: 280,
          height: 280,
        },

        rememberLastUsedCamera: true,

        supportedScanTypes: [0],
      },
      false
    );

    const handleScan = async (qrToken) => {
      if (processingRef.current) {
        return;
      }

      processingRef.current = true;

      setProcessing(true);
      setMessage("");
      setError("");

      try {
        const response = await fetch(SCAN_URL, {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            qr_token: qrToken,
            event_id: Number(eventId),
          }),
        });

        const data = await response.json();

        if (response.ok) {
          const registration = data.registration;

          const attendeeName =
            registration?.name || "Participant";

          setMessage(
            `${attendeeName} marked Present successfully`
          );

          setLastScan({
            name: attendeeName,

            email:
              registration?.email || "",

            event:
              selectedEvent?.name ||
              "Selected Event",

            time: new Date().toLocaleTimeString(
              "en-IN"
            ),
          });
        } else {
          setError(
            data.message || "QR scan failed"
          );
        }
      } catch (err) {
        setError("Could not connect to Django");
      } finally {
        setProcessing(false);

        setTimeout(() => {
          processingRef.current = false;
        }, 1200);
      }
    };

    const handleScanError = () => {
      // html5-qrcode continuously calls this
      // while searching for a QR code.
      // We don't display those messages.
    };

    scanner.render(
      handleScan,
      handleScanError
    );

    return () => {
      setScanning(false);

      processingRef.current = false;

      scanner.clear().catch(() => {});
    };
  }, [eventId]);

  // =====================================================
  // CHANGE EVENT
  // =====================================================

  const handleEventChange = (event) => {
    setEventId(event.target.value);

    setMessage("");
    setError("");
    setLastScan(null);
  };

  // =====================================================
  // RESET SCANNER
  // =====================================================

  const resetScanner = () => {
    setEventId("");
    setMessage("");
    setError("");
    setLastScan(null);
    setProcessing(false);
  };

  return (
    <div style={styles.page}>
      {/* =================================================
          HEADER
      ================================================= */}

      <div style={styles.header}>
        <div>
          <div style={styles.eyebrow}>
            ATTENDANCE MANAGEMENT
          </div>

          <h1 style={styles.title}>
            QR Attendance Scanner
          </h1>

          <p style={styles.subtitle}>
            Scan participant QR tickets to
            securely mark attendance for an
            event.
          </p>
        </div>

        <div style={styles.headerIcon}>
          QR
        </div>
      </div>

      {/* =================================================
          ERROR ALERT
      ================================================= */}

      {error && (
        <div style={styles.errorAlert}>
          <div style={styles.alertIcon}>
            !
          </div>

          <div>
            <strong>Scan Error</strong>

            <div>{error}</div>
          </div>
        </div>
      )}

      {/* =================================================
          SUCCESS ALERT
      ================================================= */}

      {message && (
        <div style={styles.successAlert}>
          <div style={styles.successIcon}>
            ✓
          </div>

          <div>
            <strong>
              Attendance Recorded
            </strong>

            <div>{message}</div>
          </div>
        </div>
      )}

      {/* =================================================
          EVENT SELECTION
      ================================================= */}

      <div style={styles.sectionCard}>
        <div style={styles.sectionHeader}>
          <div>
            <h2 style={styles.sectionTitle}>
              Select Event
            </h2>

            <p style={styles.sectionSubtitle}>
              Choose the event before scanning
              participant tickets.
            </p>
          </div>

          <div style={styles.sectionIcon}>
            📅
          </div>
        </div>

        <div style={styles.eventSelectorRow}>
          <select
            value={eventId}
            onChange={handleEventChange}
            disabled={loadingEvents}
            style={styles.eventSelect}
          >
            <option value="">
              {loadingEvents
                ? "Loading events..."
                : "Select an event"}
            </option>

            {events.map((event) => (
              <option
                key={event.id}
                value={event.id}
              >
                {event.name}
                {event.date
                  ? ` — ${event.date}`
                  : ""}
              </option>
            ))}
          </select>

          {eventId && (
            <button
              type="button"
              onClick={resetScanner}
              style={styles.changeButton}
            >
              Change Event
            </button>
          )}
        </div>

        {/* SELECTED EVENT */}

        {selectedEvent && (
          <div style={styles.selectedEvent}>
            <div style={styles.eventAvatar}>
              📅
            </div>

            <div>
              <strong
                style={styles.selectedEventName}
              >
                {selectedEvent.name}
              </strong>

              <div style={styles.eventDetails}>
                {selectedEvent.date &&
                  `Date: ${selectedEvent.date}`}

                {selectedEvent.location &&
                  ` • ${selectedEvent.location}`}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* =================================================
          SCANNER
      ================================================= */}

      {eventId ? (
        <div style={styles.scannerLayout}>
          {/* =================================================
              CAMERA CARD
          ================================================= */}

          <div style={styles.scannerCard}>
            <div style={styles.scannerHeader}>
              <div>
                <h2 style={styles.sectionTitle}>
                  Scan Participant QR
                </h2>

                <p style={styles.sectionSubtitle}>
                  Position the participant's QR
                  ticket inside the frame.
                </p>
              </div>

              <div
                style={
                  scanning
                    ? styles.liveBadge
                    : styles.offlineBadge
                }
              >
                <span style={styles.statusDot} />

                {scanning
                  ? "Scanner Active"
                  : "Scanner Off"}
              </div>
            </div>

            {/* CAMERA */}

            <div style={styles.cameraContainer}>
              <div
                id="qr-reader"
                style={styles.qrReader}
              />

              {processing && (
                <div
                  style={
                    styles.processingOverlay
                  }
                >
                  <div
                    style={
                      styles.processingSpinner
                    }
                  />

                  <strong>
                    Verifying QR...
                  </strong>

                  <span>
                    Please wait
                  </span>
                </div>
              )}
            </div>

            {/* SCANNING TIP */}

            <div style={styles.scannerTip}>
              <div style={styles.tipIcon}>
                💡
              </div>

              <div>
                <strong>
                  Scanning tip
                </strong>

                <p
                  style={
                    styles.scannerTipText
                  }
                >
                  Keep the QR code clearly
                  visible and well lit.
                  Attendance is marked only
                  after the server validates
                  the ticket.
                </p>
              </div>
            </div>
          </div>

          {/* =================================================
              RIGHT SIDE
          ================================================= */}

          <div style={styles.sideColumn}>
            {/* EVENT CARD */}

            <div style={styles.infoCard}>
              <div style={styles.infoIcon}>
                📅
              </div>

              <div>
                <p style={styles.infoLabel}>
                  SCANNING FOR
                </p>

                <h3 style={styles.infoTitle}>
                  {selectedEvent?.name ||
                    "Selected Event"}
                </h3>
              </div>
            </div>

            {/* LAST SCAN */}

            <div style={styles.lastScanCard}>
              <div style={styles.lastScanHeader}>
                <h3
                  style={styles.lastScanTitle}
                >
                  Last Scan
                </h3>

                {lastScan && (
                  <span
                    style={
                      styles.presentBadge
                    }
                  >
                    Present
                  </span>
                )}
              </div>

              {lastScan ? (
                <div>
                  <div
                    style={
                      styles.attendeeRow
                    }
                  >
                    <div
                      style={
                        styles.attendeeAvatar
                      }
                    >
                      {lastScan.name
                        .charAt(0)
                        .toUpperCase()}
                    </div>

                    <div>
                      <strong>
                        {lastScan.name}
                      </strong>

                      <p
                        style={
                          styles.attendeeEmail
                        }
                      >
                        {lastScan.email ||
                          "Email not available"}
                      </p>
                    </div>
                  </div>

                  <div
                    style={styles.scanTime}
                  >
                    Scanned at{" "}
                    {lastScan.time}
                  </div>
                </div>
              ) : (
                <div style={styles.noScan}>
                  <div
                    style={
                      styles.noScanIcon
                    }
                  >
                    QR
                  </div>

                  <p
                    style={
                      styles.noScanText
                    }
                  >
                    No participant scanned
                    yet.
                  </p>

                  <span>
                    The latest successful
                    attendance scan will
                    appear here.
                  </span>
                </div>
              )}
            </div>

            {/* VALIDATION INFO */}

            <div
              style={styles.validationCard}
            >
              <h3
                style={
                  styles.validationTitle
                }
              >
                Attendance Validation
              </h3>

              <ValidationItem
                text="QR token is verified"
              />

              <ValidationItem
                text="Event is verified"
              />

              <ValidationItem
                text="Cancelled registrations are rejected"
              />

              <ValidationItem
                text="Duplicate attendance is rejected"
              />
            </div>
          </div>
        </div>
      ) : (
        /* =================================================
           NO EVENT SELECTED
        ================================================= */

        <div style={styles.emptyScanner}>
          <div
            style={
              styles.emptyScannerIcon
            }
          >
            QR
          </div>

          <h2>
            Select an Event to Start
          </h2>

          <p>
            Choose an event above to
            activate the QR attendance
            scanner.
          </p>
        </div>
      )}
    </div>
  );
}

// =======================================================
// VALIDATION ITEM
// =======================================================

function ValidationItem({ text }) {
  return (
    <div style={styles.validationItem}>
      <span
        style={styles.validationCheck}
      >
        ✓
      </span>

      <span>{text}</span>
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
    margin: "8px 0 0",
    color: "#64748b",
    fontSize: "15px",
  },

  headerIcon: {
    width: "62px",
    height: "62px",
    borderRadius: "16px",
    background: "#eff6ff",
    color: "#2563eb",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "800",
    fontSize: "20px",
  },

  errorAlert: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    background: "#fef2f2",
    border: "1px solid #fecaca",
    color: "#b91c1c",
    padding: "14px 16px",
    borderRadius: "12px",
    marginBottom: "18px",
  },

  successAlert: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    background: "#f0fdf4",
    border: "1px solid #bbf7d0",
    color: "#166534",
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

  successIcon: {
    width: "30px",
    height: "30px",
    borderRadius: "50%",
    background: "white",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#16a34a",
    fontWeight: "800",
  },

  sectionCard: {
    background: "white",
    border: "1px solid #e2e8f0",
    borderRadius: "16px",
    padding: "23px",
    marginBottom: "20px",
    boxShadow:
      "0 2px 8px rgba(15, 23, 42, 0.04)",
  },

  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "18px",
  },

  sectionTitle: {
    margin: 0,
    color: "#111827",
    fontSize: "20px",
  },

  sectionSubtitle: {
    margin: "5px 0 0",
    color: "#64748b",
    fontSize: "13px",
  },

  sectionIcon: {
    width: "42px",
    height: "42px",
    borderRadius: "10px",
    background: "#eff6ff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  eventSelectorRow: {
    display: "flex",
    gap: "10px",
    alignItems: "center",
  },

  eventSelect: {
    flex: 1,
    minWidth: 0,
    padding: "12px 13px",
    border: "1px solid #cbd5e1",
    borderRadius: "9px",
    background: "white",
    fontSize: "14px",
    outline: "none",
  },

  changeButton: {
    border: "1px solid #cbd5e1",
    background: "white",
    color: "#475569",
    borderRadius: "9px",
    padding: "11px 15px",
    cursor: "pointer",
    fontWeight: "600",
    whiteSpace: "nowrap",
  },

  selectedEvent: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginTop: "16px",
    padding: "13px",
    borderRadius: "10px",
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
  },

  eventAvatar: {
    width: "38px",
    height: "38px",
    borderRadius: "9px",
    background: "#eff6ff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  selectedEventName: {
    color: "#1e293b",
  },

  eventDetails: {
    color: "#64748b",
    fontSize: "12px",
    marginTop: "3px",
  },

  scannerLayout: {
    display: "grid",
    gridTemplateColumns:
      "minmax(500px, 1.6fr) minmax(280px, 0.8fr)",
    gap: "20px",
    alignItems: "start",
  },

  scannerCard: {
    background: "white",
    border: "1px solid #e2e8f0",
    borderRadius: "16px",
    padding: "23px",
    boxShadow:
      "0 2px 8px rgba(15, 23, 42, 0.04)",
  },

  scannerHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "15px",
    marginBottom: "18px",
  },

  liveBadge: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "7px 10px",
    borderRadius: "999px",
    background: "#dcfce7",
    color: "#166534",
    fontSize: "11px",
    fontWeight: "700",
    whiteSpace: "nowrap",
  },

  offlineBadge: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "7px 10px",
    borderRadius: "999px",
    background: "#f1f5f9",
    color: "#64748b",
    fontSize: "11px",
    fontWeight: "700",
  },

  statusDot: {
    width: "7px",
    height: "7px",
    borderRadius: "50%",
    background: "#16a34a",
  },

  cameraContainer: {
    position: "relative",
    background: "#0f172a",
    borderRadius: "14px",
    padding: "15px",
    minHeight: "390px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },

  qrReader: {
    width: "100%",
    maxWidth: "520px",
  },

  processingOverlay: {
    position: "absolute",
    inset: 0,
    background:
      "rgba(15, 23, 42, 0.86)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    color: "white",
    gap: "7px",
    zIndex: 5,
  },

  processingSpinner: {
    width: "30px",
    height: "30px",
    border:
      "3px solid rgba(255,255,255,0.3)",
    borderTop:
      "3px solid white",
    borderRadius: "50%",
    marginBottom: "8px",
  },

  scannerTip: {
    display: "flex",
    gap: "11px",
    marginTop: "15px",
    padding: "13px",
    borderRadius: "10px",
    background: "#eff6ff",
    color: "#334155",
  },

  tipIcon: {
    fontSize: "18px",
  },

  scannerTipText: {
    margin: 0,
    marginTop: "4px",
    fontSize: "12px",
    lineHeight: "1.5",
    color: "#64748b",
  },

  sideColumn: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },

  infoCard: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    background: "#2563eb",
    color: "white",
    borderRadius: "14px",
    padding: "18px",
  },

  infoIcon: {
    width: "42px",
    height: "42px",
    borderRadius: "10px",
    background:
      "rgba(255,255,255,0.15)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  infoLabel: {
    margin: 0,
    fontSize: "10px",
    opacity: 0.75,
    letterSpacing: "1px",
    fontWeight: "700",
  },

  infoTitle: {
    margin: "4px 0 0",
    fontSize: "16px",
  },

  lastScanCard: {
    background: "white",
    border: "1px solid #e2e8f0",
    borderRadius: "14px",
    padding: "18px",
  },

  lastScanHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "15px",
  },

  lastScanTitle: {
    margin: 0,
    color: "#111827",
    fontSize: "16px",
  },

  presentBadge: {
    background: "#dcfce7",
    color: "#166534",
    padding: "5px 9px",
    borderRadius: "999px",
    fontSize: "10px",
    fontWeight: "700",
  },

  attendeeRow: {
    display: "flex",
    alignItems: "center",
    gap: "11px",
  },

  attendeeAvatar: {
    width: "42px",
    height: "42px",
    borderRadius: "11px",
    background: "#eff6ff",
    color: "#2563eb",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "800",
  },

  attendeeEmail: {
    margin: "3px 0 0",
    color: "#64748b",
    fontSize: "12px",
  },

  scanTime: {
    marginTop: "13px",
    paddingTop: "11px",
    borderTop: "1px solid #f1f5f9",
    color: "#94a3b8",
    fontSize: "11px",
  },

  noScan: {
    textAlign: "center",
    padding: "15px 5px",
    color: "#64748b",
  },

  noScanIcon: {
    width: "46px",
    height: "46px",
    borderRadius: "12px",
    background: "#f1f5f9",
    color: "#64748b",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 10px",
    fontWeight: "800",
    fontSize: "13px",
  },

  noScanText: {
    margin: "0 0 4px",
    fontWeight: "600",
    color: "#475569",
  },

  validationCard: {
    background: "white",
    border: "1px solid #e2e8f0",
    borderRadius: "14px",
    padding: "18px",
  },

  validationTitle: {
    margin: "0 0 13px",
    fontSize: "15px",
    color: "#111827",
  },

  validationItem: {
    display: "flex",
    alignItems: "center",
    gap: "9px",
    padding: "8px 0",
    color: "#475569",
    fontSize: "12px",
    borderBottom:
      "1px solid #f1f5f9",
  },

  validationCheck: {
    width: "20px",
    height: "20px",
    borderRadius: "50%",
    background: "#dcfce7",
    color: "#16a34a",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "11px",
    fontWeight: "800",
    flexShrink: 0,
  },

  emptyScanner: {
    background: "white",
    border: "1px solid #e2e8f0",
    borderRadius: "16px",
    padding: "60px 20px",
    textAlign: "center",
    boxShadow:
      "0 2px 8px rgba(15, 23, 42, 0.04)",
  },

  emptyScannerIcon: {
    width: "70px",
    height: "70px",
    borderRadius: "20px",
    background: "#eff6ff",
    color: "#2563eb",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 15px",
    fontSize: "20px",
    fontWeight: "800",
  },
};

export default QRScanner;