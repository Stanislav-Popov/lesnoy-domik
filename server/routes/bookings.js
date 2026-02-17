/** @format */

// API для работы с бронированиями
// GET  /api/bookings/availability — получить занятые даты
// GET  /api/bookings/settings    — получить настройки (публичный)
// POST /api/bookings              — создать бронирование
// POST /api/bookings/calculate    — рассчитать стоимость

const express = require("express")
const router = express.Router()
const pool = require("../db")
const { sendBookingNotification } = require("../telegram")

// ===== Вспомогательная: загрузка настроек =====
async function loadSettings(client) {
    const conn = client || pool
    const settingsResult = await conn.query("SELECT key, value FROM settings")
    const settings = {}
    settingsResult.rows.forEach((row) => {
        settings[row.key] = Number(row.value)
    })
    return {
        basePrice: settings.base_price || 15000,
        guestSurcharge: settings.guest_surcharge || 500,
        includedGuests: settings.included_guests || 10,
        prepayPercent: settings.prepay_percent || 30,
        maxGuests: settings.max_guests || 60,
    }
}

// FIX: Безопасное форматирование даты в "YYYY-MM-DD" в ЛОКАЛЬНОМ часовом поясе.
// Нельзя использовать .toISOString() — она конвертирует в UTC и сдвигает дату.
function toLocalDateStr(date) {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, "0")
    const d = String(date.getDate()).padStart(2, "0")
    return `${y}-${m}-${d}`
}

// ===== Получить занятые даты =====
router.get("/availability", async (req, res) => {
    try {
        const result = await pool.query("SELECT date FROM blocked_dates")
        const dates = result.rows.map((row) => row.date)
        res.json({ blockedDates: dates })
    } catch (err) {
        console.error("Ошибка получения дат:", err)
        res.status(500).json({ error: "Ошибка сервера" })
    }
})

// ===== Получить настройки (публичный, для фронтенда) =====
router.get("/settings", async (req, res) => {
    try {
        const settings = await loadSettings()
        res.json(settings)
    } catch (err) {
        console.error("Ошибка получения настроек:", err)
        res.status(500).json({ error: "Ошибка сервера" })
    }
})

// ===== Рассчитать стоимость =====
router.post("/calculate", async (req, res) => {
    try {
        const { checkIn, checkOut, guestCount } = req.body

        const parsedGuests = Number(guestCount)
        if (!Number.isInteger(parsedGuests) || parsedGuests < 1) {
            return res.status(400).json({ error: "Некорректное количество гостей" })
        }

        const settings = await loadSettings()

        if (parsedGuests > settings.maxGuests) {
            return res.status(400).json({ error: `Максимум гостей: ${settings.maxGuests}` })
        }

        const start = new Date(checkIn)
        const end = new Date(checkOut)
        const nights = Math.ceil((end - start) / (1000 * 60 * 60 * 24))

        if (nights <= 0) {
            return res.status(400).json({ error: "Некорректные даты" })
        }

        const extraGuests = Math.max(0, parsedGuests - settings.includedGuests)
        const totalPrice = nights * (settings.basePrice + extraGuests * settings.guestSurcharge)
        const prepayment = Math.round((totalPrice * settings.prepayPercent) / 100)

        res.json({
            nights,
            basePrice: settings.basePrice,
            extraGuests,
            guestSurcharge: settings.guestSurcharge,
            totalPrice,
            prepayment,
            prepayPercent: settings.prepayPercent,
            maxGuests: settings.maxGuests,
        })
    } catch (err) {
        console.error("Ошибка расчёта:", err)
        res.status(500).json({ error: "Ошибка сервера" })
    }
})

// ===== Создать бронирование =====
router.post("/", async (req, res) => {
    const client = await pool.connect()

    try {
        const { guestName, phone, guestCount, checkIn, checkOut, comment } = req.body

        if (!guestName || !phone || !guestCount || !checkIn || !checkOut) {
            return res.status(400).json({ error: "Заполните все обязательные поля" })
        }

        if (typeof guestName !== "string" || guestName.trim().length < 2) {
            return res.status(400).json({ error: "Укажите корректное имя" })
        }

        const phoneDigits = String(phone).replace(/\D/g, "")
        if (phoneDigits.length < 10) {
            return res.status(400).json({ error: "Укажите корректный номер телефона (минимум 10 цифр)" })
        }

        const parsedGuests = Number(guestCount)
        if (!Number.isInteger(parsedGuests) || parsedGuests < 1) {
            return res.status(400).json({ error: "Некорректное количество гостей" })
        }

        const start = new Date(checkIn)
        const end = new Date(checkOut)
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            return res.status(400).json({ error: "Некорректные даты" })
        }

        const nights = Math.ceil((end - start) / (1000 * 60 * 60 * 24))
        if (nights <= 0) {
            return res.status(400).json({ error: "Дата выезда должна быть позже даты заезда" })
        }

        await client.query("BEGIN")

        const settings = await loadSettings(client)

        if (parsedGuests > settings.maxGuests) {
            await client.query("ROLLBACK")
            return res.status(400).json({ error: `Максимум гостей: ${settings.maxGuests}` })
        }

        const conflicts = await client.query(
            "SELECT id FROM blocked_dates WHERE date >= $1 AND date < $2 FOR UPDATE",
            [checkIn, checkOut],
        )

        if (conflicts.rows.length > 0) {
            await client.query("ROLLBACK")
            return res.status(409).json({ error: "Выбранные даты уже заняты" })
        }

        const extraGuests = Math.max(0, parsedGuests - settings.includedGuests)
        const totalPrice = nights * (settings.basePrice + extraGuests * settings.guestSurcharge)
        const prepayment = Math.round((totalPrice * settings.prepayPercent) / 100)

        const result = await client.query(
            `INSERT INTO bookings (guest_name, phone, guest_count, check_in, check_out,
        total_price, prepayment, comment, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'PENDING')
       RETURNING *`,
            [
                guestName.trim(),
                phone,
                parsedGuests,
                checkIn,
                checkOut,
                totalPrice,
                prepayment,
                comment || null,
            ],
        )

        const booking = result.rows[0]

        // ===== БЛОКИРУЕМ ДАТЫ =====
        // FIX: используем toLocalDateStr() вместо .toISOString().split("T")[0]
        // toISOString() конвертирует в UTC → сдвигает дату на день назад в часовых поясах UTC+N
        const currentDate = new Date(start)
        while (currentDate < end) {
            const dateStr = toLocalDateStr(currentDate)
            await client.query(
                `INSERT INTO blocked_dates (date, reason, booking_id)
                 VALUES ($1, $2, $3)
                 ON CONFLICT (date) DO NOTHING`,
                [dateStr, `Бронирование ${guestName.trim()}`, booking.id],
            )
            currentDate.setDate(currentDate.getDate() + 1)
        }

        await client.query("COMMIT")

        sendBookingNotification(booking)

        res.json({
            booking,
            prepayment,
            totalPrice,
        })
    } catch (err) {
        await client.query("ROLLBACK")
        console.error("Ошибка создания бронирования:", err)
        res.status(500).json({ error: "Ошибка сервера" })
    } finally {
        client.release()
    }
})

module.exports = router
