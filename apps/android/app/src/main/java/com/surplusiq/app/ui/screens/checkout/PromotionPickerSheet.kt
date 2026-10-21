package com.surplusiq.app.ui.screens.checkout

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.LocalOffer
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.surplusiq.app.data.remote.dto.PromotionDto
import com.surplusiq.app.data.remote.dto.PromotionWalletItemDto
import com.surplusiq.app.ui.theme.CoralRed
import com.surplusiq.app.ui.theme.ForestGreenPrimary
import com.surplusiq.app.ui.theme.TextMuted
import com.surplusiq.app.ui.theme.TextPrimary
import com.surplusiq.app.ui.theme.TextSecondary
import com.surplusiq.app.ui.util.formatDate
import com.surplusiq.app.ui.util.formatVnd
import com.surplusiq.app.ui.util.parseIsoMillis
import com.surplusiq.app.ui.viewmodel.PromotionWalletUiState

/** "Giảm 20%" / "Giảm 15.000 ₫" theo PromotionType của backend. */
fun promotionValueText(promo: PromotionDto): String =
    if (promo.type == "PERCENT") "Giảm ${promo.value}%" else "Giảm ${formatVnd(promo.value)}"

/** Điều kiện + hạn dùng hiển thị trên thẻ ưu đãi. */
fun promotionConditionText(promo: PromotionDto): String = buildList {
    if (promo.minOrderAmount > 0) add("Đơn từ ${formatVnd(promo.minOrderAmount)}")
    promo.endAt?.let { add("HSD ${formatDate(it)}") }
}.joinToString(" • ").ifEmpty { "Không yêu cầu giá trị tối thiểu" }

/**
 * Lý do ưu đãi không dùng được cho đơn này, null nếu đủ điều kiện. Kiểm tra cùng thứ tự với
 * OrdersService.holdOrder ở backend (server vẫn là nơi quyết định cuối cùng).
 * storeId/subtotal null = không xét theo đơn cụ thể (màn Ví ưu đãi).
 */
fun promotionIneligibleReason(
    item: PromotionWalletItemDto,
    storeId: String? = null,
    subtotal: Int? = null,
    nowMillis: Long = System.currentTimeMillis()
): String? {
    val promo = item.promotion ?: return "Ưu đãi không còn tồn tại"
    return when {
        item.usedAt != null -> "Đã sử dụng ngày ${formatDate(item.usedAt)}"
        promo.status != "ACTIVE" -> "Ưu đãi đã tạm dừng hoặc kết thúc"
        storeId != null && promo.fundedBy != "PLATFORM" && promo.storeId != storeId -> "Chỉ áp dụng tại cửa hàng khác"
        (parseIsoMillis(promo.startAt) ?: 0L) > nowMillis -> "Chưa đến thời gian áp dụng"
        (parseIsoMillis(promo.endAt) ?: Long.MAX_VALUE) < nowMillis -> "Đã hết hạn"
        promo.maxUses != null && promo.maxUses > 0 && promo.usedCount >= promo.maxUses -> "Đã hết lượt sử dụng"
        subtotal != null && promo.minOrderAmount > 0 && subtotal < promo.minOrderAmount ->
            "Cần đơn tối thiểu ${formatVnd(promo.minOrderAmount)}"
        else -> null
    }
}

/** Số tiền giảm ước tính, cùng công thức backend (PERCENT làm tròn, FIXED không vượt tạm tính). */
fun promotionDiscount(promo: PromotionDto, subtotal: Int): Int {
    val raw = if (promo.type == "PERCENT") Math.round(subtotal * promo.value / 100.0).toInt() else promo.value
    return raw.coerceIn(0, subtotal)
}

/** K23 - nội dung bottom sheet "Chọn ưu đãi": nhập mã, chọn tối đa 1 ưu đãi trong ví. */
@Composable
fun PromotionPickerSheet(
    state: PromotionWalletUiState,
    storeId: String,
    subtotal: Int,
    initialSelectedId: String?,
    onClaim: (String) -> Unit,
    onRetry: () -> Unit,
    onConfirm: (PromotionDto?) -> Unit
) {
    var code by remember { mutableStateOf("") }
    var selectedId by remember { mutableStateOf(initialSelectedId) }

    // Mã vừa nhận thành công -> tự chọn nếu đủ điều kiện cho đơn này.
    LaunchedEffect(state.lastClaimedId, state.items) {
        val claimed = state.items.find { it.promotionId == state.lastClaimedId } ?: return@LaunchedEffect
        if (promotionIneligibleReason(claimed, storeId, subtotal) == null) selectedId = claimed.promotionId
        code = ""
    }

    Column(modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp).padding(bottom = 24.dp)) {
        Text("Chọn ưu đãi", fontSize = 18.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
        Text("Mỗi đơn áp dụng tối đa 1 ưu đãi.", fontSize = 12.sp, color = TextMuted)
        Spacer(modifier = Modifier.height(12.dp))

        Row(verticalAlignment = Alignment.CenterVertically) {
            OutlinedTextField(
                value = code,
                onValueChange = { code = it },
                label = { Text("Nhập mã ưu đãi") },
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
                if (state.isClaiming) {
                    CircularProgressIndicator(modifier = Modifier.size(16.dp), strokeWidth = 2.dp)
                } else {
                    Text("Áp dụng")
                }
            }
        }
        state.claimError?.let {
            Text(it, fontSize = 12.sp, color = CoralRed, modifier = Modifier.padding(top = 4.dp))
        }

        Spacer(modifier = Modifier.height(12.dp))

        when {
            state.isLoading -> Box(Modifier.fillMaxWidth().height(120.dp), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = ForestGreenPrimary)
            }
            state.errorMessage != null -> Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.fillMaxWidth()) {
                Text(state.errorMessage, fontSize = 13.sp, color = CoralRed)
                TextButton(onClick = onRetry) { Text("Thử lại") }
            }
            state.items.isEmpty() -> Text(
                "Ví ưu đãi của bạn đang trống. Nhập mã để nhận ưu đãi.",
                fontSize = 13.sp,
                color = TextSecondary,
                modifier = Modifier.padding(vertical = 16.dp)
            )
            else -> LazyColumn(
                modifier = Modifier.heightIn(max = 360.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                items(state.items, key = { it.promotionId }) { item ->
                    val reason = promotionIneligibleReason(item, storeId, subtotal)
                    PromotionOptionRow(
                        item = item,
                        reason = reason,
                        selected = selectedId == item.promotionId,
                        onSelect = {
                            selectedId = if (selectedId == item.promotionId) null else item.promotionId
                        }
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(16.dp))
        Button(
            onClick = { onConfirm(state.items.find { it.promotionId == selectedId }?.promotion) },
            modifier = Modifier.fillMaxWidth().height(50.dp),
            shape = RoundedCornerShape(25.dp),
            colors = ButtonDefaults.buttonColors(containerColor = ForestGreenPrimary)
        ) {
            Text(if (selectedId == null) "Xác nhận không dùng ưu đãi" else "Xác nhận", fontWeight = FontWeight.Bold)
        }
    }
}

@Composable
private fun PromotionOptionRow(
    item: PromotionWalletItemDto,
    reason: String?,
    selected: Boolean,
    onSelect: () -> Unit
) {
    val promo = item.promotion
    val enabled = reason == null
    Card(
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(
            containerColor = if (selected) ForestGreenPrimary.copy(alpha = 0.08f) else MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.4f)
        ),
        modifier = Modifier
            .fillMaxWidth()
            .alpha(if (enabled) 1f else 0.5f)
            .clickable(enabled = enabled, onClick = onSelect)
    ) {
        Row(modifier = Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
            Icon(Icons.Default.LocalOffer, contentDescription = null, tint = ForestGreenPrimary, modifier = Modifier.size(22.dp))
            Spacer(modifier = Modifier.width(10.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(promo?.name ?: "Ưu đãi", fontSize = 14.sp, fontWeight = FontWeight.SemiBold, color = TextPrimary)
                if (promo != null) {
                    Text(promotionValueText(promo), fontSize = 13.sp, fontWeight = FontWeight.Bold, color = ForestGreenPrimary)
                    Text(promotionConditionText(promo), fontSize = 11.sp, color = TextMuted)
                }
                reason?.let { Text(it, fontSize = 11.sp, color = CoralRed, fontWeight = FontWeight.SemiBold) }
            }
            RadioButton(selected = selected, onClick = onSelect, enabled = enabled)
        }
    }
}
