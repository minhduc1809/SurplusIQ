package com.surplusiq.app.ui.screens.checkout

import androidx.compose.foundation.background
import com.surplusiq.app.ui.components.SqCard
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.CurrencyExchange
import androidx.compose.material.icons.filled.HourglassTop
import androidx.compose.material.icons.filled.QrCode2
import androidx.compose.material.icons.filled.Timer
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.surplusiq.app.ui.theme.CoralRed
import com.surplusiq.app.ui.theme.ForestGreenPrimary
import com.surplusiq.app.ui.theme.InfoOnLight
import com.surplusiq.app.ui.theme.MintDeep
import com.surplusiq.app.ui.theme.TextMuted
import com.surplusiq.app.ui.theme.TextPrimary
import com.surplusiq.app.ui.theme.TextSecondary
import com.surplusiq.app.ui.theme.WarningOnLight
import com.surplusiq.app.ui.util.formatVnd
import com.surplusiq.app.ui.viewmodel.PaymentResult

/**
 * K25 - Kết quả thanh toán, một màn bốn biến thể. Trạng thái lấy từ phản hồi recheck thật
 * (R1-041, R1-042, R1-047, R1-056) hoặc đồng hồ giữ suất 10 phút (BR-017).
 */
@Composable
fun PaymentResultContent(
    result: PaymentResult,
    orderCode: String,
    amount: Long?,
    isChecking: Boolean,
    onViewPickupQr: () -> Unit,
    onRecheck: () -> Unit,
    onBackToQr: () -> Unit,
    onBrowseDeals: () -> Unit,
    modifier: Modifier = Modifier
) {
    val spec = when (result) {
        PaymentResult.Success -> ResultSpec(
            icon = Icons.Default.CheckCircle,
            color = MintDeep,
            title = "Thanh toán thành công",
            message = "Suất của bạn đã được xác nhận. Mở mã QR khi đến quầy để nhận hàng."
        )
        is PaymentResult.Pending -> ResultSpec(
            icon = Icons.Default.HourglassTop,
            color = WarningOnLight,
            title = "Đang chờ xác nhận thanh toán",
            message = result.message + "\nBạn không cần chuyển khoản lại. Hệ thống cho phép kiểm tra lại 1 lần mỗi phút."
        )
        PaymentResult.HoldExpired -> ResultSpec(
            icon = Icons.Default.Timer,
            color = CoralRed,
            title = "Đã hết thời gian giữ suất",
            message = "Quá 10 phút chưa ghi nhận thanh toán nên suất đã được nhả lại cho người khác. " +
                "Nếu bạn đã chuyển khoản, hãy kiểm tra lại: tiền đến muộn sẽ được hoàn 100%."
        )
        is PaymentResult.LatePayment -> ResultSpec(
            icon = Icons.Default.CurrencyExchange,
            color = InfoOnLight,
            title = "Thanh toán đến muộn",
            message = "Tiền của bạn về sau khi hết hạn giữ suất nên đơn không được xác nhận. " +
                "Hệ thống đã tự động tạo lệnh hoàn 100% số tiền về tài khoản của bạn."
        )
    }

    Column(
        modifier = modifier.fillMaxWidth().padding(top = 24.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Box(
            modifier = Modifier.size(88.dp).background(spec.color.copy(alpha = 0.12f), CircleShape),
            contentAlignment = Alignment.Center
        ) {
            Icon(spec.icon, contentDescription = null, tint = spec.color, modifier = Modifier.size(52.dp))
        }
        Spacer(modifier = Modifier.height(16.dp))
        Text(spec.title, fontSize = 20.sp, fontWeight = FontWeight.ExtraBold, color = TextPrimary, textAlign = TextAlign.Center)
        Spacer(modifier = Modifier.height(8.dp))
        Text(
            spec.message,
            fontSize = 14.sp,
            color = TextSecondary,
            textAlign = TextAlign.Center,
            modifier = Modifier.padding(horizontal = 16.dp)
        )

        Spacer(modifier = Modifier.height(20.dp))
        SqCard(
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                ResultRow("Mã đơn", orderCode)
                if (amount != null) {
                    ResultRow(if (result is PaymentResult.LatePayment) "Số tiền hoàn" else "Số tiền", formatVnd(amount))
                }
            }
        }

        Spacer(modifier = Modifier.height(24.dp))
        when (result) {
            PaymentResult.Success -> PrimaryButton("Xem mã QR nhận hàng", Icons.Default.QrCode2, onViewPickupQr)
            is PaymentResult.Pending -> {
                PrimaryButton(if (isChecking) "Đang kiểm tra…" else "Kiểm tra lại", null, onRecheck, enabled = !isChecking)
                TextButton(onClick = onBackToQr) { Text("Xem lại mã VietQR", color = TextSecondary) }
            }
            PaymentResult.HoldExpired -> {
                PrimaryButton("Xem suất khác", null, onBrowseDeals)
                TextButton(onClick = onRecheck, enabled = !isChecking) {
                    Text(if (isChecking) "Đang kiểm tra…" else "Tôi đã chuyển tiền, kiểm tra lại", color = TextSecondary)
                }
            }
            is PaymentResult.LatePayment -> {
                PrimaryButton("Xem suất khác", null, onBrowseDeals)
                Text(
                    "Theo dõi khoản hoàn trong Lịch sử thanh toán và hoàn tiền.",
                    fontSize = 12.sp,
                    color = TextMuted,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.padding(top = 8.dp)
                )
            }
        }
    }
}

private data class ResultSpec(val icon: ImageVector, val color: Color, val title: String, val message: String)

@Composable
private fun ResultRow(label: String, value: String) {
    Row(Modifier.fillMaxWidth().padding(vertical = 4.dp), horizontalArrangement = Arrangement.SpaceBetween) {
        Text(label, fontSize = 13.sp, color = TextMuted)
        Text(value, fontSize = 14.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
    }
}

@Composable
private fun PrimaryButton(text: String, icon: ImageVector?, onClick: () -> Unit, enabled: Boolean = true) {
    Button(
        onClick = onClick,
        enabled = enabled,
        modifier = Modifier.fillMaxWidth().height(50.dp),
        shape = RoundedCornerShape(25.dp),
        colors = ButtonDefaults.buttonColors(containerColor = ForestGreenPrimary)
    ) {
        if (icon != null) {
            Icon(icon, contentDescription = null, tint = Color.White, modifier = Modifier.size(20.dp))
            Spacer(modifier = Modifier.width(8.dp))
        }
        Text(text, fontSize = 15.sp, fontWeight = FontWeight.Bold, color = Color.White)
    }
}
