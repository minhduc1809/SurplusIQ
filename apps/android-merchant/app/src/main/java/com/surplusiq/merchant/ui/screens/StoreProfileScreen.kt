package com.surplusiq.merchant.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.surplusiq.merchant.data.DayHoursDto
import com.surplusiq.merchant.data.StoreDto
import com.surplusiq.merchant.data.StoreRepository
import com.surplusiq.merchant.data.UpdateStoreProfileRequest
import com.surplusiq.merchant.ui.components.*
import com.surplusiq.merchant.ui.theme.*
import kotlinx.coroutines.launch

internal val WEEK_DAYS = listOf(
    "monday" to "Thứ 2", "tuesday" to "Thứ 3", "wednesday" to "Thứ 4", "thursday" to "Thứ 5",
    "friday" to "Thứ 6", "saturday" to "Thứ 7", "sunday" to "Chủ nhật",
)

private val STORE_STATUS = mapOf(
    "ACTIVE" to "Đang hoạt động",
    "PENDING_VERIFY" to "Chờ xác minh",
    "SUSPENDED" to "Bị đình chỉ",
)

/** S09 - Hồ sơ cửa hàng (GET/PUT store/profile). */
@Composable
fun StoreProfileScreen(repository: StoreRepository, onBack: () -> Unit) {
    var store by remember { mutableStateOf<StoreDto?>(null) }
    var isPausedToday by remember { mutableStateOf(false) }
    var isLoading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }
    var editing by remember { mutableStateOf(false) }
    var saving by remember { mutableStateOf(false) }
    var formError by remember { mutableStateOf<String?>(null) }
    var success by remember { mutableStateOf<String?>(null) }

    var name by remember { mutableStateOf("") }
    var address by remember { mutableStateOf("") }
    var phone by remember { mutableStateOf("") }
    var logoUrl by remember { mutableStateOf("") }
    val hours = remember { mutableStateMapOf<String, DayHoursDto>() }
    val scope = rememberCoroutineScope()

    fun fill(s: StoreDto) {
        name = s.name
        address = s.address.orEmpty()
        phone = s.phone.orEmpty()
        logoUrl = s.logoUrl.orEmpty()
        WEEK_DAYS.forEach { (key, _) -> hours[key] = s.openHours?.get(key) ?: DayHoursDto("07:00", "21:30", false) }
    }

    fun load() {
        isLoading = true
        error = null
        scope.launch {
            val result = repository.getStoreProfile()
            isLoading = false
            result.fold(
                onSuccess = { store = it.store; isPausedToday = it.isPausedToday; fill(it.store) },
                onFailure = { error = it.message }
            )
        }
    }

    fun validate(): String? {
        if (name.trim().length !in 2..80) return "Tên cửa hàng cần 2–80 ký tự."
        if (address.isBlank()) return "Địa chỉ không được để trống."
        if (phone.trim().length !in 9..15) return "Số điện thoại cần 9–15 chữ số."
        WEEK_DAYS.forEach { (key, label) ->
            val d = hours[key] ?: return@forEach
            if (d.closed == true) return@forEach
            if (!HHMM.matches(d.open.orEmpty()) || !HHMM.matches(d.close.orEmpty())) return "$label: giờ phải có dạng HH:mm."
            if (d.close!! <= d.open!!) return "$label: giờ đóng phải sau giờ mở."
        }
        return null
    }

    fun save() {
        formError = validate()
        if (formError != null) return
        saving = true
        success = null
        scope.launch {
            val request = UpdateStoreProfileRequest(
                name = name.trim(), address = address.trim(), phone = phone.trim(),
                logoUrl = logoUrl.trim().ifEmpty { null }, openHours = hours.toMap()
            )
            val result = repository.updateStoreProfile(request)
            saving = false
            result.fold(
                onSuccess = { store = it; fill(it); editing = false; success = "Đã lưu hồ sơ cửa hàng." },
                onFailure = { formError = it.message }
            )
        }
    }

    LaunchedEffect(Unit) { load() }

    Column(modifier = Modifier.fillMaxSize().background(SqCanvas).verticalScroll(rememberScrollState()).padding(20.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(modifier = Modifier.weight(1f)) { ScreenHeader("Hồ sơ cửa hàng", onBack) }
            if (store != null) {
                TextButton(onClick = {
                    if (editing) store?.let(::fill)
                    editing = !editing
                    formError = null
                    success = null
                }) { Text(if (editing) "Hủy" else "Sửa", color = SqCoral) }
            }
        }
        Spacer(modifier = Modifier.height(12.dp))

        when {
            isLoading -> FullScreenLoading()
            error != null -> ErrorState(message = error!!, onRetry = ::load)
            store != null -> {
                val s = store!!
                SqCard {
                    Row(horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {
                        Text("Trạng thái", fontSize = 14.sp, color = SqInkSoft)
                        Text(
                            text = if (isPausedToday) "Tạm ngưng hôm nay" else STORE_STATUS[s.status] ?: s.status.orEmpty(),
                            fontSize = 14.sp, fontWeight = FontWeight.Bold,
                            color = if (isPausedToday || s.status != "ACTIVE") SqCoralDeep else SqMintDeep
                        )
                    }
                }
                Spacer(modifier = Modifier.height(12.dp))

                SqCard {
                    SqField("Tên cửa hàng", name, enabled = editing, hint = if (editing) "2–80 ký tự" else null) { name = it }
                    Spacer(modifier = Modifier.height(10.dp))
                    SqField("Địa chỉ", address, enabled = editing) { address = it }
                    Spacer(modifier = Modifier.height(10.dp))
                    SqField("Số điện thoại", phone, enabled = editing) { phone = it.filter { c -> c.isDigit() || c == '+' } }
                    Spacer(modifier = Modifier.height(10.dp))
                    // shortcut: backend chưa có endpoint tải ảnh lên, chỉ nhận logoUrl; thêm upload khi có API storage.
                    SqField("Đường dẫn logo", logoUrl, enabled = editing, placeholder = "https://…") { logoUrl = it }
                }
                Spacer(modifier = Modifier.height(12.dp))

                SqCard {
                    Text("Giờ mở cửa", fontSize = 15.sp, fontWeight = FontWeight.Bold, color = SqInk)
                    Spacer(modifier = Modifier.height(8.dp))
                    WEEK_DAYS.forEach { (key, label) ->
                        val d = hours[key] ?: DayHoursDto("07:00", "21:30", false)
                        val open = d.closed != true
                        Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(vertical = 4.dp)) {
                            Text(label, fontSize = 13.sp, color = SqInk, modifier = Modifier.width(68.dp))
                            Switch(
                                checked = open,
                                onCheckedChange = { hours[key] = d.copy(closed = !it) },
                                enabled = editing,
                                colors = SwitchDefaults.colors(checkedTrackColor = SqMint)
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            if (open) {
                                SqField("", d.open.orEmpty(), modifier = Modifier.weight(1f), enabled = editing, placeholder = "07:00") {
                                    hours[key] = d.copy(open = it.take(5))
                                }
                                Text(" – ", color = SqInkSoft)
                                SqField("", d.close.orEmpty(), modifier = Modifier.weight(1f), enabled = editing, placeholder = "21:30") {
                                    hours[key] = d.copy(close = it.take(5))
                                }
                            } else {
                                Text("Nghỉ", fontSize = 13.sp, color = SqInkMuted)
                            }
                        }
                    }
                }

                InlineError(formError)
                InlineSuccess(success)
                if (editing) {
                    Spacer(modifier = Modifier.height(12.dp))
                    PrimaryButton("Lưu hồ sơ", loading = saving, onClick = ::save)
                }
            }
        }
    }
}
