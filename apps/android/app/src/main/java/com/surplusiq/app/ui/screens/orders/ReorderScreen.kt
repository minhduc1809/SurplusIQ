package com.surplusiq.app.ui.screens.orders

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Inventory2
import androidx.compose.material.icons.filled.Schedule
import androidx.compose.material.icons.filled.SearchOff
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.surplusiq.app.domain.model.ActiveOrder
import com.surplusiq.app.domain.model.Deal
import com.surplusiq.app.ui.components.BackTopBar
import com.surplusiq.app.ui.components.EmptyState
import com.surplusiq.app.ui.components.ErrorState
import com.surplusiq.app.ui.components.LoadingState
import com.surplusiq.app.ui.components.SectionCard
import com.surplusiq.app.ui.theme.ForestGreenPrimary
import com.surplusiq.app.ui.theme.TextMuted
import com.surplusiq.app.ui.theme.TextPrimary
import com.surplusiq.app.ui.theme.TextSecondary
import com.surplusiq.app.ui.util.formatVnd
import com.surplusiq.app.ui.viewmodel.MyOrdersUiState

/**
 * K32 - Đặt lại món đã mua (R1-051). Backend trả tối đa MỘT suất OPEN cùng món (không phải danh sách),
 * nên màn hiển thị đúng suất đó; "Đặt nhanh" đi vào luồng xác nhận đặt/giữ suất.
 */
@Composable
fun ReorderScreen(
    oldOrder: ActiveOrder,
    state: MyOrdersUiState,
    onBackClick: () -> Unit,
    onRetry: () -> Unit,
    onQuickOrder: (Deal) -> Unit,
    onBrowseDeals: () -> Unit
) {
    Column(modifier = Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background), horizontalAlignment = Alignment.CenterHorizontally) {
        BackTopBar("Đặt lại món đã mua", onBackClick)
        Column(modifier = Modifier.widthIn(max = 640.dp).fillMaxSize().navigationBarsPadding().verticalScroll(rememberScrollState()).padding(16.dp)) {
            SectionCard {
                Text("Đơn cũ ${oldOrder.orderCode}", fontSize = 12.sp, color = TextMuted)
                Text(oldOrder.deal.title, fontSize = 16.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                Text(oldOrder.deal.storeName, fontSize = 13.sp, color = TextSecondary)
            }
            Spacer(modifier = Modifier.height(16.dp))
            Text("Suất đang mở cùng món", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
            Spacer(modifier = Modifier.height(8.dp))

            val deal = state.reorderDeal
            when {
                state.isReorderLoading -> Box(Modifier.height(200.dp)) { LoadingState() }
                state.reorderError != null -> Box(Modifier.height(260.dp)) { ErrorState(state.reorderError, onRetry) }
                deal != null -> OpenOfferCard(deal = deal, onQuickOrder = { onQuickOrder(deal) })
                state.reorderChecked -> Box(Modifier.height(320.dp)) {
                    EmptyState(
                        icon = Icons.Default.SearchOff,
                        title = "Hiện chưa có suất cùng món",
                        subtitle = "Cửa hàng chưa mở suất món này hôm nay hoặc đã bán hết.",
                        action = {
                            OutlinedButton(onClick = onBrowseDeals, shape = RoundedCornerShape(22.dp)) {
                                Text("Xem suất khác")
                            }
                        }
                    )
                }
                else -> Box(Modifier.height(200.dp)) { LoadingState() }
            }
        }
    }
}

@Composable
private fun OpenOfferCard(deal: Deal, onQuickOrder: () -> Unit) {
    SectionCard {
        Text(deal.title, fontSize = 15.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
        Text(deal.storeName, fontSize = 12.sp, color = TextSecondary)
        Spacer(modifier = Modifier.height(10.dp))
        Row(verticalAlignment = Alignment.Bottom) {
            Text(formatVnd(deal.discountPrice), fontSize = 18.sp, fontWeight = FontWeight.ExtraBold, color = ForestGreenPrimary)
            Spacer(modifier = Modifier.width(8.dp))
            Text(
                formatVnd(deal.originalPrice),
                fontSize = 12.sp,
                color = TextMuted,
                textDecoration = TextDecoration.LineThrough
            )
        }
        Spacer(modifier = Modifier.height(8.dp))
        Row(verticalAlignment = Alignment.CenterVertically) {
            Icon(Icons.Default.Inventory2, contentDescription = null, tint = TextSecondary, modifier = Modifier.size(16.dp))
            Spacer(modifier = Modifier.width(6.dp))
            Text("Còn ${deal.remainingStock} suất", fontSize = 13.sp, color = TextSecondary)
        }
        Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(top = 4.dp)) {
            Icon(Icons.Default.Schedule, contentDescription = null, tint = TextSecondary, modifier = Modifier.size(16.dp))
            Spacer(modifier = Modifier.width(6.dp))
            Text(deal.pickupWindowText, fontSize = 13.sp, color = TextSecondary)
        }
        Spacer(modifier = Modifier.height(14.dp))
        Button(
            onClick = onQuickOrder,
            enabled = deal.remainingStock > 0,
            modifier = Modifier.fillMaxWidth().height(48.dp),
            shape = RoundedCornerShape(24.dp),
            colors = ButtonDefaults.buttonColors(containerColor = ForestGreenPrimary)
        ) {
            Text("Đặt nhanh", fontWeight = FontWeight.Bold, color = Color.White)
        }
    }
}
