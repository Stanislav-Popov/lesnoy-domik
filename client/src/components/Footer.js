/** @format */

import React from "react"
import { Link } from "react-router-dom"

function Footer() {
    return (
        <footer
            style={{
                padding: "40px 24px 32px",
                background: "var(--forest)",
                textAlign: "center",
            }}>
            {/* Юридические ссылки */}
            <div
                style={{
                    display: "flex",
                    justifyContent: "center",
                    gap: "16px",
                    flexWrap: "wrap",
                    marginBottom: 16,
                }}>
                <Link
                    to="/privacy"
                    style={{
                        color: "rgba(255,255,255,0.5)",
                        fontSize: 13,
                        textDecoration: "none",
                        whiteSpace: "nowrap",
                    }}>
                    Политика конфиденциальности
                </Link>
                <span style={{ color: "rgba(255,255,255,0.2)" }}>·</span>
                <Link
                    to="/offer"
                    style={{
                        color: "rgba(255,255,255,0.5)",
                        fontSize: 13,
                        textDecoration: "none",
                        whiteSpace: "nowrap",
                    }}>
                    Договор-оферта
                </Link>
            </div>

            {/* Реквизиты */}
            <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 12, marginBottom: 8, lineHeight: 1.6 }}>
                ИП [ФИО] · ИНН [номер] · ОГРНИП [номер]
            </p>

            {/* Контакты */}
            <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 12, marginBottom: 16, lineHeight: 1.6 }}>
                Тел.:{" "}
                <a href="tel:+79991234567" style={{ color: "rgba(255,255,255,0.45)" }}>
                    +7 915 366 37 35
                </a>{" "}
                · Email:{" "}
                <a href="mailto:info@lesnoy-domik.ru" style={{ color: "rgba(255,255,255,0.45)" }}>
                    info@lesnoy-domik.ru
                </a>
            </p>

            {/* Копирайт */}
            <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 12 }}>
                © 2026 «Лесной домик». Все права защищены.
            </p>

            {/* Яндекс Карты */}
            <p style={{ color: "rgba(255,255,255,0.2)", fontSize: 11, marginTop: 8 }}>
                <a
                    href="https://yandex.ru/legal/maps_api/"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: "rgba(255,255,255,0.25)" }}>
                    Условия использования Яндекс Карт
                </a>
            </p>
        </footer>
    )
}

export default Footer
