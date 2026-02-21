/** @format */

import React, { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import SEO from '../components/SEO';
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
    const [consent, setConsent] = useState(false) // согласие на обработку ПД
    const [blockedDates, setBlockedDates] = useState([]) // занятые даты с сервера
    const [price, setPrice] = useState(null) // расчёт стоимости с сервера
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")
    const [maxGuests, setMaxGuests] = useState(30) // загружается с сервера
    const [settings, setSettings] = useState(null) // все настройки

    // ===== ЗАГРУЗКА ЗАНЯТЫХ ДАТ =====
    useEffect(() => {
        fetch("/api/bookings/availability")
            .then((res) => res.json())
            .then((data) => setBlockedDates(data.blockedDates || []))
            .catch(() => console.log("Не удалось загрузить даты"))
    }, [])

    // ===== ЗАГРУЗКА НАСТРОЕК =====
    useEffect(() => {
        fetch("/api/bookings/settings")
            .then((res) => res.json())
            .then((data) => {
                setSettings(data)
                if (data.maxGuests) setMaxGuests(data.maxGuests)
                if (data.includedGuests) setGuests(Math.min(10, data.includedGuests))
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

    function getDaysInMonth(date) {
        return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
    }

    function getFirstDayOfWeek(date) {
        const day = new Date(date.getFullYear(), date.getMonth(), 1).getDay()
        return day === 0 ? 6 : day - 1
    }

    function isBlocked(day) {
        const mm = String(month.getMonth() + 1).padStart(2, "0")
        const dd = String(day).padStart(2, "0")
        const dateStr = `${month.getFullYear()}-${mm}-${dd}`
        return blockedDates.some((d) => d.startsWith(dateStr))
    }

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

    function isPast(day) {
        const date = new Date(month.getFullYear(), month.getMonth(), day)
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        return date < today
    }

    function isSelected(day) {
        const date = new Date(month.getFullYear(), month.getMonth(), day)
        return (
            (checkIn && date.getTime() === checkIn.getTime()) ||
            (checkOut && date.getTime() === checkOut.getTime())
        )
    }

    function isInRange(day) {
        if (!checkIn || !checkOut) return false
        const date = new Date(month.getFullYear(), month.getMonth(), day)
        return date > checkIn && date < checkOut
    }

    function handleDayClick(day) {
        const date = new Date(month.getFullYear(), month.getMonth(), day)

        if (!checkIn || (checkIn && checkOut)) {
            setCheckIn(date)
            setCheckOut(null)
            setPrice(null)
            setError("")
        } else {
            let start = checkIn
            let end = date

            if (start.getTime() === end.getTime()) {
                setError("Минимальный срок бронирования — 1 ночь. Выберите другую дату выезда.")
                return
            }

            if (end < start) {
                start = date
                end = checkIn
            }

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

    function prevMonth() {
        const now = new Date()
        const prev = new Date(month.getFullYear(), month.getMonth() - 1)
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

    function formatDate(date) {
        if (!date) return "—"
        const d = date.getDate().toString().padStart(2, "0")
        const m = (date.getMonth() + 1).toString().padStart(2, "0")
        return `${d}.${m}.${date.getFullYear()}`
    }

    function nightsWord(n) {
        const abs = Math.abs(n) % 100
        const lastDigit = abs % 10
        if (abs > 10 && abs < 20) return "ночей"
        if (lastDigit === 1) return "ночь"
        if (lastDigit >= 2 && lastDigit <= 4) return "ночи"
        return "ночей"
    }

    function formatPrice(n) {
        return n?.toLocaleString("ru-RU") || "0"
    }

    function isPhoneValid(phoneStr) {
        const digits = phoneStr.replace(/\D/g, "")
        return digits.length >= 10
    }

    // ===== ОТПРАВКА БРОНИРОВАНИЯ =====
    async function handleSubmit() {
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
        setConsent(false)
        setPrice(null)
        setError("")
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
            <SEO
                title="Забронировать загородный дом — онлайн бронирование"
                description="Онлайн-бронирование загородного дома «Лесной домик» — выберите даты, узнайте стоимость и забронируйте за 2 минуты. Посуточная аренда от ₽XX XXX."
                canonical="/booking"
            />

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
                        {/* Информация о ценах */}
                        {settings && (
                            <div className="pricing-info">
                                <div className="pricing-info__row">
                                    <span>Будни (пн–чт)</span>
                                    <strong>{formatPrice(settings.weekdayPrice)} ₽ / сутки</strong>
                                </div>
                                <div className="pricing-info__row">
                                    <span>Выходные (пт–вс)</span>
                                    <strong>{formatPrice(settings.weekendPrice)} ₽ / сутки</strong>
                                </div>
                                <div className="pricing-info__note">
                                    До {settings.includedGuests} гостей включено • Залог{" "}
                                    {formatPrice(settings.deposit)} ₽ (возвращается)
                                </div>
                            </div>
                        )}

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
                            {settings && guests > settings.includedGuests && (
                                <span
                                    className="form-hint"
                                    style={{ color: "#f59e0b", fontSize: 13, marginTop: 4 }}>
                                    +{formatPrice(settings.guestSurcharge)} ₽ за каждого гостя сверх{" "}
                                    {settings.includedGuests}
                                </span>
                            )}
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

                                {price.weekdayNights > 0 && (
                                    <div className="price-row">
                                        <span>
                                            Будни: {formatPrice(price.weekdayPrice)} ₽ × {price.weekdayNights}{" "}
                                            {nightsWord(price.weekdayNights)}
                                        </span>
                                        <span>{formatPrice(price.weekdayPrice * price.weekdayNights)} ₽</span>
                                    </div>
                                )}

                                {price.weekendNights > 0 && (
                                    <div className="price-row">
                                        <span>
                                            Выходные: {formatPrice(price.weekendPrice)} ₽ ×{" "}
                                            {price.weekendNights} {nightsWord(price.weekendNights)}
                                        </span>
                                        <span>{formatPrice(price.weekendPrice * price.weekendNights)} ₽</span>
                                    </div>
                                )}

                                {price.extraGuests > 0 && (
                                    <div className="price-row">
                                        <span>
                                            Доп. гости: {formatPrice(price.guestSurcharge)} ₽ ×{" "}
                                            {price.extraGuests} чел. × {price.nights} ноч.
                                        </span>
                                        <span>{formatPrice(price.guestSurchargeTotal)} ₽</span>
                                    </div>
                                )}

                                <div className="price-total">
                                    <span>Итого за аренду</span>
                                    <span className="price-total__value">
                                        {formatPrice(price.totalPrice)} ₽
                                    </span>
                                </div>

                                <div className="price-deposit">
                                    <span>Залог (возвращается)</span>
                                    <span className="price-deposit__value">
                                        {formatPrice(price.deposit)} ₽
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* Условия */}
                        <div className="conditions-note">
                            <p>
                                📋 <strong>Условия бронирования:</strong>
                            </p>
                            <p>
                                • Залог {formatPrice(settings?.deposit)} ₽ — возвращается при отсутствии
                                повреждений
                            </p>
                            <p>
                                • При сильном загрязнении — доплата {formatPrice(settings?.cleaningFee)} ₽ за
                                уборку
                            </p>
                            <p>• Оплата производится через Telegram или по телефону</p>
                        </div>

                        {error && <div className="booking-error">{error}</div>}

                        {/* Согласие на обработку персональных данных */}
                        <div className="consent-group">
                            <label className="consent-label">
                                <input
                                    type="checkbox"
                                    checked={consent}
                                    onChange={(e) => setConsent(e.target.checked)}
                                    className="consent-checkbox"
                                />
                                <span className="consent-text">
                                    Я соглашаюсь с{" "}
                                    <Link to="/offer" target="_blank">
                                        условиями договора-оферты
                                    </Link>{" "}
                                    и{" "}
                                    <Link to="/privacy" target="_blank">
                                        политикой конфиденциальности
                                    </Link>
                                    , а также даю согласие на обработку моих персональных данных
                                </span>
                            </label>
                        </div>

                        <div className="booking-actions">
                            <button onClick={() => setStep(1)} className="btn-outline">
                                ← Назад
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={!name || !phone || !consent || loading}
                                className="btn-primary"
                                style={{
                                    padding: "12px 32px",
                                    fontSize: 15,
                                    opacity: !name || !phone || !consent ? 0.4 : 1,
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

                        <div className="payment-cta">
                            <p className="payment-cta__title">Для оплаты свяжитесь с нами:</p>
                            <a
                                href="https://t.me/+79661136344"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="payment-cta__telegram">
                                ✈ Написать в Telegram
                            </a>
                            <a href="tel:+79153663735" className="payment-cta__phone">
                                📞 +7 915 366 37 35
                            </a>
                            <p className="payment-cta__warning">
                                ⏳ Даты временно забронированы. Если оплата не поступит в течение 24 часов,
                                бронь будет автоматически отменена.
                            </p>
                        </div>

                        <div className="confirm-details">
                            {[
                                { label: "Гость", value: name },
                                { label: "Телефон", value: phone },
                                { label: "Гостей", value: guests },
                                { label: "Заезд", value: formatDate(checkIn) },
                                { label: "Выезд", value: formatDate(checkOut) },
                                { label: "Ночей", value: price?.nights },
                                { label: "Итого", value: `${formatPrice(price?.totalPrice)} ₽` },
                                { label: "Залог", value: `${formatPrice(price?.deposit)} ₽ (возвращается)` },
                            ].map((row, i) => (
                                <div key={i} className="confirm-row">
                                    <span>{row.label}</span>
                                    <strong>{row.value}</strong>
                                </div>
                            ))}
                        </div>

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
