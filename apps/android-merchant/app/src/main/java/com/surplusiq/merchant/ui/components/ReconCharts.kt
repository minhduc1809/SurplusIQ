package com.surplusiq.merchant.ui.components

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.surplusiq.merchant.ui.theme.SqInk
import com.surplusiq.merchant.ui.theme.SqInkMuted
import com.surplusiq.merchant.ui.theme.SqInkSoft
import com.surplusiq.merchant.ui.theme.SqLine

/** Một phần của thanh cơ cấu: tên, giá trị (đồng) và màu. */
data class BreakdownPart(val label: String, val amount: Long, val color: Color)

/** Thanh ngang chia cơ cấu tiền (doanh thu -> thực nhận, hoa hồng, hoàn tiền, phí thuê bao) kèm chú giải. */
@Composable
fun StackedBreakdownBar(parts: List<BreakdownPart>, modifier: Modifier = Modifier) {
    val visible = parts.filter { it.amount > 0 }
    val total = visible.sumOf { it.amount }.coerceAtLeast(1L)
    Column(modifier.semantics { contentDescription = "Cơ cấu: " + visible.joinToString { "${it.label} ${currency(it.amount)}" } }) {
        Row(Modifier.fillMaxWidth().height(14.dp).clip(RoundedCornerShape(50)).background(SqLine)) {
            visible.forEach { p ->
                Box(Modifier.weight(p.amount.toFloat() / total).fillMaxHeight().background(p.color))
            }
        }
        Spacer(Modifier.height(10.dp))
        visible.forEach { p ->
            Row(Modifier.fillMaxWidth().padding(vertical = 3.dp), verticalAlignment = Alignment.CenterVertically) {
                Box(Modifier.size(10.dp).clip(CircleShape).background(p.color))
                Spacer(Modifier.width(8.dp))
                Text(p.label, fontSize = 13.sp, color = SqInk, modifier = Modifier.weight(1f))
                Text("${(p.amount * 100 / total)}%", fontSize = 12.sp, color = SqInkMuted)
                Spacer(Modifier.width(10.dp))
                Text(currency(p.amount), fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = SqInk)
            }
        }
    }
}

/** Cột đứng cho chuỗi thực nhận theo tuần (cũ -> mới); cột cuối được tô đậm. */
@Composable
fun WeeklyBars(labels: List<String>, values: List<Long>, color: Color, modifier: Modifier = Modifier) {
    if (values.isEmpty()) return
    val max = values.max().coerceAtLeast(1L)
    Column(modifier.semantics { contentDescription = "Biểu đồ thực nhận theo tuần, cao nhất ${currency(max)}" }) {
        Canvas(Modifier.fillMaxWidth().height(120.dp)) {
            val slot = size.width / values.size
            val barW = slot * 0.55f
            drawLine(SqLine, Offset(0f, size.height), Offset(size.width, size.height), strokeWidth = 2f)
            values.forEachIndexed { i, v ->
                val h = (v.toFloat() / max) * (size.height - 6f)
                val x = slot * i + (slot - barW) / 2
                drawRoundRect(
                    color = if (i == values.lastIndex) color else color.copy(alpha = 0.35f),
                    topLeft = Offset(x, size.height - h),
                    size = Size(barW, h.coerceAtLeast(3f)),
                    cornerRadius = CornerRadius(8f, 8f)
                )
            }
        }
        Spacer(Modifier.height(6.dp))
        Row(Modifier.fillMaxWidth()) {
            labels.forEach { l ->
                Text(l, fontSize = 10.sp, color = SqInkSoft, modifier = Modifier.weight(1f), maxLines = 1)
            }
        }
    }
}
