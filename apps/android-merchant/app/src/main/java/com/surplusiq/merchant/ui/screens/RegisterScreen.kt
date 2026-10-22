package com.surplusiq.merchant.ui.screens

import android.util.Patterns
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Mail
import androidx.compose.material.icons.filled.Phone
import androidx.compose.material.icons.filled.Storefront
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.surplusiq.merchant.data.StoreRegisterRequest
import com.surplusiq.merchant.data.StoreRepository
import com.surplusiq.merchant.ui.components.*
import com.surplusiq.merchant.ui.theme.*
import kotlinx.coroutines.launch

/**
 * S02 - Đăng ký 3 bước: tài khoản -> cửa hàng -> điều khoản, sau đó sang màn xác minh email bằng OTP
 * (backend chặn đăng nhập khi tài khoản PENDING_VERIFY).
 * shortcut: StoreRegisterDto chưa có họ tên chủ, loại hình, tọa độ nên form không thu các trường đó
 * và chưa có ghim bản đồ; bổ sung khi backend mở rộng DTO.
 */
@Composable
fun RegisterScreen(
    repository: StoreRepository,
    onBackClick: () -> Unit,
    onRegistered: (email: String) -> Unit
) {
    var step by remember { mutableIntStateOf(1) }
    var ownerName by remember { mutableStateOf("") }
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var confirm by remember { mutableStateOf("") }
    var storeName by remember { mutableStateOf("") }
    var storeAddress by remember { mutableStateOf("") }
    var storePhone by remember { mutableStateOf("") }
    var acceptedTerms by remember { mutableStateOf(false) }
    var isLoading by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    fun stepError(): String? = when (step) {
        1 -> if (ownerName.trim().length !in 2..60) "Họ tên từ 2 đến 60 ký tự." else if (!Patterns.EMAIL_ADDRESS.matcher(email.trim()).matches()) "Email không đúng định dạng." else passwordError(password, confirm)
        2 -> when {
            storeName.trim().length !in 2..80 -> "Tên cửa hàng từ 2 đến 80 ký tự."
            storeAddress.isBlank() -> "Vui lòng nhập địa chỉ cửa hàng."
            storePhone.length < 9 -> "Số điện thoại cửa hàng không hợp lệ."
            else -> null
        }
        else -> if (!acceptedTerms) "Vui lòng đồng ý điều khoản để tiếp tục." else null
    }

    fun next() {
        error = stepError()
        if (error != null) return
        if (step < 3) { step++; return }
        isLoading = true
        scope.launch {
            val target = email.trim()
            val result = repository.registerStore(
                StoreRegisterRequest(target, password, storeName.trim(), storeAddress.trim(), storePhone, ownerName.trim())
            )
            isLoading = false
            result.fold(onSuccess = { onRegistered(target) }, onFailure = { error = it.message })
        }
    }

    AuthCard(onBackClick = { if (step > 1) { step--; error = null } else onBackClick() }, waveHeader = true) {
        AuthHeading(
            title = "Đăng ký cửa hàng",
            subtitle = when (step) {
                1 -> "Tạo tài khoản chủ cửa hàng để bắt đầu bán suất cứu món cùng SurplusIQ."
                2 -> "Cho khách biết cửa hàng của bạn ở đâu và liên hệ thế nào."
                else -> "Xem lại thông tin và đồng ý điều khoản để hoàn tất."
            }
        )
        LinearProgressIndicator(
            progress = { step / 3f },
            modifier = Modifier.fillMaxWidth(),
            color = SqCoral,
            trackColor = SqSurfaceSoft
        )
        Spacer(modifier = Modifier.height(6.dp))
        Text(
            text = "Bước $step/3 · " + when (step) { 1 -> "Tài khoản"; 2 -> "Thông tin cửa hàng"; else -> "Điều khoản" },
            fontSize = 12.sp,
            color = SqInkSoft
        )
        Spacer(modifier = Modifier.height(20.dp))

        when (step) {
            1 -> {
                AuthLabel("Họ tên chủ cửa hàng")
                MerchantField(value = ownerName, onValueChange = { ownerName = it.take(60) }, placeholder = "Nhập họ tên", icon = Icons.Default.Storefront)
                Spacer(modifier = Modifier.height(14.dp))
                AuthLabel("Email")
                MerchantField(value = email, onValueChange = { email = it }, placeholder = "Nhập email", icon = Icons.Default.Mail, keyboardType = KeyboardType.Email)
                Spacer(modifier = Modifier.height(14.dp))
                AuthLabel("Mật khẩu")
                PasswordField(value = password, onValueChange = { password = it }, placeholder = "Tối thiểu 8 ký tự, gồm chữ và số")
                Spacer(modifier = Modifier.height(14.dp))
                AuthLabel("Nhập lại mật khẩu")
                PasswordField(value = confirm, onValueChange = { confirm = it }, placeholder = "Nhập lại mật khẩu")
            }
            2 -> {
                AuthLabel("Tên cửa hàng")
                MerchantField(value = storeName, onValueChange = { storeName = it }, placeholder = "Nhập tên cửa hàng", icon = Icons.Default.Storefront)
                Spacer(modifier = Modifier.height(14.dp))
                AuthLabel("Địa chỉ cửa hàng")
                MerchantField(value = storeAddress, onValueChange = { storeAddress = it }, placeholder = "Số nhà, đường, phường, quận", icon = Icons.Default.LocationOn)
                Spacer(modifier = Modifier.height(14.dp))
                AuthLabel("Số điện thoại cửa hàng")
                MerchantField(
                    value = storePhone,
                    onValueChange = { storePhone = it.filter(Char::isDigit).take(11) },
                    placeholder = "Nhập số điện thoại",
                    icon = Icons.Default.Phone,
                    keyboardType = KeyboardType.Phone
                )
            }
            else -> {
                Text(text = "$storeName · $storeAddress", fontSize = 13.sp, color = SqInkSoft)
                Spacer(modifier = Modifier.height(12.dp))
                Row(
                    verticalAlignment = Alignment.Top,
                    modifier = Modifier.fillMaxWidth().clickable { acceptedTerms = !acceptedTerms }
                ) {
                    Checkbox(
                        checked = acceptedTerms,
                        onCheckedChange = { acceptedTerms = it },
                        colors = CheckboxDefaults.colors(checkedColor = SqCoralDeep)
                    )
                    Text(
                        text = "Tôi đồng ý Điều khoản đối tác và Chính sách bảo mật của SurplusIQ.",
                        fontSize = 13.sp,
                        color = SqInk,
                        modifier = Modifier.padding(top = 12.dp)
                    )
                }
                Spacer(modifier = Modifier.height(6.dp))
                Text(text = "Sau khi đăng ký, mã xác minh sẽ được gửi tới $email.", fontSize = 12.sp, color = SqInkMuted)
            }
        }

        if (error != null) {
            Spacer(modifier = Modifier.height(12.dp))
            ErrorBanner(error ?: "")
        }

        Spacer(modifier = Modifier.height(24.dp))
        AuthGradientButton(text = if (step < 3) "Tiếp tục" else "Đăng ký", loading = isLoading, withArrow = step < 3, onClick = ::next)

        Spacer(modifier = Modifier.height(24.dp))
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.Center) {
            Text(text = "Đã có tài khoản? ", color = SqInkSoft, fontSize = 13.sp)
            Text(
                text = "Đăng nhập",
                color = SqCoralDeep,
                fontWeight = FontWeight.Bold,
                fontSize = 13.sp,
                modifier = Modifier.clickable { onBackClick() }
            )
        }
    }
}
