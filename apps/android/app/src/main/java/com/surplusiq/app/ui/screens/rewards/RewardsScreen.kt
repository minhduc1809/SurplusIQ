package com.surplusiq.app.ui.screens.rewards

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Remove
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.ExpandLess
import androidx.compose.material.icons.filled.ExpandMore
import androidx.compose.material.icons.filled.Stars
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.surplusiq.app.domain.model.RewardCatalogItem
import com.surplusiq.app.domain.model.RewardHistoryEntry
import com.surplusiq.app.ui.theme.AmberAccent
import com.surplusiq.app.ui.theme.CoralRed
import com.surplusiq.app.ui.theme.ForestGreenPrimary
import com.surplusiq.app.ui.theme.TextMuted
import com.surplusiq.app.ui.theme.TextPrimary
import com.surplusiq.app.ui.theme.TextSecondary
import com.surplusiq.app.ui.util.formatDateTime
import com.surplusiq.app.ui.util.formatVnd
import com.surplusiq.app.ui.viewmodel.RewardsUiState

private val ENTRY_LABELS = mapOf(
    "EARN" to "Cộng điểm", "REDEEM" to "Đổi điểm", "REVERSAL" to "Hoàn tác điểm",
    "ADJUST" to "Điều chỉnh", "EXPIRE" to "Điểm hết hạn"
)

/** Rescue Rewards (CM-C04): số dư, đổi điểm lấy voucher (KC13), quy tắc chương trình (KC14), lịch sử bút toán (KC12). */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RewardsScreen(
    state: RewardsUiState,
    onBackClick: () -> Unit,
    onRetry: () -> Unit,
    onOpenRedeem: () -> Unit = {},
    onOpenRules: () -> Unit = {},
    onRedeem: (String) -> Unit = {},
    modifier: Modifier = Modifier
) {
    var showRedeem by remember { mutableStateOf(false) }
    var showRules by remember { mutableStateOf(false) }

    Column(modifier = modifier.fillMaxSize().background(MaterialTheme.colorScheme.background)) {
        TopAppBar(
            title = { Text("Điểm thưởng", fontWeight = FontWeight.Bold, fontSize = 17.sp) },
            navigationIcon = { IconButton(onClick = onBackClick) { Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Quay lại") } }
        )

        when {
            state.isLoading -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator(color = ForestGreenPrimary) }
            state.errorMessage != null -> Column(
                Modifier.fillMaxSize().padding(24.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center
            ) {
                Text(state.errorMessage, color = CoralRed, fontSize = 14.sp)
                Spacer(Modifier.height(12.dp))
                Button(onClick = onRetry) { Text("Thử lại") }
            }
            else -> LazyColumn(
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                item {
                    PointsHero(
                        balance = state.pointsBalance,
                        onRedeem = { onOpenRedeem(); showRedeem = true },
                        onRules = { onOpenRules(); showRules = true }
                    )
                }
                state.redeemMessage?.let { item { Text(it, fontSize = 13.sp, color = ForestGreenPrimary) } }
                item { Text("Lịch sử điểm", fontWeight = FontWeight.ExtraBold, fontSize = 16.sp, color = TextPrimary, modifier = Modifier.padding(top = 6.dp)) }
                if (state.history.isEmpty()) {
                    item { Text("Chưa có bút toán điểm thưởng nào. Điểm được cộng sau khi bạn nhận món thành công.", color = TextSecondary, fontSize = 13.sp) }
                } else {
                    items(state.history, key = { it.id }) { RewardHistoryRow(it) }
                }
            }
        }
    }

    if (showRedeem) {
        ModalBottomSheet(onDismissRequest = { showRedeem = false }) {
            RedeemSheet(state, onRedeem = onRedeem)
        }
    }
    if (showRules) {
        ModalBottomSheet(onDismissRequest = { showRules = false }) {
            RulesSheet(state)
        }
    }
}

@Composable
private fun RedeemSheet(state: RewardsUiState, onRedeem: (String) -> Unit) {
    var confirm by remember { mutableStateOf<RewardCatalogItem?>(null) }
    val catalog = state.catalog
    Column(Modifier.padding(horizontal = 20.dp).padding(bottom = 28.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Text("Đổi điểm lấy voucher", fontWeight = FontWeight.Bold, fontSize = 17.sp)
        when {
            catalog == null && state.catalogError != null -> Text(state.catalogError, color = CoralRed, fontSize = 13.sp)
            catalog == null -> Box(Modifier.fillMaxWidth().height(80.dp), contentAlignment = Alignment.Center) { CircularProgressIndicator(color = ForestGreenPrimary) }
            else -> {
                Text(
                    "Bạn có ${catalog.pointsBalance} điểm. Đã đổi ${catalog.redeemedToday}/${catalog.dailyLimit} lượt hôm nay.",
                    fontSize = 13.sp, color = TextSecondary
                )
                catalog.items.forEach { item ->
                    Card(shape = RoundedCornerShape(12.dp), modifier = Modifier.fillMaxWidth()) {
                        Row(Modifier.padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
                            Column(Modifier.weight(1f)) {
                                Text(item.name, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                                Text("Đơn từ ${formatVnd(item.minOrderVnd)} • HSD ${item.validDays} ngày • dùng ở mọi cửa hàng", fontSize = 11.sp, color = TextMuted)
                                if (!item.canRedeem && item.shortfall > 0) Text("Cần thêm ${item.shortfall} điểm", fontSize = 11.sp, color = CoralRed)
                            }
                            Button(
                                onClick = { confirm = item },
                                enabled = item.canRedeem && !state.isRedeeming,
                                colors = ButtonDefaults.buttonColors(containerColor = ForestGreenPrimary)
                            ) { Text("${item.points} điểm") }
                        }
                    }
                }
            }
        }
        state.redeemMessage?.let { Text(it, fontSize = 13.sp, color = ForestGreenPrimary) }
    }

    confirm?.let { item ->
        val balance = catalog?.pointsBalance ?: 0
        AlertDialog(
            onDismissRequest = { confirm = null },
            title = { Text("Đổi ${item.points} điểm?") },
            text = {
                Column {
                    Text(item.name, fontWeight = FontWeight.Bold)
                    Spacer(Modifier.height(6.dp))
                    Text("Số dư: $balance → ${balance - item.points} điểm", fontSize = 13.sp)
                    Text("Voucher vào Ví ưu đãi, dùng một lần, không hoàn điểm khi đã dùng.", fontSize = 12.sp, color = TextSecondary)
                }
            },
            confirmButton = { TextButton(onClick = { onRedeem(item.id); confirm = null }) { Text("Xác nhận đổi") } },
            dismissButton = { TextButton(onClick = { confirm = null }) { Text("Hủy") } }
        )
    }
}

@Composable
private fun RulesSheet(state: RewardsUiState) {
    Column(Modifier.padding(horizontal = 20.dp).padding(bottom = 28.dp).verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(6.dp)) {
        Text("Quy tắc chương trình điểm", fontWeight = FontWeight.Bold, fontSize = 17.sp)
        when {
            state.rules.isEmpty() && state.rulesError != null -> Text(state.rulesError, color = CoralRed, fontSize = 13.sp)
            state.rules.isEmpty() -> Box(Modifier.fillMaxWidth().height(80.dp), contentAlignment = Alignment.Center) { CircularProgressIndicator(color = ForestGreenPrimary) }
            else -> state.rules.forEachIndexed { index, section ->
                var open by remember { mutableStateOf(index == 0) }
                Column(Modifier.fillMaxWidth().clickable { open = !open }.padding(vertical = 8.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(section.title, fontWeight = FontWeight.SemiBold, fontSize = 14.sp, modifier = Modifier.weight(1f))
                        Icon(if (open) Icons.Default.ExpandLess else Icons.Default.ExpandMore, contentDescription = null, tint = TextMuted)
                    }
                    if (open) Text(section.body, fontSize = 13.sp, color = TextSecondary, lineHeight = 19.sp, modifier = Modifier.padding(top = 4.dp))
                }
                HorizontalDivider()
            }
        }
    }
}

/** Thẻ điểm nền cam gradient có vệt sóng, số điểm lớn màu trắng; hai nút thao tác nằm ngay dưới số điểm. */
@Composable
private fun PointsHero(balance: Int, onRedeem: () -> Unit, onRules: () -> Unit) {
    Box(
        Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(24.dp))
            .background(Brush.linearGradient(listOf(Color(0xFFFFA866), Color(0xFFFF8A3D), Color(0xFFF2762B))))
    ) {
        Canvas(Modifier.matchParentSize()) {
            for (i in 0..3) {
                val y = size.height * (0.15f + 0.22f * i)
                val wave = Path().apply {
                    moveTo(-20f, y + size.height * 0.1f)
                    cubicTo(size.width * 0.25f, y - size.height * 0.25f, size.width * 0.55f, y + size.height * 0.3f, size.width + 20f, y - size.height * 0.1f)
                }
                drawPath(wave, Color.White.copy(alpha = 0.14f - 0.025f * i), style = Stroke(width = 10f + 8f * i))
            }
        }
        Column(Modifier.padding(22.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(Modifier.size(32.dp).clip(CircleShape).background(Color.White.copy(alpha = 0.25f)), contentAlignment = Alignment.Center) {
                    Icon(Icons.Default.Stars, contentDescription = null, tint = Color.White, modifier = Modifier.size(20.dp))
                }
                Spacer(Modifier.width(10.dp))
                Text("Số dư điểm thưởng", color = Color.White.copy(alpha = 0.92f), fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
            }
            Spacer(Modifier.height(10.dp))
            Row(verticalAlignment = Alignment.Bottom) {
                Text("$balance", color = Color.White, fontSize = 44.sp, fontWeight = FontWeight.ExtraBold)
                Spacer(Modifier.width(6.dp))
                Text("điểm", color = Color.White.copy(alpha = 0.92f), fontSize = 16.sp, fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(bottom = 8.dp))
            }
            Spacer(Modifier.height(16.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                Button(
                    onClick = onRedeem,
                    shape = RoundedCornerShape(16.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = Color.White, contentColor = Color(0xFFF2762B)),
                    modifier = Modifier.weight(1f).height(46.dp)
                ) { Text("Đổi điểm", fontWeight = FontWeight.Bold) }
                Button(
                    onClick = onRules,
                    shape = RoundedCornerShape(16.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = Color.White.copy(alpha = 0.22f), contentColor = Color.White),
                    modifier = Modifier.weight(1f).height(46.dp)
                ) { Text("Quy tắc", fontWeight = FontWeight.Bold) }
            }
        }
    }
}

@Composable
private fun RewardHistoryRow(entry: RewardHistoryEntry) {
    val positive = entry.pointsDelta >= 0
    val tint = if (positive) ForestGreenPrimary else CoralRed
    Surface(shape = RoundedCornerShape(16.dp), color = MaterialTheme.colorScheme.surface, shadowElevation = 1.dp) {
        Row(Modifier.fillMaxWidth().padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
            Box(Modifier.size(40.dp).clip(CircleShape).background(tint.copy(alpha = 0.12f)), contentAlignment = Alignment.Center) {
                Icon(if (positive) Icons.Default.Add else Icons.Default.Remove, contentDescription = null, tint = tint, modifier = Modifier.size(20.dp))
            }
            Spacer(Modifier.width(12.dp))
            Column(Modifier.weight(1f)) {
                Text(ENTRY_LABELS[entry.entryType] ?: entry.entryType, fontSize = 14.sp, fontWeight = FontWeight.SemiBold, color = TextPrimary)
                if (!entry.reason.isNullOrBlank()) Text(entry.reason, fontSize = 12.sp, color = TextSecondary, maxLines = 2)
                Text(formatDateTime(entry.createdAt), fontSize = 11.sp, color = TextMuted)
            }
            Text(
                text = if (positive) "+${entry.pointsDelta}" else "${entry.pointsDelta}",
                fontWeight = FontWeight.ExtraBold,
                fontSize = 16.sp,
                color = tint
            )
        }
    }
}
