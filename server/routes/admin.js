/** @format */

// API админ-панели
// POST /api/admin/login       — вход
// GET  /api/admin/bookings    — список бронирований
// PATCH /api/admin/bookings/:id — изменить статус
// GET  /api/admin/settings    — получить настройки
// PUT  /api/admin/settings    — сохранить настройки
// GET  /api/admin/blocked-dates    — получить заблокированные даты
// POST /api/admin/blocked-dates    — заблокировать дату вручную
// DELETE /api/admin/blocked-dates/:date — разблокировать дату

const express = require("express")
const router = express.Router()
const pool = require("../db")

// ===== Авторизация через токен с TTL =====
const crypto = require("crypto")

// Храним токены с временем создания (TTL = 24 часа)
const TOKEN_TTL_MS = 24 * 60 * 60 * 1000 // 24 часа
const tokens = new Map() // token -> { createdAt: Date }

// Очистка просроченных токенов каждые 30 минут
setInterval(
    () => {
        const now = Date.now()
        for (const [token, data] of tokens) {
            if (now - data.createdAt > TOKEN_TTL_MS) {
                tokens.delete(token)
            }
        }
    },
    30 * 60 * 1000,
)

// Middleware: проверка авторизации
function requireAuth(req, res, next) {
    const token = req.headers.authorization?.replace("Bearer ", "")
    if (!token || !tokens.has(token)) {
        return res.status(401).json({ error: "Не авторизован" })
    }

    // Проверяем TTL
    const tokenData = tokens.get(token)
    if (Date.now() - tokenData.createdAt > TOKEN_TTL_MS) {
        tokens.delete(token)
        return res.status(401).json({ error: "Сессия истекла, войдите заново" })
    }

    next()
}

// ===== Вход =====
router.post("/login", (req, res) => {
    const { login, password } = req.body

    if (login === process.env.ADMIN_LOGIN && password === process.env.ADMIN_PASSWORD) {
        const token = crypto.randomBytes(32).toString("hex")
        tokens.set(token, { createdAt: Date.now() })
        console.log("✅ Админ вошёл")
        res.json({ token })
    } else {
        res.status(401).json({ error: "Неверный логин или пароль" })
    }
})

// ===== Список бронирований (с пагинацией) =====
router.get("/bookings", requireAuth, async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1)
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50))
        const offset = (page - 1) * limit

        const countResult = await pool.query("SELECT COUNT(*) FROM bookings")
        const total = parseInt(countResult.rows[0].count)

        const result = await pool.query(
            "SELECT * FROM bookings ORDER BY created_at DESC LIMIT $1 OFFSET $2",
            [limit, offset],
        )

        res.json({
            bookings: result.rows,
            pagination: { page, limit, total, pages: Math.ceil(total / limit) },
        })
    } catch (err) {
        console.error("Ошибка получения бронирований:", err)
        res.status(500).json({ error: "Ошибка сервера" })
    }
})

// Валидация UUID формата
function isValidUUID(str) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)
}

// ===== Изменить статус бронирования =====
router.patch("/bookings/:id", requireAuth, async (req, res) => {
    const client = await pool.connect()

    try {
        const { id } = req.params
        const { status } = req.body

        if (!isValidUUID(id)) {
            return res.status(400).json({ error: "Некорректный ID бронирования" })
        }

        const allowed = ["PENDING", "PAID", "CONFIRMED", "CANCELLED"]
        if (!allowed.includes(status)) {
            return res.status(400).json({ error: "Некорректный статус" })
        }

        await client.query("BEGIN")

        // Если отменяем — разблокируем даты
        if (status === "CANCELLED") {
            await client.query("DELETE FROM blocked_dates WHERE booking_id = $1", [id])
        }

        const result = await client.query("UPDATE bookings SET status = $1 WHERE id = $2 RETURNING *", [
            status,
            id,
        ])

        if (result.rows.length === 0) {
            await client.query("ROLLBACK")
            return res.status(404).json({ error: "Бронирование не найдено" })
        }

        await client.query("COMMIT")
        res.json(result.rows[0])
    } catch (err) {
        await client.query("ROLLBACK")
        console.error("Ошибка обновления статуса:", err)
        res.status(500).json({ error: "Ошибка сервера" })
    } finally {
        client.release()
    }
})

// ===== Удалить бронирование =====
router.delete("/bookings/:id", requireAuth, async (req, res) => {
    const client = await pool.connect()
    try {
        const { id } = req.params
        if (!isValidUUID(id)) {
            return res.status(400).json({ error: "Некорректный ID бронирования" })
        }

        await client.query("BEGIN")

        const check = await client.query("SELECT status FROM bookings WHERE id = $1 FOR UPDATE", [id])
        if (check.rows.length === 0) {
            await client.query("ROLLBACK")
            return res.status(404).json({ error: "Бронирование не найдено" })
        }
        if (check.rows[0].status !== "CANCELLED") {
            await client.query("ROLLBACK")
            return res.status(400).json({ error: "Удалить можно только отменённое бронирование" })
        }

        await client.query("DELETE FROM blocked_dates WHERE booking_id = $1", [id])
        await client.query("DELETE FROM bookings WHERE id = $1", [id])
        await client.query("COMMIT")
        res.json({ ok: true })
    } catch (err) {
        await client.query("ROLLBACK")
        console.error("Ошибка удаления бронирования:", err)
        res.status(500).json({ error: "Ошибка сервера" })
    } finally {
        client.release()
    }
})

// ===== Получить настройки =====
router.get("/settings", requireAuth, async (req, res) => {
    try {
        const result = await pool.query("SELECT key, value FROM settings")
        const settings = {}
        result.rows.forEach((row) => {
            settings[row.key] = row.value
        })
        res.json(settings)
    } catch (err) {
        console.error("Ошибка получения настроек:", err)
        res.status(500).json({ error: "Ошибка сервера" })
    }
})

// ===== Сохранить настройки =====
router.put("/settings", requireAuth, async (req, res) => {
    try {
        const settings = req.body

        // Валидация: разрешаем только известные ключи
        const allowedKeys = [
            "weekday_price",
            "weekend_price",
            "guest_surcharge",
            "included_guests",
            "max_guests",
            "deposit",
            "cleaning_fee",
            "pending_cancel_hours",
        ]

        for (const [key, value] of Object.entries(settings)) {
            if (!allowedKeys.includes(key)) {
                return res.status(400).json({ error: `Неизвестная настройка: ${key}` })
            }
            const numValue = Number(value)
            if (isNaN(numValue) || numValue < 0) {
                return res.status(400).json({ error: `Некорректное значение для ${key}` })
            }
            await pool.query(
                `INSERT INTO settings (key, value) VALUES ($1, $2)
         ON CONFLICT (key) DO UPDATE SET value = $2`,
                [key, JSON.stringify(numValue)],
            )
        }

        res.json({ ok: true })
    } catch (err) {
        console.error("Ошибка сохранения настроек:", err)
        res.status(500).json({ error: "Ошибка сервера" })
    }
})

// ===== Заблокированные даты =====
router.get("/blocked-dates", requireAuth, async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM blocked_dates ORDER BY date ASC")
        res.json(result.rows)
    } catch (err) {
        console.error("Ошибка получения заблокированных дат:", err)
        res.status(500).json({ error: "Ошибка сервера" })
    }
})

// ===== Заблокировать дату вручную =====
router.post("/blocked-dates", requireAuth, async (req, res) => {
    try {
        const { date, reason } = req.body
        if (!date) {
            return res.status(400).json({ error: "Дата обязательна" })
        }
        // Валидация формата даты
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            return res.status(400).json({ error: "Некорректный формат даты (ожидается YYYY-MM-DD)" })
        }
        await pool.query(
            `INSERT INTO blocked_dates (date, reason)
       VALUES ($1::date, $2)
       ON CONFLICT (date) DO NOTHING`,
            [date, reason || "Ручная блокировка"],
        )
        res.json({ ok: true })
    } catch (err) {
        console.error("Ошибка блокировки даты:", err)
        res.status(500).json({ error: "Ошибка сервера" })
    }
})

// ===== Разблокировать дату =====
router.delete("/blocked-dates/:date", requireAuth, async (req, res) => {
    try {
        const { date } = req.params
        if (!date) {
            return res.status(400).json({ error: "Дата обязательна" })
        }
        // Валидация формата даты
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            return res.status(400).json({ error: "Некорректный формат даты (ожидается YYYY-MM-DD)" })
        }
        // FIX: явный каст $1::date для гарантии корректного сравнения
        const result = await pool.query(
            "DELETE FROM blocked_dates WHERE date = $1::date AND booking_id IS NULL",
            [date],
        )
        res.json({ ok: true, deleted: result.rowCount })
    } catch (err) {
        console.error("Ошибка разблокировки даты:", err)
        res.status(500).json({ error: "Ошибка сервера" })
    }
})

const { getSyncStatus, syncFromAvito } = require("../avito-sync")

router.get("/avito-sync/status", requireAuth, (req, res) => {
    res.json(getSyncStatus())
})

router.post("/avito-sync/trigger", requireAuth, async (req, res) => {
    try {
        const result = await syncFromAvito()
        res.json({ ok: true, result })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
})

module.exports = router
