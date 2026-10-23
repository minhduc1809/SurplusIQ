package com.surplusiq.merchant.ui.components

import androidx.compose.foundation.layout.offset
import androidx.compose.material.icons.filled.BakeryDining
import androidx.compose.material.icons.filled.Cake
import androidx.compose.material.icons.filled.LocalCafe
import androidx.compose.material.icons.filled.RiceBowl
import androidx.compose.material.icons.filled.Fastfood
import android.graphics.BitmapFactory
import android.util.LruCache
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.LocalGroceryStore
import androidx.compose.material.icons.filled.Eco
import androidx.compose.material.icons.filled.KebabDining
import androidx.compose.material.icons.filled.RamenDining
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.ArrowDropDown
import androidx.compose.material.icons.filled.ErrorOutline
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material.icons.filled.Restaurant
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.net.URL
import java.time.Duration
import java.time.LocalDate
import java.time.LocalTime
import androidx.compose.material.icons.filled.WorkspacePremium
import androidx.compose.ui.text.input.KeyboardType
import com.surplusiq.merchant.data.StoreRepository
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.surplusiq.merchant.ui.theme.*
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter

/** Khối dựng dùng chung cho các màn hồ sơ / vận hành / gói dịch vụ. */

@Composable
fun ScreenHeader(title: String, onBack: () -> Unit, actions: @Composable RowScope.() -> Unit = {}) {
    Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth()) {
        IconButton(onClick = onBack) {
            Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Quay lại", tint = SqInk)
        }
        Text(
            text = title, fontSize = 22.sp, lineHeight = 28.sp, fontWeight = FontWeight.ExtraBold, color = SqInk,
            maxLines = 2, overflow = TextOverflow.Ellipsis, modifier = Modifier.weight(1f)
        )
        actions()
    }
}

data class MenuEntry(val label: String, val icon: ImageVector, val onClick: () -> Unit)

/** Nút "⋯" mở menu thao tác. */
@Composable
fun OverflowMenu(entries: List<MenuEntry>, contentDescription: String = "Thêm thao tác") {
    var open by remember { mutableStateOf(false) }
    Box {
        IconButton(onClick = { open = true }) {
            Icon(Icons.Default.MoreVert, contentDescription = contentDescription, tint = SqInkSoft)
        }
        DropdownMenu(expanded = open, onDismissRequest = { open = false }, modifier = Modifier.background(SqSurface)) {
            entries.forEach { e ->
                DropdownMenuItem(
                    text = { Text(e.label, fontSize = 14.sp, color = SqInk) },
                    leadingIcon = { Icon(e.icon, contentDescription = null, tint = SqInkSoft, modifier = Modifier.size(20.dp)) },
                    onClick = { open = false; e.onClick() }
                )
            }
        }
    }
}

/** Tiêu đề màn gốc của tab: tên + nút thêm tròn + menu phụ. */
@Composable
fun TabHeader(title: String, addLabel: String, onAdd: () -> Unit, menu: List<MenuEntry>) {
    Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
        Text(text = title, fontSize = 26.sp, fontWeight = FontWeight.ExtraBold, color = SqInk, maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.weight(1f))
        OverflowMenu(menu)
        Spacer(modifier = Modifier.width(4.dp))
        Row(
            Modifier.clip(RoundedCornerShape(50)).background(SqCoral).clickable(onClick = onAdd).padding(horizontal = 14.dp, vertical = 10.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(Icons.Default.Add, contentDescription = null, tint = Color.White, modifier = Modifier.size(18.dp))
            Spacer(Modifier.width(4.dp))
            Text(addLabel, color = Color.White, fontWeight = FontWeight.Bold, fontSize = 14.sp, maxLines = 1)
        }
    }
}

@Composable
fun <T> ChipRow(options: List<Pair<T, String>>, selected: T, modifier: Modifier = Modifier, onSelect: (T) -> Unit) {
    LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = modifier) {
        items(options) { (value, label) -> SqChip(label, selected == value) { onSelect(value) } }
    }
}

@Composable
fun SectionTitle(text: String, modifier: Modifier = Modifier) {
    Text(text = text, fontSize = 15.sp, fontWeight = FontWeight.Bold, color = SqInk, modifier = modifier)
}

/** Ô chọn một giá trị; searchable thêm ô lọc trong menu (danh sách món dài). */
@Composable
fun <T> SqDropdown(
    label: String,
    options: List<Pair<T, String>>,
    selected: T,
    modifier: Modifier = Modifier,
    placeholder: String = "Chọn…",
    searchable: Boolean = false,
    onSelect: (T) -> Unit
) {
    var open by remember { mutableStateOf(false) }
    var query by remember { mutableStateOf("") }
    val close = { open = false; query = "" }
    val current = options.firstOrNull { it.first == selected }?.second
    Column(modifier = modifier) {
        if (label.isNotEmpty()) {
            Text(text = label, fontSize = 12.sp, color = SqInkSoft)
            Spacer(modifier = Modifier.height(4.dp))
        }
        Box {
            Row(
                modifier = Modifier.fillMaxWidth().height(48.dp).clip(RoundedCornerShape(12.dp)).background(SqSurfaceSoft)
                    .border(1.dp, SqLine, RoundedCornerShape(12.dp)).clickable { open = true }.padding(horizontal = 14.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = current ?: placeholder, fontSize = 14.sp, color = if (current != null) SqInk else SqInkMuted,
                    maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.weight(1f)
                )
                Icon(Icons.Default.ArrowDropDown, contentDescription = null, tint = SqInkMuted)
            }
            DropdownMenu(expanded = open, onDismissRequest = close, modifier = Modifier.heightIn(max = 360.dp).background(SqSurface)) {
                if (searchable) {
                    SqField("", query, modifier = Modifier.width(280.dp).padding(horizontal = 12.dp, vertical = 4.dp), placeholder = "Tìm…") { query = it }
                }
                options.filter { !searchable || it.second.contains(query.trim(), ignoreCase = true) }.forEach { (value, text) ->
                    DropdownMenuItem(text = { Text(text, fontSize = 14.sp, color = SqInk) }, onClick = { onSelect(value); close() })
                }
            }
        }
    }
}

/** Thanh dưới cố định khi chọn nhiều dòng: "Đã chọn N …" + nút hành động. */
@Composable
fun SelectionBar(summary: String, actionText: String, enabled: Boolean = true, loading: Boolean = false, onAction: () -> Unit) {
    Row(
        modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(SqInk).padding(start = 16.dp, end = 8.dp, top = 8.dp, bottom = 8.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(text = summary, color = Color.White, fontSize = 14.sp, fontWeight = FontWeight.SemiBold, modifier = Modifier.weight(1f))
        Button(
            onClick = onAction, enabled = enabled && !loading, shape = RoundedCornerShape(20.dp),
            colors = ButtonDefaults.buttonColors(containerColor = SqCoral)
        ) {
            if (loading) CircularProgressIndicator(color = Color.White, strokeWidth = 2.dp, modifier = Modifier.size(18.dp))
            else Text(actionText, color = Color.White, fontWeight = FontWeight.Bold)
        }
    }
}

private val imageCache = LruCache<String, ImageBitmap>(40)

/** Ảnh từ URL (không có thư viện ảnh trong app) - rơi về biểu tượng món khi trống/lỗi. */
// shortcut: tải nguyên ảnh không thu nhỏ; thêm inSampleSize nếu ảnh món lớn gây tốn bộ nhớ.
@Composable
fun RemoteImage(url: String?, modifier: Modifier = Modifier, corner: Dp = 12.dp, fallback: androidx.compose.ui.graphics.vector.ImageVector = Icons.Default.Restaurant) {
    val bitmap by produceState(initialValue = url?.let { imageCache.get(it) }, url) {
        if (url.isNullOrBlank() || value != null) return@produceState
        value = withContext(Dispatchers.IO) {
            runCatching {
                // Ảnh từ kho ngoài tải qua backend để không phụ thuộc mạng của máy
                val source = if (url.startsWith("https://images.unsplash.com/") || url.startsWith("https://res.cloudinary.com/"))
                    com.surplusiq.merchant.BuildConfig.API_BASE_URL.trimEnd('/') + "/media/proxy?url=" + java.net.URLEncoder.encode(url, "UTF-8")
                else url
                val conn = URL(source).openConnection().apply { connectTimeout = 8000; readTimeout = 8000 }
                conn.getInputStream().use { BitmapFactory.decodeStream(it) }?.asImageBitmap()
            }.getOrNull()
        }?.also { imageCache.put(url, it) }
    }
    Box(modifier = modifier.clip(RoundedCornerShape(corner)).background(SqButterWash), contentAlignment = Alignment.Center) {
        val b = bitmap
        if (b != null) Image(b, contentDescription = null, contentScale = ContentScale.Crop, modifier = Modifier.fillMaxSize())
        else Icon(fallback, contentDescription = null, tint = SqButter)
    }
}

// --- Quy tắc suất dùng chung (khớp offers.service.ts) ---

internal val HHMM = Regex("^([01]\\d|2[0-3]):[0-5]\\d$")
const val PRICE_STEP = 500L
const val MAX_PICKUP_MINUTES = 180L

/** Ngày + "HH:mm" giờ máy -> ISO UTC gửi backend. */
fun isoAt(date: LocalDate, hhmm: String): String =
    date.atTime(LocalTime.parse(hhmm)).atZone(ZoneId.systemDefault()).toInstant().toString()

/** Khung nhận: đúng định dạng, kết thúc sau bắt đầu, tối đa 3 giờ (S26). */
fun pickupWindowError(start: String, end: String): String? = when {
    !HHMM.matches(start) || !HHMM.matches(end) -> "Khung nhận phải có dạng HH:mm."
    end <= start -> "Giờ kết thúc nhận phải sau giờ bắt đầu."
    Duration.between(LocalTime.parse(start), LocalTime.parse(end)).toMinutes() > MAX_PICKUP_MINUTES -> "Khung nhận tối đa 3 giờ."
    else -> null
}

/** Giá sàn mặc định backend: 40% giá gốc làm tròn lên bội 500đ (BR-054). */
fun floorPriceFor(original: Long): Long = (original * 4 + 4999) / 5000 * PRICE_STEP

fun offerPriceError(price: Long?, original: Long, floor: Long): String? = when {
    price == null -> "Nhập giá bán."
    price % PRICE_STEP != 0L -> "Giá bán phải là bội số của 500đ."
    price < floor -> "Giá bán không được thấp hơn giá sàn ${currency(floor)}."
    price > original -> "Giá bán không được cao hơn giá gốc ${currency(original)}."
    else -> null
}

fun discountPercent(original: Long, price: Long): Int =
    if (original <= 0) 0 else ((original - price) * 100 / original).toInt()

@Composable
fun SqCard(modifier: Modifier = Modifier, content: @Composable ColumnScope.() -> Unit) {
    Column(
        modifier = modifier.fillMaxWidth().sqSurface(22.dp).padding(16.dp),
        content = content
    )
}

@Composable
fun SqField(
    label: String,
    value: String,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    hint: String? = null,
    placeholder: String = "",
    keyboardType: KeyboardType = KeyboardType.Text,
    singleLine: Boolean = true,
    suffix: String? = null,
    onValueChange: (String) -> Unit
) {
    Column(modifier = modifier) {
        if (label.isNotEmpty()) {
            Text(text = label, fontSize = 13.sp, fontWeight = FontWeight.Medium, color = SqInkSoft)
            Spacer(modifier = Modifier.height(6.dp))
        }
        Box(
            modifier = Modifier.fillMaxWidth()
                .then(if (singleLine) Modifier.height(52.dp) else Modifier.heightIn(min = 96.dp))
                .clip(RoundedCornerShape(14.dp))
                .background(if (enabled) SqSurfaceSoft else SqSurface)
                .border(1.dp, SqLine, RoundedCornerShape(14.dp))
                .padding(start = 16.dp, end = if (suffix != null) 52.dp else 16.dp, top = if (singleLine) 0.dp else 14.dp, bottom = if (singleLine) 0.dp else 14.dp),
            contentAlignment = if (singleLine) Alignment.CenterStart else Alignment.TopStart
        ) {
            if (suffix != null) Text(suffix, fontSize = 13.sp, color = SqInkMuted, modifier = Modifier.align(Alignment.CenterEnd).padding(start = 8.dp).offset(x = 38.dp))
            BasicTextField(
                value = value,
                onValueChange = onValueChange,
                enabled = enabled,
                singleLine = singleLine,
                modifier = Modifier.fillMaxWidth(),
                textStyle = TextStyle(fontSize = 15.sp, color = SqInk),
                cursorBrush = SolidColor(SqCoral),
                keyboardOptions = KeyboardOptions(keyboardType = keyboardType),
                decorationBox = { inner ->
                    if (value.isEmpty() && placeholder.isNotEmpty()) Text(placeholder, fontSize = 15.sp, color = SqInkMuted)
                    inner()
                }
            )
        }
        if (hint != null) {
            Spacer(modifier = Modifier.height(4.dp))
            Text(text = hint, fontSize = 11.sp, color = SqInkMuted)
        }
    }
}

@Composable
fun SqChip(label: String, selected: Boolean, enabled: Boolean = true, onClick: () -> Unit) {
    Box(
        modifier = Modifier.heightIn(min = 40.dp).clip(RoundedCornerShape(50))
            .background(if (selected) SqCoral else SqSurface)
            .border(1.dp, if (selected) SqCoral else SqLine, RoundedCornerShape(50))
            .clickable(enabled = enabled, onClick = onClick)
            .padding(horizontal = 16.dp),
        contentAlignment = Alignment.Center
    ) {
        Text(
            text = label, fontSize = 13.sp, fontWeight = FontWeight.SemiBold,
            color = when { !enabled -> SqInkMuted; selected -> Color.White; else -> SqInk }
        )
    }
}

@Composable
fun PrimaryButton(
    text: String,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    loading: Boolean = false,
    color: Color = SqCoral,
    onClick: () -> Unit
) {
    Button(
        onClick = { if (!loading) onClick() },
        enabled = enabled && !loading,
        modifier = modifier.fillMaxWidth().height(50.dp),
        shape = RoundedCornerShape(25.dp),
        colors = ButtonDefaults.buttonColors(containerColor = color)
    ) {
        if (loading) CircularProgressIndicator(color = Color.White, modifier = Modifier.size(20.dp))
        else Text(text, color = Color.White, fontWeight = FontWeight.Bold)
    }
}

@Composable
fun InlineError(message: String?) {
    if (message == null) return
    Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(vertical = 6.dp)) {
        Icon(Icons.Default.ErrorOutline, contentDescription = null, tint = SqCoralDeep, modifier = Modifier.size(16.dp))
        Spacer(modifier = Modifier.width(6.dp))
        Text(text = message, color = SqCoralDeep, fontSize = 12.sp)
    }
}

@Composable
fun InlineSuccess(message: String?) {
    if (message == null) return
    Text(text = message, color = SqMintDeep, fontSize = 12.sp, modifier = Modifier.padding(vertical = 6.dp))
}

/** Hộp xác nhận chung; [content] chèn thêm ô nhập (vd. lý do hủy) dưới lời nhắn. */
@Composable
fun ConfirmDialog(
    title: String,
    message: String,
    confirmLabel: String,
    onConfirm: () -> Unit,
    onDismiss: () -> Unit,
    confirmEnabled: Boolean = true,
    content: @Composable ColumnScope.() -> Unit = {}
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = SqSurface,
        title = { Text(title, fontWeight = FontWeight.Bold) },
        text = {
            Column {
                Text(message, fontSize = 13.sp, color = SqInkSoft)
                content()
            }
        },
        confirmButton = {
            TextButton(onClick = onConfirm, enabled = confirmEnabled) { Text(confirmLabel, color = SqCoralDeep) }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Hủy", color = SqInkSoft) } }
    )
}

/**
 * Tính năng gói Pro: tải gói hiện tại (GET store/subscription/current); gói Cơ bản thấy lời mời nâng cấp
 * thay vì màn trống. TRIAL tính như Pro (effectivePlan).
 */
@Composable
fun ProGate(repository: StoreRepository, feature: String, onUpgrade: () -> Unit, content: @Composable () -> Unit) {
    var plan by remember { mutableStateOf<String?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    var attempt by remember { mutableIntStateOf(0) }
    LaunchedEffect(attempt) {
        error = null
        repository.getSubscription().fold(
            onSuccess = { plan = it.effectivePlan ?: it.plan },
            onFailure = { error = it.message }
        )
    }
    when {
        error != null -> ErrorState(error!!) { attempt++ }
        plan == null -> FullScreenLoading()
        plan == "BASIC" -> ProLockCard(feature, onUpgrade)
        else -> content()
    }
}

/** Thẻ mời nâng cấp hiện thay cho nội dung chỉ có ở gói Chuyên nghiệp. */
@Composable
fun ProLockCard(feature: String, onUpgrade: () -> Unit) {
    SqCard {
        Icon(Icons.Default.WorkspacePremium, contentDescription = null, tint = SqCoralDeep, modifier = Modifier.size(32.dp))
        Spacer(modifier = Modifier.height(8.dp))
        Text("$feature thuộc gói Chuyên nghiệp", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = SqInk)
        Text("Nâng cấp hoặc dùng thử Chuyên nghiệp để mở tính năng này.", fontSize = 13.sp, color = SqInkSoft)
        Spacer(modifier = Modifier.height(12.dp))
        PrimaryButton("Xem gói Chuyên nghiệp", onClick = onUpgrade)
    }
}

/** Khóa cả màn hình Pro: gói Cơ bản chỉ thấy tiêu đề và thẻ mời nâng cấp, không gọi API của màn đó. */
@Composable
fun ProRoute(repository: StoreRepository, feature: String, onUpgrade: () -> Unit, onBack: () -> Unit, content: @Composable () -> Unit) {
    var plan by remember { mutableStateOf<String?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    var attempt by remember { mutableIntStateOf(0) }
    LaunchedEffect(attempt) {
        error = null
        repository.getSubscription().fold(onSuccess = { plan = it.effectivePlan ?: it.plan }, onFailure = { error = it.message })
    }
    if (plan != null && plan != "BASIC") { content(); return }
    Column(Modifier.fillMaxSize().background(SqCanvas).padding(20.dp)) {
        ScreenHeader(feature, onBack)
        Spacer(Modifier.height(12.dp))
        when {
            error != null -> ErrorState(error!!) { attempt++ }
            plan == null -> FullScreenLoading()
            else -> ProLockCard(feature, onUpgrade)
        }
    }
}

/** Dòng nhãn - giá trị trong thẻ chi tiết. */
@Composable
fun InfoRow(label: String, value: String, valueColor: Color = SqInk) {
    Row(modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp), horizontalArrangement = Arrangement.SpaceBetween) {
        Text(text = label, fontSize = 12.sp, color = SqInkMuted, modifier = Modifier.weight(1f))
        Text(text = value, fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = valueColor)
    }
}

/** Đọc số từ trường jsonb tự do (Gson parse số thành Double). */
fun Map<String, Any?>?.num(key: String): Double? = (this?.get(key) as? Number)?.toDouble()

fun todayIso(): String = java.time.LocalDate.now().toString()

/** ISO timestamp -> "08:30" theo giờ máy. */
fun shortTime(iso: String?): String = try {
    Instant.parse(iso).atZone(ZoneId.systemDefault()).format(DateTimeFormatter.ofPattern("HH:mm"))
} catch (_: Exception) {
    "—"
}

/** ISO "2026-10-19..." -> "19/10/2026". */
fun shortDate(iso: String?): String =
    iso?.take(10)?.split("-")?.takeIf { it.size == 3 }?.reversed()?.joinToString("/") ?: "—"

/** ISO timestamp -> "19/10/2026 08:30" theo giờ máy. */
fun shortDateTime(iso: String?): String = try {
    Instant.parse(iso).atZone(ZoneId.systemDefault()).format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm"))
} catch (_: Exception) {
    shortDate(iso)
}

/** Lưu tệp qua hộp thoại hệ thống (SAF) - không cần quyền bộ nhớ hay thư viện ngoài. */
@Composable
fun rememberFileSaver(mimeType: String, onResult: (Boolean) -> Unit): (fileName: String, bytes: ByteArray) -> Unit {
    val context = LocalContext.current
    var pending by remember { mutableStateOf<ByteArray?>(null) }
    val launcher = rememberLauncherForActivityResult(ActivityResultContracts.CreateDocument(mimeType)) { uri ->
        val bytes = pending
        pending = null
        if (uri == null || bytes == null) return@rememberLauncherForActivityResult
        val ok = runCatching {
            context.contentResolver.openOutputStream(uri)?.use { it.write(bytes) } != null
        }.getOrDefault(false)
        onResult(ok)
    }
    return { fileName, bytes ->
        pending = bytes
        launcher.launch(fileName)
    }
}

/** Icon minh họa theo nhóm món khi chưa có ảnh; nhóm lạ dùng icon món ăn chung. */
fun categoryIcon(category: String?): androidx.compose.ui.graphics.vector.ImageVector = when (category.orEmpty().uppercase()) {
    "RICE" -> Icons.Default.RiceBowl
    "NOODLE" -> Icons.Default.RamenDining
    "BREAD" -> Icons.Default.BakeryDining
    "FASTFOOD" -> Icons.Default.Fastfood
    "SNACK" -> Icons.Default.KebabDining
    "HEALTHY" -> Icons.Default.Eco
    "SWEET" -> Icons.Default.Cake
    "DRINK" -> Icons.Default.LocalCafe
    "PRODUCE" -> Icons.Default.LocalGroceryStore
    else -> Icons.Default.Restaurant
}

/** 10 nhóm món chuẩn (mã gửi lên máy chủ, tên hiển thị); khớp food-category.ts ở backend và app khách. */
val FOOD_CATEGORIES = listOf(
    "RICE" to "Cơm",
    "NOODLE" to "Phở & Bún",
    "BREAD" to "Bánh mì",
    "FASTFOOD" to "Đồ nhanh",
    "SNACK" to "Ăn vặt",
    "HEALTHY" to "Healthy",
    "SWEET" to "Bánh ngọt",
    "DRINK" to "Đồ uống",
    "PRODUCE" to "Nông sản",
    "OTHER" to "Khác",
)

/** Tên hiển thị của một nhóm món; giá trị lạ (dữ liệu cũ) giữ nguyên. */
fun categoryLabel(code: String?): String =
    FOOD_CATEGORIES.firstOrNull { it.first.equals(code, ignoreCase = true) }?.second ?: code.orEmpty().ifBlank { "Khác" }
