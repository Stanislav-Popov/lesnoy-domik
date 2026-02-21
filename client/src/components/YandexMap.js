/** @format */

import React from "react"

// Простая встраиваемая карта Яндекс — без API ключа
// Замените координаты на координаты вашего дома

function YandexMap() {
    // Координаты дома (найдите на yandex.ru/maps, кликнув правой кнопкой → "Что здесь?")
    const lat = 55.591452 // широта — замените на свою
    const lng = 37.329213 // долгота — замените на свою
    const zoom = 13

    // Ссылка на встроенную карту Яндекс (работает без API-ключа)
    const src = `https://yandex.ru/map-widget/v1/?ll=${lng},${lat}&z=${zoom}&pt=${lng},${lat},pm2gnm`

    return (
        <iframe
            title="Карта"
            src={src}
            width="100%"
            height="280"
            style={{ border: "none", borderRadius: 16 }}
            allowFullScreen
        />
    )
}

export default YandexMap
