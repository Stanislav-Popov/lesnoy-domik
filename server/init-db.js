// Этот скрипт создаёт все таблицы в базе данных.
// Запускается ОДИН раз при настройке проекта.

const pool = require("./db");

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
    `);
    console.log("✅ Таблица bookings создана");

    // ===== ЗАБЛОКИРОВАННЫЕ ДАТЫ =====
    await pool.query(`
      CREATE TABLE IF NOT EXISTS blocked_dates (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        date DATE NOT NULL UNIQUE,
        reason VARCHAR(255),
        booking_id UUID REFERENCES bookings(id)
      );
    `);
    console.log("✅ Таблица blocked_dates создана");

    // ===== НАСТРОЙКИ (цены, процент предоплаты) =====
    await pool.query(`
      CREATE TABLE IF NOT EXISTS settings (
        key VARCHAR(100) PRIMARY KEY,
        value JSONB NOT NULL
      );
    `);
    console.log("✅ Таблица settings создана");

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
    `);
    console.log("✅ Таблица photos создана");

    // ===== НАЧАЛЬНЫЕ НАСТРОЙКИ =====
    const defaults = [
      ["base_price", 15000],
      ["guest_surcharge", 500],
      ["included_guests", 10],
      ["prepay_percent", 30],
      ["max_guests", 60],
    ];

    for (const [key, value] of defaults) {
      await pool.query(
        `INSERT INTO settings (key, value)
         VALUES ($1, $2)
         ON CONFLICT (key) DO NOTHING`,
        [key, JSON.stringify(value)]
      );
    }
    console.log("✅ Настройки по умолчанию загружены");

    console.log("\n🎉 База данных готова к работе!");
  } catch (err) {
    console.error("❌ Ошибка:", err.message);
  } finally {
    pool.end();
  }
}

initDatabase();