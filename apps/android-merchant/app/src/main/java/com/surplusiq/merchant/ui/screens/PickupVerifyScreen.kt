package com.surplusiq.merchant.ui.screens

import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.layout.width
import com.surplusiq.merchant.ui.theme.SqCoralWash
import com.surplusiq.merchant.ui.theme.SqCoral
import com.surplusiq.merchant.ui.theme.SqInk
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.ErrorOutline
import androidx.compose.material.icons.filled.QrCodeScanner
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.google.mlkit.vision.barcode.common.Barcode
import com.google.mlkit.vision.codescanner.GmsBarcodeScannerOptions
import com.google.mlkit.vision.codescanner.GmsBarcodeScanning
import com.surplusiq.merchant.data.StoreRepository
import com.surplusiq.merchant.data.VerifyPickupResponse
import com.surplusiq.merchant.ui.components.*
import com.surplusiq.merchant.ui.theme.*
import kotlinx.coroutines.launch

/**
 * S41 - Quét QR nhận hàng. Camera: trình quét Google Play services, nội dung QR = pickupToken gửi
 * POST store/pickups/verify {token}. Dự phòng: mã 6 ký tự {backupCode}, mã nhận hộ 8 ký tự qua verify-proxy-code.
 * Backend xác nhận giao ngay khi mã hợp lệ (không có bước "Xác nhận đã giao" riêng).
 */
@Composable
fun PickupVerifyScreen(repository: StoreRepository) {
    val context = LocalContext.current
    val scanner = remember {
        GmsBarcodeScanning.getClient(context, GmsBarcodeScannerOptions.Builder().setBarcodeFormats(Barcode.FORMAT_QR_CODE).build())
    }
    var code by remember { mutableStateOf("") }
    var isVerifying by remember { mutableStateOf(false) }
    var result by remember { mutableStateOf<VerifyPickupResponse?>(null) }
    var failure by remember { mutableStateOf<String?>(null) }
    var scanError by remember { mutableStateOf<String?>(null) }
    var lastByCamera by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    fun verify(call: suspend () -> Result<VerifyPickupResponse>) {
        isVerifying = true
        failure = null
        scope.launch {
            val res = call()
            isVerifying = false
            res.fold(onSuccess = { result = it; code = "" }, onFailure = { failure = it.message })
        }
    }

    fun scan() {
        scanError = null
        lastByCamera = true
        scanner.startScan()
            .addOnSuccessListener { barcode -> barcode.rawValue?.let { token -> verify { repository.verifyPickupToken(token) } } }
            .addOnFailureListener { scanError = "Không mở được trình quét trên máy này. Hãy nhập mã dự phòng." }
    }

    fun submitCode() {
        val c = code.trim()
        if (isVerifying || (c.length != 6 && c.length != 8)) return
        lastByCamera = false
        verify { if (c.length == 8) repository.verifyProxyCode(c) else repository.verifyPickup(c) }
    }

    fun next() {
        result = null
        failure = null
        if (lastByCamera) scan()
    }

    val sidePad = ((androidx.compose.ui.platform.LocalConfiguration.current.screenWidthDp.dp - 720.dp) / 2).coerceAtLeast(0.dp)
    Column(modifier = Modifier.fillMaxSize().background(SqCanvas).verticalScroll(rememberScrollState()).padding(horizontal = sidePad).padding(20.dp)) {
        Text(text = "Quét QR nhận hàng", fontSize = 26.sp, fontWeight = FontWeight.ExtraBold, color = SqInk)
        Spacer(modifier = Modifier.height(20.dp))

        when {
            result != null -> ResultCard(
                icon = Icons.Default.CheckCircle, tint = SqCoralDeep, title = "Hợp lệ - đã giao hàng", subtitle = result!!.message,
                actionText = if (lastByCamera) "Quét đơn tiếp theo" else "Xong", onAction = ::next
            ) {
                val r = result!!
                InfoRow("Mã đơn", r.orderCode)
                InfoRow("Món", "${r.itemName} × ${r.quantity}")
                InfoRow("Khách", r.customerMasked)
                InfoRow("Tổng tiền", currency(r.totalAmount))
                r.note?.takeIf { it.isNotBlank() }?.let { InfoRow("Ghi chú", it, SqCoralDeep) }
            }
            failure != null -> ResultCard(
                icon = Icons.Default.ErrorOutline, tint = SqCoralDeep, title = "Không hợp lệ", subtitle = failure!!,
                actionText = if (lastByCamera) "Quét lại" else "Nhập lại", onAction = ::next
            )
            else -> Column(
                modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(24.dp)).background(SqSurface).padding(24.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Box(Modifier.size(88.dp).clip(CircleShape).background(SqCoralWash), contentAlignment = Alignment.Center) {
                    Icon(Icons.Default.QrCodeScanner, contentDescription = null, tint = SqCoral, modifier = Modifier.size(44.dp))
                }
                Spacer(modifier = Modifier.height(12.dp))
                Text("Quét mã nhận hàng của khách", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = SqInk)
                Spacer(modifier = Modifier.height(10.dp))
                listOf("Bấm nút bên dưới để mở camera", "Hướng camera vào mã QR trên điện thoại khách", "Kiểm tra món rồi giao hàng").forEachIndexed { i, step ->
                    Row(Modifier.fillMaxWidth().padding(vertical = 3.dp), verticalAlignment = Alignment.CenterVertically) {
                        Box(Modifier.size(22.dp).clip(CircleShape).background(SqCoralWash), contentAlignment = Alignment.Center) {
                            Text("${i + 1}", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = SqCoralDeep)
                        }
                        Spacer(Modifier.width(10.dp))
                        Text(step, fontSize = 13.sp, color = SqInkSoft)
                    }
                }
                Spacer(modifier = Modifier.height(14.dp))
                PrimaryButton("Mở camera quét QR", loading = isVerifying && lastByCamera, onClick = ::scan)
                Text(
                    "Ứng dụng dùng trình quét của Google Play services nên không cần cấp quyền camera riêng. Nếu không quét được, hãy nhập mã dự phòng bên dưới.",
                    fontSize = 11.sp, color = SqInkMuted, textAlign = TextAlign.Center, modifier = Modifier.padding(top = 8.dp)
                )
                Text(
                    "Sau mỗi đơn hợp lệ, bấm \"Quét đơn tiếp theo\" để quét liên tục.",
                    fontSize = 12.sp, color = SqInkMuted, textAlign = TextAlign.Center, modifier = Modifier.padding(top = 8.dp)
                )
                InlineError(scanError)

                HorizontalDivider(color = SqLine, modifier = Modifier.padding(vertical = 20.dp))
                Text("Hoặc nhập mã dự phòng 6 ký tự / mã nhận hộ 8 ký tự", fontSize = 13.sp, color = SqInkSoft, textAlign = TextAlign.Center)
                Spacer(modifier = Modifier.height(12.dp))
                Box(
                    modifier = Modifier.fillMaxWidth().height(64.dp).clip(RoundedCornerShape(14.dp))
                        .background(SqSurfaceSoft).border(1.dp, SqLine, RoundedCornerShape(14.dp)),
                    contentAlignment = Alignment.Center
                ) {
                    BasicTextField(
                        value = code,
                        onValueChange = { v -> code = v.uppercase().filter { it.isLetterOrDigit() }.take(8) },
                        singleLine = true,
                        textStyle = TextStyle(fontSize = 24.sp, fontWeight = FontWeight.ExtraBold, color = SqInk, textAlign = TextAlign.Center, letterSpacing = 4.sp),
                        cursorBrush = SolidColor(SqCoral),
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Ascii, capitalization = KeyboardCapitalization.Characters),
                        modifier = Modifier.fillMaxWidth()
                    )
                }
                Spacer(modifier = Modifier.height(16.dp))
                PrimaryButton(
                    "Xác nhận mã",
                    enabled = code.length == 6 || code.length == 8,
                    loading = isVerifying && !lastByCamera,
                    color = SqInk,
                    onClick = ::submitCode
                )
            }
        }
    }
}

@Composable
private fun ResultCard(
    icon: ImageVector,
    tint: Color,
    title: String,
    subtitle: String,
    actionText: String,
    onAction: () -> Unit,
    details: (@Composable ColumnScope.() -> Unit)? = null
) {
    Column(
        modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(24.dp)).background(SqSurface).padding(28.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Icon(icon, contentDescription = null, tint = tint, modifier = Modifier.size(64.dp))
        Spacer(modifier = Modifier.height(12.dp))
        Text(text = title, fontSize = 22.sp, fontWeight = FontWeight.ExtraBold, color = tint)
        Spacer(modifier = Modifier.height(4.dp))
        Text(text = subtitle, fontSize = 14.sp, color = SqInkSoft, textAlign = TextAlign.Center)
        Spacer(modifier = Modifier.height(20.dp))
        details?.let {
            Column(modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp)).background(SqSurfaceSoft).padding(14.dp), content = it)
            Spacer(modifier = Modifier.height(20.dp))
        }
        PrimaryButton(actionText, onClick = onAction)
    }
}
