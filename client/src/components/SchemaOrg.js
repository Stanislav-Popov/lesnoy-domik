/** @format */

import { Helmet } from "react-helmet-async"

export default function SchemaOrg() {
    const schema = {
        "@context": "https://schema.org",
        "@type": "LodgingBusiness",
        name: "Лесной домик — загородный дом для аренды",
        description:
            "Загородный дом для аренды посуточно в Новой Москве. До 60 гостей, 6 спален, русская баня, барбекю. Для праздников, корпоративов, выходных.",
        url: "https://lesnoy-domik.ru",
        telephone: "+79153663735",
        email: "info@lesnoy-domik.ru",
        image: [
            "https://lesnoy-domik.ru/images/house-1.webp",
            "https://lesnoy-domik.ru/images/house-2.webp",
            "https://lesnoy-domik.ru/images/living-room-1.webp",
            "https://lesnoy-domik.ru/images/grill-1.webp",
        ],
        address: {
            "@type": "PostalAddress",
            streetAddress: "деревня Мешково, 173",
            addressLocality: "Москва",
            addressRegion: "Новомосковский административный округ",
            postalCode: "108814",
            addressCountry: "RU",
        },
        geo: {
            "@type": "GeoCoordinates",
            latitude: 55.5948,
            longitude: 37.3483,
        },
        openingHoursSpecification: {
            "@type": "OpeningHoursSpecification",
            dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
            opens: "00:00",
            closes: "23:59",
        },
        checkinTime: "15:00",
        checkoutTime: "12:00",
        amenityFeature: [
            { "@type": "LocationFeatureSpecification", name: "Wi-Fi", value: true },
            { "@type": "LocationFeatureSpecification", name: "Бесплатная парковка", value: true },
            { "@type": "LocationFeatureSpecification", name: "Русская баня", value: true },
            { "@type": "LocationFeatureSpecification", name: "Зона барбекю", value: true },
            { "@type": "LocationFeatureSpecification", name: "Караоке", value: true },
            { "@type": "LocationFeatureSpecification", name: "Настольный теннис", value: true },
            { "@type": "LocationFeatureSpecification", name: "6 спален", value: true },
            { "@type": "LocationFeatureSpecification", name: "Кухня", value: true },
        ],
        numberOfRooms: 6,
        petsAllowed: false,
        smokingAllowed: false,
        starRating: {
            "@type": "Rating",
            ratingValue: "4.9",
        },
        aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: "4.9",
            reviewCount: "47",
            bestRating: "5",
        },
        priceRange: "₽₽₽",
        currenciesAccepted: "RUB",
        paymentAccepted: "Перевод на карту, наличные",
    }

    // FAQ разметка — для расширенных сниппетов
    const faq = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: [
            {
                "@type": "Question",
                name: "Сколько стоит аренда загородного дома посуточно?",
                acceptedAnswer: {
                    "@type": "Answer",
                    text: "Стоимость аренды «Лесного домика» зависит от дня недели и количества гостей. В будни — от 15 000 ₽/сутки, в выходные — от 25 000 ₽/сутки. В стоимость включено проживание до 10 гостей. Точную стоимость с учётом ваших дат можно рассчитать на странице бронирования.",
                },
            },
            {
                "@type": "Question",
                name: "Сколько гостей вмещает дом?",
                acceptedAnswer: {
                    "@type": "Answer",
                    text: "Загородный дом «Лесной домик» вмещает до 60 гостей для мероприятий. Для ночёвки — до 30 человек в 6 спальнях. Есть детская комната с кроватками.",
                },
            },
            {
                "@type": "Question",
                name: "Есть ли баня?",
                acceptedAnswer: {
                    "@type": "Answer",
                    text: "Да, рядом с основным домом расположен отдельный домик с русской баней. После бани можно прогуляться к ближайшему пруду.",
                },
            },
            {
                "@type": "Question",
                name: "Как добраться до дома?",
                acceptedAnswer: {
                    "@type": "Answer",
                    text: "Дом находится в деревне Мешково, 173, Филимонковский район, Новомосковский АО, Москва. Примерно 30 минут от МКАД. Есть бесплатная парковка.",
                },
            },
            {
                "@type": "Question",
                name: "Можно ли проводить мероприятия и праздники?",
                acceptedAnswer: {
                    "@type": "Answer",
                    text: "Да, дом идеально подходит для праздников, дней рождения, корпоративов, свадеб и тимбилдингов. Просторный зал на первом этаже вмещает до 60 человек за большим столом. Есть караоке, гитара и зона барбекю.",
                },
            },
            {
                "@type": "Question",
                name: "Какое время заезда и выезда?",
                acceptedAnswer: {
                    "@type": "Answer",
                    text: "Заезд с 15:00, выезд до 12:00. Возможен ранний заезд и поздний выезд по согласованию.",
                },
            },
        ],
    }

    // BreadcrumbList
    const breadcrumb = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
            {
                "@type": "ListItem",
                position: 1,
                name: "Главная",
                item: "https://lesnoy-domik.ru/",
            },
            {
                "@type": "ListItem",
                position: 2,
                name: "Галерея",
                item: "https://lesnoy-domik.ru/gallery",
            },
            {
                "@type": "ListItem",
                position: 3,
                name: "Бронирование",
                item: "https://lesnoy-domik.ru/booking",
            },
        ],
    }

    return (
        <Helmet>
            <script type="application/ld+json">{JSON.stringify(schema)}</script>
            <script type="application/ld+json">{JSON.stringify(faq)}</script>
            <script type="application/ld+json">{JSON.stringify(breadcrumb)}</script>
        </Helmet>
    )
}
