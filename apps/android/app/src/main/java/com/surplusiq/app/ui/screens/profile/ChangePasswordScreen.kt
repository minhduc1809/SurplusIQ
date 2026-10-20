package com.surplusiq.app.ui.screens.profile

import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import com.surplusiq.app.ui.components.AuthErrorBanner
import com.surplusiq.app.ui.components.AuthField
import com.surplusiq.app.ui.components.AuthHeading
import com.surplusiq.app.ui.components.AuthPrimaryButton
import com.surplusiq.app.ui.components.AuthShellCard
import com.surplusiq.app.ui.viewmodel.AuthUiState

@Composable
fun ChangePasswordScreen(
    state: AuthUiState,
    onCurrentPasswordChange: (String) -> Unit,
    onNewPasswordChange: (String) -> Unit,
    onConfirmPasswordChange: (String) -> Unit,
    onChangeClick: () -> Unit,
    onBackClick: () -> Unit,
    onSuccess: () -> Unit,
    modifier: Modifier = Modifier
) {
    LaunchedEffect(state.isChangePasswordSuccess) {
        if (state.isChangePasswordSuccess) onSuccess()
    }

    AuthShellCard(onBackClick = onBackClick) {
        AuthHeading(title = "Đổi mật khẩu", subtitle = "Cập nhật mật khẩu đăng nhập của bạn.")

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
            placeholder = "Từ 6 ký tự",
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

        if (state.errorMessage != null) {
            AuthErrorBanner(state.errorMessage)
        }

        Spacer(modifier = Modifier.height(20.dp))

        AuthPrimaryButton(
            text = "Đổi mật khẩu",
            isLoading = state.isLoading,
            onClick = onChangeClick
        )
    }
}
