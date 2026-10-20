package com.surplusiq.app.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable

private val LightColorScheme = lightColorScheme(
    primary = SkyBluePrimary,
    onPrimary = TextOnPrimary,
    primaryContainer = SkyBlueContainer,
    onPrimaryContainer = SkyBlueDark,
    secondary = SkyBlueLight,
    onSecondary = SurfaceWhite,
    secondaryContainer = SkyBlueIce,
    onSecondaryContainer = SkyBlueDark,
    background = AppBackground,
    onBackground = TextPrimary,
    surface = SurfaceWhite,
    onSurface = TextPrimary,
    surfaceVariant = SkyBlueIce,
    onSurfaceVariant = TextSecondary,
    outline = DividerColor,
    error = CoralRed
)

private val DarkColorScheme = darkColorScheme(
    primary = DarkCoral,
    onPrimary = DarkBackground,
    primaryContainer = SkyBlueDark,
    onPrimaryContainer = DarkCoral,
    secondary = DarkMint,
    onSecondary = DarkBackground,
    background = DarkBackground,
    onBackground = DarkTextPrimary,
    surface = DarkSurface,
    onSurface = DarkTextPrimary,
    surfaceVariant = DarkSurfaceVariant,
    onSurfaceVariant = DarkTextSecondary,
    outline = DarkLine,
    error = CoralRed
)

@Composable
fun SurplusIQTheme(
    // shortcut: ép light theme mặc định vì mới chỉ audit màu cho light; theo hệ
    // thống (isSystemInDarkTheme()) sẽ lộ màn chưa style dark -> nâng cấp khi
    // audit xong toàn bộ 60+ màn cho dark mode.
    darkTheme: Boolean = false,
    content: @Composable () -> Unit
) {
    val colorScheme = if (darkTheme) DarkColorScheme else LightColorScheme

    MaterialTheme(
        colorScheme = colorScheme,
        content = content
    )
}
