/** @format */

// API для работы с бронированиями
// GET  /api/bookings/availability — получить занятые даты
// GET  /api/bookings/settings    — получить настройки (публичный)
// POST /api/bookings              — создать бронирование
// POST /api/bookings/calculate    — рассчитать стоимость

const express = require("express")
const router = express.Router()
const pool = require("../db")
const {
    sendBookingNotification,
    sendPendingWarning,
    sendCancelledNotification,
    sendPendingReminder,
} = require("../telegram")

// ===== Вспомогательная: загрузка настроек =====
async function loadSettings(client) {
    const conn = client || pool
    const settingsResult = await conn.query("SELECT key, value FROM settings")
    const settings = {}
    settingsResult.rows.forEach((row) => {
        settings[row.key] = Number(row.value)
    })
    return {
        weekdayPrice: settings.weekday_price || 30000,
        weekendPrice: settings.weekend_price || 50000,
        guestSurcharge: settings.guest_surcharge || 1000,
        includedGuests: settings.included_guests || 15,
        maxGuests: settings.max_guests || 30,
        deposit: settings.deposit || 30000,
        cleaningFee: settings.cleaning_fee || 6000,
        pendingCancelHours: settings.pending_cancel_hours || 24,
    }
}

// FIX: Безопасное форматирование даты в "YYYY-MM-DD" в ЛОКАЛЬНОМ часовом поясе.
function toLocalDateStr(date) {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, "0")
    const d = String(date.getDate()).padStart(2, "0")
    return `${y}-${m}-${d}`
}

// ===== Расчёт стоимости по дням (будни/выходные) =====
// Пн=1, Вт=2, Ср=3, Чт=4 — будни; Пт=5, Сб=6, Вс=0 — выходные
function calculateNightlyPrice(checkInDate, checkOutDate, weekdayPrice, weekendPrice) {
    let totalBase = 0
    let weekdayNights = 0
    let weekendNights = 0
    const current = new Date(checkInDate)
    const end = new Date(checkOutDate)

    while (current < end) {
        const dow = current.getDay() // 0=Вс, 1=Пн, ..., 6=Сб
        // Выходные: пятница(5), суббота(6), воскресенье(0)
        if (dow === 5 || dow === 6 || dow === 0) {
            totalBase += weekendPrice
            weekendNights++
        } else {
            totalBase += weekdayPrice
            weekdayNights++
        }
        current.setDate(current.getDate() + 1)
    }

    return { totalBase, weekdayNights, weekendNights, nights: weekdayNights + weekendNights }
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

        const { totalBase, weekdayNights, weekendNights, nights } = calculateNightlyPrice(
            start,
            end,
            settings.weekdayPrice,
            settings.weekendPrice,
        )

        if (nights <= 0) {
            return res.status(400).json({ error: "Некорректные даты" })
        }

        const extraGuests = Math.max(0, parsedGuests - settings.includedGuests)
        const guestSurchargeTotal = extraGuests * settings.guestSurcharge * nights
        const totalPrice = totalBase + guestSurchargeTotal

        res.json({
            nights,
            weekdayNights,
            weekendNights,
            weekdayPrice: settings.weekdayPrice,
            weekendPrice: settings.weekendPrice,
            extraGuests,
            guestSurcharge: settings.guestSurcharge,
            guestSurchargeTotal,
            totalPrice,
            deposit: settings.deposit,
            cleaningFee: settings.cleaningFee,
            includedGuests: settings.includedGuests,
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

        // Расчёт стоимости с учётом будней/выходных
        const { totalBase, nights } = calculateNightlyPrice(
            start,
            end,
            settings.weekdayPrice,
            settings.weekendPrice,
        )

        if (nights <= 0) {
            await client.query("ROLLBACK")
            return res.status(400).json({ error: "Дата выезда должна быть позже даты заезда" })
        }

        const extraGuests = Math.max(0, parsedGuests - settings.includedGuests)
        const guestSurchargeTotal = extraGuests * settings.guestSurcharge * nights
        const totalPrice = totalBase + guestSurchargeTotal
        // Предоплата = полная стоимость (оплата через Telegram/звонок)
        const prepayment = totalPrice

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

        // Уведомление администратору о новом бронировании
        sendBookingNotification(booking)

        // Напоминание через 8 часов, если оплата не поступит
        const remindMs = 8 * 60 * 60 * 1000 // 8 часов в миллисекундах
        const bookingId = booking.id
        setTimeout(async () => {
            try {
                // Проверяем, что бронь всё ещё PENDING
                const check = await pool.query(
                    "SELECT id, guest_name, phone, check_in, check_out FROM bookings WHERE id = $1 AND status = 'PENDING'",
                    [bookingId],
                )
                if (check.rows.length > 0) {
                    sendPendingReminder(check.rows[0], settings.pendingCancelHours)
                }
            } catch (err) {
                console.error("Ошибка отправки напоминания:", err)
            }
        }, remindMs)

        res.json({
            booking,
            totalPrice,
            deposit: settings.deposit,
            pendingCancelHours: settings.pendingCancelHours,
        })
    } catch (err) {
        await client.query("ROLLBACK")
        console.error("Ошибка создания бронирования:", err)
        res.status(500).json({ error: "Ошибка сервера" })
    } finally {
        client.release()
    }
})

// ===== АВТООТМЕНА: проверка просроченных PENDING бронирований =====
// Запускается каждые 15 минут
async function cancelExpiredPendingBookings() {
    try {
        const settings = await loadSettings()
        const hours = settings.pendingCancelHours || 24

        // Находим PENDING бронирования старше N часов
        const expired = await pool.query(
            `SELECT id, guest_name, phone, check_in, check_out FROM bookings
             WHERE status = 'PENDING'
             AND created_at < NOW() - INTERVAL '1 hour' * $1`,
            [hours],
        )

        for (const booking of expired.rows) {
            const client = await pool.connect()
            try {
                await client.query("BEGIN")
                await client.query("DELETE FROM blocked_dates WHERE booking_id = $1", [booking.id])
                await client.query("UPDATE bookings SET status = 'CANCELLED' WHERE id = $1", [booking.id])
                await client.query("COMMIT")
                console.log(`⏰ Автоотмена PENDING бронирования: ${booking.guest_name} (${booking.id})`)

                // Уведомление в Telegram об автоотмене
                sendCancelledNotification(booking)
            } catch (err) {
                await client.query("ROLLBACK")
                console.error("Ошибка автоотмены:", err)
            } finally {
                client.release()
            }
        }

        if (expired.rows.length > 0) {
            console.log(`⏰ Автоотменено бронирований: ${expired.rows.length}`)
        }
    } catch (err) {
        console.error("Ошибка проверки автоотмены:", err)
    }
}

// Запуск проверки каждые 15 минут
setInterval(cancelExpiredPendingBookings, 15 * 60 * 1000)

// Также запускаем сразу при старте сервера (через 10 сек, чтобы БД успела подключиться)
setTimeout(cancelExpiredPendingBookings, 10 * 1000)

module.exports = router
