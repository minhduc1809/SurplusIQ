package com.surplusiq.merchant.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.surplusiq.merchant.data.ItemDto
import com.surplusiq.merchant.data.ItemRequest
import com.surplusiq.merchant.data.StoreRepository
import com.surplusiq.merchant.ui.components.*
import com.surplusiq.merchant.ui.theme.*
import kotlinx.coroutines.launch

/** Khớp ITEM_CATEGORIES / COMMON_ALLERGENS trong catalog.constants.ts. */
internal val ITEM_CATEGORIES = listOf("Bánh mì", "Bánh ngọt", "Bánh kem", "Đồ uống", "Món mặn", "Khác")
internal val COMMON_ALLERGENS = listOf(
    "Gluten", "Trứng", "Sữa (Lactose)", "Đậu phộng (Lạc)", "Đậu nành", "Hạt cây (Hạnh nhân, Óc chó, Điều)",
    "Giáp xác (Tôm, Cua)", "Cá", "Mè (Vừng)", "Cần tây", "Mù tạt", "Sulfite", "Đậu lupin", "Động vật thân mềm",
)

/** Ràng buộc CreateItemDto + catalog.service (dùng chung cho form S22 và nhập CSV S23). */
internal fun itemError(r: ItemRequest): String? {
    val price = r.originalPrice
    val cost = r.costPrice
    return when {
        (r.name?.trim()?.length ?: 0) !in 2..80 -> "Tên món cần 2–80 ký tự."
        r.category.isNullOrBlank() -> "Chọn loại món."
        price == null || price !in 1_000L..5_000_000L -> "Giá gốc từ 1.000đ đến 5.000.000đ."
        price % PRICE_STEP != 0L -> "Giá gốc phải là bội số của 500đ."
        r.standardShelfLifeHours == null || r.standardShelfLifeHours !in 1..168 -> "Hạn dùng chuẩn từ 1 đến 168 giờ."
        r.weightGrams != null && r.weightGrams !in 10..5000 -> "Trọng lượng từ 10 đến 5.000 gram."
        cost != null && cost > price -> "Giá vốn không được vượt quá giá gốc."
        (r.ingredients?.length ?: 0) > 1000 -> "Thành phần tối đa 1.000 ký tự."
        (r.imageUrl?.length ?: 0) > 500 -> "URL ảnh tối đa 500 ký tự."
        else -> null
    }
}

/** S22 - Tạo / sửa món (POST, PATCH store/items). itemId null = tạo mới. */
@OptIn(ExperimentalLayoutApi::class)
@Composable
fun ItemFormScreen(repository: StoreRepository, itemId: String?, onSaved: (String) -> Unit, onBack: () -> Unit) {
    var isLoading by remember { mutableStateOf(itemId != null) }
    var loadError by remember { mutableStateOf<String?>(null) }
    var saving by remember { mutableStateOf(false) }
    var formError by remember { mutableStateOf<String?>(null) }
    var attempt by remember { mutableIntStateOf(0) }

    var imageUrl by remember { mutableStateOf("") }
    var name by remember { mutableStateOf("") }
    var category by remember { mutableStateOf("") }
    var price by remember { mutableStateOf("") }
    var shelfLife by remember { mutableStateOf("24") }
    var weight by remember { mutableStateOf("") }
    var cost by remember { mutableStateOf("") }
    var ingredients by remember { mutableStateOf("") }
    var description by remember { mutableStateOf("") }
    val allergens = remember { mutableStateListOf<String>() }
    val scope = rememberCoroutineScope()

    fun fill(item: ItemDto) {
        imageUrl = item.imageUrl.orEmpty()
        name = item.name
        category = item.category
        price = item.originalPrice.toString()
        shelfLife = item.standardShelfLifeHours?.toString().orEmpty()
        weight = item.weightGrams?.toString().orEmpty()
        cost = item.costPrice?.toString().orEmpty()
        ingredients = item.ingredients.orEmpty()
        description = item.description.orEmpty()
        allergens.clear()
        allergens.addAll(item.allergens.orEmpty())
    }

    if (itemId != null) LaunchedEffect(attempt) {
        isLoading = true
        loadError = null
        repository.getItem(itemId).fold(onSuccess = ::fill, onFailure = { loadError = it.message })
        isLoading = false
    }

    fun save() {
        // shortcut: ô tùy chọn để trống gửi null = "không đổi" (Gson bỏ null) nên khi sửa không xóa được giá vốn/trọng lượng cũ.
        val request = ItemRequest(
            name = name.trim(),
            category = category,
            originalPrice = price.toLongOrNull(),
            standardShelfLifeHours = shelfLife.toIntOrNull(),
            costPrice = cost.toLongOrNull(),
            weightGrams = weight.toIntOrNull(),
            ingredients = ingredients.trim().ifEmpty { null },
            allergens = allergens.toList(),
            imageUrl = imageUrl.trim().ifEmpty { null },
            description = description.trim().ifEmpty { null },
        )
        formError = itemError(request)
        if (formError != null) return
        saving = true
        scope.launch {
            val result = if (itemId == null) repository.createItem(request) else repository.updateItem(itemId, request)
            saving = false
            result.fold(onSuccess = { onSaved(it.id) }, onFailure = { formError = it.message })
        }
    }

    Column(modifier = Modifier.fillMaxSize().background(SqCanvas).verticalScroll(rememberScrollState()).padding(20.dp)) {
        ScreenHeader(if (itemId == null) "Thêm món" else "Sửa món", onBack)
        Spacer(modifier = Modifier.height(12.dp))

        when {
            isLoading -> FullScreenLoading()
            loadError != null -> ErrorState(loadError!!) { attempt++ }
            else -> {
                SqCard {
                    SectionTitle("Ảnh món")
                    Spacer(modifier = Modifier.height(10.dp))
                    RemoteImage(imageUrl.trim().ifEmpty { null }, modifier = Modifier.fillMaxWidth().height(160.dp), corner = 14.dp)
                    Spacer(modifier = Modifier.height(10.dp))
                    // shortcut: backend chưa có endpoint tải ảnh (và chưa có AI đọc ảnh/kiểm tra ảnh) nên chỉ nhận URL; thêm khi có API storage.
                    SqField("URL ảnh", imageUrl, placeholder = "https://…", keyboardType = KeyboardType.Uri,
                        hint = "Dán đường dẫn ảnh đã tải lên. Ứng dụng chưa hỗ trợ chụp/tải ảnh trực tiếp.") { imageUrl = it }
                }
                Spacer(modifier = Modifier.height(12.dp))

                SqCard {
                    SectionTitle("Thông tin chính")
                    Spacer(modifier = Modifier.height(10.dp))
                    SqField("Tên món", name, hint = "2–80 ký tự, không trùng món đang dùng") { name = it.take(80) }
                    Spacer(modifier = Modifier.height(12.dp))
                    Text("Loại món", fontSize = 12.sp, color = SqInkSoft)
                    Spacer(modifier = Modifier.height(6.dp))
                    FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        (ITEM_CATEGORIES + listOf(category).filter { it.isNotBlank() && it !in ITEM_CATEGORIES }).forEach { c ->
                            SqChip(c, category == c) { category = c }
                        }
                    }
                    Spacer(modifier = Modifier.height(12.dp))
                    Row {
                        SqField("Giá gốc (đ)", price, modifier = Modifier.weight(1f), keyboardType = KeyboardType.Number,
                            hint = "Bội số 500đ") { price = it.filter(Char::isDigit).take(7) }
                        Spacer(modifier = Modifier.width(10.dp))
                        SqField("Hạn dùng chuẩn (giờ)", shelfLife, modifier = Modifier.weight(1f), keyboardType = KeyboardType.Number,
                            hint = "1–168 giờ") { shelfLife = it.filter(Char::isDigit).take(3) }
                    }
                    Spacer(modifier = Modifier.height(10.dp))
                    Row {
                        SqField("Trọng lượng (g)", weight, modifier = Modifier.weight(1f), keyboardType = KeyboardType.Number,
                            hint = "Tùy chọn, 10–5.000g") { weight = it.filter(Char::isDigit).take(4) }
                        Spacer(modifier = Modifier.width(10.dp))
                        SqField("Giá vốn (đ)", cost, modifier = Modifier.weight(1f), keyboardType = KeyboardType.Number,
                            hint = "Tùy chọn, ≤ giá gốc") { cost = it.filter(Char::isDigit).take(7) }
                    }
                }
                Spacer(modifier = Modifier.height(12.dp))

                SqCard {
                    SectionTitle("Thành phần và dị ứng")
                    Spacer(modifier = Modifier.height(10.dp))
                    SqField("Thành phần", ingredients, singleLine = false, placeholder = "Bột mì, bơ, trứng…") { ingredients = it.take(1000) }
                    Spacer(modifier = Modifier.height(12.dp))
                    Text("Chất gây dị ứng", fontSize = 12.sp, color = SqInkSoft)
                    Spacer(modifier = Modifier.height(6.dp))
                    FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        (COMMON_ALLERGENS + allergens.filter { it !in COMMON_ALLERGENS }).forEach { a ->
                            SqChip(a, a in allergens) { if (a in allergens) allergens.remove(a) else allergens.add(a) }
                        }
                    }
                    Spacer(modifier = Modifier.height(12.dp))
                    SqField("Mô tả", description, singleLine = false, placeholder = "Mô tả ngắn cho khách") { description = it.take(1000) }
                }

                InlineError(formError)
                Spacer(modifier = Modifier.height(12.dp))
                PrimaryButton(if (itemId == null) "Tạo món" else "Lưu thay đổi", loading = saving, onClick = ::save)
            }
        }
    }
}
