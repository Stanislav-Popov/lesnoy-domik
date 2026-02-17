/** @format */

// Главный файл сервера.
// Express принимает HTTP-запросы и направляет их в нужные обработчики.

const express = require("express")
const cors = require("cors")
const path = require("path")
require("dotenv").config()

const app = express()
const PORT = process.env.PORT || 5000

// ===== НАСТРОЙКИ =====

// Разрешаем запросы с фронтенда (React работает на порту 3000)
app.use(
    cors({
        origin: process.env.CLIENT_URL || "http://localhost:3000",
    }),
)

// Разрешаем серверу читать JSON из тела запроса
app.use(express.json())

// Раздаём загруженные фотографии как статику
app.use("/uploads", express.static(path.join(__dirname, "uploads")))

// ===== МАРШРУТЫ (API) =====

// Каждый маршрут — отдельный файл в папке routes/
app.use("/api/bookings", require("./routes/bookings"))
app.use("/api/settings", require("./routes/settings"))
app.use("/api/admin", require("./routes/admin"))

// ===== РАЗДАЧА ФРОНТЕНДА =====
app.use(express.static(path.join(__dirname, "../client/build")))

app.get("/{*path}", (req, res) => {
    res.sendFile(path.join(__dirname, "../client/build", "index.html"))
})

// ===== ЗАПУСК =====

app.listen(PORT, () => {
    console.log(`🚀 Сервер запущен: http://localhost:${PORT}`)
})
