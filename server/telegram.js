/** @format */

// Отправка уведомлений в Telegram через Bot API
// Используем обычный fetch (встроен в Node.js 18+)

const TELEGRAM_API = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`
const CHAT_ID = process.env.TELEGRAM_CHAT_ID

// FIX: Эскейпим спецсимволы Markdown, чтобы пользовательские данные не ломали сообщение
function escapeMarkdown(text) {
    if (!text) return ""
    return String(text).replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, "\\$&")
}

// Форматируем дату: 15.03.2026
// FIX: парсим строку "YYYY-MM-DD" вручную, без new Date() (избегаем UTC-сдвига)
function formatDate(dateStr) {
    const s = String(dateStr)
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
        const parts = s.substring(0, 10).split("-")
        return `${parts[2]}.${parts[1]}.${parts[0]}`
    }
    const d = new Date(dateStr)
    return d.toLocaleDateString("ru-RU")
}

// Форматируем цену: 15 000
function formatPrice(num) {
    return Number(num).toLocaleString("ru-RU")
}

// Отправка сообщения в Telegram
async function sendTelegramMessage(text) {
    if (!process.env.TELEGRAM_BOT_TOKEN || !CHAT_ID) {
        console.log("⚠️ Telegram не настроен, уведомление пропущено")
        return
    }

    try {
        const response = await fetch(`${TELEGRAM_API}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                chat_id: CHAT_ID,
                text: text,
                parse_mode: "MarkdownV2",
            }),
        })

        const data = await response.json()

        if (data.ok) {
            console.log("✅ Telegram уведомление отправлено")
        } else {
            console.error("❌ Telegram ошибка:", data.description)
        }
    } catch (err) {
        console.error("❌ Telegram ошибка:", err.message)
    }
}

// ===== Уведомление о новом бронировании =====
async function sendBookingNotification(booking) {
    const message = [
        "🏠 *Новое бронирование\\!*",
        "",
        `👤 Имя: ${escapeMarkdown(booking.guest_name)}`,
        `📞 Телефон: ${escapeMarkdown(booking.phone)}`,
        `👥 Гостей: ${escapeMarkdown(booking.guest_count)}`,
        `📅 Заезд: ${escapeMarkdown(formatDate(booking.check_in))}`,
        `📅 Выезд: ${escapeMarkdown(formatDate(booking.check_out))}`,
        "",
        `💰 *Сумма: ${escapeMarkdown(formatPrice(booking.total_price))} ₽*`,
        booking.comment ? `\n💬 Комментарий: ${escapeMarkdown(booking.comment)}` : "",
        "",
        `⏳ *Статус: Ожидает оплаты*`,
    ].join("\n")

    await sendTelegramMessage(message)
}

// ===== Уведомление: даты забронированы, но не оплачены =====
async function sendPendingWarning(booking, cancelHours) {
    const message = [
        "⚠️ *Даты забронированы, но НЕ оплачены*",
        "",
        `👤 ${escapeMarkdown(booking.guest_name)}`,
        `📅 ${escapeMarkdown(formatDate(booking.check_in))} — ${escapeMarkdown(formatDate(booking.check_out))}`,
        "",
        `⏰ Бронь будет *автоматически отменена* через *${escapeMarkdown(String(cancelHours))} ч*, если оплата не поступит\\.`,
        "",
        `Для подтверждения оплаты — измените статус на «Оплачено» в админ\\-панели\\.`,
    ].join("\n")

    await sendTelegramMessage(message)
}

// ===== Уведомление: бронь автоматически отменена =====
async function sendCancelledNotification(booking) {
    const message = [
        "❌ *Бронирование автоматически отменено*",
        "",
        `👤 ${escapeMarkdown(booking.guest_name)}`,
        `📞 ${escapeMarkdown(booking.phone || "")}`,
        `📅 ${escapeMarkdown(formatDate(booking.check_in))} — ${escapeMarkdown(formatDate(booking.check_out))}`,
        "",
        `Причина: предоплата не поступила в установленный срок\\.`,
        `Даты снова доступны для бронирования\\.`,
    ].join("\n")

    await sendTelegramMessage(message)
}

// ===== Напоминание: предоплата не поступила (отправляется через 8 часов) =====
async function sendPendingReminder(booking, cancelHours) {
    const remainingHours = Math.max(0, cancelHours - 8)
    const message = [
        "🔔 *Напоминание: предоплата не поступила*",
        "",
        `👤 ${escapeMarkdown(booking.guest_name)}`,
        `📞 ${escapeMarkdown(booking.phone || "")}`,
        `📅 ${escapeMarkdown(formatDate(booking.check_in))} — ${escapeMarkdown(formatDate(booking.check_out))}`,
        "",
        `⏰ Прошло 8 часов с момента бронирования\\.`,
        remainingHours > 0
            ? `Бронь будет *автоматически отменена* через *${escapeMarkdown(String(remainingHours))} ч*, если оплата не поступит\\.`
            : `Бронь будет *отменена в ближайшее время*, если оплата не поступит\\.`,
        "",
        `Подтвердите оплату в админ\\-панели или отмените бронирование\\.`,
        `Ссылка на админ панель`,
    ].join("\n")

    await sendTelegramMessage(message)
}

module.exports = { sendBookingNotification, sendPendingWarning, sendCancelledNotification, sendPendingReminder }