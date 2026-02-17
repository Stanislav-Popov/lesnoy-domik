/** @format */

import React, { useState, useEffect, useCallback } from "react"
import "./GalleryPage.css"

// Фото-заглушки (замените на свои позже)
const PHOTOS = [
    {
        id: 1,
        cat: "interior",
        url: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&q=80",
        alt: "Гостиная",
    },
    {
        id: 2,
        cat: "exterior",
        url: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=600&q=80",
        alt: "Дом снаружи",
    },
    {
        id: 3,
        cat: "nature",
        url: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=600&q=80",
        alt: "Лес",
    },
    {
        id: 4,
        cat: "bath",
        url: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=600&q=80",
        alt: "Баня",
    },
    {
        id: 5,
        cat: "interior",
        url: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=600&q=80",
        alt: "Спальня",
    },
    {
        id: 6,
        cat: "nature",
        url: "https://images.unsplash.com/photo-1448375240586-882707db888b?w=600&q=80",
        alt: "Пруд",
    },
    {
        id: 7,
        cat: "events",
        url: "https://images.unsplash.com/photo-1529543544282-ea51407b4bdc?w=600&q=80",
        alt: "Мероприятие",
    },
    {
        id: 8,
        cat: "exterior",
        url: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=600&q=80",
        alt: "Терраса",
    },
    {
        id: 9,
        cat: "interior",
        url: "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=600&q=80",
        alt: "Кухня",
    },
]

const CATEGORIES = [
    { key: "all", label: "Все" },
    { key: "interior", label: "Дом внутри" },
    { key: "exterior", label: "Участок" },
    { key: "bath", label: "Баня" },
    { key: "nature", label: "Природа" },
    { key: "events", label: "Мероприятия" },
]

function GalleryPage() {
    const [filter, setFilter] = useState("all")
    const [lightbox, setLightbox] = useState(null) // индекс открытого фото

    const filtered = filter === "all" ? PHOTOS : PHOTOS.filter((p) => p.cat === filter)

    // FIX: Сбрасываем lightbox при смене фильтра, чтобы не выйти за пределы массива
    function handleFilterChange(newFilter) {
        setLightbox(null)
        setFilter(newFilter)
    }

    // FIX: используем useCallback чтобы не пересоздавать функции при каждом рендере
    const goNext = useCallback(() => {
        setLightbox((i) => (i !== null ? Math.min(i + 1, filtered.length - 1) : null))
    }, [filtered.length])

    const goPrev = useCallback(() => {
        setLightbox((i) => (i !== null ? Math.max(i - 1, 0) : null))
    }, [])

    // FIX: добавлен массив зависимостей — обработчик не пересоздаётся на каждый рендер
    useEffect(() => {
        const handleKey = (e) => {
            if (e.key === "Escape") setLightbox(null)
            if (e.key === "ArrowRight") goNext()
            if (e.key === "ArrowLeft") goPrev()
        }
        window.addEventListener("keydown", handleKey)
        return () => window.removeEventListener("keydown", handleKey)
    }, [goNext, goPrev])

    return (
        <main className="gallery-page">
            <div className="container">
                <h1 className="section-title">Галерея</h1>
                <p className="section-subtitle">Рассмотрите каждый уголок нашего дома</p>

                {/* Фильтры по категориям */}
                <div className="gallery-filters">
                    {CATEGORIES.map((cat) => (
                        <button
                            key={cat.key}
                            onClick={() => handleFilterChange(cat.key)}
                            className={`gallery-filter ${filter === cat.key ? "gallery-filter--active" : ""}`}>
                            {cat.label}
                        </button>
                    ))}
                </div>

                {/* Сетка фото */}
                <div className="gallery-grid">
                    {filtered.map((photo, index) => (
                        <div key={photo.id} className="gallery-item" onClick={() => setLightbox(index)}>
                            <img src={photo.url} alt={photo.alt} loading="lazy" />
                            <div className="gallery-item__overlay">
                                <span className="gallery-item__alt">{photo.alt}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Lightbox (полноэкранный просмотр) */}
            {lightbox !== null && filtered[lightbox] && (
                <div className="lightbox" onClick={() => setLightbox(null)}>
                    {/* Кнопка «Назад» */}
                    <button
                        className="lightbox__btn lightbox__btn--prev"
                        onClick={(e) => {
                            e.stopPropagation()
                            goPrev()
                        }}
                        disabled={lightbox === 0}>
                        ‹
                    </button>

                    {/* Фото */}
                    <img
                        src={filtered[lightbox].url}
                        alt={filtered[lightbox].alt}
                        className="lightbox__img"
                        onClick={(e) => e.stopPropagation()}
                    />

                    {/* Кнопка «Вперёд» */}
                    <button
                        className="lightbox__btn lightbox__btn--next"
                        onClick={(e) => {
                            e.stopPropagation()
                            goNext()
                        }}
                        disabled={lightbox === filtered.length - 1}>
                        ›
                    </button>

                    {/* Кнопка закрытия */}
                    <button className="lightbox__close" onClick={() => setLightbox(null)}>
                        ✕
                    </button>

                    {/* Счётчик */}
                    <div className="lightbox__counter">
                        {lightbox + 1} / {filtered.length}
                    </div>
                </div>
            )}
        </main>
    )
}

export default GalleryPage
