import { useState } from "react";
import { useNavigate } from "react-router-dom";

function ChangePassword() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setMessage("");
    setError("");

    if (form.new_password !== form.confirm_password) {
      setError("New passwords do not match.");
      return;
    }

    if (form.new_password.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }

    if (form.current_password === form.new_password) {
      setError(
        "New password must be different from current password."
      );
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        "http://localhost:8000/api/accounts/change-password/",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            current_password: form.current_password,
            new_password: form.new_password,
            confirm_password: form.confirm_password,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(
          data.message || "Failed to change password."
        );
        return;
      }

      setMessage(
        data.message || "Password changed successfully."
      );

      setForm({
        current_password: "",
        new_password: "",
        confirm_password: "",
      });
    } catch (error) {
      setError("Unable to connect to the server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>

        <button
          onClick={() => navigate("/profile")}
          style={styles.backButton}
        >
          ← Back to Profile
        </button>

        <h1 style={styles.title}>
          Change Password
        </h1>

        <p style={styles.subtitle}>
          Update your account password securely.
        </p>

        {message && (
          <div style={styles.success}>
            {message}
          </div>
        )}

        {error && (
          <div style={styles.error}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>

          <div style={styles.inputGroup}>
            <label style={styles.label}>
              Current Password
            </label>

            <input
              type="password"
              name="current_password"
              value={form.current_password}
              onChange={handleChange}
              placeholder="Enter current password"
              required
              style={styles.input}
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>
              New Password
            </label>

            <input
              type="password"
              name="new_password"
              value={form.new_password}
              onChange={handleChange}
              placeholder="Enter new password"
              required
              style={styles.input}
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>
              Confirm New Password
            </label>

            <input
              type="password"
              name="confirm_password"
              value={form.confirm_password}
              onChange={handleChange}
              placeholder="Confirm new password"
              required
              style={styles.input}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              ...styles.button,
              backgroundColor: loading
                ? "#94a3b8"
                : "#2563eb",
              cursor: loading
                ? "not-allowed"
                : "pointer",
            }}
          >
            {loading
              ? "Changing..."
              : "Change Password"}
          </button>

        </form>
      </div>
    </div>
  );
}

const styles = {
  page: {
    marginLeft: "250px",
    minHeight: "100vh",
    padding: "40px",
    background: "#f8fafc",
    boxSizing: "border-box",
  },

  card: {
    width: "100%",
    maxWidth: "600px",
    margin: "0 auto",
    background: "white",
    padding: "32px",
    borderRadius: "16px",
    boxShadow: "0 4px 20px rgba(0, 0, 0, 0.08)",
    boxSizing: "border-box",
  },

  backButton: {
    border: "none",
    background: "transparent",
    cursor: "pointer",
    fontSize: "15px",
    marginBottom: "20px",
    color: "#2563eb",
  },

  title: {
    margin: "0 0 8px 0",
    fontSize: "30px",
    color: "#111827",
  },

  subtitle: {
    color: "#64748b",
    marginBottom: "28px",
  },

  inputGroup: {
    marginBottom: "20px",
  },

  label: {
    display: "block",
    marginBottom: "8px",
    fontWeight: "600",
    color: "#374151",
  },

  input: {
    width: "100%",
    padding: "12px",
    border: "1px solid #cbd5e1",
    borderRadius: "8px",
    boxSizing: "border-box",
    fontSize: "15px",
  },

  button: {
    width: "100%",
    padding: "13px",
    border: "none",
    borderRadius: "8px",
    color: "white",
    fontSize: "16px",
    fontWeight: "600",
    marginTop: "5px",
  },

  success: {
    padding: "12px",
    marginBottom: "20px",
    borderRadius: "8px",
    background: "#dcfce7",
    color: "#166534",
  },

  error: {
    padding: "12px",
    marginBottom: "20px",
    borderRadius: "8px",
    background: "#fee2e2",
    color: "#991b1b",
  },
};

export default ChangePassword;