package com.surplusiq.merchant.ui.components

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowLeft
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.surplusiq.merchant.R
import com.surplusiq.merchant.ui.theme.*

private val CoralLight = Color(0xFFFFA866)

/**
 * Khung dùng chung cho đăng nhập, đăng ký, OTP, quên mật khẩu của app cửa hàng: cùng bố cục app khách hàng
 * (dải cam nhạt có nút "Quay lại" và logo, thẻ trắng bo góc lớn nổi lên). [showBrandMark] hiện biểu tượng và khẩu hiệu.
 */
@Composable
fun AuthCard(
    onBackClick: (() -> Unit)?,
    showBrandMark: Boolean = false,
    content: @Composable ColumnScope.() -> Unit
) {
    Box(
        Modifier
            .fillMaxSize()
            .background(Brush.verticalGradient(listOf(Color(0xFFFFE3D0), Color(0xFFFFF3EA), SqSurface)))
    ) {
        Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).imePadding()) {
            Row(
                Modifier.fillMaxWidth().statusBarsPadding().padding(horizontal = 20.dp, vertical = 12.dp),
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
                        Icon(Icons.AutoMirrored.Filled.KeyboardArrowLeft, contentDescription = null, tint = SqInk, modifier = Modifier.size(20.dp))
                        Text("Quay lại", fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = SqInk)
                    }
                } else {
                    Spacer(Modifier.width(1.dp))
                }
                Box(
                    Modifier.clip(RoundedCornerShape(50)).background(Color.White.copy(alpha = 0.85f)).padding(horizontal = 12.dp, vertical = 6.dp)
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
                            .background(Brush.linearGradient(listOf(CoralLight, SqCoral))),
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
                        "QUẢN LÝ THÔNG MINH • GIẢM LÃNG PHÍ",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        color = SqCoralDeep,
                        letterSpacing = 0.6.sp
                    )
                }
            } else {
                Spacer(Modifier.height(24.dp))
            }

            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(1f, fill = false)
                    .clip(RoundedCornerShape(topStart = 32.dp, topEnd = 32.dp))
                    .background(SqSurface)
                    .padding(horizontal = 24.dp, vertical = 28.dp)
                    .navigationBarsPadding(),
                content = content
            )
        }
    }
}

/** Tiêu đề và mô tả ngắn căn giữa của màn xác thực. */
@Composable
fun AuthHeading(title: String, subtitle: String) {
    Text(title, fontSize = 24.sp, fontWeight = FontWeight.ExtraBold, color = SqInk, textAlign = TextAlign.Center, modifier = Modifier.fillMaxWidth())
    Spacer(Modifier.height(8.dp))
    Text(subtitle, fontSize = 13.sp, color = SqInkSoft, lineHeight = 19.sp, textAlign = TextAlign.Center, modifier = Modifier.fillMaxWidth())
    Spacer(Modifier.height(24.dp))
}

/** Nhãn trên ô nhập; [upper] viết hoa cỡ nhỏ như màn đăng nhập của app khách. */
@Composable
fun AuthLabel(text: String, upper: Boolean = false) {
    Text(
        text = if (upper) text.uppercase() else text,
        fontSize = if (upper) 11.sp else 13.sp,
        fontWeight = FontWeight.Bold,
        color = if (upper) SqInkSoft else SqInk,
        letterSpacing = if (upper) 0.8.sp else 0.sp
    )
    Spacer(Modifier.height(6.dp))
}

/** Nút chính gradient cam, mũi tên bên phải khi [withArrow]. */
@Composable
fun AuthGradientButton(text: String, enabled: Boolean = true, loading: Boolean = false, withArrow: Boolean = false, onClick: () -> Unit) {
    val active = enabled && !loading
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(54.dp)
            .clip(RoundedCornerShape(16.dp))
            .background(
                if (active) Brush.horizontalGradient(listOf(CoralLight, SqCoral)) else SolidColor(SqCoral.copy(alpha = 0.45f))
            )
            .clickable(enabled = active, onClick = onClick),
        contentAlignment = Alignment.Center
    ) {
        if (loading) {
            CircularProgressIndicator(color = Color.White, strokeWidth = 2.5.dp, modifier = Modifier.size(22.dp))
        } else {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(text, fontSize = 15.sp, fontWeight = FontWeight.Bold, color = Color.White)
                if (withArrow) {
                    Spacer(Modifier.width(8.dp))
                    Icon(Icons.AutoMirrored.Filled.ArrowForward, contentDescription = null, tint = Color.White, modifier = Modifier.size(18.dp))
                }
            }
        }
    }
}

/** Đường kẻ kèm chữ giữa (vd. "HOẶC"). */
@Composable
fun AuthDivider(text: String) {
    Row(Modifier.fillMaxWidth().padding(vertical = 18.dp), verticalAlignment = Alignment.CenterVertically) {
        HorizontalDivider(modifier = Modifier.weight(1f), color = SqLine)
        Text(text, fontSize = 11.sp, fontWeight = FontWeight.SemiBold, color = SqInkMuted, letterSpacing = 0.6.sp, modifier = Modifier.padding(horizontal = 12.dp))
        HorizontalDivider(modifier = Modifier.weight(1f), color = SqLine)
    }
}
