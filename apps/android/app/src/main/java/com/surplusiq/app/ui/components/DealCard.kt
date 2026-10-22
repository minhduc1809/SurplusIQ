package com.surplusiq.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.DirectionsWalk
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.LocalFireDepartment
import androidx.compose.material.icons.filled.Eco
import androidx.compose.material.icons.filled.Schedule
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.outlined.FavoriteBorder
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.surplusiq.app.domain.model.Deal
import com.surplusiq.app.ui.theme.CoralRed
import com.surplusiq.app.ui.theme.ForestGreenDark
import com.surplusiq.app.ui.theme.ForestGreenPrimary
import com.surplusiq.app.ui.theme.MintDeep
import com.surplusiq.app.ui.theme.SkyBlueContainer
import com.surplusiq.app.ui.theme.SkyBlueIce
import com.surplusiq.app.ui.theme.TextMuted
import com.surplusiq.app.ui.theme.TextPrimary
import com.surplusiq.app.ui.theme.TextSecondary
import java.text.NumberFormat
import java.util.Locale

private fun vnd(value: Int): String = NumberFormat.getInstance(Locale("vi", "VN")).format(value) + "đ"

/** Thẻ suất cứu món: ảnh kèm nhãn còn/giảm giá, tên quán + đánh giá, khung giờ nhận, khoảng cách, tiết kiệm và giá. */
@Composable
fun DealCard(
    deal: Deal,
    onDealClick: (Deal) -> Unit,
    onFavoriteToggle: (Deal) -> Unit,
    modifier: Modifier = Modifier,
    footer: (@Composable ColumnScope.() -> Unit)? = null
) {
    // Sắp hết suất hoặc sắp hết giờ nhận: nhãn cam để nhắc khách; còn nhiều: nhãn xanh lá
    val scarce = deal.remainingStock <= 3 || deal.isUrgent
    val saving = (deal.originalPrice - deal.discountPrice).coerceAtLeast(0)

    SqCard(
        modifier = modifier
            .fillMaxWidth()
            .clickable { onDealClick(deal) },
        shape = RoundedCornerShape(22.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp)
    ) {
        Column {
            Box(Modifier.fillMaxWidth().height(190.dp)) {
                AsyncImage(
                    model = deal.coverImageUrl,
                    contentDescription = deal.title,
                    contentScale = ContentScale.Crop,
                    modifier = Modifier.fillMaxSize()
                )

                Row(
                    Modifier.padding(start = 12.dp, top = 12.dp),
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(
                        Modifier
                            .clip(RoundedCornerShape(50))
                            .background(if (scarce) ForestGreenPrimary else MintDeep)
                            .padding(horizontal = 10.dp, vertical = 5.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            if (scarce) Icons.Default.LocalFireDepartment else Icons.Default.Eco,
                            contentDescription = null,
                            tint = Color.White,
                            modifier = Modifier.size(13.dp)
                        )
                        Spacer(Modifier.width(4.dp))
                        Text("Còn ${deal.remainingStock} suất", color = Color.White, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                    }
                    if (deal.discountPercent > 0) {
                        Box(
                            Modifier
                                .clip(RoundedCornerShape(50))
                                .background(Color.Black.copy(alpha = 0.65f))
                                .padding(horizontal = 10.dp, vertical = 5.dp)
                        ) {
                            Text("-${deal.discountPercent}%", color = Color.White, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                        }
                    }
                }

                IconButton(
                    onClick = { onFavoriteToggle(deal) },
                    modifier = Modifier
                        .align(Alignment.TopEnd)
                        .padding(8.dp)
                        .size(40.dp)
                        .clip(CircleShape)
                        .background(Color.Black.copy(alpha = 0.30f))
                ) {
                    Icon(
                        imageVector = if (deal.isFavorite) Icons.Filled.Favorite else Icons.Outlined.FavoriteBorder,
                        contentDescription = if (deal.isFavorite) "Bỏ yêu thích" else "Yêu thích",
                        tint = if (deal.isFavorite) CoralRed else Color.White,
                        modifier = Modifier.size(20.dp)
                    )
                }

                // Ảnh đại diện quán; chưa có logo thì hiện chữ cái đầu của tên quán
                Box(
                    modifier = Modifier
                        .align(Alignment.BottomStart)
                        .padding(start = 12.dp, bottom = 10.dp)
                        .size(44.dp)
                        .clip(CircleShape)
                        .background(SkyBlueContainer)
                        .border(2.dp, Color.White, CircleShape),
                    contentAlignment = Alignment.Center
                ) {
                    if (deal.storeLogoUrl.isNotBlank()) {
                        AsyncImage(
                            model = deal.storeLogoUrl,
                            contentDescription = deal.storeName,
                            contentScale = ContentScale.Crop,
                            modifier = Modifier.fillMaxSize()
                        )
                    } else {
                        Text(
                            deal.storeName.trim().take(1).uppercase().ifEmpty { "?" },
                            color = ForestGreenDark,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }
            }

            Column(modifier = Modifier.padding(horizontal = 16.dp, vertical = 14.dp)) {
                Row(verticalAlignment = Alignment.Top) {
                    Column(Modifier.weight(1f)) {
                        Text(deal.storeName, fontSize = 16.sp, fontWeight = FontWeight.ExtraBold, color = TextPrimary, maxLines = 1, overflow = TextOverflow.Ellipsis)
                        Spacer(Modifier.height(2.dp))
                        Text(deal.title, fontSize = 13.sp, color = TextSecondary, maxLines = 1, overflow = TextOverflow.Ellipsis)
                    }
                    if (deal.reviewCount > 0) {
                        Spacer(Modifier.width(8.dp))
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.Star, contentDescription = "Đánh giá", tint = Color(0xFFF5A524), modifier = Modifier.size(15.dp))
                            Spacer(Modifier.width(3.dp))
                            Text("%.1f".format(deal.rating), fontSize = 13.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                            Text(" (${deal.reviewCount})", fontSize = 11.sp, color = TextMuted)
                        }
                    }
                }

                Spacer(Modifier.height(10.dp))

                // Khung giờ nhận hàng + hình thức nhận
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(12.dp))
                        .background(SkyBlueContainer)
                        .padding(horizontal = 10.dp, vertical = 7.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(Icons.Default.Schedule, contentDescription = null, tint = ForestGreenDark, modifier = Modifier.size(15.dp))
                    Spacer(Modifier.width(6.dp))
                    Text(
                        "Khung giờ lấy: ${deal.pickupWindowText}",
                        fontSize = 12.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = TextPrimary,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                        modifier = Modifier.weight(1f)
                    )
                    Spacer(Modifier.width(6.dp))
                    Text("TỰ ĐẾN LẤY", fontSize = 9.sp, fontWeight = FontWeight.ExtraBold, color = ForestGreenDark, letterSpacing = 0.4.sp)
                }

                Spacer(Modifier.height(12.dp))

                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    Column(Modifier.weight(1f)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.DirectionsWalk, contentDescription = null, tint = MintDeep, modifier = Modifier.size(15.dp))
                            Spacer(Modifier.width(4.dp))
                            Text(deal.distanceText, fontSize = 12.sp, color = TextSecondary, maxLines = 1)
                        }
                        if (saving > 0) {
                            Spacer(Modifier.height(4.dp))
                            Row(
                                Modifier.clip(RoundedCornerShape(8.dp)).background(SkyBlueIce).padding(horizontal = 8.dp, vertical = 3.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text("Tiết kiệm ${vnd(saving)}", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = MintDeep)
                            }
                        }
                    }
                    Column(horizontalAlignment = Alignment.End) {
                        Text(vnd(deal.originalPrice), fontSize = 12.sp, textDecoration = TextDecoration.LineThrough, color = TextMuted)
                        Text(vnd(deal.discountPrice), fontSize = 18.sp, fontWeight = FontWeight.ExtraBold, color = ForestGreenDark)
                    }
                }
                footer?.let { it() }
            }
        }
    }
}
