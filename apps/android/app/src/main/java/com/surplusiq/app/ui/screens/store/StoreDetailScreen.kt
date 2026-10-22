package com.surplusiq.app.ui.screens.store

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Call
import androidx.compose.material.icons.filled.Directions
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.Flag
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material.icons.filled.Schedule
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.filled.Storefront
import androidx.compose.material.icons.outlined.FavoriteBorder
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.surplusiq.app.domain.model.Deal
import com.surplusiq.app.domain.model.StoreDetail
import com.surplusiq.app.ui.components.DealCard
import com.surplusiq.app.ui.components.LoadStateContent
import com.surplusiq.app.ui.components.StateMessage
import com.surplusiq.app.ui.theme.AmberAccent
import com.surplusiq.app.ui.theme.CoralRed
import com.surplusiq.app.ui.theme.ForestGreenContainer
import com.surplusiq.app.ui.theme.ForestGreenPrimary
import com.surplusiq.app.ui.theme.TextMuted
import com.surplusiq.app.ui.theme.TextPrimary
import com.surplusiq.app.ui.theme.TextSecondary
import com.surplusiq.app.ui.util.NavigationUtil
import com.surplusiq.app.ui.viewmodel.StoreUiState

/** K14 Chi tiết cửa hàng (R1-027). */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun StoreDetailScreen(
    state: StoreUiState,
    onBackClick: () -> Unit,
    onRetry: () -> Unit,
    onToggleFavorite: (storeId: String) -> Unit,
    onReport: (storeId: String, reason: String) -> Unit,
    onDealClick: (Deal) -> Unit,
    onConsumeMessage: () -> Unit,
    onOpenReviews: (storeId: String) -> Unit = {},
    onLoadReviews: (storeId: String, rating: Int?) -> Unit = { _, _ -> }
) {
    val snackbarHostState = remember { SnackbarHostState() }
    var selectedTab by remember { mutableIntStateOf(0) }
    var reviewFilter by remember { mutableStateOf<Int?>(null) }
    var showMenu by remember { mutableStateOf(false) }
    var showReportDialog by remember { mutableStateOf(false) }
    val store = state.store
    val isFavorite = store != null && store.id in state.favoriteStoreIds

    LaunchedEffect(state.message) {
        state.message?.let { snackbarHostState.showSnackbar(it); onConsumeMessage() }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(store?.name ?: "Cửa hàng", fontWeight = FontWeight.Bold, fontSize = 18.sp, maxLines = 1) },
                navigationIcon = { IconButton(onClick = onBackClick) { Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Quay lại") } },
                actions = {
                    if (store != null) {
                        IconButton(onClick = { onToggleFavorite(store.id) }) {
                            Icon(
                                if (isFavorite) Icons.Filled.Favorite else Icons.Outlined.FavoriteBorder,
                                contentDescription = if (isFavorite) "Bỏ yêu thích" else "Yêu thích",
                                tint = if (isFavorite) CoralRed else TextPrimary
                            )
                        }
                        Box {
                            IconButton(onClick = { showMenu = true }) { Icon(Icons.Default.MoreVert, contentDescription = "Thêm") }
                            DropdownMenu(expanded = showMenu, onDismissRequest = { showMenu = false }) {
                                DropdownMenuItem(
                                    text = { Text("Báo cáo cửa hàng") },
                                    leadingIcon = { Icon(Icons.Default.Flag, contentDescription = null) },
                                    onClick = { showMenu = false; showReportDialog = true }
                                )
                            }
                        }
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.surface)
            )
        },
        snackbarHost = { SnackbarHost(snackbarHostState) },
        containerColor = MaterialTheme.colorScheme.background
    ) { padding ->
        LoadStateContent(
            isLoading = state.isStoreLoading,
            errorMessage = state.storeError,
            isEmpty = store == null,
            emptyIcon = Icons.Default.Storefront,
            emptyTitle = "Không có thông tin cửa hàng",
            emptyMessage = "Cửa hàng không tồn tại hoặc đang tạm ngưng.",
            onRetry = onRetry,
            modifier = Modifier.padding(padding)
        ) {
            val detail = store ?: return@LoadStateContent
            LazyColumn(
                modifier = Modifier.padding(padding).fillMaxSize(),
                contentPadding = PaddingValues(bottom = 24.dp)
            ) {
                storeBodyItems(
                    state = state,
                    detail = detail,
                    isFavorite = isFavorite,
                    selectedTab = selectedTab,
                    onTabChange = { selectedTab = it },
                    reviewFilter = reviewFilter,
                    onReviewFilter = { reviewFilter = it },
                    onToggleFavorite = onToggleFavorite,
                    onDealClick = onDealClick,
                    onLoadReviews = onLoadReviews,
                    onOpenReviews = onOpenReviews
                )
            }
        }
    }

    if (showReportDialog && store != null) {
        var reason by remember { mutableStateOf("") }
        AlertDialog(
            onDismissRequest = { showReportDialog = false },
            title = { Text("Báo cáo cửa hàng") },
            text = {
                OutlinedTextField(
                    value = reason,
                    onValueChange = { if (it.length <= 500) reason = it },
                    label = { Text("Lý do báo cáo") },
                    supportingText = { Text("${reason.length}/500") },
                    minLines = 3
                )
            },
            confirmButton = {
                TextButton(
                    onClick = { onReport(store.id, reason); showReportDialog = false },
                    enabled = reason.isNotBlank() && !state.isReporting
                ) { Text("Gửi báo cáo", color = CoralRed, fontWeight = FontWeight.Bold) }
            },
            dismissButton = { TextButton(onClick = { showReportDialog = false }) { Text("Hủy") } }
        )
    }
}

/** Thân trang quán: đầu trang, ba tab (Thực đơn, Đánh giá, Thông tin). Dùng cho trang quán đầy đủ và khung quán trên bản đồ. */
@OptIn(ExperimentalMaterial3Api::class)
internal fun androidx.compose.foundation.lazy.LazyListScope.storeBodyItems(
    state: StoreUiState,
    detail: StoreDetail,
    isFavorite: Boolean,
    selectedTab: Int,
    onTabChange: (Int) -> Unit,
    reviewFilter: Int?,
    onReviewFilter: (Int?) -> Unit,
    onToggleFavorite: (storeId: String) -> Unit,
    onDealClick: (Deal) -> Unit,
    onLoadReviews: (storeId: String, rating: Int?) -> Unit,
    onOpenReviews: (storeId: String) -> Unit
) {
    item { StoreHeader(detail, onOpenReviews = onOpenReviews) }
    item {
        TabRow(
            selectedTabIndex = selectedTab,
            containerColor = MaterialTheme.colorScheme.background,
            contentColor = ForestGreenPrimary
        ) {
            Tab(selected = selectedTab == 0, onClick = { onTabChange(0) }, text = { Text("Thực đơn (${detail.activeDeals.size})", maxLines = 1) })
            Tab(selected = selectedTab == 1, onClick = { onTabChange(1) }, text = { Text("Đánh giá${if (detail.reviewsCount > 0) " (${detail.reviewsCount})" else ""}", maxLines = 1) })
            Tab(selected = selectedTab == 2, onClick = { onTabChange(2) }, text = { Text("Thông tin", maxLines = 1) })
        }
    }
    if (selectedTab == 0) {
        if (detail.activeDeals.isEmpty()) {
            item {
                StateMessage(
                    icon = Icons.Default.Storefront,
                    title = "Chưa có suất đang mở",
                    message = "Yêu thích cửa hàng để quay lại nhanh khi quán mở bán suất mới.",
                    modifier = Modifier.height(260.dp)
                )
            }
        }
        items(detail.activeDeals, key = { it.id }) { deal ->
            DealCard(
                deal = deal.copy(isFavorite = isFavorite),
                onDealClick = onDealClick,
                onFavoriteToggle = { onToggleFavorite(detail.id) },
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)
            )
        }
    } else if (selectedTab == 1) {
        item {
            LaunchedEffect(detail.id, reviewFilter) { onLoadReviews(detail.id, reviewFilter) }
            val reviewsData = state.storeReviews
            Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                when {
                    state.isStoreReviewsLoading && reviewsData == null -> Box(Modifier.fillMaxWidth().padding(24.dp), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator(color = ForestGreenPrimary)
                    }
                    state.storeReviewsError != null && reviewsData == null -> Text(state.storeReviewsError, color = CoralRed, fontSize = 13.sp)
                    else -> {
                        RatingSummaryCard(
                            averageRating = reviewsData?.averageRating ?: 0.0,
                            totalReviews = reviewsData?.totalReviews ?: 0,
                            distribution = reviewsData?.distribution ?: emptyMap()
                        )
                        RatingFilterChips(selectedRating = reviewFilter, onSelectRating = { onReviewFilter(it) })
                        val reviews = reviewsData?.reviews.orEmpty()
                        if (reviews.isEmpty()) {
                            Text(
                                if (reviewFilter != null) "Chưa có đánh giá ${reviewFilter} sao nào." else "Quán chưa có đánh giá nào.",
                                fontSize = 13.sp,
                                color = TextSecondary
                            )
                        } else {
                            reviews.forEach { StoreReviewItemCard(review = it) }
                        }
                    }
                }
            }
        }
    } else {
        item { StoreAbout(detail) }
    }

}

/**
 * Khung quán nhúng dưới bản đồ: tự tải chi tiết quán theo [storeId] rồi hiện thông tin, thực đơn, đánh giá.
 * [onClose] quay lại danh sách quán.
 */
@Composable
fun StoreDetailPanel(
    state: StoreUiState,
    storeId: String,
    onLoad: (storeId: String) -> Unit,
    onClose: () -> Unit,
    onToggleFavorite: (storeId: String) -> Unit,
    onDealClick: (Deal) -> Unit,
    onLoadReviews: (storeId: String, rating: Int?) -> Unit,
    modifier: Modifier = Modifier
) {
    var selectedTab by remember(storeId) { mutableIntStateOf(0) }
    var reviewFilter by remember(storeId) { mutableStateOf<Int?>(null) }
    LaunchedEffect(storeId) { onLoad(storeId) }
    val detail = state.store?.takeIf { it.id == storeId }

    Column(modifier.fillMaxSize().background(MaterialTheme.colorScheme.background)) {
        Row(Modifier.fillMaxWidth().padding(horizontal = 8.dp, vertical = 4.dp), verticalAlignment = Alignment.CenterVertically) {
            TextButton(onClick = onClose) {
                Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = null, modifier = Modifier.size(18.dp))
                Spacer(Modifier.width(4.dp))
                Text("Danh sách quán", fontWeight = FontWeight.SemiBold)
            }
        }
        when {
            detail != null -> LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(bottom = 24.dp)) {
                storeBodyItems(
                    state = state,
                    detail = detail,
                    isFavorite = detail.id in state.favoriteStoreIds,
                    selectedTab = selectedTab,
                    onTabChange = { selectedTab = it },
                    reviewFilter = reviewFilter,
                    onReviewFilter = { reviewFilter = it },
                    onToggleFavorite = onToggleFavorite,
                    onDealClick = onDealClick,
                    onLoadReviews = onLoadReviews,
                    onOpenReviews = {}
                )
            }
            state.storeError != null -> Text(state.storeError, color = CoralRed, fontSize = 13.sp, modifier = Modifier.padding(16.dp))
            else -> Box(Modifier.fillMaxWidth().padding(32.dp), contentAlignment = Alignment.Center) { CircularProgressIndicator(color = ForestGreenPrimary) }
        }
    }
}

@Composable
private fun StoreHeader(store: StoreDetail, onOpenReviews: (String) -> Unit = {}) {
    val context = LocalContext.current
    Column {
        // Backend chưa có ảnh bìa cửa hàng: dùng dải màu thương hiệu làm nền cho logo.
        Box(
            Modifier
                .fillMaxWidth()
                .height(120.dp)
                .background(ForestGreenContainer)
        ) {
            Box(
                Modifier
                    .align(Alignment.BottomStart)
                    .padding(start = 16.dp)
                    .offset(y = 36.dp)
                    .size(76.dp)
                    .clip(CircleShape)
                    .background(MaterialTheme.colorScheme.surface),
                contentAlignment = Alignment.Center
            ) {
                if (store.logoUrl.isNullOrBlank()) {
                    Icon(Icons.Default.Storefront, contentDescription = null, tint = ForestGreenPrimary, modifier = Modifier.size(36.dp))
                } else {
                    AsyncImage(
                        model = store.logoUrl,
                        contentDescription = store.name,
                        contentScale = ContentScale.Crop,
                        modifier = Modifier.fillMaxSize().clip(CircleShape)
                    )
                }
            }
        }
        Column(Modifier.padding(start = 16.dp, end = 16.dp, top = 44.dp, bottom = 12.dp)) {
            Text(store.name, fontSize = 20.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
            Spacer(Modifier.height(6.dp))
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier
                    .clip(RoundedCornerShape(8.dp))
                    .clickable { onOpenReviews(store.id) }
                    .padding(vertical = 4.dp, horizontal = 2.dp)
            ) {
                Icon(Icons.Default.Star, contentDescription = null, tint = AmberAccent, modifier = Modifier.size(16.dp))
                Spacer(Modifier.width(4.dp))
                Text(
                    store.averageRating?.let { "%.1f (%d đánh giá)".format(it, store.reviewsCount) } ?: "Chưa có đánh giá",
                    fontSize = 13.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = if (store.reviewsCount > 0) ForestGreenPrimary else TextPrimary
                )
            }
            Spacer(Modifier.height(10.dp))
            InfoRow(Icons.Default.Schedule, store.todayHours?.let { "Hôm nay: $it" } ?: "Chưa cập nhật giờ mở cửa hôm nay")
            InfoRow(Icons.Default.LocationOn, store.address.ifBlank { "Chưa cập nhật địa chỉ" })
            Spacer(Modifier.height(10.dp))
            OutlinedButton(
                onClick = { NavigationUtil.openMapOrCopyAddress(context, store.address, store.name) },
                enabled = store.address.isNotBlank(),
                shape = RoundedCornerShape(12.dp),
                modifier = Modifier.fillMaxWidth().height(44.dp)
            ) {
                Icon(Icons.Default.Directions, contentDescription = null, modifier = Modifier.size(18.dp), tint = ForestGreenPrimary)
                Spacer(Modifier.width(6.dp))
                Text("Chỉ đường", color = ForestGreenPrimary, fontWeight = FontWeight.Bold)
            }
        }
    }
}

@Composable
private fun StoreAbout(store: StoreDetail) {
    val context = LocalContext.current
    Column(Modifier.padding(16.dp)) {
        Text("Giờ mở cửa", fontSize = 15.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
        Spacer(Modifier.height(8.dp))
        if (store.weeklyHours.isEmpty()) {
            Text("Cửa hàng chưa cập nhật giờ mở cửa.", fontSize = 13.sp, color = TextMuted)
        } else {
            store.weeklyHours.forEach { (day, hours) ->
                Row(Modifier.fillMaxWidth().padding(vertical = 3.dp), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text(day, fontSize = 13.sp, color = TextSecondary)
                    Text(hours, fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = TextPrimary)
                }
            }
        }
        Spacer(Modifier.height(16.dp))
        Text("Liên hệ", fontSize = 15.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
        Spacer(Modifier.height(8.dp))
        InfoRow(Icons.Default.LocationOn, store.address.ifBlank { "Chưa cập nhật địa chỉ" })
        store.phone?.takeIf { it.isNotBlank() }?.let { phone ->
            InfoRow(
                Icons.Default.Call,
                phone,
                onClick = { context.startActivity(Intent(Intent.ACTION_DIAL, Uri.parse("tel:$phone"))) }
            )
        }
    }
}

@Composable
private fun InfoRow(icon: androidx.compose.ui.graphics.vector.ImageVector, text: String, onClick: (() -> Unit)? = null) {
    Row(
        Modifier
            .fillMaxWidth()
            .then(if (onClick != null) Modifier.clickable(onClick = onClick) else Modifier)
            .padding(vertical = 4.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(icon, contentDescription = null, tint = ForestGreenPrimary, modifier = Modifier.size(18.dp))
        Spacer(Modifier.width(8.dp))
        Text(text, fontSize = 13.sp, color = if (onClick != null) ForestGreenPrimary else TextPrimary)
    }
}
