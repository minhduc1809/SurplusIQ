package com.surplusiq.app.ui.screens.postpurchase

import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AddAPhoto
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.surplusiq.app.data.remote.dto.ComplaintResponse
import com.surplusiq.app.ui.screens.basket.BasketCardBox
import com.surplusiq.app.ui.screens.basket.BasketFrame
import com.surplusiq.app.ui.screens.basket.CONTENT_MAX_WIDTH
import com.surplusiq.app.ui.screens.basket.LilacInk
import com.surplusiq.app.ui.screens.basket.Pill
import com.surplusiq.app.ui.screens.basket.PrimaryAction
import com.surplusiq.app.ui.screens.basket.SectionLabel
import com.surplusiq.app.ui.theme.CoralRed
import com.surplusiq.app.ui.theme.LilacWash
import com.surplusiq.app.ui.theme.SkyBlueContainer
import com.surplusiq.app.ui.theme.SkyBluePrimary
import com.surplusiq.app.ui.theme.SurfaceSubtle
import com.surplusiq.app.ui.theme.TextMuted
import com.surplusiq.app.ui.theme.TextPrimary
import com.surplusiq.app.ui.theme.TextSecondary
import com.surplusiq.app.ui.util.formatDateTime
import com.surplusiq.app.ui.util.formatVnd

// Backend: tối đa 3 ảnh bổ sung mỗi lần, tổng 5 ảnh mỗi khiếu nại (R1-068).
private const val MAX_EXTRA_PER_SUBMIT = 3
private const val MAX_TOTAL_PHOTOS = 5

/** K36 - Chi tiết khiếu nại (R1-062, R1-063, R1-068): nội dung đã gửi, dòng thời gian, bổ sung ảnh bằng chứng, rút khiếu nại. */
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
    onWithdraw: () -> Unit,
    onUploadPhoto: ((ByteArray, String, (Boolean, String?) -> Unit) -> Unit)? = null
) {
    var showWithdrawDialog by remember { mutableStateOf(false) }

    BasketFrame(title = "Chi tiết khiếu nại", subtitle = complaint?.orderCode?.let { "Đơn $it" }, onBack = onBackClick) { inner ->
        Box(Modifier.padding(inner).fillMaxSize(), contentAlignment = Alignment.TopCenter) {
            when {
                errorMessage != null -> Column(Modifier.fillMaxSize().padding(24.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
                    Text(errorMessage, color = CoralRed, fontSize = 14.sp)
                    TextButton(onClick = onRetry) { Text("Thử lại", color = SkyBluePrimary) }
                }
                complaint == null || (isLoading && complaint == null) -> CircularProgressIndicator(Modifier.padding(32.dp), color = SkyBluePrimary)
                else -> {
                    val (statusText, statusColor) = complaintStatusLabel(complaint.status)
                    val photos = complaint.attachments ?: complaint.imageUrls
                    Column(
                        Modifier.widthIn(max = CONTENT_MAX_WIDTH).fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(14.dp)
                    ) {
                        BasketCardBox {
                            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                                Text(complaint.orderCode?.let { "Đơn #$it" } ?: "Đơn #${complaint.orderId.take(8).uppercase()}", fontSize = 18.sp, fontWeight = FontWeight.ExtraBold, color = TextPrimary)
                                Pill(statusText, if (complaint.status == "PENDING_STORE") SkyBlueContainer else if (complaint.status == "ACCEPTED") LilacWash else SurfaceSubtle, statusColor)
                            }
                            complaint.store?.let { s ->
                                Text(s.name, fontSize = 14.sp, fontWeight = FontWeight.SemiBold, color = TextPrimary, modifier = Modifier.padding(top = 8.dp))
                                s.address?.let { Text(it, fontSize = 12.sp, color = TextSecondary) }
                                s.phone?.let { Text("SĐT $it", fontSize = 12.sp, color = TextSecondary) }
                            }
                            if ((complaint.refundAmount ?: 0) > 0) {
                                Row(Modifier.fillMaxWidth().padding(top = 10.dp), horizontalArrangement = Arrangement.SpaceBetween) {
                                    Text("Số tiền hoàn", fontSize = 13.sp, color = TextSecondary)
                                    Text(formatVnd(complaint.refundAmount), fontSize = 16.sp, fontWeight = FontWeight.ExtraBold, color = SkyBluePrimary)
                                }
                            }
                        }

                        BasketCardBox {
                            SectionLabel("Nội dung đã gửi")
                            Text(complaint.category, fontSize = 14.sp, fontWeight = FontWeight.ExtraBold, color = TextPrimary, modifier = Modifier.padding(top = 8.dp))
                            Text(complaint.description, fontSize = 14.sp, color = TextPrimary, lineHeight = 20.sp, modifier = Modifier.padding(top = 4.dp))
                            if (photos.isNotEmpty()) {
                                Spacer(Modifier.height(12.dp))
                                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                    photos.take(MAX_TOTAL_PHOTOS).forEach { url ->
                                        Box(Modifier.weight(1f).aspectRatio(1f).clip(RoundedCornerShape(14.dp)).background(SurfaceSubtle)) {
                                            AsyncImage(model = url, contentDescription = "Ảnh bằng chứng", contentScale = ContentScale.Crop, modifier = Modifier.fillMaxSize())
                                        }
                                    }
                                }
                            }
                        }

                        BasketCardBox {
                            SectionLabel("Dòng thời gian")
                            Spacer(Modifier.height(8.dp))
                            TimelineItem("Bạn gửi khiếu nại", formatDateTime(complaint.createdAt), SkyBluePrimary)
                            when (complaint.status) {
                                "PENDING_STORE" -> TimelineItem("Chờ cửa hàng phản hồi", complaint.responseDueAt?.let { "Hạn ${formatDateTime(it)}" } ?: "", TextMuted)
                                "ACCEPTED" -> TimelineItem(
                                    if (complaint.autoAccepted == true) "Tự động chấp nhận do cửa hàng quá hạn" else "Cửa hàng chấp nhận hoàn tiền",
                                    "Hoàn ${formatVnd(complaint.refundAmount)}", LilacInk
                                )
                                "REJECTED" -> TimelineItem("Cửa hàng từ chối", complaint.rejectReason ?: "", CoralRed)
                                "CLOSED" -> TimelineItem("Khiếu nại đã đóng", complaint.rejectReason ?: "", TextMuted)
                            }
                        }

                        actionMessage?.let { Text(it, fontSize = 13.sp, color = TextSecondary) }

                        if (complaint.status == "PENDING_STORE") {
                            key(photos.size) {
                                EvidenceBlock(
                                    remainingSlots = (MAX_TOTAL_PHOTOS - photos.size).coerceIn(0, MAX_EXTRA_PER_SUBMIT),
                                    isSubmitting = isActionLoading,
                                    onUpload = onUploadPhoto,
                                    onSubmit = onAddEvidence
                                )
                            }
                            OutlinedButton(
                                onClick = { showWithdrawDialog = true },
                                enabled = !isActionLoading,
                                shape = RoundedCornerShape(16.dp),
                                modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp)
                            ) { Text("Rút khiếu nại", color = CoralRed, fontWeight = FontWeight.SemiBold) }
                        }
                        Spacer(Modifier.height(8.dp))
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
            confirmButton = { TextButton(onClick = { showWithdrawDialog = false; onWithdraw() }) { Text("Rút khiếu nại", color = CoralRed, fontWeight = FontWeight.Bold) } },
            dismissButton = { TextButton(onClick = { showWithdrawDialog = false }) { Text("Đóng", color = TextSecondary) } }
        )
    }
}

@Composable
private fun TimelineItem(title: String, subtitle: String, color: Color) {
    Row(Modifier.padding(vertical = 5.dp), verticalAlignment = Alignment.Top) {
        Box(Modifier.padding(top = 5.dp).size(10.dp).background(color, CircleShape))
        Spacer(Modifier.width(12.dp))
        Column {
            Text(title, fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = TextPrimary)
            if (subtitle.isNotBlank()) Text(subtitle, fontSize = 12.sp, color = TextSecondary)
        }
    }
}

/** Bổ sung bằng chứng: chọn ảnh từ máy, tải lên máy chủ rồi gửi đường dẫn ảnh đã tải (không còn dán đường dẫn thủ công). */
@Composable
private fun EvidenceBlock(
    remainingSlots: Int,
    isSubmitting: Boolean,
    onUpload: ((ByteArray, String, (Boolean, String?) -> Unit) -> Unit)?,
    onSubmit: (List<String>) -> Unit
) {
    val context = LocalContext.current
    val urls = remember { mutableStateListOf<String>() }
    var uploading by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    val picker = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri: Uri? ->
        if (uri == null || onUpload == null) return@rememberLauncherForActivityResult
        val bytes = runCatching { context.contentResolver.openInputStream(uri)?.use { it.readBytes() } }.getOrNull()
        if (bytes == null || bytes.isEmpty()) { error = "Không đọc được ảnh đã chọn."; return@rememberLauncherForActivityResult }
        uploading = true
        error = null
        onUpload(bytes, "evidence_${System.currentTimeMillis()}.jpg") { ok, url ->
            uploading = false
            if (ok && url != null) urls.add(url) else error = "Không tải được ảnh lên máy chủ."
        }
    }

    BasketCardBox {
        SectionLabel("Bổ sung bằng chứng")
        Text(
            if (remainingSlots == 0) "Đã đủ $MAX_TOTAL_PHOTOS ảnh cho khiếu nại này." else "Thêm tối đa $remainingSlots ảnh.",
            fontSize = 12.sp, color = TextSecondary, modifier = Modifier.padding(top = 4.dp)
        )
        if (remainingSlots > 0) {
            Spacer(Modifier.height(10.dp))
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                repeat(MAX_EXTRA_PER_SUBMIT) { i ->
                    val slotMod = Modifier.weight(1f).aspectRatio(1f).clip(RoundedCornerShape(16.dp))
                    val url = urls.getOrNull(i)
                    when {
                        i >= remainingSlots -> Box(slotMod.background(SurfaceSubtle))
                        url != null -> Box(slotMod.background(SurfaceSubtle)) {
                            AsyncImage(model = if (url.startsWith("http")) url else com.surplusiq.app.BuildConfig.API_BASE_URL.trimEnd('/') + url, contentDescription = "Ảnh bổ sung", contentScale = ContentScale.Crop, modifier = Modifier.fillMaxSize())
                            IconButton(onClick = { urls.removeAt(i) }, modifier = Modifier.align(Alignment.TopEnd).padding(4.dp).size(26.dp).background(Color.Black.copy(alpha = 0.6f), CircleShape)) {
                                Icon(Icons.Default.Close, contentDescription = "Xóa ảnh", tint = Color.White, modifier = Modifier.size(14.dp))
                            }
                        }
                        i == urls.size -> Column(
                            slotMod.background(SkyBlueContainer).border(1.dp, SkyBluePrimary.copy(alpha = 0.4f), RoundedCornerShape(16.dp)).clickable(enabled = !uploading && onUpload != null) { picker.launch("image/*") },
                            horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center
                        ) {
                            if (uploading) CircularProgressIndicator(Modifier.size(24.dp), color = SkyBluePrimary, strokeWidth = 2.dp)
                            else {
                                Icon(Icons.Default.AddAPhoto, contentDescription = "Thêm ảnh", tint = SkyBluePrimary, modifier = Modifier.size(26.dp))
                                Text("Tải ảnh", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = SkyBluePrimary, modifier = Modifier.padding(top = 4.dp))
                            }
                        }
                        else -> Box(slotMod.background(SurfaceSubtle))
                    }
                }
            }
            error?.let { Text(it, color = CoralRed, fontSize = 12.sp, modifier = Modifier.padding(top = 8.dp)) }
            Spacer(Modifier.height(12.dp))
            PrimaryAction("Gửi bằng chứng", enabled = urls.isNotEmpty(), loading = isSubmitting, modifier = Modifier.fillMaxWidth()) { onSubmit(urls.toList()) }
        }
    }
}
