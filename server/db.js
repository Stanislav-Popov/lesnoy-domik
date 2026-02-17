/** @format */

// Подключение к PostgreSQL
// Pool — это «пул соединений». Он держит несколько соединений открытыми,
// чтобы не подключаться к базе заново при каждом запросе.

const { Pool, types } = require("pg")
require("dotenv").config()

// =====================================================================
// КРИТИЧЕСКИЙ ФИКС: Переопределяем парсер для типа DATE (OID 1082).
// =====================================================================
// По умолчанию node-pg парсит DATE "2026-02-17" через:
//   new Date(2026, 1, 17)  — создаёт Date в ЛОКАЛЬНОМ часовом поясе.
//
// На сервере в Москве (UTC+3) это даёт:
//   new Date(2026, 1, 17) → полночь МСК → 2026-02-16T21:00:00.000Z в UTC.
//
// Когда Express отправляет JSON клиенту, JSON.stringify конвертирует Date в UTC:
//   "2026-02-16T21:00:00.000Z"
//
// На фронте substring(0,10) даёт "2026-02-16" — СДВИГ НА ДЕНЬ НАЗАД.
//
// Решение: возвращаем DATE как строку "YYYY-MM-DD" без создания Date объекта.
// =====================================================================
types.setTypeParser(1082, (val) => val)

const pool = new Pool({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
})

// Проверка подключения при старте
pool.query("SELECT NOW()")
    .then(() => console.log("✅ PostgreSQL подключён"))
    .catch((err) => console.error("❌ Ошибка подключения к БД:", err.message))

module.exports = pool
