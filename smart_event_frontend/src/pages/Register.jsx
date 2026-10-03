import { useState } from "react";

function Register() {
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    username: "",
    phone: "",
    role: "Participant",
    password: "",
    confirm_password: "",
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

  const handleRegister = async (event) => {
    event.preventDefault();

    setMessage("");
    setError("");

    if (form.password !== form.confirm_password) {
      setError("Passwords do not match");
      return;
    }

    if (form.password.length < 8) {
      setError("Password must contain at least 8 characters");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        "http://127.0.0.1:8000/api/accounts/register/",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(form),
        }
      );

      const data = await response.json();

      if (response.ok) {
        setMessage("Registration successful! You can now login.");

        setForm({
          full_name: "",
          email: "",
          username: "",
          phone: "",
          role: "Participant",
          password: "",
          confirm_password: "",
        });
      } else {
        setError(
          data.message || "Registration failed"
        );
      }
    } catch (error) {
      setError("Could not connect to Django");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>

      {/* Left Branding Section */}
      <div style={styles.leftSection}>

        <div style={styles.logo}>
          Smart Event
        </div>

        <div style={styles.leftContent}>

          <div style={styles.smallLabel}>
            EVENT MANAGEMENT PLATFORM
          </div>

          <h1 style={styles.mainTitle}>
            Create your
            <br />
            <span style={styles.highlight}>
              Smart Event
            </span>
            <br />
            account.
          </h1>

          <p style={styles.description}>
            Join a centralized platform for managing
            events, registrations, resources, vendors,
            budgets and attendance.
          </p>

          <div style={styles.features}>

            <div style={styles.feature}>
              <span style={styles.check}>✓</span>
              Manage events efficiently
            </div>

            <div style={styles.feature}>
              <span style={styles.check}>✓</span>
              Coordinate resources and vendors
            </div>

            <div style={styles.feature}>
              <span style={styles.check}>✓</span>
              Track registrations and attendance
            </div>

            <div style={styles.feature}>
              <span style={styles.check}>✓</span>
              Monitor budgets and conflicts
            </div>

          </div>

        </div>

      </div>


      {/* Registration Section */}
      <div style={styles.rightSection}>

        <div style={styles.registerCard}>

          <div style={styles.cardHeader}>

            <div style={styles.icon}>
              👤
            </div>

            <div>
              <h2 style={styles.title}>
                Create Account
              </h2>

              <p style={styles.subtitle}>
                Get started with Smart Event
              </p>
            </div>

          </div>


          <form onSubmit={handleRegister}>

            {/* Full Name + Email */}
            <div style={styles.row}>

              <div style={styles.inputGroup}>
                <label style={styles.label}>
                  Full Name
                </label>

                <input
                  type="text"
                  name="full_name"
                  value={form.full_name}
                  onChange={handleChange}
                  placeholder="Enter your full name"
                  required
                  style={styles.input}
                />
              </div>


              <div style={styles.inputGroup}>
                <label style={styles.label}>
                  Email
                </label>

                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="Enter your email"
                  required
                  style={styles.input}
                />
              </div>

            </div>


            {/* Username + Phone */}
            <div style={styles.row}>

              <div style={styles.inputGroup}>
                <label style={styles.label}>
                  Username
                </label>

                <input
                  type="text"
                  name="username"
                  value={form.username}
                  onChange={handleChange}
                  placeholder="Choose a username"
                  required
                  style={styles.input}
                />
              </div>


              <div style={styles.inputGroup}>
                <label style={styles.label}>
                  Phone Number
                </label>

                <input
                  type="tel"
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="10 digit number"
                  maxLength="10"
                  style={styles.input}
                />
              </div>

            </div>


            {/* Role */}
            <div style={styles.inputGroup}>

              <label style={styles.label}>
                Account Role
              </label>

              <select
                name="role"
                value={form.role}
                onChange={handleChange}
                style={styles.input}
              >
                <option value="Participant">
                  Participant
                </option>

                <option value="Organizer">
                  Organizer
                </option>

                <option value="Staff">
                  Staff
                </option>
              </select>

            </div>


            {/* Password + Confirm Password */}
            <div style={styles.row}>

              <div style={styles.inputGroup}>
                <label style={styles.label}>
                  Password
                </label>

                <input
                  type="password"
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Minimum 8 characters"
                  required
                  style={styles.input}
                />
              </div>


              <div style={styles.inputGroup}>
                <label style={styles.label}>
                  Confirm Password
                </label>

                <input
                  type="password"
                  name="confirm_password"
                  value={form.confirm_password}
                  onChange={handleChange}
                  placeholder="Re-enter password"
                  required
                  style={styles.input}
                />
              </div>

            </div>


            {/* Messages */}
            {error && (
              <div style={styles.error}>
                <span>⚠</span>
                {error}
              </div>
            )}

            {message && (
              <div style={styles.success}>
                <span>✓</span>
                {message}
              </div>
            )}


            {/* Register Button */}
            <button
              type="submit"
              disabled={loading}
              style={{
                ...styles.button,
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading
                ? "Creating Account..."
                : "Create Account"}
            </button>

          </form>


          {/* Login Link */}
          <div style={styles.loginText}>
            Already have an account?{" "}

            <a
              href="/login"
              style={styles.loginLink}
            >
              Sign in
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
    fontFamily: "Inter, Arial, sans-serif",
    background: "#f5f7fb",
  },


  /* Left side */

  leftSection: {
    width: "42%",
    minHeight: "100vh",
    padding: "45px 65px",
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
    maxWidth: "500px",
    margin: "auto 0",
  },


  smallLabel: {
    fontSize: "12px",
    fontWeight: "700",
    letterSpacing: "2px",
    color: "#bfdbfe",
    marginBottom: "18px",
  },


  mainTitle: {
    fontSize: "48px",
    lineHeight: "1.12",
    margin: "0 0 25px 0",
    fontWeight: "700",
    letterSpacing: "-1.5px",
  },


  highlight: {
    color: "#bfdbfe",
  },


  description: {
    fontSize: "17px",
    lineHeight: "1.7",
    color: "#dbeafe",
    maxWidth: "470px",
    marginBottom: "30px",
  },


  features: {
    display: "flex",
    flexDirection: "column",
    gap: "14px",
  },


  feature: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    fontSize: "14px",
    color: "#eff6ff",
  },


  check: {
    width: "22px",
    height: "22px",
    borderRadius: "50%",
    background: "rgba(255,255,255,0.15)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "12px",
  },


  /* Right side */

  rightSection: {
    width: "58%",
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "30px 45px",
    boxSizing: "border-box",
  },


  registerCard: {
    width: "100%",
    maxWidth: "720px",
    background: "white",
    padding: "38px 42px",
    borderRadius: "18px",
    boxShadow:
      "0 15px 45px rgba(15, 23, 42, 0.12)",
    boxSizing: "border-box",
  },


  cardHeader: {
    display: "flex",
    alignItems: "center",
    gap: "15px",
    marginBottom: "28px",
  },


  icon: {
    width: "50px",
    height: "50px",
    borderRadius: "13px",
    background: "#eff6ff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "23px",
    flexShrink: 0,
  },


  title: {
    fontSize: "28px",
    margin: "0 0 5px 0",
    color: "#111827",
  },


  subtitle: {
    margin: 0,
    color: "#6b7280",
    fontSize: "14px",
  },


  row: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "18px",
  },


  inputGroup: {
    marginBottom: "17px",
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
    padding: "12px 13px",
    border: "1px solid #d1d5db",
    borderRadius: "8px",
    fontSize: "14px",
    outline: "none",
    background: "#ffffff",
    color: "#111827",
  },


  button: {
    width: "100%",
    padding: "13px",
    marginTop: "5px",
    border: "none",
    borderRadius: "8px",
    background: "#2563eb",
    color: "white",
    fontSize: "15px",
    fontWeight: "600",
    cursor: "pointer",
  },


  error: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    background: "#fef2f2",
    color: "#b91c1c",
    padding: "10px 12px",
    borderRadius: "8px",
    fontSize: "13px",
    marginBottom: "14px",
  },


  success: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    background: "#f0fdf4",
    color: "#15803d",
    padding: "10px 12px",
    borderRadius: "8px",
    fontSize: "13px",
    marginBottom: "14px",
  },


  loginText: {
    textAlign: "center",
    marginTop: "20px",
    fontSize: "13px",
    color: "#6b7280",
  },


  loginLink: {
    color: "#2563eb",
    fontWeight: "600",
    textDecoration: "none",
  },
};


export default Register;