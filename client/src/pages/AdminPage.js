/** @format */

import React, { useState, useEffect } from "react"
import "./AdminPage.css"

// Вкладки админки
const TABS = [
    { key: "bookings", label: "📋 Бронирования" },
    { key: "prices", label: "💰 Цены" },
    { key: "calendar", label: "📅 Календарь" },
]

const MONTHS = [
    "Январь",
    "Февраль",
    "Март",
    "Апрель",
    "Май",
    "Июнь",
    "Июль",
    "Август",
    "Сентябрь",
    "Октябрь",
    "Ноябрь",
    "Декабрь",
]
const DAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"]

const STATUS_LABELS = {
    PENDING: "Ожидает оплаты",
    PAID: "Оплачено",
    CONFIRMED: "Подтверждено",
    CANCELLED: "Отменено",
}

const STATUS_COLORS = {
    PENDING: "#f59e0b",
    PAID: "#2E7D4F",
    CONFIRMED: "#1B3A2D",
    CANCELLED: "#dc2626",
}

// Форматирование даты в "YYYY-MM-DD" из компонентов (без UTC-сдвига)
function toLocalDateStr(year, month, day) {
    const mm = String(month + 1).padStart(2, "0")
    const dd = String(day).padStart(2, "0")
    return `${year}-${mm}-${dd}`
}

// Сегодняшняя дата в формате "YYYY-MM-DD"
const TODAY = (() => {
    const now = new Date()
    return toLocalDateStr(now.getFullYear(), now.getMonth(), now.getDate())
})()

function AdminPage() {
    const [token, setToken] = useState(localStorage.getItem("adminToken") || "")
    const [isLoggedIn, setIsLoggedIn] = useState(false)
    const [tab, setTab] = useState("bookings")

    // Проверяем токен при загрузке
    useEffect(() => {
        if (token) {
            fetch("/api/admin/bookings", {
                headers: { Authorization: `Bearer ${token}` },
            })
                .then((res) => {
                    if (res.ok) setIsLoggedIn(true)
                    else {
                        setToken("")
                        localStorage.removeItem("adminToken")
                    }
                })
                .catch(() => {
                    setToken("")
                    localStorage.removeItem("adminToken")
                })
        }
    }, [token])

    // ===== ФОРМА ВХОДА =====
    if (!isLoggedIn) {
        return (
            <LoginForm
                onLogin={(t) => {
                    setToken(t)
                    setIsLoggedIn(true)
                    localStorage.setItem("adminToken", t)
                }}
            />
        )
    }

    return (
        <main className="admin-page">
            <div className="admin-header">
                <h1 className="font-display">🌲 Админ-панель</h1>
                <button
                    onClick={() => {
                        setToken("")
                        setIsLoggedIn(false)
                        localStorage.removeItem("adminToken")
                    }}
                    className="admin-logout">
                    Выйти
                </button>
            </div>

            {/* Вкладки */}
            <div className="admin-tabs">
                {TABS.map((t) => (
                    <button
                        key={t.key}
                        onClick={() => setTab(t.key)}
                        className={`admin-tab ${tab === t.key ? "admin-tab--active" : ""}`}>
                        {t.label}
                    </button>
                ))}
            </div>

            <div className="admin-content">
                {tab === "bookings" && <BookingsTab token={token} />}
                {tab === "prices" && <PricesTab token={token} />}
                {tab === "calendar" && <CalendarTab token={token} />}
            </div>
        </main>
    )
}

// ===== ФОРМА ВХОДА =====
function LoginForm({ onLogin }) {
    const [login, setLogin] = useState("")
    const [password, setPassword] = useState("")
    const [error, setError] = useState("")
    const [loading, setLoading] = useState(false)

    async function handleSubmit(e) {
        e.preventDefault()
        setError("")
        setLoading(true)

        try {
            const res = await fetch("/api/admin/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ login, password }),
            })

            const data = await res.json()

            if (res.ok) {
                onLogin(data.token)
            } else {
                setError(data.error || "Ошибка входа")
            }
        } catch (err) {
            setError("Ошибка соединения с сервером")
        } finally {
            setLoading(false)
        }
    }

    return (
        <main className="admin-login">
            <form onSubmit={handleSubmit} className="admin-login__form">
                <h2 className="font-display" style={{ color: "var(--forest)", marginBottom: 24 }}>
                    🌲 Вход в админку
                </h2>
                <input
                    type="text"
                    placeholder="Логин"
                    value={login}
                    onChange={(e) => setLogin(e.target.value)}
                    className="form-input"
                    style={{ marginBottom: 12 }}
                />
                <input
                    type="password"
                    placeholder="Пароль"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="form-input"
                    style={{ marginBottom: 16 }}
                />
                {error && (
                    <div className="booking-error" style={{ marginBottom: 12 }}>
                        {error}
                    </div>
                )}
                <button type="submit" className="btn-primary" style={{ width: "100%" }} disabled={loading}>
                    {loading ? "Вход..." : "Войти"}
                </button>
            </form>
        </main>
    )
}

// ===== ВКЛАДКА: БРОНИРОВАНИЯ =====
function BookingsTab({ token }) {
    const [bookings, setBookings] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")

    useEffect(() => {
        loadBookings()
    }, [token]) // eslint-disable-line react-hooks/exhaustive-deps

    async function loadBookings() {
        setLoading(true)
        setError("")
        try {
            const res = await fetch("/api/admin/bookings", {
                headers: { Authorization: `Bearer ${token}` },
            })
            if (!res.ok) throw new Error("Ошибка загрузки")
            const data = await res.json()
            setBookings(Array.isArray(data) ? data : data.bookings || [])
        } catch (err) {
            setError("Не удалось загрузить бронирования")
        } finally {
            setLoading(false)
        }
    }

    async function changeStatus(id, status) {
        if (status === "CANCELLED") {
            const confirmed = window.confirm(
                "Вы уверены, что хотите отменить это бронирование? Даты будут разблокированы.",
            )
            if (!confirmed) return
        }

        try {
            const res = await fetch(`/api/admin/bookings/${id}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ status }),
            })
            if (!res.ok) {
                const data = await res.json()
                alert(data.error || "Ошибка обновления статуса")
                return
            }
            loadBookings()
        } catch (err) {
            alert("Ошибка соединения с сервером")
        }
    }

    async function deleteBooking(id) {
        const confirmed = window.confirm(
            "Вы уверены, что хотите удалить это бронирование из списка? Действие необратимо.",
        )
        if (!confirmed) return

        try {
            const res = await fetch(`/api/admin/bookings/${id}`, {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            })
            if (!res.ok) {
                const data = await res.json()
                alert(data.error || "Ошибка удаления")
                return
            }
            loadBookings()
        } catch (err) {
            alert("Ошибка соединения с сервером")
        }
    }

    // FIX: форматируем дату из строки "YYYY-MM-DD" (теперь гарантированно строка из db.js)
    function formatDate(d) {
        if (!d) return "—"
        const s = String(d)
        // "YYYY-MM-DD" → "DD.MM.YYYY"
        if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
            const parts = s.substring(0, 10).split("-")
            return `${parts[2]}.${parts[1]}.${parts[0]}`
        }
        return s
    }

    if (loading) return <p>Загрузка...</p>
    if (error) return <p style={{ color: "#dc2626", textAlign: "center", padding: 40 }}>{error}</p>

    if (bookings.length === 0) {
        return (
            <p style={{ color: "var(--muted)", textAlign: "center", padding: 40 }}>Бронирований пока нет</p>
        )
    }

    return (
        <div className="bookings-list">
            {bookings.map((b) => (
                <div key={b.id} className="booking-item">
                    <div className="booking-item__header">
                        <div>
                            <strong>{b.guest_name}</strong>
                            <span className="booking-item__phone">{b.phone}</span>
                        </div>
                        <span
                            className="booking-item__status"
                            style={{
                                background: STATUS_COLORS[b.status] + "20",
                                color: STATUS_COLORS[b.status],
                            }}>
                            {STATUS_LABELS[b.status]}
                        </span>
                    </div>

                    <div className="booking-item__details">
                        <span>
                            📅 {formatDate(b.check_in)} — {formatDate(b.check_out)}
                        </span>
                        <span>👥 {b.guest_count} гостей</span>
                        <span>💰 {Number(b.total_price).toLocaleString("ru")} ₽</span>
                        <span>💳 Предоплата: {Number(b.prepayment).toLocaleString("ru")} ₽</span>
                    </div>

                    {b.comment && <div className="booking-item__comment">💬 {b.comment}</div>}

                    <div className="booking-item__actions">
                        {b.status === "PAID" && (
                            <button
                                onClick={() => changeStatus(b.id, "CONFIRMED")}
                                className="btn-small btn-small--green">
                                ✓ Подтвердить
                            </button>
                        )}
                        {b.status !== "CANCELLED" && (
                            <button
                                onClick={() => changeStatus(b.id, "CANCELLED")}
                                className="btn-small btn-small--red">
                                ✕ Отменить
                            </button>
                        )}
                        {b.status === "CANCELLED" && (
                            <button onClick={() => deleteBooking(b.id)} className="btn-small btn-small--red">
                                🗑 Удалить из списка
                            </button>
                        )}
                    </div>
                </div>
            ))}
        </div>
    )
}

// ===== ВКЛАДКА: ЦЕНЫ =====
function PricesTab({ token }) {
    const [settings, setSettings] = useState({
        base_price: 15000,
        guest_surcharge: 500,
        included_guests: 10,
        prepay_percent: 30,
        max_guests: 60,
    })
    const [saved, setSaved] = useState(false)
    const [error, setError] = useState("")

    useEffect(() => {
        fetch("/api/admin/settings", {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then((res) => res.json())
            .then((data) => setSettings(data))
            .catch(() => setError("Не удалось загрузить настройки"))
    }, [token])

    function handleChange(key, value) {
        setSettings({ ...settings, [key]: Number(value) })
        setSaved(false)
    }

    async function handleSave() {
        setError("")
        try {
            const res = await fetch("/api/admin/settings", {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(settings),
            })
            if (!res.ok) {
                const data = await res.json()
                setError(data.error || "Ошибка сохранения")
                return
            }
            setSaved(true)
            setTimeout(() => setSaved(false), 3000)
        } catch (err) {
            setError("Ошибка соединения с сервером")
        }
    }

    const fields = [
        { key: "base_price", label: "Базовая цена за сутки (₽)", hint: "Стоимость аренды за одну ночь" },
        { key: "guest_surcharge", label: "Надбавка за гостя (₽)", hint: "За каждого гостя сверх включённых" },
        {
            key: "included_guests",
            label: "Гостей включено в цену",
            hint: "Сколько гостей входит в базовую цену",
        },
        {
            key: "prepay_percent",
            label: "Процент предоплаты (%)",
            hint: "Сколько % от суммы платит гость сразу",
        },
        { key: "max_guests", label: "Максимум гостей", hint: "Ограничение на количество гостей" },
    ]

    return (
        <div className="prices-form">
            {fields.map((f) => (
                <div key={f.key} className="price-field">
                    <label className="form-label">{f.label}</label>
                    <input
                        type="number"
                        value={settings[f.key] || ""}
                        onChange={(e) => handleChange(f.key, e.target.value)}
                        className="form-input"
                        style={{ maxWidth: 200 }}
                    />
                    <span className="price-field__hint">{f.hint}</span>
                </div>
            ))}

            {error && (
                <div className="booking-error" style={{ marginTop: 12 }}>
                    {error}
                </div>
            )}

            <button onClick={handleSave} className="btn-primary" style={{ marginTop: 16 }}>
                Сохранить настройки
            </button>

            {saved && <span className="save-success">✅ Сохранено!</span>}
        </div>
    )
}

// ===== ВКЛАДКА: КАЛЕНДАРЬ =====
function CalendarTab({ token }) {
    const [month, setMonth] = useState(new Date())
    const [blockedDates, setBlockedDates] = useState([])
    const [error, setError] = useState("")

    useEffect(() => {
        loadDates()
    }, [token]) // eslint-disable-line react-hooks/exhaustive-deps

    async function loadDates() {
        try {
            const res = await fetch("/api/admin/blocked-dates", {
                headers: { Authorization: `Bearer ${token}` },
            })
            if (!res.ok) throw new Error("Ошибка загрузки")
            const data = await res.json()
            setBlockedDates(data)
        } catch (err) {
            setError("Не удалось загрузить заблокированные даты")
        }
    }

    // Теперь d.date — гарантированно строка "YYYY-MM-DD" (фикс type parser в db.js)
    function isBlocked(day) {
        const dateStr = toLocalDateStr(month.getFullYear(), month.getMonth(), day)
        return blockedDates.some((d) => d.date === dateStr)
    }

    function getBlockedInfo(day) {
        const dateStr = toLocalDateStr(month.getFullYear(), month.getMonth(), day)
        return blockedDates.find((d) => d.date === dateStr)
    }

    async function toggleDate(day) {
        const dateStr = toLocalDateStr(month.getFullYear(), month.getMonth(), day)
        const info = getBlockedInfo(day)

        try {
            if (info) {
                // Разблокировать (только ручные, не привязанные к бронированию)
                if (info.booking_id) {
                    alert("Эта дата привязана к бронированию. Отмените бронирование, чтобы разблокировать.")
                    return
                }
                await fetch(`/api/admin/blocked-dates/${dateStr}`, {
                    method: "DELETE",
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                })
            } else {
                // Заблокировать
                await fetch("/api/admin/blocked-dates", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({ date: dateStr, reason: "Ручная блокировка" }),
                })
            }

            loadDates()
        } catch (err) {
            alert("Ошибка соединения с сервером")
        }
    }

    const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
    const firstDay = (() => {
        const d = new Date(month.getFullYear(), month.getMonth(), 1).getDay()
        return d === 0 ? 6 : d - 1
    })()

    return (
        <div>
            <p style={{ color: "var(--muted)", fontSize: 14, marginBottom: 20 }}>
                Кликните по дате, чтобы заблокировать или разблокировать.
                <br />
                🟢 — свободно, 🔴 — бронь, 🟡 — ручная блокировка.
            </p>

            {error && (
                <div className="booking-error" style={{ marginBottom: 12 }}>
                    {error}
                </div>
            )}

            <div className="admin-calendar">
                <div className="calendar-header">
                    <button
                        onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1))}
                        className="calendar-nav">
                        ‹
                    </button>
                    <span className="calendar-month font-display">
                        {MONTHS[month.getMonth()]} {month.getFullYear()}
                    </span>
                    <button
                        onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1))}
                        className="calendar-nav">
                        ›
                    </button>
                </div>

                <div className="calendar-grid">
                    {DAYS.map((d) => (
                        <div key={d} className="calendar-dayname">
                            {d}
                        </div>
                    ))}
                    {Array.from({ length: firstDay }).map((_, i) => (
                        <div key={`e-${i}`} />
                    ))}
                    {Array.from({ length: daysInMonth }).map((_, i) => {
                        const day = i + 1
                        const blocked = isBlocked(day)
                        const info = getBlockedInfo(day)
                        const isBooking = info?.booking_id
                        const isToday = toLocalDateStr(month.getFullYear(), month.getMonth(), day) === TODAY

                        return (
                            <button
                                key={day}
                                onClick={() => toggleDate(day)}
                                className={`calendar-day admin-calendar-day
                  ${blocked ? (isBooking ? "admin-day--booked" : "admin-day--blocked") : ""}
                  ${isToday ? "calendar-day--today" : ""}`}
                                title={blocked ? info?.reason || "Заблокировано" : "Свободно"}>
                                {day}
                            </button>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}

export default AdminPage
