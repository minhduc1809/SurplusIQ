package com.surplusiq.merchant.ui.components

import androidx.compose.material.icons.filled.AddAPhoto
import androidx.compose.material.icons.filled.Tune
import androidx.compose.ui.draw.drawBehind
import androidx.compose.foundation.layout.padding
import androidx.compose.ui.graphics.nativeCanvas
import androidx.compose.ui.geometry.Offset
import androidx.compose.runtime.getValue
import androidx.compose.runtime.setValue
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.SwapVert
import androidx.compose.material.icons.filled.CalendarMonth
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowLeft
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.rememberScrollState
import androidx.compose.ui.draw.clip
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.SmartToy
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.surplusiq.merchant.ui.theme.*

/** Tab "Thực phẩm" gồm ba màn: Món (danh mục), Suất (bán trong ngày) và Giá & chiến lược (đề xuất giá theo giờ). */
@Composable
fun FoodSwitch(current: String, onSelect: (String) -> Unit) {
    Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.padding(bottom = 10.dp)) {
        SqChip("Món", current == "items") { if (current != "items") onSelect("items") }
        SqChip("Suất bán", current == "offers") { if (current != "offers") onSelect("offers") }
        SqChip("Giá & chiến lược", current == "price") { onSelect("price-proposals") }
    }
}

data class QuickItem(val label: String, val icon: ImageVector, val badge: Int = 0, val onClick: () -> Unit)

/** Truy cập nhanh trên Dashboard: cuộn ngang, mỗi ô dẫn đến một màn thật. */
@Composable
fun QuickAccessRow(items: List<QuickItem>) {
    Column(Modifier.fillMaxWidth().sqSurface(22.dp, 3.dp).padding(vertical = 12.dp)) {
        Row(Modifier.fillMaxWidth().padding(horizontal = 8.dp)) {
            items.forEach { q ->
                Column(
                    Modifier.weight(1f).clip(RoundedCornerShape(14.dp)).clickable(onClick = q.onClick).padding(vertical = 6.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    BadgedBox(badge = { if (q.badge > 0) Badge(containerColor = SqCoral) { Text(if (q.badge > 99) "99+" else "${q.badge}") } }) {
                        Box(Modifier.size(48.dp).clip(RoundedCornerShape(16.dp)).background(SqCoralWash), contentAlignment = Alignment.Center) {
                            Icon(q.icon, contentDescription = null, tint = SqCoral)
                        }
                    }
                    Spacer(Modifier.height(6.dp))
                    Text(q.label, fontSize = 11.sp, color = SqInk, textAlign = TextAlign.Center, maxLines = 2, fontWeight = FontWeight.Medium)
                }
            }
        }
    }
}

data class DualRow(val label: String, val a: Double, val b: Double, val aText: String, val bText: String)

private val LINE_BLUE = androidx.compose.ui.graphics.Color(0xFF292524)

/**
 * Biểu đồ cột kép kết hợp đường: mỗi chỉ số hai cột (a = mô phỏng/dự đoán, b = thực tế, cùng thang riêng của chỉ số đó,
 * giá trị ghi trên đầu cột) và một đường nối các điểm chênh lệch % của a so với b. Không có dữ liệu thì không vẽ;
 * chỉ số có thực tế bằng 0 thì bỏ điểm đường vì không tính được %.
 */
@Composable
fun DualBarChart(rows: List<DualRow>, aLabel: String, bLabel: String, aColor: androidx.compose.ui.graphics.Color = SqCoral, bColor: androidx.compose.ui.graphics.Color = androidx.compose.ui.graphics.Color(0xFFA99AE9)) {
    if (rows.isEmpty()) return
    val diffs = rows.map { if (it.b > 0) (it.a - it.b) / it.b * 100.0 else null }
    Column(Modifier.fillMaxWidth().semantics { contentDescription = "Biểu đồ cột so sánh $aLabel và $bLabel kèm đường chênh lệch phần trăm" }) {
        @OptIn(androidx.compose.foundation.layout.ExperimentalLayoutApi::class)
        androidx.compose.foundation.layout.FlowRow(horizontalArrangement = Arrangement.spacedBy(12.dp), verticalArrangement = Arrangement.spacedBy(4.dp), modifier = Modifier.padding(bottom = 6.dp)) {
            Legend(aLabel, aColor); Legend(bLabel, bColor); Legend("Chênh lệch %", LINE_BLUE)
        }
        androidx.compose.foundation.Canvas(Modifier.fillMaxWidth().height(290.dp)) {
            val labelPaint = android.graphics.Paint().apply { isAntiAlias = true; textAlign = android.graphics.Paint.Align.CENTER; textSize = 10.sp.toPx(); color = 0xFF817B78.toInt() }
            val valuePaint = android.graphics.Paint().apply { isAntiAlias = true; textAlign = android.graphics.Paint.Align.CENTER; textSize = 10.sp.toPx(); color = 0xFF292524.toInt(); isFakeBoldText = true }
            val diffPaint = android.graphics.Paint().apply { isAntiAlias = true; textAlign = android.graphics.Paint.Align.CENTER; textSize = 10.sp.toPx(); color = 0xFF292524.toInt(); isFakeBoldText = true }
            val bandTop = 14.dp.toPx(); val bandBottom = 74.dp.toPx() // dải riêng cho đường, không đè lên cột
            val top = 98.dp.toPx(); val bottom = size.height - 38.dp.toPx(); val plotH = bottom - top
            val group = size.width / rows.size
            val barW = group * 0.27f; val gap = 3.dp.toPx()
            drawLine(androidx.compose.ui.graphics.Color(0xFFF0E7E1), Offset(0f, bottom), Offset(size.width, bottom), 1.dp.toPx())
            rows.forEachIndexed { i, r ->
                val cx = group * i + group / 2
                val max = maxOf(r.a, r.b, 1e-9)
                val ha = (plotH * 0.9f * (r.a / max)).toFloat().coerceAtLeast(3.dp.toPx())
                val hb = (plotH * 0.9f * (r.b / max)).toFloat().coerceAtLeast(3.dp.toPx())
                drawRoundRect(aColor, Offset(cx - gap / 2 - barW, bottom - ha), androidx.compose.ui.geometry.Size(barW, ha), androidx.compose.ui.geometry.CornerRadius(6.dp.toPx()))
                drawRoundRect(bColor, Offset(cx + gap / 2, bottom - hb), androidx.compose.ui.geometry.Size(barW, hb), androidx.compose.ui.geometry.CornerRadius(6.dp.toPx()))
                drawContext.canvas.nativeCanvas.drawText(r.aText, cx - gap / 2 - barW / 2, bottom - ha - 4.dp.toPx(), valuePaint)
                drawContext.canvas.nativeCanvas.drawText(r.bText, cx + gap / 2 + barW / 2, bottom - hb - 4.dp.toPx(), valuePaint)
                val words = r.label.split(' ')
                val half = (words.size + 1) / 2
                val l1 = words.take(half).joinToString(" "); val l2 = words.drop(half).joinToString(" ")
                drawContext.canvas.nativeCanvas.drawText(l1, cx, bottom + 15.dp.toPx(), labelPaint)
                if (l2.isNotEmpty()) drawContext.canvas.nativeCanvas.drawText(l2, cx, bottom + 28.dp.toPx(), labelPaint)
            }
            val pts = diffs.mapIndexedNotNull { i, d -> d?.let { i to it } }
            if (pts.isNotEmpty()) {
                val lo = minOf(pts.minOf { it.second }, 0.0); val hi = maxOf(pts.maxOf { it.second }, 0.0)
                val span = (hi - lo).coerceAtLeast(1.0)
                fun y(d: Double) = (bandTop + 14.dp.toPx() + (1 - (d - lo) / span) * (bandBottom - bandTop - 14.dp.toPx())).toFloat()
                val path = androidx.compose.ui.graphics.Path()
                pts.forEachIndexed { k, (i, d) ->
                    val p = Offset(group * i + group / 2, y(d))
                    if (k == 0) path.moveTo(p.x, p.y) else path.lineTo(p.x, p.y)
                }
                drawPath(path, LINE_BLUE, style = androidx.compose.ui.graphics.drawscope.Stroke(2.5.dp.toPx(), cap = androidx.compose.ui.graphics.StrokeCap.Round))
                pts.forEach { (i, d) ->
                    val p = Offset(group * i + group / 2, y(d))
                    drawCircle(androidx.compose.ui.graphics.Color.White, 6.dp.toPx(), p)
                    drawCircle(LINE_BLUE, 4.dp.toPx(), p)
                    val t = (if (d >= 0) "+" else "") + "%.0f%%".format(d)
                    drawContext.canvas.nativeCanvas.drawText(t, p.x, p.y - 9.dp.toPx(), diffPaint)
                }
            }
        }
        Text("Cột mỗi chỉ số theo thang riêng; đường là chênh lệch của $aLabel so với $bLabel.", fontSize = 11.sp, color = SqInkMuted)
    }
}

@Composable
private fun Legend(label: String, color: androidx.compose.ui.graphics.Color) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Box(Modifier.size(10.dp).clip(CircleShape).background(color))
        Spacer(Modifier.width(6.dp))
        Text(label, fontSize = 11.sp, color = SqInkSoft)
    }
}


/** Nút nổi mở Trợ lý AI; đặt phía trên thanh điều hướng, nhỏ gọn để không che nội dung. */
@Composable
fun AiFab(onClick: () -> Unit) {
    SmallFloatingActionButton(
        onClick = onClick,
        containerColor = SqSurface,
        contentColor = SqCoral,
        shape = CircleShape,
        modifier = Modifier.border(1.dp, SqLine, CircleShape).semantics { contentDescription = "Mở trợ lý AI" }
    ) { Icon(Icons.Outlined.SmartToy, contentDescription = null) }
}

/** Ô tìm kiếm dạng viên thuốc: icon tìm, nút xóa nhanh, chiều cao đủ lớn để chạm bằng một tay. */
@Composable
fun SqSearchBar(value: String, placeholder: String, modifier: Modifier = Modifier, onChange: (String) -> Unit) {
    Row(
        modifier = modifier.fillMaxWidth().height(52.dp).sqSurface(26.dp, 3.dp).padding(start = 16.dp, end = 6.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(androidx.compose.material.icons.Icons.Default.Search, contentDescription = null, tint = SqCoral, modifier = Modifier.size(22.dp))
        Spacer(Modifier.width(10.dp))
        androidx.compose.foundation.text.BasicTextField(
            value = value, onValueChange = onChange, singleLine = true,
            modifier = Modifier.weight(1f),
            textStyle = androidx.compose.ui.text.TextStyle(fontSize = 15.sp, color = SqInk),
            cursorBrush = androidx.compose.ui.graphics.SolidColor(SqCoral),
            decorationBox = { inner -> if (value.isEmpty()) Text(placeholder, fontSize = 15.sp, color = SqInkMuted); inner() }
        )
        if (value.isNotEmpty()) IconButton(onClick = { onChange("") }) {
            Icon(androidx.compose.material.icons.Icons.Default.Close, contentDescription = "Xóa từ khóa", tint = SqInkSoft, modifier = Modifier.size(18.dp))
        }
    }
}

/** Bộ chọn phân đoạn: các lựa chọn loại trừ nhau nằm trong một khay, mục đang chọn nổi lên. */
@Composable
fun <T> SqSegmented(options: List<Pair<T, String>>, selected: T, modifier: Modifier = Modifier, onSelect: (T) -> Unit) {
    Row(modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(SqSurfaceSoft).padding(4.dp)) {
        options.forEach { (value, label) ->
            val on = value == selected
            Box(
                Modifier.weight(1f).height(40.dp).clip(RoundedCornerShape(12.dp))
                    .background(if (on) SqSurface else androidx.compose.ui.graphics.Color.Transparent)
                    .clickable { onSelect(value) },
                contentAlignment = Alignment.Center
            ) { Text(label, fontSize = 13.sp, fontWeight = if (on) FontWeight.Bold else FontWeight.Medium, color = if (on) SqCoralDeep else SqInkSoft) }
        }
    }
}

/** Nút sắp xếp gọn: icon mở menu chọn thứ tự, thay cho ô chọn chiếm chỗ. */
@Composable
fun <T> SortMenuButton(options: List<Pair<T, String>>, selected: T, onSelect: (T) -> Unit) {
    var open by androidx.compose.runtime.remember { androidx.compose.runtime.mutableStateOf(false) }
    Box {
        IconButton(onClick = { open = true }, modifier = Modifier.size(52.dp).sqSurface(26.dp, 3.dp)) {
            Icon(androidx.compose.material.icons.Icons.Default.SwapVert, contentDescription = "Sắp xếp", tint = SqCoral)
        }
        androidx.compose.material3.DropdownMenu(expanded = open, onDismissRequest = { open = false }) {
            options.forEach { (v, label) ->
                androidx.compose.material3.DropdownMenuItem(
                    text = { Text(label, fontWeight = if (v == selected) FontWeight.Bold else FontWeight.Normal, color = if (v == selected) SqCoralDeep else SqInk) },
                    onClick = { open = false; onSelect(v) }
                )
            }
        }
    }
}

/** Bộ chọn ngày dạng viên thuốc: lùi, nhãn ngày (chạm để mở lịch), tiến. */
@Composable
fun DatePill(label: String, canNext: Boolean, onPrev: () -> Unit, onNext: () -> Unit, onPick: (() -> Unit)? = null, modifier: Modifier = Modifier) {
    Row(modifier.fillMaxWidth().height(52.dp).sqSurface(26.dp, 3.dp), verticalAlignment = Alignment.CenterVertically) {
        IconButton(onClick = onPrev) { Icon(androidx.compose.material.icons.Icons.AutoMirrored.Filled.KeyboardArrowLeft, contentDescription = "Ngày trước", tint = SqCoral) }
        Row(
            Modifier.weight(1f).fillMaxHeight().then(if (onPick != null) Modifier.clickable(onClick = onPick) else Modifier),
            horizontalArrangement = Arrangement.Center, verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(androidx.compose.material.icons.Icons.Default.CalendarMonth, contentDescription = null, tint = SqInkSoft, modifier = Modifier.size(18.dp))
            Spacer(Modifier.width(8.dp))
            Text(label, fontSize = 15.sp, fontWeight = FontWeight.Bold, color = SqInk)
        }
        IconButton(onClick = onNext, enabled = canNext) { Icon(androidx.compose.material.icons.Icons.AutoMirrored.Filled.KeyboardArrowRight, contentDescription = "Ngày sau", tint = if (canNext) SqCoral else SqInkMuted) }
    }
}

/**
 * Khung thêm ảnh bằng nét đứt: thay cho ô trống khi chưa có ảnh, bản thân là một nút bấm.
 * [compact] dùng trong thẻ nhỏ (chỉ icon và nhãn ngắn), mặc định dùng cho khu vực ảnh lớn.
 */
@Composable
fun PhotoPlaceholderButton(label: String, onClick: () -> Unit, modifier: Modifier = Modifier, hint: String? = null, loading: Boolean = false, corner: androidx.compose.ui.unit.Dp = 14.dp) {
    val stroke = SqCoral.copy(alpha = 0.55f)
    Column(
        modifier = modifier
            .clip(RoundedCornerShape(corner))
            .background(SqCoralWash.copy(alpha = 0.5f))
            .drawBehind {
                drawRoundRect(
                    stroke, cornerRadius = androidx.compose.ui.geometry.CornerRadius(corner.toPx()),
                    style = androidx.compose.ui.graphics.drawscope.Stroke(1.5.dp.toPx(), pathEffect = androidx.compose.ui.graphics.PathEffect.dashPathEffect(floatArrayOf(14f, 10f)))
                )
            }
            .clickable(enabled = !loading, onClick = onClick)
            .semantics { contentDescription = label },
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        if (loading) androidx.compose.material3.CircularProgressIndicator(color = SqCoral, strokeWidth = 2.dp, modifier = Modifier.size(22.dp))
        else Icon(androidx.compose.material.icons.Icons.Default.AddAPhoto, contentDescription = null, tint = SqCoral, modifier = Modifier.size(26.dp))
        Spacer(Modifier.height(6.dp))
        Text(if (loading) "Đang tải ảnh…" else label, fontSize = 13.sp, fontWeight = FontWeight.Bold, color = SqCoralDeep, textAlign = TextAlign.Center)
        if (hint != null && !loading) Text(hint, fontSize = 11.sp, color = SqInkMuted, textAlign = TextAlign.Center, modifier = Modifier.padding(start = 12.dp, end = 12.dp, top = 2.dp))
    }
}

/** Nút mở bộ lọc: icon điều chỉnh, có huy hiệu số bộ lọc đang bật. */
@Composable
fun FilterButton(activeCount: Int, onClick: () -> Unit) {
    BadgedBox(badge = { if (activeCount > 0) Badge(containerColor = SqCoral) { Text("$activeCount") } }) {
        IconButton(onClick = onClick, modifier = Modifier.size(52.dp).sqSurface(26.dp, 3.dp)) {
            Icon(androidx.compose.material.icons.Icons.Default.Tune, contentDescription = "Bộ lọc", tint = SqCoral)
        }
    }
}
