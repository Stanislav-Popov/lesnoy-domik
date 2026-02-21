/** @format */

const BOTS =
    /googlebot|yandex|bingbot|baiduspider|facebookexternalhit|twitterbot|rogerbot|linkedinbot|embedly|quora link preview|showyoubot|outbrain|pinterest\/0\.|pinterestbot|slackbot|vkShare|W3C_Validator/i

module.exports = function prerenderMiddleware(req, res, next) {
    const userAgent = req.headers["user-agent"] || ""

    // Если бот — отдаём пререндеренную страницу
    if (BOTS.test(userAgent) && !req.path.startsWith("/api/")) {
        return require('prerender-node')
          .set('prerenderToken', 'YOUR_TOKEN')(req, res, next);

        next() // временно — пропускаем, пока не настроен prerender
    } else {
        next()
    }
}
