package com.surplusiq.merchant.ui.screens

import androidx.compose.ui.Alignment
import androidx.compose.material.icons.Icons
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.clickable
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.filled.AddAPhoto
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.IconButton
import androidx.compose.material3.Icon
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
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
import com.surplusiq.merchant.data.uploadImageUri
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
    var uploading by remember { mutableStateOf(false) }
    var uploadError by remember { mutableStateOf<String?>(null) }
    val context = androidx.compose.ui.platform.LocalContext.current
    val uploadScope = rememberCoroutineScope()
    val pickImage = rememberImagePicker { uri ->
        uploading = true; uploadError = null
        uploadScope.launch {
            repository.uploadImageUri(context, uri).fold(onSuccess = { imageUrl = it }, onFailure = { uploadError = it.message })
            uploading = false
        }
    }
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

    Column(modifier = Modifier.fillMaxSize().background(SqCanvas)) {
        Box(Modifier.padding(start = 20.dp, end = 20.dp, top = 20.dp)) { ScreenHeader(if (itemId == null) "Thêm món" else "Sửa món", onBack) }

        when {
            isLoading -> Box(Modifier.padding(20.dp)) { FullScreenLoading() }
            loadError != null -> Box(Modifier.padding(20.dp)) { ErrorState(loadError!!) { attempt++ } }
            else -> {
                Column(modifier = Modifier.weight(1f).verticalScroll(rememberScrollState()).padding(horizontal = 20.dp, vertical = 12.dp)) {
                    SqCard {
                        SectionTitle("Ảnh món")
                        Spacer(modifier = Modifier.height(12.dp))
                        if (imageUrl.isBlank()) {
                            PhotoPlaceholderButton("Thêm ảnh món", pickImage, Modifier.fillMaxWidth().height(168.dp), hint = "JPEG, PNG hoặc WebP, tự thu nhỏ trước khi tải", loading = uploading)
                        } else {
                            Box(Modifier.fillMaxWidth().height(168.dp)) {
                                RemoteImage(imageUrl, modifier = Modifier.fillMaxSize(), corner = 16.dp)
                                IconButton(
                                    onClick = { imageUrl = "" },
                                    modifier = Modifier.align(Alignment.TopEnd).padding(8.dp).size(34.dp).clip(CircleShape).background(Color.White)
                                ) { Icon(Icons.Default.Close, contentDescription = "Bỏ ảnh", tint = SqInk, modifier = Modifier.size(18.dp)) }
                                Row(
                                    Modifier.align(Alignment.BottomEnd).padding(10.dp).clip(RoundedCornerShape(50)).background(Color.White)
                                        .clickable(enabled = !uploading, onClick = pickImage).padding(horizontal = 14.dp, vertical = 8.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Icon(Icons.Default.AddAPhoto, contentDescription = null, tint = SqCoral, modifier = Modifier.size(16.dp))
                                    Spacer(Modifier.width(6.dp))
                                    Text(if (uploading) "Đang tải…" else "Đổi ảnh", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = SqCoralDeep)
                                }
                            }
                        }
                        InlineError(uploadError)
                    }
                    Spacer(modifier = Modifier.height(14.dp))

                    SqCard {
                        SectionTitle("Thông tin chính")
                        Spacer(modifier = Modifier.height(12.dp))
                        SqField("Tên món", name, placeholder = "Ví dụ: Croissant bơ Pháp", hint = "2 đến 80 ký tự, không trùng món đang dùng") { name = it.take(80) }
                        Spacer(modifier = Modifier.height(16.dp))
                        Text("Loại món", fontSize = 13.sp, fontWeight = FontWeight.Medium, color = SqInkSoft)
                        Spacer(modifier = Modifier.height(8.dp))
                        FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            (ITEM_CATEGORIES + listOf(category).filter { it.isNotBlank() && it !in ITEM_CATEGORIES }).forEach { c ->
                                SqChip(c, category == c) { category = c }
                            }
                        }
                        Spacer(modifier = Modifier.height(16.dp))
                        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                            SqField("Giá gốc", price, modifier = Modifier.weight(1f), keyboardType = KeyboardType.Number, suffix = "đ",
                                hint = "Bội số của 500đ") { price = it.filter(Char::isDigit).take(7) }
                            SqField("Hạn dùng chuẩn", shelfLife, modifier = Modifier.weight(1f), keyboardType = KeyboardType.Number, suffix = "giờ",
                                hint = "Từ 1 đến 168 giờ") { shelfLife = it.filter(Char::isDigit).take(3) }
                        }
                        Spacer(modifier = Modifier.height(14.dp))
                        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                            SqField("Trọng lượng", weight, modifier = Modifier.weight(1f), keyboardType = KeyboardType.Number, suffix = "g",
                                hint = "Không bắt buộc, 10–5.000g") { weight = it.filter(Char::isDigit).take(4) }
                            SqField("Giá vốn", cost, modifier = Modifier.weight(1f), keyboardType = KeyboardType.Number, suffix = "đ",
                                hint = "Không bắt buộc, ≤ giá gốc") { cost = it.filter(Char::isDigit).take(7) }
                        }
                    }
                    Spacer(modifier = Modifier.height(14.dp))

                    SqCard {
                        SectionTitle("Thành phần và dị ứng")
                        Spacer(modifier = Modifier.height(12.dp))
                        SqField("Thành phần", ingredients, singleLine = false, placeholder = "Bột mì, bơ, trứng…") { ingredients = it.take(1000) }
                        Spacer(modifier = Modifier.height(16.dp))
                        Text("Chất gây dị ứng", fontSize = 13.sp, fontWeight = FontWeight.Medium, color = SqInkSoft)
                        Spacer(modifier = Modifier.height(8.dp))
                        FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            (COMMON_ALLERGENS + allergens.filter { it !in COMMON_ALLERGENS }).forEach { a ->
                                SqChip(a, a in allergens) { if (a in allergens) allergens.remove(a) else allergens.add(a) }
                            }
                        }
                        Spacer(modifier = Modifier.height(16.dp))
                        SqField("Mô tả", description, singleLine = false, placeholder = "Mô tả ngắn cho khách") { description = it.take(1000) }
                    }
                    Spacer(modifier = Modifier.height(16.dp))
                }

                // Nút lưu luôn nằm cố định phía dưới, không phải cuộn hết form mới thấy.
                Column(Modifier.fillMaxWidth().shadow(10.dp).background(Color.White).padding(horizontal = 20.dp, vertical = 12.dp)) {
                    InlineError(formError)
                    PrimaryButton(if (itemId == null) "Tạo món" else "Lưu thay đổi", loading = saving, onClick = ::save)
                }
            }
        }
    }
}
