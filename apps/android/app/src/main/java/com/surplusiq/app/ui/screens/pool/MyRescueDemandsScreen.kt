package com.surplusiq.app.ui.screens.pool

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.surplusiq.app.domain.model.RescuePool
import com.surplusiq.app.ui.screens.basket.BasketFrame
import com.surplusiq.app.ui.screens.basket.MutedText
import com.surplusiq.app.ui.screens.basket.PrimaryAction
import com.surplusiq.app.ui.screens.basket.WIDE_MAX_WIDTH
import com.surplusiq.app.ui.theme.CoralRed
import com.surplusiq.app.ui.theme.DividerColor
import com.surplusiq.app.ui.theme.SkyBlueContainer
import com.surplusiq.app.ui.theme.SkyBluePrimary
import com.surplusiq.app.ui.theme.SurfaceSubtle
import com.surplusiq.app.ui.theme.TextMuted
import com.surplusiq.app.ui.theme.TextPrimary
import com.surplusiq.app.ui.theme.TextSecondary

/** Nhu cầu của tôi (KC08): nhu cầu đang chờ gom (sửa, rút được) và đơn hàng đã chốt từ đợt gom. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MyRescueDemandsScreen(
    pools: List<RescuePool>,
    isLoading: Boolean,
    errorMessage: String?,
    actionMessage: String?,
    actionError: String?,
    isSubmitting: Boolean,
    onBackClick: () -> Unit,
    onRetry: () -> Unit,
    onOpenPoolDetail: (String) -> Unit,
    onOpenOrderDetail: (String) -> Unit,
    onUpdateDemand: (poolId: String, quantity: Int, budgetMax: Int?, start: String?, end: String?) -> Unit,
    onWithdrawDemand: (poolId: String, reason: String) -> Unit,
    onExplorePoolsClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    var selectedTab by remember { mutableIntStateOf(0) }
    val waiting = remember(pools) { pools.filter { it.myRegistration?.status == "ACTIVE" } }
    val ordered = remember(pools) { pools.filter { it.myRegistration?.let { r -> r.status == "ORDERED" || !r.linkedOrderId.isNullOrBlank() } == true } }
    var poolToEdit by remember { mutableStateOf<RescuePool?>(null) }
    var poolToWithdraw by remember { mutableStateOf<RescuePool?>(null) }

    BasketFrame(title = "Nhu cầu của tôi", subtitle = "Đợt mua chung bạn đã tham gia", onBack = onBackClick, modifier = modifier) { inner ->
        Column(Modifier.padding(inner).fillMaxSize(), horizontalAlignment = Alignment.CenterHorizontally) {
            Column(Modifier.widthIn(max = WIDE_MAX_WIDTH).fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                actionMessage?.let { Notice(it, error = false) }
                actionError?.let { Notice(it, error = true) }
                Row(Modifier.fillMaxWidth().clip(RoundedCornerShape(50)).background(SurfaceSubtle).padding(4.dp)) {
                    TabPill("Đang chờ gom", waiting.size, selectedTab == 0, Modifier.weight(1f)) { selectedTab = 0 }
                    TabPill("Đơn từ đợt gom", ordered.size, selectedTab == 1, Modifier.weight(1f)) { selectedTab = 1 }
                }
            }

            val list = if (selectedTab == 0) waiting else ordered
            when {
                isLoading -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator(color = SkyBluePrimary) }
                errorMessage != null -> Column(Modifier.fillMaxSize().padding(24.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
                    Text(errorMessage, color = CoralRed, fontSize = 14.sp)
                    TextButton(onClick = onRetry) { Text("Thử lại", color = SkyBluePrimary) }
                }
                list.isEmpty() -> Column(Modifier.fillMaxSize().padding(32.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
                    Text(if (selectedTab == 0) "Chưa có nhu cầu đang chờ gom" else "Chưa có đơn từ đợt gom", fontWeight = FontWeight.ExtraBold, fontSize = 17.sp, color = TextPrimary)
                    MutedText(if (selectedTab == 0) "Đăng ký nhu cầu ở một đợt mua chung để theo dõi tại đây." else "Khi đợt đủ nhu cầu và bạn xác nhận đề nghị, đơn sẽ hiện ở đây.")
                    Spacer(Modifier.height(14.dp))
                    PrimaryAction("Xem các đợt mua chung", onClick = onExplorePoolsClick)
                }
                else -> LazyVerticalGrid(
                    columns = GridCells.Adaptive(340.dp),
                    modifier = Modifier.widthIn(max = WIDE_MAX_WIDTH).fillMaxSize(),
                    contentPadding = PaddingValues(16.dp),
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    items(list, key = { it.id }) { pool ->
                        DemandCard(
                            pool = pool,
                            ordered = selectedTab == 1,
                            onOpen = {
                                val orderId = pool.myRegistration?.linkedOrderId
                                if (selectedTab == 1 && !orderId.isNullOrBlank()) onOpenOrderDetail(orderId) else onOpenPoolDetail(pool.id)
                            },
                            onEdit = { poolToEdit = pool },
                            onWithdraw = { poolToWithdraw = pool }
                        )
                    }
                }
            }
        }
    }

    poolToEdit?.let { pool ->
        ModalBottomSheet(onDismissRequest = { poolToEdit = null }, sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)) {
            Column(Modifier.widthIn(max = 640.dp).fillMaxWidth().padding(horizontal = 16.dp).navigationBarsPadding()) {
                Text("Sửa nhu cầu", fontWeight = FontWeight.ExtraBold, fontSize = 20.sp, color = TextPrimary)
                Text(pool.title, fontSize = 13.sp, color = TextSecondary, modifier = Modifier.padding(bottom = 12.dp), maxLines = 1, overflow = TextOverflow.Ellipsis)
                DemandForm(
                    pool = pool,
                    initial = pool.myRegistration,
                    submitLabel = "Lưu cập nhật",
                    isSubmitting = isSubmitting,
                    onSubmit = { qty, budget, start, end ->
                        onUpdateDemand(pool.id, qty, budget, start, end)
                        poolToEdit = null
                    }
                )
                Spacer(Modifier.height(16.dp))
            }
        }
    }

    poolToWithdraw?.let { pool ->
        var reason by remember(pool.id) { mutableStateOf("") }
        AlertDialog(
            onDismissRequest = { poolToWithdraw = null },
            title = { Text("Rút khỏi đợt gom?") },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text("Hủy đăng ký nhu cầu cho \"${pool.title}\".", fontSize = 13.sp)
                    OutlinedTextField(value = reason, onValueChange = { reason = it.take(200) }, label = { Text("Lý do (bắt buộc)") }, modifier = Modifier.fillMaxWidth())
                }
            },
            confirmButton = {
                TextButton(enabled = reason.isNotBlank() && !isSubmitting, onClick = { onWithdrawDemand(pool.id, reason.trim()); poolToWithdraw = null }) {
                    Text("Xác nhận rút", color = CoralRed)
                }
            },
            dismissButton = { TextButton(onClick = { poolToWithdraw = null }) { Text("Giữ lại", color = TextSecondary) } }
        )
    }
}

@Composable
private fun Notice(text: String, error: Boolean) {
    Text(
        text,
        modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(14.dp)).background(if (error) CoralRed.copy(alpha = 0.1f) else SkyBlueContainer).padding(12.dp),
        color = if (error) CoralRed else TextPrimary,
        fontSize = 13.sp
    )
}

@Composable
private fun TabPill(label: String, count: Int, selected: Boolean, modifier: Modifier, onClick: () -> Unit) {
    Row(
        modifier.clip(RoundedCornerShape(50)).background(if (selected) SkyBluePrimary else Color.Transparent).clickable(onClick = onClick).padding(vertical = 10.dp),
        horizontalArrangement = Arrangement.Center,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(label, fontSize = 13.sp, fontWeight = FontWeight.Bold, color = if (selected) Color.White else TextSecondary, maxLines = 1)
        if (count > 0) Text(
            " $count", fontSize = 13.sp, fontWeight = FontWeight.ExtraBold, color = if (selected) Color.White else SkyBluePrimary
        )
    }
}

@Composable
private fun DemandCard(pool: RescuePool, ordered: Boolean, onOpen: () -> Unit, onEdit: () -> Unit, onWithdraw: () -> Unit) {
    val reg = pool.myRegistration ?: return
    val unitPrice = pool.offer?.proposedPrice ?: reg.budgetMax
    Column(
        Modifier.fillMaxWidth().clip(RoundedCornerShape(20.dp)).background(MaterialTheme.colorScheme.surface)
            .border(1.dp, DividerColor, RoundedCornerShape(20.dp)).clickable(onClick = onOpen).padding(14.dp)
    ) {
        Row(verticalAlignment = Alignment.Top) {
            PoolImage(pool.imageUrl, Modifier.size(72.dp), corner = 14.dp, description = pool.title)
            Spacer(Modifier.width(12.dp))
            Column(Modifier.weight(1f)) {
                Text(pool.title, fontWeight = FontWeight.ExtraBold, fontSize = 15.sp, color = TextPrimary, maxLines = 2, overflow = TextOverflow.Ellipsis)
                Text(pool.storeName, fontSize = 12.sp, color = TextSecondary, maxLines = 1, overflow = TextOverflow.Ellipsis)
                Spacer(Modifier.height(6.dp))
                RegistrationStatusChip(reg.status)
            }
        }
        Spacer(Modifier.height(12.dp))
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            InfoTile("Số suất", "${reg.requestedQuantity}", Modifier.weight(1f))
            InfoTile(if (pool.offer?.proposedPrice != null) "Giá đề nghị" else "Ngân sách tối đa", unitPrice?.let { formatVnd(it) + " / suất" } ?: "Không giới hạn", Modifier.weight(1.4f))
        }
        pool.offer?.let { Text("Nhận ${formatPoolTime(it.pickupStart)} → ${formatPoolTime(it.pickupEnd)}", fontSize = 12.sp, color = TextSecondary, modifier = Modifier.padding(top = 8.dp)) }
        Spacer(Modifier.height(12.dp))
        if (ordered) {
            PrimaryAction("Xem chi tiết đơn", modifier = Modifier.fillMaxWidth(), onClick = onOpen)
        } else {
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                OutlinedButton(onClick = onWithdraw, shape = RoundedCornerShape(14.dp), modifier = Modifier.weight(1f).heightIn(min = 44.dp)) {
                    Text("Rút nhu cầu", color = CoralRed, fontSize = 13.sp, fontWeight = FontWeight.SemiBold, maxLines = 1)
                }
                if (pool.status == "OPEN") Button(
                    onClick = onEdit, shape = RoundedCornerShape(14.dp), modifier = Modifier.weight(1f).heightIn(min = 44.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = SkyBluePrimary)
                ) { Text("Sửa nhu cầu", color = Color.White, fontSize = 13.sp, fontWeight = FontWeight.Bold, maxLines = 1) }
            }
        }
    }
}
