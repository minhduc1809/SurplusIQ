package com.surplusiq.app.ui.screens.orders

import androidx.compose.foundation.background
import com.surplusiq.app.ui.components.SqCard
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.QrCode2
import androidx.compose.material.icons.automirrored.filled.ReceiptLong
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.surplusiq.app.domain.model.ActiveOrder
import com.surplusiq.app.domain.model.OrderStatus
import com.surplusiq.app.ui.theme.AmberAccent
import com.surplusiq.app.ui.theme.AmberLight
import com.surplusiq.app.ui.theme.CoralRedLight
import com.surplusiq.app.ui.theme.InfoOnLight
import com.surplusiq.app.ui.theme.MintDeep
import com.surplusiq.app.ui.theme.SkyBlueIce
import com.surplusiq.app.ui.theme.SkyInfoWash
import com.surplusiq.app.ui.theme.WarningOnLight
import com.surplusiq.app.ui.theme.CoralRed
import com.surplusiq.app.ui.theme.ForestGreenDark
import com.surplusiq.app.ui.theme.ForestGreenPrimary
import com.surplusiq.app.ui.theme.TextMuted
import com.surplusiq.app.ui.theme.TextPrimary
import com.surplusiq.app.ui.theme.TextSecondary
import com.surplusiq.app.ui.viewmodel.MyOrdersUiState

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MyOrdersScreen(
    state: MyOrdersUiState,
    onTabSelected: (Int) -> Unit,
    onOrderClick: (ActiveOrder) -> Unit,
    onOpenPickupPass: (ActiveOrder) -> Unit,
    onResumePayment: (ActiveOrder) -> Unit,
    onBackClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        TopAppBar(
            title = { Text("Đơn hàng của tôi", fontWeight = FontWeight.Bold, fontSize = 18.sp) },
            navigationIcon = {
                IconButton(onClick = onBackClick) {
                    Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Quay lại")
                }
            }
        )

        // Tab Selector
        TabRow(
            modifier = Modifier.widthIn(max = 640.dp),
            selectedTabIndex = state.selectedTab,
            containerColor = MaterialTheme.colorScheme.surface,
            contentColor = ForestGreenPrimary
        ) {
            Tab(
                selected = state.selectedTab == 0,
                onClick = { onTabSelected(0) },
                text = {
                    Text(
                        text = "Đang mở (${state.activeOrders.size})",
                        fontWeight = if (state.selectedTab == 0) FontWeight.Bold else FontWeight.Normal
                    )
                }
            )
            Tab(
                selected = state.selectedTab == 1,
                onClick = { onTabSelected(1) },
                text = {
                    Text(
                        text = "Lịch sử (${state.pastOrders.size})",
                        fontWeight = if (state.selectedTab == 1) FontWeight.Bold else FontWeight.Normal
                    )
                }
            )
        }

        val ordersToShow = if (state.selectedTab == 0) state.activeOrders else state.pastOrders

        if (state.isLoading) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = ForestGreenPrimary)
            }
        } else if (ordersToShow.isEmpty()) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(32.dp),
                contentAlignment = Alignment.Center
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Icon(
                        imageVector = Icons.AutoMirrored.Filled.ReceiptLong,
                        contentDescription = null,
                        tint = TextMuted,
                        modifier = Modifier.size(56.dp)
                    )
                    Spacer(modifier = Modifier.height(16.dp))
                    Text(
                        text = if (state.selectedTab == 0) "Bạn không có đơn hàng nào đang mở" else "Chưa có lịch sử đơn hàng",
                        fontSize = 15.sp,
                        fontWeight = FontWeight.Medium,
                        color = TextSecondary,
                        textAlign = TextAlign.Center
                    )
                }
            }
        } else {
            LazyColumn(
                modifier = Modifier.widthIn(max = 640.dp).fillMaxSize().navigationBarsPadding()
                    .padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp)
            ) {
                items(ordersToShow) { order ->
                    OrderCardItem(
                        order = order,
                        onCardClick = { onOrderClick(order) },
                        onOpenPickupPass = { onOpenPickupPass(order) },
                        onResumePayment = { onResumePayment(order) }
                    )
                }
            }
        }
    }
}

@Composable
fun OrderCardItem(
    order: ActiveOrder,
    onCardClick: () -> Unit,
    onOpenPickupPass: () -> Unit,
    onResumePayment: () -> Unit,
    modifier: Modifier = Modifier
) {
    SqCard(
        modifier = modifier
            .fillMaxWidth()
            .clickable { onCardClick() },
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            // Header: Store Name & Status Badge
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = order.deal.storeName,
                    fontSize = 15.sp,
                    fontWeight = FontWeight.Bold,
                    color = TextPrimary,
                    maxLines = 2,
                    modifier = Modifier.weight(1f).padding(end = 8.dp)
                )

                OrderStatusBadge(order.status)
            }

            Spacer(modifier = Modifier.height(8.dp))

            // Deal Info
            Text(
                text = "${order.quantity}x ${order.deal.title}",
                fontSize = 14.sp,
                fontWeight = FontWeight.SemiBold,
                color = ForestGreenPrimary
            )

            Spacer(modifier = Modifier.height(4.dp))

            if (order.pickupWindow.isNotBlank()) {
                Text(
                    text = "Khung giờ nhận: ${formatPickupWindowText(order.pickupWindow)}",
                    fontSize = 12.sp,
                    color = TextSecondary
                )
            }

            Spacer(modifier = Modifier.height(10.dp))

            HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.15f))

            Spacer(modifier = Modifier.height(10.dp))

            // Footer: Total Price & Quick Action
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text(text = "Mã đơn: ${order.orderCode}", fontSize = 11.sp, color = TextMuted)
                    Text(
                        text = "${String.format("%,d", order.totalPrice)} ₫",
                        fontSize = 16.sp,
                        fontWeight = FontWeight.ExtraBold,
                        color = TextPrimary
                    )
                }

                when (order.status) {
                    OrderStatus.PAID_WAITING_PICKUP -> {
                        Button(
                            onClick = onOpenPickupPass,
                            shape = RoundedCornerShape(20.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = ForestGreenPrimary),
                            contentPadding = PaddingValues(horizontal = 14.dp, vertical = 6.dp)
                        ) {
                            Icon(Icons.Default.QrCode2, contentDescription = null, modifier = Modifier.size(16.dp), tint = Color.White)
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(text = "Xem vé nhận", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = Color.White)
                        }
                    }
                    OrderStatus.PENDING_PAYMENT -> {
                        Button(
                            onClick = onResumePayment,
                            shape = RoundedCornerShape(20.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = AmberAccent),
                            contentPadding = PaddingValues(horizontal = 14.dp, vertical = 6.dp)
                        ) {
                            Text(text = "Thanh toán ngay", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = Color.Black)
                        }
                    }
                    else -> {
                        Icon(Icons.Default.ChevronRight, contentDescription = "Xem chi tiết", tint = TextSecondary)
                    }
                }
            }
        }
    }
}

@Composable
fun OrderStatusBadge(status: OrderStatus) {
    val (text, bgColor, textColor) = when (status) {
        OrderStatus.PENDING_PAYMENT -> Triple("Chờ thanh toán", AmberLight, WarningOnLight)
        OrderStatus.PAID_WAITING_PICKUP -> Triple("Đã thanh toán", ForestGreenPrimary.copy(alpha = 0.15f), ForestGreenDark)
        OrderStatus.PICKED_UP -> Triple("Đã nhận hàng", com.surplusiq.app.ui.theme.LilacWash, Color(0xFF5B4BB7))
        OrderStatus.HOLD_EXPIRED -> Triple("Hết hạn giữ suất", Color.Gray.copy(alpha = 0.15f), Color.DarkGray)
        OrderStatus.PICKUP_EXPIRED -> Triple("Quá hạn nhận hàng", CoralRedLight, CoralRed)
        OrderStatus.CANCELLED -> Triple("Đã hủy", CoralRedLight, CoralRed)
        OrderStatus.REFUNDED -> Triple("Đã hoàn tiền", com.surplusiq.app.ui.theme.LilacWash, Color(0xFF5B4BB7))
    }

    Box(
        modifier = Modifier
            .background(bgColor, RoundedCornerShape(12.dp))
            .padding(horizontal = 10.dp, vertical = 4.dp)
    ) {
        Text(text = text, fontSize = 11.sp, fontWeight = FontWeight.Bold, color = textColor, maxLines = 1, softWrap = false)
    }
}

/** Đổi giờ hẹn ISO của máy chủ thành "19:30 22/10"; khung giờ đã là chữ ("Hôm nay 17:00 - 21:00") thì giữ nguyên. */
internal fun formatPickupWindowText(raw: String): String = runCatching {
    java.time.OffsetDateTime.parse(raw).atZoneSameInstant(java.time.ZoneId.systemDefault())
        .format(java.time.format.DateTimeFormatter.ofPattern("HH:mm dd/MM/yyyy"))
}.getOrDefault(raw)
