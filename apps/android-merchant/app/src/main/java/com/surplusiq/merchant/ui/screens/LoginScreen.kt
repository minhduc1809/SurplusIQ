package com.surplusiq.merchant.ui.screens

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Mail
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.surplusiq.merchant.R
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

    Column(
        modifier = Modifier.fillMaxSize().background(SqCanvas).verticalScroll(rememberScrollState()).padding(horizontal = 24.dp)
    ) {
        Spacer(modifier = Modifier.height(72.dp))

        Image(
            painter = painterResource(id = R.drawable.logo_surplusiq),
            contentDescription = "SurplusIQ",
            contentScale = ContentScale.Fit,
            modifier = Modifier.align(Alignment.CenterHorizontally).height(72.dp)
        )

        Spacer(modifier = Modifier.height(20.dp))

        Text(
            text = "SurplusIQ cho cửa hàng",
            fontSize = 26.sp,
            fontWeight = FontWeight.ExtraBold,
            color = SqInk,
            textAlign = TextAlign.Center,
            modifier = Modifier.fillMaxWidth()
        )
        Spacer(modifier = Modifier.height(6.dp))
        Text(
            text = "Quản lý suất, đơn hàng và hao hụt mỗi ngày",
            fontSize = 13.sp,
            color = SqInkSoft,
            textAlign = TextAlign.Center,
            modifier = Modifier.fillMaxWidth()
        )

        Spacer(modifier = Modifier.height(36.dp))

        MerchantField(value = email, onValueChange = { email = it }, placeholder = "Email", icon = Icons.Default.Mail, keyboardType = KeyboardType.Email)
        Spacer(modifier = Modifier.height(14.dp))
        PasswordField(value = password, onValueChange = { password = it })

        Spacer(modifier = Modifier.height(10.dp))
        Text(
            text = "Quên mật khẩu?",
            fontSize = 13.sp,
            fontWeight = FontWeight.Bold,
            color = SqCoral,
            textAlign = TextAlign.End,
            modifier = Modifier.fillMaxWidth().clickable { onForgotPasswordClick() }
        )

        if (errorMessage != null) {
            Spacer(modifier = Modifier.height(12.dp))
            ErrorBanner(errorMessage ?: "")
        }

        Spacer(modifier = Modifier.height(28.dp))

        PrimaryButton(text = "Đăng nhập", onClick = ::doLogin, enabled = email.isNotBlank() && password.isNotBlank(), loading = isLoading)

        Spacer(modifier = Modifier.height(20.dp))
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.Center) {
            Text(text = "Chưa có tài khoản? ", fontSize = 13.sp, color = SqInkSoft)
            Text(
                text = "Đăng ký cửa hàng",
                fontSize = 13.sp,
                fontWeight = FontWeight.Bold,
                color = SqCoral,
                modifier = Modifier.clickable { onRegisterClick() }
            )
        }
        Spacer(modifier = Modifier.height(12.dp))
        Text(
            text = "Tôi có mã mời nhân viên",
            fontSize = 13.sp,
            fontWeight = FontWeight.Bold,
            color = SqInkSoft,
            textAlign = TextAlign.Center,
            modifier = Modifier.fillMaxWidth().clickable { onActivateClick() }
        )
        Spacer(modifier = Modifier.height(32.dp))
    }
}
