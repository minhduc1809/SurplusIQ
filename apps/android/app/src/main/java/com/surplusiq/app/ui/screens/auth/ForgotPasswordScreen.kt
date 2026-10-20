package com.surplusiq.app.ui.screens.auth

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.surplusiq.app.ui.components.AuthErrorBanner
import com.surplusiq.app.ui.components.AuthField
import com.surplusiq.app.ui.components.AuthHeading
import com.surplusiq.app.ui.components.AuthIllustration
import com.surplusiq.app.ui.components.AuthIllustrationKind
import com.surplusiq.app.ui.components.AuthPrimaryButton
import com.surplusiq.app.ui.components.AuthShellCard
import com.surplusiq.app.ui.viewmodel.AuthUiState

/** K04 Quên mật khẩu (R1-008) - nối thật POST /auth/password/forgot. */
@Composable
fun ForgotPasswordScreen(
    state: AuthUiState,
    onTargetChange: (String) -> Unit,
    onSendCodeClick: () -> Unit,
    onBackClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    AuthShellCard(modifier = modifier, onBackClick = onBackClick) {
        Box(modifier = Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
            AuthIllustration(kind = AuthIllustrationKind.FORGOT_PASSWORD)
        }
        Spacer(modifier = Modifier.height(16.dp))

        AuthHeading(
            title = "Quên mật khẩu?",
            subtitle = "Đừng lo! Nhập số điện thoại hoặc email đã đăng ký để nhận mã xác thực."
        )

        AuthField(
            label = "Số điện thoại hoặc email",
            value = state.forgotTarget,
            onValueChange = onTargetChange,
            placeholder = "0901234567",
            keyboardType = KeyboardType.Text
        )

        if (state.errorMessage != null) {
            AuthErrorBanner(state.errorMessage)
        }

        Spacer(modifier = Modifier.height(20.dp))

        AuthPrimaryButton(
            text = "Gửi mã xác thực",
            isLoading = state.isLoading,
            enabled = state.forgotTarget.isNotBlank(),
            onClick = onSendCodeClick
        )
    }
}
