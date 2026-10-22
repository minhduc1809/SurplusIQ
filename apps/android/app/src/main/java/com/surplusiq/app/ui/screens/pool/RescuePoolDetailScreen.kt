package com.surplusiq.app.ui.screens.pool

import androidx.compose.foundation.background
import com.surplusiq.app.ui.components.SqCard
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.Remove
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.surplusiq.app.domain.model.RescuePool
import com.surplusiq.app.domain.model.RescuePoolOffer
import com.surplusiq.app.domain.model.RescuePoolRegistration
import com.surplusiq.app.ui.theme.CoralRed
import com.surplusiq.app.ui.theme.CoralRedLight
import com.surplusiq.app.ui.theme.ForestGreenPrimary
import com.surplusiq.app.ui.theme.InfoOnLight
import com.surplusiq.app.ui.theme.MintDeep
import com.surplusiq.app.ui.theme.SkyInfoWash
import com.surplusiq.app.ui.theme.SurfaceSubtle
import com.surplusiq.app.ui.theme.TextMuted
import com.surplusiq.app.ui.theme.TextPrimary
import com.surplusiq.app.ui.theme.TextSecondary
import com.surplusiq.app.ui.theme.WarningOnLight
import com.surplusiq.app.ui.viewmodel.RescuePoolUiState
import kotlinx.coroutines.delay
import java.time.Duration
import java.time.Instant

private const val MAX_QTY_PER_REGISTRATION = 5
private val TERMINAL = setOf("COMPLETED", "INSUFFICIENT", "CANCELLED", "EXPIRED")

/** Rescue Pool (CM-C02): chi tiết đợt, đăng ký/sửa/rút nhu cầu, xem & xác nhận đề nghị cung ứng. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RescuePoolDetailScreen(
    state: RescuePoolUiState,
    onBackClick: () -> Unit,
    onRetry: () -> Unit,
    onRegister: (quantity: Int, budgetMax: Int?, pickupStart: String?, pickupEnd: String?) -> Unit,
    onUpdate: (quantity: Int, budgetMax: Int?, pickupStart: String?, pickupEnd: String?) -> Unit,
    onWithdraw: (reason: String) -> Unit,
    onConfirmOffer: (offerVersion: Int) -> Unit,
    onOpenMyOrders: () -> Unit,
    modifier: Modifier = Modifier
) {
    val pool = state.selectedPool

    Column(modifier = modifier.fillMaxSize().background(MaterialTheme.colorScheme.background)) {
        TopAppBar(
            title = { Text(pool?.title ?: "Mua chung theo đợt", fontWeight = FontWeight.Bold, fontSize = 17.sp) },
            navigationIcon = {
                IconButton(onClick = onBackClick) { Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Quay lại") }
            }
        )

        if (pool == null) {
            Box(Modifier.fillMaxSize().padding(24.dp), contentAlignment = Alignment.Center) {
                if (state.detailError != null) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(state.detailError, color = CoralRed)
                        Spacer(Modifier.height(12.dp))
                        Button(onClick = onRetry) { Text("Thử lại") }
                    }
                } else {
                    CircularProgressIndicator(color = ForestGreenPrimary)
                }
            }
        } else {
        Column(
            Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            if (state.isDetailLoading) LinearProgressIndicator(Modifier.fillMaxWidth(), color = ForestGreenPrimary)

            Row(verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text(pool.storeName, fontWeight = FontWeight.SemiBold, color = TextPrimary)
                    Text("${pool.serviceArea} · ${pool.targetCategory}", fontSize = 13.sp, color = TextSecondary)
                }
                PoolStatusChip(pool.status)
            }

            pool.myRegistration?.let { RegistrationBanner(it, onOpenMyOrders) }

            if (pool.status in TERMINAL) TerminalBanner(pool)

            state.createdOrderCode?.let { OrderCreatedBanner(it, onOpenMyOrders) }
            state.actionMessage?.let { if (state.createdOrderCode == null) MessageBox(it, isError = false) }
            state.actionError?.let { MessageBox(it, isError = true) }

            pool.offer?.let { offer ->
                OfferCard(
                    offer = offer,
                    quantity = pool.myRegistration?.requestedQuantity ?: 0,
                    isSubmitting = state.isSubmitting,
                    onConfirm = { onConfirmOffer(offer.offerVersion) }
                )
            }

            PublishedConditions(pool)

            val reg = pool.myRegistration
            when {
                pool.canRegister -> DemandForm(
                    pool = pool,
                    initial = null,
                    submitLabel = "Gửi đăng ký nhu cầu",
                    isSubmitting = state.isSubmitting,
                    onSubmit = onRegister
                )
                reg?.status == "ACTIVE" && pool.status == "OPEN" -> {
                    DemandForm(
                        pool = pool,
                        initial = reg,
                        submitLabel = "Cập nhật nhu cầu",
                        isSubmitting = state.isSubmitting,
                        onSubmit = onUpdate
                    )
                    WithdrawSection(state.isSubmitting, onWithdraw)
                }
                reg?.status == "ACTIVE" && pool.status !in TERMINAL -> WithdrawSection(state.isSubmitting, onWithdraw)
                pool.status == "OPEN" && reg == null -> Text(
                    "Đợt chưa đến giờ mở đăng ký (mở lúc ${formatPoolTime(pool.registrationOpenAt)}).",
                    color = TextSecondary,
                    fontSize = 13.sp
                )
            }
        }
        }
    }
}

@Composable
private fun RegistrationBanner(reg: RescuePoolRegistration, onOpenMyOrders: () -> Unit) {
    val ordered = reg.status == "ORDERED"
    Column(
        Modifier.fillMaxWidth()
            .background(if (ordered) MintDeep else SkyInfoWash, RoundedCornerShape(12.dp))
            .padding(14.dp)
    ) {
        RegistrationStatusChip(reg.status)
        Spacer(Modifier.height(6.dp))
        val text = when (reg.status) {
            "ORDERED" -> "Bạn đã có đơn chính thức từ đợt này. Rút nhu cầu không hủy đơn - muốn hủy, vào \"Đơn hàng của tôi\" theo chính sách hủy/hoàn tiền hiện hành."
            "ACTIVE" -> "Bạn quan tâm ${reg.requestedQuantity} suất. Đây chỉ là đăng ký nhu cầu: chưa có đơn, chưa giữ suất, chưa thu tiền."
            "WITHDRAWN" -> "Bạn đã rút nhu cầu khỏi đợt này."
            else -> "Đợt đã kết thúc, đăng ký của bạn đã đóng. Không có khoản thu nào."
        }
        Text(text, fontSize = 13.sp, color = if (ordered) Color.White else InfoOnLight)
        if (ordered) {
            Spacer(Modifier.height(8.dp))
            OutlinedButton(onClick = onOpenMyOrders, colors = ButtonDefaults.outlinedButtonColors(contentColor = Color.White)) {
                Text("Mở Đơn hàng của tôi")
            }
        }
    }
}

@Composable
private fun TerminalBanner(pool: RescuePool) {
    val text = when (pool.status) {
        "INSUFFICIENT" -> "Đợt không đủ nhu cầu tối thiểu và đã đóng. Không có đơn nào được tạo, không thu tiền."
        "CANCELLED" -> "Cửa hàng đã từ chối/hủy đợt${pool.cancellationReason?.let { " (lý do: $it)" } ?: ""}."
        "EXPIRED" -> "Đợt đã hết hạn${pool.cancellationReason?.let { " ($it)" } ?: ""}."
        else -> "Đợt đã kết thúc."
    }
    MessageBox(text, isError = pool.status == "CANCELLED")
}

@Composable
private fun OrderCreatedBanner(orderCode: String, onOpenMyOrders: () -> Unit) {
    Column(Modifier.fillMaxWidth().background(MintDeep, RoundedCornerShape(12.dp)).padding(14.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Icon(Icons.Default.CheckCircle, contentDescription = null, tint = Color.White)
            Spacer(Modifier.width(8.dp))
            Text("ĐÃ ĐẶT HÀNG - đơn $orderCode", color = Color.White, fontWeight = FontWeight.Bold)
        }
        Text(
            "Đơn chính thức đã được tạo và giữ suất 10 phút. Vui lòng thanh toán trong \"Đơn hàng của tôi\".",
            color = Color.White,
            fontSize = 13.sp
        )
        Spacer(Modifier.height(8.dp))
        Button(
            onClick = onOpenMyOrders,
            colors = ButtonDefaults.buttonColors(containerColor = Color.White, contentColor = MintDeep)
        ) { Text("Thanh toán trong Đơn hàng của tôi") }
    }
}

@Composable
private fun OfferCard(offer: RescuePoolOffer, quantity: Int, isSubmitting: Boolean, onConfirm: () -> Unit) {
    var now by remember { mutableStateOf(Instant.now()) }
    LaunchedEffect(offer.offerExpiryAt) {
        while (true) {
            delay(30_000)
            now = Instant.now()
        }
    }
    val expiry = parsePoolInstant(offer.offerExpiryAt)
    val minutesLeft = expiry?.let { Duration.between(now, it).toMinutes() }
    val expired = minutesLeft != null && minutesLeft < 0
    var showConfirm by remember { mutableStateOf(false) }

    Column(
        Modifier.fillMaxWidth()
            .border(2.dp, WarningOnLight, RoundedCornerShape(14.dp))
            .background(Color(0xFFFFF8E6), RoundedCornerShape(14.dp))
            .padding(14.dp),
        verticalArrangement = Arrangement.spacedBy(4.dp)
    ) {
        Text(
            "ĐỀ NGHỊ CUNG ỨNG · phiên bản ${offer.offerVersion}",
            color = WarningOnLight,
            fontWeight = FontWeight.Bold,
            fontSize = 12.sp
        )
        Text("Đây là đề nghị, chưa phải đơn hàng.", fontSize = 12.sp, color = TextSecondary)
        Text("${formatVnd(offer.proposedPrice)} / suất", fontSize = 22.sp, fontWeight = FontWeight.ExtraBold, color = TextPrimary)
        Text("Bạn mua: $quantity suất · tổng ${formatVnd((offer.proposedPrice ?: 0) * quantity)}", fontSize = 13.sp, color = TextPrimary)
        Text("Khung nhận: ${formatPoolTime(offer.pickupStart)} → ${formatPoolTime(offer.pickupEnd)}", fontSize = 13.sp, color = TextSecondary)
        offer.remainingQuantity?.let { Text("Còn $it/${offer.offeredQuantity ?: it} suất cung ứng", fontSize = 13.sp, color = TextSecondary) }
        Text(
            when {
                expired -> "Đề nghị đã hết hạn - không thể đặt từ đề nghị này."
                minutesLeft != null && minutesLeft < 30 -> "Sắp hết hạn: còn $minutesLeft phút (hạn ${formatPoolTime(offer.offerExpiryAt)})"
                else -> "Hạn xác nhận: ${formatPoolTime(offer.offerExpiryAt)}"
            },
            fontSize = 13.sp,
            fontWeight = FontWeight.SemiBold,
            color = if (expired || (minutesLeft ?: 99) < 30) CoralRed else WarningOnLight
        )
        if (offer.canConfirm && !expired) {
            Spacer(Modifier.height(6.dp))
            Button(
                onClick = { showConfirm = true },
                enabled = !isSubmitting && quantity > 0,
                modifier = Modifier.fillMaxWidth().height(48.dp),
                colors = ButtonDefaults.buttonColors(containerColor = ForestGreenPrimary)
            ) {
                Text(if (isSubmitting) "Đang xử lý…" else "Xác nhận mua", fontWeight = FontWeight.Bold)
            }
        }
    }

    if (showConfirm) {
        AlertDialog(
            onDismissRequest = { showConfirm = false },
            title = { Text("Xác nhận mua theo đề nghị?") },
            text = {
                Text(
                    "$quantity suất × ${formatVnd(offer.proposedPrice)} = ${formatVnd((offer.proposedPrice ?: 0) * quantity)}\n" +
                        "Nhận: ${formatPoolTime(offer.pickupStart)} → ${formatPoolTime(offer.pickupEnd)}\n\n" +
                        "Một đơn chính thức sẽ được tạo và giữ suất 10 phút chờ thanh toán."
                )
            },
            confirmButton = {
                TextButton(onClick = {
                    showConfirm = false
                    onConfirm()
                }) { Text("Đặt hàng") }
            },
            dismissButton = { TextButton(onClick = { showConfirm = false }) { Text("Để sau") } }
        )
    }
}

/** BR-C02-04: ngưỡng, thời hạn, khung nhận công bố trước khi đăng ký; giá/ngân sách trước đề nghị là dự kiến (BR-C02-02). */
@Composable
private fun PublishedConditions(pool: RescuePool) {
    SqCard(shape = RoundedCornerShape(14.dp)) {
        Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Text("Điều kiện của đợt", fontWeight = FontWeight.Bold, color = TextPrimary)
            ConditionRow("Đăng ký", "${formatPoolTime(pool.registrationOpenAt)} → ${formatPoolTime(pool.registrationCloseAt)}")
            ConditionRow("Ngưỡng mở đợt", "${pool.minimumDemand} suất (đang có ${pool.expectedQuantity} suất quan tâm)")
            LinearProgressIndicator(
                progress = { (pool.expectedQuantity.toFloat() / pool.minimumDemand.coerceAtLeast(1)).coerceIn(0f, 1f) },
                modifier = Modifier.fillMaxWidth(),
                color = ForestGreenPrimary
            )
            ConditionRow("Số lượng dự kiến tối đa", "${pool.maximumSupply} suất")
            ConditionRow("Khung nhận dự kiến", "${formatPoolTime(pool.pickupWindowStart)} → ${formatPoolTime(pool.pickupWindowEnd)}")
            if (pool.targetBudgetMin != null || pool.targetBudgetMax != null) {
                ConditionRow("Giá dự kiến", "${formatVnd(pool.targetBudgetMin)} – ${formatVnd(pool.targetBudgetMax)} (chưa phải giá chốt)")
            }
            ConditionRow("Hạn cửa hàng quyết định", formatPoolTime(pool.confirmDeadlineAt))
            ConditionRow("Kết thúc khi", pool.endCondition)
        }
    }
}

@Composable
private fun ConditionRow(label: String, value: String) {
    Row {
        Text(label, modifier = Modifier.width(150.dp), fontSize = 13.sp, color = TextMuted)
        Text(value, fontSize = 13.sp, color = TextPrimary)
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun DemandForm(
    pool: RescuePool,
    initial: RescuePoolRegistration?,
    submitLabel: String,
    isSubmitting: Boolean,
    onSubmit: (Int, Int?, String?, String?) -> Unit
) {
    val maxQty = minOf(MAX_QTY_PER_REGISTRATION, pool.maximumSupply.coerceAtLeast(1))
    var quantity by remember(initial?.id) { mutableIntStateOf(initial?.requestedQuantity ?: 1) }
    var budget by remember(initial?.id) { mutableStateOf(initial?.budgetMax?.toString() ?: "") }
    val slots = remember(pool.pickupWindowStart, pool.pickupWindowEnd) { hourlySlots(pool.pickupWindowStart, pool.pickupWindowEnd) }
    var slot by remember(initial?.id) {
        mutableStateOf(slots.firstOrNull { it.first == parsePoolInstant(initial?.preferredPickupStart) })
    }

    SqCard(shape = RoundedCornerShape(14.dp)) {
        Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Text(if (initial == null) "Đăng ký nhu cầu" else "Sửa nhu cầu", fontWeight = FontWeight.Bold, color = TextPrimary)
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text("Số suất quan tâm", modifier = Modifier.weight(1f), fontSize = 14.sp)
                IconButton(onClick = { if (quantity > 1) quantity-- }) { Icon(Icons.Default.Remove, contentDescription = "Giảm") }
                Text("$quantity", fontWeight = FontWeight.Bold, fontSize = 16.sp)
                IconButton(onClick = { if (quantity < maxQty) quantity++ }) { Icon(Icons.Default.Add, contentDescription = "Tăng") }
            }
            Text("Tối đa $maxQty suất mỗi đăng ký.", fontSize = 12.sp, color = TextMuted)
            OutlinedTextField(
                value = budget,
                onValueChange = { v -> budget = v.filter { it.isDigit() }.take(7) },
                label = { Text("Ngân sách tối đa / suất (đ, không bắt buộc)") },
                singleLine = true,
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                modifier = Modifier.fillMaxWidth()
            )
            Text("Khung nhận mong muốn", fontSize = 14.sp)
            FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                FilterChip(selected = slot == null, onClick = { slot = null }, label = { Text("Linh hoạt") })
                slots.forEach { s ->
                    FilterChip(
                        selected = slot == s,
                        onClick = { slot = s },
                        label = { Text(formatPoolTime(s.first.toString()).substringBefore(' ')) }
                    )
                }
            }
            Row(
                Modifier.fillMaxWidth().background(SurfaceSubtle, RoundedCornerShape(8.dp)).padding(10.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(Icons.Default.Info, contentDescription = null, tint = InfoOnLight, modifier = Modifier.size(16.dp))
                Spacer(Modifier.width(6.dp))
                Text(
                    "Gửi đăng ký KHÔNG tạo đơn, không giữ suất, không thu tiền. Bạn chỉ mua khi tự xác nhận đề nghị của cửa hàng.",
                    fontSize = 12.sp,
                    color = TextSecondary
                )
            }
            Button(
                onClick = { onSubmit(quantity, budget.toIntOrNull(), slot?.first?.toString(), slot?.second?.toString()) },
                enabled = !isSubmitting,
                modifier = Modifier.fillMaxWidth().height(48.dp),
                colors = ButtonDefaults.buttonColors(containerColor = InfoOnLight)
            ) { Text(if (isSubmitting) "Đang gửi…" else submitLabel) }
        }
    }
}

@Composable
private fun WithdrawSection(isSubmitting: Boolean, onWithdraw: (String) -> Unit) {
    var show by remember { mutableStateOf(false) }
    var reason by remember { mutableStateOf("") }
    OutlinedButton(
        onClick = { show = true },
        enabled = !isSubmitting,
        modifier = Modifier.fillMaxWidth(),
        colors = ButtonDefaults.outlinedButtonColors(contentColor = CoralRed)
    ) { Text("Rút nhu cầu") }

    if (show) {
        AlertDialog(
            onDismissRequest = { show = false },
            title = { Text("Rút nhu cầu khỏi đợt?") },
            text = {
                OutlinedTextField(
                    value = reason,
                    onValueChange = { reason = it.take(200) },
                    label = { Text("Lý do (bắt buộc)") },
                    modifier = Modifier.fillMaxWidth()
                )
            },
            confirmButton = {
                TextButton(enabled = reason.isNotBlank(), onClick = {
                    show = false
                    onWithdraw(reason.trim())
                }) { Text("Rút nhu cầu") }
            },
            dismissButton = { TextButton(onClick = { show = false }) { Text("Hủy") } }
        )
    }
}

@Composable
private fun MessageBox(text: String, isError: Boolean) {
    Text(
        text,
        modifier = Modifier.fillMaxWidth()
            .background(if (isError) CoralRedLight else SkyInfoWash, RoundedCornerShape(10.dp))
            .padding(12.dp),
        color = if (isError) CoralRed else InfoOnLight,
        fontSize = 13.sp
    )
}

/** Các khung 1 giờ trong khung nhận của đợt (tối đa 8 lựa chọn). */
private fun hourlySlots(startIso: String?, endIso: String?): List<Pair<Instant, Instant>> {
    val start = parsePoolInstant(startIso) ?: return emptyList()
    val end = parsePoolInstant(endIso) ?: return emptyList()
    return generateSequence(start) { it.plusSeconds(3600) }
        .takeWhile { it < end }
        .take(8)
        .map { it to minOf(it.plusSeconds(3600), end) }
        .toList()
}
