  const mysql = require('mysql2'); // or 'mysql'

  const db = mysql.createConnection({
    host: process.env.HOST, 
    user:  process.env.USER,      
    password: process.env.PASSWORD, 
    database: process.env.DATABASE 
  });



  db.connect((err) => {
    if (err) {
      console.error('Error connecting to MySQL:', err);
      return;
    }
    console.log('Connected to MySQL database!');
  });

  module.exports = db;