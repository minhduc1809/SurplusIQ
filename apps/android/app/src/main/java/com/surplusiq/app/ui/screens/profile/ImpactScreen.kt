package com.surplusiq.app.ui.screens.profile

import androidx.compose.foundation.background
import com.surplusiq.app.ui.components.SqCard
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.CloudQueue
import androidx.compose.material.icons.filled.Eco
import androidx.compose.material.icons.filled.Savings
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.surplusiq.app.data.remote.dto.CustomerImpactBadgesResponse
import com.surplusiq.app.data.remote.dto.CustomerImpactDto
import com.surplusiq.app.data.remote.dto.ImpactBadgeDto
import com.surplusiq.app.ui.theme.AmberAccent
import com.surplusiq.app.ui.theme.CoralRed
import com.surplusiq.app.ui.theme.ForestGreenPrimary
import com.surplusiq.app.ui.theme.TextMuted
import com.surplusiq.app.ui.theme.TextPrimary
import com.surplusiq.app.ui.theme.TextSecondary

/** Thành tích sống xanh: thống kê tác động cá nhân + huy hiệu (R1-076, R1-081). */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ImpactScreen(
    impact: CustomerImpactDto?,
    isImpactLoading: Boolean,
    impactError: String?,
    badges: CustomerImpactBadgesResponse?,
    isBadgesLoading: Boolean,
    badgesError: String?,
    onBackClick: () -> Unit,
    onRetry: () -> Unit,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
    ) {
        TopAppBar(
            title = { Text("Thành tích sống xanh", fontWeight = FontWeight.Bold, fontSize = 17.sp) },
            navigationIcon = {
                IconButton(onClick = onBackClick) {
                    Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Quay lại")
                }
            }
        )

        when {
            isImpactLoading || isBadgesLoading -> {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = ForestGreenPrimary)
                }
            }
            impactError != null || impact == null -> {
                Column(
                    modifier = Modifier.fillMaxSize().padding(24.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.Center
                ) {
                    Text(impactError ?: "Không thể tải thống kê tác động", color = CoralRed, fontSize = 14.sp)
                    Spacer(modifier = Modifier.height(12.dp))
                    Button(onClick = onRetry) { Text("Thử lại") }
                }
            }
            else -> {
                Column(modifier = Modifier.padding(16.dp)) {
                    SqCard(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(16.dp),
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp)
                    ) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Text(
                                "${impact.totalOrders} đơn hàng đã giải cứu",
                                fontSize = 15.sp,
                                fontWeight = FontWeight.Bold,
                                color = TextPrimary
                            )
                            Spacer(modifier = Modifier.height(14.dp))
                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                ImpactStatItem(
                                    label = "Thực phẩm cứu",
                                    value = "${impact.totalFoodSavedKg} kg",
                                    icon = Icons.Default.Eco,
                                    color = ForestGreenPrimary
                                )
                                ImpactStatItem(
                                    label = "Đơn giải cứu",
                                    value = "${impact.totalOrders}",
                                    icon = Icons.Default.CloudQueue,
                                    color = Color(0xFF3B82F6)
                                )
                                ImpactStatItem(
                                    label = "Tiền tiết kiệm",
                                    value = "${impact.totalSavingsVnd.toString().reversed().chunked(3).joinToString(".").reversed()} ₫",
                                    icon = Icons.Default.Savings,
                                    color = AmberAccent
                                )
                            }
                        }
                    }

                    if (badges != null) {
                        Spacer(modifier = Modifier.height(16.dp))
                        Text(
                            "Huy hiệu (${badges.unlockedCount}/${badges.totalBadges}) • ${badges.currentBadgeTitle ?: "Chưa mở huy hiệu nào"}",
                            fontWeight = FontWeight.Bold,
                            fontSize = 14.sp,
                            color = TextPrimary
                        )
                        badges.nextBadge?.let {
                            Text("Tiếp theo: ${it.name} (${it.progress}%)", fontSize = 12.sp, color = TextSecondary)
                        }
                        if (impact.totalOrders > 0) {
                            val context = androidx.compose.ui.platform.LocalContext.current
                            Spacer(modifier = Modifier.height(8.dp))
                            OutlinedButton(
                                onClick = {
                                    // Chỉ chia sẻ số tổng hợp, không kèm tên, đơn hàng hay vị trí (R1-081).
                                    val card = badges.shareCard
                                    com.surplusiq.app.ui.util.shareText(
                                        context,
                                        listOf(card.title, card.statLine, card.hashtag, card.shareUrl).joinToString("\n"),
                                        "Chia sẻ thành tích"
                                    )
                                },
                                modifier = Modifier.fillMaxWidth()
                            ) { Text("Chia sẻ thành tích", color = ForestGreenPrimary) }
                        }
                        Spacer(modifier = Modifier.height(10.dp))
                        LazyVerticalGrid(
                            columns = GridCells.Fixed(2),
                            horizontalArrangement = Arrangement.spacedBy(10.dp),
                            verticalArrangement = Arrangement.spacedBy(10.dp),
                            modifier = Modifier.heightIn(max = 600.dp)
                        ) {
                            items(badges.badges) { badge -> BadgeCard(badge) }
                        }
                    } else if (badgesError != null) {
                        Spacer(modifier = Modifier.height(16.dp))
                        Text(badgesError, fontSize = 12.sp, color = CoralRed)
                    }
                }
            }
        }
    }
}

@Composable
private fun ImpactStatItem(label: String, value: String, icon: androidx.compose.ui.graphics.vector.ImageVector, color: Color) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Icon(imageVector = icon, contentDescription = null, tint = color, modifier = Modifier.size(22.dp))
        Spacer(modifier = Modifier.height(6.dp))
        Text(text = value, fontSize = 13.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
        Text(text = label, fontSize = 11.sp, color = TextSecondary)
    }
}

@Composable
private fun BadgeCard(badge: ImpactBadgeDto) {
    SqCard(
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(
            containerColor = if (badge.isUnlocked)
                ForestGreenPrimary.copy(alpha = 0.08f)
            else
                MaterialTheme.colorScheme.surface
        )
    ) {
        Column(
            modifier = Modifier.fillMaxWidth().padding(12.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(badge.icon, fontSize = 28.sp)
            Spacer(modifier = Modifier.height(6.dp))
            Text(badge.name, fontSize = 12.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
            Text(badge.description, fontSize = 10.sp, color = TextMuted)
            Spacer(modifier = Modifier.height(6.dp))
            LinearProgressIndicator(
                progress = { badge.progress / 100f },
                modifier = Modifier.fillMaxWidth(),
                color = if (badge.isUnlocked) ForestGreenPrimary else TextMuted
            )
        }
    }
}
