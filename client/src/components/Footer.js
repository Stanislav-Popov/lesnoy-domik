/** @format */

import React from "react"

function Footer() {
    return (
        <footer
            style={{
                padding: "32px 24px",
                background: "var(--forest)",
                textAlign: "center",
            }}>
            <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13 }}>
                © 2026 «Лесной домик». Все права защищены.
            </p>
            <p style={{ color: "rgba(255,255,255,0.25)", fontSize: 11 }}>
                <a
                    href="https://yandex.ru/legal/maps_api/"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: "rgba(255,255,255,0.35)" }}>
                    Условия использования Яндекс Карт
                </a>
            </p>
        </footer>
    )
}

export default Footer
