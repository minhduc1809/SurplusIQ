package com.surplusiq.app.ui.screens.favourites

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Bookmarks
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.NotificationsActive
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.filled.Storefront
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.surplusiq.app.domain.model.StoreDetail
import com.surplusiq.app.ui.components.LoadStateContent
import com.surplusiq.app.ui.theme.AmberAccent
import com.surplusiq.app.ui.theme.CoralRed
import com.surplusiq.app.ui.theme.ForestGreenPrimary
import com.surplusiq.app.ui.theme.MintDeep
import com.surplusiq.app.ui.theme.SkyBlueIce
import com.surplusiq.app.ui.theme.SurfaceSubtle
import com.surplusiq.app.ui.theme.TextMuted
import com.surplusiq.app.ui.theme.TextPrimary
import com.surplusiq.app.ui.theme.TextSecondary
import com.surplusiq.app.ui.viewmodel.StoreUiState
import kotlinx.coroutines.launch

/** K18 Cửa hàng yêu thích (R1-028, R1-029): bỏ yêu thích có Hoàn tác. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FavouritesScreen(
    state: StoreUiState,
    onLoad: () -> Unit,
    onStoreClick: (storeId: String) -> Unit,
    onRemoveFavorite: (StoreDetail) -> Unit,
    onUndoRemove: (StoreDetail, index: Int) -> Unit,
    onOpenSavedDeals: () -> Unit,
    onOpenDealAlerts: () -> Unit,
    onConsumeMessage: () -> Unit,
    modifier: Modifier = Modifier
) {
    val snackbarHostState = remember { SnackbarHostState() }
    val scope = rememberCoroutineScope()

    LaunchedEffect(Unit) { onLoad() }
    LaunchedEffect(state.message) {
        state.message?.let { snackbarHostState.showSnackbar(it); onConsumeMessage() }
    }

    Scaffold(
        modifier = modifier,
        topBar = {
            TopAppBar(
                title = { Text("Cửa hàng yêu thích", fontWeight = FontWeight.Bold, fontSize = 18.sp) },
                actions = {
                    IconButton(onClick = onOpenSavedDeals) { Icon(Icons.Default.Bookmarks, contentDescription = "Deal đã lưu và đã xem") }
                    IconButton(onClick = onOpenDealAlerts) { Icon(Icons.Default.NotificationsActive, contentDescription = "Cảnh báo deal") }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.surface)
            )
        },
        snackbarHost = { SnackbarHost(snackbarHostState) },
        containerColor = MaterialTheme.colorScheme.background
    ) { padding ->
        LoadStateContent(
            isLoading = state.isFavoritesLoading,
            errorMessage = state.favoritesError,
            isEmpty = state.favoriteStores.isEmpty(),
            emptyIcon = Icons.Default.Favorite,
            emptyTitle = "Chưa có cửa hàng yêu thích",
            emptyMessage = "Nhấn biểu tượng trái tim ở trang cửa hàng để lưu quán bạn thích và quay lại nhanh khi có suất mới.",
            onRetry = onLoad,
            modifier = Modifier.padding(padding)
        ) {
            LazyColumn(
                modifier = Modifier.padding(padding).fillMaxSize(),
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                items(state.favoriteStores, key = { it.id }) { store ->
                    FavoriteStoreRow(
                        store = store,
                        onClick = { onStoreClick(store.id) },
                        onUnfavorite = {
                            val index = state.favoriteStores.indexOf(store)
                            onRemoveFavorite(store)
                            scope.launch {
                                val result = snackbarHostState.showSnackbar(
                                    message = "Đã bỏ yêu thích ${store.name}",
                                    actionLabel = "Hoàn tác",
                                    duration = SnackbarDuration.Short
                                )
                                if (result == SnackbarResult.ActionPerformed) onUndoRemove(store, index)
                            }
                        }
                    )
                }
            }
        }
    }
}

@Composable
private fun FavoriteStoreRow(store: StoreDetail, onClick: () -> Unit, onUnfavorite: () -> Unit) {
    Card(
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
        modifier = Modifier.fillMaxWidth().clickable(onClick = onClick)
    ) {
        Row(Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
            Box(
                Modifier.size(52.dp).clip(CircleShape).background(SurfaceSubtle),
                contentAlignment = Alignment.Center
            ) {
                if (store.logoUrl.isNullOrBlank()) {
                    Icon(Icons.Default.Storefront, contentDescription = null, tint = ForestGreenPrimary)
                } else {
                    AsyncImage(model = store.logoUrl, contentDescription = store.name, contentScale = ContentScale.Crop, modifier = Modifier.fillMaxSize())
                }
            }
            Spacer(Modifier.width(12.dp))
            Column(Modifier.weight(1f)) {
                Text(store.name, fontSize = 15.sp, fontWeight = FontWeight.Bold, color = TextPrimary, maxLines = 1, overflow = TextOverflow.Ellipsis)
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.Star, contentDescription = null, tint = AmberAccent, modifier = Modifier.size(14.dp))
                    Spacer(Modifier.width(3.dp))
                    Text(
                        store.averageRating?.let { "%.1f (%d)".format(it, store.reviewsCount) } ?: "Chưa có đánh giá",
                        fontSize = 12.sp,
                        color = TextSecondary
                    )
                }
                if (store.address.isNotBlank()) {
                    Text(store.address, fontSize = 11.sp, color = TextMuted, maxLines = 1, overflow = TextOverflow.Ellipsis)
                }
                Spacer(Modifier.height(4.dp))
                val openCount = store.activeDeals.size
                Box(
                    Modifier
                        .clip(RoundedCornerShape(6.dp))
                        .background(if (openCount > 0) SkyBlueIce else SurfaceSubtle)
                        .padding(horizontal = 8.dp, vertical = 2.dp)
                ) {
                    Text(
                        if (openCount > 0) "$openCount suất đang mở" else "Chưa có suất đang mở",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = if (openCount > 0) MintDeep else TextMuted
                    )
                }
            }
            IconButton(onClick = onUnfavorite) {
                Icon(Icons.Default.Favorite, contentDescription = "Bỏ yêu thích ${store.name}", tint = CoralRed)
            }
        }
    }
}
