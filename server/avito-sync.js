/** @format */

// =============================================================
// Модуль двусторонней синхронизации календаря с Авито
// =============================================================
//
// Как работает:
//
// САЙТ → АВИТО:
//   Авито запрашивает наш ICS-endpoint /api/calendar/export.ics
//   (ссылку нужно добавить в настройках Авито «Добавить календарь»)
//
// АВИТО → САЙТ:
//   Этот модуль каждые N минут скачивает ICS-файл Авито,
//   парсит занятые даты и обновляет нашу таблицу blocked_dates
//   с source='avito', чтобы не путать с локальными блокировками.
//
// Reconciliation:
//   - Дата есть в Авито, но нет у нас → INSERT (source='avito')
//   - Дата есть у нас (source='avito'), но нет в Авито → DELETE
//   - Дата есть и там, и там → ничего не делаем
//
// =============================================================

const pool = require("../db")
const fetch = require("node-fetch")

// ===== Конфигурация =====
const AVITO_ICAL_URL = process.env.AVITO_ICAL_URL // URL экспорта iCal с Авито
const SYNC_INTERVAL_MS = parseInt(process.env.AVITO_SYNC_INTERVAL_MIN || "15") * 60 * 1000
const SYNC_ENABLED = process.env.AVITO_SYNC_ENABLED !== "false" // по умолчанию включено если URL задан

// ===== Состояние =====
let syncTimer = null
let isSyncing = false
let lastSyncAt = null
let lastSyncError = null
let lastSyncStats = null

// ===== Парсинг ICS файла =====
// Минимальный парсер VEVENT, достаточный для iCal календарей занятости.
// Извлекает DTSTART/DTEND из каждого VEVENT.
function parseICS(icsText) {
    const events = []
    const lines = icsText.replace(/\r\n /g, "").split(/\r?\n/) // unfold long lines

    let inEvent = false
    let currentEvent = {}

    for (const line of lines) {
        if (line === "BEGIN:VEVENT") {
            inEvent = true
            currentEvent = {}
        } else if (line === "END:VEVENT") {
            inEvent = false
            if (currentEvent.dtstart) {
                events.push(currentEvent)
            }
        } else if (inEvent) {
            // Парсим DTSTART
            if (line.startsWith("DTSTART")) {
                currentEvent.dtstart = extractDate(line)
            }
            // Парсим DTEND
            if (line.startsWith("DTEND")) {
                currentEvent.dtend = extractDate(line)
            }
            // SUMMARY для логирования
            if (line.startsWith("SUMMARY")) {
                currentEvent.summary = line.split(":").slice(1).join(":")
            }
        }
    }

    return events
}

// ===== Извлечение даты из строки iCal =====
// Поддерживает форматы:
//   DTSTART;VALUE=DATE:20250315
//   DTSTART:20250315T140000Z
//   DTSTART;TZID=Europe/Moscow:20250315T140000
function extractDate(line) {
    const value = line.split(":").pop().trim()

    // Формат YYYYMMDD (VALUE=DATE) или YYYYMMDDTHHMMSS[Z]
    const dateStr = value.substring(0, 8)
    if (/^\d{8}$/.test(dateStr)) {
        return `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`
    }

    return null
}

// ===== Развернуть события в список дат =====
// Каждое VEVENT с DTSTART/DTEND превращается в список дат [start, start+1, ..., end-1]
// (DTEND в iCal — exclusive)
function expandEventsToDates(events) {
    const dates = new Set()

    for (const event of events) {
        if (!event.dtstart) continue

        const start = new Date(event.dtstart + "T12:00:00")
        let end

        if (event.dtend) {
            end = new Date(event.dtend + "T12:00:00")
        } else {
            // Если нет DTEND — однодневное событие
            end = new Date(start)
            end.setDate(end.getDate() + 1)
        }

        // Генерируем каждый день в диапазоне [start, end)
        const current = new Date(start)
        while (current < end) {
            const y = current.getFullYear()
            const m = String(current.getMonth() + 1).padStart(2, "0")
            const d = String(current.getDate()).padStart(2, "0")
            dates.add(`${y}-${m}-${d}`)
            current.setDate(current.getDate() + 1)
        }
    }

    return dates
}

// ===== Основная логика синхронизации =====
async function syncFromAvito() {
    if (!AVITO_ICAL_URL) {
        return { skipped: true, reason: "AVITO_ICAL_URL не задан" }
    }

    if (isSyncing) {
        return { skipped: true, reason: "Синхронизация уже выполняется" }
    }

    isSyncing = true
    const startTime = Date.now()

    try {
        // 1. Скачиваем ICS с Авито
        console.log("🔄 Авито-синхронизация: скачиваю iCal...")
        const response = await fetch(AVITO_ICAL_URL, {
            timeout: 30000,
            headers: {
                "User-Agent": "LesnoyDomik-CalSync/1.0",
            },
        })

        if (!response.ok) {
            throw new Error(`Авито iCal вернул HTTP ${response.status}: ${response.statusText}`)
        }

        const icsText = await response.text()

        if (!icsText.includes("BEGIN:VCALENDAR")) {
            throw new Error("Ответ не является валидным iCal файлом")
        }

        // 2. Парсим события
        const events = parseICS(icsText)
        const avitoDates = expandEventsToDates(events)
        console.log(`📅 Авито: получено ${avitoDates.size} занятых дат из ${events.length} событий`)

        // 3. Получаем текущие avito-даты из нашей БД
        const localResult = await pool.query("SELECT date FROM blocked_dates WHERE source = 'avito'")
        const localAvitoDates = new Set(localResult.rows.map((r) => r.date))

        // 4. Reconciliation (сверка)
        const toAdd = []
        const toRemove = []

        // Даты, которые есть в Авито, но нет у нас → добавить
        for (const date of avitoDates) {
            if (!localAvitoDates.has(date)) {
                // Проверяем, нет ли уже этой даты от локальных бронирований
                toAdd.push(date)
            }
        }

        // Даты, которые есть у нас (source=avito), но нет в Авито → удалить
        for (const date of localAvitoDates) {
            if (!avitoDates.has(date)) {
                toRemove.push(date)
            }
        }

        // 5. Применяем изменения в одной транзакции
        if (toAdd.length > 0 || toRemove.length > 0) {
            const client = await pool.connect()
            try {
                await client.query("BEGIN")

                // Добавляем новые даты с Авито
                for (const date of toAdd) {
                    await client.query(
                        `INSERT INTO blocked_dates (date, reason, source)
                         VALUES ($1::date, $2, 'avito')
                         ON CONFLICT (date) DO UPDATE SET 
                           reason = EXCLUDED.reason,
                           source = CASE 
                             WHEN blocked_dates.source IS NULL AND blocked_dates.booking_id IS NULL 
                             THEN 'avito' 
                             ELSE blocked_dates.source 
                           END`,
                        [date, "Бронирование с Авито"],
                    )
                }

                // Удаляем даты, снятые в Авито (только source='avito')
                for (const date of toRemove) {
                    await client.query(
                        "DELETE FROM blocked_dates WHERE date = $1::date AND source = 'avito'",
                        [date],
                    )
                }

                await client.query("COMMIT")
            } catch (err) {
                await client.query("ROLLBACK")
                throw err
            } finally {
                client.release()
            }
        }

        // 6. Статистика
        const stats = {
            avitoDatesTotal: avitoDates.size,
            eventsCount: events.length,
            added: toAdd.length,
            removed: toRemove.length,
            unchanged: avitoDates.size - toAdd.length,
            durationMs: Date.now() - startTime,
        }

        lastSyncAt = new Date().toISOString()
        lastSyncError = null
        lastSyncStats = stats

        if (toAdd.length > 0 || toRemove.length > 0) {
            console.log(
                `✅ Авито-синхронизация завершена: +${toAdd.length} / -${toRemove.length} дат (${stats.durationMs}ms)`,
            )
        } else {
            console.log(`✅ Авито-синхронизация: без изменений (${stats.durationMs}ms)`)
        }

        return stats
    } catch (err) {
        lastSyncError = err.message
        lastSyncAt = new Date().toISOString()
        console.error("❌ Ошибка Авито-синхронизации:", err.message)
        return { error: err.message }
    } finally {
        isSyncing = false
    }
}

// ===== Запуск периодической синхронизации =====
function startSync() {
    if (!AVITO_ICAL_URL) {
        console.log("⚠️ Авито-синхронизация отключена: AVITO_ICAL_URL не задан в .env")
        return
    }

    if (!SYNC_ENABLED) {
        console.log("⚠️ Авито-синхронизация отключена: AVITO_SYNC_ENABLED=false")
        return
    }

    console.log(`🔄 Авито-синхронизация запущена (интервал: ${SYNC_INTERVAL_MS / 60000} мин)`)

    // Первый запуск через 15 секунд (дать БД подключиться)
    setTimeout(syncFromAvito, 15 * 1000)

    // Далее по расписанию
    syncTimer = setInterval(syncFromAvito, SYNC_INTERVAL_MS)
}

// ===== Остановка =====
function stopSync() {
    if (syncTimer) {
        clearInterval(syncTimer)
        syncTimer = null
        console.log("⏹️ Авито-синхронизация остановлена")
    }
}

// ===== Статус для админки =====
function getSyncStatus() {
    return {
        enabled: SYNC_ENABLED && !!AVITO_ICAL_URL,
        avitoIcalUrl: AVITO_ICAL_URL ? "***настроено***" : null,
        intervalMin: SYNC_INTERVAL_MS / 60000,
        lastSyncAt,
        lastSyncError,
        lastSyncStats,
        isSyncing,
    }
}

module.exports = {
    syncFromAvito,
    startSync,
    stopSync,
    getSyncStatus,
    // Экспортируем для тестирования
    parseICS,
    expandEventsToDates,
}
