/** @format */

import React, { useState, useEffect } from "react"
import "./BookingPage.css"

// Названия месяцев и дней на русском
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

// Сегодняшняя дата в формате "YYYY-MM-DD"
const TODAY = (() => {
    const now = new Date()
    const mm = String(now.getMonth() + 1).padStart(2, "0")
    const dd = String(now.getDate()).padStart(2, "0")
    return `${now.getFullYear()}-${mm}-${dd}`
})()

function BookingPage() {
    // ===== СОСТОЯНИЕ =====
    const [step, setStep] = useState(1) // текущий шаг (1, 2 или 3)
    const [month, setMonth] = useState(new Date()) // текущий месяц в календаре
    const [checkIn, setCheckIn] = useState(null) // дата заезда
    const [checkOut, setCheckOut] = useState(null) // дата выезда
    const [guests, setGuests] = useState(10) // кол-во гостей
    const [name, setName] = useState("")
    const [phone, setPhone] = useState("")
    const [comment, setComment] = useState("")
    const [blockedDates, setBlockedDates] = useState([]) // занятые даты с сервера
    const [price, setPrice] = useState(null) // расчёт стоимости с сервера
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")
    const [maxGuests, setMaxGuests] = useState(60) // FIX: загружается с сервера

    // ===== ЗАГРУЗКА ЗАНЯТЫХ ДАТ =====
    useEffect(() => {
        fetch("/api/bookings/availability")
            .then((res) => res.json())
            .then((data) => setBlockedDates(data.blockedDates || []))
            .catch(() => console.log("Не удалось загрузить даты"))
    }, [])

    // ===== ЗАГРУЗКА НАСТРОЕК (max_guests) =====
    useEffect(() => {
        fetch("/api/bookings/settings")
            .then((res) => res.json())
            .then((data) => {
                if (data.maxGuests) setMaxGuests(data.maxGuests)
            })
            .catch(() => console.log("Не удалось загрузить настройки"))
    }, [])

    // FIX: Безопасное форматирование Date в "YYYY-MM-DD" без UTC-сдвига
    function toLocalDateStr(date) {
        const y = date.getFullYear()
        const m = String(date.getMonth() + 1).padStart(2, "0")
        const d = String(date.getDate()).padStart(2, "0")
        return `${y}-${m}-${d}`
    }

    // ===== РАСЧЁТ СТОИМОСТИ =====
    // Автоматически считает, когда выбраны даты и кол-во гостей
    useEffect(() => {
        if (!checkIn || !checkOut) return

        fetch("/api/bookings/calculate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                checkIn: toLocalDateStr(checkIn),
                checkOut: toLocalDateStr(checkOut),
                guestCount: guests,
            }),
        })
            .then((res) => res.json())
            .then((data) => {
                // FIX: проверяем, что ответ не содержит ошибку
                if (data.error) {
                    console.log("Ошибка расчёта:", data.error)
                    setPrice(null)
                } else {
                    setPrice(data)
                }
            })
            .catch(() => {
                console.log("Не удалось рассчитать стоимость")
                setPrice(null)
            })
    }, [checkIn, checkOut, guests])

    // ===== КАЛЕНДАРЬ: вспомогательные функции =====

    // Сколько дней в месяце
    function getDaysInMonth(date) {
        return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
    }

    // Какой день недели у первого числа (0=Пн, 6=Вс)
    function getFirstDayOfWeek(date) {
        const day = new Date(date.getFullYear(), date.getMonth(), 1).getDay()
        return day === 0 ? 6 : day - 1 // переводим с Вс=0 на Пн=0
    }

    // Проверка: дата заблокирована?
    // FIX: нельзя использовать toISOString() — она конвертирует в UTC и сдвигает дату
    function isBlocked(day) {
        const mm = String(month.getMonth() + 1).padStart(2, "0")
        const dd = String(day).padStart(2, "0")
        const dateStr = `${month.getFullYear()}-${mm}-${dd}`
        return blockedDates.some((d) => d.startsWith(dateStr))
    }

    // Проверка: есть ли заблокированные даты внутри диапазона [start, end)?
    function hasBlockedInRange(start, end) {
        const current = new Date(start)
        while (current < end) {
            const mm = String(current.getMonth() + 1).padStart(2, "0")
            const dd = String(current.getDate()).padStart(2, "0")
            const dateStr = `${current.getFullYear()}-${mm}-${dd}`
            if (blockedDates.some((d) => d.startsWith(dateStr))) {
                return true
            }
            current.setDate(current.getDate() + 1)
        }
        return false
    }

    // Проверка: дата в прошлом?
    function isPast(day) {
        const date = new Date(month.getFullYear(), month.getMonth(), day)
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        return date < today
    }

    // Проверка: дата выбрана (заезд или выезд)?
    function isSelected(day) {
        const date = new Date(month.getFullYear(), month.getMonth(), day)
        return (
            (checkIn && date.getTime() === checkIn.getTime()) ||
            (checkOut && date.getTime() === checkOut.getTime())
        )
    }

    // Проверка: дата в диапазоне между заездом и выездом?
    function isInRange(day) {
        if (!checkIn || !checkOut) return false
        const date = new Date(month.getFullYear(), month.getMonth(), day)
        return date > checkIn && date < checkOut
    }

    // Клик по дню в календаре
    function handleDayClick(day) {
        const date = new Date(month.getFullYear(), month.getMonth(), day)

        if (!checkIn || (checkIn && checkOut)) {
            // Первый клик (или перевыбор) — устанавливаем заезд
            setCheckIn(date)
            setCheckOut(null)
            setPrice(null)
            setError("")
        } else {
            // Второй клик — устанавливаем выезд
            let start = checkIn
            let end = date

            // FIX: нельзя выбрать тот же день — минимум 1 ночь
            if (start.getTime() === end.getTime()) {
                setError("Минимальный срок бронирования — 1 ночь. Выберите другую дату выезда.")
                return
            }

            if (end < start) {
                // Если кликнули раньше заезда — меняем местами
                start = date
                end = checkIn
            }

            // FIX: проверяем, нет ли заблокированных дат внутри выбранного диапазона
            if (hasBlockedInRange(start, end)) {
                setError("В выбранном диапазоне есть занятые даты. Выберите другие даты.")
                setCheckIn(null)
                setCheckOut(null)
                setPrice(null)
                return
            }

            setCheckIn(start)
            setCheckOut(end)
            setError("")
        }
    }

    // Переключение месяцев
    // FIX: нельзя листать на месяцы в прошлом
    function prevMonth() {
        const now = new Date()
        const prev = new Date(month.getFullYear(), month.getMonth() - 1)
        // Не уходим раньше текущего месяца
        if (
            prev.getFullYear() > now.getFullYear() ||
            (prev.getFullYear() === now.getFullYear() && prev.getMonth() >= now.getMonth())
        ) {
            setMonth(prev)
        }
    }
    function nextMonth() {
        setMonth(new Date(month.getFullYear(), month.getMonth() + 1))
    }

    // Форматирование даты: 15.03.2026
    function formatDate(date) {
        if (!date) return "—"
        const d = date.getDate().toString().padStart(2, "0")
        const m = (date.getMonth() + 1).toString().padStart(2, "0")
        return `${d}.${m}.${date.getFullYear()}`
    }

    // FIX: Правильное склонение слова «ночь» для всех чисел (включая 21, 22, 111 и т.д.)
    function nightsWord(n) {
        const abs = Math.abs(n) % 100
        const lastDigit = abs % 10
        if (abs > 10 && abs < 20) return "ночей"
        if (lastDigit === 1) return "ночь"
        if (lastDigit >= 2 && lastDigit <= 4) return "ночи"
        return "ночей"
    }

    // Форматирование цены: 15 000
    function formatPrice(n) {
        return n?.toLocaleString("ru-RU") || "0"
    }

    // FIX: Простая валидация телефона (минимум 10 цифр)
    function isPhoneValid(phoneStr) {
        const digits = phoneStr.replace(/\D/g, "")
        return digits.length >= 10
    }

    // ===== ОТПРАВКА БРОНИРОВАНИЯ =====
    async function handleSubmit() {
        // FIX: валидация телефона на фронте
        if (!isPhoneValid(phone)) {
            setError("Укажите корректный номер телефона (минимум 10 цифр)")
            return
        }

        setLoading(true)
        setError("")

        try {
            const response = await fetch("/api/bookings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    guestName: name,
                    phone: phone,
                    guestCount: guests,
                    checkIn: toLocalDateStr(checkIn),
                    checkOut: toLocalDateStr(checkOut),
                    comment: comment || null,
                }),
            })

            const data = await response.json()

            if (!response.ok) {
                setError(data.error || "Ошибка при создании бронирования")
                return
            }

            // Успех — переходим на шаг подтверждения
            setStep(3)
        } catch (err) {
            setError("Ошибка соединения с сервером")
        } finally {
            setLoading(false)
        }
    }

    // FIX: Функция для нового бронирования (сброс всего состояния)
    function handleNewBooking() {
        setStep(1)
        setCheckIn(null)
        setCheckOut(null)
        setGuests(10)
        setName("")
        setPhone("")
        setComment("")
        setPrice(null)
        setError("")
        // Перезагружаем занятые даты
        fetch("/api/bookings/availability")
            .then((res) => res.json())
            .then((data) => setBlockedDates(data.blockedDates || []))
            .catch(() => {})
    }

    // ===== РЕНДЕР =====
    const daysInMonth = getDaysInMonth(month)
    const firstDay = getFirstDayOfWeek(month)

    return (
        <main className="booking-page">
            <div className="container booking-container">
                <h1 className="section-title">Бронирование</h1>
                <p className="section-subtitle">Выберите даты и забронируйте «Лесной домик»</p>

                {/* ===== ПРОГРЕСС-БАР ===== */}
                <div className="progress">
                    {[
                        { num: 1, label: "Даты" },
                        { num: 2, label: "Данные" },
                        { num: 3, label: "Готово" },
                    ].map((s) => (
                        <React.Fragment key={s.num}>
                            <div className="progress__step">
                                <div
                                    className={`progress__circle ${step >= s.num ? "progress__circle--active" : ""}`}>
                                    {step > s.num ? "✓" : s.num}
                                </div>
                                <span
                                    className={`progress__label ${step >= s.num ? "progress__label--active" : ""}`}>
                                    {s.label}
                                </span>
                            </div>
                            {s.num < 3 && (
                                <div
                                    className={`progress__line ${step > s.num ? "progress__line--active" : ""}`}
                                />
                            )}
                        </React.Fragment>
                    ))}
                </div>

                {/* ===== ШАГ 1: КАЛЕНДАРЬ ===== */}
                {step === 1 && (
                    <div className="booking-card">
                        {/* Заголовок с переключением месяца */}
                        <div className="calendar-header">
                            <button onClick={prevMonth} className="calendar-nav">
                                ‹
                            </button>
                            <span className="calendar-month font-display">
                                {MONTHS[month.getMonth()]} {month.getFullYear()}
                            </span>
                            <button onClick={nextMonth} className="calendar-nav">
                                ›
                            </button>
                        </div>

                        {/* Дни недели */}
                        <div className="calendar-grid">
                            {DAYS.map((d) => (
                                <div key={d} className="calendar-dayname">
                                    {d}
                                </div>
                            ))}

                            {/* Пустые ячейки до первого дня */}
                            {Array.from({ length: firstDay }).map((_, i) => (
                                <div key={`empty-${i}`} />
                            ))}

                            {/* Дни месяца */}
                            {Array.from({ length: daysInMonth }).map((_, i) => {
                                const day = i + 1
                                const disabled = isBlocked(day) || isPast(day)
                                const selected = isSelected(day)
                                const inRange = isInRange(day)
                                const mm = String(month.getMonth() + 1).padStart(2, "0")
                                const dd = String(day).padStart(2, "0")
                                const isToday = `${month.getFullYear()}-${mm}-${dd}` === TODAY

                                return (
                                    <button
                                        key={day}
                                        onClick={() => !disabled && handleDayClick(day)}
                                        disabled={disabled}
                                        className={`calendar-day 
                      ${selected ? "calendar-day--selected" : ""} 
                      ${inRange ? "calendar-day--range" : ""}
                      ${disabled ? "calendar-day--disabled" : ""}
                      ${isToday ? "calendar-day--today" : ""}`}>
                                        {day}
                                    </button>
                                )
                            })}
                        </div>

                        {/* Выбранные даты и кнопка */}
                        <div className="calendar-footer">
                            <div className="calendar-dates">
                                <span>
                                    Заезд: <strong>{formatDate(checkIn)}</strong>
                                </span>
                                <span>
                                    Выезд: <strong>{formatDate(checkOut)}</strong>
                                </span>
                                {price && (
                                    <span className="calendar-nights">
                                        {price.nights} {nightsWord(price.nights)}
                                    </span>
                                )}
                            </div>
                            <button
                                onClick={() => setStep(2)}
                                disabled={!checkIn || !checkOut}
                                className="btn-primary"
                                style={{
                                    padding: "12px 32px",
                                    fontSize: 15,
                                    opacity: !checkIn || !checkOut ? 0.4 : 1,
                                }}>
                                Далее →
                            </button>
                        </div>
                    </div>
                )}

                {/* ===== ШАГ 2: ДАННЫЕ ГОСТЯ ===== */}
                {step === 2 && (
                    <div className="booking-card">
                        <h3 className="booking-card__title font-display">Данные гостя</h3>

                        <div className="form-group">
                            <label className="form-label">Имя</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Иван Петров"
                                className="form-input"
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Телефон</label>
                            <input
                                type="tel"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                placeholder="+7 (999) 123-45-67"
                                className="form-input"
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Количество гостей</label>
                            <div className="guest-counter">
                                <button
                                    onClick={() => setGuests(Math.max(1, guests - 1))}
                                    className="guest-counter__btn">
                                    −
                                </button>
                                <span className="guest-counter__value">{guests}</span>
                                <button
                                    onClick={() => setGuests(Math.min(maxGuests, guests + 1))}
                                    className="guest-counter__btn">
                                    +
                                </button>
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Комментарий (необязательно)</label>
                            <textarea
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                                placeholder="День рождения, нужна баня..."
                                className="form-input form-textarea"
                                rows={3}
                            />
                        </div>

                        {/* Расчёт стоимости */}
                        {price && (
                            <div className="price-card">
                                <div className="price-card__title">Расчёт стоимости</div>

                                <div className="price-row">
                                    <span>
                                        Базовая цена: {formatPrice(price.basePrice)} ₽ × {price.nights}{" "}
                                        {nightsWord(price.nights)}
                                    </span>
                                    <span>{formatPrice(price.basePrice * price.nights)} ₽</span>
                                </div>

                                {price.extraGuests > 0 && (
                                    <div className="price-row">
                                        <span>
                                            Надбавка: {price.guestSurcharge} ₽ × {price.extraGuests} чел. ×{" "}
                                            {price.nights} ноч.
                                        </span>
                                        <span>
                                            {formatPrice(
                                                price.extraGuests * price.guestSurcharge * price.nights,
                                            )}{" "}
                                            ₽
                                        </span>
                                    </div>
                                )}

                                <div className="price-total">
                                    <span>Итого</span>
                                    <span className="price-total__value">
                                        {formatPrice(price.totalPrice)} ₽
                                    </span>
                                </div>

                                <div className="price-prepay">
                                    <span>Предоплата ({price.prepayPercent}%)</span>
                                    <span className="price-prepay__value">
                                        {formatPrice(price.prepayment)} ₽
                                    </span>
                                </div>
                            </div>
                        )}

                        {error && <div className="booking-error">{error}</div>}

                        <div className="booking-actions">
                            <button onClick={() => setStep(1)} className="btn-outline">
                                ← Назад
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={!name || !phone || loading}
                                className="btn-primary"
                                style={{
                                    padding: "12px 32px",
                                    fontSize: 15,
                                    opacity: !name || !phone ? 0.4 : 1,
                                }}>
                                {loading ? "Отправка..." : "Забронировать →"}
                            </button>
                        </div>
                    </div>
                )}

                {/* ===== ШАГ 3: ПОДТВЕРЖДЕНИЕ ===== */}
                {step === 3 && (
                    <div className="booking-card" style={{ textAlign: "center" }}>
                        <div className="success-icon">✓</div>
                        <h3 className="booking-card__title font-display">Бронирование создано!</h3>
                        <p style={{ color: "var(--muted)", marginBottom: 32 }}>
                            Скоро мы свяжемся с вами для подтверждения.
                            <br />
                            Когда подключим оплату — здесь будет кнопка «Оплатить».
                        </p>

                        <div className="confirm-details">
                            {[
                                { label: "Гость", value: name },
                                { label: "Телефон", value: phone },
                                { label: "Гостей", value: guests },
                                { label: "Заезд", value: formatDate(checkIn) },
                                { label: "Выезд", value: formatDate(checkOut) },
                                { label: "Ночей", value: price?.nights },
                                { label: "Итого", value: `${formatPrice(price?.totalPrice)} ₽` },
                                { label: "Предоплата", value: `${formatPrice(price?.prepayment)} ₽` },
                            ].map((row, i) => (
                                <div key={i} className="confirm-row">
                                    <span>{row.label}</span>
                                    <strong>{row.value}</strong>
                                </div>
                            ))}
                        </div>

                        {/* FIX: кнопка «Новое бронирование» */}
                        <button
                            onClick={handleNewBooking}
                            className="btn-primary"
                            style={{ marginTop: 24, padding: "12px 32px" }}>
                            Новое бронирование
                        </button>
                    </div>
                )}
            </div>
        </main>
    )
}

export default BookingPage
