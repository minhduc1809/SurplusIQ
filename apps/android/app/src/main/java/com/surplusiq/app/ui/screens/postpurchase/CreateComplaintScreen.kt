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
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Image
import androidx.compose.material.icons.filled.Schedule
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.surplusiq.app.domain.model.ActiveOrder
import com.surplusiq.app.domain.repository.InteractionsRepository
import com.surplusiq.app.ui.screens.basket.BasketFrame
import com.surplusiq.app.ui.screens.basket.CONTENT_MAX_WIDTH
import com.surplusiq.app.ui.screens.basket.Pill
import com.surplusiq.app.ui.screens.basket.PrimaryAction
import com.surplusiq.app.ui.screens.basket.SectionLabel
import com.surplusiq.app.ui.theme.CoralRed
import com.surplusiq.app.ui.theme.DividerColor
import com.surplusiq.app.ui.theme.LilacWash
import com.surplusiq.app.ui.theme.SkyBlueContainer
import com.surplusiq.app.ui.theme.SkyBluePrimary
import com.surplusiq.app.ui.theme.SurfaceSubtle
import com.surplusiq.app.ui.theme.TextMuted
import com.surplusiq.app.ui.theme.TextPrimary
import com.surplusiq.app.ui.theme.TextSecondary
import kotlinx.coroutines.launch

/** Lý do khiếu nại: [value] là mã gửi lên máy chủ (giữ nguyên), [hint] là mô tả ngắn giúp chọn đúng. */
private data class ComplaintReason(val value: String, val title: String, val hint: String, val tag: String? = null)

private val REASONS = listOf(
    ComplaintReason("Thức ăn ôi thiu / biến chất (An toàn thực phẩm)", "Thức ăn ôi thiu / biến chất", "Mùi vị bất thường, đổ hỏng, chưa cho hoặc không thể dùng được", "An toàn"),
    ComplaintReason("Không đúng loại món như mô tả", "Không đúng loại món như mô tả", "Món khác xa so với loại thực phẩm gói cứu trợ cam kết"),
    ComplaintReason("Thiếu số lượng / trọng lượng", "Thiếu số lượng / trọng lượng", "Thiếu phần ăn kèm, nước chấm, hoặc định lượng quá ít"),
    ComplaintReason("Cửa hàng đóng cửa khi đến nhận", "Cửa hàng đóng cửa khi đến nhận", "Đến trong khung giờ hẹn nhưng quán không mở cửa phục vụ"),
    ComplaintReason("Khác", "Lý do khác", "Vấn đề đặc biệt phát sinh trong quá trình nhận món")
)
private const val MAX_PHOTOS = 3

/** Gửi khiếu nại (R1-061): lý do, mô tả 10 đến 500 ký tự, tối đa 3 ảnh bằng chứng. Một cột trên điện thoại, căn giữa trên màn rộng. */
@Composable
fun CreateComplaintScreen(
    order: ActiveOrder,
    interactionsRepository: InteractionsRepository,
    onUploadEvidence: ((ByteArray, String, (Boolean, String?) -> Unit) -> Unit)? = null,
    onBackClick: () -> Unit,
    onSubmitSuccess: () -> Unit,
    modifier: Modifier = Modifier
) {
    val scope = rememberCoroutineScope()
    val context = LocalContext.current
    var reason by remember { mutableStateOf(REASONS.first()) }
    var description by remember { mutableStateOf("") }
    val photos = remember { mutableStateListOf<String>() }
    var isSubmitting by remember { mutableStateOf(false) }
    var isUploading by remember { mutableStateOf(false) }
    var createdCode by remember { mutableStateOf<String?>(null) }
    var errorMessage by remember { mutableStateOf<String?>(null) }

    val picker = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri: Uri? ->
        if (uri == null) return@rememberLauncherForActivityResult
        runCatching { context.contentResolver.openInputStream(uri)?.use { it.readBytes() } }.getOrNull()?.takeIf { it.isNotEmpty() }?.let { bytes ->
            if (onUploadEvidence != null) {
                isUploading = true
                onUploadEvidence(bytes, "evidence_${System.currentTimeMillis()}.jpg") { ok, url ->
                    isUploading = false
                    if (ok && url != null) photos.add(url) else errorMessage = "Không tải được ảnh lên máy chủ."
                }
            } else errorMessage = "Chưa thể tải ảnh bằng chứng."
        } ?: run { errorMessage = "Không đọc được ảnh đã chọn." }
    }

    val valid = description.trim().length >= 10
    BasketFrame(
        title = "Khiếu nại đơn hàng",
        subtitle = "Đơn ${order.orderCode}",
        onBack = onBackClick,
        modifier = modifier,
        bottomBar = {
            Column(Modifier.fillMaxWidth()) {
                errorMessage?.let { Text(it, color = CoralRed, fontSize = 12.sp, modifier = Modifier.padding(bottom = 6.dp)) }
                PrimaryAction("Gửi khiếu nại", enabled = valid, loading = isSubmitting, modifier = Modifier.fillMaxWidth()) {
                    errorMessage = null
                    isSubmitting = true
                    scope.launch {
                        val result = interactionsRepository.submitComplaint(order.id, reason.value, description.trim(), photos.toList())
                        isSubmitting = false
                        result.fold(
                            onSuccess = { createdCode = it.id.take(8).uppercase() },
                            onFailure = { errorMessage = it.message ?: "Có lỗi xảy ra khi gửi khiếu nại." }
                        )
                    }
                }
                Text("Cửa hàng phản hồi trong 48 giờ, quá hạn hệ thống hoàn tiền cho bạn.", fontSize = 11.sp, color = TextMuted, textAlign = TextAlign.Center, modifier = Modifier.fillMaxWidth().padding(top = 6.dp))
            }
        }
    ) { inner ->
        Box(Modifier.padding(inner).fillMaxSize(), contentAlignment = Alignment.TopCenter) {
            Column(
                Modifier.widthIn(max = CONTENT_MAX_WIDTH).fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                Row(Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(SkyBlueContainer).padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.Schedule, contentDescription = null, tint = SkyBluePrimary, modifier = Modifier.size(20.dp))
                    Spacer(Modifier.width(10.dp))
                    Text("Chỉ nhận khiếu nại trong 24 giờ sau khi nhận hàng.", fontSize = 13.sp, color = TextPrimary, lineHeight = 18.sp)
                }

                OrderSummary(order)

                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("Lý do khiếu nại", fontWeight = FontWeight.ExtraBold, fontSize = 18.sp, color = TextPrimary)
                    Text("Chọn 1 lý do phản ánh đúng tình trạng của đơn", fontSize = 12.sp, color = TextSecondary)
                    REASONS.forEach { r -> ReasonCard(r, selected = reason == r) { reason = r } }
                }

                Column {
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                        Text("Mô tả chi tiết vấn đề", fontWeight = FontWeight.ExtraBold, fontSize = 18.sp, color = TextPrimary)
                        Text("${description.length}/500", fontSize = 12.sp, color = TextMuted)
                    }
                    Spacer(Modifier.height(8.dp))
                    OutlinedTextField(
                        value = description,
                        onValueChange = { description = it.take(500) },
                        placeholder = { Text("Nêu rõ tình trạng món ăn, bao bì khi nhận hoặc lý do không hài lòng") },
                        modifier = Modifier.fillMaxWidth().heightIn(min = 140.dp),
                        shape = RoundedCornerShape(16.dp),
                        supportingText = { Text(if (valid) "Đủ nội dung" else "Tối thiểu 10 ký tự", color = if (valid) TextSecondary else CoralRed, fontSize = 11.sp) }
                    )
                }

                Column {
                    Text("Ảnh chụp bằng chứng (${photos.size}/$MAX_PHOTOS)", fontWeight = FontWeight.ExtraBold, fontSize = 18.sp, color = TextPrimary)
                    Spacer(Modifier.height(8.dp))
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        repeat(MAX_PHOTOS) { index ->
                            val url = photos.getOrNull(index)
                            val slotMod = Modifier.weight(1f).aspectRatio(1f).clip(RoundedCornerShape(16.dp))
                            when {
                                url != null -> Box(slotMod.background(SurfaceSubtle)) {
                                    AsyncImage(
                                        model = if (url.startsWith("http") || url.startsWith("content://")) url else com.surplusiq.app.BuildConfig.API_BASE_URL.trimEnd('/') + url,
                                        contentDescription = "Ảnh bằng chứng ${index + 1}", contentScale = ContentScale.Crop, modifier = Modifier.fillMaxSize()
                                    )
                                    IconButton(
                                        onClick = { photos.removeAt(index) },
                                        modifier = Modifier.align(Alignment.TopEnd).padding(4.dp).size(26.dp).background(Color.Black.copy(alpha = 0.6f), CircleShape)
                                    ) { Icon(Icons.Default.Close, contentDescription = "Xóa ảnh", tint = Color.White, modifier = Modifier.size(14.dp)) }
                                }
                                index == photos.size -> Column(
                                    slotMod.background(SkyBlueContainer).border(1.dp, SkyBluePrimary.copy(alpha = 0.4f), RoundedCornerShape(16.dp))
                                        .clickable(enabled = !isUploading) { picker.launch("image/*") },
                                    horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center
                                ) {
                                    if (isUploading) CircularProgressIndicator(Modifier.size(24.dp), color = SkyBluePrimary, strokeWidth = 2.dp)
                                    else {
                                        Icon(Icons.Default.AddAPhoto, contentDescription = "Thêm ảnh", tint = SkyBluePrimary, modifier = Modifier.size(26.dp))
                                        Text("Tải ảnh", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = SkyBluePrimary, modifier = Modifier.padding(top = 4.dp))
                                    }
                                }
                                else -> Box(slotMod.background(SurfaceSubtle), contentAlignment = Alignment.Center) {
                                    Icon(Icons.Default.Image, contentDescription = null, tint = TextMuted, modifier = Modifier.size(24.dp))
                                }
                            }
                        }
                    }
                    Text("Chụp rõ món ăn, nhãn dán túi cứu trợ và tem niêm phong nếu có để xử lý nhanh hơn.", fontSize = 12.sp, color = TextSecondary, lineHeight = 17.sp, modifier = Modifier.padding(top = 8.dp))
                }
                Spacer(Modifier.height(8.dp))
            }
        }
    }

    createdCode?.let { code ->
        AlertDialog(
            onDismissRequest = { createdCode = null; onSubmitSuccess() },
            icon = { Icon(Icons.Default.CheckCircle, contentDescription = null, tint = SkyBluePrimary, modifier = Modifier.size(44.dp)) },
            title = { Text("Đã tiếp nhận khiếu nại", fontWeight = FontWeight.ExtraBold) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    Text("Mã khiếu nại: $code", fontWeight = FontWeight.Bold, color = TextPrimary)
                    Text("Cửa hàng đã được thông báo và có tối đa 48 giờ để xử lý. Quá hạn, bạn được hoàn tiền 100%.", fontSize = 13.sp, color = TextSecondary, lineHeight = 18.sp)
                }
            },
            confirmButton = { TextButton(onClick = { createdCode = null; onSubmitSuccess() }) { Text("Đã hiểu", color = SkyBluePrimary, fontWeight = FontWeight.Bold) } }
        )
    }
}

@Composable
private fun OrderSummary(order: ActiveOrder) {
    Column(Modifier.fillMaxWidth().clip(RoundedCornerShape(20.dp)).background(MaterialTheme.colorScheme.surface).border(1.dp, DividerColor, RoundedCornerShape(20.dp)).padding(14.dp)) {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
            SectionLabel("Đơn #${order.orderCode}")
            Pill("Đã nhận hàng", LilacWash, com.surplusiq.app.ui.screens.basket.LilacInk)
        }
        Spacer(Modifier.height(10.dp))
        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(Modifier.size(64.dp).clip(RoundedCornerShape(14.dp)).background(SurfaceSubtle)) {
                if (order.deal.coverImageUrl.isNotBlank()) AsyncImage(model = order.deal.coverImageUrl, contentDescription = order.deal.title, contentScale = ContentScale.Crop, modifier = Modifier.fillMaxSize())
            }
            Spacer(Modifier.width(12.dp))
            Column(Modifier.weight(1f)) {
                Text(order.deal.storeName, fontWeight = FontWeight.ExtraBold, fontSize = 15.sp, color = TextPrimary, maxLines = 2)
                Text(order.deal.title, fontSize = 12.sp, color = TextSecondary, maxLines = 2)
                Text("%,d ₫".format(order.totalPrice), fontWeight = FontWeight.ExtraBold, fontSize = 15.sp, color = SkyBluePrimary, modifier = Modifier.padding(top = 2.dp))
            }
        }
    }
}

@Composable
private fun ReasonCard(r: ComplaintReason, selected: Boolean, onClick: () -> Unit) {
    Row(
        Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp))
            .background(if (selected) SkyBlueContainer else MaterialTheme.colorScheme.surface)
            .border(if (selected) 1.5.dp else 1.dp, if (selected) SkyBluePrimary else DividerColor, RoundedCornerShape(16.dp))
            .clickable(onClick = onClick).padding(14.dp),
        verticalAlignment = Alignment.Top
    ) {
        RadioButton(selected = selected, onClick = null, colors = RadioButtonDefaults.colors(selectedColor = SkyBluePrimary), modifier = Modifier.padding(top = 2.dp))
        Spacer(Modifier.width(10.dp))
        Column(Modifier.weight(1f)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(r.title, fontSize = 14.sp, fontWeight = FontWeight.ExtraBold, color = TextPrimary, modifier = Modifier.weight(1f, fill = false))
                if (r.tag != null) { Spacer(Modifier.width(8.dp)); Pill(r.tag, SkyBluePrimary, Color.White) }
            }
            Text(r.hint, fontSize = 12.sp, color = TextSecondary, lineHeight = 16.sp, modifier = Modifier.padding(top = 2.dp))
        }
    }
}
