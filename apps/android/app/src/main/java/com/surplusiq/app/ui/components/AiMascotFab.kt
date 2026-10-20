package com.surplusiq.app.ui.components

import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.unit.dp
import com.surplusiq.app.ui.theme.ForestGreenPrimary

/** Trợ lý AI cố định ở góc màn: mặt cười dễ thương, nhấp nhô nhẹ lên xuống. */
@Composable
fun AiMascotFab(onClick: () -> Unit, modifier: Modifier = Modifier) {
    val bob by rememberInfiniteTransition(label = "mascot").animateFloat(
        initialValue = 0f,
        targetValue = -8f,
        animationSpec = infiniteRepeatable(tween(1400, easing = FastOutSlowInEasing), RepeatMode.Reverse),
        label = "bob"
    )
    Box(modifier = modifier.offset(y = bob.dp)) {
        Surface(
            color = ForestGreenPrimary,
            shape = CircleShape,
            modifier = Modifier
                .size(56.dp)
                .shadow(6.dp, CircleShape)
                .clip(CircleShape)
                .clickable(role = Role.Button, onClickLabel = "Mở trợ lý AI Cứu Món", onClick = onClick)
        ) {
            Canvas(Modifier.size(56.dp)) {
                val eye = size.minDimension * 0.07f
                val y = size.height * 0.42f
                drawCircle(Color.White, eye, Offset(size.width * 0.35f, y))
                drawCircle(Color.White, eye, Offset(size.width * 0.65f, y))
                drawCircle(Color(0xFFFFB4B4), eye * 1.1f, Offset(size.width * 0.24f, size.height * 0.56f))
                drawCircle(Color(0xFFFFB4B4), eye * 1.1f, Offset(size.width * 0.76f, size.height * 0.56f))
                drawArc(
                    Color.White, 20f, 140f, false,
                    topLeft = Offset(size.width * 0.38f, size.height * 0.47f),
                    size = Size(size.width * 0.24f, size.height * 0.16f),
                    style = Stroke(width = eye * 0.8f, cap = StrokeCap.Round)
                )
            }
        }
    }
}
