const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const db = require("../db/sqlconnect");

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL || "http://localhost:3000/auth/google/callback";

function initializePassport() {
  // Check if Google OAuth credentials are configured
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    console.warn("⚠️  Google OAuth not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env");
    return;
  }

  passport.use(
    new GoogleStrategy(
      {
        clientID: GOOGLE_CLIENT_ID,
        clientSecret: GOOGLE_CLIENT_SECRET,
        callbackURL: CALLBACK_URL,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails[0].value;
          const name = profile.displayName;
          const googleId = profile.id;

          // Check if user exists by email
          const checkSql = "SELECT * FROM users WHERE email = ?";
          
          db.query(checkSql, [email], (err, results) => {
            if (err) {
              console.error("Database error during Google auth:", err);
              return done(err, null);
            }

            if (results.length > 0) {
              // User exists, update google_id if not set
              const existingUser = results[0];
              
              if (!existingUser.google_id) {
                const updateSql = "UPDATE users SET google_id = ? WHERE id = ?";
                db.query(updateSql, [googleId, existingUser.id], (updateErr) => {
                  if (updateErr) {
                    console.error("Failed to update google_id:", updateErr);
                  }
                });
              }
              
              return done(null, existingUser);
            } else {
              // Create new user with Google OAuth
              const insertSql = "INSERT INTO users (name, email, google_id, password_hash) VALUES (?, ?, ?, ?)";
              // Use a placeholder password hash for OAuth users (they won't use password login)
              const oauthPlaceholder = "GOOGLE_OAUTH_USER";
              
              db.query(insertSql, [name, email, googleId, oauthPlaceholder], (insertErr, result) => {
                if (insertErr) {
                  console.error("Failed to create user via Google auth:", insertErr);
                  return done(insertErr, null);
                }
                
                // Return the newly created user
                const newUser = {
                  id: result.insertId,
                  name: name,
                  email: email,
                  google_id: googleId,
                };
                
                return done(null, newUser);
              });
            }
          });
        } catch (error) {
          console.error("Google auth error:", error);
          return done(error, null);
        }
      }
    )
  );

  // Serialize user (not using sessions, but required by passport)
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser((id, done) => {
    const sql = "SELECT * FROM users WHERE id = ?";
    db.query(sql, [id], (err, results) => {
      if (err) return done(err, null);
      if (results.length === 0) return done(null, null);
      done(null, results[0]);
    });
  });

  console.log("✅ Google OAuth configured successfully");
}

module.exports = { initializePassport, passport };
