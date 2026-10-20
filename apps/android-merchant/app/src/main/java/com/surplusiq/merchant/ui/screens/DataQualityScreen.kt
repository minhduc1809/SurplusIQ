package com.surplusiq.merchant.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.surplusiq.merchant.data.BatchUpdateItemsRequest
import com.surplusiq.merchant.data.DataQualityResponse
import com.surplusiq.merchant.data.DataQualityWarningDto
import com.surplusiq.merchant.data.StoreRepository
import com.surplusiq.merchant.ui.components.*
import com.surplusiq.merchant.ui.theme.*
import kotlinx.coroutines.launch

private val WARNING_TYPES = mapOf(
    "MISSING_WEIGHT" to "Thiếu trọng lượng",
    "MISSING_COST" to "Thiếu giá vốn",
    "MISSING_ALLERGENS" to "Thiếu dị ứng",
)
private val TYPE_FILTERS = listOf<Pair<String?, String>>(null to "Tất cả") + WARNING_TYPES.toList()

/** S24 - Kiểm tra dữ liệu món (GET store/items/data-quality-warnings) + sửa hàng loạt (POST store/items/batch-update). */
@Composable
fun DataQualityScreen(repository: StoreRepository, onNavigate: (String) -> Unit, onBack: () -> Unit) {
    var data by remember { mutableStateOf<DataQualityResponse?>(null) }
    var isLoading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }
    var typeFilter by remember { mutableStateOf<String?>(null) }
    var attempt by remember { mutableIntStateOf(0) }
    var showBatch by remember { mutableStateOf(false) }
    var success by remember { mutableStateOf<String?>(null) }
    val selected = remember { mutableStateListOf<String>() }

    LaunchedEffect(attempt) {
        isLoading = true
        error = null
        repository.getDataQualityWarnings().fold(onSuccess = { data = it }, onFailure = { error = it.message })
        isLoading = false
    }

    Column(modifier = Modifier.fillMaxSize().background(SqCanvas).padding(horizontal = 20.dp).padding(top = 20.dp)) {
        ScreenHeader("Kiểm tra dữ liệu", onBack)
        Spacer(modifier = Modifier.height(12.dp))

        when {
            isLoading -> FullScreenLoading()
            error != null -> ErrorState(error!!) { attempt++ }
            data != null -> {
                val d = data!!
                val warnings = d.warnings.filter { typeFilter == null || it.type == typeFilter }
                LazyColumn(
                    modifier = Modifier.weight(1f),
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                    contentPadding = PaddingValues(bottom = 16.dp)
                ) {
                    item { ScoreCard(d) }
                    item { InlineSuccess(success) }
                    item { ChipRow(TYPE_FILTERS, typeFilter) { typeFilter = it } }
                    if (warnings.isEmpty()) item {
                        EmptyState("Không có cảnh báo", "Dữ liệu món đã đầy đủ cho mục này.")
                    }
                    items(warnings, key = { it.itemId + it.type }) { w ->
                        WarningRow(
                            warning = w,
                            checked = w.itemId in selected,
                            onCheck = { if (w.itemId in selected) selected.remove(w.itemId) else selected.add(w.itemId) },
                            onFix = { onNavigate("item-edit/${w.itemId}") }
                        )
                    }
                }
                if (selected.isNotEmpty()) {
                    SelectionBar("Đã chọn ${selected.size} món", "Sửa hàng loạt") { showBatch = true }
                    Spacer(modifier = Modifier.height(12.dp))
                }
            }
        }
    }

    if (showBatch) {
        BatchFixSheet(
            repository = repository,
            itemIds = selected.toList(),
            onDismiss = { showBatch = false },
            onDone = { count ->
                showBatch = false
                selected.clear()
                success = "Đã cập nhật $count món."
                attempt++
            }
        )
    }
}

@Composable
private fun ScoreCard(d: DataQualityResponse) {
    SqCard {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Column(modifier = Modifier.weight(1f)) {
                Text("Mức hoàn thiện dữ liệu", fontSize = 13.sp, color = SqInkSoft)
                Text("${d.completenessScore}%", fontSize = 30.sp, fontWeight = FontWeight.ExtraBold, color = SqInk)
            }
            Column(horizontalAlignment = Alignment.End) {
                Text("${d.fullyConfigured}/${d.totalItems} món đủ dữ liệu", fontSize = 13.sp, color = SqInkSoft)
                Text("${d.warnings.size} cảnh báo", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = SqCoralDeep)
            }
        }
        Spacer(modifier = Modifier.height(10.dp))
        LinearProgressIndicator(
            progress = { d.completenessScore / 100f }, color = SqMint, trackColor = SqSurfaceSoft,
            modifier = Modifier.fillMaxWidth().height(8.dp).clip(RoundedCornerShape(4.dp))
        )
    }
}

@Composable
private fun WarningRow(warning: DataQualityWarningDto, checked: Boolean, onCheck: () -> Unit, onFix: () -> Unit) {
    Row(
        modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(SqSurface).padding(end = 12.dp, top = 6.dp, bottom = 10.dp),
        verticalAlignment = Alignment.Top
    ) {
        Checkbox(checked = checked, onCheckedChange = { onCheck() }, colors = CheckboxDefaults.colors(checkedColor = SqCoral))
        Column(modifier = Modifier.weight(1f).padding(top = 10.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(WARNING_TYPES[warning.type] ?: warning.type, fontSize = 12.sp, fontWeight = FontWeight.Bold, color = SqInkSoft)
                Spacer(modifier = Modifier.width(8.dp))
                SeverityBadge(warning.severity)
            }
            Text(warning.itemName, fontSize = 15.sp, fontWeight = FontWeight.SemiBold, color = SqInk)
            Spacer(modifier = Modifier.height(2.dp))
            Text(warning.suggestion, fontSize = 12.sp, color = SqInkSoft)
        }
        TextButton(onClick = onFix, modifier = Modifier.padding(top = 4.dp)) { Text("Sửa", color = SqCoral) }
    }
}

@Composable
private fun SeverityBadge(severity: String) {
    val (bg, fg, label) = when (severity) {
        "MEDIUM" -> Triple(SqButterWash, SqInk, "Trung bình")
        "HIGH" -> Triple(SqCoralWash, SqCoralDeep, "Cao")
        else -> Triple(SqSurfaceSoft, SqInkSoft, "Thấp")
    }
    Text(label, fontSize = 11.sp, fontWeight = FontWeight.Bold, color = fg,
        modifier = Modifier.clip(RoundedCornerShape(50)).background(bg).padding(horizontal = 8.dp, vertical = 2.dp))
}

/** Drawer sửa hàng loạt: backend chỉ hỗ trợ loại, hạn dùng chuẩn, trọng lượng (BatchUpdateItemsDto). */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun BatchFixSheet(repository: StoreRepository, itemIds: List<String>, onDismiss: () -> Unit, onDone: (Int) -> Unit) {
    var category by remember { mutableStateOf<String?>(null) }
    var shelfLife by remember { mutableStateOf("") }
    var weight by remember { mutableStateOf("") }
    var saving by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    fun save() {
        val shelf = shelfLife.toIntOrNull()
        val grams = weight.toIntOrNull()
        error = when {
            category == null && shelf == null && grams == null -> "Nhập ít nhất một trường cần sửa."
            shelf != null && shelf !in 1..168 -> "Hạn dùng chuẩn từ 1 đến 168 giờ."
            grams != null && grams !in 10..5000 -> "Trọng lượng từ 10 đến 5.000 gram."
            else -> null
        }
        if (error != null) return
        saving = true
        scope.launch {
            repository.batchUpdateItems(BatchUpdateItemsRequest(itemIds, category, shelf, grams)).fold(
                onSuccess = { onDone(it.successCount) },
                onFailure = { error = it.message }
            )
            saving = false
        }
    }

    ModalBottomSheet(onDismissRequest = onDismiss, containerColor = SqSurface) {
        Column(modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp).padding(bottom = 28.dp)) {
            Text("Sửa ${itemIds.size} món", fontSize = 18.sp, fontWeight = FontWeight.Bold, color = SqInk)
            Text("Trường để trống sẽ giữ nguyên. Giá vốn và dị ứng cần sửa từng món.", fontSize = 12.sp, color = SqInkSoft)
            Spacer(modifier = Modifier.height(14.dp))
            SqDropdown("Loại món", listOf<Pair<String?, String>>(null to "Giữ nguyên") + ITEM_CATEGORIES.map { it to it }, category) { category = it }
            Spacer(modifier = Modifier.height(10.dp))
            SqField("Trọng lượng (g)", weight, keyboardType = KeyboardType.Number, hint = "10–5.000g") { weight = it.filter(Char::isDigit).take(4) }
            Spacer(modifier = Modifier.height(10.dp))
            SqField("Hạn dùng chuẩn (giờ)", shelfLife, keyboardType = KeyboardType.Number, hint = "1–168 giờ") { shelfLife = it.filter(Char::isDigit).take(3) }
            InlineError(error)
            Spacer(modifier = Modifier.height(12.dp))
            PrimaryButton("Áp dụng", loading = saving, onClick = ::save)
        }
    }
}
