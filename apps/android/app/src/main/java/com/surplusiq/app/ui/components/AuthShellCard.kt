package com.surplusiq.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.onFocusEvent
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.surplusiq.app.ui.theme.ForestGreenPrimary
import com.surplusiq.app.ui.theme.ForestGreenDark
import com.surplusiq.app.ui.theme.SkyBlueContainer
import com.surplusiq.app.ui.theme.SurfaceWhite
import com.surplusiq.app.ui.theme.SurfaceSubtle
import com.surplusiq.app.ui.theme.DividerColor
import com.surplusiq.app.ui.theme.TextMuted
import com.surplusiq.app.ui.theme.TextPrimary

/** Nền field đậm hơn SurfaceSubtle (#F7F1EA) để tách bạch rõ với card trắng -
 * trước đây 2 màu quá gần nhau khiến field gần như vô hình trên card. */
private val FieldFillColor = Color(0xFFF1EBE0)

/**
 * Khung dùng chung cho toàn bộ luồng Auth (Đăng nhập/Đăng ký/OTP/Quên mật khẩu):
 * nền pastel coral full-bleed + card trắng bo tròn lớn nổi lên trên, nút quay lại
 * hình tròn góc trên trái. Theo đúng phong cách tham khảo người dùng gửi, đổi
 * sang token màu SurplusIQ (sqCoralWash/sqSurface/sqCoralDeep).
 */
@Composable
fun AuthShellCard(
    onBackClick: (() -> Unit)? = null,
    content: @Composable ColumnScope.() -> Unit
) {
    Box(modifier = Modifier.fillMaxSize().background(SurfaceWhite)) {
        if (onBackClick != null) {
            IconButton(
                onClick = onBackClick,
                modifier = Modifier
                    .padding(top = 48.dp, start = 20.dp)
                    .size(40.dp)
                    .clip(CircleShape)
                    .background(SurfaceSubtle)
            ) {
                Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Quay lại", tint = ForestGreenDark)
            }
        }

        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(top = if (onBackClick != null) 108.dp else 72.dp, bottom = 32.dp)
                .padding(horizontal = 20.dp)
                .verticalScroll(rememberScrollState()),
        ) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(28.dp))
                    .background(SurfaceWhite)
                    .padding(24.dp)
            ) {
                Column(content = content)
            }
        }
    }
}

@Composable
fun AuthHeading(title: String, subtitle: String) {
    Text(text = title, fontSize = 22.sp, fontWeight = FontWeight.ExtraBold, color = ForestGreenDark)
    Spacer(modifier = Modifier.height(6.dp))
    Text(text = subtitle, fontSize = 13.sp, color = Color(0xFF536164), lineHeight = 18.sp)
    Spacer(modifier = Modifier.height(24.dp))
}

@Composable
fun AuthFieldLabel(text: String) {
    Text(text = text, fontSize = 13.sp, fontWeight = FontWeight.Bold, color = Color(0xFF243033))
    Spacer(modifier = Modifier.height(6.dp))
}

/** Field pill xám nhạt theo đúng phong cách tham khảo - label đậm phía trên, không viền trừ khi focus. */
@Composable
fun AuthField(
    label: String,
    value: String,
    onValueChange: (String) -> Unit,
    placeholder: String,
    keyboardType: KeyboardType = KeyboardType.Text,
    visualTransformation: VisualTransformation = VisualTransformation.None,
    trailingIcon: (@Composable () -> Unit)? = null
) {
    var isFocused by remember { mutableStateOf(false) }
    val borderColor = if (isFocused) ForestGreenPrimary else DividerColor

    AuthFieldLabel(label)
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .height(50.dp)
            .clip(RoundedCornerShape(14.dp))
            .background(FieldFillColor)
            .border(1.5.dp, borderColor, RoundedCornerShape(14.dp))
            .padding(horizontal = 16.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(modifier = Modifier.weight(1f)) {
            BasicTextField(
                value = value,
                onValueChange = onValueChange,
                singleLine = true,
                textStyle = TextStyle(fontSize = 14.sp, color = TextPrimary, fontWeight = FontWeight.Medium),
                cursorBrush = SolidColor(ForestGreenPrimary),
                keyboardOptions = KeyboardOptions(keyboardType = keyboardType),
                visualTransformation = visualTransformation,
                modifier = Modifier.fillMaxWidth().onFocusEvent { isFocused = it.isFocused },
                decorationBox = { inner ->
                    if (value.isEmpty()) Text(text = placeholder, fontSize = 14.sp, color = TextMuted)
                    inner()
                }
            )
        }
        trailingIcon?.invoke()
    }
}

@Composable
fun AuthPrimaryButton(text: String, isLoading: Boolean, enabled: Boolean = true, onClick: () -> Unit) {
    Button(
        onClick = onClick,
        enabled = enabled && !isLoading,
        modifier = Modifier.fillMaxWidth().height(50.dp),
        shape = RoundedCornerShape(12.dp),
        colors = ButtonDefaults.buttonColors(containerColor = ForestGreenPrimary, disabledContainerColor = ForestGreenPrimary.copy(alpha = 0.5f))
    ) {
        if (isLoading) {
            CircularProgressIndicator(color = Color.White, strokeWidth = 2.5.dp, modifier = Modifier.size(20.dp))
        } else {
            Text(text = text, fontSize = 15.sp, fontWeight = FontWeight.Bold, color = Color.White)
        }
    }
}

/** Divider "HOẶC" dùng giữa nút hành động chính và nút đăng nhập Google. */
@Composable
fun AuthDividerOr() {
    Row(modifier = Modifier.fillMaxWidth().padding(vertical = 16.dp), verticalAlignment = Alignment.CenterVertically) {
        HorizontalDivider(modifier = Modifier.weight(1f), color = DividerColor)
        Text(text = "HOẶC", fontSize = 11.sp, color = TextMuted, modifier = Modifier.padding(horizontal = 10.dp))
        HorizontalDivider(modifier = Modifier.weight(1f), color = DividerColor)
    }
}

/**
 * Nút đăng nhập Google - viền trắng, bo góc 12dp (giống AuthPrimaryButton, không phải pill).
 * Không có asset logo Google nhiều màu trong project nên dùng badge chữ "G" đơn giản làm stand-in.
 */
@Composable
fun AuthGoogleButton(text: String, onClick: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .height(50.dp)
            .clip(RoundedCornerShape(12.dp))
            .background(SurfaceWhite)
            .border(1.5.dp, DividerColor, RoundedCornerShape(12.dp))
            .clickable(onClick = onClick),
        horizontalArrangement = Arrangement.Center,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(text = "G", fontSize = 20.sp, fontWeight = FontWeight.Black, color = Color(0xFF4285F4))
        Spacer(modifier = Modifier.width(10.dp))
        Text(text = text, fontSize = 14.sp, fontWeight = FontWeight.SemiBold, color = TextPrimary)
    }
}

@Composable
fun AuthErrorBanner(message: String) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(top = 12.dp)
            .clip(RoundedCornerShape(12.dp))
            .background(SkyBlueContainer)
            .padding(12.dp)
    ) {
        Text(text = message, color = ForestGreenDark, fontSize = 12.sp, fontWeight = FontWeight.Medium)
    }
}
