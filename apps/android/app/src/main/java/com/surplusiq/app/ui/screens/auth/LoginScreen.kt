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
import com.surplusiq.app.ui.theme.TextSecondary
import com.surplusiq.app.ui.viewmodel.AuthUiState

@Composable
fun LoginScreen(
    state: AuthUiState,
    onPhoneChange: (String) -> Unit,
    onPasswordChange: (String) -> Unit,
    onLoginClick: () -> Unit,
    onTwoFactorCodeChange: (String) -> Unit = {},
    onSubmitTwoFactor: () -> Unit = {},
    onResendTwoFactor: () -> Unit = {},
    onCancelTwoFactor: () -> Unit = {},
    onNavigateToRegister: () -> Unit,
    onNavigateToForgotPassword: () -> Unit = {},
    onContinueAsGuest: () -> Unit,
    onGoogleLoginClick: () -> Unit = {},
    onBackClick: (() -> Unit)? = null,
    modifier: Modifier = Modifier
) {
    var passwordVisible by remember { mutableStateOf(false) }

    if (state.isTwoFactorRequired) {
        AuthShellCard(modifier = modifier, onBackClick = onCancelTwoFactor) {
            AuthHeading(
                title = "Xác thực 2 bước",
                subtitle = "Nhập mã 6 số gửi tới ${state.twoFactorTarget ?: "tài khoản của bạn"}."
            )
            AuthField(
                label = "Mã xác thực",
                value = state.twoFactorCode,
                onValueChange = onTwoFactorCodeChange,
                placeholder = "000000",
                keyboardType = KeyboardType.NumberPassword
            )
            if (state.twoFactorDevHint != null) {
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = "Môi trường thử nghiệm: mã là ${state.twoFactorDevHint} (chưa gửi SMS/email thật).",
                    fontSize = 12.sp,
                    color = TextSecondary
                )
            }
            if (state.errorMessage != null) {
                AuthErrorBanner(state.errorMessage)
            }
            Spacer(modifier = Modifier.height(20.dp))
            AuthPrimaryButton(text = "Xác nhận", isLoading = state.isLoading, onClick = onSubmitTwoFactor)
            Spacer(modifier = Modifier.height(12.dp))
            Text(
                text = "Gửi lại mã",
                fontSize = 13.sp,
                fontWeight = FontWeight.SemiBold,
                color = ForestGreenDark,
                modifier = Modifier.align(Alignment.CenterHorizontally).clickable { onResendTwoFactor() }
            )
        }
        return
    }

    AuthShellCard(modifier = modifier, onBackClick = onBackClick) {
        AuthHeading(title = "Chào mừng trở lại!", subtitle = "Đăng nhập để tiếp tục cứu món cùng SurplusIQ.")

        AuthField(
            label = "Số điện thoại hoặc email",
            value = state.phone,
            onValueChange = onPhoneChange,
            placeholder = "0901234567 hoặc email",
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
                        contentDescription = null,
                        tint = TextSecondary,
                        modifier = Modifier.size(18.dp)
                    )
                }
            }
        )

        Spacer(modifier = Modifier.height(10.dp))

        Text(
            text = "Quên mật khẩu?",
            fontSize = 12.sp,
            fontWeight = FontWeight.SemiBold,
            color = ForestGreenDark,
            modifier = Modifier.align(Alignment.End).clickable { onNavigateToForgotPassword() }
        )

        if (state.errorMessage != null) {
            AuthErrorBanner(state.errorMessage)
        }

        Spacer(modifier = Modifier.height(20.dp))

        AuthPrimaryButton(text = "Đăng nhập", isLoading = state.isLoading, onClick = onLoginClick)

        AuthDividerOr()

        AuthGoogleButton(text = "Đăng nhập với Google", onClick = onGoogleLoginClick)

        Spacer(modifier = Modifier.height(20.dp))

        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.Center) {
            Text(text = "Chưa có tài khoản? ", color = TextSecondary, fontSize = 13.sp)
            Text(
                text = "Đăng ký",
                color = ForestGreenDark,
                fontWeight = FontWeight.Bold,
                fontSize = 13.sp,
                modifier = Modifier.clickable { onNavigateToRegister() }
            )
        }

        Spacer(modifier = Modifier.height(10.dp))

        Text(
            text = "Dùng thử không cần đăng nhập",
            color = TextSecondary,
            fontSize = 12.sp,
            modifier = Modifier.fillMaxWidth().clickable { onContinueAsGuest() },
            textAlign = androidx.compose.ui.text.style.TextAlign.Center
        )
    }
}
