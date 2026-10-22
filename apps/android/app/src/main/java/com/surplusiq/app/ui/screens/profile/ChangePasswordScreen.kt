package com.surplusiq.app.ui.screens.profile

import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.height
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.surplusiq.app.ui.components.AuthErrorBanner
import com.surplusiq.app.ui.components.AuthField
import com.surplusiq.app.ui.components.AuthHeading
import com.surplusiq.app.ui.components.AuthPrimaryButton
import com.surplusiq.app.ui.components.AuthShellCard
import com.surplusiq.app.ui.theme.TextSecondary
import com.surplusiq.app.ui.viewmodel.AuthUiState

/**
 * Đổi mật khẩu. Tài khoản đã có email phải xác thực thêm bằng mã OTP gửi về email (bước 2);
 * tài khoản chưa có email đổi trực tiếp và được nhắc thêm email ở Chỉnh sửa hồ sơ.
 */
@Composable
fun ChangePasswordScreen(
    state: AuthUiState,
    hasEmail: Boolean,
    onCurrentPasswordChange: (String) -> Unit,
    onNewPasswordChange: (String) -> Unit,
    onConfirmPasswordChange: (String) -> Unit,
    onOtpChange: (String) -> Unit,
    onSendOtpClick: () -> Unit,
    onChangeClick: () -> Unit,
    onBackClick: () -> Unit,
    onSuccess: () -> Unit,
    modifier: Modifier = Modifier
) {
    LaunchedEffect(state.isChangePasswordSuccess) {
        if (state.isChangePasswordSuccess) onSuccess()
    }
    val otpStep = hasEmail && state.changePasswordOtpSent

    AuthShellCard(modifier = modifier, onBackClick = onBackClick) {
        AuthHeading(
            title = "Đổi mật khẩu",
            subtitle = if (otpStep) "Nhập mã OTP 6 số vừa gửi về email của bạn." else "Cập nhật mật khẩu đăng nhập của bạn."
        )

        if (!otpStep) {
            AuthField(
                label = "Mật khẩu hiện tại",
                value = state.currentPassword,
                onValueChange = onCurrentPasswordChange,
                placeholder = "Mật khẩu hiện tại",
                keyboardType = KeyboardType.Password,
                visualTransformation = PasswordVisualTransformation()
            )
            Spacer(modifier = Modifier.height(14.dp))
            AuthField(
                label = "Mật khẩu mới",
                value = state.newChangePassword,
                onValueChange = onNewPasswordChange,
                placeholder = "Tối thiểu 8 ký tự, gồm chữ và số",
                keyboardType = KeyboardType.Password,
                visualTransformation = PasswordVisualTransformation()
            )
            Spacer(modifier = Modifier.height(14.dp))
            AuthField(
                label = "Nhập lại mật khẩu mới",
                value = state.confirmChangePassword,
                onValueChange = onConfirmPasswordChange,
                placeholder = "Nhập lại mật khẩu mới",
                keyboardType = KeyboardType.Password,
                visualTransformation = PasswordVisualTransformation()
            )
            if (!hasEmail) {
                Spacer(modifier = Modifier.height(10.dp))
                Text(
                    "Mẹo: thêm email ở Chỉnh sửa hồ sơ để đổi mật khẩu có xác thực OTP, an toàn hơn.",
                    fontSize = 12.sp,
                    color = TextSecondary
                )
            }
        } else {
            AuthField(
                label = "Mã OTP",
                value = state.changePasswordOtp,
                onValueChange = onOtpChange,
                placeholder = "000000",
                keyboardType = KeyboardType.NumberPassword
            )
            if (state.changePasswordOtpPreview == null) {
                Spacer(modifier = Modifier.height(8.dp))
                Text("Mã đã gửi về email của bạn. Kiểm tra hộp thư (cả mục Spam).", fontSize = 12.sp, color = TextSecondary)
            } else {
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    "Môi trường thử nghiệm: mã là ${state.changePasswordOtpPreview} (chưa gửi email thật).",
                    fontSize = 12.sp,
                    color = TextSecondary
                )
            }
        }

        if (state.errorMessage != null) {
            AuthErrorBanner(state.errorMessage)
        }

        Spacer(modifier = Modifier.height(20.dp))

        when {
            otpStep -> AuthPrimaryButton(text = "Xác nhận đổi mật khẩu", isLoading = state.isLoading, onClick = onChangeClick)
            hasEmail -> AuthPrimaryButton(text = "Gửi mã OTP về email", isLoading = state.isLoading, onClick = onSendOtpClick)
            else -> AuthPrimaryButton(text = "Đổi mật khẩu", isLoading = state.isLoading, onClick = onChangeClick)
        }
    }
}
