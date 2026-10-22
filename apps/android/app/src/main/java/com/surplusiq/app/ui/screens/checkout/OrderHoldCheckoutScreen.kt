package com.surplusiq.app.ui.screens.checkout

import androidx.compose.foundation.background
import com.surplusiq.app.ui.components.SqCard
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.ContentCopy
import androidx.compose.material.icons.filled.ErrorOutline
import androidx.compose.material.icons.filled.QrCode2
import androidx.compose.material.icons.filled.Remove
import androidx.compose.material.icons.filled.Timer
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import coil.compose.AsyncImage
import com.surplusiq.app.domain.model.ActiveOrder
import com.surplusiq.app.domain.model.Deal
import com.surplusiq.app.domain.model.PaymentInfo
import com.surplusiq.app.ui.theme.CoralRed
import com.surplusiq.app.ui.theme.ForestGreenDark
import com.surplusiq.app.ui.theme.ForestGreenPrimary
import com.surplusiq.app.ui.theme.TextMuted
import com.surplusiq.app.ui.theme.TextPrimary
import com.surplusiq.app.ui.theme.TextSecondary
import com.surplusiq.app.data.remote.dto.PromotionDto
import com.surplusiq.app.ui.viewmodel.OrderHoldCheckoutViewModel
import com.surplusiq.app.ui.viewmodel.PaymentUiState
import com.surplusiq.app.ui.viewmodel.PromotionWalletViewModel
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.LocalOffer
import androidx.compose.foundation.clickable

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun OrderHoldCheckoutScreen(
    deal: Deal,
    onBackClick: () -> Unit,
    onPaymentSuccess: (ActiveOrder) -> Unit,
    modifier: Modifier = Modifier,
    onBrowseDeals: () -> Unit = onBackClick,
    viewModel: OrderHoldCheckoutViewModel = hiltViewModel(),
    walletViewModel: PromotionWalletViewModel = hiltViewModel()
) {
    val state by viewModel.uiState.collectAsState()
    val walletState by walletViewModel.uiState.collectAsState()
    var quantity by remember { mutableStateOf(1) }
    var orderNote by remember { mutableStateOf("") }
    var selectedPromo by remember { mutableStateOf<PromotionDto?>(null) }
    var showPromoSheet by remember { mutableStateOf(false) }
    val maxQuantity = minOf(5, deal.remainingStock)
    LaunchedEffect(deal.id) { viewModel.startFor(deal.id) }
    val holdOrder = {
        viewModel.initializeHoldOrder(deal, quantity, orderNote.ifBlank { null }, selectedPromo?.id)
    }

    Column(
        modifier = modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
    ) {
        TopAppBar(
            title = {
                Text(text = "Giữ suất & Thanh toán", fontWeight = FontWeight.Bold, fontSize = 18.sp)
            },
            navigationIcon = {
                IconButton(onClick = onBackClick) {
                    Icon(imageVector = Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Quay lại")
                }
            },
            colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.surface)
        )

        Column(
            modifier = Modifier.fillMaxSize().wrapContentWidth(androidx.compose.ui.Alignment.CenterHorizontally).widthIn(max = 640.dp).fillMaxWidth().navigationBarsPadding()
                .verticalScroll(rememberScrollState())
                .padding(16.dp)
        ) {
            when {
                state.activeOrder == null && state.isHolding -> HoldingLoadingCard()

                state.activeOrder == null && state.holdErrorMessage != null -> HoldErrorCard(
                    message = state.holdErrorMessage!!,
                    onRetry = holdOrder
                )

                state.activeOrder == null -> OrderSetupSection(
                    deal = deal,
                    quantity = quantity,
                    maxQuantity = maxQuantity,
                    orderNote = orderNote,
                    selectedPromo = selectedPromo,
                    onQuantityChange = { quantity = it },
                    onNoteChange = { orderNote = it },
                    onOpenPromotions = {
                        walletViewModel.load()
                        showPromoSheet = true
                    },
                    onConfirm = holdOrder
                )

                state.paymentResult != null -> PaymentResultContent(
                    result = state.paymentResult!!,
                    orderCode = state.activeOrder!!.orderCode,
                    amount = state.activeOrder!!.totalPrice.toLong(),
                    isChecking = state.payment is PaymentUiState.Checking,
                    onViewPickupQr = { onPaymentSuccess(state.activeOrder!!) },
                    onRecheck = viewModel::recheckPayment,
                    onBackToQr = viewModel::dismissPendingResult,
                    onBrowseDeals = onBrowseDeals
                )

                else -> PaymentSection(
                    order = state.activeOrder!!,
                    remainingSeconds = state.remainingSeconds,
                    payment = state.payment,
                    onRecheck = viewModel::recheckPayment,
                    onRetryPayment = viewModel::retryCreatePayment
                )
            }
        }
    }

    if (showPromoSheet) {
        ModalBottomSheet(onDismissRequest = { showPromoSheet = false }) {
            PromotionPickerSheet(
                state = walletState,
                storeId = deal.storeId,
                subtotal = deal.discountPrice * quantity,
                initialSelectedId = selectedPromo?.id,
                onClaim = walletViewModel::claim,
                onRetry = walletViewModel::load,
                onConfirm = { promo ->
                    selectedPromo = promo
                    showPromoSheet = false
                }
            )
        }
    }
}

@Composable
private fun HoldingLoadingCard() {
    Column(
        modifier = Modifier.fillMaxWidth().padding(top = 48.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        CircularProgressIndicator(color = ForestGreenPrimary)
        Spacer(modifier = Modifier.height(16.dp))
        Text(text = "Đang giữ suất cho bạn…", fontSize = 14.sp, color = TextSecondary)
    }
}

@Composable
private fun HoldErrorCard(message: String, onRetry: () -> Unit) {
    Column(
        modifier = Modifier.fillMaxWidth().padding(top = 32.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Icon(Icons.Default.ErrorOutline, contentDescription = null, tint = CoralRed, modifier = Modifier.size(32.dp))
        Spacer(modifier = Modifier.height(12.dp))
        Text(text = message, fontSize = 14.sp, color = TextPrimary, textAlign = TextAlign.Center)
        Spacer(modifier = Modifier.height(16.dp))
        Button(onClick = onRetry, colors = ButtonDefaults.buttonColors(containerColor = ForestGreenPrimary)) {
            Text("Thử lại")
        }
    }
}

@Composable
private fun OrderSetupSection(
    deal: Deal,
    quantity: Int,
    maxQuantity: Int,
    orderNote: String,
    selectedPromo: PromotionDto?,
    onQuantityChange: (Int) -> Unit,
    onNoteChange: (String) -> Unit,
    onOpenPromotions: () -> Unit,
    onConfirm: () -> Unit
) {
    val subtotal = deal.discountPrice * quantity
    val discount = selectedPromo?.let { promotionDiscount(it, subtotal) } ?: 0
    val totalAmount = subtotal - discount

    SqCard(
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(text = deal.storeName, fontSize = 15.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
            Text(text = deal.title, fontSize = 13.sp, color = TextSecondary)
            Spacer(modifier = Modifier.height(6.dp))
            Text(
                text = "Khung giờ nhận: ${deal.pickupWindowText}",
                fontSize = 12.sp,
                fontWeight = FontWeight.SemiBold,
                color = CoralRed
            )

            HorizontalDivider(
                modifier = Modifier.padding(vertical = 12.dp),
                color = MaterialTheme.colorScheme.outline.copy(alpha = 0.2f)
            )

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text(text = "Số lượng suất", fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
                    Text(
                        text = "Tối đa $maxQuantity suất (còn tồn ${deal.remainingStock})",
                        fontSize = 12.sp,
                        color = TextMuted
                    )
                }

                Row(verticalAlignment = Alignment.CenterVertically) {
                    IconButton(
                        onClick = { if (quantity > 1) onQuantityChange(quantity - 1) },
                        enabled = quantity > 1,
                        modifier = Modifier.size(36.dp).clip(CircleShape)
                            .background(MaterialTheme.colorScheme.surfaceVariant)
                    ) {
                        Icon(Icons.Default.Remove, contentDescription = "Giảm", modifier = Modifier.size(16.dp))
                    }
                    Text(
                        text = "$quantity",
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.padding(horizontal = 14.dp)
                    )
                    IconButton(
                        onClick = { if (quantity < maxQuantity) onQuantityChange(quantity + 1) },
                        enabled = quantity < maxQuantity,
                        modifier = Modifier.size(36.dp).clip(CircleShape)
                            .background(MaterialTheme.colorScheme.surfaceVariant)
                    ) {
                        Icon(Icons.Default.Add, contentDescription = "Tăng", modifier = Modifier.size(16.dp))
                    }
                }
            }

            Spacer(modifier = Modifier.height(14.dp))

            OutlinedTextField(
                value = orderNote,
                onValueChange = { if (it.length <= 150) onNoteChange(it) },
                label = { Text("Ghi chú cho tiệm (tùy chọn)") },
                placeholder = { Text("Ví dụ: để riêng nước sốt hoặc bánh ngọt...") },
                modifier = Modifier.fillMaxWidth(),
                maxLines = 2,
                shape = RoundedCornerShape(10.dp)
            )

            HorizontalDivider(
                modifier = Modifier.padding(vertical = 12.dp),
                color = MaterialTheme.colorScheme.outline.copy(alpha = 0.2f)
            )

            // K23 - mở sheet "Chọn ưu đãi"; giảm giá cuối cùng do backend tính khi giữ suất.
            Row(
                modifier = Modifier.fillMaxWidth().clickable(onClick = onOpenPromotions).padding(vertical = 4.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(Icons.Default.LocalOffer, contentDescription = null, tint = ForestGreenPrimary, modifier = Modifier.size(20.dp))
                Spacer(modifier = Modifier.width(10.dp))
                Column(modifier = Modifier.weight(1f)) {
                    Text("Ưu đãi", fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
                    Text(
                        text = selectedPromo?.let { "${it.name} • -${String.format("%,d", discount)} ₫ (ước tính)" }
                            ?: "Chọn hoặc nhập mã ưu đãi",
                        fontSize = 12.sp,
                        color = if (selectedPromo != null) ForestGreenPrimary else TextMuted
                    )
                }
                Icon(Icons.Default.ChevronRight, contentDescription = null, tint = TextMuted)
            }
        }
    }

    Spacer(modifier = Modifier.height(20.dp))

    Button(
        onClick = onConfirm,
        modifier = Modifier.fillMaxWidth().height(52.dp),
        shape = RoundedCornerShape(26.dp),
        colors = ButtonDefaults.buttonColors(containerColor = ForestGreenPrimary)
    ) {
        Text(
            text = "Giữ suất • ${String.format("%,d", totalAmount)} ₫",
            fontSize = 15.sp,
            fontWeight = FontWeight.Bold,
            color = Color.White
        )
    }
}

@Composable
private fun PaymentSection(
    order: ActiveOrder,
    remainingSeconds: Long,
    payment: PaymentUiState,
    onRecheck: () -> Unit,
    onRetryPayment: () -> Unit
) {
    val minutes = remainingSeconds / 60
    val seconds = remainingSeconds % 60
    val formattedTime = "%02d:%02d".format(minutes, seconds)

    // Banner giữ suất (R1-040, BR-017)
    SqCard(
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(
            containerColor = if (remainingSeconds < 120) CoralRed.copy(alpha = 0.1f) else ForestGreenPrimary.copy(alpha = 0.1f)
        ),
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(modifier = Modifier.padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
            Icon(
                imageVector = Icons.Default.Timer,
                contentDescription = null,
                tint = if (remainingSeconds < 120) CoralRed else ForestGreenPrimary,
                modifier = Modifier.size(24.dp)
            )
            Spacer(modifier = Modifier.width(12.dp))
            Column {
                Text(
                    text = "Đang giữ suất cho bạn: $formattedTime",
                    fontWeight = FontWeight.Bold,
                    fontSize = 15.sp,
                    color = if (remainingSeconds < 120) CoralRed else ForestGreenPrimary
                )
                Text(
                    text = "Mã đơn ${order.orderCode} • Giá đã khóa cố định",
                    fontSize = 12.sp,
                    color = TextSecondary
                )
            }
        }
    }

    Spacer(modifier = Modifier.height(16.dp))

    when (payment) {
        is PaymentUiState.Idle, is PaymentUiState.Creating -> PaymentCreatingCard()
        is PaymentUiState.Failed -> PaymentFailedCard(message = payment.message, onRetry = onRetryPayment)
        is PaymentUiState.Pending -> VietQrCard(info = payment.info, isChecking = false, onRecheck = onRecheck)
        is PaymentUiState.Checking -> VietQrCard(info = payment.info, isChecking = true, onRecheck = onRecheck)
    }
}

@Composable
private fun PaymentCreatingCard() {
    SqCard(
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(
            modifier = Modifier.padding(24.dp).fillMaxWidth(),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            CircularProgressIndicator(color = ForestGreenPrimary, modifier = Modifier.size(28.dp))
            Spacer(modifier = Modifier.height(10.dp))
            Text(text = "Đang khởi tạo mã thanh toán…", fontSize = 13.sp, color = TextSecondary)
        }
    }
}

@Composable
private fun PaymentFailedCard(message: String, onRetry: () -> Unit) {
    SqCard(
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(
            modifier = Modifier.padding(20.dp).fillMaxWidth(),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Icon(Icons.Default.ErrorOutline, contentDescription = null, tint = CoralRed, modifier = Modifier.size(28.dp))
            Spacer(modifier = Modifier.height(8.dp))
            Text(text = message, fontSize = 13.sp, color = TextPrimary, textAlign = TextAlign.Center)
            Spacer(modifier = Modifier.height(12.dp))
            OutlinedButton(onClick = onRetry) { Text("Thử lại") }
        }
    }
}

@Composable
private fun VietQrCard(info: PaymentInfo, isChecking: Boolean, onRecheck: () -> Unit) {
    val clipboard = LocalClipboardManager.current

    SqCard(
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(modifier = Modifier.padding(16.dp), horizontalAlignment = Alignment.CenterHorizontally) {
            Text(
                text = "Thanh toán qua VietQR Cứu Món",
                fontSize = 15.sp,
                fontWeight = FontWeight.Bold,
                color = TextPrimary
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = "Quét mã để chuyển khoản. Thanh toán của bạn đang ở trạng thái Đang chờ xác nhận.",
                fontSize = 12.sp,
                color = TextSecondary,
                textAlign = TextAlign.Center
            )

            Spacer(modifier = Modifier.height(14.dp))

            Box(
                modifier = Modifier
                    .size(180.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(Color.White)
                    .border(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.3f), RoundedCornerShape(12.dp)),
                contentAlignment = Alignment.Center
            ) {
                if (info.qrUrl.isNotBlank()) {
                    AsyncImage(
                        model = info.qrUrl,
                        contentDescription = "Mã VietQR",
                        modifier = Modifier.size(168.dp)
                    )
                } else {
                    Icon(
                        imageVector = Icons.Default.QrCode2,
                        contentDescription = "Mã VietQR",
                        tint = Color.Black,
                        modifier = Modifier.size(140.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            InfoRow(label = "Ngân hàng", value = info.bankName)
            InfoRow(label = "Số tài khoản", value = info.bankAccount, copyable = true, clipboard = clipboard)
            InfoRow(label = "Nội dung CK", value = info.transferSyntax, copyable = true, clipboard = clipboard)

            Spacer(modifier = Modifier.height(8.dp))

            Text(
                text = "Tổng thanh toán: ${String.format("%,d", info.amount)} ₫",
                fontSize = 18.sp,
                fontWeight = FontWeight.ExtraBold,
                color = TextPrimary
            )

            Spacer(modifier = Modifier.height(16.dp))

            Button(
                onClick = onRecheck,
                enabled = !isChecking,
                modifier = Modifier.fillMaxWidth().height(50.dp),
                shape = RoundedCornerShape(25.dp),
                colors = ButtonDefaults.buttonColors(containerColor = ForestGreenPrimary)
            ) {
                if (isChecking) {
                    CircularProgressIndicator(
                        color = Color.White,
                        strokeWidth = 2.dp,
                        modifier = Modifier.size(18.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Đang kiểm tra…", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = Color.White)
                } else {
                    Text(
                        "Tôi đã chuyển tiền, kiểm tra lại",
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.White
                    )
                }
            }

            Text(
                text = "Chưa xác định được kết quả thanh toán? Bạn có thể kiểm tra lại, không cần thanh toán lần nữa.",
                fontSize = 11.sp,
                color = TextMuted,
                textAlign = TextAlign.Center,
                modifier = Modifier.padding(top = 8.dp)
            )
        }
    }
}

@Composable
private fun InfoRow(
    label: String,
    value: String,
    copyable: Boolean = false,
    clipboard: androidx.compose.ui.platform.ClipboardManager? = null
) {
    Row(
        modifier = Modifier.fillMaxWidth().padding(vertical = 3.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(text = label, fontSize = 12.sp, color = TextMuted)
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(text = value, fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = ForestGreenDark)
            if (copyable && clipboard != null) {
                IconButton(
                    onClick = { clipboard.setText(AnnotatedString(value)) },
                    modifier = Modifier.size(28.dp).padding(start = 2.dp)
                ) {
                    Icon(Icons.Default.ContentCopy, contentDescription = "Sao chép", modifier = Modifier.size(14.dp))
                }
            }
        }
    }
}
