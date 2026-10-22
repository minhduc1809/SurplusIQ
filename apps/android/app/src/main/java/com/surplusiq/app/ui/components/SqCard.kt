package com.surplusiq.app.ui.components

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Card
import androidx.compose.material3.CardColors
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CardElevation
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.graphics.compositeOver
import androidx.compose.ui.unit.dp
import com.surplusiq.app.ui.theme.DividerColor

/**
 * Card chuẩn của app khách: bo góc 16dp, nền trắng, viền mảnh và đổ bóng nhẹ để tách khỏi nền kem.
 * Chữ ký giống `androidx.compose.material3.Card` để thay thế trực tiếp; chỗ nào cần màu riêng vẫn truyền `colors`.
 */
@Composable
fun SqCard(
    modifier: Modifier = Modifier,
    shape: Shape = RoundedCornerShape(16.dp),
    colors: CardColors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
    elevation: CardElevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
    border: BorderStroke? = BorderStroke(1.dp, DividerColor),
    content: @Composable ColumnScope.() -> Unit,
) {
    Card(modifier = modifier, shape = shape, colors = opaque(colors), elevation = elevation, border = border, content = content)
}

@Composable
fun SqCard(
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    shape: Shape = RoundedCornerShape(16.dp),
    colors: CardColors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
    elevation: CardElevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
    border: BorderStroke? = BorderStroke(1.dp, DividerColor),
    content: @Composable ColumnScope.() -> Unit,
) {
    Card(
        onClick = onClick,
        modifier = modifier,
        enabled = enabled,
        shape = shape,
        colors = opaque(colors),
        elevation = elevation,
        border = border,
        content = content,
    )
}

/** Nền thẻ trong suốt làm bóng đổ lộ ra thành mảng xám; trộn nền thẻ lên màu bề mặt để luôn đặc. */
@Composable
private fun opaque(colors: CardColors): CardColors =
    colors.copy(containerColor = colors.containerColor.compositeOver(MaterialTheme.colorScheme.surface))
