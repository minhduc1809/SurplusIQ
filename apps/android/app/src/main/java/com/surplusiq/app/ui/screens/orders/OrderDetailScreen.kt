package com.surplusiq.app.ui.screens.orders

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Cancel
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.QrCode2
import androidx.compose.material.icons.filled.Schedule
import androidx.compose.material.icons.filled.Flag
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.MoreHoriz
import androidx.compose.material.icons.filled.Receipt
import androidx.compose.material.icons.filled.Replay
import androidx.compose.material.icons.filled.ReportProblem
import androidx.compose.material.icons.filled.Share
import androidx.compose.material.icons.filled.Star
import com.surplusiq.app.ui.components.StatusChip
import com.surplusiq.app.ui.util.shareText
import com.surplusiq.app.ui.viewmodel.MyOrdersUiState
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.surplusiq.app.data.remote.dto.ProxyCodeResponse
import com.surplusiq.app.domain.model.ActiveOrder
import com.surplusiq.app.domain.model.OrderStatus
import com.surplusiq.app.ui.theme.AmberAccent
import com.surplusiq.app.ui.theme.CoralRed
import com.surplusiq.app.ui.theme.ForestGreenDark
import com.surplusiq.app.ui.theme.ForestGreenPrimary
import com.surplusiq.app.ui.theme.TextMuted
import com.surplusiq.app.ui.theme.TextPrimary
import com.surplusiq.app.ui.theme.TextSecondary

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun OrderDetailScreen(
    order: ActiveOrder,
    onBackClick: () -> Unit,
    onOpenPickupPass: (ActiveOrder) -> Unit,
    onResumePayment: (ActiveOrder) -> Unit,
    ordersState: MyOrdersUiState,
    onPrepareCancel: (String) -> Unit,
    onConfirmCancel: (orderId: String, reason: String) -> Unit,
    onOpenReceipt: (ActiveOrder) -> Unit,
    onOpenReorder: (ActiveOrder) -> Unit,
    onOpenReport: (ActiveOrder) -> Unit,
    onOpenReview: ((ActiveOrder) -> Unit)? = null,
    onOpenComplaint: ((ActiveOrder) -> Unit)? = null,
    proxyCode: ProxyCodeResponse? = null,
    isProxyCodeLoading: Boolean = false,
    proxyCodeError: String? = null,
    onLoadProxyCode: ((String) -> Unit)? = null,
    onCreateProxyCode: ((String) -> Unit)? = null,
    onRevokeProxyCode: ((String) -> Unit)? = null,
    modifier: Modifier = Modifier
) {
    val context = androidx.compose.ui.platform.LocalContext.current
    var showCancelSheet by remember { mutableStateOf(false) }
    var showRevokeDialog by remember { mutableStateOf(false) }
    val openCancel = {
        onPrepareCancel(order.id)
        showCancelSheet = true
    }

    // Hủy thành công thật (server xác nhận) -> đóng sheet, quay lại danh sách đơn.
    LaunchedEffect(ordersState.cancelledOrderId) {
        if (showCancelSheet && ordersState.cancelledOrderId == order.id) {
            showCancelSheet = false
            onBackClick()
        }
    }

    LaunchedEffect(order.id) {
        if (order.status == OrderStatus.PAID_WAITING_PICKUP) {
            onLoadProxyCode?.invoke(order.id)
        }
    }

    Column(
        modifier = modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
    ) {
        TopAppBar(
            title = { Text("Chi tiết đơn hàng", fontWeight = FontWeight.Bold, fontSize = 18.sp) },
            navigationIcon = {
                IconButton(onClick = onBackClick) {
                    Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                }
            }
        )

        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(16.dp)
                .verticalScroll(rememberScrollState())
        ) {
            // Order Code & Status Header Card
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text(text = "MÃ ĐƠN HÀNG", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = TextMuted)
                            Text(text = order.orderCode, fontSize = 18.sp, fontWeight = FontWeight.ExtraBold, color = TextPrimary)
                        }
                        OrderStatusBadge(order.status)
                    }
                }
            }

            Spacer(modifier = Modifier.height(14.dp))

            // Store Info Card
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text(text = "Địa điểm nhận hàng", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = TextSecondary)
                    Spacer(modifier = Modifier.height(6.dp))
                    Text(text = order.deal.storeName, fontSize = 16.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                    Spacer(modifier = Modifier.height(4.dp))
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.LocationOn, contentDescription = null, tint = ForestGreenPrimary, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(text = order.deal.storeAddress, fontSize = 13.sp, color = TextSecondary)
                    }
                    Spacer(modifier = Modifier.height(8.dp))
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.Schedule, contentDescription = null, tint = ForestGreenPrimary, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(text = "Khung giờ: ${order.pickupWindow}", fontSize = 13.sp, color = TextSecondary)
                    }
                }
            }

            Spacer(modifier = Modifier.height(14.dp))

            // Invoice Breakdown Card
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text(text = "Chi tiết thanh toán", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = TextSecondary)
                    Spacer(modifier = Modifier.height(10.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text(text = "${order.deal.title} (x${order.quantity})", fontSize = 14.sp, color = TextPrimary)
                        Text(text = "${String.format("%,d", order.unitPrice * order.quantity)} ₫", fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
                    }

                    Spacer(modifier = Modifier.height(6.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text(text = "Tiết kiệm Cứu Món", fontSize = 13.sp, color = ForestGreenPrimary)
                        Text(text = "-${String.format("%,d", (order.deal.originalPrice - order.deal.discountPrice) * order.quantity)} ₫", fontSize = 13.sp, color = ForestGreenPrimary, fontWeight = FontWeight.SemiBold)
                    }

                    Spacer(modifier = Modifier.height(10.dp))
                    HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.15f))
                    Spacer(modifier = Modifier.height(10.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(text = "Tổng thanh toán", fontSize = 15.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                        Text(text = "${String.format("%,d", order.totalPrice)} ₫", fontSize = 18.sp, fontWeight = FontWeight.ExtraBold, color = ForestGreenPrimary)
                    }

                    Spacer(modifier = Modifier.height(6.dp))
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.Lock, contentDescription = null, tint = TextMuted, modifier = Modifier.size(12.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            text = "Giá đã được khóa cố định theo điều khoản BR-016.",
                            fontSize = 11.sp,
                            color = TextMuted
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(24.dp))

            // Action Buttons
            when (order.status) {
                OrderStatus.PAID_WAITING_PICKUP -> {
                    Button(
                        onClick = { onOpenPickupPass(order) },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(50.dp),
                        shape = RoundedCornerShape(25.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = ForestGreenPrimary)
                    ) {
                        Icon(Icons.Default.QrCode2, contentDescription = null, tint = Color.White, modifier = Modifier.size(20.dp))
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(text = "Mở vé nhận hàng (QR & PIN)", fontSize = 15.sp, fontWeight = FontWeight.Bold, color = Color.White)
                    }

                    MoreActions(
                        "Xem biên nhận" to { onOpenReceipt(order) },
                        "Hủy đơn (hoàn 100% trước 60p)" to openCancel
                    )

                    Spacer(modifier = Modifier.height(10.dp))

                    ProxyPickupCodeSection(
                        order = order,
                        proxyCode = proxyCode,
                        isLoading = isProxyCodeLoading,
                        errorMessage = proxyCodeError,
                        onCreateClick = { onCreateProxyCode?.invoke(order.id) },
                        onRevokeClick = { showRevokeDialog = true }
                    )
                }

                OrderStatus.PENDING_PAYMENT -> {
                    Button(
                        onClick = { onResumePayment(order) },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(50.dp),
                        shape = RoundedCornerShape(25.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = AmberAccent)
                    ) {
                        Text(text = "Tiếp tục thanh toán VietQR", fontSize = 15.sp, fontWeight = FontWeight.Bold, color = Color.Black)
                    }

                    Spacer(modifier = Modifier.height(12.dp))

                    TextButton(
                        onClick = openCancel,
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text(text = "Hủy giữ suất", color = TextMuted, fontSize = 13.sp)
                    }
                }

                OrderStatus.PICKED_UP -> {
                    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        Button(
                            onClick = { onOpenReview?.invoke(order) },
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(50.dp),
                            shape = RoundedCornerShape(25.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = ForestGreenPrimary)
                        ) {
                            Icon(Icons.Default.Star, contentDescription = null, tint = Color.White, modifier = Modifier.size(18.dp))
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(text = "Đánh giá cửa hàng", fontSize = 14.sp, fontWeight = FontWeight.Bold)
                        }

                        OutlinedButton(
                            onClick = { onOpenReorder(order) },
                            modifier = Modifier.fillMaxWidth().height(48.dp),
                            shape = RoundedCornerShape(24.dp)
                        ) {
                            Icon(Icons.Default.Replay, contentDescription = null, modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(text = "Đặt lại món này", fontSize = 14.sp)
                        }

                        MoreActions(
                            "Khiếu nại chất lượng (trong 24h)" to { onOpenComplaint?.invoke(order) },
                            "Xem biên nhận" to { onOpenReceipt(order) },
                            "Chỉ đường đến quán" to {
                                com.surplusiq.app.ui.util.NavigationUtil.openMapOrCopyAddress(
                                    context = context,
                                    storeAddress = order.deal.storeAddress,
                                    storeName = order.deal.storeName
                                )
                            },
                            "Báo cáo vi phạm" to { onOpenReport(order) }
                        )
                    }
                }

                OrderStatus.CANCELLED, OrderStatus.EXPIRED -> {
                    OutlinedButton(
                        onClick = { onOpenReorder(order) },
                        modifier = Modifier.fillMaxWidth().height(48.dp),
                        shape = RoundedCornerShape(24.dp)
                    ) {
                        Icon(Icons.Default.Replay, contentDescription = null, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(text = "Đặt lại món này", fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
                    }
                }
            }
        }
    }

    if (showCancelSheet) {
        ModalBottomSheet(onDismissRequest = { showCancelSheet = false }) {
            CancelOrderSheet(
                order = order,
                state = ordersState,
                onConfirm = { reason -> onConfirmCancel(order.id, reason) },
                onDismiss = { showCancelSheet = false }
            )
        }
    }

    if (showRevokeDialog) {
        AlertDialog(
            onDismissRequest = { showRevokeDialog = false },
            title = { Text("Thu hồi mã nhận hộ") },
            text = { Text("Mã nhận hộ hiện tại sẽ không còn sử dụng được. Bạn có thể tạo mã mới sau nếu cần.") },
            confirmButton = {
                TextButton(
                    onClick = {
                        showRevokeDialog = false
                        onRevokeProxyCode?.invoke(order.id)
                    }
                ) {
                    Text("Thu hồi", color = CoralRed, fontWeight = FontWeight.Bold)
                }
            },
            dismissButton = {
                TextButton(onClick = { showRevokeDialog = false }) {
                    Text("Đóng")
                }
            }
        )
    }
}

private fun proxyStatusLabel(status: String): Pair<String, Color> = when (status) {
    "UNUSED" -> "Chưa dùng" to ForestGreenPrimary
    "USED" -> "Đã dùng" to TextMuted
    "REVOKED" -> "Đã thu hồi" to CoralRed
    else -> status to TextMuted
}

/** K29 - mã nhận hộ 8 ký tự (R1-052): trạng thái, chia sẻ qua bảng chia sẻ Android, thu hồi. */
@Composable
private fun ProxyPickupCodeSection(
    order: ActiveOrder,
    proxyCode: ProxyCodeResponse?,
    isLoading: Boolean,
    errorMessage: String?,
    onCreateClick: () -> Unit,
    onRevokeClick: () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(text = "Mã nhận hộ (R1-052)", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = TextSecondary)
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = "Cho người thân/bạn bè nhận hàng thay bạn. Mã dùng một lần, hết hạn theo khung nhận.",
                fontSize = 12.sp,
                color = TextMuted
            )
            Spacer(modifier = Modifier.height(10.dp))

            if (proxyCode != null) {
                val (statusText, statusColor) = proxyStatusLabel(proxyCode.status)
                StatusChip(statusText, statusColor)
                Spacer(modifier = Modifier.height(8.dp))
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(ForestGreenPrimary.copy(alpha = 0.08f), RoundedCornerShape(12.dp))
                        .padding(vertical = 16.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = proxyCode.code,
                        fontSize = 32.sp,
                        fontWeight = FontWeight.ExtraBold,
                        letterSpacing = 4.sp,
                        fontFamily = androidx.compose.ui.text.font.FontFamily.Monospace,
                        color = ForestGreenDark
                    )
                }
                Spacer(modifier = Modifier.height(10.dp))
                val context = androidx.compose.ui.platform.LocalContext.current
                Button(
                    onClick = {
                        shareText(
                            context,
                            "Nhờ bạn nhận hộ đơn ${order.orderCode} tại ${order.deal.storeName} " +
                                "(${order.deal.storeAddress}), khung giờ ${order.pickupWindow}. " +
                                "Đọc mã nhận hộ này cho nhân viên: ${proxyCode.code}"
                        )
                    },
                    enabled = proxyCode.status == "UNUSED",
                    modifier = Modifier.fillMaxWidth().height(44.dp),
                    shape = RoundedCornerShape(22.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = ForestGreenPrimary)
                ) {
                    Icon(Icons.Default.Share, contentDescription = null, tint = Color.White, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(text = "Chia sẻ mã", fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = Color.White)
                }
                Spacer(modifier = Modifier.height(8.dp))
                OutlinedButton(
                    onClick = onRevokeClick,
                    enabled = !isLoading && proxyCode.status == "UNUSED",
                    modifier = Modifier.fillMaxWidth().height(44.dp),
                    shape = RoundedCornerShape(22.dp),
                    colors = ButtonDefaults.outlinedButtonColors(contentColor = CoralRed)
                ) {
                    Text(text = "Thu hồi mã", fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = CoralRed)
                }
            } else {
                Button(
                    onClick = onCreateClick,
                    enabled = !isLoading,
                    modifier = Modifier.fillMaxWidth().height(46.dp),
                    shape = RoundedCornerShape(23.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = ForestGreenPrimary)
                ) {
                    if (isLoading) {
                        CircularProgressIndicator(modifier = Modifier.size(18.dp), color = Color.White, strokeWidth = 2.dp)
                    } else {
                        Text(text = "Tạo mã nhận hộ cho người khác", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = Color.White)
                    }
                }
            }

            if (errorMessage != null) {
                Spacer(modifier = Modifier.height(8.dp))
                Text(text = errorMessage, fontSize = 12.sp, color = CoralRed)
            }
        }
    }
}

@Composable
private fun MoreActions(vararg actions: Pair<String, () -> Unit>) {
    var open by remember { mutableStateOf(false) }
    Box(modifier = Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
        TextButton(onClick = { open = true }) {
            Icon(Icons.Default.MoreHoriz, contentDescription = null, modifier = Modifier.size(18.dp))
            Spacer(modifier = Modifier.width(6.dp))
            Text("Thêm tùy chọn", fontSize = 13.sp)
        }
        DropdownMenu(expanded = open, onDismissRequest = { open = false }) {
            actions.forEach { (label, action) ->
                DropdownMenuItem(text = { Text(label) }, onClick = { open = false; action() })
            }
        }
    }
}
