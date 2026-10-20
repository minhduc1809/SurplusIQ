package com.surplusiq.merchant.ui.screens

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.surplusiq.merchant.R
import com.surplusiq.merchant.data.StoreRepository
import com.surplusiq.merchant.ui.components.*
import com.surplusiq.merchant.ui.theme.*
import kotlinx.coroutines.launch

/**
 * Nhập OTP 6 số gửi tới [email].
 * isReset = true: S03 đặt lại mật khẩu (auth/password/reset, kèm mật khẩu mới).
 * isReset = false: xác minh email sau đăng ký S02 (auth/store/verify-email).
 */
@Composable
fun OtpVerificationScreen(
    repository: StoreRepository,
    email: String,
    isReset: Boolean,
    onBackClick: () -> Unit,
    onDone: () -> Unit
) {
    var otp by remember { mutableStateOf("") }
    var newPassword by remember { mutableStateOf("") }
    var confirm by remember { mutableStateOf("") }
    var isLoading by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var info by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    fun submit() {
        if (isReset) passwordError(newPassword, confirm)?.let { error = it; return }
        isLoading = true
        error = null
        scope.launch {
            val result = if (isReset) repository.resetPassword(email, otp, newPassword)
            else repository.verifyStoreEmail(email, otp)
            isLoading = false
            result.fold(onSuccess = { onDone() }, onFailure = { error = it.message })
        }
    }

    fun resend() {
        error = null
        scope.launch {
            val result = if (isReset) repository.forgotPassword(email) else repository.resendVerifyOtp(email)
            result.fold(onSuccess = { info = "Đã gửi lại mã tới $email." }, onFailure = { error = it.message })
        }
    }

    AuthCard(onBackClick = onBackClick) {
        Box(modifier = Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
            Image(
                painter = painterResource(id = R.drawable.illustration_otp),
                contentDescription = null,
                contentScale = ContentScale.Fit,
                modifier = Modifier.size(200.dp)
            )
        }
        Spacer(modifier = Modifier.height(16.dp))

        Text(
            text = if (isReset) "Đặt lại mật khẩu" else "Xác minh email",
            fontSize = 22.sp, fontWeight = FontWeight.ExtraBold, color = SqInk
        )
        Spacer(modifier = Modifier.height(6.dp))
        Text(
            text = "Mã 6 chữ số đã được gửi tới $email (hiệu lực 5 phút).",
            fontSize = 13.sp,
            color = SqInkSoft,
            lineHeight = 18.sp
        )
        Spacer(modifier = Modifier.height(24.dp))

        Box(modifier = Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
            MerchantOtpInput(value = otp, onValueChange = { otp = it })
        }

        if (isReset) {
            Spacer(modifier = Modifier.height(20.dp))
            PasswordField(value = newPassword, onValueChange = { newPassword = it }, placeholder = "Mật khẩu mới")
            Spacer(modifier = Modifier.height(12.dp))
            PasswordField(value = confirm, onValueChange = { confirm = it }, placeholder = "Nhập lại mật khẩu mới")
            Spacer(modifier = Modifier.height(6.dp))
            Text(text = "Tối thiểu 6 ký tự. Mọi phiên đăng nhập khác sẽ bị đăng xuất.", fontSize = 12.sp, color = SqInkMuted)
        }

        if (error != null) {
            Spacer(modifier = Modifier.height(12.dp))
            ErrorBanner(error ?: "")
        } else if (info != null) {
            Spacer(modifier = Modifier.height(12.dp))
            InfoBanner(info ?: "")
        }

        Spacer(modifier = Modifier.height(28.dp))

        PrimaryButton(text = "Xác nhận", onClick = ::submit, enabled = otp.length == 6, loading = isLoading)

        Spacer(modifier = Modifier.height(14.dp))
        Text(
            text = "Gửi lại mã",
            fontSize = 13.sp,
            fontWeight = FontWeight.Bold,
            color = SqCoral,
            textAlign = TextAlign.Center,
            modifier = Modifier.fillMaxWidth().clickable { resend() }
        )
    }
}

/** MerchantOtpInput - 6 ô riêng biệt, một BasicTextField ẩn nhận input thật để điều khiển focus/bàn phím số. */
@Composable
private fun MerchantOtpInput(value: String, onValueChange: (String) -> Unit) {
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
                            .background(SqSurfaceSoft)
                            .then(
                                if (isFilled) Modifier.border(1.5.dp, SqCoral, RoundedCornerShape(12.dp)) else Modifier
                            ),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(text = digit, fontSize = 20.sp, fontWeight = FontWeight.ExtraBold, color = SqCoralDeep)
                    }
                }
            }
        }
    )
}
