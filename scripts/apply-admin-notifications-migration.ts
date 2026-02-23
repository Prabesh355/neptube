const { Pool } = require("pg");
const fs = require("fs");
require("dotenv").config({ path: ".env.local" });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  const sql = fs.readFileSync("./drizzle/0011_add_admin_notifications.sql", "utf-8");
  try {
    await pool.query(sql);
    console.log("✅ Admin notifications migration applied successfully!");
  } catch (err) {
    console.error("❌ Migration failed:", err.message);
  } finally {
    await pool.end();
  }
}

main();
