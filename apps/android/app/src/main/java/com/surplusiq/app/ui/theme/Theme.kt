package com.surplusiq.app.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
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
    primary = SkyBlueLight,
    onPrimary = DarkBackground,
    primaryContainer = SkyBlueDark,
    onPrimaryContainer = SkyBlueContainer,
    secondary = SkyBlueAccent,
    onSecondary = DarkBackground,
    background = DarkBackground,
    onBackground = DarkTextPrimary,
    surface = DarkSurface,
    onSurface = DarkTextPrimary,
    surfaceVariant = DarkSurface,
    onSurfaceVariant = DarkTextSecondary,
    outline = DividerColor.copy(alpha = 0.2f),
    error = CoralRed
)

@Composable
fun SurplusIQTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    val colorScheme = if (darkTheme) DarkColorScheme else LightColorScheme

    MaterialTheme(
        colorScheme = colorScheme,
        content = content
    )
}
