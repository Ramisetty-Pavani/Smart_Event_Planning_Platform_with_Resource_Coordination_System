import { useState } from "react";

function Login({ onLogin }) {
  const [form, setForm] = useState({
    username_or_email: "",
    password: "",
  });

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (event) => {
    setForm({
      ...form,
      [event.target.name]: event.target.value,
    });
  };

  const handleLogin = async (event) => {
    event.preventDefault();

    setMessage("");
    setError("");
    setLoading(true);

    try {
      const response = await fetch(
        "http://localhost:8000/api/accounts/login/",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify(form),
        }
      );

      const data = await response.json();

      if (response.ok) {
        setMessage("Login successful");

        localStorage.setItem(
          "user",
          JSON.stringify(data.user)
        );

        onLogin(data.user);
      } else {
        setError(data.message || "Login failed");
      }
    } catch (error) {
      setError("Could not connect to Django");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>

      {/* Left Section */}
      <div style={styles.leftSection}>

        <div style={styles.logo}>
          Smart Event
        </div>

        <div style={styles.leftContent}>
          <h1 style={styles.mainTitle}>
            Plan smarter.
            <br />
            Manage better.
            <br />
            <span style={styles.highlight}>
              Events made simple.
            </span>
          </h1>

          <p style={styles.description}>
            Coordinate events, resources, vendors,
            registrations and budgets from one
            centralized platform.
          </p>

          <div style={styles.features}>
            <div>✓ Event & Resource Coordination</div>
            <div>✓ Vendor & Budget Management</div>
            <div>✓ QR-Based Attendance</div>
            <div>✓ Conflict Detection</div>
          </div>
        </div>

      </div>

      {/* Right Section */}
      <div style={styles.rightSection}>

        <div style={styles.loginCard}>

          <div style={styles.icon}>
            🔐
          </div>

          <h2 style={styles.title}>
            Welcome back
          </h2>

          <p style={styles.subtitle}>
            Sign in to continue to Smart Event
          </p>

          <form onSubmit={handleLogin}>

            {/* Username */}
            <div style={styles.inputGroup}>
              <label style={styles.label}>
                Username or Email
              </label>

              <input
                type="text"
                name="username_or_email"
                value={form.username_or_email}
                onChange={handleChange}
                placeholder="Enter username or email"
                required
                style={styles.input}
              />
            </div>

            {/* Password */}
            <div style={styles.inputGroup}>
              <label style={styles.label}>
                Password
              </label>

              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder="Enter your password"
                required
                style={styles.input}
              />
            </div>

            {/* Forgot Password */}
            <div style={styles.forgotPassword}>
              <a
                href="/forgot-password"
                style={styles.forgotLink}
              >
                Forgot Password?
              </a>
            </div>

            {/* Error */}
            {error && (
              <div style={styles.error}>
                {error}
              </div>
            )}

            {/* Success */}
            {message && (
              <div style={styles.success}>
                {message}
              </div>
            )}

            {/* Login Button */}
            <button
              type="submit"
              disabled={loading}
              style={{
                ...styles.button,
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading
                ? "Signing in..."
                : "Sign In"}
            </button>

          </form>

          <div style={styles.registerText}>
            Don't have an account?{" "}
            <a
              href="/register"
              style={styles.registerLink}
            >
              Create an account
            </a>
          </div>

        </div>

      </div>

    </div>
  );
}

const styles = {

  page: {
    minHeight: "100vh",
    display: "flex",
    fontFamily:
      "Inter, Arial, sans-serif",
    background: "#f5f7fb",
  },

  leftSection: {
    width: "52%",
    minHeight: "100vh",
    padding: "45px 70px",
    boxSizing: "border-box",
    background:
      "linear-gradient(135deg, #172554, #2563eb)",
    color: "white",
    display: "flex",
    flexDirection: "column",
  },

  logo: {
    fontSize: "26px",
    fontWeight: "700",
    letterSpacing: "-0.5px",
  },

  leftContent: {
    maxWidth: "600px",
    margin: "auto 0",
  },

  mainTitle: {
    fontSize: "52px",
    lineHeight: "1.12",
    margin: "0 0 25px 0",
    fontWeight: "700",
    letterSpacing: "-1.5px",
  },

  highlight: {
    color: "#bfdbfe",
  },

  description: {
    fontSize: "18px",
    lineHeight: "1.7",
    color: "#dbeafe",
    maxWidth: "520px",
    marginBottom: "30px",
  },

  features: {
    display: "flex",
    flexDirection: "column",
    gap: "14px",
    fontSize: "15px",
    color: "#eff6ff",
  },

  rightSection: {
    width: "48%",
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "30px",
    boxSizing: "border-box",
  },

  loginCard: {
    width: "100%",
    maxWidth: "430px",
    background: "white",
    padding: "42px",
    borderRadius: "18px",
    boxShadow:
      "0 15px 45px rgba(15, 23, 42, 0.12)",
    boxSizing: "border-box",
  },

  icon: {
    width: "52px",
    height: "52px",
    borderRadius: "14px",
    background: "#eff6ff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "24px",
    marginBottom: "20px",
  },

  title: {
    fontSize: "30px",
    margin: "0 0 8px 0",
    color: "#111827",
  },

  subtitle: {
    margin: "0 0 30px 0",
    color: "#6b7280",
    fontSize: "15px",
  },

  inputGroup: {
    marginBottom: "20px",
  },

  label: {
    display: "block",
    fontSize: "14px",
    fontWeight: "600",
    color: "#374151",
    marginBottom: "8px",
  },

  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: "13px 14px",
    border: "1px solid #d1d5db",
    borderRadius: "9px",
    fontSize: "15px",
    outline: "none",
    background: "#ffffff",
  },

  forgotPassword: {
    textAlign: "right",
    marginTop: "-8px",
    marginBottom: "18px",
  },

  forgotLink: {
    color: "#2563eb",
    fontSize: "14px",
    fontWeight: "600",
    textDecoration: "none",
  },

  button: {
    width: "100%",
    padding: "14px",
    marginTop: "8px",
    border: "none",
    borderRadius: "9px",
    background: "#2563eb",
    color: "white",
    fontSize: "16px",
    fontWeight: "600",
    cursor: "pointer",
  },

  error: {
    background: "#fef2f2",
    color: "#b91c1c",
    padding: "11px",
    borderRadius: "8px",
    fontSize: "14px",
    marginBottom: "15px",
  },

  success: {
    background: "#f0fdf4",
    color: "#15803d",
    padding: "11px",
    borderRadius: "8px",
    fontSize: "14px",
    marginBottom: "15px",
  },

  registerText: {
    textAlign: "center",
    marginTop: "25px",
    fontSize: "14px",
    color: "#6b7280",
  },

  registerLink: {
    color: "#2563eb",
    fontWeight: "600",
    textDecoration: "none",
  },
};

export default Login;