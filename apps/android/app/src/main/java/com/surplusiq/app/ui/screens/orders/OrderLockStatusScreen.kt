package com.surplusiq.app.ui.screens.orders

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Lightbulb
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.surplusiq.app.data.remote.dto.OrderLockStatusDto
import com.surplusiq.app.domain.model.ActiveOrder
import com.surplusiq.app.ui.components.BackTopBar
import com.surplusiq.app.ui.components.ErrorState
import com.surplusiq.app.ui.components.LoadingState
import com.surplusiq.app.ui.components.SectionCard
import com.surplusiq.app.ui.components.StatusChip
import com.surplusiq.app.ui.theme.CoralRed
import com.surplusiq.app.ui.theme.MintDeep
import com.surplusiq.app.ui.theme.TextMuted
import com.surplusiq.app.ui.theme.TextPrimary
import com.surplusiq.app.ui.theme.TextSecondary
import com.surplusiq.app.ui.theme.WarningOnLight
import com.surplusiq.app.ui.util.formatDate
import com.surplusiq.app.ui.util.formatDateTime

// Ngưỡng khóa theo BR-020 (backend: 3 lần không đến nhận trong 30 ngày -> khóa đặt 7 ngày).
private const val NOSHOW_LOCK_THRESHOLD = 3

private val lockTips = listOf(
    "Chỉ đặt khi chắc chắn đến được trong khung giờ nhận.",
    "Không đến được? Hủy trước giờ nhận ít nhất 60 phút để được hoàn 100% và không bị tính lần vắng.",
    "Nhờ người thân nhận thay bằng Mã nhận hộ trong chi tiết đơn.",
    "Bật thông báo nhắc giờ nhận để không quên."
)

/** K33 - Trạng thái khóa đặt (R1-048, BR-020). */
@Composable
fun OrderLockStatusScreen(
    lock: OrderLockStatusDto?,
    isLoading: Boolean,
    errorMessage: String?,
    knownOrders: List<ActiveOrder>,
    onBackClick: () -> Unit,
    onRetry: () -> Unit
) {
    Column(modifier = Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background)) {
        BackTopBar("Trạng thái khóa đặt", onBackClick)
        when {
            isLoading || (lock == null && errorMessage == null) -> LoadingState()
            errorMessage != null -> ErrorState(errorMessage, onRetry)
            lock != null -> Column(
                modifier = Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp)
            ) {
                SectionCard {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            if (lock.isLocked) Icons.Default.Lock else Icons.Default.CheckCircle,
                            contentDescription = null,
                            tint = if (lock.isLocked) CoralRed else MintDeep,
                            modifier = Modifier.size(28.dp)
                        )
                        Spacer(modifier = Modifier.width(10.dp))
                        Column {
                            StatusChip(if (lock.isLocked) "Đang bị khóa" else "Bình thường", if (lock.isLocked) CoralRed else MintDeep)
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(
                                if (lock.isLocked) "Đang bị khóa đặt đến ${formatDateTime(lock.lockedUntil)}"
                                else "Bạn có thể đặt suất cứu món bình thường.",
                                fontSize = 14.sp,
                                fontWeight = FontWeight.SemiBold,
                                color = TextPrimary
                            )
                        }
                    }
                }

                SectionCard {
                    Text("Không đến nhận trong 30 ngày", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = TextSecondary)
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        "${lock.noshowCount30d}/$NOSHOW_LOCK_THRESHOLD lần",
                        fontSize = 22.sp,
                        fontWeight = FontWeight.ExtraBold,
                        color = if (lock.noshowCount30d >= NOSHOW_LOCK_THRESHOLD) CoralRed else TextPrimary
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    val progress = (lock.noshowCount30d.toFloat() / NOSHOW_LOCK_THRESHOLD).coerceIn(0f, 1f)
                    LinearProgressIndicator(
                        progress = { progress },
                        modifier = Modifier.fillMaxWidth().height(8.dp),
                        color = when {
                            progress >= 1f -> CoralRed
                            progress > 0f -> WarningOnLight
                            else -> MintDeep
                        },
                        trackColor = MaterialTheme.colorScheme.surfaceVariant
                    )
                    lock.policy?.let {
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(it, fontSize = 12.sp, color = TextMuted)
                    }
                }

                SectionCard {
                    Text("Các đơn bị tính", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = TextSecondary)
                    Spacer(modifier = Modifier.height(6.dp))
                    if (lock.noshowRecords.isEmpty()) {
                        Text("Không có lần vắng mặt nào trong 30 ngày qua.", fontSize = 13.sp, color = TextMuted)
                    } else {
                        lock.noshowRecords.forEach { record ->
                            // Backend chỉ trả orderId; ghép mã đơn/cửa hàng nếu đơn có trong phiên.
                            val known = knownOrders.find { it.id == record.orderId }
                            Row(
                                modifier = Modifier.fillMaxWidth().padding(vertical = 6.dp),
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(
                                        known?.orderCode ?: "Đơn #${record.orderId.take(8).uppercase()}",
                                        fontSize = 13.sp,
                                        fontWeight = FontWeight.SemiBold,
                                        color = TextPrimary
                                    )
                                    known?.let { Text(it.deal.storeName, fontSize = 12.sp, color = TextSecondary) }
                                }
                                Text(formatDate(record.occurredAt), fontSize = 12.sp, color = TextMuted)
                            }
                        }
                    }
                }

                SectionCard {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.Lightbulb, contentDescription = null, tint = WarningOnLight, modifier = Modifier.size(18.dp))
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("Mẹo tránh bị khóa", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = TextSecondary)
                    }
                    Spacer(modifier = Modifier.height(6.dp))
                    lockTips.forEach { Text("• $it", fontSize = 13.sp, color = TextPrimary, modifier = Modifier.padding(vertical = 2.dp)) }
                }
            }
        }
    }
}
