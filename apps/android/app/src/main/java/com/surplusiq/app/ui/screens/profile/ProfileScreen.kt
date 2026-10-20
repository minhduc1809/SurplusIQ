package com.surplusiq.app.ui.screens.profile

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.automirrored.filled.HelpOutline
import androidx.compose.material.icons.automirrored.filled.Logout
import androidx.compose.material.icons.automirrored.filled.ReceiptLong
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.surplusiq.app.domain.model.UserImpactStats
import com.surplusiq.app.ui.theme.AmberAccent
import com.surplusiq.app.ui.theme.ForestGreenPrimary
import com.surplusiq.app.ui.theme.TextMuted
import com.surplusiq.app.ui.theme.TextPrimary
import com.surplusiq.app.ui.theme.TextSecondary
import androidx.compose.material.icons.filled.ExpandLess
import androidx.compose.material.icons.filled.ExpandMore
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.text.style.TextOverflow

import androidx.compose.ui.layout.ContentScale
import coil.compose.AsyncImage

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProfileScreen(
    userName: String = "",
    userPhone: String = "",
    avatarUrl: String? = null,
    stats: UserImpactStats? = null,
    onOpenAiChat: () -> Unit,
    onOpenEditProfile: () -> Unit = {},
    onOpenMyOrders: () -> Unit = {},
    onOpenChangePassword: () -> Unit = {},
    onOpenRewards: () -> Unit = {},
    onOpenPromotionWallet: () -> Unit = {},
    onOpenTransactions: () -> Unit = {},
    onOpenOrderLock: () -> Unit = {},
    onOpenComplaints: () -> Unit = {},
    onOpenMyReviews: () -> Unit = {},
    onOpenSupportTickets: () -> Unit = {},
    onOpenRescuePool: () -> Unit = {},
    onOpenRescueBasket: () -> Unit = {},
    onOpenMyRescueDemands: () -> Unit = {},
    onOpenImpact: () -> Unit = {},
    onOpenPrivacyData: () -> Unit = {},
    onOpenHelpCenter: () -> Unit = {},
    onOpenLocationSettings: () -> Unit = {},
    onOpenSavedDeals: () -> Unit = {},
    onOpenDealAlerts: () -> Unit = {},
    onOpenPreferences: () -> Unit = {},
    onOpenDietaryProfile: () -> Unit = {},
    onOpenNotificationSettings: () -> Unit = {},
    onLogout: () -> Unit = {},
    modifier: Modifier = Modifier
) {
    var showMore by remember { mutableStateOf(false) }
    val divider = MaterialTheme.colorScheme.outline.copy(alpha = 0.15f)

    Column(
        modifier = modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 16.dp)
            .padding(top = 16.dp, bottom = 96.dp), // chừa chỗ cho chatbot nổi và bottom nav
            verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Hồ sơ (R1-005, R1-006, K53)
        Row(
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(16.dp))
                .clickable { onOpenEditProfile() }
                .padding(vertical = 4.dp)
        ) {
            Box(
                modifier = Modifier
                    .size(60.dp)
                    .clip(CircleShape)
                    .background(ForestGreenPrimary.copy(alpha = 0.15f)),
                contentAlignment = Alignment.Center
            ) {
                if (!avatarUrl.isNullOrBlank()) {
                    val fullAvatar = if (avatarUrl.startsWith("http")) avatarUrl else "http://10.0.2.2:3000$avatarUrl"
                    AsyncImage(
                        model = fullAvatar,
                        contentDescription = "Avatar",
                        contentScale = ContentScale.Crop,
                        modifier = Modifier
                            .fillMaxSize()
                            .clip(CircleShape)
                    )
                } else {
                    Icon(
                        Icons.Default.Person,
                        contentDescription = "Avatar",
                        tint = ForestGreenPrimary,
                        modifier = Modifier.size(34.dp)
                    )
                }
            }
            Spacer(modifier = Modifier.width(14.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = userName.ifBlank { "Khách" },
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Bold,
                    color = TextPrimary,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                if (userPhone.isNotBlank()) {
                    Text(text = userPhone, fontSize = 13.sp, color = TextSecondary, maxLines = 1)
                }
                Spacer(modifier = Modifier.height(4.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(8.dp))
                            .background(ForestGreenPrimary.copy(alpha = 0.1f))
                            .padding(horizontal = 8.dp, vertical = 2.dp)
                    ) {
                        Text(
                            "Thành viên SurplusIQ",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = ForestGreenPrimary
                        )
                    }
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        "Sửa hồ sơ",
                        fontSize = 12.sp,
                        color = ForestGreenPrimary,
                        fontWeight = FontWeight.SemiBold
                    )
                }
            }
            Icon(
                imageVector = Icons.Default.ChevronRight,
                contentDescription = "Chỉnh sửa",
                tint = TextMuted
            )
        }

        // Thành tích sống xanh: chỉ 3 chỉ số, chi tiết ở trang con
        Card(
            modifier = Modifier.fillMaxWidth().clickable { onOpenImpact() },
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text("Thành tích sống xanh", fontSize = 15.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                    Text("Xem chi tiết", fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = ForestGreenPrimary)
                }
                Spacer(modifier = Modifier.height(12.dp))
                if (stats == null) {
                    Text("Chưa có dữ liệu thành tích.", fontSize = 12.sp, color = TextMuted)
                } else {
                    Row(modifier = Modifier.fillMaxWidth()) {
                        ImpactMetricItem("Thực phẩm cứu", "%.1f kg".format(stats.totalRescuedKg), Icons.Default.Eco, ForestGreenPrimary, Modifier.weight(1f))
                        ImpactMetricItem("CO₂ giảm", "%.1f kg".format(stats.totalReducedCo2Kg), Icons.Default.CloudQueue, Color(0xFF3B82F6), Modifier.weight(1f))
                        ImpactMetricItem("Tiết kiệm", formatSavings(stats.totalSavedMoneyVnd), Icons.Default.Savings, AmberAccent, Modifier.weight(1f))
                    }
                }
            }
        }

        // Lối tắt chính
        MenuGroup {
            ProfileMenuItem(Icons.AutoMirrored.Filled.ReceiptLong, "Đơn hàng của tôi", "Lịch sử mua hàng", onOpenMyOrders)
            HorizontalDivider(color = divider)
            ProfileMenuItem(Icons.Default.ShoppingBasket, "Giỏ cứu tự động", "Gợi ý tổ hợp suất theo ngân sách", onOpenRescueBasket)
            HorizontalDivider(color = divider)
            ProfileMenuItem(Icons.Default.Groups, "Mua chung theo đợt (Rescue Pool)", "Đăng ký nhu cầu với cửa hàng", onOpenRescuePool)
            HorizontalDivider(color = divider)
            ProfileMenuItem(Icons.Default.ListAlt, "Nhu cầu của tôi", "Theo dõi đợt gom & đơn hàng", onOpenMyRescueDemands)
            HorizontalDivider(color = divider)
            ProfileMenuItem(Icons.Default.ConfirmationNumber, "Ví ưu đãi", "Mã giảm giá của bạn", onOpenPromotionWallet)
            HorizontalDivider(color = divider)
            ProfileMenuItem(Icons.Default.Stars, "Điểm thưởng", "Số dư và lịch sử tích điểm", onOpenRewards)
        }

        // Các chức năng còn lại, thu gọn mặc định
        MenuGroup {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { showMore = !showMore }
                    .padding(horizontal = 16.dp, vertical = 14.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text("Tiện ích, hỗ trợ & cài đặt", fontSize = 14.sp, fontWeight = FontWeight.SemiBold, color = TextPrimary, modifier = Modifier.weight(1f))
                Icon(if (showMore) Icons.Default.ExpandLess else Icons.Default.ExpandMore, contentDescription = null, tint = TextMuted)
            }
            if (showMore) {
                listOf(
                    Triple(Icons.Default.LocationOn, "Vị trí & địa điểm", onOpenLocationSettings),
                    Triple(Icons.Default.Bookmarks, "Deal đã lưu & đã xem", onOpenSavedDeals),
                    Triple(Icons.Default.NotificationsActive, "Cảnh báo deal", onOpenDealAlerts),
                    Triple(Icons.Default.Notifications, "Cài đặt thông báo", onOpenNotificationSettings),
                    Triple(Icons.Default.RestaurantMenu, "Hồ sơ ăn uống & dị ứng", onOpenDietaryProfile),
                    Triple(Icons.Default.AccountBalanceWallet, "Thanh toán & hoàn tiền", onOpenTransactions),
                    Triple(Icons.Default.ReportProblem, "Khiếu nại của tôi", onOpenComplaints),
                    Triple(Icons.Default.RateReview, "Đánh giá của tôi", onOpenMyReviews),
                    Triple(Icons.Default.GppMaybe, "Trạng thái khóa đặt", onOpenOrderLock),
                    Triple(Icons.Default.AutoAwesome, "Trợ lý AI Cứu Món", onOpenAiChat),
                    Triple(Icons.Default.SupportAgent, "Hỗ trợ", onOpenSupportTickets),
                    Triple(Icons.AutoMirrored.Filled.HelpOutline, "Câu hỏi thường gặp", onOpenHelpCenter),
                    Triple(Icons.Default.Shield, "Quyền riêng tư & dữ liệu", onOpenPrivacyData),
                    Triple(Icons.Default.Lock, "Đổi mật khẩu", onOpenChangePassword)
                ).forEach { (icon, title, action) ->
                    HorizontalDivider(color = divider)
                    ProfileMenuItem(icon, title, "", action)
                }
            }
        }

        TextButton(onClick = onLogout, modifier = Modifier.fillMaxWidth()) {
            Icon(Icons.AutoMirrored.Filled.Logout, contentDescription = null, tint = TextSecondary, modifier = Modifier.size(18.dp))
            Spacer(modifier = Modifier.width(8.dp))
            Text("Đăng xuất", color = TextSecondary, fontWeight = FontWeight.SemiBold)
        }
    }
}

@Composable
private fun MenuGroup(content: @Composable ColumnScope.() -> Unit) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
    ) { Column(content = content) }
}

private fun formatSavings(vnd: Long): String = when {
    vnd >= 1_000_000 -> "%.1f tr".format(vnd / 1_000_000.0)
    vnd >= 1_000 -> "${vnd / 1_000}k"
    else -> "$vnd ₫"
}

@Composable
fun ImpactMetricItem(
    label: String,
    value: String,
    icon: ImageVector,
    color: Color,
    modifier: Modifier = Modifier
) {
    Column(modifier = modifier, horizontalAlignment = Alignment.CenterHorizontally) {
        Icon(imageVector = icon, contentDescription = null, tint = color, modifier = Modifier.size(20.dp))
        Spacer(modifier = Modifier.height(4.dp))
        Text(text = value, fontSize = 14.sp, fontWeight = FontWeight.Bold, color = TextPrimary, maxLines = 1, overflow = TextOverflow.Ellipsis)
        Text(text = label, fontSize = 11.sp, color = TextSecondary, maxLines = 1, overflow = TextOverflow.Ellipsis)
    }
}

@Composable
fun ProfileMenuItem(
    icon: ImageVector,
    title: String,
    subtitle: String,
    onClick: () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() }
            .padding(horizontal = 16.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            tint = ForestGreenPrimary,
            modifier = Modifier.size(22.dp)
        )
        Spacer(modifier = Modifier.width(14.dp))
        Column(modifier = Modifier.weight(1f)) {
            Text(text = title, fontSize = 14.sp, fontWeight = FontWeight.SemiBold, color = TextPrimary)
            if (subtitle.isNotBlank()) Text(text = subtitle, fontSize = 12.sp, color = TextMuted)
        }
        Icon(
            imageVector = Icons.Default.ChevronRight,
            contentDescription = null,
            tint = TextMuted
        )
    }
}
