package com.surplusiq.app.ui.components

import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.size
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.unit.dp
import com.surplusiq.app.R

enum class AuthIllustrationKind { WELCOME, OTP, FORGOT_PASSWORD }

/**
 * Minh hoạ 3D thật cho các màn Auth (Welcome/OTP/Quên mật khẩu), thay cho
 * placeholder vector trước đây - ảnh do người dùng cung cấp, đặt ở res/drawable.
 */
@Composable
fun AuthIllustration(kind: AuthIllustrationKind, modifier: Modifier = Modifier, sizeDp: Int = 200) {
    val drawableId = when (kind) {
        AuthIllustrationKind.WELCOME -> R.drawable.illustration_welcome
        AuthIllustrationKind.OTP -> R.drawable.illustration_otp
        AuthIllustrationKind.FORGOT_PASSWORD -> R.drawable.illustration_forgot_password
    }

    Image(
        painter = painterResource(id = drawableId),
        contentDescription = null,
        contentScale = ContentScale.Fit,
        modifier = modifier.size(sizeDp.dp)
    )
}
