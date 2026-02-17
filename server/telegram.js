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

async function sendBookingNotification(booking) {
    // Если токен не настроен — просто пропускаем (не ломаем работу)
    if (!process.env.TELEGRAM_BOT_TOKEN || !CHAT_ID) {
        console.log("⚠️ Telegram не настроен, уведомление пропущено")
        return
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

    // Собираем сообщение (FIX: эскейпим пользовательские данные)
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
        `💳 *Предоплата: ${escapeMarkdown(formatPrice(booking.prepayment))} ₽*`,
        booking.comment ? `\n💬 Комментарий: ${escapeMarkdown(booking.comment)}` : "",
    ].join("\n")

    try {
        const response = await fetch(`${TELEGRAM_API}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                chat_id: CHAT_ID,
                text: message,
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

module.exports = { sendBookingNotification }
