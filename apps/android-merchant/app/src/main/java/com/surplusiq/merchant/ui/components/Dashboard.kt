package com.surplusiq.merchant.ui.components

import androidx.compose.ui.draw.drawBehind
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.surplusiq.merchant.ui.theme.*
import java.time.DayOfWeek
import java.time.LocalDate
import java.time.temporal.TemporalAdjusters

private val DOW = listOf("T2", "T3", "T4", "T5", "T6", "T7", "CN")

/** 7 ngày của tuần chứa [anchor], bắt đầu từ thứ Hai. */
fun weekOf(anchor: LocalDate): List<LocalDate> {
    val monday = anchor.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY))
    return (0L..6L).map { monday.plusDays(it) }
}

/** Dải lịch tuần kiểu NutriWise: ô đang chọn cam, tai gấu + mõm trắng; chấm cam = ngày có đơn. */
@Composable
fun WeeklyCalendarStrip(
    week: List<LocalDate>,
    selected: LocalDate,
    markedDays: Set<LocalDate>,
    onSelect: (LocalDate) -> Unit,
    modifier: Modifier = Modifier
) {
    val today = remember { LocalDate.now() }
    Row(
        modifier = modifier.fillMaxWidth().sqSurface(22.dp, 6.dp).padding(horizontal = 10.dp, vertical = 8.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        week.forEachIndexed { i, day ->
            DayPill(DOW[i], day, day == selected, day == today, day in markedDays) { onSelect(day) }
        }
    }
}

@Composable
private fun DayPill(dow: String, day: LocalDate, isSelected: Boolean, isToday: Boolean, marked: Boolean, onClick: () -> Unit) {
    val lift by animateFloatAsState(
        targetValue = if (isSelected) -4f else 0f,
        animationSpec = spring(Spring.DampingRatioMediumBouncy, Spring.StiffnessLow),
        label = "day_lift"
    )
    val shape = RoundedCornerShape(20.dp)
    val textColor = when {
        isSelected -> Color.White
        isToday -> SqCoral
        else -> SqInkSoft
    }
    Box(modifier = Modifier.width(34.dp).height(98.dp).clickable(onClick = onClick), contentAlignment = Alignment.TopCenter) {
        if (marked) {
            Box(Modifier.align(Alignment.BottomCenter).size(6.dp).clip(CircleShape).background(SqButter))
        }
        if (isSelected) {
            Row(Modifier.width(34.dp).offset(y = (lift + 10).dp), horizontalArrangement = Arrangement.SpaceBetween) {
                repeat(2) {
                    Box(
                        Modifier.size(16.dp).shadow(3.dp, CircleShape, ambientColor = SqWarmShadow, spotColor = SqWarmShadow)
                            .clip(CircleShape).background(Color.White),
                        contentAlignment = Alignment.Center
                    ) { Box(Modifier.size(8.dp).clip(CircleShape).background(SqCoral.copy(alpha = 0.5f))) }
                }
            }
        }
        Box(
            modifier = Modifier
                .padding(top = 16.dp)
                .width(34.dp)
                .height(if (isSelected) 80.dp else 76.dp)
                .offset(y = lift.dp)
                .then(if (isSelected) Modifier.shadow(10.dp, shape, ambientColor = SqCoral.copy(alpha = 0.3f), spotColor = SqCoral.copy(alpha = 0.3f)) else Modifier)
                .clip(shape)
                .background(if (isSelected) Brush.verticalGradient(listOf(SqCoral.copy(alpha = 0.85f), SqCoral)) else Brush.verticalGradient(listOf(SqCoral.copy(alpha = 0.08f), SqCoral.copy(alpha = 0.08f))))
        ) {
            Column(Modifier.align(Alignment.TopCenter).padding(top = 9.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                Text(dow, fontSize = 10.sp, fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium, color = textColor)
                Spacer(Modifier.height(4.dp))
                Text("%02d".format(day.dayOfMonth), fontSize = 14.sp, fontWeight = if (isSelected) FontWeight.ExtraBold else FontWeight.SemiBold, color = if (isSelected || isToday) textColor else SqInk)
            }
            val dot = if (isSelected) SqInk.copy(alpha = 0.75f) else SqInkMuted.copy(alpha = 0.6f)
            if (isSelected) {
                Box(
                    Modifier.align(Alignment.BottomCenter).fillMaxWidth().height(24.dp)
                        .clip(RoundedCornerShape(topStart = 10.dp, topEnd = 10.dp, bottomStart = 20.dp, bottomEnd = 20.dp))
                        .background(Color.White),
                    contentAlignment = Alignment.Center
                ) { SnoutFace(dot) }
            } else {
                Box(Modifier.align(Alignment.BottomCenter).padding(bottom = 8.dp)) { SnoutFace(dot) }
            }
        }
    }
}

/** Mõm gấu tối giản: 2 mắt + 1 mũi, không miệng. */
@Composable
private fun SnoutFace(color: Color) {
    Canvas(Modifier.fillMaxWidth().height(12.dp)) {
        val w = size.width; val h = size.height
        drawCircle(color, h * 0.17f, Offset(w / 2f - w * 0.24f, h * 0.32f))
        drawCircle(color, h * 0.17f, Offset(w / 2f + w * 0.24f, h * 0.32f))
        drawOval(color, Offset(w / 2f - h * 0.22f, h * 0.62f), Size(h * 0.44f, h * 0.3f))
    }
}

/** Thẻ hero: cung bán nguyệt, số lớn ở giữa, chip bên phải tiêu đề, hai nhãn ở đáy. */
@Composable
fun HeroGaugeCard(
    title: String,
    chip: String,
    value: Long,
    unit: String,
    caption: String,
    progress: Float,
    leftLabel: String,
    rightLabel: String,
    modifier: Modifier = Modifier
) {
    val p by animateFloatAsState(progress.coerceIn(0f, 1f), tween(900), label = "hero_p")
    val shown by animateFloatAsState(value.toFloat(), tween(900, easing = FastOutSlowInEasing), label = "hero_v")
    Column(modifier = modifier.fillMaxWidth().sqSurface(28.dp, 10.dp).padding(horizontal = 20.dp, vertical = 18.dp)) {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.weight(1f)) {
                Box(Modifier.size(9.dp).clip(CircleShape).background(SqCoral))
                Text(title, fontSize = 20.sp, fontWeight = FontWeight.Bold, color = SqInk, maxLines = 1)
            }
            Box(Modifier.clip(RoundedCornerShape(14.dp)).background(SqCoral.copy(alpha = 0.16f)).padding(horizontal = 14.dp, vertical = 8.dp)) {
                Text(chip, fontSize = 13.sp, fontWeight = FontWeight.Bold, color = SqCoralDeep, maxLines = 1)
            }
        }
        Box(Modifier.fillMaxWidth().padding(top = 10.dp).height(150.dp), contentAlignment = Alignment.BottomCenter) {
            Canvas(Modifier.fillMaxSize()) {
                val stroke = 20.dp.toPx()
                val radius = minOf((size.width - stroke) / 2f, size.height - stroke)
                val topLeft = Offset(size.width / 2f - radius, size.height - stroke / 2f - radius)
                val arc = Size(radius * 2f, radius * 2f)
                drawArc(SqCoral.copy(alpha = 0.12f), 180f, 180f, false, topLeft, arc, style = Stroke(stroke, cap = StrokeCap.Round))
                if (p > 0.005f) drawArc(SqCoral, 180f, 180f * p, false, topLeft, arc, style = Stroke(stroke, cap = StrokeCap.Round))
            }
            Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.padding(bottom = 26.dp)) {
                Row(verticalAlignment = Alignment.Bottom) {
                    Text(currency(shown.toLong()).removeSuffix("đ"), fontSize = 40.sp, fontWeight = FontWeight.Black, color = SqInk, maxLines = 1)
                    Text(" $unit", fontSize = 16.sp, fontWeight = FontWeight.Medium, color = SqInkSoft, modifier = Modifier.padding(bottom = 6.dp))
                }
                Text(caption, fontSize = 14.sp, color = SqInkSoft)
            }
        }
        Row(Modifier.fillMaxWidth().padding(horizontal = 4.dp).padding(top = 10.dp), horizontalArrangement = Arrangement.SpaceBetween) {
            Text(leftLabel, fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = SqInkSoft)
            Text(rightLabel, fontSize = 13.sp, fontWeight = FontWeight.Bold, color = SqInk.copy(alpha = 0.75f))
        }
    }
}

enum class TileTone(val bg: Color, val accent: Color) {
    MINT(SqMintWash, SqMintDeep),
    PEACH(SqCoralWash, SqCoralDeep),
    BUTTER(SqButterWash, WarningText),
    SKY(Color(0xFFE4F1FB), Color(0xFF2B73AB))
}

/** Họa tiết nền riêng cho từng tông: vòng tròn, chấm, sóng, vạch chéo; nhạt để không lấn chữ. */
private fun Modifier.tilePattern(tone: TileTone): Modifier = drawBehind {
    val c = tone.accent
    when (tone) {
        TileTone.MINT -> {
            drawCircle(c.copy(alpha = 0.10f), radius = 62.dp.toPx(), center = Offset(size.width + 6.dp.toPx(), -6.dp.toPx()))
            drawCircle(c.copy(alpha = 0.09f), radius = 38.dp.toPx(), center = Offset(size.width - 6.dp.toPx(), 8.dp.toPx()))
            drawCircle(c.copy(alpha = 0.08f), radius = 24.dp.toPx(), center = Offset(8.dp.toPx(), size.height + 4.dp.toPx()))
        }
        TileTone.PEACH -> {
            val gap = 12.dp.toPx()
            var y = size.height * 0.45f
            while (y < size.height) {
                var x = size.width * 0.5f
                while (x < size.width) { drawCircle(c.copy(alpha = 0.16f), radius = 1.8.dp.toPx(), center = Offset(x, y)); x += gap }
                y += gap
            }
        }
        TileTone.BUTTER -> {
            val step = 14.dp.toPx()
            var x = size.width * 0.35f
            while (x < size.width + size.height) {
                drawLine(c.copy(alpha = 0.12f), Offset(x, 0f), Offset(x - size.height, size.height), strokeWidth = 2.dp.toPx())
                x += step
            }
        }
        TileTone.SKY -> {
            for (i in 0..2) {
                val r = (30 + i * 18).dp.toPx()
                drawArc(c.copy(alpha = 0.14f - i * 0.03f), 180f, 180f, false, Offset(size.width - r - 4.dp.toPx(), size.height - r), androidx.compose.ui.geometry.Size(r * 2, r * 2), style = androidx.compose.ui.graphics.drawscope.Stroke(2.dp.toPx()))
            }
        }
    }
}

/** Thẻ chỉ số pastel: icon tròn + tên, số lớn, dòng phụ, thanh tiến độ (nếu có). */
@Composable
fun PastelTile(
    title: String,
    icon: ImageVector,
    value: String,
    sub: String,
    tone: TileTone,
    modifier: Modifier = Modifier,
    progress: Float? = null,
    onClick: (() -> Unit)? = null
) {
    val shape = RoundedCornerShape(22.dp)
    Column(
        modifier = modifier
            .heightIn(min = 148.dp)
            .shadow(2.dp, shape, ambientColor = SqWarmShadow, spotColor = SqWarmShadow)
            .clip(shape)
            .background(tone.bg)
            .tilePattern(tone)
            .then(if (onClick != null) Modifier.clickable(onClick = onClick) else Modifier)
            .padding(14.dp),
        verticalArrangement = Arrangement.SpaceBetween
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(Modifier.size(32.dp).clip(CircleShape).background(Color.White.copy(alpha = 0.7f)), contentAlignment = Alignment.Center) {
                Icon(icon, contentDescription = null, tint = tone.accent, modifier = Modifier.size(18.dp))
            }
            Spacer(Modifier.width(8.dp))
            Text(title, fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = SqInk, maxLines = 2, overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis)
        }
        Column {
            Text(value, fontSize = 26.sp, fontWeight = FontWeight.ExtraBold, color = SqInk, maxLines = 1)
            Text(sub, fontSize = 12.sp, color = SqInkSoft, maxLines = 2)
        }
        if (progress != null) {
            val p by animateFloatAsState(progress.coerceIn(0f, 1f), tween(900), label = "tile_p")
            Box(Modifier.fillMaxWidth().height(6.dp).clip(CircleShape).background(Color.White.copy(alpha = 0.7f))) {
                Box(Modifier.fillMaxWidth(p).fillMaxHeight().clip(CircleShape).background(tone.accent))
            }
        } else Spacer(Modifier.height(6.dp))
    }
}

/** Banner gradient kiểu "Tổng kết tuần": icon vuông bo, tiêu đề, mô tả, mũi tên. */
@Composable
fun ActionBanner(title: String, subtitle: String, icon: ImageVector, onClick: () -> Unit, modifier: Modifier = Modifier) {
    val shape = RoundedCornerShape(24.dp)
    Row(
        modifier = modifier.fillMaxWidth()
            .shadow(2.dp, shape, ambientColor = SqWarmShadow, spotColor = SqWarmShadow)
            .clip(shape)
            .background(Brush.horizontalGradient(listOf(SqCoral.copy(alpha = 0.35f), SqCoralWash)))
            .border(1.dp, SqCoral.copy(alpha = 0.25f), shape)
            .clickable(onClick = onClick)
            .padding(16.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(Modifier.size(52.dp).clip(RoundedCornerShape(16.dp)).background(SqCoral.copy(alpha = 0.7f)), contentAlignment = Alignment.Center) {
            Icon(icon, contentDescription = null, tint = SqInk, modifier = Modifier.size(26.dp))
        }
        Spacer(Modifier.width(14.dp))
        Column(Modifier.weight(1f)) {
            Text(title, fontSize = 17.sp, fontWeight = FontWeight.Bold, color = SqInk)
            Text(subtitle, fontSize = 13.sp, color = SqInkSoft)
        }
        Icon(Icons.AutoMirrored.Filled.ArrowForward, contentDescription = null, tint = SqInk)
    }
}
