package com.surplusiq.merchant.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.surplusiq.merchant.data.CampaignAnalyticsDto
import com.surplusiq.merchant.data.CampaignDto
import com.surplusiq.merchant.data.CreateCampaignRequest
import com.surplusiq.merchant.data.StoreRepository
import com.surplusiq.merchant.data.UpdateCampaignRequest
import com.surplusiq.merchant.ui.components.*
import com.surplusiq.merchant.ui.theme.*
import kotlinx.coroutines.launch
import java.time.Duration
import java.time.Instant
import java.time.LocalDateTime
import java.time.ZoneId

/** Giờ gửi theo giờ Việt Nam; 22:00–07:00 là giờ giới nghiêm, backend từ chối (BR-086). */
private fun inCurfew(t: LocalDateTime): Boolean = t.atZone(ZoneId.systemDefault()).withZoneSameInstant(ZoneId.of("Asia/Ho_Chi_Minh")).hour.let { it >= 22 || it < 7 }

/**
 * S61/S62 - Chiến dịch thông báo (GET/POST store/marketing/campaigns, PATCH .../:id hủy, GET .../:id/analytics).
 * Chỉ sửa hoặc hủy được khi còn trên 15 phút trước giờ gửi. Hiệu quả: người nhận, tỷ lệ mở, đơn trong 24 giờ.
 * shortcut: chưa có soạn bằng AI và đề xuất ưu đãi (cần module AI), thêm ở đợt Trợ lý AI.
 */
@Composable
fun CampaignsScreen(repository: StoreRepository, onBack: () -> Unit) {
    var list by remember { mutableStateOf<List<CampaignDto>?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    var actionError by remember { mutableStateOf<String?>(null) }
    var creating by remember { mutableStateOf(false) }
    var cancelling by remember { mutableStateOf<CampaignDto?>(null) }
    var reloadKey by remember { mutableIntStateOf(0) }
    val scope = rememberCoroutineScope()

    LaunchedEffect(reloadKey) {
        error = null
        repository.getCampaigns().fold(onSuccess = { list = it }, onFailure = { error = it.message })
    }

    if (creating) {
        CampaignForm(repository, onCancel = { creating = false }, onCreated = { creating = false; list = null; reloadKey++ })
        return
    }

    LazyColumn(Modifier.fillMaxSize().background(SqCanvas), contentPadding = PaddingValues(20.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
        item {
            ScreenHeader("Chiến dịch thông báo", onBack)
            Spacer(Modifier.height(8.dp))
            PrimaryButton("＋ Tạo chiến dịch", onClick = { creating = true })
            InlineError(actionError)
        }
        val l = list
        when {
            error != null -> item { ErrorState(error!!) { reloadKey++ } }
            l == null -> item { FullScreenLoading() }
            l.isEmpty() -> item { EmptyState("Chưa có chiến dịch", "Lên lịch thông báo để nhắc khách về suất của quán.") }
            else -> items(l, key = { it.id }) { c -> CampaignCard(repository, c) { cancelling = c } }
        }
    }

    cancelling?.let { c ->
        ConfirmDialog(
            title = "Hủy chiến dịch?", message = "\"${c.title}\" sẽ không được gửi. Chỉ hủy được khi còn trên 15 phút trước giờ gửi.", confirmLabel = "Hủy chiến dịch",
            onDismiss = { cancelling = null },
            onConfirm = {
                cancelling = null; actionError = null
                scope.launch {
                    repository.updateCampaign(c.id, UpdateCampaignRequest(status = "CANCELLED"))
                        .fold(onSuccess = { reloadKey++ }, onFailure = { actionError = it.message })
                }
            }
        )
    }
}

@Composable
private fun CampaignCard(repository: StoreRepository, c: CampaignDto, onCancel: () -> Unit) {
    var analytics by remember { mutableStateOf<CampaignAnalyticsDto?>(null) }
    var loading by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()
    val canCancel = c.status == "SCHEDULED" && runCatching { Duration.between(Instant.now(), Instant.parse(c.scheduledAt)).toMinutes() >= 15 }.getOrDefault(false)

    SqCard {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(c.title, fontSize = 15.sp, fontWeight = FontWeight.Bold, color = SqInk, modifier = Modifier.weight(1f))
            StatusBadge(c.status)
        }
        Text(c.content, fontSize = 13.sp, color = SqInkSoft, maxLines = 3)
        Text("${PROMO_TARGETS.firstOrNull { it.first == c.target }?.second ?: c.target} · ${shortDateTime(c.scheduledAt)}", fontSize = 12.sp, color = SqInkMuted)
        analytics?.let {
            Spacer(Modifier.height(6.dp))
            InfoRow("Người nhận", "${it.metrics.recipientsCount}")
            InfoRow("Đã mở", "${it.metrics.openedCount} (${it.metrics.openRatePercent}%)")
            InfoRow("Đơn của người nhận trong 24 giờ", "${it.metrics.ordersWithin24h}")
            InfoRow("Doanh thu trong 24 giờ", currency(it.metrics.revenueGeneratedVnd))
            if (it.metrics.recipientsCount == 0) Text("Chưa có khách yêu thích nào đồng ý nhận ưu đãi nên chưa gửi cho ai.", fontSize = 11.sp, color = SqInkMuted)
        }
        InlineError(error)
        Row {
            if (c.status == "SENT" && analytics == null) TextButton(
                onClick = {
                    loading = true; error = null
                    scope.launch { repository.getCampaignAnalytics(c.id).fold(onSuccess = { analytics = it }, onFailure = { error = it.message }); loading = false }
                }, enabled = !loading, contentPadding = PaddingValues(0.dp)
            ) { Text(if (loading) "Đang tải…" else "Xem hiệu quả", color = SqCoralDeep) }
            if (canCancel) TextButton(onClick = onCancel, contentPadding = PaddingValues(0.dp)) { Text("Hủy chiến dịch", color = SqCoralDeep) }
        }
    }
}

@Composable
private fun CampaignForm(repository: StoreRepository, onCancel: () -> Unit, onCreated: () -> Unit) {
    var title by remember { mutableStateOf("") }
    var content by remember { mutableStateOf("") }
    var target by remember { mutableStateOf("ALL") }
    var at by remember { mutableStateOf<LocalDateTime?>(null) }
    var busy by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    val problem = when {
        title.isBlank() -> "Nhập tiêu đề."
        content.isBlank() -> "Nhập nội dung."
        at == null -> "Chọn thời điểm gửi."
        Duration.between(LocalDateTime.now(), at).toMinutes() < 15 -> "Thời điểm gửi phải cách hiện tại ít nhất 15 phút."
        inCurfew(at!!) -> "Không gửi thông báo từ 22:00 đến 07:00."
        else -> null
    }

    Column(Modifier.fillMaxSize().background(SqCanvas).verticalScroll(rememberScrollState()).padding(20.dp)) {
        ScreenHeader("Tạo chiến dịch", onCancel)
        Spacer(Modifier.height(12.dp))
        SqCard {
            SqField("Tiêu đề (tối đa 50 ký tự)", title) { title = it.take(50) }
            Spacer(Modifier.height(10.dp))
            SqField("Nội dung (tối đa 150 ký tự)", content, singleLine = false) { content = it.take(150) }
            Text("${content.length}/150", fontSize = 11.sp, color = SqInkMuted)
            Spacer(Modifier.height(10.dp))
            Text("Gửi cho", fontSize = 12.sp, color = SqInkSoft)
            ChipRow(PROMO_TARGETS, target) { target = it }
            Spacer(Modifier.height(10.dp))
            DateTimeField("Thời điểm gửi", at) { at = it }
        }
        Spacer(Modifier.height(12.dp))
        InlineError(error ?: problem.takeIf { title.isNotBlank() || at != null })
        PrimaryButton("Lên lịch gửi", enabled = problem == null && !busy, loading = busy, onClick = {
            busy = true; error = null
            scope.launch {
                repository.createCampaign(CreateCampaignRequest(title.trim(), content.trim(), target, at!!.toIsoUtc()))
                    .fold(onSuccess = { onCreated() }, onFailure = { error = it.message })
                busy = false
            }
        })
    }
}
