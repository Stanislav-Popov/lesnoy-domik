/** @format */

// API для получения настроек (цены, параметры)
// GET /api/settings — получить все настройки

const express = require("express")
const router = express.Router()
const pool = require("../db")

router.get("/", async (req, res) => {
    try {
        const result = await pool.query("SELECT key, value FROM settings")
        const settings = {}
        result.rows.forEach((row) => {
            settings[row.key] = Number(row.value)
        })
        res.json(settings)
    } catch (err) {
        console.error("Ошибка получения настроек:", err)
        res.status(500).json({ error: "Ошибка сервера" })
    }
})

module.exports = router
