package com.surplusiq.app.ui.screens.auth

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.filled.VisibilityOff
import androidx.compose.material.icons.outlined.Lock
import androidx.compose.material.icons.outlined.PersonOutline
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
    onRememberLoginChange: (Boolean) -> Unit = {},
    modifier: Modifier = Modifier
) {
    var passwordVisible by remember { mutableStateOf(false) }
    var rememberLogin by remember { mutableStateOf(true) }

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

    AuthShellCard(modifier = modifier, onBackClick = onBackClick, waveHeader = true) {
        AuthHeading(
            title = "Chào mừng trở lại!",
            subtitle = "Cùng SurplusIQ giải cứu món ngon mỗi ngày và giảm thiểu lãng phí thực phẩm."
        )

        AuthField(
            label = "Tài khoản",
            upperLabel = true,
            value = state.phone,
            onValueChange = onPhoneChange,
            placeholder = "Nhập số điện thoại hoặc email của bạn",
            keyboardType = KeyboardType.Email,
            leadingIcon = { Icon(Icons.Outlined.PersonOutline, contentDescription = null, tint = TextMuted, modifier = Modifier.size(20.dp)) }
        )

        Spacer(modifier = Modifier.height(16.dp))

        AuthField(
            label = "Mật khẩu",
            upperLabel = true,
            value = state.password,
            onValueChange = onPasswordChange,
            placeholder = "Nhập mật khẩu",
            keyboardType = KeyboardType.Password,
            visualTransformation = if (passwordVisible) VisualTransformation.None else PasswordVisualTransformation(),
            leadingIcon = { Icon(Icons.Outlined.Lock, contentDescription = null, tint = TextMuted, modifier = Modifier.size(20.dp)) },
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

        Spacer(modifier = Modifier.height(12.dp))

        Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            Row(
                modifier = Modifier.clickable {
                    rememberLogin = !rememberLogin
                    onRememberLoginChange(rememberLogin)
                },
                verticalAlignment = Alignment.CenterVertically
            ) {
                Checkbox(
                    checked = rememberLogin,
                    onCheckedChange = {
                        rememberLogin = it
                        onRememberLoginChange(it)
                    },
                    colors = CheckboxDefaults.colors(checkedColor = ForestGreenDark)
                )
                Text("Ghi nhớ đăng nhập", fontSize = 12.sp, color = TextSecondary)
            }
            Spacer(Modifier.weight(1f))
            Text(
                text = "Quên mật khẩu?",
                fontSize = 12.sp,
                fontWeight = FontWeight.Bold,
                color = ForestGreenDark,
                modifier = Modifier.clickable { onNavigateToForgotPassword() }
            )
        }

        if (state.errorMessage != null) {
            AuthErrorBanner(state.errorMessage)
        }

        Spacer(modifier = Modifier.height(16.dp))

        AuthPrimaryButton(text = "Đăng nhập", isLoading = state.isLoading, withArrow = true, onClick = onLoginClick)

        AuthDividerOr("HOẶC TIẾP TỤC VỚI")

        AuthGoogleButton(text = "Tiếp tục với Google", onClick = onGoogleLoginClick)

        Spacer(modifier = Modifier.height(18.dp))

        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.Center) {
            Text(text = "Chưa có tài khoản? ", color = TextSecondary, fontSize = 13.sp)
            Text(
                text = "Đăng ký ngay",
                color = ForestGreenDark,
                fontWeight = FontWeight.Bold,
                fontSize = 13.sp,
                modifier = Modifier.clickable { onNavigateToRegister() }
            )
        }

        Spacer(modifier = Modifier.height(10.dp))

        Text(
            text = "Khám phá không cần đăng nhập  ›",
            color = TextMuted,
            fontSize = 12.sp,
            fontWeight = FontWeight.SemiBold,
            modifier = Modifier.fillMaxWidth().clickable { onContinueAsGuest() },
            textAlign = TextAlign.Center
        )
    }
}
