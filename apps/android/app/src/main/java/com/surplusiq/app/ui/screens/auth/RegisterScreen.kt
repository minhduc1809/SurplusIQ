package com.surplusiq.app.ui.screens.auth

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.filled.VisibilityOff
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.surplusiq.app.ui.components.AuthDividerOr
import com.surplusiq.app.ui.components.AuthErrorBanner
import com.surplusiq.app.ui.components.AuthField
import com.surplusiq.app.ui.components.AuthGoogleButton
import com.surplusiq.app.ui.components.AuthHeading
import com.surplusiq.app.ui.components.AuthPrimaryButton
import com.surplusiq.app.ui.components.AuthShellCard
import com.surplusiq.app.ui.theme.ForestGreenDark
import com.surplusiq.app.ui.theme.TextMuted
import com.surplusiq.app.ui.theme.TextSecondary
import com.surplusiq.app.ui.viewmodel.AuthUiState

@Composable
fun RegisterScreen(
    state: AuthUiState,
    onFullNameChange: (String) -> Unit,
    onPhoneChange: (String) -> Unit,
    onEmailChange: (String) -> Unit = {},
    onPasswordChange: (String) -> Unit,
    onRegisterClick: () -> Unit,
    onBackToLogin: () -> Unit,
    onGoogleRegisterClick: () -> Unit = {},
    modifier: Modifier = Modifier
) {
    // BR-005: đồng ý điều khoản phải là lựa chọn chủ động, không mặc định bật.
    var termsAccepted by remember { mutableStateOf(false) }
    var passwordVisible by remember { mutableStateOf(false) }

    AuthShellCard(modifier = modifier, onBackClick = onBackToLogin, waveHeader = true) {
        AuthHeading(
            title = "Tạo tài khoản mới",
            subtitle = "Cùng SurplusIQ săn suất món ngon và chung tay giảm lãng phí thực phẩm"
        )

        AuthField(label = "Họ và tên", value = state.fullName, onValueChange = onFullNameChange, placeholder = "Nhập họ và tên")
        Spacer(modifier = Modifier.height(14.dp))
        AuthField(
            label = "Số điện thoại",
            value = state.phone,
            onValueChange = onPhoneChange,
            placeholder = "Nhập số điện thoại",
            keyboardType = KeyboardType.Phone
        )
        Spacer(modifier = Modifier.height(14.dp))
        AuthField(
            label = "Email nhận mã OTP",
            value = state.email,
            onValueChange = onEmailChange,
            placeholder = "Nhập email của bạn",
            keyboardType = KeyboardType.Email
        )
        Spacer(modifier = Modifier.height(14.dp))
        AuthField(
            label = "Mật khẩu",
            value = state.password,
            onValueChange = onPasswordChange,
            placeholder = "Nhập mật khẩu",
            keyboardType = KeyboardType.Password,
            visualTransformation = if (passwordVisible) VisualTransformation.None else PasswordVisualTransformation(),
            trailingIcon = {
                IconButton(onClick = { passwordVisible = !passwordVisible }, modifier = Modifier.size(28.dp)) {
                    Icon(
                        imageVector = if (passwordVisible) Icons.Default.Visibility else Icons.Default.VisibilityOff,
                        contentDescription = if (passwordVisible) "Ẩn mật khẩu" else "Hiện mật khẩu",
                        tint = TextMuted,
                        modifier = Modifier.size(20.dp)
                    )
                }
            }
        )

        Spacer(modifier = Modifier.height(14.dp))

        Row(
            modifier = Modifier.fillMaxWidth().clickable { termsAccepted = !termsAccepted },
            verticalAlignment = Alignment.Top
        ) {
            Checkbox(
                checked = termsAccepted,
                onCheckedChange = { termsAccepted = it },
                colors = CheckboxDefaults.colors(checkedColor = ForestGreenDark)
            )
            Text(
                text = "Tôi đồng ý với Điều khoản dịch vụ & Chính sách bảo mật của SurplusIQ.",
                fontSize = 12.sp,
                color = TextSecondary,
                lineHeight = 17.sp,
                modifier = Modifier.padding(top = 12.dp, end = 4.dp)
            )
        }

        if (state.errorMessage != null) {
            AuthErrorBanner(state.errorMessage)
        }

        Spacer(modifier = Modifier.height(16.dp))

        AuthPrimaryButton(
            text = "Đăng ký",
            isLoading = state.isLoading,
            enabled = termsAccepted,
            onClick = onRegisterClick
        )

        AuthDividerOr("HOẶC ĐĂNG KÝ BẰNG")

        AuthGoogleButton(text = "Tiếp tục với Google", onClick = onGoogleRegisterClick)

        Spacer(modifier = Modifier.height(18.dp))

        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.Center) {
            Text(text = "Đã có tài khoản? ", color = TextSecondary, fontSize = 13.sp)
            Text(
                text = "Đăng nhập",
                color = ForestGreenDark,
                fontWeight = FontWeight.Bold,
                fontSize = 13.sp,
                modifier = Modifier.clickable { onBackToLogin() }
            )
        }

    }
}
