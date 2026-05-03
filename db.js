import mysql from "mysql2/promise";

const db = mysql.createPool({
  host: "localhost",
  user: "isac",
  password: "1234",
  database: "chat",
  waitForConnections: true,
  connectionLimit: 100,
  queueLimit: 0
});

export default db;