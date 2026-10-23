package com.surplusiq.merchant.ui.screens

import android.content.Context
import android.net.Uri
import android.provider.OpenableColumns
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.surplusiq.merchant.data.LegalProfileRequest
import com.surplusiq.merchant.data.LegalOverviewDto
import com.surplusiq.merchant.data.StoreRepository
import com.surplusiq.merchant.ui.components.*
import com.surplusiq.merchant.ui.theme.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.toRequestBody

private val BUSINESS_TYPES = listOf("INDIVIDUAL" to "Cá nhân kinh doanh", "HOUSEHOLD" to "Hộ kinh doanh", "COMPANY" to "Công ty")
private const val MAX_CONTRACT_BYTES = 10 * 1024 * 1024

private fun contractStatusLabel(status: String?) = when (status) {
    "PENDING_REVIEW" -> "Chờ duyệt"
    "APPROVED" -> "Đã duyệt"
    "REJECTED" -> "Bị từ chối"
    "NEED_MORE_INFO" -> "Cần bổ sung"
    else -> "Chưa tải lên"
}

private fun displayName(context: Context, uri: Uri): String =
    context.contentResolver.query(uri, null, null, null, null)?.use { c ->
        val i = c.getColumnIndex(OpenableColumns.DISPLAY_NAME)
        if (i >= 0 && c.moveToFirst()) c.getString(i) else null
    } ?: "hop-dong"

/**
 * Hồ sơ kinh doanh và hợp đồng hợp tác: chủ cửa hàng nhập thông tin pháp lý, tải bản scan hợp đồng đã ký
 * (PDF/JPG/PNG, tối đa 10 MB); quản trị viên duyệt. GET/PUT store/legal-profile, POST store/contract.
 */
@Composable
fun StoreLegalScreen(repository: StoreRepository, isOwner: Boolean, onBack: () -> Unit) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var overview by remember { mutableStateOf<LegalOverviewDto?>(null) }
    var loadError by remember { mutableStateOf<String?>(null) }
    var reloadKey by remember { mutableIntStateOf(0) }

    var legalName by remember { mutableStateOf("") }
    var businessType by remember { mutableStateOf("HOUSEHOLD") }
    var taxCode by remember { mutableStateOf("") }
    var license by remember { mutableStateOf("") }
    var repName by remember { mutableStateOf("") }
    var repPhone by remember { mutableStateOf("") }
    var legalAddress by remember { mutableStateOf("") }
    var saving by remember { mutableStateOf(false) }
    var uploading by remember { mutableStateOf(false) }
    var formError by remember { mutableStateOf<String?>(null) }
    var success by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(reloadKey) {
        loadError = null
        repository.getLegalOverview().fold(
            onSuccess = { o ->
                overview = o
                o.profile?.let { p ->
                    legalName = p.legalName; businessType = p.businessType; taxCode = p.taxCode.orEmpty(); license = p.businessLicenseNo.orEmpty()
                    repName = p.representativeName; repPhone = p.representativePhone; legalAddress = p.legalAddress
                }
            },
            onFailure = { loadError = it.message }
        )
    }

    val picker = rememberLauncherForActivityResult(ActivityResultContracts.OpenDocument()) { uri ->
        if (uri == null) return@rememberLauncherForActivityResult
        formError = null; success = null; uploading = true
        scope.launch {
            val prepared = withContext(Dispatchers.IO) {
                runCatching {
                    val bytes = context.contentResolver.openInputStream(uri)?.use { it.readBytes() } ?: error("empty")
                    val mime = context.contentResolver.getType(uri) ?: "application/octet-stream"
                    Triple(bytes, mime, displayName(context, uri))
                }.getOrNull()
            }
            if (prepared == null) { formError = "Không đọc được tệp đã chọn."; uploading = false; return@launch }
            if (prepared.first.size > MAX_CONTRACT_BYTES) { formError = "Tệp hợp đồng tối đa 10 MB."; uploading = false; return@launch }
            val part = MultipartBody.Part.createFormData("file", prepared.third, prepared.first.toRequestBody(prepared.second.toMediaType()))
            repository.uploadContract(part).fold(
                onSuccess = { success = "Đã tải hợp đồng lên, chờ quản trị viên duyệt."; reloadKey++ },
                onFailure = { formError = it.message }
            )
            uploading = false
        }
    }

    fun save() {
        formError = when {
            legalName.trim().length !in 2..150 -> "Tên pháp lý cần 2–150 ký tự."
            taxCode.isNotBlank() && !Regex("^\\d{10}(-?\\d{3})?$").matches(taxCode.trim()) -> "Mã số thuế gồm 10 số (hoặc 13 số cho chi nhánh)."
            repName.trim().length !in 2..100 -> "Nhập họ tên người đại diện."
            !Regex("^\\+?\\d{9,15}$").matches(repPhone.trim()) -> "Số điện thoại người đại diện cần 9–15 chữ số."
            legalAddress.isBlank() -> "Địa chỉ kinh doanh không được để trống."
            else -> null
        }
        if (formError != null) return
        saving = true; success = null
        scope.launch {
            repository.saveLegalProfile(
                LegalProfileRequest(
                    legalName.trim(), businessType, taxCode.trim().ifEmpty { null }, license.trim().ifEmpty { null },
                    repName.trim(), repPhone.trim(), legalAddress.trim()
                )
            ).fold(onSuccess = { success = "Đã lưu hồ sơ kinh doanh."; reloadKey++ }, onFailure = { formError = it.message })
            saving = false
        }
    }

    Box(Modifier.fillMaxSize().background(SqCanvas), contentAlignment = Alignment.TopCenter) {
    Column(Modifier.widthIn(max = 720.dp).fillMaxSize().verticalScroll(rememberScrollState()).padding(20.dp).padding(bottom = 96.dp)) {
        ScreenHeader("Hồ sơ kinh doanh và hợp đồng", onBack)
        Spacer(Modifier.height(12.dp))
        val o = overview
        when {
            loadError != null -> ErrorState(loadError!!) { reloadKey++ }
            o == null -> FullScreenLoading()
            else -> {
                val contract = o.contract
                val hasProfile = o.profile != null
                ProgressSteps(
                    listOf(
                        "Hồ sơ kinh doanh" to hasProfile,
                        "Tải hợp đồng" to (contract != null),
                        "Được duyệt" to (contract?.status == "APPROVED")
                    )
                )
                Spacer(Modifier.height(14.dp))

                SqCard {
                    SectionTitle("Thông tin pháp lý")
                    Spacer(Modifier.height(8.dp))
                    SqField("Tên pháp lý (theo giấy phép)", legalName, enabled = isOwner) { legalName = it }
                    Spacer(Modifier.height(10.dp))
                    Text("Loại hình kinh doanh", fontSize = 13.sp, color = SqInkSoft)
                    Spacer(Modifier.height(6.dp))
                    Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        BUSINESS_TYPES.forEach { (code, label) ->
                            SqChip(label, businessType == code) { if (isOwner) businessType = code }
                        }
                    }
                    Spacer(Modifier.height(10.dp))
                    SqField("Mã số thuế", taxCode, enabled = isOwner, keyboardType = KeyboardType.Number, hint = "10 số, không bắt buộc với cá nhân") { taxCode = it.filter { c -> c.isDigit() || c == '-' }.take(14) }
                    Spacer(Modifier.height(10.dp))
                    SqField("Số giấy phép / đăng ký kinh doanh", license, enabled = isOwner) { license = it }
                    Spacer(Modifier.height(10.dp))
                    SqField("Người đại diện", repName, enabled = isOwner) { repName = it }
                    Spacer(Modifier.height(10.dp))
                    SqField("Số điện thoại người đại diện", repPhone, enabled = isOwner, keyboardType = KeyboardType.Phone) { repPhone = it.filter { c -> c.isDigit() || c == '+' } }
                    Spacer(Modifier.height(10.dp))
                    SqField("Địa chỉ kinh doanh", legalAddress, enabled = isOwner, singleLine = false) { legalAddress = it }
                }

                if (isOwner) {
                    Spacer(Modifier.height(12.dp))
                    PrimaryButton("Lưu hồ sơ kinh doanh", loading = saving, onClick = ::save)
                } else {
                    Text("Chỉ chủ cửa hàng được sửa hồ sơ này.", fontSize = 12.sp, color = SqInkMuted, modifier = Modifier.padding(top = 8.dp))
                }

                Spacer(Modifier.height(14.dp))
                SqCard {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        SectionTitle("Hợp đồng hợp tác", modifier = Modifier.weight(1f))
                        val status = contract?.status
                        val (bg, fg) = when (status) {
                            "APPROVED" -> SqMint.copy(alpha = 0.25f) to SqMintDeep
                            "PENDING_REVIEW" -> SqButterWash to SqInk
                            "REJECTED", "NEED_MORE_INFO" -> SqCoralWash to SqCoralDeep
                            else -> SqSurfaceSoft to SqInkMuted
                        }
                        Text(contractStatusLabel(status), fontSize = 12.sp, fontWeight = FontWeight.Bold, color = fg,
                            modifier = Modifier.clip(RoundedCornerShape(50)).background(bg).padding(horizontal = 10.dp, vertical = 4.dp))
                    }
                    Spacer(Modifier.height(8.dp))
                    if (contract == null) {
                        Text("In hợp đồng hợp tác, ký tên rồi chụp hoặc quét lại và tải lên (PDF, JPG hoặc PNG, tối đa 10 MB). Tệp được lưu riêng tư, chỉ bạn và quản trị viên xem được.", fontSize = 13.sp, color = SqInkSoft, lineHeight = 19.sp)
                    } else {
                        InfoRow("Tệp", contract.fileName)
                        InfoRow("Dung lượng", "%.1f MB".format(contract.sizeBytes / 1048576.0))
                        InfoRow("Ngày tải", shortDateTime(contract.createdAt))
                        contract.reviewNote?.let {
                            Spacer(Modifier.height(8.dp))
                            Text("Ghi chú của quản trị viên", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = SqCoralDeep)
                            Text(it, fontSize = 13.sp, color = SqInk)
                        }
                    }
                    val canUpload = isOwner && contract?.status != "PENDING_REVIEW" && contract?.status != "APPROVED"
                    if (canUpload) {
                        Spacer(Modifier.height(12.dp))
                        PrimaryButton(
                            if (contract == null) "Chọn tệp hợp đồng" else "Tải bản mới",
                            loading = uploading,
                            onClick = { picker.launch(arrayOf("application/pdf", "image/jpeg", "image/png")) }
                        )
                    }
                }
                InlineError(formError)
                InlineSuccess(success)
            }
        }
    }
    }
}

/** Ba bước: hồ sơ -> hợp đồng -> duyệt, bước đã xong hiện dấu tích. */
@Composable
private fun ProgressSteps(steps: List<Pair<String, Boolean>>) {
    SqCard {
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.Top) {
            steps.forEachIndexed { i, (label, done) ->
                Column(Modifier.weight(1f), horizontalAlignment = Alignment.CenterHorizontally) {
                    Box(
                        Modifier.size(30.dp).clip(CircleShape).background(if (done) SqMintDeep else SqSurfaceSoft),
                        contentAlignment = Alignment.Center
                    ) {
                        if (done) Icon(Icons.Default.Check, contentDescription = null, tint = Color.White, modifier = Modifier.size(18.dp))
                        else Text("${i + 1}", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = SqInkMuted)
                    }
                    Spacer(Modifier.height(6.dp))
                    Text(label, fontSize = 11.sp, color = if (done) SqInk else SqInkMuted, fontWeight = if (done) FontWeight.SemiBold else FontWeight.Normal,
                        maxLines = 2, textAlign = androidx.compose.ui.text.style.TextAlign.Center)
                }
            }
        }
    }
}
