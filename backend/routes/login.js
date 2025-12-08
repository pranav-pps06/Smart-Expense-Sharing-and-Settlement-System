const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../db/sqlconnect");


const JWT_SECRET = process.env.JWT_SECRET || "heyheyhey";

router.post("/", (req, res) => {

  const { email, password } = req.body;

  
  const sql = "SELECT * FROM users WHERE email = ?";
  db.query(sql, [email], async (err, results) => {
    if (err) return res.status(500).json({ message: "Database error" });

    if (results.length === 0)
      return res.status(401).json({ message: "Invalid email or password" });

    const user = results[0];

   
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch)
      return res.status(401).json({ message: "Invalid email or password" });

    // Create JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email, username: user.name },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.cookie("authToken", token, {
  httpOnly: true,
   secure: false,       
   sameSite: "Lax",      
   maxAge: 60 * 60 * 1000
    }).sendStatus(200);
  });
});

module.exports = router;
