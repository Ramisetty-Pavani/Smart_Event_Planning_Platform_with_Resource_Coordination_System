import { useState } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import ResetPassword from "./pages/ResetPassword";
import ChangePassword from "./pages/ChangePassword";
import Profile from "./pages/Profile";
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import ForgotPassword from "./pages/ForgotPassword";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Events from "./pages/Events";
import Registrations from "./pages/Registrations";
import Resources from "./pages/Resources";
import Allocations from "./pages/Allocations";
import Vendors from "./pages/Vendors";
import Budgets from "./pages/Budgets";
import Conflicts from "./pages/Conflicts";
import Sponsors from "./pages/Sponsors";
import QRScanner from "./pages/QRScanner";


function App() {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem("user");

    if (savedUser) {
      try {
        return JSON.parse(savedUser);
      } catch {
        localStorage.removeItem("user");
      }
    }

    return null;
  });


  const handleLogin = (userData) => {
    setUser(userData);
    localStorage.setItem("user", JSON.stringify(userData));
  };


  const handleLogout = async () => {
    try {
      await fetch(
        "http://127.0.0.1:8000/api/accounts/logout/",
        {
          method: "POST",
          credentials: "include",
        }
      );
    } catch (error) {
      console.log("Logout request failed:", error);
    }

    localStorage.removeItem("user");
    setUser(null);
  };


  // Common layout for protected pages
  const protectedPage = (
    page,
    allowedRoles = null
  ) => (
    <ProtectedRoute
      user={user}
      allowedRoles={allowedRoles}
    >
      <>
        <Navbar
          user={user}
          onLogout={handleLogout}
        />

        {page}
      </>
    </ProtectedRoute>
  );


  return (
    <BrowserRouter>
      <Routes>

        {/* ========================= */}
        {/* PUBLIC ROUTES */}
        {/* ========================= */}

        <Route
          path="/login"
          element={
            user ? (
              <Navigate
                to="/dashboard"
                replace
              />
            ) : (
              <Login
                onLogin={handleLogin}
              />
            )
          }
        />

        <Route
          path="/register"
          element={
            user ? (
              <Navigate
                to="/dashboard"
                replace
              />
            ) : (
              <Register />
            )
          }
        />


        {/* ========================= */}
        {/* ALL AUTHENTICATED USERS */}
        {/* ========================= */}

        {/* Dashboard */}
        <Route
          path="/dashboard"
          element={protectedPage(
            <Dashboard user={user} />
          )}
        />

        {/* Events */}
        <Route
          path="/events"
          element={protectedPage(
            <Events />
          )}
        />

        {/* Registrations */}
        <Route
          path="/registrations"
          element={protectedPage(
            <Registrations />
          )}
        />


        {/* ========================= */}
        {/* ADMIN + ORGANIZER */}
        {/* ========================= */}

        {/* Resources */}
        <Route
          path="/resources"
          element={protectedPage(
            <Resources />,
            ["Admin", "Organizer"]
          )}
        />

        {/* Allocations */}
        <Route
          path="/allocations"
          element={protectedPage(
            <Allocations />,
            ["Admin", "Organizer"]
          )}
        />

        {/* Vendors */}
        <Route
          path="/vendors"
          element={protectedPage(
            <Vendors />,
            ["Admin", "Organizer"]
          )}
        />

        {/* Budgets */}
        <Route
          path="/budgets"
          element={protectedPage(
            <Budgets />,
            ["Admin", "Organizer"]
          )}
        />

        {/* Sponsors */}
        <Route
          path="/sponsors"
          element={protectedPage(
            <Sponsors />,
            ["Admin", "Organizer"]
          )}
        />

        {/* Conflicts */}
        <Route
          path="/conflicts"
          element={protectedPage(
            <Conflicts />,
            ["Admin", "Organizer"]
          )}
        />


        {/* ========================= */}
        {/* ADMIN + ORGANIZER + STAFF */}
        {/* ========================= */}

        {/* QR Scanner */}
        <Route
          path="/scanner"
          element={protectedPage(
            <QRScanner />,
            ["Admin", "Organizer", "Staff"]
          )}
        />


        {/* ========================= */}
        {/* DEFAULT ROUTES */}
        {/* ========================= */}

        <Route
          path="/"
          element={
            <Navigate
              to={
                user
                  ? "/dashboard"
                  : "/login"
              }
              replace
            />
          }
        />
<Route
  path="/profile"
  element={protectedPage(
    <Profile
      user={user}
      onProfileUpdate={(updatedUser) => {
        setUser(updatedUser);
        localStorage.setItem(
          "user",
          JSON.stringify(updatedUser)
        );
      }}
    />
  )}
/>
<Route
  path="/change-password"
  element={protectedPage(
    <ChangePassword />
  )}
/>
<Route
  path="/forgot-password"
  element={
    user ? (
      <Navigate to="/dashboard" replace />
    ) : (
      <ForgotPassword />
    )
  }
/>
<Route
  path="/reset-password/:uid/:token"
  element={<ResetPassword />}
/>
        <Route
          path="*"
          element={
            <Navigate
              to={
                user
                  ? "/dashboard"
                  : "/login"
              }
              replace
            />
          }
        />

      </Routes>
    </BrowserRouter>
  );
}

export default App;