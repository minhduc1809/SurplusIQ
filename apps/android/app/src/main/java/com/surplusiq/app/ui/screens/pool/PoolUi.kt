package com.surplusiq.app.ui.screens.pool

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Remove
import androidx.compose.material.icons.filled.Storefront
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.surplusiq.app.domain.model.RescuePool
import com.surplusiq.app.domain.model.RescuePoolRegistration
import com.surplusiq.app.ui.screens.basket.BasketCardBox
import com.surplusiq.app.ui.screens.basket.LilacInk
import com.surplusiq.app.ui.screens.basket.Pill
import com.surplusiq.app.ui.screens.basket.PrimaryAction
import com.surplusiq.app.ui.screens.basket.SectionLabel
import com.surplusiq.app.ui.theme.DividerColor
import com.surplusiq.app.ui.theme.LilacWash
import com.surplusiq.app.ui.theme.SkyBlueContainer
import com.surplusiq.app.ui.theme.SkyBluePrimary
import com.surplusiq.app.ui.theme.SurfaceSubtle
import com.surplusiq.app.ui.theme.TextMuted
import com.surplusiq.app.ui.theme.TextPrimary
import com.surplusiq.app.ui.theme.TextSecondary
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter

internal const val MAX_QTY_PER_REGISTRATION = 5
internal val TERMINAL_STATUSES = setOf("COMPLETED", "INSUFFICIENT", "CANCELLED", "EXPIRED")

private val poolTimeFormat = DateTimeFormatter.ofPattern("HH:mm dd/MM")

internal fun parsePoolInstant(iso: String?): Instant? = iso?.let { runCatching { Instant.parse(it) }.getOrNull() }

internal fun formatPoolTime(iso: String?): String =
    parsePoolInstant(iso)?.atZone(ZoneId.systemDefault())?.format(poolTimeFormat) ?: "—"

internal fun formatVnd(amount: Int?): String =
    amount?.let { "%,dđ".format(it).replace(',', '.') } ?: "—"

internal fun poolStatusLabel(status: String): String = when (status) {
    "OPEN" -> "Đang mở đăng ký"
    "AGGREGATING" -> "Đang tổng hợp"
    "PENDING_STORE" -> "Chờ cửa hàng"
    "OFFER_PUBLISHED" -> "Có đề nghị cung ứng"
    "ORDERING_OPEN" -> "Mở đặt hàng"
    "COMPLETED" -> "Đã kết thúc"
    "INSUFFICIENT" -> "Không đủ điều kiện"
    "CANCELLED" -> "Cửa hàng đã hủy"
    "EXPIRED" -> "Hết hạn"
    else -> status
}

/** Trạng thái đợt: đề nghị cung ứng là nhãn cam đặc, đang mở là cam nhạt, các trạng thái còn lại xám. */
@Composable
internal fun PoolStatusChip(status: String, modifier: Modifier = Modifier) {
    val (bg, fg) = when (status) {
        "OFFER_PUBLISHED", "ORDERING_OPEN" -> SkyBluePrimary to Color.White
        "OPEN" -> SkyBlueContainer to SkyBluePrimary
        "AGGREGATING", "PENDING_STORE" -> LilacWash to LilacInk
        else -> SurfaceSubtle to TextSecondary
    }
    Text(
        poolStatusLabel(status).uppercase(),
        modifier = modifier.clip(RoundedCornerShape(50)).background(bg).padding(horizontal = 10.dp, vertical = 4.dp),
        color = fg,
        fontSize = 10.sp,
        fontWeight = FontWeight.ExtraBold,
        maxLines = 1
    )
}

/** BR-C02-03: "Đã đăng ký nhu cầu" (cam nhạt) khác hẳn "Đã đặt hàng" (nền tối, chữ trắng, dấu tích). */
@Composable
internal fun RegistrationStatusChip(status: String) {
    when (status) {
        "ORDERED" -> Row(
            Modifier.clip(RoundedCornerShape(50)).background(TextPrimary).padding(horizontal = 10.dp, vertical = 5.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(Icons.Default.CheckCircle, contentDescription = null, tint = Color.White, modifier = Modifier.size(14.dp))
            Spacer(Modifier.width(4.dp))
            Text("Đã đặt hàng", color = Color.White, fontSize = 11.sp, fontWeight = FontWeight.Bold)
        }
        "ACTIVE" -> Pill("Đã đăng ký nhu cầu", SkyBlueContainer, SkyBluePrimary)
        else -> Pill(if (status == "WITHDRAWN") "Đã rút nhu cầu" else "Đăng ký đã đóng", SurfaceSubtle, TextSecondary)
    }
}

/** Ảnh đợt: nền xám nhạt có biểu tượng cửa hàng nằm dưới, ảnh chỉ phủ lên khi tải được, nên lỗi mạng hay URL hỏng không để lại ô trống. */
@Composable
internal fun PoolImage(url: String?, modifier: Modifier = Modifier, corner: Dp = 16.dp, description: String? = null) {
    Box(modifier.clip(RoundedCornerShape(corner)).background(SurfaceSubtle), contentAlignment = Alignment.Center) {
        Icon(Icons.Default.Storefront, contentDescription = null, tint = TextMuted, modifier = Modifier.size(28.dp))
        if (!url.isNullOrBlank()) {
            AsyncImage(model = url, contentDescription = description, contentScale = ContentScale.Crop, modifier = Modifier.fillMaxSize())
        }
    }
}

@Composable
internal fun DemandProgress(expected: Int, minimum: Int, maximum: Int, modifier: Modifier = Modifier) {
    val reached = expected >= minimum.coerceAtLeast(1)
    Column(modifier) {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            Text("$expected/$maximum suất đăng ký", fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = TextPrimary)
            Text(if (reached) "Đủ điều kiện mở đợt" else "Cần tối thiểu $minimum suất", fontSize = 12.sp, color = if (reached) SkyBluePrimary else TextSecondary)
        }
        Spacer(Modifier.height(6.dp))
        LinearProgressIndicator(
            progress = { (expected.toFloat() / maximum.coerceAtLeast(1)).coerceIn(0f, 1f) },
            modifier = Modifier.fillMaxWidth().height(8.dp).clip(RoundedCornerShape(50)),
            color = SkyBluePrimary,
            trackColor = SkyBlueContainer
        )
    }
}

/** Các khung 1 giờ trong khung nhận của đợt (tối đa 8 lựa chọn). */
internal fun hourlySlots(startIso: String?, endIso: String?): List<Pair<Instant, Instant>> {
    val start = parsePoolInstant(startIso) ?: return emptyList()
    val end = parsePoolInstant(endIso) ?: return emptyList()
    return generateSequence(start) { it.plusSeconds(3600) }
        .takeWhile { it < end }
        .take(8)
        .map { it to minOf(it.plusSeconds(3600), end) }
        .toList()
}

/** Biểu mẫu đăng ký hoặc sửa nhu cầu: số suất, ngân sách tối đa mỗi suất và khung giờ nhận mong muốn (đều là dữ liệu máy chủ nhận). */
@OptIn(ExperimentalLayoutApi::class)
@Composable
internal fun DemandForm(
    pool: RescuePool,
    initial: RescuePoolRegistration?,
    submitLabel: String,
    isSubmitting: Boolean,
    onSubmit: (Int, Int?, String?, String?) -> Unit,
    modifier: Modifier = Modifier
) {
    val maxQty = minOf(MAX_QTY_PER_REGISTRATION, pool.maximumSupply.coerceAtLeast(1))
    var quantity by remember(initial?.id) { mutableIntStateOf(initial?.requestedQuantity ?: 1) }
    var budget by remember(initial?.id) { mutableStateOf(initial?.budgetMax?.toString() ?: "") }
    val slots = remember(pool.pickupWindowStart, pool.pickupWindowEnd) { hourlySlots(pool.pickupWindowStart, pool.pickupWindowEnd) }
    var slot by remember(initial?.id) { mutableStateOf(slots.firstOrNull { it.first == parsePoolInstant(initial?.preferredPickupStart) }) }
    val presets = remember(pool.targetBudgetMin, pool.targetBudgetMax) {
        listOfNotNull(pool.targetBudgetMin, pool.targetBudgetMax).distinct()
    }

    BasketCardBox(modifier) {
        SectionLabel("Số suất bạn quan tâm")
        Spacer(Modifier.height(10.dp))
        Row(
            Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(SurfaceSubtle).padding(8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            QtyButton(Icons.Default.Remove, "Giảm", enabled = quantity > 1) { quantity-- }
            Column(Modifier.weight(1f), horizontalAlignment = Alignment.CenterHorizontally) {
                Text("$quantity", fontSize = 24.sp, fontWeight = FontWeight.ExtraBold, color = TextPrimary)
                Text("suất, tối đa $maxQty", fontSize = 11.sp, color = TextSecondary)
            }
            QtyButton(Icons.Default.Add, "Tăng", enabled = quantity < maxQty, filled = true) { quantity++ }
        }

        Spacer(Modifier.height(16.dp))
        SectionLabel("Ngân sách tối đa mỗi suất")
        Spacer(Modifier.height(8.dp))
        OutlinedTextField(
            value = budget,
            onValueChange = { v -> budget = v.filter { it.isDigit() }.take(7) },
            placeholder = { Text("Không giới hạn") },
            suffix = { Text("đ") },
            singleLine = true,
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
            shape = RoundedCornerShape(14.dp),
            modifier = Modifier.fillMaxWidth()
        )
        if (presets.isNotEmpty()) {
            Spacer(Modifier.height(8.dp))
            FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                presets.forEach { p -> SelectChip(formatVnd(p), budget == p.toString()) { budget = p.toString() } }
                SelectChip("Không giới hạn", budget.isBlank()) { budget = "" }
            }
        }

        Spacer(Modifier.height(16.dp))
        SectionLabel("Khung giờ nhận mong muốn")
        Spacer(Modifier.height(8.dp))
        FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            SelectChip("Linh hoạt", slot == null) { slot = null }
            slots.forEach { s ->
                val label = formatPoolTime(s.first.toString()).substringBefore(' ') + " – " + formatPoolTime(s.second.toString()).substringBefore(' ')
                SelectChip(label, slot == s) { slot = s }
            }
        }

        MutedPoolNote("Đăng ký không tạo đơn, không giữ suất và không thu tiền. Bạn chỉ mua khi tự xác nhận đề nghị của cửa hàng.")
        Spacer(Modifier.height(14.dp))
        PrimaryAction(
            if (isSubmitting) "Đang gửi…" else submitLabel,
            enabled = !isSubmitting,
            modifier = Modifier.fillMaxWidth(),
            onClick = { onSubmit(quantity, budget.toIntOrNull(), slot?.first?.toString(), slot?.second?.toString()) }
        )
    }
}

@Composable
internal fun MutedPoolNote(text: String) {
    Text(text, fontSize = 12.sp, color = TextMuted, lineHeight = 17.sp, modifier = Modifier.padding(top = 12.dp))
}

@Composable
internal fun SelectChip(label: String, selected: Boolean, onClick: () -> Unit) {
    Text(
        label,
        fontSize = 13.sp,
        fontWeight = FontWeight.SemiBold,
        color = if (selected) Color.White else TextPrimary,
        maxLines = 1,
        modifier = Modifier.clip(RoundedCornerShape(12.dp))
            .background(if (selected) SkyBluePrimary else SurfaceSubtle)
            .border(1.dp, if (selected) SkyBluePrimary else DividerColor, RoundedCornerShape(12.dp))
            .clickable(onClick = onClick).padding(horizontal = 12.dp, vertical = 9.dp)
    )
}

@Composable
private fun QtyButton(icon: androidx.compose.ui.graphics.vector.ImageVector, desc: String, enabled: Boolean, filled: Boolean = false, onClick: () -> Unit) {
    Box(
        Modifier.size(44.dp).clip(CircleShape)
            .background(if (!enabled) SurfaceSubtle else if (filled) SkyBluePrimary else Color.White)
            .clickable(enabled = enabled, onClick = onClick),
        contentAlignment = Alignment.Center
    ) { Icon(icon, contentDescription = desc, tint = if (filled && enabled) Color.White else TextPrimary, modifier = Modifier.size(20.dp)) }
}

/** Ô thông tin nhỏ (giá dự kiến, khung nhận, hạn gom, quy tắc chốt) xếp hai cột. */
@Composable
internal fun InfoTile(label: String, value: String, modifier: Modifier = Modifier) {
    Column(modifier.clip(RoundedCornerShape(16.dp)).background(SurfaceSubtle).padding(12.dp)) {
        Text(label, fontSize = 11.sp, color = TextSecondary)
        Spacer(Modifier.height(2.dp))
        Text(value, fontSize = 14.sp, fontWeight = FontWeight.ExtraBold, color = TextPrimary)
    }
}
