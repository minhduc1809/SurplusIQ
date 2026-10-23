package com.surplusiq.merchant.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.surplusiq.merchant.data.StoreRepository
import com.surplusiq.merchant.data.SubscriptionDto
import com.surplusiq.merchant.ui.components.*
import com.surplusiq.merchant.ui.theme.*
import kotlinx.coroutines.launch
import java.time.Instant
import java.time.temporal.ChronoUnit

/**
 * S17 - Gia hạn gói Pro (POST store/subscription/renew).
 * Backend ghi nhận hóa đơn PAID ngay, không có bước thanh toán VietQR / mã chờ -> màn xác nhận rồi hiện kết quả.
 */
@Composable
fun SubscriptionRenewScreen(repository: StoreRepository, onBack: () -> Unit) {
    var sub by remember { mutableStateOf<SubscriptionDto?>(null) }
    var renewed by remember { mutableStateOf<SubscriptionDto?>(null) }
    var isLoading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }
    var renewing by remember { mutableStateOf(false) }
    var renewError by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    fun load() {
        isLoading = true
        error = null
        scope.launch {
            val result = repository.getSubscription()
            isLoading = false
            result.fold(onSuccess = { sub = it }, onFailure = { error = it.message })
        }
    }

    fun renew() {
        renewing = true
        renewError = null
        scope.launch {
            val result = repository.renewSubscription()
            renewing = false
            result.fold(onSuccess = { renewed = it }, onFailure = { renewError = it.message })
        }
    }

    LaunchedEffect(Unit) { load() }

    PlanFrame("Gia hạn gói", onBack) {
        when {
            isLoading -> FullScreenLoading()
            error != null -> ErrorState(message = error!!, onRetry = ::load)
            renewed != null -> Column(
                modifier = Modifier.fillMaxWidth().background(SqCoralWash, RoundedCornerShape(24.dp)).padding(24.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text("Gia hạn thành công", fontSize = 22.sp, fontWeight = FontWeight.ExtraBold, color = SqCoralDeep)
                Spacer(modifier = Modifier.height(6.dp))
                Text("Gói Chuyên nghiệp có hiệu lực đến ${shortDate(renewed!!.periodEnd)}.", fontSize = 14.sp, color = SqInkSoft)
            }
            sub != null -> {
                val s = sub!!
                val now = Instant.now()
                val end = runCatching { Instant.parse(s.periodEnd) }.getOrNull()
                // VC-03: còn hạn -> nối tiếp kỳ cũ; đã hết hạn / chưa Pro -> tính từ hôm nay.
                val stillActive = s.plan == "PRO" && end != null && end > now
                val newEnd = (if (stillActive) end!! else now).plus(30, ChronoUnit.DAYS)
                SqCard {
                    Row(horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {
                        Text("Chu kỳ", fontSize = 13.sp, color = SqInkSoft); Text("1 tháng (30 ngày)", fontSize = 13.sp, color = SqInk)
                    }
                    Spacer(modifier = Modifier.height(8.dp))
                    Row(horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {
                        Text("Số tiền", fontSize = 13.sp, color = SqInkSoft)
                        Text(currency(PRO_PRICE_VND), fontSize = 13.sp, fontWeight = FontWeight.Bold, color = SqInk)
                    }
                    Spacer(modifier = Modifier.height(8.dp))
                    Row(horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {
                        Text("Hạn hiện tại", fontSize = 13.sp, color = SqInkSoft)
                        Text(if (s.plan == "PRO") shortDate(s.periodEnd) else PLAN_LABELS[s.plan] ?: s.plan, fontSize = 13.sp, color = SqInk)
                    }
                    Spacer(modifier = Modifier.height(8.dp))
                    Row(horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {
                        Text("Hiệu lực mới đến", fontSize = 13.sp, color = SqInkSoft)
                        Text(shortDate(newEnd.toString()), fontSize = 13.sp, fontWeight = FontWeight.Bold, color = SqCoralDeep)
                    }
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        if (stillActive) "Gia hạn trước hạn: kỳ mới nối tiếp ngay sau kỳ hiện tại." else "Gói đã hết hạn: kỳ mới tính từ hôm nay.",
                        fontSize = 11.sp, color = SqInkMuted
                    )
                }
                InlineError(renewError)
                Spacer(modifier = Modifier.height(12.dp))
                PrimaryButton(if (renewError != null) "Thử lại" else "Xác nhận gia hạn", loading = renewing, onClick = ::renew)
            }
        }
    }
}
