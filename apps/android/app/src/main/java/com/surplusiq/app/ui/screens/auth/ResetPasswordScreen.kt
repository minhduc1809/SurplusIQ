package com.surplusiq.app.ui.screens.auth

import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.surplusiq.app.ui.components.AuthErrorBanner
import com.surplusiq.app.ui.components.AuthField
import com.surplusiq.app.ui.components.AuthHeading
import com.surplusiq.app.ui.components.AuthPrimaryButton
import com.surplusiq.app.ui.components.AuthShellCard
import com.surplusiq.app.ui.theme.MintDeep
import com.surplusiq.app.ui.theme.TextSecondary
import com.surplusiq.app.ui.viewmodel.AuthUiState

/**
 * K05 Đặt lại mật khẩu (R1-008, BR-003) - nối thật POST /auth/password/reset.
 * Gộp bước nhập OTP và mật khẩu mới thành MỘT màn (khác ảnh tham khảo tách 2
 * bước) vì backend chỉ có một API nhận cả 3 trường cùng lúc - không thêm bước
 * UI không cần thiết.
 */
@Composable
fun ResetPasswordScreen(
    state: AuthUiState,
    onOtpChange: (String) -> Unit,
    onNewPasswordChange: (String) -> Unit,
    onConfirmPasswordChange: (String) -> Unit,
    onResetClick: () -> Unit,
    onBackClick: () -> Unit,
    onDone: () -> Unit,
    modifier: Modifier = Modifier
) {
    if (state.isPasswordResetSuccess) {
        AuthShellCard(modifier = modifier) {
            Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.fillMaxWidth()) {
                Icon(Icons.Default.CheckCircle, contentDescription = null, tint = MintDeep, modifier = Modifier.size(56.dp))
                Spacer(modifier = Modifier.height(12.dp))
                Text(text = "Đặt lại mật khẩu thành công", fontSize = 18.sp, fontWeight = FontWeight.Bold, color = MintDeep)
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = "Các thiết bị khác đã đăng nhập sẽ bị đăng xuất. Dùng mật khẩu mới để đăng nhập.",
                    fontSize = 13.sp,
                    color = TextSecondary,
                    textAlign = TextAlign.Center
                )
                Spacer(modifier = Modifier.height(20.dp))
                AuthPrimaryButton(text = "Về Đăng nhập", isLoading = false, onClick = onDone)
            }
        }
        return
    }

    AuthShellCard(modifier = modifier, onBackClick = onBackClick) {
        AuthHeading(title = "Đặt lại mật khẩu", subtitle = "Nhập mã xác thực đã nhận và mật khẩu mới của bạn.")

        AuthField(
            label = "Mã xác thực (6 số)",
            value = state.resetOtp,
            onValueChange = onOtpChange,
            placeholder = "123456",
            keyboardType = KeyboardType.NumberPassword
        )
        Spacer(modifier = Modifier.height(14.dp))
        AuthField(
            label = "Mật khẩu mới",
            value = state.newPassword,
            onValueChange = onNewPasswordChange,
            placeholder = "Từ 8 ký tự, gồm chữ và số",
            keyboardType = KeyboardType.Password,
            visualTransformation = PasswordVisualTransformation()
        )
        Spacer(modifier = Modifier.height(14.dp))
        AuthField(
            label = "Nhập lại mật khẩu mới",
            value = state.confirmNewPassword,
            onValueChange = onConfirmPasswordChange,
            placeholder = "Nhập lại mật khẩu",
            keyboardType = KeyboardType.Password,
            visualTransformation = PasswordVisualTransformation()
        )

        if (state.errorMessage != null) {
            AuthErrorBanner(state.errorMessage)
        }

        Spacer(modifier = Modifier.height(20.dp))

        AuthPrimaryButton(
            text = "Đặt lại mật khẩu",
            isLoading = state.isLoading,
            enabled = state.resetOtp.length == 6 && state.newPassword.isNotBlank(),
            onClick = onResetClick
        )
    }
}
