import React from "react";
import { Routes, Route, useLocation } from "react-router-dom";

import Navbar from "./components/Navbar";
import Footer from "./components/Footer";

import Home from "./pages/Home";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Signup from "./pages/Signup";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import DatabaseExplorer from "./pages/DatabaseExplorer";
import ProtectedRoute from "./components/ProtectedRoute";
import Trialdashboard from "./pages/trialdashboard";

function App() {
  const location = useLocation();

  const hideOn = ["/signup", "/login","/trial", "/dashboard", "/database"];
  const hideUI = hideOn.includes(location.pathname);

  return (
    <div className="min-h-screen bg-black text-white bg-cover bg-center bg-no-repeat">

      {!hideUI && <Navbar />}

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />

        {/* Auth pages */}
        <Route path="/signup" element={<Signup />} />
        <Route path="/login" element={<Login />} />
        <Route path="/trial" element={<Trialdashboard />} />

        {/* Protected dashboard */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        {/* Database Explorer */}
        <Route
          path="/database"
          element={
            <ProtectedRoute>
              <DatabaseExplorer />
            </ProtectedRoute>
          }
        />
      </Routes>

      {!hideUI && <Footer />}
    </div>
  );
}

export default App;
