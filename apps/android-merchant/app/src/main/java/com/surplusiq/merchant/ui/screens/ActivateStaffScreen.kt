package com.surplusiq.merchant.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Key
import androidx.compose.material.icons.filled.Mail
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.surplusiq.merchant.data.SessionManager
import com.surplusiq.merchant.data.StoreRepository
import com.surplusiq.merchant.ui.components.*
import com.surplusiq.merchant.ui.theme.*
import kotlinx.coroutines.launch

/**
 * S04 - Kích hoạt tài khoản nhân viên bằng mã mời.
 * Backend thực tế: POST store/staff/accept-invite {token} cần JWT (người được mời phải có tài khoản sẵn),
 * không có endpoint tra cứu lời mời hay đặt mật khẩu lần đầu -> màn này đăng nhập rồi chấp nhận lời mời.
 * shortcut: nhập mã mời thủ công, chưa có deep link từ email mời; thêm intent-filter khi có URL mời thật.
 */
@Composable
fun ActivateStaffScreen(
    repository: StoreRepository,
    session: SessionManager,
    onBackClick: () -> Unit,
    onActivated: () -> Unit
) {
    var token by remember { mutableStateOf("") }
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var isLoading by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    fun activate() {
        isLoading = true
        error = null
        scope.launch {
            val login = repository.login(email.trim(), password, session.getDeviceId())
            val res = login.getOrElse { isLoading = false; error = it.message; return@launch }
            session.saveLogin(res) // interceptor đọc token từ session cho lệnh accept-invite
            val accepted = repository.acceptInvite(token.trim())
            if (accepted.isFailure) {
                isLoading = false
                session.logout()
                error = accepted.exceptionOrNull()?.message
                return@launch
            }
            // JWT cũ chưa có storeId/permission của lời mời -> đăng nhập lại để lấy claim mới.
            repository.login(email.trim(), password, session.getDeviceId()).onSuccess { session.saveLogin(it) }
            isLoading = false
            onActivated()
        }
    }

    AuthCard(onBackClick = onBackClick) {
        Text(text = "Kích hoạt tài khoản nhân viên", fontSize = 22.sp, fontWeight = FontWeight.ExtraBold, color = SqInk)
        Spacer(modifier = Modifier.height(6.dp))
        Text(
            text = "Nhập mã mời trong email từ cửa hàng (hiệu lực 72 giờ) và đăng nhập bằng tài khoản của bạn để tham gia.",
            fontSize = 13.sp,
            color = SqInkSoft,
            lineHeight = 18.sp
        )
        Spacer(modifier = Modifier.height(20.dp))

        MerchantField(value = token, onValueChange = { token = it }, placeholder = "Mã mời", icon = Icons.Default.Key)
        Spacer(modifier = Modifier.height(12.dp))
        MerchantField(value = email, onValueChange = { email = it }, placeholder = "Email được mời", icon = Icons.Default.Mail, keyboardType = KeyboardType.Email)
        Spacer(modifier = Modifier.height(12.dp))
        PasswordField(value = password, onValueChange = { password = it })

        if (error != null) {
            Spacer(modifier = Modifier.height(12.dp))
            ErrorBanner(error ?: "")
        }

        Spacer(modifier = Modifier.height(24.dp))
        PrimaryButton(
            text = "Kích hoạt tài khoản",
            onClick = ::activate,
            enabled = token.isNotBlank() && email.isNotBlank() && password.isNotBlank(),
            loading = isLoading
        )
    }
}
