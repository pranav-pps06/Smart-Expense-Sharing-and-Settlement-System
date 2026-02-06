const jwt = require("jsonwebtoken");

function cookieAuth(req, res, next) {
  const token = req.cookies && req.cookies.authToken;
  if (!token) return res.status(401).json({ message: "Unauthorized" });
  try {
    const secret = process.env.JWT_SECRET || "dev-secret";
    const payload = jwt.verify(token, secret);
    req.user = { id: payload.id, email: payload.email, username: payload.username };
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

module.exports = cookieAuth;
