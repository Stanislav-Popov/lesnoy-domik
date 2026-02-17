/** @format */

import React, { useState, useEffect } from "react"
import { Link, useLocation } from "react-router-dom"
import "./Navbar.css"

function Navbar() {
    const [scrolled, setScrolled] = useState(false)
    const [menuOpen, setMenuOpen] = useState(false) // FIX: мобильное меню
    const location = useLocation()

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 60)
        window.addEventListener("scroll", handleScroll)
        return () => window.removeEventListener("scroll", handleScroll)
    }, [])

    // Закрываем меню при навигации
    useEffect(() => {
        setMenuOpen(false)
    }, [location.pathname])

    // FIX: блокируем прокрутку страницы при открытом мобильном меню
    useEffect(() => {
        if (menuOpen) {
            document.body.style.overflow = "hidden"
        } else {
            document.body.style.overflow = ""
        }
        return () => {
            document.body.style.overflow = ""
        }
    }, [menuOpen])

    // На главной — прозрачная шапка, на других — белая
    const isHome = location.pathname === "/"
    const showTransparent = isHome && !scrolled && !menuOpen

    return (
        <nav className={`navbar ${showTransparent ? "navbar--transparent" : "navbar--solid"}`}>
            <div className="navbar__inner">
                <Link to="/" className="navbar__logo">
                    <span className="navbar__logo-icon">🌲</span>
                    <span className={`navbar__logo-text ${showTransparent ? "text-white" : ""}`}>
                        Лесной домик
                    </span>
                </Link>

                {/* FIX: Бургер-кнопка для мобильных */}
                <button
                    className={`navbar__burger ${menuOpen ? "navbar__burger--open" : ""}`}
                    onClick={() => setMenuOpen(!menuOpen)}
                    aria-label="Меню">
                    <span
                        className={`navbar__burger-line ${showTransparent ? "navbar__burger-line--white" : ""}`}
                    />
                    <span
                        className={`navbar__burger-line ${showTransparent ? "navbar__burger-line--white" : ""}`}
                    />
                    <span
                        className={`navbar__burger-line ${showTransparent ? "navbar__burger-line--white" : ""}`}
                    />
                </button>

                <div className={`navbar__links ${menuOpen ? "navbar__links--open" : ""}`}>
                    {[
                        { to: "/", label: "Главная" },
                        { to: "/gallery", label: "Галерея" },
                    ].map((item) => (
                        <Link
                            key={item.to}
                            to={item.to}
                            className={`navbar__link ${
                                location.pathname === item.to ? "navbar__link--active" : ""
                            } ${showTransparent && !menuOpen ? "text-white-muted" : ""}`}>
                            {item.label}
                        </Link>
                    ))}

                    <Link
                        to="/booking"
                        className={`btn-primary ${location.pathname === "/booking" ? "navbar__link--active" : ""}`}
                        style={{ padding: "10px 24px", fontSize: "14px" }}>
                        Забронировать
                    </Link>
                </div>
            </div>
        </nav>
    )
}

export default Navbar
