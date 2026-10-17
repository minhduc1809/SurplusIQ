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
import com.surplusiq.app.ui.theme.ForestGreenDark
import com.surplusiq.app.ui.theme.ForestGreenPrimary
import com.surplusiq.app.ui.theme.TextMuted
import com.surplusiq.app.ui.theme.TextPrimary
import com.surplusiq.app.ui.theme.TextSecondary

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProfileScreen(
    userName: String = "Trần Minh Đức",
    userPhone: String = "0901234567",
    stats: UserImpactStats = UserImpactStats(),
    onOpenAiChat: () -> Unit,
    onOpenMyOrders: () -> Unit = {},
    onLogout: () -> Unit = {},
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
    ) {
        TopAppBar(
            title = {
                Text(
                    text = "Me",
                    fontWeight = FontWeight.Bold,
                    fontSize = 18.sp
                )
            },
            colors = TopAppBarDefaults.topAppBarColors(
                containerColor = MaterialTheme.colorScheme.surface
            )
        )

        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(16.dp)
        ) {
            // User Header Info (R1-005)
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Box(
                    modifier = Modifier
                        .size(64.dp)
                        .clip(CircleShape)
                        .background(ForestGreenPrimary.copy(alpha = 0.15f)),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.Default.Person,
                        contentDescription = "Avatar",
                        tint = ForestGreenPrimary,
                        modifier = Modifier.size(36.dp)
                    )
                }

                Spacer(modifier = Modifier.width(16.dp))

                Column {
                    Text(
                        text = userName,
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Bold,
                        color = TextPrimary
                    )
                    Text(
                        text = userPhone,
                        fontSize = 13.sp,
                        color = TextSecondary
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(6.dp))
                            .background(ForestGreenPrimary.copy(alpha = 0.1f))
                            .padding(horizontal = 8.dp, vertical = 2.dp)
                    ) {
                        Text(
                            text = "Khách hàng thân thiết • 0 lần vi phạm",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = ForestGreenPrimary
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Impact Stats Card (R1-076, R1-081)
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "Thành tích sống xanh",
                            fontSize = 15.sp,
                            fontWeight = FontWeight.Bold,
                            color = TextPrimary
                        )
                        Icon(
                            imageVector = Icons.Default.Share,
                            contentDescription = "Chia sẻ",
                            tint = ForestGreenPrimary,
                            modifier = Modifier.size(18.dp)
                        )
                    }

                    Spacer(modifier = Modifier.height(14.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        ImpactMetricItem(
                            label = "Thực phẩm cứu",
                            value = "${stats.totalRescuedKg} kg",
                            icon = Icons.Default.Eco,
                            color = ForestGreenPrimary
                        )
                        ImpactMetricItem(
                            label = "Giảm phát thải",
                            value = "${stats.totalReducedCo2Kg} kg CO2",
                            icon = Icons.Default.CloudQueue,
                            color = Color(0xFF3B82F6)
                        )
                        ImpactMetricItem(
                            label = "Tiền tiết kiệm",
                            value = "4.82 tr ₫",
                            icon = Icons.Default.Savings,
                            color = AmberAccent
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(20.dp))

            // Menu Items List
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
            ) {
                Column {
                    ProfileMenuItem(
                        icon = Icons.Default.ReceiptLong,
                        title = "Đơn hàng của tôi",
                        subtitle = "Lịch sử mua & vé nhận hàng",
                        onClick = onOpenMyOrders
                    )
                    Divider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.15f))
                    ProfileMenuItem(
                        icon = Icons.Default.AccountBalanceWallet,
                        title = "Ví ưu đãi & Voucher",
                        subtitle = "Mã giảm giá từ các tiệm yêu thích",
                        onClick = {}
                    )
                    Divider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.15f))
                    ProfileMenuItem(
                        icon = Icons.Default.RestaurantMenu,
                        title = "Hồ sơ ăn uống & Dị ứng",
                        subtitle = "Khai báo dị ứng để cảnh báo món",
                        onClick = {}
                    )
                    Divider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.15f))
                    ProfileMenuItem(
                        icon = Icons.Default.AutoAwesome,
                        title = "Trợ lý AI Cứu Món",
                        subtitle = "Hỏi đáp deal, dinh dưỡng & thành phần",
                        onClick = onOpenAiChat
                    )
                    Divider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.15f))
                    ProfileMenuItem(
                        icon = Icons.Default.Logout,
                        title = "Đăng xuất",
                        subtitle = "Thu hồi phiên đăng nhập",
                        onClick = onLogout
                    )
                }
            }
        }
    }
}

@Composable
fun ImpactMetricItem(
    label: String,
    value: String,
    icon: ImageVector,
    color: Color
) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Box(
            modifier = Modifier
                .size(40.dp)
                .clip(CircleShape)
                .background(color.copy(alpha = 0.12f)),
            contentAlignment = Alignment.Center
        ) {
            Icon(imageVector = icon, contentDescription = null, tint = color, modifier = Modifier.size(20.dp))
        }
        Spacer(modifier = Modifier.height(6.dp))
        Text(text = value, fontSize = 14.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
        Text(text = label, fontSize = 11.sp, color = TextSecondary)
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
            .padding(horizontal = 16.dp, vertical = 14.dp),
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
            Text(text = subtitle, fontSize = 12.sp, color = TextMuted)
        }
        Icon(
            imageVector = Icons.Default.ChevronRight,
            contentDescription = null,
            tint = TextMuted
        )
    }
}
