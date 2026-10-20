package com.surplusiq.merchant.ui.theme

import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Shapes
import androidx.compose.ui.unit.dp
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

// Phong cách NutriWise, chỉ Light Theme. SqCoralDeep = chữ nhấn trên nền wash (đậm hơn #F2762B pressed để đạt tương phản AA).
// SqLilac thực chất là coral accent #F58F87 (giữ tên để không đổi các màn).
val SqInk = Color(0xFF292524)
val SqInkSoft = Color(0xFF817B78)
val SqInkMuted = Color(0xFFA8A19D)
val SqCanvas = Color(0xFFFFFCF9)
val SqSurface = Color(0xFFFFFFFF)
val SqSurfaceSoft = Color(0xFFF8F4F0)
val SqLine = Color(0xFFF0E7E1)
val SqCoral = Color(0xFFFF8A3D)
val SqCoralDeep = Color(0xFFC85A1E)
val SqCoralWash = Color(0xFFFFF0E7)
val SqButter = Color(0xFFD99A2B)
val SqButterWash = Color(0xFFFBEFD6)
val SqMint = Color(0xFF71C7A3)
val SqMintDeep = Color(0xFF278A65)
val SqMintWash = Color(0xFFDDF3E8)
val SqLilac = Color(0xFFF58F87)
val SqLilacWash = Color(0xFFFDE9E7)
val WarningText = Color(0xFF8F620C)
val SqWarmShadow = Color(0x2E3B2A22)
val SqError = Color(0xFFD9534F)

@Composable
fun SurplusIqMerchantTheme(content: @Composable () -> Unit) {
    val colorScheme = lightColorScheme(
        primary = SqCoral,
        onPrimary = Color.White,
        primaryContainer = SqCoralWash,
        onPrimaryContainer = SqCoralDeep,
        secondary = SqMint,
        background = SqCanvas,
        onBackground = SqInk,
        surface = SqSurface,
        onSurface = SqInk,
        surfaceVariant = SqSurfaceSoft,
        onSurfaceVariant = SqInkSoft,
        outline = SqLine,
        error = SqError
    )
    MaterialTheme(
        colorScheme = colorScheme,
        shapes = Shapes(
            small = RoundedCornerShape(12.dp),
            medium = RoundedCornerShape(16.dp),
            large = RoundedCornerShape(24.dp)
        ),
        content = content
    )
}
