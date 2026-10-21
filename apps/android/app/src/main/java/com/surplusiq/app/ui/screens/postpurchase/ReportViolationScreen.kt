package com.surplusiq.app.ui.screens.postpurchase

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Info
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.surplusiq.app.data.remote.dto.ViolationReportResponse
import com.surplusiq.app.ui.components.BackTopBar
import com.surplusiq.app.ui.components.EmptyState
import com.surplusiq.app.ui.components.SectionCard
import com.surplusiq.app.ui.theme.CoralRed
import com.surplusiq.app.ui.theme.ForestGreenPrimary
import com.surplusiq.app.ui.theme.TextMuted
import com.surplusiq.app.ui.theme.TextPrimary
import com.surplusiq.app.ui.theme.TextSecondary

/** Đối tượng có thể báo cáo; type khớp ViolationTargetType backend (STORE, DEAL, REVIEW). */
data class ReportTarget(val type: String, val id: String, val label: String)

private val targetTypes = listOf("STORE" to "Cửa hàng", "DEAL" to "Deal", "REVIEW" to "Đánh giá")
private val reportReasons = listOf(
    "Mô tả sai sự thật",
    "Nội dung xúc phạm",
    "Hành vi đáng ngờ",
    "Vệ sinh an toàn thực phẩm",
    "Khác"
)
private const val MAX_DESCRIPTION = 300

/** K39 - Báo cáo vi phạm (R1-069). */
@OptIn(ExperimentalLayoutApi::class)
@Composable
fun ReportViolationScreen(
    targets: List<ReportTarget>,
    initialTargetId: String?,
    isSubmitting: Boolean,
    errorMessage: String?,
    submitted: ViolationReportResponse?,
    onBackClick: () -> Unit,
    onSubmit: (targetType: String, targetId: String, reason: String) -> Unit
) {
    val initial = targets.find { it.id == initialTargetId }
    var type by remember { mutableStateOf(initial?.type ?: "STORE") }
    var targetId by remember { mutableStateOf(initial?.id) }
    var reason by remember { mutableStateOf<String?>(null) }
    var description by remember { mutableStateOf("") }
    val options = targets.filter { it.type == type }
    // Backend chỉ có trường reason (≤500 ký tự): gộp lý do + mô tả vào đó.
    val composedReason = reason?.let { r -> if (description.isBlank()) r else "$r: ${description.trim()}" }
    val canSubmit = targetId != null && options.any { it.id == targetId } && composedReason != null && !isSubmitting

    Column(modifier = Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background)) {
        BackTopBar("Báo cáo vi phạm", onBackClick)
        if (submitted != null) {
            EmptyState(
                icon = Icons.Default.CheckCircle,
                title = "Chúng tôi đã nhận báo cáo",
                subtitle = "Đội ngũ kiểm duyệt sẽ xem xét. Cảm ơn bạn đã giúp cộng đồng Cứu Món an toàn hơn.",
                action = {
                    Button(
                        onClick = onBackClick,
                        shape = RoundedCornerShape(22.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = ForestGreenPrimary)
                    ) { Text("Xong") }
                }
            )
        } else {
        Column(
            modifier = Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            SectionCard {
                Text("Bạn muốn báo cáo", fontSize = 14.sp, fontWeight = FontWeight.SemiBold, color = TextPrimary)
                Spacer(modifier = Modifier.height(8.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    targetTypes.forEach { (value, label) ->
                        FilterChip(
                            selected = type == value,
                            onClick = {
                                type = value
                                targetId = targets.firstOrNull { it.type == value }?.id
                            },
                            label = { Text(label) }
                        )
                    }
                }
                Spacer(modifier = Modifier.height(8.dp))
                if (options.isEmpty()) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.Info, contentDescription = null, tint = TextMuted, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            if (type == "REVIEW") "Chưa hỗ trợ chọn đánh giá để báo cáo trên ứng dụng."
                            else "Không có đối tượng nào để chọn.",
                            fontSize = 12.sp,
                            color = TextMuted
                        )
                    }
                } else {
                    options.forEach { option ->
                        Row(
                            modifier = Modifier.fillMaxWidth().clickable { targetId = option.id },
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            RadioButton(selected = targetId == option.id, onClick = { targetId = option.id })
                            Text(option.label, fontSize = 14.sp, color = TextPrimary)
                        }
                    }
                }
            }

            SectionCard {
                Text("Lý do", fontSize = 14.sp, fontWeight = FontWeight.SemiBold, color = TextPrimary)
                Spacer(modifier = Modifier.height(8.dp))
                FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    reportReasons.forEach { item ->
                        FilterChip(selected = reason == item, onClick = { reason = item }, label = { Text(item, fontSize = 13.sp) })
                    }
                }
                Spacer(modifier = Modifier.height(8.dp))
                OutlinedTextField(
                    value = description,
                    onValueChange = { if (it.length <= MAX_DESCRIPTION) description = it },
                    label = { Text("Mô tả thêm (tùy chọn)") },
                    supportingText = { Text("${description.length}/$MAX_DESCRIPTION") },
                    modifier = Modifier.fillMaxWidth(),
                    minLines = 3,
                    shape = RoundedCornerShape(10.dp)
                )
                Text(
                    "Đính kèm ảnh chưa được hỗ trợ cho báo cáo vi phạm.",
                    fontSize = 12.sp,
                    color = TextMuted
                )
            }

            errorMessage?.let { Text(it, fontSize = 13.sp, color = CoralRed) }

            Button(
                onClick = { onSubmit(type, targetId!!, composedReason!!) },
                enabled = canSubmit,
                modifier = Modifier.fillMaxWidth().height(50.dp),
                shape = RoundedCornerShape(25.dp),
                colors = ButtonDefaults.buttonColors(containerColor = ForestGreenPrimary)
            ) {
                if (isSubmitting) CircularProgressIndicator(color = Color.White, strokeWidth = 2.dp, modifier = Modifier.size(18.dp))
                else Text("Gửi báo cáo", fontWeight = FontWeight.Bold, color = Color.White)
            }
            Text(
                "Báo cáo sai sự thật có thể ảnh hưởng tới tài khoản của bạn.",
                fontSize = 11.sp,
                color = TextSecondary
            )
        }
        }
    }
}
