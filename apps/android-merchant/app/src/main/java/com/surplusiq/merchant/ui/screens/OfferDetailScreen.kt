package com.surplusiq.merchant.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.History
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.surplusiq.merchant.data.AdjustStockRequest
import com.surplusiq.merchant.data.OfferDto
import com.surplusiq.merchant.data.OfferReasonRequest
import com.surplusiq.merchant.data.StoreRepository
import com.surplusiq.merchant.data.UpdateOfferRequest
import com.surplusiq.merchant.ui.components.*
import com.surplusiq.merchant.ui.theme.*
import kotlinx.coroutines.launch
import java.time.LocalDate

/** Lý do khớp StockAdjustmentReason / OfferCloseReason / OfferCancelReason (offers.constants.ts). */
private val ADJUST_REASONS = listOf("Làm thêm", "Hỏng", "Bán tại quầy", "Khác")
private val CLOSE_REASONS = listOf("Hết nguyên liệu", "Đóng cửa", "Khác")
private val CANCEL_REASONS = listOf("Sự cố quán", "Sự cố chất lượng", "Bất khả kháng", "Khác")
private const val MAX_PRICE_CHANGES = 3

private enum class OfferDialog { ADJUST, CLOSE, CANCEL }

/** S28 - Chi tiết và chỉnh sửa suất (GET/PATCH store/offers/:id, adjust-stock, close, cancel). */
@Composable
fun OfferDetailScreen(repository: StoreRepository, offerId: String, onNavigate: (String) -> Unit, onBack: () -> Unit) {
    var offer by remember { mutableStateOf<OfferDto?>(null) }
    var isLoading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }
    var attempt by remember { mutableIntStateOf(0) }
    var tab by remember { mutableIntStateOf(0) }
    var dialog by remember { mutableStateOf<OfferDialog?>(null) }
    var busy by remember { mutableStateOf(false) }
    var dialogError by remember { mutableStateOf<String?>(null) }
    var actionError by remember { mutableStateOf<String?>(null) }
    var success by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    LaunchedEffect(attempt) {
        isLoading = offer == null
        error = null
        repository.getOffer(offerId).fold(onSuccess = { offer = it }, onFailure = { error = it.message })
        isLoading = false
    }

    /** Chạy một thao tác ghi rồi tải lại suất (response PATCH/POST không kèm món). */
    fun run(message: String, inDialog: Boolean, call: suspend () -> Result<OfferDto>) {
        busy = true
        dialogError = null
        actionError = null
        success = null
        scope.launch {
            call().fold(
                onSuccess = { dialog = null; tab = 0; success = message; attempt++ },
                onFailure = { if (inDialog) dialogError = it.message else actionError = it.message }
            )
            busy = false
        }
    }

    Column(modifier = Modifier.fillMaxSize().background(SqCanvas).verticalScroll(rememberScrollState()).padding(20.dp)) {
        ScreenHeader(offer?.let { offerTitle(it, emptyMap()) } ?: "Chi tiết suất", onBack) {
            IconButton(onClick = { onNavigate("offer-history/$offerId") }) {
                Icon(Icons.Default.History, contentDescription = "Lịch sử thay đổi", tint = SqCoral)
            }
        }
        Spacer(modifier = Modifier.height(12.dp))

        when {
            isLoading -> FullScreenLoading()
            error != null -> ErrorState(error!!) { attempt++ }
            offer != null -> {
                val o = offer!!
                val editable = o.status == "DRAFT" || o.status == "OPEN"
                val finished = o.status == "CLOSED" || o.status == "CANCELLED"
                TabRow(selectedTabIndex = tab, containerColor = SqCanvas, contentColor = SqCoralDeep) {
                    Tab(selected = tab == 0, onClick = { tab = 0 }, text = { Text("Thông tin") })
                    Tab(selected = tab == 1, onClick = { tab = 1 }, enabled = editable, text = { Text("Chỉnh sửa") })
                }
                Spacer(modifier = Modifier.height(12.dp))
                InlineSuccess(success)
                InlineError(actionError)

                if (tab == 0) {
                    SqCard {
                        Row {
                            Text(currency(o.currentPrice), fontSize = 24.sp, fontWeight = FontWeight.ExtraBold, color = SqCoralDeep, modifier = Modifier.weight(1f))
                            StatusBadge(o.status)
                        }
                        Spacer(modifier = Modifier.height(6.dp))
                        InfoRow("Giá gốc", currency(o.originalPrice))
                        InfoRow("Giảm", "${discountPercent(o.originalPrice, o.currentPrice)}%")
                        o.floorPrice?.let { InfoRow("Giá sàn", currency(it)) }
                        InfoRow("Ngày", shortDate(localDateOf(o.pickupStart)))
                        InfoRow("Khung nhận", "${shortTime(o.pickupStart)} – ${shortTime(o.pickupEnd)}")
                        InfoRow("Lần đổi giá", "${o.priceChangeCount ?: 0}/$MAX_PRICE_CHANGES")
                    }
                    Spacer(modifier = Modifier.height(12.dp))
                    SqCard {
                        SectionTitle("Tồn kho")
                        Spacer(modifier = Modifier.height(10.dp))
                        StockStats(o)
                    }
                    Spacer(modifier = Modifier.height(16.dp))

                    if (o.status == "DRAFT") {
                        PrimaryButton("Mở bán", loading = busy) { run("Đã mở bán suất.", false) { repository.updateOffer(offerId, UpdateOfferRequest(status = "OPEN")) } }
                        Spacer(modifier = Modifier.height(8.dp))
                    }
                    if (o.status != "CANCELLED") {
                        OutlineAction("Điều chỉnh tồn") { dialogError = null; dialog = OfferDialog.ADJUST }
                    }
                    if (!finished) {
                        OutlineAction("Đóng suất sớm") { dialogError = null; dialog = OfferDialog.CLOSE }
                        OutlineAction("Hủy suất và hoàn tiền", danger = true) { dialogError = null; dialog = OfferDialog.CANCEL }
                    }
                } else {
                    EditOfferForm(o, busy) { request -> run("Đã lưu thay đổi.", false) { repository.updateOffer(offerId, request) } }
                }
            }
        }
    }

    when (dialog) {
        OfferDialog.ADJUST -> AdjustStockDialog(busy, dialogError, onDismiss = { dialog = null }) { delta, reason, note ->
            run("Đã điều chỉnh tồn.", true) { repository.adjustStock(offerId, AdjustStockRequest(delta, reason, note)) }
        }
        OfferDialog.CLOSE -> ReasonDialog(
            "Đóng suất sớm", "Suất ngừng nhận đặt; phần còn lại được tính là bỏ.", "Đóng suất",
            CLOSE_REASONS, busy, dialogError, onDismiss = { dialog = null }
        ) { reason, note -> run("Đã đóng suất.", true) { repository.closeOffer(offerId, OfferReasonRequest(reason, note)) } }
        OfferDialog.CANCEL -> ReasonDialog(
            "Hủy suất", "Mọi đơn đã đặt của suất sẽ bị hủy và hoàn 100% tiền cho khách.", "Hủy suất",
            CANCEL_REASONS, busy, dialogError, onDismiss = { dialog = null }
        ) { reason, note -> run("Đã hủy suất.", true) { repository.cancelOffer(offerId, OfferReasonRequest(reason, note)) } }
        null -> Unit
    }
}

@Composable
private fun OutlineAction(text: String, danger: Boolean = false, onClick: () -> Unit) {
    OutlinedButton(
        onClick = onClick, shape = RoundedCornerShape(24.dp),
        modifier = Modifier.fillMaxWidth().height(48.dp)
    ) { Text(text, color = if (danger) SqCoralDeep else SqInk, fontWeight = FontWeight.SemiBold) }
    Spacer(modifier = Modifier.height(8.dp))
}

/** Tab "Chỉnh sửa": chỉ gửi field đã đổi để không tốn lượt đổi giá. */
@Composable
private fun EditOfferForm(o: OfferDto, busy: Boolean, onSave: (UpdateOfferRequest) -> Unit) {
    val date = remember(o.id) { LocalDate.parse(localDateOf(o.pickupStart)) }
    var quantity by remember(o) { mutableStateOf(o.totalQuantity.toString()) }
    var price by remember(o) { mutableStateOf(o.currentPrice.toString()) }
    var start by remember(o) { mutableStateOf(shortTime(o.pickupStart)) }
    var end by remember(o) { mutableStateOf(shortTime(o.pickupEnd)) }
    var note by remember(o) { mutableStateOf("") }
    var error by remember { mutableStateOf<String?>(null) }
    val changesLeft = MAX_PRICE_CHANGES - (o.priceChangeCount ?: 0)
    val floor = o.floorPrice ?: floorPriceFor(o.originalPrice)

    fun save() {
        val qty = quantity.toIntOrNull()
        val newPrice = price.toLongOrNull()
        val priceChanged = newPrice != o.currentPrice
        val windowChanged = start != shortTime(o.pickupStart) || end != shortTime(o.pickupEnd)
        error = when {
            qty == null || qty !in 1..500 -> "Số lượng từ 1 đến 500."
            qty < o.soldQuantity -> "Số lượng không được nhỏ hơn số đã bán (${o.soldQuantity})."
            priceChanged && changesLeft <= 0 -> "Suất đã dùng hết $MAX_PRICE_CHANGES lần đổi giá."
            priceChanged -> offerPriceError(newPrice, o.originalPrice, floor)
            windowChanged -> pickupWindowError(start, end)
            else -> null
        }
        if (error != null || qty == null) return
        val request = UpdateOfferRequest(
            totalQuantity = qty.takeIf { it != o.totalQuantity },
            currentPrice = newPrice.takeIf { priceChanged },
            pickupStart = if (windowChanged) isoAt(date, start) else null,
            pickupEnd = if (windowChanged) isoAt(date, end) else null,
            note = note.trim().ifEmpty { null },
        )
        if (request == UpdateOfferRequest(note = request.note)) { error = "Chưa có thay đổi nào."; return }
        onSave(request)
    }

    SqCard {
        SqField("Tổng số suất", quantity, keyboardType = KeyboardType.Number, hint = "Không nhỏ hơn số đã bán (${o.soldQuantity})") {
            quantity = it.filter(Char::isDigit).take(3)
        }
        Spacer(modifier = Modifier.height(10.dp))
        SqField(
            "Giá bán (đ)", price, keyboardType = KeyboardType.Number, enabled = changesLeft > 0,
            hint = "Giá sàn ${currency(floor)} · còn $changesLeft lần đổi giá"
        ) { price = it.filter(Char::isDigit).take(7) }
        Spacer(modifier = Modifier.height(10.dp))
        Row {
            SqField("Nhận từ", start, modifier = Modifier.weight(1f)) { start = it.take(5) }
            Spacer(modifier = Modifier.width(10.dp))
            SqField("Đến", end, modifier = Modifier.weight(1f)) { end = it.take(5) }
        }
        Spacer(modifier = Modifier.height(10.dp))
        SqField("Ghi chú / lý do thay đổi", note, singleLine = false, hint = "${note.length}/200") { note = it.take(200) }
    }
    InlineError(error)
    Spacer(modifier = Modifier.height(12.dp))
    PrimaryButton("Lưu thay đổi", loading = busy, onClick = ::save)
}

/** Hộp thoại chọn lý do bắt buộc + ghi chú; [extra] chèn trường riêng (vd. số lượng điều chỉnh). */
@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun ReasonDialog(
    title: String,
    message: String,
    confirmLabel: String,
    reasons: List<String>,
    busy: Boolean,
    error: String?,
    onDismiss: () -> Unit,
    extraValid: Boolean = true,
    extra: @Composable ColumnScope.() -> Unit = {},
    onConfirm: (reason: String, note: String?) -> Unit
) {
    var reason by remember { mutableStateOf<String?>(null) }
    var note by remember { mutableStateOf("") }
    ConfirmDialog(
        title = title, message = message, confirmLabel = if (busy) "Đang xử lý…" else confirmLabel,
        confirmEnabled = !busy && reason != null && extraValid,
        onConfirm = { reason?.let { onConfirm(it, note.trim().ifEmpty { null }) } },
        onDismiss = onDismiss
    ) {
        Spacer(modifier = Modifier.height(12.dp))
        extra()
        Text("Lý do", fontSize = 12.sp, color = SqInkSoft)
        Spacer(modifier = Modifier.height(6.dp))
        FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            reasons.forEach { r -> SqChip(r, reason == r) { reason = r } }
        }
        Spacer(modifier = Modifier.height(10.dp))
        SqField("Ghi chú (tùy chọn)", note) { note = it.take(255) }
        InlineError(error)
    }
}

@Composable
private fun AdjustStockDialog(busy: Boolean, error: String?, onDismiss: () -> Unit, onConfirm: (Int, String, String?) -> Unit) {
    var add by remember { mutableStateOf(true) }
    var amount by remember { mutableStateOf("") }
    val qty = amount.toIntOrNull()?.takeIf { it > 0 }
    ReasonDialog(
        "Điều chỉnh tồn", "Ghi nhận phần làm thêm, hỏng hoặc bán tại quầy. Tồn còn lại không được âm.", "Lưu",
        ADJUST_REASONS, busy, error, onDismiss, extraValid = qty != null,
        extra = {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                SqChip("+ Thêm", add) { add = true }
                SqChip("− Bớt", !add) { add = false }
            }
            Spacer(modifier = Modifier.height(10.dp))
            SqField("Số lượng", amount, keyboardType = KeyboardType.Number) { amount = it.filter(Char::isDigit).take(3) }
            Spacer(modifier = Modifier.height(10.dp))
        }
    ) { reason, note -> qty?.let { onConfirm(if (add) it else -it, reason, note) } }
}
