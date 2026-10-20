package com.surplusiq.app.ui.theme

import androidx.compose.ui.graphics.Color

// ============================================================================
// SurplusIQ Brand Colors - "Soft Market Intelligence"
// Nguồn: doc/SURPLUSIQ_Design_Code_Rules.md mục 2.1-2.4
// Giữ nguyên tên biến cũ (SkyBlue*, Amber*, CoralRed*...) để không phá các màn
// đang dùng; chỉ đổi giá trị hex sang token chính thức sqInk/sqCoral/sqMint/...
// ============================================================================

// --- sqCoral: brand, CTA chính (thay cho SkyBlue*) ---
val SkyBluePrimary = Color(0xFFFF8A3D)         // sqCoral
val SkyBlueDark = Color(0xFFC85A1E)            // sqCoralDeep - pressed, text accent
val SkyBlueLight = Color(0xFFFFA866)           // điểm cuối gradient coral
val SkyBlueContainer = Color(0xFFFFF0E7)       // sqCoralWash
val SkyBlueIce = Color(0xFFDDF3E8)             // sqMintWash (secondaryContainer ghép mint)
val SkyBlueAccent = Color(0xFF71C7A3)          // sqMint

// --- Ngữ nghĩa phụ: butter (sắp hết/khuyến mãi), error ---
val AmberAccent = Color(0xFFD99A2B)            // sqButter
val AmberLight = Color(0xFFFBEFD6)             // sqButterWash
val CoralRed = Color(0xFFD9534F)               // sqError (khác sqCoral - không dùng brand làm màu lỗi)
val CoralRedLight = Color(0xFFF9DEDF)          // nền pastel nhẹ cho error

// --- AI / Pro / insight (lilac) và thông tin/bản đồ (sky) - mới theo rule ---
val LilacAccent = Color(0xFFA99AE9)            // sqLilac
val LilacWash = Color(0xFFECE8FF)              // sqLilacWash
val SkyInfoAccent = Color(0xFF8AC8E8)          // sqSky
val SkyInfoWash = Color(0xFFE1F2FA)            // sqSkyWash
val MintDeep = Color(0xFF278A65)               // sqMintDeep - chữ success trên nền sáng
val WarningOnLight = Color(0xFFA96B18)         // sqWarning
val InfoOnLight = Color(0xFF3D73A8)            // sqInfo

// --- Surface & neutral (sqCanvas/sqSurface/sqLine) ---
val AppBackground = Color(0xFFFFFCF9)          // sqCanvas
val SurfaceWhite = Color(0xFFFFFFFF)           // sqSurface
val CardBackground = SurfaceWhite
val SurfaceSubtle = Color(0xFFF8F4F0)          // sqSurfaceSoft
val DividerColor = Color(0xFFF0E7E1)           // sqLine

// --- Typography (sqInk/sqInkSoft/sqInkMuted) ---
val TextPrimary = Color(0xFF292524)            // sqInk
val TextSecondary = Color(0xFF817B78)          // sqInkSoft
val TextMuted = Color(0xFFA8A19D)              // sqInkMuted
val TextOnPrimary = Color(0xFFFFFFFF)          // chữ trắng trên nút coral đặc (không phải nền pastel)

// --- Dark theme (ánh xạ chính thức rule 2.4, không phải đảo màu) ---
val DarkBackground = Color(0xFF191B1B)         // sqDarkCanvas
val DarkSurface = Color(0xFF232626)            // sqDarkSurface
val DarkSurfaceVariant = Color(0xFF2C3030)     // sqDarkSurfaceSoft
val DarkLine = Color(0xFF414846)               // sqDarkLine
val DarkTextPrimary = Color(0xFFF7F2EA)        // sqDarkInk
val DarkTextSecondary = Color(0xFFC2C8C4)      // sqDarkInkSoft
val DarkCoral = Color(0xFFFF8B7F)              // sqDarkCoral
val DarkMint = Color(0xFF82D6B0)               // sqDarkMint
val DarkButter = Color(0xFFFFD477)             // sqDarkButter
val DarkLilac = Color(0xFFB9ACF5)              // sqDarkLilac

// Compatibility Aliases for legacy component bindings
val ForestGreenPrimary = SkyBluePrimary
val ForestGreenDark = SkyBlueDark
val ForestGreenLight = SkyBlueLight
val ForestGreenContainer = SkyBlueContainer
val MintAccent = SkyBlueAccent
val EmeraldPrimary = SkyBluePrimary
val EmeraldDark = SkyBlueDark
val TextOnGreen = TextOnPrimary
val PrimaryOrange = SkyBluePrimary

// Lưu ý: tên gọi "...Dark" gây hiểu nhầm (lịch sử) nhưng đang được dùng như màu
// chữ phụ/chính trên nền sáng ở BuyerDealListScreen/QrPickupScreen - giữ ánh xạ
// sang giá trị sáng để không phá 2 màn đang chạy thật; không đổi tên ở đây.
val TextSecondaryDark = TextSecondary
val TextPrimaryDark = TextPrimary
val BackgroundDark = DarkBackground
val SurfaceDark = DarkSurface
val ErrorRed = CoralRed
