/** @format */

// Этот скрипт создаёт все таблицы в базе данных.
// Запускается ОДИН раз при настройке проекта.

const pool = require("./db")

async function initDatabase() {
    try {
        // ===== ТАБЛИЦА БРОНИРОВАНИЙ =====
        await pool.query(`
      CREATE TABLE IF NOT EXISTS bookings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        guest_name VARCHAR(255) NOT NULL,
        phone VARCHAR(50) NOT NULL,
        guest_count INTEGER NOT NULL,
        check_in DATE NOT NULL,
        check_out DATE NOT NULL,
        total_price DECIMAL(10,2) NOT NULL,
        prepayment DECIMAL(10,2) NOT NULL,
        status VARCHAR(20) DEFAULT 'PENDING',
        payment_id VARCHAR(255),
        comment TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `)
        console.log("✅ Таблица bookings создана")

        // ===== ЗАБЛОКИРОВАННЫЕ ДАТЫ =====
        await pool.query(`
      CREATE TABLE IF NOT EXISTS blocked_dates (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        date DATE NOT NULL UNIQUE,
        reason VARCHAR(255),
        booking_id UUID REFERENCES bookings(id)
      );
    `)
        console.log("✅ Таблица blocked_dates создана")

        // ===== НАСТРОЙКИ (цены, параметры) =====
        await pool.query(`
      CREATE TABLE IF NOT EXISTS settings (
        key VARCHAR(100) PRIMARY KEY,
        value JSONB NOT NULL
      );
    `)
        console.log("✅ Таблица settings создана")

        // ===== ФОТОГРАФИИ =====
        await pool.query(`
      CREATE TABLE IF NOT EXISTS photos (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        url VARCHAR(500) NOT NULL,
        category VARCHAR(50) NOT NULL,
        sort_order INTEGER DEFAULT 0,
        is_hero BOOLEAN DEFAULT false,
        alt VARCHAR(255) DEFAULT ''
      );
    `)
        console.log("✅ Таблица photos создана")

        // ===== НАЧАЛЬНЫЕ НАСТРОЙКИ =====
        // Обновлённые настройки:
        // - Будни (пн–чт): 30 000 ₽, Выходные (пт–вс): 50 000 ₽
        // - Макс. гостей включено: 15, доплата +1 000 ₽ за доп. гостя
        // - Залог: 30 000 ₽ (возвращается)
        // - Уборка при сильном загрязнении: 6 000 ₽
        // - Автоотмена PENDING через 24 часа
        const defaults = [
            ["weekday_price", 30000], // Будни (пн–чт)
            ["weekend_price", 50000], // Выходные (пт–вс)
            ["guest_surcharge", 1000], // Доплата за доп. гостя
            ["included_guests", 15], // Гостей без доплаты
            ["max_guests", 30], // Абсолютный максимум
            ["deposit", 30000], // Залог (возвращается)
            ["cleaning_fee", 6000], // Доплата за уборку
            ["pending_cancel_hours", 24], // Часов до автоотмены PENDING
        ]

        for (const [key, value] of defaults) {
            await pool.query(
                `INSERT INTO settings (key, value)
         VALUES ($1, $2)
         ON CONFLICT (key) DO NOTHING`,
                [key, JSON.stringify(value)],
            )
        }

        // Удаляем устаревшие ключи (если есть от предыдущей версии)
        await pool.query(`DELETE FROM settings WHERE key IN ('base_price', 'prepay_percent')`)

        console.log("✅ Настройки по умолчанию загружены")
        console.log("\n🎉 База данных готова к работе!")
    } catch (err) {
        console.error("❌ Ошибка:", err.message)
    } finally {
        pool.end()
    }
}

initDatabase()
