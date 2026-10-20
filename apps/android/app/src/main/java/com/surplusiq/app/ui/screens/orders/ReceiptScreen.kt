package com.surplusiq.app.ui.screens.orders

import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Download
import androidx.compose.material.icons.filled.Share
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.surplusiq.app.data.remote.dto.OrderReceiptDto
import com.surplusiq.app.ui.components.BackTopBar
import com.surplusiq.app.ui.components.ErrorState
import com.surplusiq.app.ui.components.LabelValueRow
import com.surplusiq.app.ui.components.LoadingState
import com.surplusiq.app.ui.components.SectionCard
import com.surplusiq.app.ui.theme.ForestGreenPrimary
import com.surplusiq.app.ui.theme.TextMuted
import com.surplusiq.app.ui.theme.TextPrimary
import com.surplusiq.app.ui.theme.TextSecondary
import com.surplusiq.app.ui.util.buildSimplePdf
import com.surplusiq.app.ui.util.formatDateTime
import com.surplusiq.app.ui.util.formatVnd
import com.surplusiq.app.ui.util.rememberFileSaver
import com.surplusiq.app.ui.util.shareText

private const val NOT_TAX_INVOICE = "Biên nhận không phải hóa đơn thuế."

/** Các dòng biên nhận - dùng chung cho hiển thị, chia sẻ và PDF để không lệch nội dung. */
private fun receiptRows(r: OrderReceiptDto): List<Pair<String, String>> = buildList {
    add("Mã đơn" to r.orderCode)
    add("Cửa hàng" to r.storeName)
    add("Món" to r.itemName)
    add("Số lượng" to "${r.quantity}")
    add("Giá chốt" to formatVnd(r.unitPrice))
    if (r.discountAmount > 0) add("Ưu đãi" to "-${formatVnd(r.discountAmount)}")
    add("Tổng tiền" to formatVnd(r.totalAmount))
    add("Thanh toán lúc" to formatDateTime(r.paidAt))
    add("Mã giao dịch" to (r.transactionCode ?: "—"))
}

/** K31 - Biên nhận (R1-054). Backend chỉ trả JSON nên PDF được dựng trên máy từ đúng dữ liệu đó. */
@Composable
fun ReceiptScreen(
    receipt: OrderReceiptDto?,
    isLoading: Boolean,
    errorMessage: String?,
    onBackClick: () -> Unit,
    onRetry: () -> Unit
) {
    val context = LocalContext.current
    val savePdf = rememberFileSaver("application/pdf") { ok ->
        Toast.makeText(context, if (ok) "Đã lưu biên nhận PDF" else "Không lưu được tệp PDF", Toast.LENGTH_SHORT).show()
    }

    Column(modifier = Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background)) {
        BackTopBar("Biên nhận", onBackClick)
        when {
            isLoading -> LoadingState()
            errorMessage != null -> ErrorState(errorMessage, onRetry)
            receipt != null -> {
                val rows = receiptRows(receipt)
                Column(
                    modifier = Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp)
                ) {
                    SectionCard {
                        Text(receipt.storeName, fontSize = 17.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                        if (receipt.storeAddress.isNotBlank()) {
                            Text(receipt.storeAddress, fontSize = 12.sp, color = TextSecondary)
                        }
                        HorizontalDivider(modifier = Modifier.padding(vertical = 12.dp), color = MaterialTheme.colorScheme.outline.copy(alpha = 0.2f))
                        rows.forEach { (label, value) ->
                            val isTotal = label == "Tổng tiền"
                            LabelValueRow(label, value, valueColor = if (isTotal) ForestGreenPrimary else TextPrimary, bold = isTotal)
                        }
                        HorizontalDivider(modifier = Modifier.padding(vertical = 12.dp), color = MaterialTheme.colorScheme.outline.copy(alpha = 0.2f))
                        Text(
                            NOT_TAX_INVOICE,
                            fontSize = 12.sp,
                            color = TextMuted,
                            textAlign = TextAlign.Center,
                            modifier = Modifier.fillMaxWidth()
                        )
                    }

                    Spacer(modifier = Modifier.height(20.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        OutlinedButton(
                            onClick = {
                                savePdf(
                                    "bien-nhan-${receipt.orderCode}.pdf",
                                    buildSimplePdf("Biên nhận Cứu Món", rows, NOT_TAX_INVOICE)
                                )
                            },
                            modifier = Modifier.weight(1f).height(48.dp),
                            shape = RoundedCornerShape(24.dp)
                        ) {
                            Icon(Icons.Default.Download, contentDescription = null, modifier = Modifier.size(18.dp))
                            Spacer(modifier = Modifier.width(6.dp))
                            Text("Tải PDF", fontWeight = FontWeight.SemiBold)
                        }
                        Button(
                            onClick = {
                                val body = rows.joinToString("\n") { (l, v) -> "$l: $v" }
                                shareText(context, "Biên nhận Cứu Món\n$body\n$NOT_TAX_INVOICE")
                            },
                            modifier = Modifier.weight(1f).height(48.dp),
                            shape = RoundedCornerShape(24.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = ForestGreenPrimary)
                        ) {
                            Icon(Icons.Default.Share, contentDescription = null, tint = Color.White, modifier = Modifier.size(18.dp))
                            Spacer(modifier = Modifier.width(6.dp))
                            Text("Chia sẻ", fontWeight = FontWeight.SemiBold, color = Color.White)
                        }
                    }
                }
            }
            else -> LoadingState()
        }
    }
}
