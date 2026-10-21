package com.surplusiq.app.ui.components

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowLeft
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
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.surplusiq.app.R
import com.surplusiq.app.ui.theme.DividerColor
import com.surplusiq.app.ui.theme.ForestGreenDark
import com.surplusiq.app.ui.theme.ForestGreenPrimary
import com.surplusiq.app.ui.theme.SkyBlueContainer
import com.surplusiq.app.ui.theme.SkyBlueLight
import com.surplusiq.app.ui.theme.SurfaceWhite
import com.surplusiq.app.ui.theme.TextMuted
import com.surplusiq.app.ui.theme.TextPrimary
import com.surplusiq.app.ui.theme.TextSecondary

private val FieldFillColor = Color(0xFFF8F4F0)

/**
 * Khung dùng chung cho luồng Auth: nền cam nhạt có dải gradient phía trên (nút "Quay lại" bên trái, logo bên phải),
 * thẻ trắng bo góc lớn nổi lên từ dưới. [showBrandMark] hiện biểu tượng app và khẩu hiệu ở đầu (màn Đăng nhập).
 */
@Composable
fun AuthShellCard(
    modifier: Modifier = Modifier,
    onBackClick: (() -> Unit)? = null,
    showBrandMark: Boolean = true,
    content: @Composable ColumnScope.() -> Unit
) {
    Box(
        modifier = modifier
            .fillMaxSize()
            .background(Brush.verticalGradient(listOf(Color(0xFFFFE3D0), Color(0xFFFFF3EA), SurfaceWhite)))
    ) {
        Column(
            Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .imePadding()
        ) {
            // Thanh trên: Quay lại + logo
            Row(
                Modifier
                    .fillMaxWidth()
                    .statusBarsPadding()
                    .padding(horizontal = 20.dp, vertical = 12.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                if (onBackClick != null) {
                    Row(
                        Modifier
                            .clip(RoundedCornerShape(50))
                            .background(Color.White.copy(alpha = 0.85f))
                            .clickable(onClick = onBackClick)
                            .padding(start = 6.dp, end = 14.dp, top = 6.dp, bottom = 6.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(Icons.AutoMirrored.Filled.KeyboardArrowLeft, contentDescription = null, tint = TextPrimary, modifier = Modifier.size(20.dp))
                        Text("Quay lại", fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = TextPrimary)
                    }
                } else {
                    Spacer(Modifier.width(1.dp))
                }
                Box(
                    Modifier
                        .clip(RoundedCornerShape(50))
                        .background(Color.White.copy(alpha = 0.85f))
                        .padding(horizontal = 12.dp, vertical = 6.dp)
                ) {
                    Image(
                        painter = painterResource(R.drawable.logo_surplusiq),
                        contentDescription = "SurplusIQ",
                        contentScale = ContentScale.Fit,
                        modifier = Modifier.height(26.dp)
                    )
                }
            }

            if (showBrandMark) {
                Column(Modifier.fillMaxWidth().padding(top = 8.dp, bottom = 20.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                    Box(
                        Modifier
                            .size(76.dp)
                            .clip(RoundedCornerShape(22.dp))
                            .background(Brush.linearGradient(listOf(SkyBlueLight, ForestGreenPrimary))),
                        contentAlignment = Alignment.Center
                    ) {
                        Image(
                            painter = painterResource(R.drawable.logo_surplusiq_icon),
                            contentDescription = null,
                            contentScale = ContentScale.Fit,
                            modifier = Modifier.size(44.dp)
                        )
                    }
                    Spacer(Modifier.height(10.dp))
                    Text(
                        "ẨM THỰC THÔNG MINH • KHÔNG LÃNG PHÍ",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        color = ForestGreenDark,
                        letterSpacing = 0.6.sp
                    )
                }
            } else {
                Spacer(Modifier.height(24.dp))
            }

            // Thẻ trắng nổi, chiếm hết phần còn lại của màn hình
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(1f, fill = false)
                    .clip(RoundedCornerShape(topStart = 32.dp, topEnd = 32.dp))
                    .background(SurfaceWhite)
                    .padding(horizontal = 24.dp, vertical = 28.dp)
                    .navigationBarsPadding(),
                content = content
            )
        }
    }
}

@Composable
fun AuthHeading(title: String, subtitle: String) {
    Text(text = title, fontSize = 24.sp, fontWeight = FontWeight.ExtraBold, color = TextPrimary, textAlign = TextAlign.Center, modifier = Modifier.fillMaxWidth())
    Spacer(modifier = Modifier.height(8.dp))
    Text(text = subtitle, fontSize = 13.sp, color = TextSecondary, lineHeight = 19.sp, textAlign = TextAlign.Center, modifier = Modifier.fillMaxWidth())
    Spacer(modifier = Modifier.height(24.dp))
}

@Composable
fun AuthFieldLabel(text: String, upper: Boolean = false) {
    Text(
        text = if (upper) text.uppercase() else text,
        fontSize = if (upper) 11.sp else 13.sp,
        fontWeight = FontWeight.Bold,
        color = if (upper) TextSecondary else TextPrimary,
        letterSpacing = if (upper) 0.8.sp else 0.sp
    )
    Spacer(modifier = Modifier.height(6.dp))
}

/** Ô nhập bo 16dp nền kem; [leadingIcon] hiện biểu tượng đầu dòng, [upperLabel] viết hoa nhãn như bản thiết kế. */
@Composable
fun AuthField(
    label: String,
    value: String,
    onValueChange: (String) -> Unit,
    placeholder: String,
    keyboardType: KeyboardType = KeyboardType.Text,
    visualTransformation: VisualTransformation = VisualTransformation.None,
    trailingIcon: (@Composable () -> Unit)? = null,
    leadingIcon: (@Composable () -> Unit)? = null,
    upperLabel: Boolean = false
) {
    var isFocused by remember { mutableStateOf(false) }
    val borderColor = if (isFocused) ForestGreenPrimary else DividerColor

    AuthFieldLabel(label, upperLabel)
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .height(54.dp)
            .clip(RoundedCornerShape(16.dp))
            .background(FieldFillColor)
            .border(1.5.dp, borderColor, RoundedCornerShape(16.dp))
            .padding(horizontal = 16.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        if (leadingIcon != null) {
            leadingIcon()
            Spacer(Modifier.width(10.dp))
        }
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

/** Nút chính gradient cam, mũi tên bên phải khi [withArrow]. */
@Composable
fun AuthPrimaryButton(text: String, isLoading: Boolean, enabled: Boolean = true, withArrow: Boolean = false, onClick: () -> Unit) {
    val active = enabled && !isLoading
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(54.dp)
            .clip(RoundedCornerShape(16.dp))
            .background(
                if (active) Brush.horizontalGradient(listOf(SkyBlueLight, ForestGreenPrimary))
                else SolidColor(ForestGreenPrimary.copy(alpha = 0.45f))
            )
            .clickable(enabled = active, onClick = onClick),
        contentAlignment = Alignment.Center
    ) {
        if (isLoading) {
            CircularProgressIndicator(color = Color.White, strokeWidth = 2.5.dp, modifier = Modifier.size(22.dp))
        } else {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(text = text, fontSize = 15.sp, fontWeight = FontWeight.Bold, color = Color.White)
                if (withArrow) {
                    Spacer(Modifier.width(8.dp))
                    Icon(Icons.AutoMirrored.Filled.ArrowForward, contentDescription = null, tint = Color.White, modifier = Modifier.size(18.dp))
                }
            }
        }
    }
}

/** Đường kẻ kèm chữ giữa (vd. "HOẶC TIẾP TỤC VỚI"). */
@Composable
fun AuthDividerOr(text: String = "HOẶC") {
    Row(modifier = Modifier.fillMaxWidth().padding(vertical = 18.dp), verticalAlignment = Alignment.CenterVertically) {
        HorizontalDivider(modifier = Modifier.weight(1f), color = DividerColor)
        Text(text = text, fontSize = 11.sp, fontWeight = FontWeight.SemiBold, color = TextMuted, letterSpacing = 0.6.sp, modifier = Modifier.padding(horizontal = 12.dp))
        HorizontalDivider(modifier = Modifier.weight(1f), color = DividerColor)
    }
}

/** Nút Google viền kem, bo 16dp. Project không có logo Google nhiều màu nên dùng chữ "G" làm biểu tượng. */
@Composable
fun AuthGoogleButton(text: String, onClick: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .height(54.dp)
            .clip(RoundedCornerShape(16.dp))
            .background(SurfaceWhite)
            .border(1.5.dp, DividerColor, RoundedCornerShape(16.dp))
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
