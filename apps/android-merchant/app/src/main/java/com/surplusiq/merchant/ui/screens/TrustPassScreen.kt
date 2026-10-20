package com.surplusiq.merchant.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.surplusiq.merchant.data.*
import com.surplusiq.merchant.ui.components.*
import com.surplusiq.merchant.ui.theme.*
import kotlinx.coroutines.launch
import java.time.LocalDateTime

private val FIELD_LABEL = mapOf(
    "ingredients" to "Thành phần", "allergens" to "Dị ứng", "expiryAt" to "Hạn dùng", "storageInstructions" to "Bảo quản"
)

/**
 * CM-B05 - Hồ sơ minh bạch TrustPass của món (PATCH store/items/:id/trustpass, GET .../trustpass-history).
 * Nguồn luôn là cửa hàng tự khai báo, không có nhãn "đã xác minh" (BR-B05-02); trường để trống nghĩa là chưa cung cấp,
 * không phải "không có" (BR-B05-04). Hạn dùng khác khung giờ nhận. Chủ và quản lý.
 */
@Composable
fun TrustPassScreen(repository: StoreRepository, itemId: String, onBack: () -> Unit) {
    var item by remember { mutableStateOf<ItemDto?>(null) }
    var history by remember { mutableStateOf<List<TrustpassHistoryRow>>(emptyList()) }
    var error by remember { mutableStateOf<String?>(null) }
    var saveError by remember { mutableStateOf<String?>(null) }
    var saved by remember { mutableStateOf<String?>(null) }
    var busy by remember { mutableStateOf(false) }
    var ingredients by remember { mutableStateOf("") }
    var allergens by remember { mutableStateOf("") }
    var storage by remember { mutableStateOf("") }
    var prepared by remember { mutableStateOf<LocalDateTime?>(null) }
    var expiry by remember { mutableStateOf<LocalDateTime?>(null) }
    var retry by remember { mutableIntStateOf(0) }
    val scope = rememberCoroutineScope()

    LaunchedEffect(itemId, retry) {
        error = null
        repository.getItem(itemId).fold(
            onSuccess = {
                item = it
                ingredients = it.ingredients.orEmpty()
                allergens = it.allergens.orEmpty().joinToString(", ")
                storage = it.storageInstructions.orEmpty()
                val zone = java.time.ZoneId.systemDefault()
                prepared = it.preparedAt?.let { s -> runCatching { java.time.Instant.parse(s).atZone(zone).toLocalDateTime() }.getOrNull() }
                expiry = it.expiryAt?.let { s -> runCatching { java.time.Instant.parse(s).atZone(zone).toLocalDateTime() }.getOrNull() }
            },
            onFailure = { error = it.message }
        )
        repository.getTrustpassHistory(itemId).onSuccess { history = it }
    }

    val conflict = if (prepared != null && expiry != null && !expiry!!.isAfter(prepared)) "Hạn dùng phải sau thời điểm chuẩn bị." else null

    Column(Modifier.fillMaxSize().background(SqCanvas).verticalScroll(rememberScrollState()).padding(20.dp)) {
        ScreenHeader("Hồ sơ minh bạch", onBack)
        Spacer(Modifier.height(8.dp))
        Text("Hồ sơ minh bạch là thông tin cửa hàng tự khai báo, không phải chứng nhận an toàn thực phẩm. Trường để trống hiển thị cho khách là \"Chưa được cung cấp\".", fontSize = 12.sp, color = SqInkSoft)
        Spacer(Modifier.height(10.dp))
        val it = item
        when {
            error != null -> ErrorState(error!!) { retry++ }
            it == null -> FullScreenLoading()
            else -> {
                SqCard {
                    Text(it.name, fontSize = 16.sp, color = SqInk, modifier = Modifier.padding(bottom = 6.dp))
                    InfoRow("Phiên bản", if (it.trustpassVersion > 0) "${it.trustpassVersion}" else "Chưa công bố")
                    InfoRow("Nguồn", "Cửa hàng tự khai báo")
                    if (it.reviewStatus == "UNDER_REVIEW") Text(
                        "Hồ sơ đang được rà soát vì có khách báo sai lệch. Hãy kiểm tra và cập nhật thông tin cho đúng; nền tảng sẽ quyết định kết quả.",
                        fontSize = 12.sp, color = SqCoralDeep, modifier = Modifier.padding(top = 6.dp)
                    )
                }
                Spacer(Modifier.height(10.dp))
                SqCard {
                    SqField("Thành phần", ingredients, singleLine = false) { ingredients = it.take(500) }
                    Spacer(Modifier.height(10.dp))
                    SqField("Chất gây dị ứng (cách nhau bằng dấu phẩy)", allergens, placeholder = "Gluten, Trứng, Sữa") { allergens = it.take(200) }
                    Spacer(Modifier.height(10.dp))
                    DateTimeField("Thời điểm chuẩn bị", prepared) { prepared = it }
                    Spacer(Modifier.height(10.dp))
                    DateTimeField("Hạn dùng (khác với khung giờ nhận)", expiry) { expiry = it }
                    Spacer(Modifier.height(10.dp))
                    SqField("Hướng dẫn bảo quản", storage, singleLine = false) { storage = it.take(300) }
                }
                Spacer(Modifier.height(10.dp))
                InlineError(saveError ?: conflict)
                InlineSuccess(saved)
                PrimaryButton("Lưu và công bố", enabled = conflict == null && !busy, loading = busy, onClick = {
                    busy = true; saveError = null; saved = null
                    scope.launch {
                        repository.updateTrustpass(
                            itemId,
                            TrustpassRequest(
                                ingredients = ingredients.trim().ifBlank { null },
                                allergens = allergens.split(",").map { a -> a.trim() }.filter { a -> a.isNotEmpty() },
                                preparedAt = prepared?.toIsoUtc(),
                                expiryAt = expiry?.toIsoUtc(),
                                storageInstructions = storage.trim().ifBlank { null }
                            )
                        ).fold(onSuccess = { saved = "Đã lưu hồ sơ."; retry++ }, onFailure = { e -> saveError = e.message })
                        busy = false
                    }
                })
                Spacer(Modifier.height(14.dp))
                SqCard {
                    SectionTitle("Lịch sử thay đổi")
                    if (history.isEmpty()) Text("Chưa có thay đổi nào được ghi lại.", fontSize = 12.sp, color = SqInkSoft)
                    history.forEach { h ->
                        InfoRow("v${h.versionNo} · ${FIELD_LABEL[h.fieldName] ?: h.fieldName}", shortDateTime(h.createdAt))
                    }
                }
            }
        }
    }
}
