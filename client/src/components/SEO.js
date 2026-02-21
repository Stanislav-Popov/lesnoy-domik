/** @format */

import { Helmet } from "react-helmet-async"

const SITE_NAME = "Лесной домик"
const BASE_URL = "https://lesnoy-domik.ru" // замените на реальный домен

export default function SEO({ title, description, canonical, ogImage }) {
    const fullTitle = title ? `${title} | ${SITE_NAME}` : `${SITE_NAME} — аренда загородного дома посуточно`
    const img = ogImage || `${BASE_URL}/images/house-1.webp`

    return (
        <Helmet>
            <title>{fullTitle}</title>
            <meta name="description" content={description} />
            <link rel="canonical" href={`${BASE_URL}${canonical || "/"}`} />
            <meta property="og:title" content={fullTitle} />
            <meta property="og:description" content={description} />
            <meta property="og:url" content={`${BASE_URL}${canonical || "/"}`} />
            <meta property="og:image" content={img} />
        </Helmet>
    )
}
