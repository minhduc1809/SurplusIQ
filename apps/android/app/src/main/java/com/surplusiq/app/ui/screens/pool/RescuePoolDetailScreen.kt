package com.surplusiq.app.ui.screens.pool

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.filled.Restaurant
import androidx.compose.material.icons.filled.Schedule
import androidx.compose.material.icons.filled.Timer
import com.surplusiq.app.ui.theme.SurfaceSubtle
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.surplusiq.app.domain.model.RescuePool
import com.surplusiq.app.domain.model.RescuePoolOffer
import com.surplusiq.app.domain.model.RescuePoolRegistration
import com.surplusiq.app.ui.screens.basket.BasketCardBox
import com.surplusiq.app.ui.screens.basket.BasketFrame
import com.surplusiq.app.ui.screens.basket.CONTENT_MAX_WIDTH
import com.surplusiq.app.ui.screens.basket.PrimaryAction
import com.surplusiq.app.ui.screens.basket.SectionLabel
import com.surplusiq.app.ui.screens.basket.WIDE_BREAKPOINT
import com.surplusiq.app.ui.screens.basket.WIDE_MAX_WIDTH
import com.surplusiq.app.ui.theme.CoralRed
import com.surplusiq.app.ui.theme.SkyBlueContainer
import com.surplusiq.app.ui.theme.SkyBluePrimary
import com.surplusiq.app.ui.theme.TextPrimary
import com.surplusiq.app.ui.theme.TextSecondary
import com.surplusiq.app.ui.viewmodel.RescuePoolUiState
import kotlinx.coroutines.delay
import java.time.Duration
import java.time.Instant

/**
 * Chi tiết đợt (CM-C02): đăng ký, sửa, rút nhu cầu, xem và xác nhận đề nghị cung ứng.
 * Điện thoại một cột; từ 840dp cột trái là thông tin đợt, cột phải là biểu mẫu thao tác.
 */
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

    BasketFrame(title = "Chi tiết đợt", subtitle = pool?.storeName, onBack = onBackClick, modifier = modifier) { inner ->
        if (pool == null) {
            Box(Modifier.padding(inner).fillMaxSize().padding(24.dp), contentAlignment = Alignment.Center) {
                if (state.detailError != null) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(state.detailError, color = CoralRed)
                        TextButton(onClick = onRetry) { Text("Thử lại", color = SkyBluePrimary) }
                    }
                } else CircularProgressIndicator(color = SkyBluePrimary)
            }
        } else {
            BoxWithConstraints(Modifier.padding(inner).fillMaxSize(), contentAlignment = Alignment.TopCenter) {
                val wide = maxWidth >= WIDE_BREAKPOINT
                val reg = pool.myRegistration
                val info: @Composable ColumnScope.() -> Unit = {
                    if (state.isDetailLoading) LinearProgressIndicator(Modifier.fillMaxWidth(), color = SkyBluePrimary, trackColor = SkyBlueContainer)
                    Hero(pool)
                    reg?.let { RegistrationBanner(it, onOpenMyOrders) }
                    if (pool.status in TERMINAL_STATUSES) NoticeBox(terminalText(pool), error = false)
                    state.createdOrderCode?.let { OrderCreatedBanner(it, onOpenMyOrders) }
                    state.actionMessage?.let { if (state.createdOrderCode == null) NoticeBox(it, error = false) }
                    state.actionError?.let { NoticeBox(it, error = true) }
                    pool.offer?.let { offer ->
                        OfferCard(pool.title, offer, reg?.requestedQuantity ?: 0, state.isSubmitting) { onConfirmOffer(offer.offerVersion) }
                    }
                    PublishedConditions(pool)
                }
                val actions: @Composable ColumnScope.() -> Unit = {
                    when {
                        pool.canRegister -> DemandForm(pool, null, "Gửi đăng ký nhu cầu", state.isSubmitting, onRegister)
                        reg?.status == "ACTIVE" && pool.status == "OPEN" -> {
                            DemandForm(pool, reg, "Cập nhật nhu cầu", state.isSubmitting, onUpdate)
                            WithdrawSection(state.isSubmitting, onWithdraw)
                        }
                        reg?.status == "ACTIVE" && pool.status !in TERMINAL_STATUSES -> WithdrawSection(state.isSubmitting, onWithdraw)
                        pool.status == "OPEN" && reg == null -> Text(
                            "Đợt chưa đến giờ mở đăng ký (mở lúc ${formatPoolTime(pool.registrationOpenAt)}).",
                            color = TextSecondary, fontSize = 13.sp
                        )
                    }
                }
                if (wide) {
                    Row(Modifier.widthIn(max = WIDE_MAX_WIDTH).fillMaxSize().padding(16.dp), horizontalArrangement = Arrangement.spacedBy(20.dp)) {
                        Column(Modifier.weight(0.55f).verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(14.dp), content = info)
                        Column(Modifier.weight(0.45f).verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(14.dp), content = actions)
                    }
                } else {
                    Column(
                        Modifier.widthIn(max = CONTENT_MAX_WIDTH).fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(14.dp)
                    ) { info(); actions(); Spacer(Modifier.height(8.dp)) }
                }
            }
        }
    }
}

private fun terminalText(pool: RescuePool) = when (pool.status) {
    "CANCELLED" -> "Cửa hàng đã hủy đợt" + (pool.cancellationReason?.let { ": $it" } ?: ".")
    "INSUFFICIENT" -> "Đợt không đủ điều kiện để mở đặt hàng."
    "EXPIRED" -> "Đợt đã hết hạn."
    else -> "Đợt đã kết thúc."
}

@Composable
private fun Hero(pool: RescuePool) {
    Box(Modifier.fillMaxWidth().aspectRatio(16f / 9f)) {
        PoolImage(pool.imageUrl, Modifier.fillMaxSize(), corner = 22.dp, description = pool.title)
        Box(
            Modifier.fillMaxSize().clip(RoundedCornerShape(22.dp))
                .background(androidx.compose.ui.graphics.Brush.verticalGradient(listOf(Color.Transparent, Color.Black.copy(alpha = 0.6f))))
        )
        PoolStatusChip(pool.status, Modifier.align(Alignment.TopStart).padding(12.dp))
        Column(Modifier.align(Alignment.BottomStart).padding(16.dp)) {
            Text(pool.title, color = Color.White, fontWeight = FontWeight.ExtraBold, fontSize = 20.sp, maxLines = 2)
            Text("${pool.storeName} · ${pool.serviceArea}", color = Color.White.copy(alpha = 0.9f), fontSize = 12.sp, maxLines = 1)
        }
    }
}

@Composable
private fun RegistrationBanner(reg: RescuePoolRegistration, onOpenMyOrders: () -> Unit) {
    BasketCardBox {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
            Column {
                SectionLabel("Yêu cầu của bạn")
                Text("${reg.requestedQuantity} suất", fontSize = 24.sp, fontWeight = FontWeight.ExtraBold, color = TextPrimary)
            }
            RegistrationStatusChip(reg.status)
        }
        if (reg.status == "ORDERED") {
            Spacer(Modifier.height(10.dp))
            OutlinedButton(onClick = onOpenMyOrders, shape = RoundedCornerShape(14.dp), modifier = Modifier.fillMaxWidth()) {
                Text("Xem trong Đơn hàng của tôi", color = SkyBluePrimary, fontWeight = FontWeight.SemiBold)
            }
        } else if (reg.status == "ACTIVE") {
            Text("Quán xác nhận đủ lượng rồi mới thanh toán.", fontSize = 12.sp, color = TextSecondary, modifier = Modifier.padding(top = 6.dp))
        }
    }
}

@Composable
private fun OrderCreatedBanner(orderCode: String, onOpenMyOrders: () -> Unit) {
    Column(Modifier.fillMaxWidth().clip(RoundedCornerShape(20.dp)).background(TextPrimary).padding(16.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
        Text("Đã tạo đơn $orderCode", color = Color.White, fontWeight = FontWeight.ExtraBold, fontSize = 16.sp)
        Text("Suất được giữ 10 phút chờ thanh toán.", color = Color.White.copy(alpha = 0.85f), fontSize = 12.sp)
        PrimaryAction("Thanh toán trong Đơn hàng của tôi", modifier = Modifier.fillMaxWidth(), onClick = onOpenMyOrders)
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun OfferCard(title: String, offer: RescuePoolOffer, quantity: Int, isSubmitting: Boolean, onConfirm: () -> Unit) {
    var now by remember { mutableStateOf(Instant.now()) }
    LaunchedEffect(offer.offerExpiryAt) { while (true) { delay(30_000); now = Instant.now() } }
    val expiry = parsePoolInstant(offer.offerExpiryAt)
    val minutesLeft = expiry?.let { Duration.between(now, it).toMinutes() }
    val expired = minutesLeft != null && minutesLeft < 0
    var showConfirm by remember { mutableStateOf(false) }

    Column(Modifier.fillMaxWidth().clip(RoundedCornerShape(22.dp)).background(SkyBlueContainer).padding(16.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
        Text("ĐỀ NGHỊ CUNG ỨNG · PHIÊN BẢN ${offer.offerVersion}", color = SkyBluePrimary, fontWeight = FontWeight.ExtraBold, fontSize = 11.sp, letterSpacing = 0.5.sp)
        Text("${formatVnd(offer.proposedPrice)} / suất", fontSize = 26.sp, fontWeight = FontWeight.ExtraBold, color = TextPrimary)
        Text("Bạn mua $quantity suất, tổng ${formatVnd((offer.proposedPrice ?: 0) * quantity)}", fontSize = 13.sp, color = TextPrimary)
        Text("Nhận ${formatPoolTime(offer.pickupStart)} → ${formatPoolTime(offer.pickupEnd)}", fontSize = 13.sp, color = TextSecondary)
        offer.remainingQuantity?.let { Text("Còn $it/${offer.offeredQuantity ?: it} suất cung ứng", fontSize = 13.sp, color = TextSecondary) }
        Text(
            when {
                expired -> "Đề nghị đã hết hạn."
                minutesLeft != null && minutesLeft < 30 -> "Sắp hết hạn: còn $minutesLeft phút"
                else -> "Hạn xác nhận ${formatPoolTime(offer.offerExpiryAt)}"
            },
            fontSize = 13.sp, fontWeight = FontWeight.Bold, color = if (expired || (minutesLeft ?: 99) < 30) CoralRed else TextPrimary
        )
        Text("Đây là đề nghị, chưa phải đơn hàng.", fontSize = 12.sp, color = TextSecondary)
        if (offer.canConfirm && !expired) {
            Spacer(Modifier.height(4.dp))
            PrimaryAction(if (isSubmitting) "Đang xử lý…" else "Xác nhận mua", enabled = !isSubmitting && quantity > 0, modifier = Modifier.fillMaxWidth()) { showConfirm = true }
        }
    }

    if (showConfirm) {
        val unit = offer.proposedPrice ?: 0
        ModalBottomSheet(onDismissRequest = { showConfirm = false }, sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true), containerColor = MaterialTheme.colorScheme.surface) {
            Column(Modifier.widthIn(max = 640.dp).fillMaxWidth().padding(horizontal = 20.dp).navigationBarsPadding(), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(Modifier.size(52.dp).clip(RoundedCornerShape(16.dp)).background(SkyBlueContainer), contentAlignment = Alignment.Center) {
                        Icon(Icons.Default.Restaurant, contentDescription = null, tint = SkyBluePrimary, modifier = Modifier.size(28.dp))
                    }
                    Spacer(Modifier.width(14.dp))
                    Column {
                        Text("XÁC NHẬN ĐƠN", fontSize = 11.sp, fontWeight = FontWeight.ExtraBold, color = SkyBluePrimary, letterSpacing = 0.6.sp)
                        Text("Xác nhận mua theo đề nghị?", fontSize = 20.sp, fontWeight = FontWeight.ExtraBold, color = TextPrimary)
                    }
                }
                Column(Modifier.fillMaxWidth().clip(RoundedCornerShape(18.dp)).background(SurfaceSubtle).padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(Modifier.size(26.dp).clip(CircleShape).background(SkyBluePrimary), contentAlignment = Alignment.Center) {
                            Text("1", color = Color.White, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                        }
                        Spacer(Modifier.width(10.dp))
                        Text(title, fontSize = 16.sp, fontWeight = FontWeight.ExtraBold, color = TextPrimary, modifier = Modifier.weight(1f), maxLines = 2)
                        Spacer(Modifier.width(8.dp))
                        Text(formatVnd(unit * quantity), fontSize = 18.sp, fontWeight = FontWeight.ExtraBold, color = SkyBluePrimary, maxLines = 1)
                    }
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text("Đơn giá", fontSize = 13.sp, color = TextSecondary)
                        Text("$quantity × ${formatVnd(unit)}", fontSize = 13.sp, color = TextPrimary, fontWeight = FontWeight.SemiBold)
                    }
                    Row(verticalAlignment = Alignment.Top) {
                        Icon(Icons.Default.Schedule, contentDescription = null, tint = TextSecondary, modifier = Modifier.size(18.dp))
                        Spacer(Modifier.width(8.dp))
                        Text(
                            "Khung nhận: ${formatPoolTime(offer.pickupStart)} → ${formatPoolTime(offer.pickupEnd)}",
                            fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = TextPrimary
                        )
                    }
                }
                Row(Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(SkyBlueContainer).padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.Timer, contentDescription = null, tint = SkyBluePrimary, modifier = Modifier.size(22.dp))
                    Spacer(Modifier.width(10.dp))
                    Text("Đơn sẽ được tạo và giữ suất trong 10 phút để bạn hoàn tất thanh toán.", fontSize = 13.sp, color = TextPrimary, lineHeight = 18.sp)
                }
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    Button(
                        onClick = { showConfirm = false },
                        shape = RoundedCornerShape(20.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = SkyBlueContainer),
                        modifier = Modifier.weight(0.8f).heightIn(min = 56.dp)
                    ) { Text("Để sau", color = SkyBluePrimary, fontWeight = FontWeight.Bold, fontSize = 15.sp) }
                    Button(
                        onClick = { showConfirm = false; onConfirm() },
                        shape = RoundedCornerShape(20.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = SkyBluePrimary),
                        modifier = Modifier.weight(1.2f).heightIn(min = 56.dp)
                    ) {
                        Text("Đặt hàng", color = Color.White, fontWeight = FontWeight.ExtraBold, fontSize = 15.sp)
                        Spacer(Modifier.width(6.dp))
                        Icon(Icons.AutoMirrored.Filled.ArrowForward, contentDescription = null, tint = Color.White, modifier = Modifier.size(18.dp))
                    }
                }
                Spacer(Modifier.height(12.dp))
            }
        }
    }
}

/** BR-C02-04: ngưỡng, thời hạn, khung nhận công bố trước khi đăng ký; giá và ngân sách trước đề nghị chỉ là dự kiến (BR-C02-02). */
@Composable
private fun PublishedConditions(pool: RescuePool) {
    BasketCardBox {
        SectionLabel("Điều kiện của đợt")
        Spacer(Modifier.height(10.dp))
        DemandProgress(pool.expectedQuantity, pool.minimumDemand, pool.maximumSupply)
        Spacer(Modifier.height(12.dp))
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            InfoTile(
                "Giá dự kiến",
                if (pool.targetBudgetMin != null || pool.targetBudgetMax != null) "${formatVnd(pool.targetBudgetMin)} – ${formatVnd(pool.targetBudgetMax)}" else "Chờ chốt giá",
                Modifier.weight(1f)
            )
            InfoTile("Khung nhận", "${formatPoolTime(pool.pickupWindowStart).substringBefore(' ')} – ${formatPoolTime(pool.pickupWindowEnd).substringBefore(' ')}", Modifier.weight(1f))
        }
        Spacer(Modifier.height(10.dp))
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            InfoTile("Đăng ký đến", formatPoolTime(pool.registrationCloseAt), Modifier.weight(1f))
            InfoTile("Quán quyết định", formatPoolTime(pool.confirmDeadlineAt), Modifier.weight(1f))
        }
        if (pool.endCondition.isNotBlank()) {
            Text("Kết thúc khi: ${pool.endCondition}", fontSize = 12.sp, color = TextSecondary, modifier = Modifier.padding(top = 10.dp))
        }
    }
}

@Composable
private fun WithdrawSection(isSubmitting: Boolean, onWithdraw: (String) -> Unit) {
    var show by remember { mutableStateOf(false) }
    var reason by remember { mutableStateOf("") }
    OutlinedButton(onClick = { show = true }, enabled = !isSubmitting, shape = RoundedCornerShape(16.dp), modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp)) {
        Text("Rút nhu cầu", color = CoralRed, fontWeight = FontWeight.SemiBold)
    }
    if (show) {
        AlertDialog(
            onDismissRequest = { show = false },
            title = { Text("Rút nhu cầu khỏi đợt?") },
            text = { OutlinedTextField(value = reason, onValueChange = { reason = it.take(200) }, label = { Text("Lý do (bắt buộc)") }, modifier = Modifier.fillMaxWidth()) },
            confirmButton = { TextButton(enabled = reason.isNotBlank(), onClick = { show = false; onWithdraw(reason.trim()) }) { Text("Rút nhu cầu", color = CoralRed) } },
            dismissButton = { TextButton(onClick = { show = false }) { Text("Hủy", color = TextSecondary) } }
        )
    }
}

@Composable
private fun NoticeBox(text: String, error: Boolean) {
    Text(
        text,
        modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(14.dp)).background(if (error) CoralRed.copy(alpha = 0.1f) else SkyBlueContainer).padding(14.dp),
        color = if (error) CoralRed else TextPrimary,
        fontSize = 13.sp
    )
}
