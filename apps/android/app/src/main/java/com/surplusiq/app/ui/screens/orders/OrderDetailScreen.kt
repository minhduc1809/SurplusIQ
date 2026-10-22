package com.surplusiq.app.ui.screens.orders

import androidx.compose.foundation.background
import com.surplusiq.app.ui.components.SqCard
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Cancel
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material.icons.filled.Call
import androidx.compose.material.icons.filled.ChatBubbleOutline
import androidx.compose.material.icons.filled.Group
import androidx.compose.material.icons.automirrored.filled.HelpOutline
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.ContentCopy
import androidx.compose.material.icons.filled.Navigation
import androidx.compose.material.icons.filled.Storefront
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.ui.draw.clip
import com.surplusiq.app.ui.theme.AmberLight
import com.surplusiq.app.ui.theme.SkyBlueContainer
import com.surplusiq.app.ui.theme.SurfaceSubtle
import com.surplusiq.app.ui.theme.WarningOnLight
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
import com.surplusiq.app.ui.theme.PrimaryOrange
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
    onOpenHelp: () -> Unit = {},
    onOpenChat: ((ActiveOrder) -> Unit)? = null,
    onOpenReview: ((ActiveOrder) -> Unit)? = null,
    onOpenComplaint: ((ActiveOrder) -> Unit)? = null,
    proxyCode: ProxyCodeResponse? = null,
    isProxyCodeLoading: Boolean = false,
    proxyCodeError: String? = null,
    onLoadProxyCode: ((String) -> Unit)? = null,
    onCreateProxyCode: ((String) -> Unit)? = null,
    onRevokeProxyCode: ((String) -> Unit)? = null,
    // KX02: Đính kèm biên lai chuyển khoản
    onAttachPaymentProof: ((orderId: String, proofUrl: String) -> Unit)? = null,
    // KX04: Gia hạn giờ nhận
    onUpdatePickupSlot: ((orderId: String, newSlotIso: String) -> Unit)? = null,
    onResetActionStates: (() -> Unit)? = null,
    // KX12, KX05, KX18: theo dõi, đổi suất, tặng suất
    onOpenTracking: ((ActiveOrder) -> Unit)? = null,
    onOpenSwap: ((ActiveOrder) -> Unit)? = null,
    onSendGift: ((orderId: String, recipient: String, message: String) -> Unit)? = null,
    isGiftBusy: Boolean = false,
    giftSentCounter: Int = 0,
    // KX02: biên lai là ảnh chụp tải lên hệ thống, không nhập link tự do
    onPickProofImage: ((orderId: String, bytes: ByteArray, fileName: String, mimeType: String) -> Unit)? = null,
    modifier: Modifier = Modifier
) {
    val context = androidx.compose.ui.platform.LocalContext.current
    var showCancelSheet by remember { mutableStateOf(false) }
    var showRevokeDialog by remember { mutableStateOf(false) }
    var showAttachProofDialog by remember { mutableStateOf(false) }
    var showUpdateSlotSheet by remember { mutableStateOf(false) }
    var showGiftDialog by remember { mutableStateOf(false) }
    val giftCounterAtStart = remember { giftSentCounter }
    LaunchedEffect(giftSentCounter) { if (giftSentCounter > giftCounterAtStart) showGiftDialog = false }
    val proofPicker = androidx.activity.compose.rememberLauncherForActivityResult(androidx.activity.result.contract.ActivityResultContracts.GetContent()) { uri: android.net.Uri? ->
        if (uri != null) {
            val bytes = runCatching { context.contentResolver.openInputStream(uri)?.use { it.readBytes() } }.getOrNull()
            if (bytes != null && bytes.isNotEmpty()) onPickProofImage?.invoke(order.id, bytes, "proof_${System.currentTimeMillis()}.jpg", context.contentResolver.getType(uri) ?: "image/jpeg")
        }
    }
    var proofUrlInput by remember { mutableStateOf("") }
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

    val moreItems: List<Pair<String, () -> Unit>> = when (order.status) {
        OrderStatus.PAID_WAITING_PICKUP -> listOf(
"Theo dõi đơn, nhắn cửa hàng, báo sự cố" to { onOpenTracking?.invoke(order) },
                        "Đổi sang suất khác" to { onOpenSwap?.invoke(order) },
                        "Tặng suất cho bạn bè" to { showGiftDialog = true },
                        "Xem biên nhận" to { onOpenReceipt(order) },
                        "Hủy đơn (hoàn 100% trước 60p)" to openCancel
        )
        OrderStatus.PICKED_UP -> listOf(
"Theo dõi đơn và nhắn cửa hàng" to { onOpenTracking?.invoke(order) },
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
        else -> emptyList()
    }
    var showMoreSheet by remember { mutableStateOf(false) }

    LaunchedEffect(order.id) {
        if (order.status == OrderStatus.PAID_WAITING_PICKUP) {
            onLoadProxyCode?.invoke(order.id)
        }
    }

    Column(
        modifier = modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        TopAppBar(
            title = { Text("Chi tiết đơn hàng", fontWeight = FontWeight.Bold, fontSize = 18.sp) },
            navigationIcon = {
                IconButton(onClick = onBackClick) {
                    Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Quay lại")
                }
            },
            actions = {
                if (onOpenChat != null) IconButton(onClick = { onOpenChat(order) }) {
                    Icon(Icons.Default.ChatBubbleOutline, contentDescription = "Nhắn tin với cửa hàng", tint = TextPrimary)
                }
                IconButton(onClick = onOpenHelp) {
                    Icon(Icons.AutoMirrored.Filled.HelpOutline, contentDescription = "Trợ giúp", tint = TextPrimary)
                }
                if (moreItems.isNotEmpty()) IconButton(onClick = { showMoreSheet = true }) {
                    Icon(Icons.Default.MoreVert, contentDescription = "Thêm tùy chọn", tint = TextPrimary)
                }
            }
        )

        Column(
            modifier = Modifier.widthIn(max = 640.dp).fillMaxSize().navigationBarsPadding()
                .padding(16.dp)
                .verticalScroll(rememberScrollState())
        ) {
            OrderHeaderCard(order)

            Spacer(modifier = Modifier.height(12.dp))

            OrderLocationCard(
                order = order,
                onDirections = {
                    com.surplusiq.app.ui.util.NavigationUtil.openMapOrCopyAddress(
                        context = context,
                        storeAddress = order.deal.storeAddress,
                        storeName = order.deal.storeName
                    )
                }
            )

            Spacer(modifier = Modifier.height(12.dp))

            if (order.status == OrderStatus.PAID_WAITING_PICKUP) {
                PickupPassBanner(onClick = { onOpenPickupPass(order) })
                Spacer(modifier = Modifier.height(12.dp))
            }

            if (order.status != OrderStatus.PAID_WAITING_PICKUP) OrderPaymentCard(order)

            Spacer(modifier = Modifier.height(24.dp))

            // Action Buttons
            when (order.status) {
                OrderStatus.PAID_WAITING_PICKUP -> {
                    

                    ProxyPickupCodeSection(
                        order = order,
                        proxyCode = proxyCode,
                        isLoading = isProxyCodeLoading,
                        errorMessage = proxyCodeError,
                        onCreateClick = { onCreateProxyCode?.invoke(order.id) },
                        onRevokeClick = { showRevokeDialog = true }
                    )

                    Spacer(modifier = Modifier.height(12.dp))
                    OrderPaymentCard(order)
                    Spacer(modifier = Modifier.height(12.dp))

                    OutlinedButton(
                        onClick = { showUpdateSlotSheet = true },
                        modifier = Modifier.fillMaxWidth().height(48.dp),
                        shape = RoundedCornerShape(16.dp),
                        colors = ButtonDefaults.outlinedButtonColors(contentColor = PrimaryOrange)
                    ) {
                        Icon(Icons.Default.Schedule, contentDescription = null, modifier = Modifier.size(18.dp))
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(text = "Xin gia hạn giờ nhận hàng (+15p/+30p)", fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
                    }
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

                    Spacer(modifier = Modifier.height(10.dp))

                    TextButton(onClick = { onOpenTracking?.invoke(order) }, modifier = Modifier.fillMaxWidth()) {
                        Text("Theo dõi đơn", color = ForestGreenPrimary)
                    }
                    OutlinedButton(
                        onClick = { showAttachProofDialog = true },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(48.dp),
                        shape = RoundedCornerShape(24.dp),
                        colors = ButtonDefaults.outlinedButtonColors(contentColor = PrimaryOrange)
                    ) {
                        Icon(Icons.Default.Receipt, contentDescription = null, modifier = Modifier.size(18.dp))
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            text = "Đính kèm biên lai chuyển khoản",
                            fontSize = 13.sp,
                            fontWeight = FontWeight.SemiBold
                        )
                    }

                    Spacer(modifier = Modifier.height(10.dp))

                    OutlinedButton(
                        onClick = { showUpdateSlotSheet = true },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(48.dp),
                        shape = RoundedCornerShape(24.dp)
                    ) {
                        Icon(Icons.Default.Schedule, contentDescription = null, modifier = Modifier.size(18.dp))
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            text = "Xin gia hạn giờ nhận hàng",
                            fontSize = 13.sp,
                            fontWeight = FontWeight.SemiBold
                        )
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

                        
                    }
                }

                OrderStatus.CANCELLED, OrderStatus.HOLD_EXPIRED, OrderStatus.PICKUP_EXPIRED, OrderStatus.REFUNDED -> {
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

            if (order.status == OrderStatus.PENDING_PAYMENT || order.status == OrderStatus.PAID_WAITING_PICKUP || order.status == OrderStatus.PICKED_UP) {
                Spacer(modifier = Modifier.height(8.dp))
                OrderFooterLinks(
                    onCall = order.storePhone?.takeIf { it.isNotBlank() }?.let { phone ->
                        {
                            context.startActivity(
                                android.content.Intent(android.content.Intent.ACTION_DIAL, android.net.Uri.parse("tel:" + phone.filter { it.isDigit() || it == '+' }))
                            )
                        }
                    },
                    onFeedback = {
                        if (order.status == OrderStatus.PICKED_UP) onOpenComplaint?.invoke(order) else onOpenTracking?.invoke(order)
                    }
                )
            }
        }
    }

    if (showMoreSheet) {
        ModalBottomSheet(onDismissRequest = { showMoreSheet = false }) {
            Column(Modifier.widthIn(max = 640.dp).fillMaxWidth().padding(horizontal = 20.dp).padding(bottom = 24.dp)) {
                Text("Thêm tùy chọn", fontSize = 18.sp, fontWeight = FontWeight.ExtraBold, color = TextPrimary)
                Spacer(Modifier.height(8.dp))
                moreItems.forEach { (label, action) ->
                    Row(
                        Modifier.fillMaxWidth().clip(RoundedCornerShape(14.dp)).clickable { showMoreSheet = false; action() }.padding(horizontal = 4.dp, vertical = 14.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(label, fontSize = 15.sp, color = TextPrimary, modifier = Modifier.weight(1f))
                        Icon(Icons.Default.ChevronRight, contentDescription = null, tint = TextMuted)
                    }
                    HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.2f))
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
    if (showGiftDialog) {
        com.surplusiq.app.ui.screens.ordersupport.GiftOrderDialog(
            isBusy = isGiftBusy,
            onSend = { recipient, message -> onSendGift?.invoke(order.id, recipient, message) },
            onDismiss = { showGiftDialog = false }
        )
    }
    if (showAttachProofDialog) {
        AlertDialog(
            onDismissRequest = { showAttachProofDialog = false },
            title = { Text("Đính kèm biên lai chuyển khoản", fontWeight = FontWeight.Bold, fontSize = 16.sp) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text(
                        "Nếu bạn đã chuyển khoản nhưng hệ thống ngân hàng chậm báo, hãy gửi ảnh chụp biên lai. Nhóm hỗ trợ SurplusIQ sẽ đối soát với sao kê và kích hoạt đơn khi thấy tiền về.",
                        fontSize = 13.sp,
                        color = TextSecondary
                    )
                    OutlinedButton(
                        onClick = { proofPicker.launch("image/*") },
                        enabled = !ordersState.isAttachingProof && !ordersState.attachProofSuccess,
                        modifier = Modifier.fillMaxWidth()
                    ) { Text("Chọn ảnh biên lai") }
                    if (ordersState.attachProofError != null) {
                        Text(ordersState.attachProofError ?: "", color = CoralRed, fontSize = 12.sp)
                    }
                    if (ordersState.attachProofSuccess) {
                        Text("Đã gửi biên lai thành công!", color = ForestGreenPrimary, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                    }
                }
            },
            confirmButton = {
                if (ordersState.isAttachingProof) CircularProgressIndicator(color = PrimaryOrange, modifier = Modifier.size(20.dp), strokeWidth = 2.dp)
            },
            dismissButton = {
                TextButton(onClick = {
                    showAttachProofDialog = false
                    onResetActionStates?.invoke()
                }) {
                    Text("Đóng")
                }
            }
        )
    }

    if (showUpdateSlotSheet) {
        ModalBottomSheet(onDismissRequest = {
            showUpdateSlotSheet = false
            onResetActionStates?.invoke()
        }) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 20.dp, vertical = 14.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp)
            ) {
                Text(
                    text = "Xin gia hạn giờ hẹn nhận hàng",
                    fontSize = 17.sp,
                    fontWeight = FontWeight.Bold,
                    color = TextPrimary
                )
                Text(
                    text = "Lùi giờ hẹn thêm 15 hoặc 30 phút trong khung mở cửa.",
                    fontSize = 13.sp,
                    color = TextSecondary,
                    lineHeight = 18.sp
                )

                if (ordersState.updatePickupSlotError != null) {
                    Text(ordersState.updatePickupSlotError ?: "", color = CoralRed, fontSize = 12.sp)
                }

                if (ordersState.updatePickupSlotSuccess) {
                    Surface(
                        color = ForestGreenPrimary.copy(alpha = 0.12f),
                        shape = RoundedCornerShape(8.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text(
                            text = "Gia hạn giờ nhận hàng thành công!",
                            color = ForestGreenPrimary,
                            fontWeight = FontWeight.Bold,
                            fontSize = 13.sp,
                            modifier = Modifier.padding(12.dp)
                        )
                    }
                }

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Button(
                        onClick = {
                            val newSlot = java.time.Instant.now().plusSeconds(15 * 60).toString()
                            onUpdatePickupSlot?.invoke(order.id, newSlot)
                        },
                        enabled = !ordersState.isUpdatingPickupSlot,
                        modifier = Modifier.weight(1f).height(48.dp),
                        shape = RoundedCornerShape(12.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = PrimaryOrange)
                    ) {
                        Text("+15 phút", fontWeight = FontWeight.Bold)
                    }

                    Button(
                        onClick = {
                            val newSlot = java.time.Instant.now().plusSeconds(30 * 60).toString()
                            onUpdatePickupSlot?.invoke(order.id, newSlot)
                        },
                        enabled = !ordersState.isUpdatingPickupSlot,
                        modifier = Modifier.weight(1f).height(48.dp),
                        shape = RoundedCornerShape(12.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = ForestGreenPrimary)
                    ) {
                        Text("+30 phút", fontWeight = FontWeight.Bold)
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))
            }
        }
    }

}

private fun proxyStatusLabel(status: String): Pair<String, Color> = when (status) {
    "UNUSED" -> "Chưa dùng" to ForestGreenPrimary
    "USED" -> "Đã dùng" to TextMuted
    "REVOKED" -> "Đã thu hồi" to CoralRed
    else -> status to TextMuted
}

/** K29 - mã nhận hộ 8 ký tự: trạng thái, chia sẻ qua bảng chia sẻ Android, thu hồi. */
@Composable
private fun ProxyPickupCodeSection(
    order: ActiveOrder,
    proxyCode: ProxyCodeResponse?,
    isLoading: Boolean,
    errorMessage: String?,
    onCreateClick: () -> Unit,
    onRevokeClick: () -> Unit
) {
    val context = androidx.compose.ui.platform.LocalContext.current
    SqCard(modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(18.dp)) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text("Mã nhận hộ", fontSize = 16.sp, fontWeight = FontWeight.ExtraBold, color = TextPrimary)
                if (proxyCode != null) {
                    val (statusText, statusColor) = proxyStatusLabel(proxyCode.status)
                    Spacer(Modifier.width(8.dp))
                    Text(
                        statusText,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        color = statusColor,
                        modifier = Modifier.clip(RoundedCornerShape(50)).background(statusColor.copy(alpha = 0.12f)).padding(horizontal = 10.dp, vertical = 3.dp)
                    )
                }
                Spacer(Modifier.weight(1f))
                Icon(Icons.Default.Group, contentDescription = null, tint = TextMuted, modifier = Modifier.size(20.dp))
            }
            Spacer(modifier = Modifier.height(6.dp))
            Text(
                text = "Cho người thân/bạn bè nhận hàng thay bạn. Mã dùng một lần, hết hạn theo khung nhận.",
                fontSize = 12.sp,
                color = TextSecondary,
                lineHeight = 17.sp
            )
            Spacer(modifier = Modifier.height(12.dp))

            if (proxyCode != null) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(14.dp))
                        .background(AmberLight.copy(alpha = 0.6f))
                        .border(1.dp, AmberAccent.copy(alpha = 0.5f), RoundedCornerShape(14.dp))
                        .padding(vertical = 16.dp, horizontal = 12.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text("MÃ XÁC THỰC NHẬN SUẤT", fontSize = 10.sp, fontWeight = FontWeight.Bold, color = TextMuted, letterSpacing = 0.6.sp)
                    Spacer(Modifier.height(6.dp))
                    Text(
                        text = proxyCode.code,
                        fontSize = 30.sp,
                        fontWeight = FontWeight.ExtraBold,
                        letterSpacing = 5.sp,
                        fontFamily = androidx.compose.ui.text.font.FontFamily.Monospace,
                        color = PrimaryOrange,
                        maxLines = 1
                    )
                    Spacer(Modifier.height(6.dp))
                    Text("Đọc hoặc gửi mã này cho nhân viên", fontSize = 11.sp, color = TextSecondary)
                }
                Spacer(modifier = Modifier.height(12.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    Button(
                        onClick = {
                            shareText(
                                context,
                                "Nhờ bạn nhận hộ đơn ${order.orderCode} tại ${order.deal.storeName} " +
                                    "(${order.deal.storeAddress}), khung giờ ${formatPickupWindowText(order.pickupWindow)}. " +
                                    "Đọc mã nhận hộ này cho nhân viên: ${proxyCode.code}"
                            )
                        },
                        enabled = proxyCode.status == "UNUSED",
                        modifier = Modifier.weight(1f).height(46.dp),
                        shape = RoundedCornerShape(14.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = PrimaryOrange)
                    ) {
                        Icon(Icons.Default.Share, contentDescription = null, tint = Color.White, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(text = "Chia sẻ mã", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = Color.White, maxLines = 1)
                    }
                    OutlinedButton(
                        onClick = onRevokeClick,
                        enabled = !isLoading && proxyCode.status == "UNUSED",
                        modifier = Modifier.weight(1f).height(46.dp),
                        shape = RoundedCornerShape(14.dp)
                    ) {
                        Icon(Icons.Default.Replay, contentDescription = null, tint = TextSecondary, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(text = "Thu hồi mã", fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = TextSecondary, maxLines = 1)
                    }
                }
            } else {
                Button(
                    onClick = onCreateClick,
                    enabled = !isLoading,
                    modifier = Modifier.fillMaxWidth().height(46.dp),
                    shape = RoundedCornerShape(14.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = PrimaryOrange)
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


private val StepDone = Color(0xFF292524)

@Composable
private fun OrderHeaderCard(order: ActiveOrder) {
    val clipboard = androidx.compose.ui.platform.LocalClipboardManager.current
    SqCard(modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(18.dp)) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text("MÃ ĐƠN HÀNG", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = TextMuted, letterSpacing = 0.6.sp)
                        Spacer(Modifier.width(6.dp))
                        Icon(
                            Icons.Default.ContentCopy,
                            contentDescription = "Sao chép mã đơn",
                            tint = TextMuted,
                            modifier = Modifier.size(14.dp).clickable { clipboard.setText(androidx.compose.ui.text.AnnotatedString(order.orderCode)) }
                        )
                    }
                    Text(order.orderCode, fontSize = 20.sp, fontWeight = FontWeight.ExtraBold, color = TextPrimary, maxLines = 1)
                }
                OrderStatusBadge(order.status)
            }
            val steps = listOf("Đã đặt suất", "Đã thanh toán", "Đến lấy")
            val current = when (order.status) {
                OrderStatus.PENDING_PAYMENT -> 1
                OrderStatus.PAID_WAITING_PICKUP -> 2
                OrderStatus.PICKED_UP -> 3
                else -> -1
            }
            if (current >= 0) {
                Spacer(Modifier.height(14.dp))
                Row(Modifier.fillMaxWidth().clip(RoundedCornerShape(14.dp)).background(SurfaceSubtle).padding(horizontal = 10.dp, vertical = 8.dp), verticalAlignment = Alignment.CenterVertically) {
                    steps.forEachIndexed { i, label ->
                        val done = i < current
                        val active = i == current
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Box(
                                Modifier.size(22.dp).clip(CircleShape).background(if (done) StepDone else if (active) PrimaryOrange else Color.Transparent)
                                    .border(1.5.dp, if (done || active) Color.Transparent else TextMuted, CircleShape),
                                contentAlignment = Alignment.Center
                            ) {
                                if (done) Icon(Icons.Default.Check, contentDescription = null, tint = Color.White, modifier = Modifier.size(14.dp))
                                else if (active) Box(Modifier.size(7.dp).clip(CircleShape).background(Color.White))
                            }
                            Spacer(Modifier.width(4.dp))
                            Text(label, fontSize = 11.sp, fontWeight = if (active) FontWeight.Bold else FontWeight.Medium, color = if (done || active) TextPrimary else TextMuted, maxLines = 1)
                        }
                        if (i < steps.lastIndex) {
                            Box(Modifier.weight(1f).padding(horizontal = 4.dp).height(2.dp).background(if (done) StepDone else TextMuted.copy(alpha = 0.4f)))
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun OrderLocationCard(order: ActiveOrder, onDirections: () -> Unit) {
    SqCard(modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(18.dp)) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Row(Modifier.weight(1f), verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.Storefront, contentDescription = null, tint = TextMuted, modifier = Modifier.size(16.dp))
                    Spacer(Modifier.width(6.dp))
                    Text("ĐỊA ĐIỂM NHẬN HÀNG", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = TextMuted, letterSpacing = 0.6.sp)
                }
                Row(
                    Modifier.clip(RoundedCornerShape(50)).background(SkyBlueContainer).clickable(onClick = onDirections).padding(horizontal = 10.dp, vertical = 5.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(Icons.Default.Navigation, contentDescription = null, tint = PrimaryOrange, modifier = Modifier.size(14.dp))
                    Spacer(Modifier.width(4.dp))
                    Text("Chỉ đường", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = PrimaryOrange)
                }
            }
            Spacer(Modifier.height(10.dp))
            Text(order.deal.storeName, fontSize = 18.sp, fontWeight = FontWeight.ExtraBold, color = TextPrimary)
            Spacer(Modifier.height(6.dp))
            Row(verticalAlignment = Alignment.Top) {
                Icon(Icons.Default.LocationOn, contentDescription = null, tint = PrimaryOrange, modifier = Modifier.size(16.dp).padding(top = 2.dp))
                Spacer(Modifier.width(6.dp))
                Text(order.deal.storeAddress, fontSize = 13.sp, color = TextSecondary, lineHeight = 18.sp, modifier = Modifier.weight(1f))
            }
            Spacer(Modifier.height(12.dp))
            Row(
                Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp)).background(AmberLight).padding(12.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(Icons.Default.Schedule, contentDescription = null, tint = WarningOnLight, modifier = Modifier.size(20.dp))
                Spacer(Modifier.width(10.dp))
                Column(Modifier.weight(1f)) {
                    Text("KHUNG GIỜ NHẬN ĐỒ", fontSize = 10.sp, fontWeight = FontWeight.Bold, color = WarningOnLight, letterSpacing = 0.5.sp)
                    Text(
                        formatPickupWindowText(order.pickupWindow).ifBlank { "Theo quy định của cửa hàng" },
                        fontSize = 15.sp,
                        fontWeight = FontWeight.ExtraBold,
                        color = TextPrimary
                    )
                }
                val minutesLeft = rememberMinutesUntil(order.pickupEndMillis)
                if (minutesLeft != null && (order.status == OrderStatus.PAID_WAITING_PICKUP || order.status == OrderStatus.PENDING_PAYMENT)) {
                    Text(
                        text = if (minutesLeft >= 60) "Còn ${minutesLeft / 60}h${"%02d".format(minutesLeft % 60)}" else "Còn $minutesLeft phút",
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold,
                        color = WarningOnLight,
                        modifier = Modifier.clip(RoundedCornerShape(50)).background(Color.White).padding(horizontal = 10.dp, vertical = 5.dp)
                    )
                }
            }
        }
    }
}

/** Số phút còn lại đến [endMillis], cập nhật mỗi 30 giây; null khi chưa có mốc hoặc đã qua. */
@Composable
private fun rememberMinutesUntil(endMillis: Long): Int? {
    if (endMillis <= 0L) return null
    val now by produceState(System.currentTimeMillis(), endMillis) {
        while (true) {
            value = System.currentTimeMillis()
            kotlinx.coroutines.delay(30_000)
        }
    }
    val left = ((endMillis - now) / 60_000).toInt()
    return left.takeIf { it > 0 }
}

@Composable
private fun OrderFooterLinks(onCall: (() -> Unit)?, onFeedback: () -> Unit) {
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.Center, verticalAlignment = Alignment.CenterVertically) {
        if (onCall != null) {
            TextButton(onClick = onCall) {
                Icon(Icons.Default.Call, contentDescription = null, tint = TextSecondary, modifier = Modifier.size(16.dp))
                Spacer(Modifier.width(6.dp))
                Text("Gọi quán", fontSize = 13.sp, color = TextSecondary)
            }
            Box(Modifier.size(4.dp).clip(CircleShape).background(TextMuted))
        }
        TextButton(onClick = onFeedback) {
            Icon(Icons.Default.ChatBubbleOutline, contentDescription = null, tint = TextSecondary, modifier = Modifier.size(16.dp))
            Spacer(Modifier.width(6.dp))
            Text("Khiếu nại / Góp ý", fontSize = 13.sp, color = TextSecondary)
        }
    }
}

@Composable
private fun PickupPassBanner(onClick: () -> Unit) {
    Row(
        Modifier.fillMaxWidth().clip(RoundedCornerShape(18.dp))
            .background(androidx.compose.ui.graphics.Brush.horizontalGradient(listOf(PrimaryOrange, Color(0xFFFFA866))))
            .clickable(onClick = onClick).padding(16.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(Modifier.size(44.dp).clip(RoundedCornerShape(12.dp)).background(Color.White.copy(alpha = 0.25f)), contentAlignment = Alignment.Center) {
            Icon(Icons.Default.QrCode2, contentDescription = null, tint = Color.White, modifier = Modifier.size(26.dp))
        }
        Spacer(Modifier.width(12.dp))
        Column(Modifier.weight(1f)) {
            Text("Mở vé nhận hàng (QR & PIN)", fontSize = 15.sp, fontWeight = FontWeight.ExtraBold, color = Color.White)
            Text("Xuất trình cho nhân viên tại quầy", fontSize = 12.sp, color = Color.White.copy(alpha = 0.9f))
        }
        Icon(Icons.Default.ChevronRight, contentDescription = null, tint = Color.White)
    }
}

@Composable
private fun OrderPaymentCard(order: ActiveOrder) {
    SqCard(modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(18.dp)) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text("CHI TIẾT THANH TOÁN", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = TextMuted, letterSpacing = 0.6.sp)
            Spacer(Modifier.height(12.dp))
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.Top) {
                Text(order.deal.title.substringAfter("• "), fontSize = 14.sp, fontWeight = FontWeight.Bold, color = TextPrimary, modifier = Modifier.weight(1f).padding(end = 12.dp))
                Text("(x${order.quantity})", fontSize = 13.sp, color = TextSecondary, maxLines = 1, softWrap = false)
            }
            Text("Số lượng: ${"%02d".format(order.quantity)} suất bảo vệ môi trường", fontSize = 12.sp, color = TextMuted, modifier = Modifier.padding(top = 2.dp))
            val saved = ((order.deal.originalPrice - order.deal.discountPrice) * order.quantity).coerceAtLeast(0)
            if (saved > 0) {
                Spacer(Modifier.height(10.dp))
                PayRow("Tiết kiệm Cứu Món", "-${String.format("%,d", saved)} ₫", valueColor = StepDone)
            }
            Spacer(Modifier.height(6.dp))
            PayRow(
                "Phương thức thanh toán",
                when (order.status) {
                    OrderStatus.PENDING_PAYMENT -> "Chưa thanh toán"
                    OrderStatus.PAID_WAITING_PICKUP, OrderStatus.PICKED_UP -> "Đã thanh toán Online"
                    OrderStatus.REFUNDED -> "Đã hoàn tiền"
                    else -> "Không thu tiền"
                }
            )
            Spacer(Modifier.height(10.dp))
            HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.3f))
            Spacer(Modifier.height(10.dp))
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Text("Tổng thanh toán", fontSize = 15.sp, fontWeight = FontWeight.ExtraBold, color = TextPrimary)
                Text("${String.format("%,d", order.totalPrice)} ₫", fontSize = 20.sp, fontWeight = FontWeight.ExtraBold, color = PrimaryOrange, maxLines = 1, softWrap = false)
            }
            Spacer(Modifier.height(8.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Default.Lock, contentDescription = null, tint = TextMuted, modifier = Modifier.size(12.dp))
                Spacer(Modifier.width(4.dp))
                Text("Giá đã được khóa cố định từ lúc bạn đặt giữ suất.", fontSize = 11.sp, color = TextMuted)
            }
        }
    }
}

@Composable
private fun PayRow(label: String, value: String, valueColor: Color = TextPrimary) {
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
        Text(label, fontSize = 13.sp, color = TextSecondary, modifier = Modifier.weight(1f).padding(end = 12.dp))
        Text(value, fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = valueColor, maxLines = 1, softWrap = false)
    }
}
