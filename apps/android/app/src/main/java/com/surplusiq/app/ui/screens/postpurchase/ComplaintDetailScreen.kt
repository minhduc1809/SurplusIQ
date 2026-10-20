package com.surplusiq.app.ui.screens.postpurchase

import android.util.Patterns
import androidx.compose.foundation.background
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AddPhotoAlternate
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.surplusiq.app.data.remote.dto.ComplaintResponse
import com.surplusiq.app.ui.components.BackTopBar
import com.surplusiq.app.ui.components.ErrorState
import com.surplusiq.app.ui.components.LabelValueRow
import com.surplusiq.app.ui.components.LoadingState
import com.surplusiq.app.ui.components.SectionCard
import com.surplusiq.app.ui.components.StatusChip
import com.surplusiq.app.ui.theme.CoralRed
import com.surplusiq.app.ui.theme.ForestGreenPrimary
import com.surplusiq.app.ui.theme.MintDeep
import com.surplusiq.app.ui.theme.TextMuted
import com.surplusiq.app.ui.theme.TextPrimary
import com.surplusiq.app.ui.theme.TextSecondary
import com.surplusiq.app.ui.theme.WarningOnLight
import com.surplusiq.app.ui.util.formatDateTime
import com.surplusiq.app.ui.util.formatVnd

// Backend: tối đa 3 ảnh bổ sung mỗi lần, tổng 5 ảnh mỗi khiếu nại (R1-068).
private const val MAX_EXTRA_PER_SUBMIT = 3
private const val MAX_TOTAL_PHOTOS = 5

/** K36 - Chi tiết khiếu nại (R1-062, R1-063, R1-068). */
@Composable
fun ComplaintDetailScreen(
    complaint: ComplaintResponse?,
    isLoading: Boolean,
    errorMessage: String?,
    isActionLoading: Boolean,
    actionMessage: String?,
    onBackClick: () -> Unit,
    onRetry: () -> Unit,
    onAddEvidence: (List<String>) -> Unit,
    onWithdraw: () -> Unit
) {
    var showWithdrawDialog by remember { mutableStateOf(false) }

    Column(modifier = Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background)) {
        BackTopBar("Chi tiết khiếu nại", onBackClick)
        when {
            isLoading && complaint == null -> LoadingState()
            errorMessage != null -> ErrorState(errorMessage, onRetry)
            complaint == null -> LoadingState()
            else -> Column(
                modifier = Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp)
            ) {
                val (statusText, statusColor) = complaintStatusLabel(complaint.status)
                val photos = complaint.attachments ?: complaint.imageUrls
                val isPending = complaint.status == "PENDING_STORE"

                SectionCard {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            complaint.orderCode ?: "Đơn #${complaint.orderId.take(8).uppercase()}",
                            fontSize = 17.sp,
                            fontWeight = FontWeight.ExtraBold,
                            color = TextPrimary,
                            modifier = Modifier.weight(1f)
                        )
                        StatusChip(statusText, statusColor)
                    }
                    complaint.store?.let { store ->
                        Spacer(modifier = Modifier.height(6.dp))
                        Text(store.name, fontSize = 14.sp, fontWeight = FontWeight.SemiBold, color = TextPrimary)
                        store.address?.let { Text(it, fontSize = 12.sp, color = TextSecondary) }
                        store.phone?.let { Text("SĐT: $it", fontSize = 12.sp, color = TextSecondary) }
                    }
                    if ((complaint.refundAmount ?: 0) > 0) {
                        Spacer(modifier = Modifier.height(8.dp))
                        LabelValueRow("Số tiền hoàn", formatVnd(complaint.refundAmount), valueColor = ForestGreenPrimary, bold = true)
                    }
                }

                SectionCard {
                    Text("Nội dung bạn đã gửi", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = TextSecondary)
                    Spacer(modifier = Modifier.height(6.dp))
                    Text(complaint.category, fontSize = 14.sp, fontWeight = FontWeight.SemiBold, color = TextPrimary)
                    Text(complaint.description, fontSize = 14.sp, color = TextPrimary)
                    if (photos.isNotEmpty()) {
                        Spacer(modifier = Modifier.height(10.dp))
                        Row(
                            modifier = Modifier.horizontalScroll(rememberScrollState()),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            photos.forEach { url ->
                                AsyncImage(
                                    model = url,
                                    contentDescription = "Ảnh bằng chứng",
                                    contentScale = ContentScale.Crop,
                                    modifier = Modifier.size(84.dp).clip(RoundedCornerShape(10.dp))
                                        .background(MaterialTheme.colorScheme.surfaceVariant)
                                )
                            }
                        }
                    }
                }

                SectionCard {
                    Text("Dòng thời gian", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = TextSecondary)
                    Spacer(modifier = Modifier.height(8.dp))
                    TimelineItem("Bạn gửi khiếu nại", formatDateTime(complaint.createdAt), ForestGreenPrimary)
                    when (complaint.status) {
                        "PENDING_STORE" -> TimelineItem(
                            "Đang chờ cửa hàng phản hồi",
                            complaint.responseDueAt?.let { "Hạn phản hồi ${formatDateTime(it)}" } ?: "",
                            WarningOnLight
                        )
                        "ACCEPTED" -> TimelineItem(
                            if (complaint.autoAccepted == true) "Tự động chấp nhận do cửa hàng quá hạn phản hồi"
                            else "Cửa hàng chấp nhận hoàn tiền",
                            "Hoàn ${formatVnd(complaint.refundAmount)}",
                            MintDeep
                        )
                        "REJECTED" -> TimelineItem("Cửa hàng từ chối", complaint.rejectReason ?: "", CoralRed)
                        "CLOSED" -> TimelineItem("Khiếu nại đã đóng", complaint.rejectReason ?: "", TextMuted)
                    }
                }

                actionMessage?.let { Text(it, fontSize = 13.sp, color = TextSecondary) }

                if (isPending) {
                    // Chỉ xóa các URL đã nhập khi server ghi nhận (số ảnh tăng), giữ lại nếu gửi lỗi.
                    key(photos.size) {
                        EvidenceBlock(
                            remainingSlots = (MAX_TOTAL_PHOTOS - photos.size).coerceIn(0, MAX_EXTRA_PER_SUBMIT),
                            isSubmitting = isActionLoading,
                            onSubmit = onAddEvidence
                        )
                    }
                    OutlinedButton(
                        onClick = { showWithdrawDialog = true },
                        enabled = !isActionLoading,
                        modifier = Modifier.fillMaxWidth().height(46.dp),
                        shape = RoundedCornerShape(23.dp),
                        colors = ButtonDefaults.outlinedButtonColors(contentColor = CoralRed)
                    ) {
                        Text("Rút khiếu nại", fontWeight = FontWeight.SemiBold)
                    }
                }
            }
        }
    }

    if (showWithdrawDialog) {
        AlertDialog(
            onDismissRequest = { showWithdrawDialog = false },
            title = { Text("Rút khiếu nại?") },
            text = { Text("Chỉ rút khi bạn đã thỏa thuận ổn với cửa hàng. Khiếu nại sẽ chuyển sang Đã đóng.") },
            confirmButton = {
                TextButton(onClick = { showWithdrawDialog = false; onWithdraw() }) {
                    Text("Rút khiếu nại", color = CoralRed, fontWeight = FontWeight.Bold)
                }
            },
            dismissButton = { TextButton(onClick = { showWithdrawDialog = false }) { Text("Đóng") } }
        )
    }
}

@Composable
private fun TimelineItem(title: String, subtitle: String, color: Color) {
    Row(modifier = Modifier.padding(vertical = 4.dp), verticalAlignment = Alignment.Top) {
        Box(modifier = Modifier.padding(top = 5.dp).size(10.dp).background(color, CircleShape))
        Spacer(modifier = Modifier.width(10.dp))
        Column {
            Text(title, fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = TextPrimary)
            if (subtitle.isNotBlank()) Text(subtitle, fontSize = 12.sp, color = TextSecondary)
        }
    }
}

/**
 * "Bổ sung bằng chứng": backend chỉ nhận URL ảnh (chưa có API tải ảnh lên), nên khách dán
 * đường dẫn ảnh công khai. Ghi chú kèm theo không được backend lưu nên không thu thập.
 */
@Composable
private fun EvidenceBlock(remainingSlots: Int, isSubmitting: Boolean, onSubmit: (List<String>) -> Unit) {
    val urls = remember { mutableStateListOf<String>() }
    var input by remember { mutableStateOf("") }
    val inputValid = input.isNotBlank() && Patterns.WEB_URL.matcher(input.trim()).matches() &&
        input.trim().startsWith("http")

    SectionCard {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Icon(Icons.Default.AddPhotoAlternate, contentDescription = null, tint = ForestGreenPrimary, modifier = Modifier.size(20.dp))
            Spacer(modifier = Modifier.width(6.dp))
            Text("Bổ sung bằng chứng", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
        }
        Text(
            if (remainingSlots == 0) "Đã đạt tối đa $MAX_TOTAL_PHOTOS ảnh cho khiếu nại này."
            else "Thêm tối đa $remainingSlots đường dẫn ảnh (https://...).",
            fontSize = 12.sp,
            color = TextMuted
        )
        if (remainingSlots > 0) {
            Spacer(modifier = Modifier.height(8.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                OutlinedTextField(
                    value = input,
                    onValueChange = { input = it },
                    label = { Text("Đường dẫn ảnh") },
                    singleLine = true,
                    isError = input.isNotBlank() && !inputValid,
                    shape = RoundedCornerShape(10.dp),
                    modifier = Modifier.weight(1f)
                )
                Spacer(modifier = Modifier.width(8.dp))
                TextButton(
                    onClick = { urls.add(input.trim()); input = "" },
                    enabled = inputValid && urls.size < remainingSlots && input.trim() !in urls
                ) { Text("Thêm") }
            }
            urls.forEachIndexed { index, url ->
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(url, fontSize = 12.sp, color = TextSecondary, maxLines = 1, modifier = Modifier.weight(1f))
                    IconButton(onClick = { urls.removeAt(index) }) {
                        Icon(Icons.Default.Close, contentDescription = "Xóa", modifier = Modifier.size(16.dp))
                    }
                }
            }
            Spacer(modifier = Modifier.height(8.dp))
            Button(
                onClick = { onSubmit(urls.toList()) },
                enabled = urls.isNotEmpty() && !isSubmitting,
                modifier = Modifier.fillMaxWidth().height(46.dp),
                shape = RoundedCornerShape(23.dp),
                colors = ButtonDefaults.buttonColors(containerColor = ForestGreenPrimary)
            ) {
                if (isSubmitting) CircularProgressIndicator(color = Color.White, strokeWidth = 2.dp, modifier = Modifier.size(18.dp))
                else Text("Gửi bằng chứng", fontWeight = FontWeight.Bold, color = Color.White)
            }
        }
    }
}
