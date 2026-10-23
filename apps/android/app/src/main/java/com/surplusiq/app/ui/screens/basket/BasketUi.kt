package com.surplusiq.app.ui.screens.basket

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.surplusiq.app.ui.theme.DividerColor
import com.surplusiq.app.ui.theme.LilacWash
import com.surplusiq.app.ui.theme.SkyBlueContainer
import com.surplusiq.app.ui.theme.SkyBluePrimary
import com.surplusiq.app.ui.theme.SurfaceSubtle
import com.surplusiq.app.ui.theme.TextMuted
import com.surplusiq.app.ui.theme.TextPrimary
import com.surplusiq.app.ui.theme.TextSecondary
import java.text.NumberFormat
import java.util.Locale

/** Bề rộng nội dung tối đa của luồng giỏ cứu trên máy tính bảng; từ [WIDE_BREAKPOINT] trở lên chia hai cột. */
internal val CONTENT_MAX_WIDTH: Dp = 640.dp
internal val WIDE_BREAKPOINT: Dp = 840.dp
internal val WIDE_MAX_WIDTH: Dp = 1120.dp

/** Màu chữ phụ trên nền tím nhạt, dùng thay cho xanh lá để luồng giỏ cứu chỉ phối cam, tím và xám ấm. */
internal val LilacInk = Color(0xFF5B4BB7)

internal fun vnd(value: Number): String = NumberFormat.getInstance(Locale("vi", "VN")).format(value) + "đ"

/** Khung chung ba màn giỏ cứu: thanh tiêu đề tối giản, nội dung căn giữa, thanh hành động cuối màn chừa thanh điều hướng. */
@Composable
internal fun BasketFrame(
    title: String,
    subtitle: String?,
    onBack: () -> Unit,
    modifier: Modifier = Modifier,
    bottomBar: (@Composable () -> Unit)? = null,
    content: @Composable (PaddingValues) -> Unit
) {
    Scaffold(
        modifier = modifier.fillMaxSize(),
        containerColor = MaterialTheme.colorScheme.background,
        topBar = {
            Row(
                Modifier.fillMaxWidth().statusBarsPadding().padding(horizontal = 12.dp, vertical = 8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                IconButton(
                    onClick = onBack,
                    modifier = Modifier.size(40.dp).clip(CircleShape).background(MaterialTheme.colorScheme.surface)
                ) { Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Quay lại", tint = TextPrimary) }
                Column(Modifier.weight(1f).padding(horizontal = 12.dp)) {
                    Text(title, fontWeight = FontWeight.ExtraBold, fontSize = 18.sp, color = TextPrimary, maxLines = 1)
                    if (subtitle != null) Text(subtitle, fontSize = 12.sp, color = TextSecondary, maxLines = 1)
                }
            }
        },
        bottomBar = {
            if (bottomBar != null) {
                Surface(shadowElevation = 6.dp, color = MaterialTheme.colorScheme.surface) {
                    Box(Modifier.fillMaxWidth().navigationBarsPadding(), contentAlignment = Alignment.Center) {
                        Box(Modifier.widthIn(max = WIDE_MAX_WIDTH).fillMaxWidth().padding(horizontal = 16.dp, vertical = 12.dp)) { bottomBar() }
                    }
                }
            }
        },
        content = content
    )
}

@Composable
internal fun SectionLabel(text: String, modifier: Modifier = Modifier) {
    Text(text.uppercase(), fontSize = 11.sp, fontWeight = FontWeight.ExtraBold, color = TextSecondary, letterSpacing = 0.6.sp, modifier = modifier)
}

@Composable
internal fun Pill(text: String, background: Color = LilacWash, foreground: Color = LilacInk) {
    Text(
        text,
        fontSize = 11.sp,
        fontWeight = FontWeight.Bold,
        color = foreground,
        modifier = Modifier.clip(RoundedCornerShape(50)).background(background).padding(horizontal = 10.dp, vertical = 4.dp)
    )
}

/** Thẻ phẳng của luồng giỏ cứu: nền bề mặt, viền mảnh, không đổ bóng. */
@Composable
internal fun BasketCardBox(modifier: Modifier = Modifier, content: @Composable ColumnScope.() -> Unit) {
    Column(
        modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(20.dp))
            .background(MaterialTheme.colorScheme.surface)
            .border(1.dp, DividerColor, RoundedCornerShape(20.dp))
            .padding(16.dp),
        content = content
    )
}

@Composable
internal fun PrimaryAction(text: String, enabled: Boolean = true, loading: Boolean = false, modifier: Modifier = Modifier, onClick: () -> Unit) {
    Button(
        onClick = onClick,
        enabled = enabled && !loading,
        shape = RoundedCornerShape(16.dp),
        colors = ButtonDefaults.buttonColors(containerColor = SkyBluePrimary, disabledContainerColor = SkyBluePrimary.copy(alpha = 0.4f)),
        modifier = modifier.heightIn(min = 52.dp)
    ) {
        if (loading) CircularProgressIndicator(Modifier.size(20.dp), color = Color.White, strokeWidth = 2.dp)
        else Text(text, fontWeight = FontWeight.Bold, color = Color.White, fontSize = 15.sp)
    }
}

@Composable
internal fun MutedText(text: String, modifier: Modifier = Modifier) {
    Text(text, fontSize = 12.sp, color = TextMuted, lineHeight = 17.sp, modifier = modifier)
}

internal val SoftSurface = SurfaceSubtle
internal val CoralWash = SkyBlueContainer
