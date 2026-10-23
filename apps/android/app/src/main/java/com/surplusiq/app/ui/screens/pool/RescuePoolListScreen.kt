package com.surplusiq.app.ui.screens.pool

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.surplusiq.app.domain.model.RescuePool
import com.surplusiq.app.ui.screens.basket.BasketFrame
import com.surplusiq.app.ui.screens.basket.MutedText
import com.surplusiq.app.ui.screens.basket.WIDE_MAX_WIDTH
import com.surplusiq.app.ui.theme.CoralRed
import com.surplusiq.app.ui.theme.DividerColor
import com.surplusiq.app.ui.theme.SkyBlueContainer
import com.surplusiq.app.ui.theme.SkyBluePrimary
import com.surplusiq.app.ui.theme.TextMuted
import com.surplusiq.app.ui.theme.TextPrimary
import com.surplusiq.app.ui.theme.TextSecondary
import com.surplusiq.app.ui.viewmodel.RescuePoolUiState

private enum class PoolFilter(val label: String) {
    ALL("Tất cả"), OPEN("Đang mở"), OFFER("Có đề nghị"), JOINED("Đã tham gia")
}

/** Mua chung theo đợt (CM-C02): đợt đang mở và đợt mình đã tham gia. Điện thoại một cột, màn rộng tự chia lưới nhiều cột. */
@Composable
fun RescuePoolListScreen(
    state: RescuePoolUiState,
    onBackClick: () -> Unit,
    onSearch: (String) -> Unit,
    onPoolClick: (RescuePool) -> Unit,
    modifier: Modifier = Modifier
) {
    var area by remember { mutableStateOf("") }
    var filter by remember { mutableStateOf(PoolFilter.ALL) }
    val shown = remember(state.pools, filter) {
        state.pools.filter {
            when (filter) {
                PoolFilter.ALL -> true
                PoolFilter.OPEN -> it.status == "OPEN"
                PoolFilter.OFFER -> it.offer != null
                PoolFilter.JOINED -> it.myRegistration != null
            }
        }
    }

    BasketFrame(title = "Mua chung theo đợt", subtitle = "Đăng ký nhu cầu, không phải đơn hàng và không thu tiền", onBack = onBackClick, modifier = modifier) { inner ->
        Column(Modifier.padding(inner).fillMaxSize(), horizontalAlignment = Alignment.CenterHorizontally) {
            Column(Modifier.widthIn(max = WIDE_MAX_WIDTH).fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp)) {
                OutlinedTextField(
                    value = area,
                    onValueChange = { area = it },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                    shape = RoundedCornerShape(16.dp),
                    placeholder = { Text("Tìm khu vực, ví dụ Cầu Giấy") },
                    leadingIcon = { Icon(Icons.Default.Search, contentDescription = null, tint = TextMuted) },
                    keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
                    keyboardActions = KeyboardActions(onSearch = { onSearch(area) })
                )
                Spacer(Modifier.height(10.dp))
                LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    items(PoolFilter.values().toList()) { f ->
                        val on = f == filter
                        Text(
                            f.label,
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Bold,
                            color = if (on) androidx.compose.ui.graphics.Color.White else TextPrimary,
                            modifier = Modifier.clip(RoundedCornerShape(50)).background(if (on) SkyBluePrimary else SkyBlueContainer)
                                .clickable { filter = f }.padding(horizontal = 14.dp, vertical = 8.dp)
                        )
                    }
                }
            }

            when {
                state.isListLoading && state.pools.isEmpty() -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator(color = SkyBluePrimary) }
                state.listError != null && state.pools.isEmpty() -> Column(Modifier.fillMaxSize().padding(24.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
                    Text(state.listError, color = CoralRed, fontSize = 14.sp)
                    TextButton(onClick = { onSearch(area) }) { Text("Thử lại", color = SkyBluePrimary) }
                }
                shown.isEmpty() -> Column(Modifier.fillMaxSize().padding(32.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
                    Text("Chưa có đợt phù hợp", fontWeight = FontWeight.Bold, fontSize = 16.sp, color = TextPrimary)
                    MutedText("Thử bỏ bộ lọc hoặc tìm khu vực khác.")
                }
                else -> LazyVerticalGrid(
                    columns = GridCells.Adaptive(340.dp),
                    modifier = Modifier.widthIn(max = WIDE_MAX_WIDTH).fillMaxSize(),
                    contentPadding = PaddingValues(16.dp),
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    items(shown, key = { it.id }) { pool -> PoolCard(pool, onClick = { onPoolClick(pool) }) }
                }
            }
        }
    }
}

@Composable
private fun PoolCard(pool: RescuePool, onClick: () -> Unit) {
    val reg = pool.myRegistration
    Column(
        Modifier.fillMaxWidth().clip(RoundedCornerShape(20.dp)).background(MaterialTheme.colorScheme.surface)
            .border(1.dp, DividerColor, RoundedCornerShape(20.dp)).clickable(onClick = onClick).padding(14.dp)
    ) {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
            PoolStatusChip(pool.status)
            Text("Đóng ${formatPoolTime(pool.registrationCloseAt)}", fontSize = 11.sp, color = TextSecondary, maxLines = 1)
        }
        Spacer(Modifier.height(10.dp))
        Row(verticalAlignment = Alignment.Top) {
            PoolImage(pool.imageUrl, Modifier.size(84.dp), corner = 14.dp, description = pool.title)
            Spacer(Modifier.width(12.dp))
            Column(Modifier.weight(1f)) {
                Text(pool.title, fontWeight = FontWeight.ExtraBold, fontSize = 15.sp, color = TextPrimary, maxLines = 2, overflow = TextOverflow.Ellipsis)
                Text("${pool.storeName} · ${pool.serviceArea}", fontSize = 12.sp, color = TextSecondary, maxLines = 2, overflow = TextOverflow.Ellipsis, modifier = Modifier.padding(top = 2.dp))
                if (pool.targetBudgetMin != null || pool.targetBudgetMax != null) {
                    Text(
                        "${formatVnd(pool.targetBudgetMin)} – ${formatVnd(pool.targetBudgetMax)} / suất",
                        fontSize = 14.sp, fontWeight = FontWeight.ExtraBold, color = SkyBluePrimary, modifier = Modifier.padding(top = 6.dp), maxLines = 1
                    )
                }
            }
        }
        Spacer(Modifier.height(12.dp))
        DemandProgress(pool.expectedQuantity, pool.minimumDemand, pool.maximumSupply)
        Spacer(Modifier.height(12.dp))
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
            if (reg != null) RegistrationStatusChip(reg.status) else Text("Chưa đăng ký", fontSize = 12.sp, color = TextSecondary)
            Text(
                if (pool.offer?.canConfirm == true) "Xem đề nghị" else if (reg != null) "Xem đợt" else "Tham gia",
                fontSize = 13.sp, fontWeight = FontWeight.Bold, color = androidx.compose.ui.graphics.Color.White,
                modifier = Modifier.clip(RoundedCornerShape(50)).background(SkyBluePrimary).padding(horizontal = 16.dp, vertical = 8.dp)
            )
        }
    }
}
