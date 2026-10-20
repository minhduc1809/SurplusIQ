package com.surplusiq.app.ui.screens.auth

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import com.surplusiq.app.ui.theme.SkyBlueContainer
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.surplusiq.app.ui.components.AuthErrorBanner
import com.surplusiq.app.ui.components.AuthHeading
import com.surplusiq.app.ui.components.AuthIllustration
import com.surplusiq.app.ui.components.AuthIllustrationKind
import com.surplusiq.app.ui.components.AuthPrimaryButton
import com.surplusiq.app.ui.components.AuthShellCard
import com.surplusiq.app.ui.theme.ForestGreenPrimary
import com.surplusiq.app.ui.theme.ForestGreenDark
import com.surplusiq.app.ui.theme.SurfaceSubtle
import com.surplusiq.app.ui.theme.TextSecondary
import com.surplusiq.app.ui.viewmodel.AuthUiState

@Composable
fun OtpVerificationScreen(
    state: AuthUiState,
    onOtpChange: (String) -> Unit,
    onVerifyClick: () -> Unit,
    onResendOtpClick: () -> Unit,
    onBackClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val minutes = state.otpSecondsRemaining / 60
    val seconds = state.otpSecondsRemaining % 60
    val timerText = String.format("%02d:%02d", minutes, seconds)

    AuthShellCard(modifier = modifier, onBackClick = onBackClick) {
        Box(modifier = Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
            Box(
                modifier = Modifier
                    .size(160.dp)
                    .background(SkyBlueContainer, androidx.compose.foundation.shape.CircleShape)
            )
            AuthIllustration(kind = AuthIllustrationKind.OTP)
        }
        Spacer(modifier = Modifier.height(16.dp))

        AuthHeading(
            title = "Nhập mã OTP!",
            subtitle = "Mã 6 chữ số đã được gửi tới số điện thoại ${state.phone}"
        )

        Box(modifier = Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
            SqOtpInput(value = state.otp, onValueChange = onOtpChange)
        }

        if (state.errorMessage != null) {
            AuthErrorBanner(state.errorMessage)
        }

        Spacer(modifier = Modifier.height(16.dp))

        Box(modifier = Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
            if (state.otpSecondsRemaining > 0) {
                Text(text = "Mã có hiệu lực trong: $timerText", fontSize = 13.sp, color = TextSecondary)
            } else {
                Row {
                    Text(text = "Chưa nhận được mã? ", fontSize = 13.sp, color = TextSecondary)
                    Text(
                        text = "Gửi lại",
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Bold,
                        color = ForestGreenDark,
                        modifier = Modifier.clickable { onResendOtpClick() }
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(24.dp))

        AuthPrimaryButton(
            text = "Xác nhận",
            isLoading = state.isLoading,
            enabled = state.otp.length == 6,
            onClick = onVerifyClick
        )
    }
}

/** SqOtpInput - 6 ô riêng biệt, một BasicTextField ẩn nhận input thật để điều khiển focus/bàn phím số. */
@Composable
private fun SqOtpInput(value: String, onValueChange: (String) -> Unit) {
    BasicTextField(
        value = value,
        onValueChange = { if (it.length <= 6 && it.all(Char::isDigit)) onValueChange(it) },
        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.NumberPassword),
        textStyle = TextStyle(color = Color.Transparent),
        cursorBrush = SolidColor(Color.Transparent),
        decorationBox = {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                repeat(6) { index ->
                    val digit = value.getOrNull(index)?.toString() ?: ""
                    val isFilled = digit.isNotEmpty()
                    Box(
                        modifier = Modifier
                            .size(42.dp)
                            .clip(RoundedCornerShape(12.dp))
                            .background(SurfaceSubtle)
                            .then(
                                if (isFilled) Modifier.border(1.5.dp, ForestGreenPrimary, RoundedCornerShape(12.dp)) else Modifier
                            ),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(text = digit, fontSize = 20.sp, fontWeight = FontWeight.ExtraBold, color = ForestGreenDark)
                    }
                }
            }
        }
    )
}

