package com.surplusiq.merchant.ui.components

import androidx.compose.foundation.Image
import androidx.compose.foundation.Canvas
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowLeft
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.surplusiq.merchant.R
import com.surplusiq.merchant.ui.theme.*

private val CoralLight = Color(0xFFFFA866)

/**
 * Khung dùng chung cho luồng xác thực của app cửa hàng: dải cam có vệt sóng phía trên (nút "Quay lại" bên trái, tên app ở giữa),
 * thẻ trắng bo góc lớn nổi lên từ dưới. [showBrandMark] chỉ giữ để tương thích, không còn dùng.
 */
@Composable
fun AuthCard(
    modifier: Modifier = Modifier,
    onBackClick: (() -> Unit)? = null,
    showBrandMark: Boolean = true,
    content: @Composable ColumnScope.() -> Unit
) {
    Box(modifier = modifier.fillMaxSize().background(SqSurface)) {
        Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).imePadding()) {
            Box(Modifier.fillMaxWidth().height(170.dp)) {
                AuthWaveBackground(Modifier.matchParentSize())
                if (onBackClick != null) {
                    Row(
                        Modifier
                            .statusBarsPadding()
                            .padding(start = 20.dp, top = 12.dp)
                            .clip(RoundedCornerShape(50))
                            .background(Color.White.copy(alpha = 0.9f))
                            .clickable(onClick = onBackClick)
                            .padding(start = 6.dp, end = 14.dp, top = 6.dp, bottom = 6.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(Icons.AutoMirrored.Filled.KeyboardArrowLeft, contentDescription = null, tint = SqInk, modifier = Modifier.size(20.dp))
                        Text("Quay lại", fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = SqInk)
                    }
                }
                Text(
                    "SurplusIQ",
                    fontSize = 30.sp,
                    fontWeight = FontWeight.ExtraBold,
                    color = Color.White,
                    modifier = Modifier.align(Alignment.Center).padding(top = 20.dp)
                )
            }
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .offset(y = (-28).dp)
                    .clip(RoundedCornerShape(topStart = 32.dp, topEnd = 32.dp))
                    .background(SqSurface)
                    .padding(horizontal = 24.dp, vertical = 24.dp)
                    .navigationBarsPadding(),
                content = content
            )
        }
    }
}

/** Nền cam có các vệt sóng mờ như họa tiết thẻ ngân hàng. */
@Composable
private fun AuthWaveBackground(modifier: Modifier = Modifier) {
    Canvas(modifier) {
        val w = size.width
        val h = size.height
        drawRect(
            Brush.linearGradient(
                listOf(Color(0xFFFFA866), Color(0xFFFF8A3D), Color(0xFFF2762B)),
                start = Offset(0f, 0f),
                end = Offset(w, h)
            )
        )
        for (i in 0..5) {
            val y = h * (0.10f + 0.16f * i)
            val wave = Path().apply {
                moveTo(-20f, y + h * 0.20f)
                cubicTo(w * 0.22f, y - h * 0.30f, w * 0.48f, y + h * 0.42f, w * 0.72f, y + h * 0.04f)
                cubicTo(w * 0.86f, y - h * 0.14f, w * 0.96f, y - h * 0.02f, w + 20f, y - h * 0.16f)
            }
            drawPath(wave, Color.White.copy(alpha = 0.16f - 0.02f * i), style = Stroke(width = 10f + 7f * i))
        }
    }
}

/** Tiêu đề và mô tả ngắn căn giữa của màn xác thực. */
@Composable
fun AuthHeading(title: String, subtitle: String) {
    Text(title, fontSize = 24.sp, fontWeight = FontWeight.ExtraBold, color = SqInk, textAlign = TextAlign.Center, modifier = Modifier.fillMaxWidth())
    Spacer(Modifier.height(8.dp))
    Text(subtitle, fontSize = 13.sp, color = SqInkSoft, lineHeight = 19.sp, textAlign = TextAlign.Center, modifier = Modifier.fillMaxWidth())
    Spacer(Modifier.height(24.dp))
}

/** Nhãn trên ô nhập; [upper] viết hoa cỡ nhỏ như màn đăng nhập của app khách. */
@Composable
fun AuthLabel(text: String, upper: Boolean = false) {
    Text(
        text = if (upper) text.uppercase() else text,
        fontSize = if (upper) 11.sp else 13.sp,
        fontWeight = FontWeight.Bold,
        color = if (upper) SqInkSoft else SqInk,
        letterSpacing = if (upper) 0.8.sp else 0.sp
    )
    Spacer(Modifier.height(6.dp))
}

/** Nút chính gradient cam, mũi tên bên phải khi [withArrow]. */
@Composable
fun AuthGradientButton(text: String, enabled: Boolean = true, loading: Boolean = false, withArrow: Boolean = false, onClick: () -> Unit) {
    val active = enabled && !loading
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(54.dp)
            .clip(RoundedCornerShape(16.dp))
            .background(
                if (active) Brush.horizontalGradient(listOf(CoralLight, SqCoral)) else SolidColor(SqCoral.copy(alpha = 0.45f))
            )
            .clickable(enabled = active, onClick = onClick),
        contentAlignment = Alignment.Center
    ) {
        if (loading) {
            CircularProgressIndicator(color = Color.White, strokeWidth = 2.5.dp, modifier = Modifier.size(22.dp))
        } else {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(text, fontSize = 15.sp, fontWeight = FontWeight.Bold, color = Color.White)
                if (withArrow) {
                    Spacer(Modifier.width(8.dp))
                    Icon(Icons.AutoMirrored.Filled.ArrowForward, contentDescription = null, tint = Color.White, modifier = Modifier.size(18.dp))
                }
            }
        }
    }
}

/** Đường kẻ kèm chữ giữa (vd. "HOẶC"). */
@Composable
fun AuthDivider(text: String) {
    Row(Modifier.fillMaxWidth().padding(vertical = 12.dp), verticalAlignment = Alignment.CenterVertically) {
        HorizontalDivider(modifier = Modifier.weight(1f), color = SqLine)
        Text(text, fontSize = 11.sp, fontWeight = FontWeight.SemiBold, color = SqInkMuted, letterSpacing = 0.6.sp, modifier = Modifier.padding(horizontal = 12.dp))
        HorizontalDivider(modifier = Modifier.weight(1f), color = SqLine)
    }
}
