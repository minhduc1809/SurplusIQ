package com.surplusiq.app.ui.screens.basket

import androidx.compose.foundation.background
import com.surplusiq.app.ui.components.SqCard
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Remove
import androidx.compose.material.icons.filled.SwapHoriz
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.surplusiq.app.domain.model.BasketCustomItem
import com.surplusiq.app.domain.model.BasketSubstituteItem
import com.surplusiq.app.ui.theme.*

/**
 * Màn hình Chi tiết giỏ cứu (KC03):
 * - Xem danh sách món trong giỏ của quán
 * - Thay món khác cùng quán (gọi API substitutes)
 * - Tăng/giảm số lượng hoặc xóa món
 * - Cảnh báo thành phần dị ứng nếu trùng với hồ sơ ăn uống của khách
 * - Tính tổng tiền tự động
 * - Nút tiếp tục sang màn Đặt giữ giỏ (KC04)
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun BasketDetailScreen(
    storeName: String,
    items: List<BasketCustomItem>,
    userAllergens: List<String> = emptyList(),
    availableSubstitutes: List<BasketSubstituteItem>,
    isSubstitutesLoading: Boolean,
    substitutesError: String?,
    onBackClick: () -> Unit,
    onQuantityChange: (offerId: String, newQty: Int) -> Unit,
    onRemoveItem: (offerId: String) -> Unit,
    onRequestSubstitutes: () -> Unit,
    onApplySubstitute: (oldOfferId: String, substitute: BasketSubstituteItem) -> Unit,
    onProceedToCheckout: () -> Unit,
    modifier: Modifier = Modifier
) {
    var itemToSubstitute by remember { mutableStateOf<BasketCustomItem?>(null) }
    val totalAmount = remember(items) { items.sumOf { it.price * it.quantity } }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text(
                            text = "Chi tiết giỏ cứu",
                            fontWeight = FontWeight.Bold,
                            fontSize = 17.sp,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                        Text(
                            text = storeName,
                            fontSize = 12.sp,
                            color = TextSecondary,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                    }
                },
                navigationIcon = {
                    IconButton(onClick = onBackClick) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = "Quay lại"
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.background
                )
            )
        },
        bottomBar = {
            if (items.isNotEmpty()) {
                Surface(
                    tonalElevation = 8.dp,
                    shadowElevation = 8.dp,
                    color = MaterialTheme.colorScheme.surface
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 16.dp, vertical = 12.dp)
                            .navigationBarsPadding(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text(
                                text = "Tổng tạm tính (${items.sumOf { it.quantity }} món)",
                                fontSize = 12.sp,
                                color = TextSecondary
                            )
                            Text(
                                text = "${"%,d".format(totalAmount)} ₫",
                                fontWeight = FontWeight.Bold,
                                fontSize = 18.sp,
                                color = ForestGreenPrimary
                            )
                        }
                        Button(
                            onClick = onProceedToCheckout,
                            shape = RoundedCornerShape(24.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = ForestGreenPrimary),
                            modifier = Modifier.height(48.dp)
                        ) {
                            Text("Đặt giữ giỏ này", fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
        },
        modifier = modifier
    ) { innerPadding ->
        if (items.isEmpty()) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(innerPadding),
                contentAlignment = Alignment.Center
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(
                        text = "Giỏ cứu hiện chưa có món nào",
                        fontSize = 15.sp,
                        color = TextSecondary
                    )
                    Spacer(modifier = Modifier.height(12.dp))
                    OutlinedButton(onClick = onBackClick) {
                        Text("Quay lại chọn giỏ khác")
                    }
                }
            }
        } else {
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(innerPadding),
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                item {
                    SqCard(
                        colors = CardDefaults.cardColors(
                            containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)
                        ),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(12.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                imageVector = Icons.Default.SwapHoriz,
                                contentDescription = null,
                                tint = ForestGreenPrimary,
                                modifier = Modifier.size(24.dp)
                            )
                            Spacer(modifier = Modifier.width(10.dp))
                            Text(
                                text = "Bạn có thể thay đổi số lượng, xóa món hoặc thay thế bằng suất khác cùng quán trước khi đặt giữ.",
                                fontSize = 12.sp,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }
                }

                items(items, key = { it.offerId }) { item ->
                    val matchingAllergens = remember(item.allergens, userAllergens) {
                        if (userAllergens.isEmpty()) emptyList()
                        else item.allergens.filter { itemAlg ->
                            userAllergens.any { userAlg ->
                                userAlg.equals(itemAlg, ignoreCase = true) ||
                                        itemAlg.contains(userAlg, ignoreCase = true)
                            }
                        }
                    }

                    BasketItemCard(
                        item = item,
                        conflictingAllergens = matchingAllergens,
                        onQuantityChange = { newQty -> onQuantityChange(item.offerId, newQty) },
                        onRemove = { onRemoveItem(item.offerId) },
                        onSubstitute = {
                            itemToSubstitute = item
                            onRequestSubstitutes()
                        }
                    )
                }
            }
        }
    }

    // Modal chọn món thay thế (KC03)
    if (itemToSubstitute != null) {
        val targetItem = itemToSubstitute!!
        ModalBottomSheet(
            onDismissRequest = { itemToSubstitute = null },
            sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 8.dp)
                    .navigationBarsPadding()
            ) {
                Text(
                    text = "Chọn món thay thế cho \"${targetItem.title}\"",
                    fontWeight = FontWeight.Bold,
                    fontSize = 16.sp,
                    color = MaterialTheme.colorScheme.onSurface
                )
                Text(
                    text = "Các suất cứu đang mở bán tại $storeName",
                    fontSize = 12.sp,
                    color = TextSecondary
                )
                Spacer(modifier = Modifier.height(12.dp))

                when {
                    isSubstitutesLoading -> {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(32.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            CircularProgressIndicator(color = ForestGreenPrimary)
                        }
                    }
                    substitutesError != null -> {
                        Text(
                            text = substitutesError,
                            color = CoralRed,
                            fontSize = 13.sp,
                            modifier = Modifier.padding(16.dp)
                        )
                    }
                    availableSubstitutes.isEmpty() -> {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(32.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = "Quán hiện không còn suất nào khác để thay thế.",
                                fontSize = 13.sp,
                                color = TextSecondary
                            )
                        }
                    }
                    else -> {
                        LazyColumn(
                            verticalArrangement = Arrangement.spacedBy(8.dp),
                            modifier = Modifier.heightIn(max = 400.dp)
                        ) {
                            items(availableSubstitutes, key = { it.id }) { sub ->
                                SubstituteItemRow(
                                    substitute = sub,
                                    userAllergens = userAllergens,
                                    onSelect = {
                                        onApplySubstitute(targetItem.offerId, sub)
                                        itemToSubstitute = null
                                    }
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun BasketItemCard(
    item: BasketCustomItem,
    conflictingAllergens: List<String>,
    onQuantityChange: (Int) -> Unit,
    onRemove: () -> Unit,
    onSubstitute: () -> Unit
) {
    SqCard(
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp)
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.Top
            ) {
                if (!item.imageUrl.isNullOrBlank()) {
                    AsyncImage(
                        model = item.imageUrl,
                        contentDescription = item.title,
                        modifier = Modifier
                            .size(64.dp)
                            .clip(RoundedCornerShape(8.dp)),
                        contentScale = ContentScale.Crop
                    )
                    Spacer(modifier = Modifier.width(12.dp))
                }

                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = item.title,
                        fontWeight = FontWeight.SemiBold,
                        fontSize = 14.sp,
                        color = MaterialTheme.colorScheme.onSurface,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = "${"%,d".format(item.price)} ₫",
                        fontWeight = FontWeight.Bold,
                        fontSize = 13.sp,
                        color = ForestGreenPrimary
                    )

                    // Cảnh báo dị ứng
                    if (conflictingAllergens.isNotEmpty()) {
                        Spacer(modifier = Modifier.height(4.dp))
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier
                                .clip(RoundedCornerShape(4.dp))
                                .background(CoralRed.copy(alpha = 0.1f))
                                .padding(horizontal = 6.dp, vertical = 2.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.Warning,
                                contentDescription = null,
                                tint = CoralRed,
                                modifier = Modifier.size(12.dp)
                            )
                            Spacer(modifier = Modifier.width(4.dp))
                            Text(
                                text = "Dị ứng: ${conflictingAllergens.joinToString(", ")}",
                                fontSize = 11.sp,
                                color = CoralRed,
                                fontWeight = FontWeight.Medium
                            )
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(10.dp))
            HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f))
            Spacer(modifier = Modifier.height(8.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Nút thay món
                TextButton(
                    onClick = onSubstitute,
                    contentPadding = PaddingValues(horizontal = 8.dp, vertical = 4.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.SwapHoriz,
                        contentDescription = null,
                        modifier = Modifier.size(16.dp),
                        tint = MaterialTheme.colorScheme.primary
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("Thay món khác", fontSize = 12.sp)
                }

                // Bộ tăng giảm số lượng & xóa
                Row(verticalAlignment = Alignment.CenterVertically) {
                    IconButton(
                        onClick = {
                            if (item.quantity > 1) onQuantityChange(item.quantity - 1)
                            else onRemove()
                        },
                        modifier = Modifier.size(28.dp)
                    ) {
                        Icon(
                            imageVector = if (item.quantity > 1) Icons.Default.Remove else Icons.Default.Delete,
                            contentDescription = "Giảm",
                            tint = if (item.quantity > 1) MaterialTheme.colorScheme.onSurface else CoralRed,
                            modifier = Modifier.size(16.dp)
                        )
                    }

                    Text(
                        text = "${item.quantity}",
                        fontWeight = FontWeight.Bold,
                        fontSize = 14.sp,
                        modifier = Modifier.padding(horizontal = 8.dp)
                    )

                    IconButton(
                        onClick = { onQuantityChange(item.quantity + 1) },
                        modifier = Modifier.size(28.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.Add,
                            contentDescription = "Tăng",
                            tint = MaterialTheme.colorScheme.onSurface,
                            modifier = Modifier.size(16.dp)
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun SubstituteItemRow(
    substitute: BasketSubstituteItem,
    userAllergens: List<String>,
    onSelect: () -> Unit
) {
    val conflicts = remember(substitute.allergens, userAllergens) {
        if (userAllergens.isEmpty()) emptyList()
        else substitute.allergens.filter { itemAlg ->
            userAllergens.any { userAlg ->
                userAlg.equals(itemAlg, ignoreCase = true) || itemAlg.contains(userAlg, ignoreCase = true)
            }
        }
    }

    SqCard(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onSelect() },
        shape = RoundedCornerShape(8.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.3f)
        )
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(10.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            if (!substitute.imageUrl.isNullOrBlank()) {
                AsyncImage(
                    model = substitute.imageUrl,
                    contentDescription = substitute.title,
                    modifier = Modifier
                        .size(48.dp)
                        .clip(RoundedCornerShape(6.dp)),
                    contentScale = ContentScale.Crop
                )
                Spacer(modifier = Modifier.width(10.dp))
            }

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = substitute.title,
                    fontWeight = FontWeight.Medium,
                    fontSize = 13.sp,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        text = "${"%,d".format(substitute.currentPrice)} ₫",
                        fontWeight = FontWeight.Bold,
                        fontSize = 12.sp,
                        color = ForestGreenPrimary
                    )
                    if (substitute.discountPercent > 0) {
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            text = "-${substitute.discountPercent}%",
                            fontSize = 10.sp,
                            color = CoralRed,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }
                if (conflicts.isNotEmpty()) {
                    Text(
                        text = "⚠️ Chứa: ${conflicts.joinToString(", ")}",
                        fontSize = 10.sp,
                        color = CoralRed
                    )
                }
            }

            Button(
                onClick = onSelect,
                shape = RoundedCornerShape(16.dp),
                contentPadding = PaddingValues(horizontal = 12.dp, vertical = 4.dp),
                colors = ButtonDefaults.buttonColors(containerColor = ForestGreenPrimary)
            ) {
                Text("Chọn", fontSize = 12.sp)
            }
        }
    }
}
