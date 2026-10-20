package com.surplusiq.merchant.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AutoGraph
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.surplusiq.merchant.data.CreateOfferRequest
import com.surplusiq.merchant.data.ForecastDto
import com.surplusiq.merchant.data.ItemDto
import com.surplusiq.merchant.data.StoreRepository
import com.surplusiq.merchant.ui.components.*
import com.surplusiq.merchant.ui.theme.*
import kotlinx.coroutines.launch
import java.time.LocalDate

/** S26 - Tạo suất hôm nay (POST store/offers); gợi ý số lượng từ dự báo GET store/forecast nếu có. */
@Composable
fun OfferCreateScreen(repository: StoreRepository, presetItemId: String?, onCreated: (String) -> Unit, onBack: () -> Unit) {
    var items by remember { mutableStateOf<List<ItemDto>>(emptyList()) }
    var forecasts by remember { mutableStateOf<Map<String, ForecastDto>>(emptyMap()) }
    var isLoading by remember { mutableStateOf(true) }
    var loadError by remember { mutableStateOf<String?>(null) }
    var attempt by remember { mutableIntStateOf(0) }

    var itemId by remember { mutableStateOf(presetItemId) }
    var quantity by remember { mutableStateOf("") }
    var price by remember { mutableStateOf("") }
    var start by remember { mutableStateOf("") }
    var end by remember { mutableStateOf("") }
    var openNow by remember { mutableStateOf(true) }
    var note by remember { mutableStateOf("") }
    var saving by remember { mutableStateOf(false) }
    var formError by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()
    val today = remember { LocalDate.now() }

    LaunchedEffect(attempt) {
        isLoading = true
        loadError = null
        repository.getItems(status = "ACTIVE", sortBy = "name", sortOrder = "ASC", limit = 100).fold(
            onSuccess = { items = it.data },
            onFailure = { loadError = it.message }
        )
        // Dự báo và khung nhận mặc định chỉ là gợi ý: lỗi thì bỏ qua, không chặn form.
        forecasts = repository.getForecasts(today.toString()).getOrNull().orEmpty().associateBy { it.itemId }
        repository.getStoreProfile().getOrNull()?.settings?.let { s ->
            if (start.isEmpty()) start = s.defaultPickupStart.take(5)
            if (end.isEmpty()) end = s.defaultPickupEnd.take(5)
        }
        isLoading = false
    }

    val item = items.firstOrNull { it.id == itemId }
    val original = item?.originalPrice ?: 0L
    val floor = floorPriceFor(original)
    val priceValue = price.toLongOrNull()
    val forecast = itemId?.let { forecasts[it] }
    val recommended = forecast?.let { it.chosenQuantity ?: it.recommended }?.takeIf { it > 0 }

    fun submit() {
        val qty = quantity.toIntOrNull()
        formError = when {
            item == null -> "Chọn món."
            qty == null || qty !in 1..500 -> "Số lượng từ 1 đến 500."
            else -> offerPriceError(priceValue, original, floor) ?: pickupWindowError(start, end)
        }
        if (formError != null || item == null || qty == null || priceValue == null) return
        saving = true
        scope.launch {
            val request = CreateOfferRequest(
                itemId = item.id, totalQuantity = qty, originalPrice = original, currentPrice = priceValue,
                pickupStart = isoAt(today, start), pickupEnd = isoAt(today, end),
                status = if (openNow) "OPEN" else "DRAFT", note = note.trim().ifEmpty { null },
            )
            repository.createOffer(request).fold(onSuccess = { onCreated(it.id) }, onFailure = { formError = it.message })
            saving = false
        }
    }

    Column(modifier = Modifier.fillMaxSize().background(SqCanvas).verticalScroll(rememberScrollState()).padding(20.dp)) {
        ScreenHeader("Tạo suất hôm nay", onBack)
        Spacer(modifier = Modifier.height(12.dp))

        when {
            isLoading -> FullScreenLoading()
            loadError != null -> ErrorState(loadError!!) { attempt++ }
            items.isEmpty() -> EmptyState("Chưa có món đang dùng", "Thêm món trong tab Món trước khi tạo suất.")
            else -> {
                SqCard {
                    SqDropdown("Món", items.map { it.id to it.name }, itemId, placeholder = "Chọn món…", searchable = true) {
                        itemId = it
                        price = ""
                    }
                    if (item != null) {
                        Spacer(modifier = Modifier.height(8.dp))
                        Text("Giá gốc ${currency(original)} · Giá sàn ${currency(floor)}", fontSize = 12.sp, color = SqInkSoft)
                    }
                    Spacer(modifier = Modifier.height(12.dp))
                    SqField("Số lượng suất", quantity, keyboardType = KeyboardType.Number, hint = "1–500 suất") {
                        quantity = it.filter(Char::isDigit).take(3)
                    }
                    if (recommended != null) {
                        Spacer(modifier = Modifier.height(8.dp))
                        ForecastHint(recommended, forecast?.confidence) { quantity = recommended.toString() }
                    }
                    Spacer(modifier = Modifier.height(12.dp))
                    SqField(
                        "Giá bán (đ)", price, keyboardType = KeyboardType.Number,
                        hint = if (priceValue != null && original > 0) "Giảm ${discountPercent(original, priceValue)}% · bội số 500đ" else "Bội số 500đ, từ giá sàn đến giá gốc"
                    ) { price = it.filter(Char::isDigit).take(7) }
                }
                Spacer(modifier = Modifier.height(12.dp))

                SqCard {
                    SectionTitle("Khung nhận hôm nay")
                    Spacer(modifier = Modifier.height(10.dp))
                    Row {
                        SqField("Từ", start, modifier = Modifier.weight(1f), placeholder = "18:00") { start = it.take(5) }
                        Spacer(modifier = Modifier.width(10.dp))
                        SqField("Đến", end, modifier = Modifier.weight(1f), placeholder = "20:00") { end = it.take(5) }
                    }
                    Text("Tối đa 3 giờ.", fontSize = 11.sp, color = SqInkMuted, modifier = Modifier.padding(top = 4.dp))
                    Spacer(modifier = Modifier.height(12.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        SqChip("Mở bán ngay", openNow) { openNow = true }
                        SqChip("Lưu nháp", !openNow) { openNow = false }
                    }
                    Spacer(modifier = Modifier.height(12.dp))
                    SqField("Ghi chú (tùy chọn)", note, singleLine = false, hint = "${note.length}/200") { note = it.take(200) }
                }

                InlineError(formError)
                Spacer(modifier = Modifier.height(12.dp))
                PrimaryButton(if (openNow) "Tạo và mở bán" else "Lưu nháp", loading = saving, onClick = ::submit)
            }
        }
    }
}

@Composable
private fun ForecastHint(recommended: Int, confidence: String?, onUse: () -> Unit) {
    Row(
        modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp)).background(SqLilacWash).padding(start = 12.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(Icons.Default.AutoGraph, contentDescription = null, tint = SqInkSoft, modifier = Modifier.size(18.dp))
        Spacer(modifier = Modifier.width(8.dp))
        Column(modifier = Modifier.weight(1f).padding(vertical = 8.dp)) {
            Text("Dự báo khuyến nghị: $recommended suất", fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = SqInk)
            if (confidence == "LOW") Text("Độ tin cậy thấp - chưa đủ dữ liệu bán.", fontSize = 11.sp, color = SqInkSoft)
        }
        TextButton(onClick = onUse) { Text("Dùng số này", color = SqCoralDeep) }
    }
}
