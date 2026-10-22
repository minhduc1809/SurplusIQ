package com.surplusiq.app.ui.screens.pool

import androidx.compose.foundation.background
import com.surplusiq.app.ui.components.SqCard
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.ReceiptLong
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Groups
import androidx.compose.material.icons.filled.Storefront
import androidx.compose.material.icons.filled.Timer
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.surplusiq.app.domain.model.RescuePool
import com.surplusiq.app.ui.theme.*

/**
 * Màn hình "Nhu cầu của tôi" (KC08):
 * - 2 tab:
 *   + Tab 1: "Nhu cầu đang chờ gom" (xanh nhạt, có nút Sửa & Rút nhu cầu)
 *   + Tab 2: "Đơn hàng từ đợt gom" (xanh đậm, liên kết sang chi tiết đơn)
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MyRescueDemandsScreen(
    pools: List<RescuePool>,
    isLoading: Boolean,
    errorMessage: String?,
    actionMessage: String?,
    actionError: String?,
    isSubmitting: Boolean,
    onBackClick: () -> Unit,
    onRetry: () -> Unit,
    onOpenPoolDetail: (String) -> Unit,
    onOpenOrderDetail: (String) -> Unit,
    onUpdateDemand: (poolId: String, quantity: Int, budgetMax: Int?, start: String?, end: String?) -> Unit,
    onWithdrawDemand: (poolId: String, reason: String) -> Unit,
    onExplorePoolsClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    var selectedTab by remember { mutableIntStateOf(0) }

    // Phân loại nhu cầu
    val waitingDemands = remember(pools) {
        pools.filter { pool ->
            pool.myRegistration != null && pool.myRegistration.status == "ACTIVE"
        }
    }

    val orderedDemands = remember(pools) {
        pools.filter { pool ->
            pool.myRegistration != null && (pool.myRegistration.status == "ORDERED" || !pool.myRegistration.linkedOrderId.isNullOrBlank())
        }
    }

    // State cho Dialog Sửa nhu cầu
    var poolToEdit by remember { mutableStateOf<RescuePool?>(null) }
    // State cho Dialog Rút nhu cầu
    var poolToWithdraw by remember { mutableStateOf<RescuePool?>(null) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        text = "Nhu cầu của tôi",
                        fontWeight = FontWeight.Bold,
                        fontSize = 17.sp,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                },
                navigationIcon = {
                    IconButton(onClick = onBackClick) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = "Quay lại"
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.background
                )
            )
        },
        modifier = modifier
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
        ) {
            // Thông báo thao tác nếu có
            if (actionMessage != null) {
                Surface(
                    color = ForestGreenPrimary.copy(alpha = 0.12f),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text(
                        text = actionMessage,
                        color = ForestGreenPrimary,
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Medium,
                        modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)
                    )
                }
            }
            if (actionError != null) {
                Surface(
                    color = CoralRed.copy(alpha = 0.12f),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text(
                        text = actionError,
                        color = CoralRed,
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Medium,
                        modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)
                    )
                }
            }

            // Tab bar 2 tab: Đang chờ gom & Đơn hàng từ đợt gom
            TabRow(
                selectedTabIndex = selectedTab,
                containerColor = MaterialTheme.colorScheme.surface,
                contentColor = ForestGreenPrimary
            ) {
                Tab(
                    selected = selectedTab == 0,
                    onClick = { selectedTab = 0 },
                    text = {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(
                                text = "Đang chờ gom",
                                fontWeight = if (selectedTab == 0) FontWeight.Bold else FontWeight.Normal
                            )
                            if (waitingDemands.isNotEmpty()) {
                                Spacer(modifier = Modifier.width(6.dp))
                                Badge(containerColor = ForestGreenPrimary) {
                                    Text("${waitingDemands.size}", color = Color.White)
                                }
                            }
                        }
                    }
                )
                Tab(
                    selected = selectedTab == 1,
                    onClick = { selectedTab = 1 },
                    text = {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(
                                text = "Đơn hàng từ đợt gom",
                                fontWeight = if (selectedTab == 1) FontWeight.Bold else FontWeight.Normal
                            )
                            if (orderedDemands.isNotEmpty()) {
                                Spacer(modifier = Modifier.width(6.dp))
                                Badge(containerColor = ForestGreenDark) {
                                    Text("${orderedDemands.size}", color = Color.White)
                                }
                            }
                        }
                    }
                )
            }

            when {
                isLoading -> {
                    Box(
                        modifier = Modifier.fillMaxSize(),
                        contentAlignment = Alignment.Center
                    ) {
                        CircularProgressIndicator(color = ForestGreenPrimary)
                    }
                }
                errorMessage != null -> {
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(24.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text(text = errorMessage, color = CoralRed, fontSize = 14.sp)
                            Spacer(modifier = Modifier.height(12.dp))
                            Button(onClick = onRetry) {
                                Text("Thử lại")
                            }
                        }
                    }
                }
                selectedTab == 0 -> {
                    // TAB 1: NHU CẦU ĐANG CHỜ GOM
                    if (waitingDemands.isEmpty()) {
                        EmptyDemandsView(
                            title = "Chưa có nhu cầu đang chờ gom",
                            subtitle = "Bạn chưa tham gia đăng ký mua chung ở đợt gom nào hoặc các đợt trước đã hoàn tất.",
                            buttonText = "Khám phá các đợt gom quanh bạn",
                            onButtonClick = onExplorePoolsClick
                        )
                    } else {
                        LazyColumn(
                            contentPadding = PaddingValues(16.dp),
                            verticalArrangement = Arrangement.spacedBy(14.dp),
                            modifier = Modifier.fillMaxSize()
                        ) {
                            items(waitingDemands, key = { it.id }) { pool ->
                                WaitingDemandCard(
                                    pool = pool,
                                    onCardClick = { onOpenPoolDetail(pool.id) },
                                    onEdit = { poolToEdit = pool },
                                    onWithdraw = { poolToWithdraw = pool }
                                )
                            }
                        }
                    }
                }
                else -> {
                    // TAB 2: ĐƠN HÀNG TỪ ĐỢT GOM
                    if (orderedDemands.isEmpty()) {
                        EmptyDemandsView(
                            title = "Chưa có đơn hàng từ đợt gom",
                            subtitle = "Khi đợt gom bạn tham gia đủ số lượng và quán chốt thỏa thuận cung ứng, đơn hàng sẽ hiển thị tại đây.",
                            buttonText = "Xem danh sách đợt gom",
                            onButtonClick = onExplorePoolsClick
                        )
                    } else {
                        LazyColumn(
                            contentPadding = PaddingValues(16.dp),
                            verticalArrangement = Arrangement.spacedBy(14.dp),
                            modifier = Modifier.fillMaxSize()
                        ) {
                            items(orderedDemands, key = { it.id }) { pool ->
                                OrderedDemandCard(
                                    pool = pool,
                                    onOpenOrder = {
                                        val orderId = pool.myRegistration?.linkedOrderId
                                        if (!orderId.isNullOrBlank()) {
                                            onOpenOrderDetail(orderId)
                                        } else {
                                            onOpenPoolDetail(pool.id)
                                        }
                                    }
                                )
                            }
                        }
                    }
                }
            }
        }
    }

    // Dialog Sửa Nhu Cầu
    if (poolToEdit != null) {
        val pool = poolToEdit!!
        val reg = pool.myRegistration
        var qtyText by remember { mutableStateOf("${reg?.requestedQuantity ?: 1}") }
        var budgetText by remember { mutableStateOf("${reg?.budgetMax ?: pool.targetBudgetMax ?: ""}") }
        var startWindow by remember { mutableStateOf(reg?.preferredPickupStart ?: "17:00") }
        var endWindow by remember { mutableStateOf("19:00") }

        AlertDialog(
            onDismissRequest = { poolToEdit = null },
            title = {
                Text("Chỉnh sửa nhu cầu", fontWeight = FontWeight.Bold, fontSize = 16.sp)
            },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text(
                        text = "Đợt: ${pool.title} (${pool.storeName})",
                        fontSize = 12.sp,
                        color = TextSecondary
                    )
                    OutlinedTextField(
                        value = qtyText,
                        onValueChange = { qtyText = it.filter { c -> c.isDigit() } },
                        label = { Text("Số lượng suất cần mua") },
                        modifier = Modifier.fillMaxWidth()
                    )
                    OutlinedTextField(
                        value = budgetText,
                        onValueChange = { budgetText = it.filter { c -> c.isDigit() } },
                        label = { Text("Ngân sách tối đa mỗi suất (VND)") },
                        modifier = Modifier.fillMaxWidth()
                    )
                    OutlinedTextField(
                        value = startWindow,
                        onValueChange = { startWindow = it },
                        label = { Text("Khung giờ nhận (ví dụ 18:00 - 20:00)") },
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        val qty = qtyText.toIntOrNull() ?: 1
                        val budget = budgetText.toIntOrNull()
                        onUpdateDemand(pool.id, qty, budget, startWindow, endWindow)
                        poolToEdit = null
                    },
                    enabled = !isSubmitting,
                    colors = ButtonDefaults.buttonColors(containerColor = ForestGreenPrimary)
                ) {
                    Text("Lưu cập nhật")
                }
            },
            dismissButton = {
                OutlinedButton(onClick = { poolToEdit = null }) {
                    Text("Hủy")
                }
            }
        )
    }

    // Dialog Rút Nhu Cầu
    if (poolToWithdraw != null) {
        val pool = poolToWithdraw!!
        var withdrawReason by remember { mutableStateOf("Thay đổi kế hoạch") }

        AlertDialog(
            onDismissRequest = { poolToWithdraw = null },
            title = {
                Text("Rút khỏi đợt gom?", fontWeight = FontWeight.Bold, fontSize = 16.sp, color = CoralRed)
            },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(
                        text = "Bạn có chắc chắn muốn hủy đăng ký nhu cầu cho đợt \"${pool.title}\"?",
                        fontSize = 13.sp
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    OutlinedTextField(
                        value = withdrawReason,
                        onValueChange = { withdrawReason = it },
                        label = { Text("Lý do rút nhu cầu") },
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        onWithdrawDemand(pool.id, withdrawReason.ifBlank { "Khách chủ động rút" })
                        poolToWithdraw = null
                    },
                    enabled = !isSubmitting,
                    colors = ButtonDefaults.buttonColors(containerColor = CoralRed)
                ) {
                    Text("Xác nhận rút", color = Color.White)
                }
            },
            dismissButton = {
                OutlinedButton(onClick = { poolToWithdraw = null }) {
                    Text("Giữ lại")
                }
            }
        )
    }
}

/** Card Nhu cầu đang chờ gom (Xanh nhạt) */
@Composable
private fun WaitingDemandCard(
    pool: RescuePool,
    onCardClick: () -> Unit,
    onEdit: () -> Unit,
    onWithdraw: () -> Unit
) {
    val reg = pool.myRegistration ?: return
    val progress = remember(pool.expectedQuantity, pool.minimumDemand) {
        if (pool.minimumDemand > 0) (pool.expectedQuantity.toFloat() / pool.minimumDemand.toFloat()).coerceIn(0f, 1f)
        else 0f
    }

    SqCard(
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(
            containerColor = ForestGreenPrimary.copy(alpha = 0.06f)
        ),
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onCardClick() }
            .border(1.dp, ForestGreenPrimary.copy(alpha = 0.25f), RoundedCornerShape(14.dp))
    ) {
        Column(modifier = Modifier.padding(14.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.Top
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = pool.title,
                        fontWeight = FontWeight.Bold,
                        fontSize = 15.sp,
                        color = MaterialTheme.colorScheme.onSurface,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis
                    )
                    Spacer(modifier = Modifier.height(2.dp))
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            imageVector = Icons.Default.Storefront,
                            contentDescription = null,
                            tint = ForestGreenPrimary,
                            modifier = Modifier.size(14.dp)
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            text = pool.storeName,
                            fontSize = 12.sp,
                            color = TextSecondary
                        )
                    }
                }
                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(8.dp))
                        .background(ForestGreenPrimary.copy(alpha = 0.15f))
                        .padding(horizontal = 8.dp, vertical = 4.dp)
                ) {
                    Text(
                        text = "Đang gom",
                        fontWeight = FontWeight.Bold,
                        fontSize = 11.sp,
                        color = ForestGreenPrimary
                    )
                }
            }

            Spacer(modifier = Modifier.height(10.dp))

            // Thông tin đăng ký của khách
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text(
                    text = "Đã đăng ký: ${reg.requestedQuantity} suất",
                    fontSize = 13.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = MaterialTheme.colorScheme.onSurface
                )
                if (reg.budgetMax != null) {
                    Text(
                        text = "Tối đa: ${"%,d".format(reg.budgetMax)} ₫/suất",
                        fontSize = 13.sp,
                        color = ForestGreenPrimary,
                        fontWeight = FontWeight.Medium
                    )
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            // Tiến độ gom đợt
            Column {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text(
                        text = "Tiến độ gom: ${pool.expectedQuantity}/${pool.minimumDemand} suất",
                        fontSize = 11.sp,
                        color = TextSecondary
                    )
                    Text(
                        text = "${(progress * 100).toInt()}%",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        color = ForestGreenPrimary
                    )
                }
                Spacer(modifier = Modifier.height(4.dp))
                LinearProgressIndicator(
                    progress = { progress },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(6.dp)
                        .clip(RoundedCornerShape(3.dp)),
                    color = ForestGreenPrimary,
                    trackColor = MaterialTheme.colorScheme.surfaceVariant
                )
            }

            Spacer(modifier = Modifier.height(12.dp))
            HorizontalDivider(color = ForestGreenPrimary.copy(alpha = 0.15f))
            Spacer(modifier = Modifier.height(6.dp))

            // Nút Thao tác: Sửa nhu cầu & Rút nhu cầu
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.End,
                verticalAlignment = Alignment.CenterVertically
            ) {
                TextButton(
                    onClick = onWithdraw,
                    contentPadding = PaddingValues(horizontal = 8.dp, vertical = 4.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.Close,
                        contentDescription = null,
                        tint = CoralRed,
                        modifier = Modifier.size(14.dp)
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("Rút nhu cầu", color = CoralRed, fontSize = 12.sp)
                }

                Spacer(modifier = Modifier.width(6.dp))

                OutlinedButton(
                    onClick = onEdit,
                    shape = RoundedCornerShape(16.dp),
                    contentPadding = PaddingValues(horizontal = 12.dp, vertical = 4.dp),
                    modifier = Modifier.height(32.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.Edit,
                        contentDescription = null,
                        tint = ForestGreenPrimary,
                        modifier = Modifier.size(13.dp)
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("Sửa nhu cầu", fontSize = 12.sp, color = ForestGreenPrimary)
                }
            }
        }
    }
}

/** Card Đơn hàng từ đợt gom (Xanh đậm) */
@Composable
private fun OrderedDemandCard(
    pool: RescuePool,
    onOpenOrder: () -> Unit
) {
    val reg = pool.myRegistration ?: return
    val offer = pool.offer
    val unitPrice = offer?.proposedPrice ?: reg.budgetMax ?: 0
    val totalEstimated = unitPrice * reg.requestedQuantity

    SqCard(
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onOpenOrder() }
            .border(1.dp, ForestGreenDark.copy(alpha = 0.4f), RoundedCornerShape(14.dp))
    ) {
        Column(modifier = Modifier.padding(14.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.Top
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = pool.title,
                        fontWeight = FontWeight.Bold,
                        fontSize = 15.sp,
                        color = MaterialTheme.colorScheme.onSurface,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis
                    )
                    Spacer(modifier = Modifier.height(2.dp))
                    Text(
                        text = pool.storeName,
                        fontSize = 12.sp,
                        color = TextSecondary
                    )
                }
                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(8.dp))
                        .background(ForestGreenDark)
                        .padding(horizontal = 8.dp, vertical = 4.dp)
                ) {
                    Text(
                        text = "Đã chốt đơn",
                        fontWeight = FontWeight.Bold,
                        fontSize = 11.sp,
                        color = Color.White
                    )
                }
            }

            Spacer(modifier = Modifier.height(10.dp))

            if (!reg.linkedOrderId.isNullOrBlank()) {
                Text(
                    text = "Mã đơn liên kết: #${reg.linkedOrderId.takeLast(8).uppercase()}",
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Medium,
                    color = ForestGreenPrimary
                )
                Spacer(modifier = Modifier.height(4.dp))
            }

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text(
                    text = "Số lượng chốt: ${reg.requestedQuantity} suất",
                    fontSize = 13.sp,
                    color = MaterialTheme.colorScheme.onSurface
                )
                Text(
                    text = "${"%,d".format(totalEstimated)} ₫",
                    fontWeight = FontWeight.Bold,
                    fontSize = 14.sp,
                    color = ForestGreenPrimary
                )
            }

            if (!offer?.pickupStart.isNullOrBlank()) {
                Spacer(modifier = Modifier.height(6.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = Icons.Default.Timer,
                        contentDescription = null,
                        tint = TextSecondary,
                        modifier = Modifier.size(13.dp)
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        text = "Giờ nhận: ${offer?.pickupStart?.takeLast(8) ?: ""} - ${offer?.pickupEnd?.takeLast(8) ?: ""}",
                        fontSize = 11.sp,
                        color = TextSecondary
                    )
                }
            }

            Spacer(modifier = Modifier.height(10.dp))
            HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f))
            Spacer(modifier = Modifier.height(8.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.End
            ) {
                Button(
                    onClick = onOpenOrder,
                    shape = RoundedCornerShape(16.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = ForestGreenDark),
                    contentPadding = PaddingValues(horizontal = 14.dp, vertical = 4.dp),
                    modifier = Modifier.height(34.dp)
                ) {
                    Icon(
                        imageVector = Icons.AutoMirrored.Filled.ReceiptLong,
                        contentDescription = null,
                        tint = Color.White,
                        modifier = Modifier.size(14.dp)
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text("Xem chi tiết đơn", fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                }
            }
        }
    }
}

@Composable
private fun EmptyDemandsView(
    title: String,
    subtitle: String,
    buttonText: String,
    onButtonClick: () -> Unit
) {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .padding(24.dp),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Icon(
                imageVector = Icons.Default.Groups,
                contentDescription = null,
                tint = ForestGreenPrimary.copy(alpha = 0.5f),
                modifier = Modifier.size(56.dp)
            )
            Spacer(modifier = Modifier.height(14.dp))
            Text(
                text = title,
                fontWeight = FontWeight.Bold,
                fontSize = 16.sp,
                color = MaterialTheme.colorScheme.onSurface
            )
            Spacer(modifier = Modifier.height(6.dp))
            Text(
                text = subtitle,
                fontSize = 13.sp,
                color = TextSecondary,
                modifier = Modifier.padding(horizontal = 16.dp)
            )
            Spacer(modifier = Modifier.height(16.dp))
            Button(
                onClick = onButtonClick,
                shape = RoundedCornerShape(20.dp),
                colors = ButtonDefaults.buttonColors(containerColor = ForestGreenPrimary)
            ) {
                Text(buttonText)
            }
        }
    }
}
