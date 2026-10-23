package com.surplusiq.app.ui.screens.profile

import com.surplusiq.app.ui.screens.notifications.NotificationBellIcon
import androidx.compose.foundation.Image
import com.surplusiq.app.ui.components.SqCard
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.HelpOutline
import androidx.compose.material.icons.automirrored.filled.Logout
import androidx.compose.material.icons.automirrored.filled.ReceiptLong
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.surplusiq.app.BuildConfig
import com.surplusiq.app.R
import com.surplusiq.app.domain.model.UserImpactStats
import com.surplusiq.app.ui.theme.AmberLight
import com.surplusiq.app.ui.theme.ForestGreenDark
import com.surplusiq.app.ui.theme.ForestGreenPrimary
import com.surplusiq.app.ui.theme.LilacAccent
import com.surplusiq.app.ui.theme.LilacWash
import com.surplusiq.app.ui.theme.MintDeep
import com.surplusiq.app.ui.theme.SkyBlueAccent
import com.surplusiq.app.ui.theme.SkyBlueContainer
import com.surplusiq.app.ui.theme.SkyBlueIce
import com.surplusiq.app.ui.theme.SkyInfoWash
import com.surplusiq.app.ui.theme.InfoOnLight
import com.surplusiq.app.ui.theme.TextMuted
import com.surplusiq.app.ui.theme.TextPrimary
import com.surplusiq.app.ui.theme.TextSecondary
import com.surplusiq.app.ui.theme.WarningOnLight
import com.surplusiq.app.ui.theme.CoralRed
import com.surplusiq.app.ui.theme.CoralRedLight

/** Hồ sơ khách: bố cục thẻ theo thiết kế (đơn sắp tới, hồ sơ, điểm xanh/tiết kiệm, thành tích, các nhóm chức năng). */
@Composable
fun ProfileScreen(
    userName: String = "",
    userPhone: String = "",
    avatarUrl: String? = null,
    stats: UserImpactStats? = null,
    pointsBalance: Int? = null,
    upcomingOrdersCount: Int = 0,
    upcomingPickupWindow: String? = null,
    locationLabel: String? = null,
    radiusKm: Double? = null,
    unreadNotificationCount: Int = 0,
    onOpenNotifications: () -> Unit = {},
    onOpenAiChat: () -> Unit,
    onOpenEditProfile: () -> Unit = {},
    onOpenMyOrders: () -> Unit = {},
    onOpenChangePassword: () -> Unit = {},
    onOpenRewards: () -> Unit = {},
    onOpenPromotionWallet: () -> Unit = {},
    onOpenTransactions: () -> Unit = {},
    onOpenRefundBankAccount: () -> Unit = {},
    onOpenOnboarding: () -> Unit = {},
    onOpenTwoFactor: () -> Unit = {},
    onOpenGifts: () -> Unit = {},
    onOpenDevices: () -> Unit = {},
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
            .padding(top = 12.dp, bottom = 96.dp), // chừa chỗ cho chatbot nổi và bottom nav
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        ProfileHeader(
            name = userName,
            avatarUrl = avatarUrl,
            unread = unreadNotificationCount,
            onBell = onOpenNotifications,
            onAvatar = onOpenEditProfile
        )

        if (upcomingOrdersCount > 0) {
            UpcomingBanner(count = upcomingOrdersCount, window = upcomingPickupWindow, onClick = onOpenMyOrders)
        }

        // Thẻ hồ sơ
        SqCard(
            modifier = Modifier.fillMaxWidth().clickable { onOpenEditProfile() },
            shape = RoundedCornerShape(22.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
        ) {
            Column(Modifier.padding(16.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(contentAlignment = Alignment.BottomEnd) {
                        Box(
                            modifier = Modifier.size(64.dp).clip(CircleShape).background(ForestGreenPrimary.copy(alpha = 0.15f)),
                            contentAlignment = Alignment.Center
                        ) {
                            if (!avatarUrl.isNullOrBlank()) {
                                val base = BuildConfig.API_BASE_URL.trimEnd('/')
                                AsyncImage(
                                    model = if (avatarUrl.startsWith("http")) avatarUrl else base + avatarUrl,
                                    contentDescription = "Ảnh đại diện",
                                    contentScale = ContentScale.Crop,
                                    modifier = Modifier.fillMaxSize().clip(CircleShape)
                                )
                            } else {
                                Icon(Icons.Default.Person, contentDescription = "Ảnh đại diện", tint = ForestGreenPrimary, modifier = Modifier.size(34.dp))
                            }
                        }
                        Box(
                            Modifier.size(20.dp).clip(CircleShape).background(MintDeep),
                            contentAlignment = Alignment.Center
                        ) { Icon(Icons.Default.Check, contentDescription = null, tint = Color.White, modifier = Modifier.size(13.dp)) }
                    }
                    Spacer(Modifier.width(14.dp))
                    Column(Modifier.weight(1f)) {
                        Text(userName.ifBlank { "Khách" }, fontSize = 18.sp, fontWeight = FontWeight.ExtraBold, color = TextPrimary, maxLines = 1, overflow = TextOverflow.Ellipsis)
                        if (userPhone.isNotBlank()) Text(userPhone, fontSize = 13.sp, color = TextSecondary, maxLines = 1)
                    }
                    Box(
                        Modifier.size(36.dp).clip(CircleShape).background(SkyBlueContainer),
                        contentAlignment = Alignment.Center
                    ) { Icon(Icons.Default.Edit, contentDescription = "Sửa hồ sơ", tint = ForestGreenDark, modifier = Modifier.size(18.dp)) }
                }
                Spacer(Modifier.height(10.dp))
                Row(
                    Modifier.clip(RoundedCornerShape(50)).background(SkyBlueIce).padding(horizontal = 12.dp, vertical = 5.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(Icons.Default.VerifiedUser, contentDescription = null, tint = MintDeep, modifier = Modifier.size(14.dp))
                    Spacer(Modifier.width(6.dp))
                    Text("Thành viên SurplusIQ", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = MintDeep)
                }
            }
        }

        // Điểm xanh + tiết kiệm
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp), modifier = Modifier.fillMaxWidth()) {
            StatTile(
                icon = Icons.Default.Eco,
                tint = MintDeep,
                wash = SkyBlueIce,
                label = "Điểm xanh",
                value = if (pointsBalance != null) "${formatThousands(pointsBalance.toLong())} điểm" else "—",
                onClick = onOpenRewards,
                modifier = Modifier.weight(1f)
            )
            StatTile(
                icon = Icons.Default.Savings,
                tint = WarningOnLight,
                wash = AmberLight,
                label = "Đã tiết kiệm",
                value = if (stats != null) "${formatThousands(stats.totalSavedMoneyVnd)}đ" else "—",
                onClick = onOpenImpact,
                modifier = Modifier.weight(1f)
            )
        }

        // Thành tích sống xanh
        SqCard(
            modifier = Modifier.fillMaxWidth().clickable { onOpenImpact() },
            shape = RoundedCornerShape(22.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
        ) {
            Column(Modifier.padding(16.dp)) {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(Modifier.size(28.dp).clip(CircleShape).background(SkyBlueIce), contentAlignment = Alignment.Center) {
                            Icon(Icons.Default.Eco, contentDescription = null, tint = MintDeep, modifier = Modifier.size(16.dp))
                        }
                        Spacer(Modifier.width(8.dp))
                        Text("Thành tích sống xanh", fontSize = 15.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                    }
                    Text("Xem chi tiết  ›", fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = ForestGreenDark)
                }
                Spacer(Modifier.height(14.dp))
                if (stats == null) {
                    Text("Chưa có dữ liệu thành tích.", fontSize = 12.sp, color = TextMuted)
                } else {
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        AchievementCell("Bữa giải cứu", "${stats.totalRescuedBags}", Icons.Default.Restaurant, MintDeep, SkyBlueIce, Modifier.weight(1f))
                        AchievementCell("kg CO₂ giảm (ước tính)", "%.1f".format(stats.totalReducedCo2Kg), Icons.Default.CloudQueue, InfoOnLight, SkyInfoWash, Modifier.weight(1f))
                        AchievementCell("Tiết kiệm", formatSavings(stats.totalSavedMoneyVnd), Icons.Default.Savings, WarningOnLight, AmberLight, Modifier.weight(1f))
                    }
                }
            }
        }

        SectionLabel("HOẠT ĐỘNG CỨU MÓN")
        MenuGroup {
            FeatureRow(Icons.AutoMirrored.Filled.ReceiptLong, ForestGreenDark, SkyBlueContainer, "Đơn hàng của tôi", "Lịch sử cứu món & trạng thái nhận", onOpenMyOrders,
                badge = if (upcomingOrdersCount > 0) "$upcomingOrdersCount chờ nhận" else null)
            HorizontalDivider(color = divider)
            FeatureRow(Icons.Default.ShoppingBasket, MintDeep, SkyBlueIce, "Giỏ cứu tự động", "Gợi ý tổ hợp suất theo ngân sách", onOpenRescueBasket)
            HorizontalDivider(color = divider)
            FeatureRow(Icons.Default.Groups, InfoOnLight, SkyInfoWash, "Mua chung theo đợt", "Gom đơn giá sốc cùng cộng đồng", onOpenRescuePool)
            HorizontalDivider(color = divider)
            FeatureRow(Icons.Default.ListAlt, LilacAccent, LilacWash, "Nhu cầu của tôi", "Theo dõi tiến độ đợt gom & đăng ký", onOpenMyRescueDemands)
        }

        SectionLabel("TÀI CHÍNH & PHẦN THƯỞNG")
        MenuGroup {
            FeatureRow(Icons.Default.ConfirmationNumber, ForestGreenDark, SkyBlueContainer, "Ưu đãi & Voucher", "Mã giảm giá và quà độc quyền của bạn", onOpenPromotionWallet)
            HorizontalDivider(color = divider)
            FeatureRow(Icons.Default.Stars, WarningOnLight, AmberLight, "Điểm thưởng & Đổi quà",
                if (pointsBalance != null) "Số dư ${formatThousands(pointsBalance.toLong())} điểm • Đổi voucher và quà" else "Số dư, đổi voucher và quy tắc", onOpenRewards)
            HorizontalDivider(color = divider)
            FeatureRow(Icons.Default.CardGiftcard, CoralRed, CoralRedLight, "Quà tặng suất ăn", "Suất được gửi tặng & quà bạn đã mời", onOpenGifts)
        }

        SectionLabel("CÀI ĐẶT & TRỢ GIÚP")
        MenuGroup {
            FeatureRow(
                Icons.Default.NearMe, InfoOnLight, SkyInfoWash, "Bán kính quét món",
                locationLabel?.takeIf { it.isNotBlank() } ?: "Chưa chọn vị trí", onOpenLocationSettings,
                badge = radiusKm?.let { formatRadiusShort(it) }
            )
            HorizontalDivider(color = divider)
            FeatureRow(Icons.Default.NotificationsActive, ForestGreenDark, SkyBlueContainer, "Cảnh báo suất & thông báo", "Báo giờ vàng, suất mới và nhắc nhận hàng", onOpenNotificationSettings)
            HorizontalDivider(color = divider)
            FeatureRow(Icons.AutoMirrored.Filled.HelpOutline, MintDeep, SkyBlueIce, "Trung tâm trợ giúp", "Câu hỏi thường gặp & bảo vệ người dùng", onOpenHelpCenter)
        }

        // Các chức năng còn lại, thu gọn mặc định
        MenuGroup {
            Row(
                modifier = Modifier.fillMaxWidth().clickable { showMore = !showMore }.padding(horizontal = 16.dp, vertical = 14.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text("Tiện ích khác", fontSize = 14.sp, fontWeight = FontWeight.SemiBold, color = TextPrimary, modifier = Modifier.weight(1f))
                Icon(if (showMore) Icons.Default.ExpandLess else Icons.Default.ExpandMore, contentDescription = null, tint = TextMuted)
            }
            if (showMore) {
                listOf(
                    Triple(Icons.Default.Bookmarks, "Suất đã lưu & đã xem", onOpenSavedDeals),
                    Triple(Icons.Default.NotificationsActive, "Cảnh báo suất", onOpenDealAlerts),
                    Triple(Icons.Default.RestaurantMenu, "Hồ sơ ăn uống & dị ứng", onOpenDietaryProfile),
                    Triple(Icons.Default.AccountBalanceWallet, "Thanh toán & hoàn tiền", onOpenTransactions),
                    Triple(Icons.Default.AccountBalance, "Tài khoản nhận hoàn tiền VietQR", onOpenRefundBankAccount),
                    Triple(Icons.Default.ReportProblem, "Khiếu nại của tôi", onOpenComplaints),
                    Triple(Icons.Default.RateReview, "Đánh giá của tôi", onOpenMyReviews),
                    Triple(Icons.Default.GppMaybe, "Trạng thái khóa đặt", onOpenOrderLock),
                    Triple(Icons.Default.AutoAwesome, "Trợ lý AI Cứu Món", onOpenAiChat),
                    Triple(Icons.Default.SupportAgent, "Hỗ trợ", onOpenSupportTickets),
                    Triple(Icons.Default.Info, "Giới thiệu & hướng dẫn ứng dụng", onOpenOnboarding),
                    Triple(Icons.Default.Shield, "Quyền riêng tư & dữ liệu", onOpenPrivacyData),
                    Triple(Icons.Default.Lock, "Đổi mật khẩu", onOpenChangePassword),
                    Triple(Icons.Default.VerifiedUser, "Xác thực hai bước", onOpenTwoFactor),
                    Triple(Icons.Default.Devices, "Thiết bị đăng nhập", onOpenDevices)
                ).forEach { (icon, title, action) ->
                    HorizontalDivider(color = divider)
                    ProfileMenuItem(icon, title, "", action)
                }
            }
        }

        // Đăng xuất
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(16.dp))
                .background(CoralRedLight)
                .clickable { onLogout() }
                .padding(vertical = 14.dp),
            horizontalArrangement = Arrangement.Center,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(Icons.AutoMirrored.Filled.Logout, contentDescription = null, tint = CoralRed, modifier = Modifier.size(18.dp))
            Spacer(Modifier.width(8.dp))
            Text("Đăng xuất tài khoản", color = CoralRed, fontWeight = FontWeight.Bold, fontSize = 14.sp)
        }
    }
}

@Composable
private fun ProfileHeader(name: String, avatarUrl: String?, unread: Int, onBell: () -> Unit, onAvatar: () -> Unit) {
    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
        Image(
            painter = painterResource(R.drawable.logo_surplusiq_icon),
            contentDescription = "SurplusIQ",
            contentScale = ContentScale.Fit,
            modifier = Modifier.size(38.dp)
        )
        Spacer(Modifier.width(8.dp))
        Column(Modifier.weight(1f)) {
            Text("SURPLUSIQ", fontSize = 13.sp, fontWeight = FontWeight.ExtraBold, color = ForestGreenDark, letterSpacing = 0.8.sp)
            Text("Hồ sơ của tôi", fontSize = 12.sp, color = TextSecondary)
        }
        NotificationBellIcon(unreadCount = unread, onClick = onBell)
        Spacer(Modifier.width(14.dp))
        com.surplusiq.app.ui.components.UserAvatar(name = name, avatarUrl = avatarUrl, onClick = onAvatar)
    }
}

@Composable
private fun UpcomingBanner(count: Int, window: String?, onClick: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(18.dp))
            .background(SkyBlueContainer)
            .clickable(onClick = onClick)
            .padding(horizontal = 14.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(Modifier.size(38.dp).clip(RoundedCornerShape(12.dp)).background(ForestGreenPrimary.copy(alpha = 0.2f)), contentAlignment = Alignment.Center) {
            Icon(Icons.Default.ShoppingBag, contentDescription = null, tint = ForestGreenDark, modifier = Modifier.size(20.dp))
        }
        Spacer(Modifier.width(12.dp))
        Column(Modifier.weight(1f)) {
            Text("ĐƠN HÀNG SẮP TỚI", fontSize = 10.sp, fontWeight = FontWeight.ExtraBold, color = ForestGreenDark, letterSpacing = 0.6.sp)
            Text(
                "$count đơn chờ nhận" + if (!window.isNullOrBlank()) " • $window" else "",
                fontSize = 13.sp,
                fontWeight = FontWeight.SemiBold,
                color = TextPrimary,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
        }
        Text("Chi tiết  ›", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = ForestGreenDark)
    }
}

@Composable
private fun StatTile(
    icon: ImageVector,
    tint: Color,
    wash: Color,
    label: String,
    value: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    SqCard(
        modifier = modifier.clickable(onClick = onClick),
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
    ) {
        Row(Modifier.padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
            Box(Modifier.size(40.dp).clip(RoundedCornerShape(12.dp)).background(wash), contentAlignment = Alignment.Center) {
                Icon(icon, contentDescription = null, tint = tint, modifier = Modifier.size(22.dp))
            }
            Spacer(Modifier.width(10.dp))
            Column {
                Text(label, fontSize = 11.sp, color = TextSecondary)
                Text(value, fontSize = 15.sp, fontWeight = FontWeight.ExtraBold, color = TextPrimary, maxLines = 1, overflow = TextOverflow.Ellipsis)
            }
        }
    }
}

@Composable
private fun AchievementCell(label: String, value: String, icon: ImageVector, tint: Color, wash: Color, modifier: Modifier = Modifier) {
    Column(
        modifier = modifier.clip(RoundedCornerShape(16.dp)).background(wash.copy(alpha = 0.55f)).padding(vertical = 12.dp, horizontal = 6.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Icon(icon, contentDescription = null, tint = tint, modifier = Modifier.size(20.dp))
        Spacer(Modifier.height(6.dp))
        Text(value, fontSize = 16.sp, fontWeight = FontWeight.ExtraBold, color = TextPrimary, maxLines = 1)
        Text(label, fontSize = 10.sp, color = TextSecondary, maxLines = 2, overflow = TextOverflow.Ellipsis, lineHeight = 13.sp, textAlign = androidx.compose.ui.text.style.TextAlign.Center)
    }
}

@Composable
private fun SectionLabel(text: String) {
    Text(text, fontSize = 11.sp, fontWeight = FontWeight.ExtraBold, color = TextMuted, letterSpacing = 0.8.sp, modifier = Modifier.padding(start = 4.dp, top = 4.dp))
}

@Composable
private fun FeatureRow(
    icon: ImageVector,
    tint: Color,
    wash: Color,
    title: String,
    subtitle: String,
    onClick: () -> Unit,
    badge: String? = null
) {
    Row(
        modifier = Modifier.fillMaxWidth().clickable { onClick() }.padding(horizontal = 14.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(Modifier.size(42.dp).clip(RoundedCornerShape(13.dp)).background(wash), contentAlignment = Alignment.Center) {
            Icon(icon, contentDescription = null, tint = tint, modifier = Modifier.size(22.dp))
        }
        Spacer(Modifier.width(12.dp))
        Column(Modifier.weight(1f)) {
            Text(title, fontSize = 14.sp, fontWeight = FontWeight.Bold, color = TextPrimary, maxLines = 1, overflow = TextOverflow.Ellipsis)
            if (subtitle.isNotBlank()) Text(subtitle, fontSize = 12.sp, color = TextSecondary, maxLines = 1, overflow = TextOverflow.Ellipsis)
        }
        if (badge != null) {
            Box(Modifier.clip(RoundedCornerShape(50)).background(wash).padding(horizontal = 10.dp, vertical = 4.dp)) {
                Text(badge, fontSize = 11.sp, fontWeight = FontWeight.Bold, color = tint)
            }
            Spacer(Modifier.width(6.dp))
        }
        Icon(Icons.Default.ChevronRight, contentDescription = null, tint = TextMuted)
    }
}

@Composable
private fun MenuGroup(content: @Composable ColumnScope.() -> Unit) {
    SqCard(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(22.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
    ) { Column(content = content) }
}

private fun formatThousands(value: Long): String =
    java.text.NumberFormat.getInstance(java.util.Locale("vi", "VN")).format(value)

private fun formatRadiusShort(km: Double): String = if (km < 1) "${(km * 1000).toInt()} m" else "%.1f km".format(km)

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
        modifier = Modifier.fillMaxWidth().clickable { onClick() }.padding(horizontal = 16.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(imageVector = icon, contentDescription = null, tint = ForestGreenPrimary, modifier = Modifier.size(22.dp))
        Spacer(modifier = Modifier.width(14.dp))
        Column(modifier = Modifier.weight(1f)) {
            Text(text = title, fontSize = 14.sp, fontWeight = FontWeight.SemiBold, color = TextPrimary)
            if (subtitle.isNotBlank()) Text(text = subtitle, fontSize = 12.sp, color = TextMuted)
        }
        Icon(imageVector = Icons.Default.ChevronRight, contentDescription = null, tint = TextMuted)
    }
}
