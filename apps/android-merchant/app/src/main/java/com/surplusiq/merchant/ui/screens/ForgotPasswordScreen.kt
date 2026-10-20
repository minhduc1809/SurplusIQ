package com.surplusiq.merchant.ui.screens

import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Mail
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.surplusiq.merchant.R
import com.surplusiq.merchant.data.StoreRepository
import com.surplusiq.merchant.ui.components.*
import com.surplusiq.merchant.ui.theme.*
import kotlinx.coroutines.launch

/**
 * S03 bước 1. Doc mô tả liên kết email 30 phút, nhưng backend (auth/password/forgot) dùng mã OTP 6 số
 * chung cho mọi kênh -> theo backend.
 */
@Composable
fun ForgotPasswordScreen(
    repository: StoreRepository,
    onBackClick: () -> Unit,
    onCodeSent: (email: String) -> Unit
) {
    var email by remember { mutableStateOf("") }
    var isLoading by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    AuthCard(onBackClick = onBackClick) {
        Box(modifier = Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
            Image(
                painter = painterResource(id = R.drawable.illustration_forgot_password),
                contentDescription = null,
                contentScale = ContentScale.Fit,
                modifier = Modifier.size(200.dp)
            )
        }
        Spacer(modifier = Modifier.height(16.dp))

        Text(text = "Quên mật khẩu?", fontSize = 22.sp, fontWeight = FontWeight.ExtraBold, color = SqInk)
        Spacer(modifier = Modifier.height(6.dp))
        Text(
            text = "Nhập email đăng ký. Nếu tài khoản tồn tại, chúng tôi sẽ gửi mã xác thực để đặt lại mật khẩu.",
            fontSize = 13.sp,
            color = SqInkSoft,
            lineHeight = 18.sp
        )
        Spacer(modifier = Modifier.height(24.dp))

        MerchantField(value = email, onValueChange = { email = it }, placeholder = "Email đăng ký", icon = Icons.Default.Mail, keyboardType = KeyboardType.Email)

        if (error != null) {
            Spacer(modifier = Modifier.height(12.dp))
            ErrorBanner(error ?: "")
        }

        Spacer(modifier = Modifier.height(28.dp))

        PrimaryButton(
            text = "Gửi mã xác thực",
            enabled = email.isNotBlank(),
            loading = isLoading,
            onClick = {
                isLoading = true
                error = null
                scope.launch {
                    val target = email.trim()
                    val result = repository.forgotPassword(target)
                    isLoading = false
                    result.fold(onSuccess = { onCodeSent(target) }, onFailure = { error = it.message })
                }
            }
        )
    }
}
