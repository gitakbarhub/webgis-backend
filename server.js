const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

// --- DATABASE CONNECTION (NEON) ---
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
});

// --- INIT DB (Create Tables Automatically) ---
const initDB = async () => {
    try {
        await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL,
        security_question TEXT,
        security_answer TEXT
      );
      CREATE TABLE IF NOT EXISTS shops (
        id SERIAL PRIMARY KEY,
        owner_id INTEGER,
        name VARCHAR(255),
        service VARCHAR(255),
        phone VARCHAR(50),
        address TEXT,
        description TEXT,
        lat DECIMAL,
        lng DECIMAL
      );
    `);
        console.log("✅ Database Connected & Tables Ready!");
    } catch (err) {
        console.error("❌ Error creating tables:", err);
    }
};
initDB();

// --- ROUTES ---
app.post("/api/login", async (req, res) => {
    const { username, password } = req.body;
    try {
        const result = await pool.query(
            "SELECT * FROM users WHERE username = $1",
            [username],
        );
        if (result.rows.length === 0)
            return res.status(401).json({ error: "User not found" });
        if (result.rows[0].password !== password)
            return res.status(401).json({ error: "Wrong password" });
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: "Server Error" });
    }
});

app.post("/api/register", async (req, res) => {
    const { username, password, role, question, answer } = req.body;
    try {
        const result = await pool.query(
            "INSERT INTO users (username, password, role, security_question, security_answer) VALUES ($1, $2, $3, $4, $5) RETURNING *",
            [username, password, role, question, answer],
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: "Username taken" });
    }
});

app.get("/api/shops", async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM shops");
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: "Error fetching shops" });
    }
});

app.post("/api/shops", async (req, res) => {
    const { ownerId, name, service, phone, address, description, lat, lng } =
        req.body;
    try {
        await pool.query(
            "INSERT INTO shops (owner_id, name, service, phone, address, description, lat, lng) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
            [ownerId, name, service, phone, address, description, lat, lng],
        );
        res.json({ message: "Shop added!" });
    } catch (err) {
        res.status(500).json({ error: "Failed to add shop" });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
});
