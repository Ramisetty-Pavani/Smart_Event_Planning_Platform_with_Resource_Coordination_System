import API_URL from "../api";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

function Profile({ user, onProfileUpdate }) {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    full_name: "",
    username: "",
    email: "",
    phone: "",
    role: "",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const response = await fetch(
        `${API_URL}/api/accounts/profile/`,
        {
          credentials: "include",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Unable to load profile"
        );
      }

      setForm({
        full_name: data.user.full_name || "",
        username: data.user.username || "",
        email: data.user.email || "",
        phone: data.user.phone || "",
        role: data.user.role || "",
      });

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();

    setSaving(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch(
        `${API_URL}/api/accounts/profile/`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            full_name: form.full_name,
            email: form.email,
            phone: form.phone,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Unable to update profile"
        );
      }

      setMessage(
        "Profile updated successfully."
      );

      if (onProfileUpdate) {
        onProfileUpdate(data.user);
      }

      localStorage.setItem(
        "user",
        JSON.stringify(data.user)
      );

    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main style={styles.page}>
        <div style={styles.card}>
          Loading profile...
        </div>
      </main>
    );
  }

  return (
    <main style={styles.page}>

      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>
            My Profile
          </h1>

          <p style={styles.subtitle}>
            View and update your account information.
          </p>
        </div>
      </div>

      <div style={styles.card}>

        <div style={styles.profileTop}>

          <div style={styles.avatar}>
            {(form.full_name || form.username || "U")
              .charAt(0)
              .toUpperCase()}
          </div>

          <div>
            <h2 style={styles.profileName}>
              {form.full_name || form.username}
            </h2>

            <div style={styles.roleBadge}>
              {form.role}
            </div>
          </div>

        </div>

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

        <form onSubmit={handleSave}>

          <div style={styles.grid}>

            <div>
              <label style={styles.label}>
                Full Name
              </label>

              <input
                name="full_name"
                value={form.full_name}
                onChange={handleChange}
                style={styles.input}
              />
            </div>

            <div>
              <label style={styles.label}>
                Username
              </label>

              <input
                value={form.username}
                disabled
                style={styles.disabledInput}
              />

              <small style={styles.help}>
                Username cannot be changed here.
              </small>
            </div>

            <div>
              <label style={styles.label}>
                Email
              </label>

              <input
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                style={styles.input}
              />
            </div>

            <div>
              <label style={styles.label}>
                Phone
              </label>

              <input
                name="phone"
                value={form.phone}
                onChange={handleChange}
                maxLength="10"
                placeholder="10 digit phone number"
                style={styles.input}
              />
            </div>

            <div>
              <label style={styles.label}>
                Role
              </label>

              <input
                value={form.role}
                disabled
                style={styles.disabledInput}
              />

              <small style={styles.help}>
                Role is controlled by the system.
              </small>
            </div>

          </div>

          <div style={styles.actions}>

            <button
              type="button"
              onClick={() => navigate("/dashboard")}
              style={styles.cancelButton}
            >
              Back
            </button>

            <button
              type="submit"
              disabled={saving}
              style={styles.saveButton}
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>

          </div>

        </form>

      </div>

    </main>
  );
}

const styles = {

  page: {
    marginLeft: "250px",
    minHeight: "100vh",
    background: "#f8fafc",
    padding: "35px",
    boxSizing: "border-box",
  },

  header: {
    marginBottom: "25px",
  },

  title: {
    margin: 0,
    fontSize: "28px",
    color: "#111827",
  },

  subtitle: {
    marginTop: "7px",
    color: "#6b7280",
  },

  card: {
    background: "white",
    borderRadius: "16px",
    padding: "28px",
    maxWidth: "850px",
    boxShadow: "0 4px 15px rgba(0,0,0,0.06)",
  },

  profileTop: {
    display: "flex",
    alignItems: "center",
    gap: "15px",
    marginBottom: "30px",
    paddingBottom: "20px",
    borderBottom: "1px solid #e5e7eb",
  },

  avatar: {
    width: "65px",
    height: "65px",
    borderRadius: "50%",
    background: "#dbeafe",
    color: "#1d4ed8",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "25px",
    fontWeight: "700",
  },

  profileName: {
    margin: 0,
    fontSize: "20px",
  },

  roleBadge: {
    display: "inline-block",
    marginTop: "6px",
    background: "#eff6ff",
    color: "#2563eb",
    padding: "5px 10px",
    borderRadius: "20px",
    fontSize: "12px",
    fontWeight: "600",
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "20px",
  },

  label: {
    display: "block",
    fontSize: "13px",
    fontWeight: "600",
    color: "#374151",
    marginBottom: "7px",
  },

  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: "11px 12px",
    border: "1px solid #d1d5db",
    borderRadius: "8px",
    fontSize: "14px",
    outline: "none",
  },

  disabledInput: {
    width: "100%",
    boxSizing: "border-box",
    padding: "11px 12px",
    border: "1px solid #e5e7eb",
    borderRadius: "8px",
    fontSize: "14px",
    background: "#f3f4f6",
    color: "#6b7280",
  },

  help: {
    display: "block",
    marginTop: "5px",
    color: "#9ca3af",
    fontSize: "11px",
  },

  success: {
    background: "#ecfdf5",
    color: "#047857",
    padding: "11px",
    borderRadius: "8px",
    marginBottom: "20px",
    fontSize: "13px",
  },

  error: {
    background: "#fef2f2",
    color: "#dc2626",
    padding: "11px",
    borderRadius: "8px",
    marginBottom: "20px",
    fontSize: "13px",
  },

  actions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "10px",
    marginTop: "25px",
  },

  cancelButton: {
    padding: "11px 20px",
    border: "1px solid #d1d5db",
    background: "white",
    borderRadius: "8px",
    cursor: "pointer",
  },

  saveButton: {
    padding: "11px 20px",
    border: "none",
    background: "#2563eb",
    color: "white",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "600",
  },
};

export default Profile;
