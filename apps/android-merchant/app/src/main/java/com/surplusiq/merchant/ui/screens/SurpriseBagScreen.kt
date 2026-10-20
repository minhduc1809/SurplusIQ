package com.surplusiq.merchant.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CardGiftcard
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.surplusiq.merchant.data.CreateSurpriseBagRequest
import com.surplusiq.merchant.data.ItemDto
import com.surplusiq.merchant.data.StoreRepository
import com.surplusiq.merchant.data.SurpriseBagDto
import com.surplusiq.merchant.data.SurpriseBagItemRequest
import com.surplusiq.merchant.ui.components.*
import com.surplusiq.merchant.ui.theme.*
import kotlinx.coroutines.launch
import java.time.LocalDate
import kotlin.math.roundToLong

/** S30 - Túi bất ngờ (POST/GET store/marketing/surprise-bags). Món có thể có = mọi món đang dùng thuộc các loại đã chọn. */
@OptIn(ExperimentalLayoutApi::class)
@Composable
fun SurpriseBagScreen(repository: StoreRepository, onNavigate: (String) -> Unit, onBack: () -> Unit) {
    var items by remember { mutableStateOf<List<ItemDto>>(emptyList()) }
    var bags by remember { mutableStateOf<List<SurpriseBagDto>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }
    var loadError by remember { mutableStateOf<String?>(null) }
    var attempt by remember { mutableIntStateOf(0) }

    var title by remember { mutableStateOf("") }
    var count by remember { mutableStateOf("") }
    var price by remember { mutableStateOf("") }
    var minValue by remember { mutableStateOf("") }
    var start by remember { mutableStateOf("") }
    var end by remember { mutableStateOf("") }
    val categories = remember { mutableStateListOf<String>() }
    var saving by remember { mutableStateOf(false) }
    var formError by remember { mutableStateOf<String?>(null) }
    var success by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    LaunchedEffect(attempt) {
        isLoading = true
        loadError = null
        repository.getItems(status = "ACTIVE", sortBy = "name", sortOrder = "ASC", limit = 100).fold(
            onSuccess = { items = it.data }, onFailure = { loadError = it.message }
        )
        bags = repository.getSurpriseBags().getOrDefault(emptyList())
        repository.getStoreProfile().getOrNull()?.settings?.let { s ->
            if (start.isEmpty()) start = s.defaultPickupStart.take(5)
            if (end.isEmpty()) end = s.defaultPickupEnd.take(5)
        }
        isLoading = false
    }

    val bagItems = items.filter { it.category in categories }
    val allergens = bagItems.flatMap { it.allergens.orEmpty() }.distinct()
    val value = minValue.toLongOrNull()

    fun submit() {
        val qty = count.toIntOrNull()
        val original = value
        // Giá sàn túi theo marketing.service: làm tròn 40% giá trị ước tính.
        val floor = original?.let { (it * 0.4).roundToLong() } ?: 0L
        formError = when {
            title.isBlank() -> "Nhập tên túi."
            qty == null || qty !in 1..500 -> "Số lượng túi từ 1 đến 500."
            original == null || original < 1000 -> "Giá trị ước tính tối thiểu từ 1.000đ."
            bagItems.isEmpty() -> "Chọn ít nhất một loại món có món đang dùng."
            else -> offerPriceError(price.toLongOrNull(), original, floor) ?: pickupWindowError(start, end)
        }
        if (formError != null || qty == null || original == null) return
        saving = true
        success = null
        scope.launch {
            val today = LocalDate.now()
            val request = CreateSurpriseBagRequest(
                title = title.trim(), description = null, originalPrice = original, currentPrice = price.toLong(),
                totalQuantity = qty, pickupStart = isoAt(today, start), pickupEnd = isoAt(today, end),
                items = bagItems.map { SurpriseBagItemRequest(it.id, 1) },
            )
            repository.createSurpriseBag(request).fold(
                onSuccess = { r ->
                    success = "Đã mở bán $qty túi. ${r.allergenNotice.orEmpty()}"
                    title = ""; count = ""; price = ""; minValue = ""; categories.clear()
                    bags = repository.getSurpriseBags().getOrDefault(bags)
                },
                onFailure = { formError = it.message }
            )
            saving = false
        }
    }

    Column(modifier = Modifier.fillMaxSize().background(SqCanvas).verticalScroll(rememberScrollState()).padding(20.dp)) {
        ScreenHeader("Túi bất ngờ", onBack)
        Spacer(modifier = Modifier.height(12.dp))

        when {
            isLoading -> FullScreenLoading()
            loadError != null -> ErrorState(loadError!!) { attempt++ }
            items.isEmpty() -> EmptyState("Chưa có món đang dùng", "Túi bất ngờ gom từ các món trong danh mục. Thêm món trước.")
            else -> {
                SqCard {
                    // Backend bắt buộc title nhưng chưa có cột lưu (offers không có tên) - báo rõ để chủ quán không tưởng khách thấy tên này.
                    SqField("Tên túi", title, placeholder = "Túi bánh ngọt cuối ngày",
                        hint = "Hiện chỉ dùng khi tạo; danh sách và phía khách hiển thị \"Túi bất ngờ\".") { title = it.take(150) }
                    Spacer(modifier = Modifier.height(10.dp))
                    Row {
                        SqField("Số lượng túi", count, modifier = Modifier.weight(1f), keyboardType = KeyboardType.Number) { count = it.filter(Char::isDigit).take(3) }
                        Spacer(modifier = Modifier.width(10.dp))
                        SqField("Giá bán cố định (đ)", price, modifier = Modifier.weight(1f), keyboardType = KeyboardType.Number) { price = it.filter(Char::isDigit).take(7) }
                    }
                    Spacer(modifier = Modifier.height(10.dp))
                    SqField("Giá trị ước tính tối thiểu (đ)", minValue, keyboardType = KeyboardType.Number,
                        hint = "Giá bán không thấp hơn 40% giá trị này") { minValue = it.filter(Char::isDigit).take(7) }
                    Spacer(modifier = Modifier.height(10.dp))
                    Row {
                        SqField("Nhận từ", start, modifier = Modifier.weight(1f), placeholder = "18:00") { start = it.take(5) }
                        Spacer(modifier = Modifier.width(10.dp))
                        SqField("Đến", end, modifier = Modifier.weight(1f), placeholder = "20:00") { end = it.take(5) }
                    }
                }
                Spacer(modifier = Modifier.height(12.dp))

                SqCard {
                    SectionTitle("Loại món có thể có")
                    Spacer(modifier = Modifier.height(8.dp))
                    FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        items.map { it.category }.distinct().forEach { c ->
                            SqChip(c, c in categories) { if (c in categories) categories.remove(c) else categories.add(c) }
                        }
                    }
                    if (bagItems.isNotEmpty()) {
                        Text("${bagItems.size} món: ${bagItems.joinToString(", ") { it.name }}", fontSize = 12.sp, color = SqInkSoft, modifier = Modifier.padding(top = 8.dp))
                    }
                    Spacer(modifier = Modifier.height(12.dp))
                    SectionTitle("Nhóm dị ứng có thể có")
                    Spacer(modifier = Modifier.height(8.dp))
                    if (allergens.isEmpty()) {
                        Text(if (bagItems.isEmpty()) "Chọn loại món để xem." else "Các món đã chọn chưa khai báo dị ứng.", fontSize = 12.sp, color = SqInkSoft)
                    } else {
                        FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            allergens.forEach { a -> SqChip(a, selected = true, enabled = false) {} }
                        }
                    }
                    Text("Tự tổng hợp từ khai báo dị ứng của từng món.", fontSize = 11.sp, color = SqInkMuted, modifier = Modifier.padding(top = 6.dp))
                }
                Spacer(modifier = Modifier.height(12.dp))

                CustomerPreview(value, price.toLongOrNull())
                InlineError(formError)
                InlineSuccess(success)
                Spacer(modifier = Modifier.height(12.dp))
                PrimaryButton("Mở bán túi bất ngờ", loading = saving, onClick = ::submit)

                Spacer(modifier = Modifier.height(20.dp))
                SectionTitle("Túi đã tạo (${bags.size})")
                Spacer(modifier = Modifier.height(8.dp))
                if (bags.isEmpty()) Text("Chưa có túi bất ngờ nào.", fontSize = 13.sp, color = SqInkSoft)
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    bags.forEach { b ->
                        OfferCard(b.offer, "Túi bất ngờ · ${shortDate(localDateOf(b.offer.pickupStart))} · ${b.items.size} món") {
                            onNavigate("offer/${b.offer.id}")
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun CustomerPreview(minValue: Long?, price: Long?) {
    Column(
        modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(SqButterWash)
            .border(1.dp, SqButter, RoundedCornerShape(16.dp)).padding(16.dp)
    ) {
        Text("Khách sẽ thấy", fontSize = 12.sp, color = SqInkSoft)
        Spacer(modifier = Modifier.height(8.dp))
        Row(verticalAlignment = Alignment.CenterVertically) {
            Icon(Icons.Default.CardGiftcard, contentDescription = null, tint = SqCoralDeep, modifier = Modifier.size(28.dp))
            Spacer(modifier = Modifier.width(10.dp))
            Column {
                Text("Túi bất ngờ, giá trị từ ${minValue?.let(::currency) ?: "…"}", fontSize = 15.sp, fontWeight = FontWeight.Bold, color = SqInk)
                price?.let { Text("Giá ${currency(it)}", fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = SqCoralDeep) }
            }
        }
        Spacer(modifier = Modifier.height(8.dp))
        Text("Khách chỉ biết nội dung túi sau khi mua.", fontSize = 12.sp, color = SqInkSoft)
    }
}
