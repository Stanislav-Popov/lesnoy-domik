/** @format */

import React, { useState, useEffect, useCallback } from "react"
import "./GalleryPage.css"

// Фото-заглушки (замените на свои позже)
const PHOTOS = [
    {
        id: 1,
        cat: "interior",
        url: "/images/badroom-1.webp",
        alt: "Гостиная",
    },
    {
        id: 1,
        cat: "interior",
        url: "/images/badroom-2.webp",
        alt: "Гостиная",
    },
    {
        id: 1,
        cat: "interior",
        url: "/images/hallway-1.webp",
        alt: "Гостиная",
    },
    {
        id: 1,
        cat: "interior",
        url: "/images/kitchen-1.webp",
        alt: "Гостиная",
    },
    {
        id: 1,
        cat: "interior",
        url: "/images/living-room-1.webp",
        alt: "Гостиная",
    },
    {
        id: 1,
        cat: "interior",
        url: "/images/living-room-2.webp",
        alt: "Гостиная",
    },
    {
        id: 1,
        cat: "interior",
        url: "/images/living-room-3.webp",
        alt: "Гостиная",
    },
    {
        id: 4,
        cat: "interior",
        url: "/images/living-room-3.webp",
        alt: "Гостиная",
    },
    {
        id: 4,
        cat: "interior",
        url: "/images/living-room-3.webp",
        alt: "Гостиная",
    },
    {
        id: 4,
        cat: "interior",
        url: "/images/room-1.webp",
        alt: "Гостиная",
    },
    {
        id: 4,
        cat: "interior",
        url: "/images/wc-2.webp",
        alt: "Гостиная",
    },
    {
        id: 4,
        cat: "interior",
        url: "/images/grill-2.webp",
        alt: "Гостиная",
    },
    {
        id: 4,
        cat: "interior",
        url: "/images/porch-1.webp",
        alt: "Гостиная",
    },
    {
        id: 2,
        cat: "exterior",
        url: "/images/house-1.webp",
        alt: "Дом снаружи",
    },
    {
        id: 2,
        cat: "exterior",
        url: "/images/house-2.webp",
        alt: "Дом снаружи",
    },
    {
        id: 2,
        cat: "exterior",
        url: "/images/grill-1.webp",
        alt: "Дом снаружи",
    },
    {
        id: 2,
        cat: "exterior",
        url: "/images/grill-3.webp",
        alt: "Дом снаружи",
    },
]

const CATEGORIES = [
    { key: "all", label: "Все" },
    { key: "interior", label: "Дом внутри" },
    { key: "exterior", label: "Участок" },
    // { key: "bath", label: "Баня" },
    // { key: "nature", label: "Природа" },
    // { key: "events", label: "Мероприятия" },
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
