/** @format */

// =============================================================
// Миграция БД: добавление поддержки синхронизации с Авито
// =============================================================
//
// Запустить ОДИН раз: node migrate-avito-sync.js
//
// Что делает:
// 1. Добавляет колонку `source` в blocked_dates
//    - NULL или 'local' = дата создана на сайте (бронь или ручная блокировка)
//    - 'avito' = дата пришла с Авито
// 2. Создаёт таблицу sync_log для отслеживания истории синхронизаций
//
// Безопасно: IF NOT EXISTS / ADD COLUMN IF NOT EXISTS
// Не ломает существующие данные.
// =============================================================

const pool = require("./db")

async function migrate() {
    const client = await pool.connect()

    try {
        await client.query("BEGIN")

        // 1. Добавляем колонку source в blocked_dates
        console.log("📦 Добавляю колонку source в blocked_dates...")
        await client.query(`
            ALTER TABLE blocked_dates 
            ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT NULL
        `)

        // 2. Индекс для быстрого поиска по source
        console.log("📦 Создаю индекс на source...")
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_blocked_dates_source 
            ON blocked_dates(source)
        `)

        // 3. Таблица логов синхронизации (опционально, для отладки)
        console.log("📦 Создаю таблицу sync_log...")
        await client.query(`
            CREATE TABLE IF NOT EXISTS sync_log (
                id SERIAL PRIMARY KEY,
                sync_type VARCHAR(50) NOT NULL,
                status VARCHAR(20) NOT NULL,
                dates_added INTEGER DEFAULT 0,
                dates_removed INTEGER DEFAULT 0,
                duration_ms INTEGER,
                error_message TEXT,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `)

        // 4. Автоочистка старых логов (оставляем последние 500)
        console.log("📦 Создаю функцию очистки логов...")
        await client.query(`
            CREATE OR REPLACE FUNCTION cleanup_sync_log()
            RETURNS TRIGGER AS $$
            BEGIN
                DELETE FROM sync_log 
                WHERE id NOT IN (
                    SELECT id FROM sync_log ORDER BY created_at DESC LIMIT 500
                );
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql
        `)

        // Проверяем, существует ли триггер
        const triggerExists = await client.query(`
            SELECT 1 FROM pg_trigger WHERE tgname = 'trg_cleanup_sync_log'
        `)
        if (triggerExists.rows.length === 0) {
            await client.query(`
                CREATE TRIGGER trg_cleanup_sync_log
                AFTER INSERT ON sync_log
                FOR EACH STATEMENT
                EXECUTE FUNCTION cleanup_sync_log()
            `)
        }

        await client.query("COMMIT")

        console.log("")
        console.log("✅ Миграция завершена успешно!")
        console.log("")
        console.log("Следующие шаги:")
        console.log("1. Добавьте в .env:")
        console.log("   AVITO_ICAL_URL=https://www.avito.ru/calendars-export/80/15/8045462215.ics")
        console.log("   SITE_DOMAIN=lesnoy-domik.ru")
        console.log("")
        console.log("2. В Авито «Синхронизация календарей» → «Добавить календарь»:")
        console.log("   Вставьте: https://ваш-домен.ru/api/calendar/export.ics")
        console.log("")
    } catch (err) {
        await client.query("ROLLBACK")
        console.error("❌ Ошибка миграции:", err.message)
        throw err
    } finally {
        client.release()
        pool.end()
    }
}

migrate()
