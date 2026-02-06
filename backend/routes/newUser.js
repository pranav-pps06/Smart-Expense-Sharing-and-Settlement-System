//import section
var express = require('express');
var router = express.Router();
const db = require('../db/sqlconnect'); 
const bcrypt = require('bcryptjs');


router.post('/', async function(req, res) {

  // names="hello";
  // email-"a@a.com";
  // password="pwood";
  const { names, email, password } = req.body;

  //encrypting
  const hashedPassword = await bcrypt.hash(password, 10);


    //sending data
  const sql = "INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)";

  db.query(sql, [names, email, hashedPassword], (err, result) => {
      if (err) return res.status(500).send(err);
      console.log("User added successfully!");
      res.json({ message: "done" });;
  });
});

module.exports = router;