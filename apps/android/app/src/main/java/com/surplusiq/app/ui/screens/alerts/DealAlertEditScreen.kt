package com.surplusiq.app.ui.screens.alerts

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.NotificationsActive
import androidx.compose.material.icons.filled.Storefront
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.surplusiq.app.domain.model.CollectionTimeSlot
import com.surplusiq.app.domain.model.DealAlert
import com.surplusiq.app.domain.model.DealAlertCriteria
import com.surplusiq.app.domain.model.DealCategory
import com.surplusiq.app.domain.model.StoreOption
import com.surplusiq.app.ui.components.RadiusSlider
import com.surplusiq.app.ui.components.formatRadius
import com.surplusiq.app.ui.theme.ForestGreenPrimary
import com.surplusiq.app.ui.theme.LilacWash
import com.surplusiq.app.ui.theme.SkyBlueIce
import com.surplusiq.app.ui.theme.TextMuted
import com.surplusiq.app.ui.theme.TextPrimary
import com.surplusiq.app.ui.theme.TextSecondary
import com.surplusiq.app.ui.viewmodel.DealAlertsUiState
import kotlin.math.roundToInt

/** Giờ gửi thông báo khách muốn nhận (lưu vào criteria.notifyAt); null = ngay khi có deal khớp. */
private val NOTIFY_TIMES = listOf(null, "08:00", "12:00", "17:00")

/** Một dòng mô tả điều kiện cảnh báo, dùng cho thẻ K19 và dòng xem trước K20. */
internal fun alertSummary(criteria: DealAlertCriteria): String = listOfNotNull(
    criteria.storeName ?: criteria.category,
    criteria.maxPrice?.let { "≤ %,d ₫".format(it) },
    criteria.minDiscountPercent?.let { "giảm ≥ $it%" },
    if (criteria.timeFrom != null && criteria.timeTo != null) "${criteria.timeFrom}-${criteria.timeTo}" else null,
    criteria.radiusKm?.let { "trong ${formatRadius(it)}" },
    criteria.notifyAt?.let { "báo lúc $it" }
).joinToString(" · ").ifBlank { "Mọi deal" }

/** K20 Tạo hoặc sửa cảnh báo deal (R1-031, R1-032). */
@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
fun DealAlertEditScreen(
    alert: DealAlert?,
    defaultRadiusKm: Double,
    state: DealAlertsUiState,
    onBackClick: () -> Unit,
    onSearchStores: (String) -> Unit,
    onSave: (criteria: DealAlertCriteria, isActive: Boolean) -> Unit
) {
    val initial = alert?.criteria ?: DealAlertCriteria()
    var byStore by remember { mutableStateOf(initial.storeId != null) }
    var category by remember { mutableStateOf(initial.category) }
    var store by remember { mutableStateOf(initial.storeId?.let { StoreOption(it, initial.storeName.orEmpty(), "") }) }
    var storeQuery by remember { mutableStateOf("") }
    var maxPriceText by remember { mutableStateOf(initial.maxPrice?.toString().orEmpty()) }
    var minDiscount by remember { mutableIntStateOf(initial.minDiscountPercent ?: 0) }
    var timeSlot by remember {
        mutableStateOf(CollectionTimeSlot.values().firstOrNull { it.timeRange.startsWith(initial.timeFrom ?: "-") })
    }
    var radiusKm by remember { mutableDoubleStateOf(initial.radiusKm ?: defaultRadiusKm) }
    var notifyAt by remember { mutableStateOf(initial.notifyAt) }
    var isActive by remember { mutableStateOf(alert?.isActive ?: true) }

    val criteria = DealAlertCriteria(
        category = category.takeIf { !byStore },
        storeId = store?.id.takeIf { byStore },
        storeName = store?.name.takeIf { byStore },
        maxPrice = maxPriceText.toIntOrNull()?.takeIf { it > 0 },
        minDiscountPercent = minDiscount.takeIf { it > 0 },
        timeFrom = timeSlot?.timeRange?.substringBefore(" - "),
        timeTo = timeSlot?.timeRange?.substringAfter(" - "),
        radiusKm = radiusKm,
        notifyAt = notifyAt
    )
    // Cần ít nhất một điều kiện về món/quán/giá; bán kính luôn có nên không tính.
    val hasCondition = criteria.category != null || criteria.storeId != null || criteria.maxPrice != null || criteria.minDiscountPercent != null

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(if (alert == null) "Tạo cảnh báo" else "Sửa cảnh báo", fontWeight = FontWeight.Bold, fontSize = 18.sp) },
                navigationIcon = { IconButton(onClick = onBackClick) { Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Quay lại") } },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.surface)
            )
        },
        bottomBar = {
            Box(Modifier.background(MaterialTheme.colorScheme.surface).windowInsetsPadding(WindowInsets.navigationBars.union(WindowInsets.ime))) {
            Column(Modifier.padding(16.dp)) {
                Row(
                    Modifier
                        .fillMaxWidth()
                        .padding(bottom = 10.dp)
                        .background(LilacWash, RoundedCornerShape(12.dp))
                        .padding(12.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(Icons.Default.NotificationsActive, contentDescription = null, tint = ForestGreenPrimary, modifier = Modifier.size(18.dp))
                    Spacer(Modifier.width(8.dp))
                    Text("Báo khi: ${alertSummary(criteria)}", fontSize = 13.sp, color = TextPrimary)
                }
                Button(
                    onClick = { onSave(criteria, isActive) },
                    enabled = hasCondition && !state.isSaving,
                    shape = RoundedCornerShape(14.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = ForestGreenPrimary),
                    modifier = Modifier.fillMaxWidth().height(48.dp)
                ) {
                    Text(if (state.isSaving) "Đang lưu..." else "Lưu cảnh báo", fontWeight = FontWeight.Bold)
                }
            }
        }
        },
        containerColor = MaterialTheme.colorScheme.background
    ) { padding ->
        Column(
            Modifier
                .padding(padding)
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(16.dp)
        ) {
            SectionTitle("Theo dõi")
            SingleChoiceSegmentedButtonRow(Modifier.fillMaxWidth()) {
                SegmentedButton(selected = !byStore, onClick = { byStore = false }, shape = SegmentedButtonDefaults.itemShape(0, 2)) { Text("Danh mục") }
                SegmentedButton(selected = byStore, onClick = { byStore = true }, shape = SegmentedButtonDefaults.itemShape(1, 2)) { Text("Cửa hàng cụ thể") }
            }
            Spacer(Modifier.height(10.dp))
            if (!byStore) {
                FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    DealCategory.values().forEach { option ->
                        FilterChip(
                            selected = category == option.displayName,
                            onClick = { category = if (category == option.displayName) null else option.displayName },
                            label = { Text(option.label) }
                        )
                    }
                }
            } else if (store != null) {
                InputChip(
                    selected = true,
                    onClick = { store = null },
                    label = { Text(store!!.name) },
                    leadingIcon = { Icon(Icons.Default.Storefront, contentDescription = null, modifier = Modifier.size(18.dp)) },
                    trailingIcon = { Icon(Icons.Default.Close, contentDescription = "Bỏ chọn", modifier = Modifier.size(18.dp)) }
                )
            } else {
                OutlinedTextField(
                    value = storeQuery,
                    onValueChange = { storeQuery = it; onSearchStores(it) },
                    placeholder = { Text("Tìm tên cửa hàng") },
                    trailingIcon = { if (state.isSearchingStores) CircularProgressIndicator(Modifier.size(18.dp), strokeWidth = 2.dp) },
                    singleLine = true,
                    shape = RoundedCornerShape(14.dp),
                    modifier = Modifier.fillMaxWidth()
                )
                state.storeOptions.forEach { option ->
                    Row(
                        Modifier.fillMaxWidth().clickable { store = option; storeQuery = "" }.padding(vertical = 10.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(Icons.Default.Storefront, contentDescription = null, tint = ForestGreenPrimary, modifier = Modifier.size(18.dp))
                        Spacer(Modifier.width(10.dp))
                        Column {
                            Text(option.name, fontSize = 14.sp, color = TextPrimary)
                            if (option.address.isNotBlank()) Text(option.address, fontSize = 11.sp, color = TextMuted, maxLines = 1)
                        }
                    }
                }
                if (storeQuery.isNotBlank() && !state.isSearchingStores && state.storeOptions.isEmpty()) {
                    Text("Không thấy cửa hàng đang có deal khớp tên này.", fontSize = 12.sp, color = TextMuted, modifier = Modifier.padding(top = 6.dp))
                }
            }

            SectionTitle("Giá tối đa")
            OutlinedTextField(
                value = maxPriceText,
                onValueChange = { text -> maxPriceText = text.filter { it.isDigit() }.take(7) },
                placeholder = { Text("Không giới hạn") },
                suffix = { Text("₫") },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                singleLine = true,
                shape = RoundedCornerShape(14.dp),
                modifier = Modifier.fillMaxWidth()
            )

            SectionTitle("Giảm tối thiểu: ${if (minDiscount > 0) "$minDiscount%" else "bất kỳ"}")
            Slider(
                value = minDiscount.toFloat(),
                onValueChange = { minDiscount = (it / 10).roundToInt() * 10 },
                valueRange = 0f..80f,
                steps = 7,
                colors = SliderDefaults.colors(thumbColor = ForestGreenPrimary, activeTrackColor = ForestGreenPrimary)
            )

            SectionTitle("Khung giờ nhận")
            FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                CollectionTimeSlot.values().forEach { slot ->
                    FilterChip(
                        selected = timeSlot == slot,
                        onClick = { timeSlot = if (timeSlot == slot) null else slot },
                        label = { Text(slot.timeRange) }
                    )
                }
            }

            Spacer(Modifier.height(12.dp))
            RadiusSlider(radiusKm = radiusKm, onRadiusChange = { radiusKm = it })

            SectionTitle("Thời điểm nhận thông báo")
            FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                NOTIFY_TIMES.forEach { time ->
                    FilterChip(
                        selected = notifyAt == time,
                        onClick = { notifyAt = time },
                        label = { Text(time ?: "Ngay khi có") }
                    )
                }
            }

            Spacer(Modifier.height(12.dp))
            Row(
                Modifier.fillMaxWidth().background(SkyBlueIce, RoundedCornerShape(12.dp)).padding(horizontal = 14.dp, vertical = 8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(Modifier.weight(1f)) {
                    Text("Bật cảnh báo", fontSize = 14.sp, fontWeight = FontWeight.SemiBold, color = TextPrimary)
                    Text("Tối đa 10 cảnh báo bật cùng lúc", fontSize = 11.sp, color = TextSecondary)
                }
                Switch(checked = isActive, onCheckedChange = { isActive = it })
            }
        }
    }
}

@Composable
private fun SectionTitle(text: String) {
    Text(text, fontSize = 14.sp, fontWeight = FontWeight.SemiBold, color = TextPrimary, modifier = Modifier.padding(top = 16.dp, bottom = 8.dp))
}
