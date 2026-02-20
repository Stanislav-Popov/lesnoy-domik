/** @format */

// ICS/iCal экспорт календаря занятости сайта
// GET /api/calendar/export.ics — отдаёт занятые даты в формате iCalendar
//
// Эту ссылку нужно добавить в Авито в разделе
// «Синхронизация календарей» → «Добавить календарь»
//
// Авито будет периодически запрашивать этот URL и обновлять свой календарь.

const express = require("express")
const router = express.Router()
const pool = require("../db")

// ===== Генерация уникального UID для iCal-события =====
function generateUID(date, domain) {
    return `${date}-blocked@${domain}`
}

// ===== Формат даты для iCal: YYYYMMDD =====
function toICalDate(dateStr) {
    return String(dateStr).replace(/-/g, "")
}

// ===== Следующий день (для DTEND в формате DATE — iCal exclusive end) =====
function nextDay(dateStr) {
    const d = new Date(dateStr + "T12:00:00") // полдень чтобы избежать DST-проблем
    d.setDate(d.getDate() + 1)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, "0")
    const dd = String(d.getDate()).padStart(2, "0")
    return `${y}${m}${dd}`
}

// ===== Текущая дата-время в формате iCal (UTC) =====
function nowUTC() {
    const d = new Date()
    return (
        d.getUTCFullYear().toString() +
        String(d.getUTCMonth() + 1).padStart(2, "0") +
        String(d.getUTCDate()).padStart(2, "0") +
        "T" +
        String(d.getUTCHours()).padStart(2, "0") +
        String(d.getUTCMinutes()).padStart(2, "0") +
        String(d.getUTCSeconds()).padStart(2, "0") +
        "Z"
    )
}

// ===== Группировка последовательных дат в диапазоны =====
// Авито лучше воспринимает один VEVENT на весь диапазон, чем отдельные события на каждый день
function groupConsecutiveDates(dates) {
    if (dates.length === 0) return []

    // Сортируем даты
    const sorted = [...dates].sort()
    const ranges = []
    let rangeStart = sorted[0]
    let rangeEnd = sorted[0]

    for (let i = 1; i < sorted.length; i++) {
        const prev = new Date(rangeEnd + "T12:00:00")
        const curr = new Date(sorted[i] + "T12:00:00")
        const diffDays = (curr - prev) / (1000 * 60 * 60 * 24)

        if (diffDays === 1) {
            // Продолжаем диапазон
            rangeEnd = sorted[i]
        } else {
            // Сохраняем текущий диапазон и начинаем новый
            ranges.push({ start: rangeStart, end: rangeEnd })
            rangeStart = sorted[i]
            rangeEnd = sorted[i]
        }
    }
    // Последний диапазон
    ranges.push({ start: rangeStart, end: rangeEnd })

    return ranges
}

// ===== Экспорт календаря =====
router.get("/export.ics", async (req, res) => {
    try {
        const domain = process.env.SITE_DOMAIN || "lesnoy-domik.ru"

        // Получаем ВСЕ занятые даты (и от бронирований, и ручные блокировки)
        // Исключаем даты, пришедшие с Авито (source = 'avito'), чтобы не создавать петлю
        const result = await pool.query(
            `SELECT date, reason FROM blocked_dates 
             WHERE source IS NULL OR source != 'avito'
             ORDER BY date ASC`,
        )

        const dates = result.rows.map((r) => r.date)
        const ranges = groupConsecutiveDates(dates)
        const stamp = nowUTC()

        // Формируем iCal
        let ical = [
            "BEGIN:VCALENDAR",
            "VERSION:2.0",
            "PRODID:-//LesnoyDomik//Calendar//RU",
            "CALSCALE:GREGORIAN",
            "METHOD:PUBLISH",
            `X-WR-CALNAME:Лесной Домик — Занятость`,
        ]

        for (const range of ranges) {
            const uid = generateUID(range.start, domain)
            const dtstart = toICalDate(range.start)
            // DTEND в формате DATE — exclusive (следующий день после конца диапазона)
            const dtend = nextDay(range.end)

            ical.push(
                "BEGIN:VEVENT",
                `UID:${uid}`,
                `DTSTAMP:${stamp}`,
                `DTSTART;VALUE=DATE:${dtstart}`,
                `DTEND;VALUE=DATE:${dtend}`,
                `SUMMARY:Занято — Лесной Домик`,
                "STATUS:CONFIRMED",
                "TRANSP:OPAQUE",
                "END:VEVENT",
            )
        }

        ical.push("END:VCALENDAR")

        const body = ical.join("\r\n")

        res.set({
            "Content-Type": "text/calendar; charset=utf-8",
            "Content-Disposition": 'attachment; filename="calendar.ics"',
            "Cache-Control": "no-cache, no-store, must-revalidate",
        })

        res.send(body)
    } catch (err) {
        console.error("❌ Ошибка экспорта iCal:", err)
        res.status(500).send("Ошибка генерации календаря")
    }
})

module.exports = router
