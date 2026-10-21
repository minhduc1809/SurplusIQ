package com.surplusiq.app.ui.screens.pool

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.automirrored.filled.EventNote
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.surplusiq.app.domain.model.RescuePool
import com.surplusiq.app.ui.theme.CoralRed
import com.surplusiq.app.ui.theme.ForestGreenPrimary
import com.surplusiq.app.ui.theme.InfoOnLight
import com.surplusiq.app.ui.theme.MintDeep
import com.surplusiq.app.ui.theme.SkyInfoWash
import com.surplusiq.app.ui.theme.SurfaceSubtle
import com.surplusiq.app.ui.theme.TextMuted
import com.surplusiq.app.ui.theme.TextPrimary
import com.surplusiq.app.ui.theme.TextSecondary
import com.surplusiq.app.ui.theme.WarningOnLight
import com.surplusiq.app.ui.viewmodel.RescuePoolUiState
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter

/** Rescue Pool (CM-C02): danh sách đợt đang mở + đợt mình đã tham gia. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RescuePoolListScreen(
    state: RescuePoolUiState,
    onBackClick: () -> Unit,
    onSearch: (String) -> Unit,
    onPoolClick: (RescuePool) -> Unit,
    modifier: Modifier = Modifier
) {
    var area by remember { mutableStateOf("") }

    Column(modifier = modifier.fillMaxSize().background(MaterialTheme.colorScheme.background)) {
        TopAppBar(
            title = { Text("Rescue Pool - Đăng ký nhu cầu", fontWeight = FontWeight.Bold, fontSize = 17.sp) },
            navigationIcon = {
                IconButton(onClick = onBackClick) { Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Quay lại") }
            }
        )
        Text(
            "Đăng ký nhu cầu giúp cửa hàng biết bạn cần gì. Đăng ký KHÔNG phải đơn hàng và không thu tiền.",
            modifier = Modifier.padding(horizontal = 16.dp),
            fontSize = 13.sp,
            color = TextSecondary
        )
        Row(
            modifier = Modifier.fillMaxWidth().padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            OutlinedTextField(
                value = area,
                onValueChange = { area = it },
                modifier = Modifier.weight(1f),
                singleLine = true,
                placeholder = { Text("Lọc theo khu vực (vd. Cầu Giấy)") }
            )
            Spacer(Modifier.width(8.dp))
            IconButton(onClick = { onSearch(area) }) {
                Icon(Icons.Default.Search, contentDescription = "Tìm theo khu vực", tint = ForestGreenPrimary)
            }
        }

        when {
            state.isListLoading && state.pools.isEmpty() -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = ForestGreenPrimary)
            }
            state.listError != null && state.pools.isEmpty() -> Column(
                Modifier.fillMaxSize().padding(24.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center
            ) {
                Text(state.listError, color = CoralRed, fontSize = 14.sp)
                Spacer(Modifier.height(12.dp))
                Button(onClick = { onSearch(area) }) { Text("Thử lại") }
            }
            state.pools.isEmpty() -> Text(
                "Chưa có đợt nào đang mở đăng ký quanh bạn.",
                modifier = Modifier.padding(16.dp),
                color = TextSecondary
            )
            else -> LazyColumn(
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                items(state.pools, key = { it.id }) { pool -> PoolCard(pool, onClick = { onPoolClick(pool) }) }
            }
        }
    }
}

@Composable
private fun PoolCard(pool: RescuePool, onClick: () -> Unit) {
    Card(
        modifier = Modifier.fillMaxWidth().clickable(onClick = onClick),
        shape = RoundedCornerShape(14.dp)
    ) {
        Column(Modifier.padding(14.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    pool.title,
                    modifier = Modifier.weight(1f),
                    fontWeight = FontWeight.Bold,
                    fontSize = 15.sp,
                    color = TextPrimary
                )
                PoolStatusChip(pool.status)
            }
            Text("${pool.storeName} · ${pool.serviceArea}", fontSize = 13.sp, color = TextSecondary)
            Spacer(Modifier.height(6.dp))
            Text(
                "Nhóm món: ${pool.targetCategory} · Đóng đăng ký ${formatPoolTime(pool.registrationCloseAt)}",
                fontSize = 12.sp,
                color = TextMuted
            )
            Text(
                "Nhu cầu dự kiến ${pool.expectedQuantity}/${pool.minimumDemand} suất (ngưỡng mở đợt) · tối đa ${pool.maximumSupply}",
                fontSize = 12.sp,
                color = TextMuted
            )
            pool.myRegistration?.let {
                Spacer(Modifier.height(8.dp))
                RegistrationStatusChip(it.status)
            }
        }
    }
}

// ───────────── Dùng chung với RescuePoolDetailScreen ─────────────

private val poolTimeFormat = DateTimeFormatter.ofPattern("HH:mm dd/MM")

internal fun parsePoolInstant(iso: String?): Instant? = iso?.let { runCatching { Instant.parse(it) }.getOrNull() }

internal fun formatPoolTime(iso: String?): String =
    parsePoolInstant(iso)?.atZone(ZoneId.systemDefault())?.format(poolTimeFormat) ?: "—"

internal fun formatVnd(amount: Int?): String =
    amount?.let { "%,dđ".format(it).replace(',', '.') } ?: "—"

internal fun poolStatusLabel(status: String): String = when (status) {
    "OPEN" -> "Mở đăng ký"
    "AGGREGATING" -> "Đang tổng hợp"
    "PENDING_STORE" -> "Chờ cửa hàng"
    "OFFER_PUBLISHED" -> "Có đề nghị cung ứng"
    "ORDERING_OPEN" -> "Mở đặt hàng"
    "COMPLETED" -> "Đã kết thúc"
    "INSUFFICIENT" -> "Không đủ điều kiện"
    "CANCELLED" -> "Cửa hàng đã hủy"
    "EXPIRED" -> "Hết hạn"
    else -> status
}

@Composable
internal fun PoolStatusChip(status: String) {
    val (bg, fg) = when (status) {
        "OPEN", "AGGREGATING", "PENDING_STORE" -> SkyInfoWash to InfoOnLight
        "OFFER_PUBLISHED", "ORDERING_OPEN" -> Color(0xFFFFF1C9) to WarningOnLight
        "COMPLETED" -> SurfaceSubtle to TextSecondary
        else -> SurfaceSubtle to TextMuted
    }
    Text(
        poolStatusLabel(status),
        modifier = Modifier.background(bg, RoundedCornerShape(50)).padding(horizontal = 10.dp, vertical = 4.dp),
        color = fg,
        fontSize = 11.sp,
        fontWeight = FontWeight.SemiBold
    )
}

/**
 * BR-C02-03: "Đã đăng ký nhu cầu" (viền, nền nhạt, icon sổ ghi) khác hẳn "Đã đặt hàng"
 * (nền xanh đặc, chữ trắng, icon tích) - phân biệt bằng màu + icon + chữ, không chỉ bằng chữ.
 */
@Composable
internal fun RegistrationStatusChip(status: String) {
    when (status) {
        "ORDERED" -> Row(
            Modifier.background(MintDeep, RoundedCornerShape(50)).padding(horizontal = 10.dp, vertical = 5.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(Icons.Default.CheckCircle, contentDescription = null, tint = Color.White, modifier = Modifier.size(14.dp))
            Spacer(Modifier.width(4.dp))
            Text("ĐÃ ĐẶT HÀNG · đơn chính thức", color = Color.White, fontSize = 11.sp, fontWeight = FontWeight.Bold)
        }
        "ACTIVE" -> Row(
            Modifier.background(SkyInfoWash, RoundedCornerShape(50)).padding(horizontal = 10.dp, vertical = 5.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(Icons.AutoMirrored.Filled.EventNote, contentDescription = null, tint = InfoOnLight, modifier = Modifier.size(14.dp))
            Spacer(Modifier.width(4.dp))
            Text("ĐÃ ĐĂNG KÝ NHU CẦU · chưa phải đơn", color = InfoOnLight, fontSize = 11.sp, fontWeight = FontWeight.Bold)
        }
        else -> Text(
            if (status == "WITHDRAWN") "Đã rút nhu cầu" else "Đăng ký đã đóng",
            modifier = Modifier.background(SurfaceSubtle, RoundedCornerShape(50)).padding(horizontal = 10.dp, vertical = 5.dp),
            color = TextMuted,
            fontSize = 11.sp
        )
    }
}
