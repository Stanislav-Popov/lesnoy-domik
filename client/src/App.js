/** @format */

import React from "react"
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom"
import { HelmetProvider } from "react-helmet-async"
import { useEffect } from "react"
import Navbar from "./components/Navbar"
import Footer from "./components/Footer"
import HomePage from "./pages/HomePage"
import GalleryPage from "./pages/GalleryPage"
import BookingPage from "./pages/BookingPage"
import AdminPage from "./pages/AdminPage"
import PrivacyPage from "./pages/PrivacyPage"
import OfferPage from "./pages/OfferPage"
import "./App.css"

function ScrollToTop() {
    const { pathname } = useLocation()
    useEffect(() => {
        window.scrollTo(0, 0)
    }, [pathname])
    return null
}

function App() {
    return (
        <HelmetProvider>
            <BrowserRouter>
                <ScrollToTop />
                <Navbar />
                <Routes>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/gallery" element={<GalleryPage />} />
                    <Route path="/booking" element={<BookingPage />} />
                    <Route path="/admin" element={<AdminPage />} />
                    <Route path="/privacy" element={<PrivacyPage />} />
                    <Route path="/offer" element={<OfferPage />} />
                </Routes>
                <Footer />
            </BrowserRouter>
        </HelmetProvider>
    )
}

export default App
