package com.surplusiq.merchant.ui.components

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.surplusiq.merchant.ui.theme.*

data class ChartSeries(val label: String, val values: List<Float>, val color: Color)

/**
 * Biểu đồ đường tối giản vẽ bằng Canvas (không thêm thư viện). Mọi series dùng chung trục X = [xLabels].
 * [describe] là mô tả cho trình đọc màn hình.
 */
@Composable
fun LineChart(
    series: List<ChartSeries>,
    xLabels: List<String>,
    describe: String,
    modifier: Modifier = Modifier,
    yFormat: (Float) -> String = { "%.0f".format(it) }
) {
    val all = series.flatMap { it.values }
    if (all.isEmpty()) return
    val min = all.min()
    val max = all.max().let { if (it == min) min + 1f else it }

    Column(modifier = modifier.fillMaxWidth().semantics { contentDescription = describe }) {
        Row {
            Column(modifier = Modifier.height(140.dp), verticalArrangement = Arrangement.SpaceBetween) {
                Text(yFormat(max), fontSize = 10.sp, color = SqInkMuted)
                Text(yFormat(min), fontSize = 10.sp, color = SqInkMuted)
            }
            Spacer(modifier = Modifier.width(6.dp))
            Canvas(modifier = Modifier.weight(1f).height(140.dp)) {
                val step = if (xLabels.size > 1) size.width / (xLabels.size - 1) else 0f
                fun point(i: Int, v: Float) = Offset(
                    x = if (xLabels.size > 1) i * step else size.width / 2,
                    y = size.height - (v - min) / (max - min) * size.height
                )
                repeat(3) { g ->
                    val y = size.height * g / 2
                    drawLine(SqLine, Offset(0f, y), Offset(size.width, y), strokeWidth = 1.dp.toPx())
                }
                series.forEach { s ->
                    val path = Path()
                    s.values.forEachIndexed { i, v ->
                        val p = point(i, v)
                        if (i == 0) path.moveTo(p.x, p.y) else path.lineTo(p.x, p.y)
                    }
                    drawPath(path, s.color, style = Stroke(width = 2.5.dp.toPx()))
                    s.values.forEachIndexed { i, v -> drawCircle(s.color, radius = 3.5.dp.toPx(), center = point(i, v)) }
                }
            }
        }
        Spacer(modifier = Modifier.height(4.dp))
        Row(modifier = Modifier.fillMaxWidth().padding(start = 28.dp), horizontalArrangement = Arrangement.SpaceBetween) {
            // Nhiều mốc thì chỉ ghi đầu - giữa - cuối để chữ không chồng nhau.
            val shown = if (xLabels.size <= 7) xLabels else listOf(xLabels.first(), xLabels[xLabels.size / 2], xLabels.last())
            shown.forEach { Text(it, fontSize = 10.sp, color = SqInkMuted) }
        }
        if (series.size > 1) {
            Spacer(modifier = Modifier.height(8.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                series.forEach { s ->
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(modifier = Modifier.size(8.dp).clip(CircleShape).background(s.color))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(s.label, fontSize = 11.sp, color = SqInkSoft)
                    }
                }
            }
        }
    }
}
