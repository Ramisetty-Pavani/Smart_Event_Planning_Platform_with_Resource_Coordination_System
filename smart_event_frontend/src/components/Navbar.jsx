import { useState, useRef, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

function Navbar({ user, onLogout }) {
  const location = useLocation();
  const navigate = useNavigate();

  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);

  const role = user?.role;

  const isAdmin = role === "Admin";
  const isOrganizer = role === "Organizer";
  const isStaff = role === "Staff";

  const managementAccess = isAdmin || isOrganizer;
  const staffAccess = isAdmin || isOrganizer || isStaff;

  const isActive = (path) => {
    return location.pathname === path;
  };

  const linkStyle = (path) => ({
    ...styles.link,
    ...(isActive(path) ? styles.activeLink : {}),
  });

  // Close profile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        profileRef.current &&
        !profileRef.current.contains(event.target)
      ) {
        setProfileOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );
    };
  }, []);

  const openProfile = () => {
    setProfileOpen(false);
    navigate("/profile");
  };

  const openChangePassword = () => {
    setProfileOpen(false);
    navigate("/change-password");
  };

  const openForgotPassword = () => {
    setProfileOpen(false);
    navigate("/forgot-password");
  };

  const handleLogout = () => {
    setProfileOpen(false);
    onLogout();
  };

  return (
    <aside style={styles.sidebar}>

      {/* Logo */}
      <div style={styles.logoSection}>

        <div style={styles.logoIcon}>
          SE
        </div>

        <div>
          <div style={styles.logoText}>
            Smart Event
          </div>

          <div style={styles.logoSubtitle}>
            Event Management
          </div>
        </div>

      </div>

      {/* User Profile */}
      <div
        ref={profileRef}
        style={styles.profileContainer}
      >

        <button
          type="button"
          onClick={() => setProfileOpen(!profileOpen)}
          style={styles.userCard}
        >

          <div style={styles.avatar}>
            {(user?.full_name || user?.username || "U")
              .charAt(0)
              .toUpperCase()}
          </div>

          <div style={styles.userInfo}>

            <div style={styles.userName}>
              {user?.full_name || user?.username}
            </div>

            <div style={styles.userRole}>
              {role}
            </div>

          </div>

          <span style={styles.profileArrow}>
            {profileOpen ? "▲" : "▼"}
          </span>

        </button>

        {/* Profile Dropdown */}
        {profileOpen && (
          <div style={styles.profileMenu}>

            <div style={styles.profileHeader}>

              <div style={styles.menuAvatar}>
                {(user?.full_name || user?.username || "U")
                  .charAt(0)
                  .toUpperCase()}
              </div>

              <div>
                <div style={styles.menuName}>
                  {user?.full_name || user?.username}
                </div>

                <div style={styles.menuRole}>
                  {role}
                </div>
              </div>

            </div>

            <div style={styles.menuDivider} />

            <button
              onClick={openProfile}
              style={styles.menuButton}
            >
              <span>👤</span>
              My Profile
            </button>

            <button
              onClick={openChangePassword}
              style={styles.menuButton}
            >
              <span>🔐</span>
              Change Password
            </button>


            <div style={styles.menuDivider} />

            <button
              onClick={handleLogout}
              style={styles.menuLogout}
            >
              <span>↪</span>
              Logout
            </button>

          </div>
        )}

      </div>

      {/* Navigation */}
      <div style={styles.navigation}>

        <div style={styles.sectionTitle}>
          MAIN
        </div>

        <Link
          to="/dashboard"
          style={linkStyle("/dashboard")}
        >
          <span>▦</span>
          Dashboard
        </Link>

        <Link
          to="/events"
          style={linkStyle("/events")}
        >
          <span>◫</span>
          Events
        </Link>

        <Link
          to="/registrations"
          style={linkStyle("/registrations")}
        >
          <span>♙</span>
          Registrations
        </Link>

        {/* Management */}
        {managementAccess && (
          <>
            <div style={styles.sectionTitle}>
              MANAGEMENT
            </div>

            <Link
              to="/resources"
              style={linkStyle("/resources")}
            >
              <span>▤</span>
              Resources
            </Link>

            <Link
              to="/allocations"
              style={linkStyle("/allocations")}
            >
              <span>◈</span>
              Allocations
            </Link>

            <Link
              to="/vendors"
              style={linkStyle("/vendors")}
            >
              <span>▣</span>
              Vendors
            </Link>

            <Link
              to="/budgets"
              style={linkStyle("/budgets")}
            >
              <span>₹</span>
              Budgets
            </Link>

            <Link
              to="/sponsors"
              style={linkStyle("/sponsors")}
            >
              <span>◇</span>
              Sponsors
            </Link>

            <Link
              to="/conflicts"
              style={linkStyle("/conflicts")}
            >
              <span>⚠</span>
              Conflicts
            </Link>
          </>
        )}

        {/* Operations */}
        {staffAccess && (
          <>
            <div style={styles.sectionTitle}>
              OPERATIONS
            </div>

            <Link
              to="/scanner"
              style={linkStyle("/scanner")}
            >
              <span>▣</span>
              QR Scanner
            </Link>
          </>
        )}

      </div>

      {/* Bottom Logout */}
      <div style={styles.bottomSection}>

        <button
          onClick={handleLogout}
          style={styles.logoutButton}
        >
          <span>↪</span>
          Logout
        </button>

      </div>

    </aside>
  );
}

const styles = {

  sidebar: {
    width: "250px",
    minHeight: "100vh",
    background: "#111827",
    color: "white",
    position: "fixed",
    left: 0,
    top: 0,
    display: "flex",
    flexDirection: "column",
    boxSizing: "border-box",
    padding: "22px 15px",
    zIndex: 100,
  },

  logoSection: {
    display: "flex",
    alignItems: "center",
    gap: "11px",
    padding: "4px 10px 25px",
    borderBottom: "1px solid #273244",
  },

  logoIcon: {
    width: "38px",
    height: "38px",
    borderRadius: "10px",
    background: "#2563eb",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "13px",
    fontWeight: "700",
  },

  logoText: {
    fontSize: "17px",
    fontWeight: "700",
  },

  logoSubtitle: {
    fontSize: "10px",
    color: "#9ca3af",
    marginTop: "2px",
  },

  profileContainer: {
    position: "relative",
  },

  userCard: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "16px 10px",
    marginBottom: "10px",
    background: "transparent",
    border: "none",
    color: "white",
    cursor: "pointer",
    textAlign: "left",
  },

  avatar: {
    width: "38px",
    height: "38px",
    borderRadius: "50%",
    background: "#dbeafe",
    color: "#1d4ed8",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "700",
    fontSize: "15px",
    flexShrink: 0,
  },

  userInfo: {
    minWidth: 0,
    flex: 1,
  },

  userName: {
    fontSize: "13px",
    fontWeight: "600",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    maxWidth: "145px",
  },

  userRole: {
    fontSize: "11px",
    color: "#9ca3af",
    marginTop: "3px",
  },

  profileArrow: {
    fontSize: "9px",
    color: "#9ca3af",
  },

  profileMenu: {
    position: "absolute",
    left: "8px",
    right: "8px",
    top: "68px",
    background: "#ffffff",
    color: "#111827",
    borderRadius: "12px",
    boxShadow: "0 15px 35px rgba(0,0,0,0.3)",
    padding: "8px",
    zIndex: 1000,
  },

  profileHeader: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "10px",
  },

  menuAvatar: {
    width: "36px",
    height: "36px",
    borderRadius: "50%",
    background: "#dbeafe",
    color: "#1d4ed8",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "700",
  },

  menuName: {
    fontSize: "13px",
    fontWeight: "700",
  },

  menuRole: {
    fontSize: "11px",
    color: "#6b7280",
    marginTop: "2px",
  },

  menuDivider: {
    height: "1px",
    background: "#e5e7eb",
    margin: "5px 0",
  },

  menuButton: {
    width: "100%",
    border: "none",
    background: "transparent",
    padding: "10px",
    borderRadius: "8px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    textAlign: "left",
    fontSize: "13px",
    color: "#374151",
  },

  menuLogout: {
    width: "100%",
    border: "none",
    background: "#fff1f2",
    color: "#dc2626",
    padding: "10px",
    borderRadius: "8px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    textAlign: "left",
    fontSize: "13px",
    fontWeight: "600",
  },

  navigation: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    overflowY: "auto",
  },

  sectionTitle: {
    fontSize: "10px",
    color: "#6b7280",
    fontWeight: "700",
    letterSpacing: "1px",
    padding: "14px 10px 6px",
  },

  link: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "10px 12px",
    borderRadius: "8px",
    color: "#d1d5db",
    textDecoration: "none",
    fontSize: "13px",
    transition: "0.2s",
  },

  activeLink: {
    background: "#2563eb",
    color: "white",
    fontWeight: "600",
  },

  bottomSection: {
    marginTop: "auto",
    borderTop: "1px solid #273244",
    paddingTop: "15px",
  },

  logoutButton: {
    width: "100%",
    padding: "10px 12px",
    border: "none",
    borderRadius: "8px",
    background: "transparent",
    color: "#d1d5db",
    textAlign: "left",
    cursor: "pointer",
    fontSize: "13px",
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
};

export default Navbar;