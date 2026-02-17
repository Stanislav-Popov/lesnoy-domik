/** @format */

import React, { useState, useEffect, useMemo } from "react"
import { Link } from "react-router-dom"
import "./HomePage.css"
import YandexMap from "../components/YandexMap"

// Генерация стабильного псевдослучайного числа по seed
function seededRandom(seed) {
    const x = Math.sin(seed * 9301 + 49297) * 49297
    return x - Math.floor(x)
}

function HomePage() {
    const [scrollY, setScrollY] = useState(0)

    useEffect(() => {
        const handleScroll = () => setScrollY(window.scrollY)
        window.addEventListener("scroll", handleScroll, { passive: true })
        return () => window.removeEventListener("scroll", handleScroll)
    }, [])

    // FIX: Позиции светлячков вычисляются ОДИН РАЗ и не меняются при re-render
    const fireflies = useMemo(() => {
        return Array.from({ length: 15 }).map((_, i) => ({
            left: `${8 + seededRandom(i * 4 + 1) * 84}%`,
            top: `${15 + seededRandom(i * 4 + 2) * 55}%`,
            animationDelay: `${seededRandom(i * 4 + 3) * 6}s`,
            animationDuration: `${4 + seededRandom(i * 4 + 4) * 5}s`,
        }))
    }, [])

    return (
        <main>
            {/* ===== HERO с анимированным лесом ===== */}
            <section className="hero">
                {/* Светлячки — позиции стабильны, только CSS-пульсация */}
                <div className="hero__fireflies">
                    {fireflies.map((style, i) => (
                        <div key={i} className="hero__firefly" style={style} />
                    ))}
                </div>

                {/* Луна */}
                <div className="hero__moon" style={{ transform: `translateY(${scrollY * 0.15}px)` }} />

                {/* Слои леса (параллакс) */}
                <div
                    className="hero__trees hero__trees--back"
                    style={{ transform: `translateY(${scrollY * 0.08}px)` }}
                />
                <div
                    className="hero__trees hero__trees--mid"
                    style={{ transform: `translateY(${scrollY * 0.15}px)` }}
                />
                <div
                    className="hero__trees hero__trees--front"
                    style={{ transform: `translateY(${scrollY * 0.25}px)` }}
                />

                {/* Туман */}
                <div className="hero__mist" />

                {/* Контент */}
                <div
                    className="hero__content"
                    style={{ transform: `translateY(${scrollY * 0.4}px)`, opacity: 1 - scrollY / 600 }}>
                    <p className="hero__subtitle">Загородный дом для отдыха и мероприятий</p>
                    <h1 className="hero__title font-display">Лесной домик</h1>
                    <div className="hero__line" />
                    <p className="hero__desc">
                        Уютный дом в окружении соснового леса и пруда.
                        <br />
                        До 60 гостей, 6 спален, русская баня, зона барбекю.
                    </p>
                    <Link to="/booking" className="btn-primary hero__btn">
                        Забронировать
                    </Link>
                </div>

                {/* Стрелка вниз */}
                <div className="hero__scroll-hint">
                    <span>Листайте вниз</span>
                    <div className="hero__scroll-arrow" />
                </div>
            </section>

            {/* ===== О ДОМЕ (с фото) ===== */}
            <section className="section section--white">
                <div className="container">
                    <h2 className="section-title">Добро пожаловать</h2>
                    <p className="section-subtitle">Место, где время замедляется</p>

                    <div className="about-grid">
                        <div className="about-grid__images">
                            <img
                                src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&q=80"
                                alt="Гостиная"
                                className="about-grid__img about-grid__img--main"
                                loading="lazy"
                            />
                            <img
                                src="https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=400&q=80"
                                alt="Терраса"
                                className="about-grid__img about-grid__img--secondary"
                                loading="lazy"
                            />
                        </div>
                        <div className="about-grid__text">
                            <h3 className="about-grid__heading font-display">Ваш загородный дом мечты</h3>
                            <p>
                                «Лесной домик» — это просторный загородный дом площадью более 300 м²,
                                расположенный в живописном уголке Московской области. Дом окружён вековыми
                                соснами и находится на берегу тихого пруда.
                            </p>
                            <p>
                                Здесь вы найдёте всё для идеального отдыха: уютные спальни с панорамными
                                окнами в лес, полностью оборудованную кухню, просторную гостиную с камином и
                                зону барбекю на свежем воздухе.
                            </p>
                            <p>
                                Идеально подходит для семейных праздников, дней рождения, корпоративов,
                                свадебных вечеринок и просто спокойного отдыха в кругу близких людей.
                            </p>
                            <Link to="/gallery" className="btn-outline" style={{ marginTop: 8 }}>
                                Смотреть галерею →
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* ===== ПРЕИМУЩЕСТВА ===== */}
            <section className="section">
                <div className="container">
                    <h2 className="section-title">Всё для идеального отдыха</h2>
                    <p className="section-subtitle">
                        Мы продумали каждую деталь, чтобы ваш отдых был незабываемым
                    </p>

                    <div className="features-grid">
                        {[
                            {
                                emoji: "👥",
                                title: "До 60 гостей",
                                desc: "Просторный дом для больших компаний и мероприятий любого масштаба",
                            },
                            {
                                emoji: "🛏️",
                                title: "6 спален",
                                desc: "Комфортные комнаты с качественными кроватями и свежим бельём",
                            },
                            {
                                emoji: "☀️",
                                title: "Зона отдыха",
                                desc: "Большая терраса, мангальная зона, настольный теннис и бадминтон",
                            },
                            {
                                emoji: "🌲",
                                title: "Природа",
                                desc: "Сосновый лес и живописный пруд прямо за порогом дома",
                            },
                            {
                                emoji: "🔥",
                                title: "Русская баня",
                                desc: "Настоящая дровяная баня с парилкой, комнатой отдыха и купелью",
                            },
                        ].map((item, i) => (
                            <div key={i} className="feature-card">
                                <div className="feature-card__emoji">{item.emoji}</div>
                                <h3 className="feature-card__title">{item.title}</h3>
                                <p className="feature-card__desc">{item.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ===== ФОТОЛЕНТА ===== */}
            <section className="photo-strip">
                <div className="photo-strip__track">
                    {[
                        {
                            url: "/images/badroom-1.webp",
                            alt: "Спальня",
                        },
                        {
                            url: "/images/porch-1.webp",
                            alt: "Балкон",
                        },
                        {
                            url: "/images/hallway-1.webp",
                            alt: "Лес",
                        },
                        {
                            url: "/images/house-1.webp",
                            alt: "Дом",
                        },
                        {
                            url: "/images/kitchen-1.webp",
                            alt: "Кухня",
                        },
                        {
                            url: "/images/living-room-3.webp",
                            alt: "Гостиная",
                        },
                        {
                            url: "/images/living-room-1.webp",
                            alt: "Гостиная",
                        },
                        {
                            url: "/images/living-room-2.webp",
                            alt: "Отдых",
                        },
                    ].map((photo, i) => (
                        <div key={i} className="photo-strip__item">
                            <img src={photo.url} alt={photo.alt} loading="lazy" />
                        </div>
                    ))}
                </div>
            </section>

            {/* ===== ЧТО ВАС ЖДЁТ ===== */}
            <section className="section section--white">
                <div className="container">
                    <h2 className="section-title">Что вас ждёт</h2>
                    <p className="section-subtitle">Каждый уголок дома создан для вашего комфорта</p>

                    <div className="highlights">
                        {[
                            {
                                img: "/images/living-room-4.webp",
                                title: "Просторная гостиная",
                                text: "Большой зал с камином, мягкими диванами и панорамными окнами. Идеальное место для вечерних посиделок, настольных игр или просто тихого отдыха с книгой. Вечером потрескивание дров в камине создаёт неповторимую атмосферу уюта.",
                            },
                            {
                                img: "",
                                title: "Русская баня",
                                text: "Дровяная баня с просторной парилкой, комнатой отдыха и купелью на свежем воздухе. Банные принадлежности, веники и полотенца включены. После парной — прыжок в пруд или просто отдых на террасе с травяным чаем.",
                            },
                            {
                                img: "/images/grill-3.webp",
                                title: "Терраса и барбекю",
                                text: "Крытая терраса с большим обеденным столом на 20 человек, мангал и зона для барбекю. Проводите тёплые вечера на свежем воздухе под звёздным небом. Мы предоставляем уголь, решётки и всю необходимую посуду.",
                            },
                        ].map((item, i) => (
                            <div key={i} className={`highlight ${i % 2 !== 0 ? "highlight--reverse" : ""}`}>
                                <div className="highlight__img-wrap">
                                    <img src={item.img} alt={item.title} loading="lazy" />
                                </div>
                                <div className="highlight__text">
                                    <h3 className="font-display">{item.title}</h3>
                                    <p>{item.text}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ===== ИНФОРМАЦИЯ ===== */}
            <section className="section">
                <div className="container">
                    <h2 className="section-title">Информация для гостей</h2>
                    <p className="section-subtitle">Всё, что нужно знать перед бронированием</p>
                    <div className="info-grid">
                        {[
                            { emoji: "🕐", label: "Заезд", value: "с 15:00" },
                            { emoji: "🕛", label: "Выезд", value: "до 12:00" },
                            { emoji: "🐾", label: "Правила", value: "Без животных" },
                            { emoji: "🚗", label: "Парковка", value: "Бесплатная" },
                            { emoji: "📶", label: "Wi-Fi", value: "Есть" },
                            { emoji: "❄️", label: "Отопление", value: "Круглый год" },
                        ].map((item, i) => (
                            <div key={i} className="info-card">
                                <div className="info-card__emoji">{item.emoji}</div>
                                <div className="info-card__label">{item.label}</div>
                                <div className="info-card__value font-display">{item.value}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ===== CTA ===== */}
            <section className="cta-section">
                <div className="cta-section__bg" />
                <div className="container cta-section__inner">
                    <h2 className="font-display cta-section__title">Готовы к незабываемому отдыху?</h2>
                    <p className="cta-section__desc">
                        Забронируйте «Лесной домик» уже сегодня и подарите себе и близким выходные в окружении
                        природы, тишины и комфорта.
                    </p>
                    <Link to="/booking" className="btn-primary hero__btn">
                        Забронировать сейчас
                    </Link>
                </div>
            </section>

            {/* ===== КОНТАКТЫ ===== */}
            <section className="section section--white">
                <div className="container" style={{ textAlign: "center" }}>
                    <h2 className="section-title">Контакты</h2>
                    <p className="section-subtitle">Свяжитесь с нами любым удобным способом</p>
                    <div className="contacts-grid">
                        <div className="contact-card">
                            <div className="contact-card__icon">📞</div>
                            <div className="contact-card__label">Телефон</div>
                            <strong>+7 (999) 123-45-67</strong>
                        </div>
                        <div className="contact-card">
                            <div className="contact-card__icon">✈️</div>
                            <div className="contact-card__label">Telegram</div>
                            <strong>@cozy_forest_house_</strong>
                        </div>
                        <div className="contact-card">
                            <div className="contact-card__icon">📍</div>
                            <div className="contact-card__label">Адрес</div>
                            <strong>Московская обл., д. Лесная</strong>
                        </div>
                    </div>
                    <YandexMap />
                </div>
            </section>
        </main>
    )
}

export default HomePage
