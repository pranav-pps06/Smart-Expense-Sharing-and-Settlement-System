const express = require("express");
const router = express.Router();
const passport = require("passport");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "heyheyhey";
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

// Initiate Google OAuth flow
router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
  })
);

// Google OAuth callback
router.get(
  "/google/callback",
  passport.authenticate("google", {
    session: false,
    failureRedirect: `${FRONTEND_URL}/login?error=google_auth_failed`,
  }),
  (req, res) => {
    // User authenticated successfully, create JWT token
    const user = req.user;

    const token = jwt.sign(
      { id: user.id, email: user.email, username: user.name },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    // Set the auth cookie
    res.cookie("authToken", token, {
      httpOnly: true,
      secure: false, // Set to true in production with HTTPS
      sameSite: "Lax",
      maxAge: 60 * 60 * 1000, // 1 hour
    });

    // Redirect to frontend dashboard
    res.redirect(`${FRONTEND_URL}/dashboard`);
  }
);

module.exports = router;
