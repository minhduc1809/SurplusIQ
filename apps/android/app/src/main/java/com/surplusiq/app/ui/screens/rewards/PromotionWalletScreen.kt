package com.surplusiq.app.ui.screens.rewards

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ConfirmationNumber
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.surplusiq.app.data.remote.dto.PromotionWalletItemDto
import com.surplusiq.app.ui.components.BackTopBar
import com.surplusiq.app.ui.components.EmptyState
import com.surplusiq.app.ui.components.ErrorState
import com.surplusiq.app.ui.components.LoadingState
import com.surplusiq.app.ui.components.StatusChip
import com.surplusiq.app.ui.screens.checkout.promotionConditionText
import com.surplusiq.app.ui.screens.checkout.promotionIneligibleReason
import com.surplusiq.app.ui.screens.checkout.promotionValueText
import com.surplusiq.app.ui.theme.CoralRed
import com.surplusiq.app.ui.theme.ForestGreenPrimary
import com.surplusiq.app.ui.theme.MintDeep
import com.surplusiq.app.ui.theme.TextMuted
import com.surplusiq.app.ui.theme.TextPrimary
import com.surplusiq.app.ui.theme.TextSecondary
import com.surplusiq.app.ui.util.formatDate
import com.surplusiq.app.ui.viewmodel.PromotionWalletUiState

/** K47 - Ví ưu đãi (R1-078, R1-079): tab Đang có / Đã dùng, nhập mã để nhận ưu đãi. */
@Composable
fun PromotionWalletScreen(
    state: PromotionWalletUiState,
    onBackClick: () -> Unit,
    onRetry: () -> Unit,
    onClaim: (String) -> Unit
) {
    var tab by rememberSaveable { mutableStateOf(0) }
    var code by rememberSaveable { mutableStateOf("") }
    LaunchedEffect(state.lastClaimedId) { if (state.lastClaimedId != null) code = "" }

    val (used, available) = state.items.partition { it.usedAt != null }
    val shown = if (tab == 0) available else used

    Column(modifier = Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background)) {
        BackTopBar("Ví ưu đãi", onBackClick)

        Column(modifier = Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                OutlinedTextField(
                    value = code,
                    onValueChange = { code = it },
                    label = { Text("Nhập mã nhận ưu đãi") },
                    singleLine = true,
                    shape = RoundedCornerShape(10.dp),
                    modifier = Modifier.weight(1f)
                )
                Spacer(modifier = Modifier.width(8.dp))
                Button(
                    onClick = { onClaim(code) },
                    enabled = code.isNotBlank() && !state.isClaiming,
                    shape = RoundedCornerShape(10.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = ForestGreenPrimary)
                ) {
                    if (state.isClaiming) CircularProgressIndicator(color = Color.White, strokeWidth = 2.dp, modifier = Modifier.size(16.dp))
                    else Text("Nhận")
                }
            }
            state.claimError?.let { Text(it, fontSize = 12.sp, color = CoralRed, modifier = Modifier.padding(top = 4.dp)) }
            if (state.lastClaimedId != null && state.claimError == null) {
                Text("Đã thêm ưu đãi vào ví.", fontSize = 12.sp, color = MintDeep, modifier = Modifier.padding(top = 4.dp))
            }
        }

        TabRow(selectedTabIndex = tab, containerColor = MaterialTheme.colorScheme.surface, contentColor = ForestGreenPrimary) {
            Tab(selected = tab == 0, onClick = { tab = 0 }, text = { Text("Đang có (${available.size})") })
            Tab(selected = tab == 1, onClick = { tab = 1 }, text = { Text("Đã dùng (${used.size})") })
        }

        when {
            state.isLoading && state.items.isEmpty() -> LoadingState()
            state.errorMessage != null -> ErrorState(state.errorMessage, onRetry)
            shown.isEmpty() -> EmptyState(
                icon = Icons.Default.ConfirmationNumber,
                title = if (tab == 0) "Chưa có ưu đãi nào trong ví" else "Chưa dùng ưu đãi nào",
                subtitle = if (tab == 0) "Nhập mã từ cửa hàng để nhận ưu đãi." else null
            )
            else -> LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                items(shown, key = { it.promotionId }) { VoucherCard(it) }
            }
        }
    }
}

/** Thẻ dạng phiếu: phần giá trị bên trái, đường cắt có hai khuyết tròn, chi tiết bên phải. */
@Composable
private fun VoucherCard(item: PromotionWalletItemDto) {
    val promo = item.promotion
    val reason = promotionIneligibleReason(item)
    val usable = reason == null
    Box(modifier = Modifier.fillMaxWidth().alpha(if (usable) 1f else 0.6f)) {
        Card(
            shape = RoundedCornerShape(14.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
            elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
            modifier = Modifier.fillMaxWidth()
        ) {
            Row(modifier = Modifier.height(IntrinsicSize.Min)) {
                Box(
                    modifier = Modifier
                        .width(96.dp)
                        .fillMaxHeight()
                        .background(if (usable) ForestGreenPrimary else TextMuted),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        promo?.let { promotionValueText(it).removePrefix("Giảm ") } ?: "—",
                        color = Color.White,
                        fontSize = 17.sp,
                        fontWeight = FontWeight.ExtraBold,
                        modifier = Modifier.padding(8.dp)
                    )
                }
                Column(modifier = Modifier.weight(1f).padding(12.dp)) {
                    Text(promo?.name ?: "Ưu đãi không còn tồn tại", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                    promo?.let { Text(promotionConditionText(it), fontSize = 12.sp, color = TextSecondary) }
                    Text("Nhận ngày ${formatDate(item.claimedAt)}", fontSize = 11.sp, color = TextMuted)
                    Spacer(modifier = Modifier.height(6.dp))
                    StatusChip(reason ?: "Dùng được", if (usable) MintDeep else TextMuted)
                }
            }
        }
        // Khuyết răng cưa tại đường cắt giữa hai phần phiếu.
        listOf(Alignment.TopStart, Alignment.BottomStart).forEach { align ->
            Box(
                modifier = Modifier
                    .align(align)
                    .offset(x = 88.dp, y = if (align == Alignment.TopStart) (-8).dp else 8.dp)
                    .size(16.dp)
                    .background(MaterialTheme.colorScheme.background, CircleShape)
            )
        }
    }
}
