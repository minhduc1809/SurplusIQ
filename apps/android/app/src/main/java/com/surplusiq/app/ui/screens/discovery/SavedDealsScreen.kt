package com.surplusiq.app.ui.screens.discovery

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.BookmarkBorder
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.CompareArrows
import androidx.compose.material.icons.filled.History
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.surplusiq.app.domain.model.CompareDeal
import com.surplusiq.app.domain.model.Deal
import com.surplusiq.app.domain.model.SavedDealItem
import com.surplusiq.app.ui.components.LoadStateContent
import com.surplusiq.app.ui.components.SwipeToDeleteBox
import com.surplusiq.app.ui.theme.DividerColor
import com.surplusiq.app.ui.theme.ForestGreenPrimary
import com.surplusiq.app.ui.theme.SurfaceSubtle
import com.surplusiq.app.ui.theme.TextMuted
import com.surplusiq.app.ui.theme.TextPrimary
import com.surplusiq.app.ui.theme.TextSecondary
import com.surplusiq.app.ui.viewmodel.SavedDealsUiState

/** K17 Deal đã lưu (R1-034) và đã xem gần đây (R1-035); chọn 2-3 deal để so sánh (K16). */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SavedDealsScreen(
    state: SavedDealsUiState,
    onBackClick: () -> Unit,
    onLoadSaved: () -> Unit,
    onLoadHistory: () -> Unit,
    onUnsave: (dealId: String) -> Unit,
    onDealClick: (Deal) -> Unit,
    onCompare: (dealIds: List<String>) -> Unit,
    onConsumeMessage: () -> Unit
) {
    var selectedTab by remember { mutableIntStateOf(0) }
    var selectionMode by remember { mutableStateOf(false) }
    var selectedIds by remember { mutableStateOf(emptySet<String>()) }
    val snackbarHostState = remember { SnackbarHostState() }

    LaunchedEffect(Unit) { onLoadSaved(); onLoadHistory() }
    LaunchedEffect(state.message) {
        state.message?.let { snackbarHostState.showSnackbar(it); onConsumeMessage() }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        if (selectionMode) "Đã chọn ${selectedIds.size}/${CompareDeal.MAX_ITEMS}" else "Deal đã lưu và đã xem",
                        fontWeight = FontWeight.Bold,
                        fontSize = 18.sp
                    )
                },
                navigationIcon = { IconButton(onClick = onBackClick) { Icon(Icons.Default.ArrowBack, contentDescription = "Quay lại") } },
                actions = {
                    IconButton(onClick = { selectionMode = !selectionMode; selectedIds = emptySet() }) {
                        Icon(
                            if (selectionMode) Icons.Default.Close else Icons.Default.CompareArrows,
                            contentDescription = if (selectionMode) "Thoát chọn" else "Chọn để so sánh"
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.surface)
            )
        },
        bottomBar = {
            if (selectionMode) {
                Button(
                    onClick = { onCompare(selectedIds.toList()) },
                    enabled = selectedIds.size in CompareDeal.MIN_ITEMS..CompareDeal.MAX_ITEMS,
                    shape = RoundedCornerShape(14.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = ForestGreenPrimary),
                    modifier = Modifier.fillMaxWidth().padding(16.dp).height(48.dp)
                ) {
                    Icon(Icons.Default.CompareArrows, contentDescription = null)
                    Spacer(Modifier.width(6.dp))
                    Text("So sánh (${selectedIds.size})", fontWeight = FontWeight.Bold)
                }
            }
        },
        snackbarHost = { SnackbarHost(snackbarHostState) },
        containerColor = MaterialTheme.colorScheme.background
    ) { padding ->
        Column(Modifier.padding(padding).fillMaxSize()) {
            TabRow(selectedTabIndex = selectedTab, containerColor = MaterialTheme.colorScheme.background, contentColor = ForestGreenPrimary) {
                Tab(selected = selectedTab == 0, onClick = { selectedTab = 0 }, text = { Text("Đã lưu") })
                Tab(selected = selectedTab == 1, onClick = { selectedTab = 1 }, text = { Text("Xem gần đây") })
            }
            if (selectionMode) {
                Text(
                    "Chọn ${CompareDeal.MIN_ITEMS}-${CompareDeal.MAX_ITEMS} deal để so sánh.",
                    fontSize = 12.sp,
                    color = TextSecondary,
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)
                )
            }
            val isSavedTab = selectedTab == 0
            val items = if (isSavedTab) state.savedDeals else state.viewHistory
            LoadStateContent(
                isLoading = if (isSavedTab) state.isSavedLoading else state.isHistoryLoading,
                errorMessage = if (isSavedTab) state.savedError else state.historyError,
                isEmpty = items.isEmpty(),
                emptyIcon = if (isSavedTab) Icons.Default.BookmarkBorder else Icons.Default.History,
                emptyTitle = if (isSavedTab) "Chưa lưu deal nào" else "Chưa xem deal nào",
                emptyMessage = if (isSavedTab) "Nhấn biểu tượng lưu ở chi tiết deal để xem lại sau." else "Các deal bạn mở gần đây (tối đa 20) sẽ hiện ở đây.",
                onRetry = if (isSavedTab) onLoadSaved else onLoadHistory
            ) {
                LazyColumn(
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                    modifier = Modifier.fillMaxSize()
                ) {
                    items(items, key = { it.offerId }) { item ->
                        val deal = item.deal
                        val selectable = deal != null && (item.offerId in selectedIds || selectedIds.size < CompareDeal.MAX_ITEMS)
                        val row = @Composable {
                            CompactDealRow(
                                item = item,
                                selectionMode = selectionMode,
                                isSelected = item.offerId in selectedIds,
                                selectable = selectable,
                                onClick = {
                                    when {
                                        selectionMode && selectable -> selectedIds =
                                            if (item.offerId in selectedIds) selectedIds - item.offerId else selectedIds + item.offerId
                                        !selectionMode && deal != null -> onDealClick(deal)
                                    }
                                }
                            )
                        }
                        if (isSavedTab && !selectionMode) SwipeToDeleteBox("Bỏ lưu", onDelete = { onUnsave(item.offerId) }) { row() } else row()
                    }
                }
            }
        }
    }
}

@Composable
private fun CompactDealRow(
    item: SavedDealItem,
    selectionMode: Boolean,
    isSelected: Boolean,
    selectable: Boolean,
    onClick: () -> Unit
) {
    val deal = item.deal
    Card(
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
        modifier = Modifier.fillMaxWidth().clickable(onClick = onClick)
    ) {
        Row(Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
            if (selectionMode) {
                Checkbox(checked = isSelected, onCheckedChange = { onClick() }, enabled = selectable)
            }
            Row(Modifier.weight(1f).alpha(if (item.isExpired) 0.55f else 1f), verticalAlignment = Alignment.CenterVertically) {
                AsyncImage(
                    model = deal?.coverImageUrl?.ifBlank { null },
                    contentDescription = deal?.title,
                    contentScale = ContentScale.Crop,
                    modifier = Modifier.size(56.dp).clip(RoundedCornerShape(10.dp)).background(SurfaceSubtle)
                )
                Spacer(Modifier.width(12.dp))
                Column(Modifier.weight(1f)) {
                    Text(deal?.title ?: "Suất không còn tồn tại", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = TextPrimary, maxLines = 1, overflow = TextOverflow.Ellipsis)
                    if (!deal?.storeName.isNullOrBlank()) Text(deal!!.storeName, fontSize = 12.sp, color = TextSecondary, maxLines = 1, overflow = TextOverflow.Ellipsis)
                    if (deal != null) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text("%,d ₫".format(deal.discountPrice), fontSize = 13.sp, fontWeight = FontWeight.Bold, color = ForestGreenPrimary)
                            if (deal.originalPrice > deal.discountPrice) {
                                Spacer(Modifier.width(6.dp))
                                Text("%,d ₫".format(deal.originalPrice), fontSize = 11.sp, color = TextMuted, textDecoration = TextDecoration.LineThrough)
                            }
                            if (deal.pickupWindowText.isNotBlank()) {
                                Spacer(Modifier.width(8.dp))
                                Text(deal.pickupWindowText, fontSize = 11.sp, color = TextSecondary)
                            }
                        }
                    }
                }
            }
            if (item.isExpired) {
                Box(Modifier.clip(RoundedCornerShape(6.dp)).background(DividerColor).padding(horizontal = 8.dp, vertical = 3.dp)) {
                    Text("Đã hết", fontSize = 11.sp, fontWeight = FontWeight.SemiBold, color = TextSecondary)
                }
            }
        }
    }
}
