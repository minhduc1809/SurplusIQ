package com.surplusiq.merchant.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.surplusiq.merchant.data.ItemDto
import com.surplusiq.merchant.data.OfferDto
import com.surplusiq.merchant.data.StoreRepository
import com.surplusiq.merchant.ui.components.*
import com.surplusiq.merchant.ui.theme.*
import kotlinx.coroutines.launch

private const val HISTORY_LIMIT = 50

/** S21 - Chi tiết món (GET store/items/:id + các suất tạo từ món qua GET store/offers?itemId=). */
@Composable
fun ItemDetailScreen(repository: StoreRepository, itemId: String, onNavigate: (String) -> Unit, onBack: () -> Unit) {
    var item by remember { mutableStateOf<ItemDto?>(null) }
    var offers by remember { mutableStateOf<List<OfferDto>>(emptyList()) }
    var offersTotal by remember { mutableIntStateOf(0) }
    var isLoading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }
    var actionError by remember { mutableStateOf<String?>(null) }
    var busy by remember { mutableStateOf(false) }
    var attempt by remember { mutableIntStateOf(0) }
    val scope = rememberCoroutineScope()

    LaunchedEffect(attempt) {
        isLoading = true
        error = null
        repository.getItem(itemId).fold(onSuccess = { item = it }, onFailure = { error = it.message })
        repository.getOffers(date = null, itemId = itemId, limit = HISTORY_LIMIT).onSuccess { offers = it.data; offersTotal = it.total }
        isLoading = false
    }

    fun toggleArchive(current: ItemDto) {
        busy = true
        actionError = null
        scope.launch {
            val result = if (current.status == "ARCHIVED") repository.restoreItem(current.id) else repository.archiveItem(current.id)
            busy = false
            result.fold(onSuccess = { item = current.copy(status = it.status) }, onFailure = { actionError = it.message })
        }
    }

    Column(modifier = Modifier.fillMaxSize().background(SqCanvas).verticalScroll(rememberScrollState()).padding(20.dp)) {
        ScreenHeader(item?.name ?: "Chi tiết món", onBack) {
            if (item != null) IconButton(onClick = { onNavigate("item-edit/$itemId") }) {
                Icon(Icons.Default.Edit, contentDescription = "Sửa món", tint = SqCoral)
            }
        }
        Spacer(modifier = Modifier.height(12.dp))

        when {
            isLoading -> FullScreenLoading()
            error != null -> ErrorState(error!!) { attempt++ }
            item != null -> {
                val it = item!!
                RemoteImage(it.imageUrl, modifier = Modifier.fillMaxWidth().height(200.dp), corner = 18.dp)
                Spacer(modifier = Modifier.height(12.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    StatusBadge(it.status)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(it.category, fontSize = 13.sp, color = SqInkSoft)
                }
                Spacer(modifier = Modifier.height(12.dp))

                // "Đã bỏ" = tồn còn lại của suất đã đóng; backend chưa trả sẵn nên cộng từ lịch sử đã tải.
                val wasted = offers.filter { o -> o.status == "CLOSED" }.sumOf { o -> o.remainingQuantity }
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    MetricCard("Suất đã tạo", "${it.stats?.totalOffersCreated ?: offersTotal}", SqLilac, Modifier.weight(1f))
                    MetricCard("Đã bán", "${it.stats?.totalSold ?: 0}", SqMint, Modifier.weight(1f))
                    MetricCard("Đã bỏ", "$wasted", SqCoral, Modifier.weight(1f))
                }
                if (offersTotal > offers.size) {
                    Text("Số đã bỏ tính trên $HISTORY_LIMIT suất gần nhất.", fontSize = 11.sp, color = SqInkMuted, modifier = Modifier.padding(top = 6.dp))
                }
                Spacer(modifier = Modifier.height(12.dp))

                SqCard {
                    SectionTitle("Thông tin món")
                    Spacer(modifier = Modifier.height(6.dp))
                    InfoRow("Giá gốc", currency(it.originalPrice))
                    InfoRow("Hạn dùng chuẩn", it.standardShelfLifeHours?.let { h -> "$h giờ" } ?: "—")
                    InfoRow("Trọng lượng", it.weightGrams?.let { g -> "$g g" } ?: "Chưa khai báo", if (it.weightGrams == null) SqCoralDeep else SqInk)
                    InfoRow("Giá vốn", it.costPrice?.let(::currency) ?: "Chưa khai báo", if (it.costPrice == null) SqCoralDeep else SqInk)
                    InfoRow("Dị ứng", it.allergens.orEmpty().joinToString(", ").ifEmpty { "Chưa khai báo" })
                    if (!it.ingredients.isNullOrBlank()) {
                        Spacer(modifier = Modifier.height(6.dp))
                        Text("Thành phần", fontSize = 12.sp, color = SqInkMuted)
                        Text(it.ingredients, fontSize = 13.sp, color = SqInk)
                    }
                    if (!it.description.isNullOrBlank()) {
                        Spacer(modifier = Modifier.height(6.dp))
                        Text("Mô tả", fontSize = 12.sp, color = SqInkMuted)
                        Text(it.description, fontSize = 13.sp, color = SqInk)
                    }
                }
                Spacer(modifier = Modifier.height(12.dp))

                InlineError(actionError)
                if (it.status == "ACTIVE") {
                    PrimaryButton("Tạo suất từ món này") { onNavigate("offer-new?itemId=$itemId") }
                    Spacer(modifier = Modifier.height(8.dp))
                }
                OutlinedButton(
                    onClick = { toggleArchive(it) }, enabled = !busy,
                    modifier = Modifier.fillMaxWidth().height(48.dp), shape = RoundedCornerShape(24.dp)
                ) {
                    Text(if (it.status == "ARCHIVED") "Khôi phục món" else "Lưu trữ món", color = SqInkSoft)
                }
                Spacer(modifier = Modifier.height(16.dp))

                SectionTitle("Lịch sử suất ($offersTotal)")
                Spacer(modifier = Modifier.height(8.dp))
                if (offers.isEmpty()) {
                    Text("Món này chưa được tạo suất nào.", fontSize = 13.sp, color = SqInkSoft)
                } else {
                    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        offers.forEach { o -> OfferCard(o, "Ngày ${shortDate(localDateOf(o.pickupStart))}") { onNavigate("offer/${o.id}") } }
                    }
                }
            }
        }
    }
}

/** ISO UTC -> "yyyy-MM-dd" theo giờ máy (pickupStart lưu UTC). */
internal fun localDateOf(iso: String): String =
    runCatching { java.time.Instant.parse(iso).atZone(java.time.ZoneId.systemDefault()).toLocalDate().toString() }.getOrDefault(iso)
