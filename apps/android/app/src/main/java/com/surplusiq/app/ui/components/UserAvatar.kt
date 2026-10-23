package com.surplusiq.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.surplusiq.app.BuildConfig
import com.surplusiq.app.ui.theme.ForestGreenPrimary

/** Chữ cái đại diện theo tên Việt: lấy chữ đầu của tên gọi (từ cuối), ví dụ "Nguyễn Hà My" -> "M". */
fun avatarInitial(name: String): String =
    name.trim().substringAfterLast(" ").take(1).ifEmpty { "?" }.uppercase()

/** Ảnh đại diện tròn dùng chung cho mọi thanh tiêu đề: có ảnh thì hiện ảnh, chưa có thì hiện chữ cái đầu. */
@Composable
fun UserAvatar(name: String, avatarUrl: String?, onClick: () -> Unit, size: Dp = 38.dp) {
    Box(
        modifier = Modifier.size(size).clip(CircleShape).background(ForestGreenPrimary).clickable(onClick = onClick),
        contentAlignment = Alignment.Center
    ) {
        if (!avatarUrl.isNullOrBlank()) {
            val base = BuildConfig.API_BASE_URL.trimEnd('/')
            AsyncImage(
                model = if (avatarUrl.startsWith("http")) avatarUrl else base + avatarUrl,
                contentDescription = "Ảnh đại diện",
                contentScale = ContentScale.Crop,
                modifier = Modifier.size(size).clip(CircleShape)
            )
        } else {
            Text(avatarInitial(name), color = Color.White, fontWeight = FontWeight.Bold, fontSize = 15.sp)
        }
    }
}
