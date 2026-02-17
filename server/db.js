/** @format */

const { Pool, types } = require("pg")
require("dotenv").config()

// DATE → строка "YYYY-MM-DD" (без сдвига часовых поясов)
types.setTypeParser(1082, (val) => val)

const pool = new Pool(
    process.env.DATABASE_URL
        ? {
              connectionString: process.env.DATABASE_URL,
              ssl: { rejectUnauthorized: false },
          }
        : {
              user: process.env.DB_USER,
              password: process.env.DB_PASSWORD,
              host: process.env.DB_HOST,
              port: process.env.DB_PORT,
              database: process.env.DB_NAME,
          },
)

pool.query("SELECT NOW()")
    .then(() => console.log("✅ PostgreSQL подключён"))
    .catch((err) => console.error("❌ Ошибка подключения к БД:", err.message))

module.exports = pool
