package com.surplusiq.merchant.ui.screens

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Mail
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
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

@Composable
fun LoginScreen(
    repository: StoreRepository,
    session: SessionManager,
    onLoginSuccess: () -> Unit,
    onForgotPasswordClick: () -> Unit = {},
    onRegisterClick: () -> Unit = {},
    onActivateClick: () -> Unit = {}
) {
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var rememberLogin by remember { mutableStateOf(session.isRememberLogin()) }
    var isLoading by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    fun doLogin() {
        if (isLoading) return
        errorMessage = null
        isLoading = true
        scope.launch {
            val result = repository.login(email.trim(), password, session.getDeviceId())
            isLoading = false
            result.fold(
                onSuccess = { res ->
                    session.saveLogin(res)
                    onLoginSuccess()
                },
                onFailure = { err -> errorMessage = err.message ?: "Sai thông tin đăng nhập." }
            )
        }
    }

    AuthCard(onBackClick = null, showBrandMark = true) {
        AuthHeading(
            title = "Chào mừng trở lại!",
            subtitle = "Quản lý suất, đơn hàng và hao hụt mỗi ngày cùng SurplusIQ cho cửa hàng."
        )

        AuthLabel("Tài khoản", upper = true)
        MerchantField(value = email, onValueChange = { email = it }, placeholder = "Nhập email cửa hàng của bạn", icon = Icons.Default.Mail, keyboardType = KeyboardType.Email)
        Spacer(modifier = Modifier.height(16.dp))
        AuthLabel("Mật khẩu", upper = true)
        PasswordField(value = password, onValueChange = { password = it }, placeholder = "Nhập mật khẩu")

        Spacer(modifier = Modifier.height(12.dp))
        Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            Row(
                modifier = Modifier.clickable {
                    rememberLogin = !rememberLogin
                    session.setRememberLogin(rememberLogin)
                },
                verticalAlignment = Alignment.CenterVertically
            ) {
                Checkbox(
                    checked = rememberLogin,
                    onCheckedChange = {
                        rememberLogin = it
                        session.setRememberLogin(it)
                    },
                    colors = CheckboxDefaults.colors(checkedColor = SqCoralDeep)
                )
                Text("Ghi nhớ đăng nhập", fontSize = 12.sp, color = SqInkSoft)
            }
            Spacer(Modifier.weight(1f))
            Text(
                text = "Quên mật khẩu?",
                fontSize = 12.sp,
                fontWeight = FontWeight.Bold,
                color = SqCoralDeep,
                modifier = Modifier.clickable { onForgotPasswordClick() }
            )
        }

        if (errorMessage != null) {
            Spacer(modifier = Modifier.height(12.dp))
            ErrorBanner(errorMessage ?: "")
        }

        Spacer(modifier = Modifier.height(16.dp))
        AuthGradientButton(text = "Đăng nhập", enabled = email.isNotBlank() && password.isNotBlank(), loading = isLoading, withArrow = true, onClick = ::doLogin)

        AuthDivider("HOẶC")

        OutlinedButton(
            onClick = onActivateClick,
            shape = androidx.compose.foundation.shape.RoundedCornerShape(16.dp),
            modifier = Modifier.fillMaxWidth().height(54.dp)
        ) { Text("Tôi có mã mời nhân viên", color = SqInk, fontWeight = FontWeight.SemiBold) }

        Spacer(modifier = Modifier.height(18.dp))
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.Center) {
            Text(text = "Chưa có tài khoản? ", fontSize = 13.sp, color = SqInkSoft)
            Text(
                text = "Đăng ký cửa hàng ngay",
                fontSize = 13.sp,
                fontWeight = FontWeight.Bold,
                color = SqCoralDeep,
                modifier = Modifier.clickable { onRegisterClick() }
            )
        }
    }
}
