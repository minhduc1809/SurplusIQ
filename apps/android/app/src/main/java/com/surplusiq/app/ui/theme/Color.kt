package com.surplusiq.app.ui.theme

import androidx.compose.ui.graphics.Color

// ============================================================================
// SurplusIQ Brand Colors - Light Blue & White Theme (Tông Xanh Dương Nhạt & Trắng)
// ============================================================================

// Signature Light Blue Palette
val SkyBluePrimary = Color(0xFF0284C7)         // Xanh dương chủ đạo (Sky Blue 600)
val SkyBlueDark = Color(0xFF0369A1)            // Xanh dương đậm nhấn tương phản (Sky Blue 700)
val SkyBlueLight = Color(0xFF38BDF8)           // Xanh dương sáng tươi tắn (Sky Blue 400)
val SkyBlueContainer = Color(0xFFE0F2FE)       // Xanh dương nhạt pastel (Sky Blue 100)
val SkyBlueIce = Color(0xFFF0F9FF)             // Nền trắng ánh xanh ngọc (Sky Blue 50)
val SkyBlueAccent = Color(0xFF0EA5E9)          // Xanh dương điện quang (Sky Blue 500)

// Warm & Alert Accents
val AmberAccent = Color(0xFFF59E0B)            // Vàng mật ong cho điểm số sao & giá giảm
val AmberLight = Color(0xFFFEF3C7)             // Vàng nhạt container
val CoralRed = Color(0xFFEF4444)               // Đỏ cam cho giờ nhận gấp & hủy đơn
val CoralRedLight = Color(0xFFFEE2E2)

// Pure White & Clean Surfaces
val AppBackground = Color(0xFFF8FAFC)          // Nền trắng ánh khói thanh khiết
val SurfaceWhite = Color(0xFFFFFFFF)           // Trắng tinh khiết 100% cho các thẻ Card
val SurfaceSubtle = Color(0xFFF1F5F9)          // Nền phụ phẳng mịn màng
val DividerColor = Color(0xFFE2E8F0)           // Đường kẻ phân cách viền mỏng tinh tế

// Typography Colors
val TextPrimary = Color(0xFF0F172A)            // Slate Navy đậm sắc nét, chống mỏi mắt
val TextSecondary = Color(0xFF475569)          // Slate trung tính rõ ràng
val TextMuted = Color(0xFF94A3B8)              // Xám ghi nhạt
val TextOnPrimary = Color(0xFFFFFFFF)          // Trắng tinh khiết trên nền nút xanh

// Dark Theme Variants
val DarkBackground = Color(0xFF0B1320)
val DarkSurface = Color(0xFF131F33)
val DarkTextPrimary = Color(0xFFF8FAFC)
val DarkTextSecondary = Color(0xFF94A3B8)

// Compatibility Aliases for legacy component bindings
val ForestGreenPrimary = SkyBluePrimary
val ForestGreenDark = SkyBlueDark
val ForestGreenLight = SkyBlueLight
val ForestGreenContainer = SkyBlueContainer
val MintAccent = SkyBlueAccent
val EmeraldPrimary = SkyBluePrimary
val EmeraldDark = SkyBlueDark
val TextOnGreen = TextOnPrimary

val TextSecondaryDark = TextSecondary
val TextPrimaryDark = TextPrimary
val BackgroundDark = DarkBackground
val SurfaceDark = DarkSurface
val ErrorRed = CoralRed
