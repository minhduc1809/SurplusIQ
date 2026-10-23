package com.surplusiq.app.ui.screens.basket

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
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
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.surplusiq.app.domain.model.BasketCustomItem
import com.surplusiq.app.domain.model.BasketSubstituteItem
import com.surplusiq.app.ui.theme.CoralRed
import com.surplusiq.app.ui.theme.DividerColor
import com.surplusiq.app.ui.theme.SkyBluePrimary
import com.surplusiq.app.ui.theme.SurfaceSubtle
import com.surplusiq.app.ui.theme.TextMuted
import com.surplusiq.app.ui.theme.TextPrimary
import com.surplusiq.app.ui.theme.TextSecondary

/**
 * Chi tiết giỏ cứu (KC03): đổi số lượng, xóa món, thay bằng suất khác cùng quán trước khi đặt giữ.
 * Điện thoại: danh sách món rồi tóm tắt. Từ 840dp: danh sách bên trái, tóm tắt cố định bên phải.
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
    val totalCount = remember(items) { items.sumOf { it.quantity } }

    BasketFrame(
        title = "Chi tiết giỏ cứu",
        subtitle = storeName,
        onBack = onBackClick,
        modifier = modifier,
        bottomBar = if (items.isEmpty()) null else ({
            Row(verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f).padding(end = 12.dp)) {
                    Text("Tổng tạm tính ($totalCount món)", fontSize = 11.sp, color = TextSecondary)
                    Text(vnd(totalAmount), fontSize = 20.sp, fontWeight = FontWeight.ExtraBold, color = TextPrimary, maxLines = 1)
                }
                PrimaryAction("Đặt giữ giỏ", onClick = onProceedToCheckout)
            }
        })
    ) { inner ->
        if (items.isEmpty()) {
            Column(Modifier.padding(inner).fillMaxSize().padding(32.dp), verticalArrangement = Arrangement.Center, horizontalAlignment = Alignment.CenterHorizontally) {
                Text("Giỏ cứu chưa có món nào", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                Spacer(Modifier.height(12.dp))
                OutlinedButton(onClick = onBackClick, shape = RoundedCornerShape(14.dp)) { Text("Chọn giỏ khác", color = SkyBluePrimary) }
            }
        } else {
            BoxWithConstraints(Modifier.padding(inner).fillMaxSize(), contentAlignment = Alignment.TopCenter) {
                val wide = maxWidth >= WIDE_BREAKPOINT
                val list: @Composable () -> Unit = {
                    LazyColumn(
                        Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(16.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        items(items, key = { it.offerId }) { item ->
                            val conflicts = remember(item.allergens, userAllergens) { conflictingAllergens(item.allergens, userAllergens) }
                            BasketItemCard(
                                item = item,
                                conflicts = conflicts,
                                onQuantityChange = { onQuantityChange(item.offerId, it) },
                                onRemove = { onRemoveItem(item.offerId) },
                                onSubstitute = { itemToSubstitute = item; onRequestSubstitutes() }
                            )
                        }
                        if (!wide) item { SummaryCard(storeName, items.size, totalCount, totalAmount) }
                    }
                }
                if (wide) {
                    Row(Modifier.widthIn(max = WIDE_MAX_WIDTH).fillMaxSize(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Box(Modifier.weight(0.6f)) { list() }
                        Column(Modifier.weight(0.4f).verticalScroll(rememberScrollState()).padding(16.dp)) {
                            SummaryCard(storeName, items.size, totalCount, totalAmount)
                        }
                    }
                } else {
                    Box(Modifier.widthIn(max = CONTENT_MAX_WIDTH).fillMaxSize()) { list() }
                }
            }
        }
    }

    itemToSubstitute?.let { target ->
        ModalBottomSheet(onDismissRequest = { itemToSubstitute = null }, sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)) {
            Column(Modifier.widthIn(max = CONTENT_MAX_WIDTH).fillMaxWidth().padding(horizontal = 20.dp, vertical = 8.dp).navigationBarsPadding()) {
                Text("Thay món", fontWeight = FontWeight.ExtraBold, fontSize = 20.sp, color = TextPrimary)
                Text("Các suất đang mở tại $storeName thay cho \"${target.title}\"", fontSize = 13.sp, color = TextSecondary, modifier = Modifier.padding(top = 2.dp))
                Spacer(Modifier.height(12.dp))
                when {
                    isSubstitutesLoading -> Box(Modifier.fillMaxWidth().padding(32.dp), contentAlignment = Alignment.Center) { CircularProgressIndicator(color = SkyBluePrimary) }
                    substitutesError != null -> Text(substitutesError, color = CoralRed, fontSize = 13.sp, modifier = Modifier.padding(16.dp))
                    availableSubstitutes.isEmpty() -> Box(Modifier.fillMaxWidth().padding(32.dp), contentAlignment = Alignment.Center) {
                        Text("Quán không còn suất nào khác để thay.", fontSize = 13.sp, color = TextSecondary)
                    }
                    else -> LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.heightIn(max = 420.dp)) {
                        items(availableSubstitutes, key = { it.id }) { sub ->
                            SubstituteRow(sub, userAllergens) { onApplySubstitute(target.offerId, sub); itemToSubstitute = null }
                        }
                    }
                }
                Spacer(Modifier.height(12.dp))
            }
        }
    }
}

private fun conflictingAllergens(itemAllergens: List<String>, userAllergens: List<String>): List<String> =
    if (userAllergens.isEmpty()) emptyList()
    else itemAllergens.filter { a -> userAllergens.any { u -> u.equals(a, ignoreCase = true) || a.contains(u, ignoreCase = true) } }

@Composable
private fun SummaryCard(storeName: String, lineCount: Int, totalCount: Int, totalAmount: Int) {
    BasketCardBox {
        SectionLabel("Tóm tắt giỏ")
        Spacer(Modifier.height(10.dp))
        SummaryRow("Cửa hàng", storeName)
        SummaryRow("Số món", "$lineCount loại, $totalCount suất")
        Spacer(Modifier.height(10.dp))
        HorizontalDivider(color = DividerColor)
        Spacer(Modifier.height(10.dp))
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
            Text("Tạm tính", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
            Text(vnd(totalAmount), fontSize = 20.sp, fontWeight = FontWeight.ExtraBold, color = SkyBluePrimary, maxLines = 1)
        }
        MutedText("Đổi số lượng, xóa hoặc thay món cùng quán trước khi đặt giữ.", Modifier.padding(top = 8.dp))
    }
}

@Composable
private fun SummaryRow(label: String, value: String) {
    Row(Modifier.fillMaxWidth().padding(vertical = 3.dp), horizontalArrangement = Arrangement.SpaceBetween) {
        Text(label, fontSize = 13.sp, color = TextSecondary)
        Text(value, fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = TextPrimary, modifier = Modifier.weight(1f).padding(start = 12.dp), textAlign = androidx.compose.ui.text.style.TextAlign.End)
    }
}

@Composable
private fun BasketItemCard(
    item: BasketCustomItem,
    conflicts: List<String>,
    onQuantityChange: (Int) -> Unit,
    onRemove: () -> Unit,
    onSubstitute: () -> Unit
) {
    BasketCardBox {
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.Top) {
            Box(Modifier.size(72.dp).clip(RoundedCornerShape(14.dp)).background(SurfaceSubtle)) {
                if (!item.imageUrl.isNullOrBlank()) {
                    AsyncImage(model = item.imageUrl, contentDescription = item.title, contentScale = ContentScale.Crop, modifier = Modifier.fillMaxSize())
                }
            }
            Spacer(Modifier.width(12.dp))
            Column(Modifier.weight(1f)) {
                Text(item.title, fontWeight = FontWeight.Bold, fontSize = 14.sp, color = TextPrimary, maxLines = 2, overflow = TextOverflow.Ellipsis)
                Text(vnd(item.price), fontWeight = FontWeight.ExtraBold, fontSize = 15.sp, color = SkyBluePrimary, modifier = Modifier.padding(top = 4.dp))
                if (conflicts.isNotEmpty()) {
                    Row(
                        Modifier.padding(top = 6.dp).clip(RoundedCornerShape(8.dp)).background(CoralRed.copy(alpha = 0.1f)).padding(horizontal = 8.dp, vertical = 3.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(Icons.Default.Warning, contentDescription = null, tint = CoralRed, modifier = Modifier.size(12.dp))
                        Spacer(Modifier.width(4.dp))
                        Text("Dị ứng: ${conflicts.joinToString(", ")}", fontSize = 11.sp, color = CoralRed, fontWeight = FontWeight.Medium)
                    }
                }
            }
        }
        Spacer(Modifier.height(12.dp))
        HorizontalDivider(color = DividerColor)
        Spacer(Modifier.height(8.dp))
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
            TextButton(onClick = onSubstitute, contentPadding = PaddingValues(horizontal = 4.dp)) {
                Icon(Icons.Default.SwapHoriz, contentDescription = null, tint = SkyBluePrimary, modifier = Modifier.size(18.dp))
                Spacer(Modifier.width(6.dp))
                Text("Thay món", fontSize = 13.sp, color = SkyBluePrimary, fontWeight = FontWeight.SemiBold)
            }
            Row(Modifier.clip(RoundedCornerShape(50)).background(SurfaceSubtle), verticalAlignment = Alignment.CenterVertically) {
                IconButton(onClick = { if (item.quantity > 1) onQuantityChange(item.quantity - 1) else onRemove() }, modifier = Modifier.size(40.dp)) {
                    Icon(if (item.quantity > 1) Icons.Default.Remove else Icons.Default.Delete, contentDescription = if (item.quantity > 1) "Giảm" else "Xóa món", tint = if (item.quantity > 1) TextPrimary else CoralRed, modifier = Modifier.size(18.dp))
                }
                Text("${item.quantity}", fontWeight = FontWeight.ExtraBold, fontSize = 15.sp, color = TextPrimary, modifier = Modifier.widthIn(min = 24.dp), textAlign = androidx.compose.ui.text.style.TextAlign.Center)
                IconButton(onClick = { onQuantityChange(item.quantity + 1) }, modifier = Modifier.size(40.dp)) {
                    Icon(Icons.Default.Add, contentDescription = "Tăng", tint = TextPrimary, modifier = Modifier.size(18.dp))
                }
            }
        }
    }
}

@Composable
private fun SubstituteRow(substitute: BasketSubstituteItem, userAllergens: List<String>, onSelect: () -> Unit) {
    val conflicts = remember(substitute.allergens, userAllergens) { conflictingAllergens(substitute.allergens, userAllergens) }
    Row(
        Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).border(1.dp, DividerColor, RoundedCornerShape(16.dp)).clickable(onClick = onSelect).padding(10.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(Modifier.size(52.dp).clip(RoundedCornerShape(12.dp)).background(SurfaceSubtle)) {
            if (!substitute.imageUrl.isNullOrBlank()) {
                AsyncImage(model = substitute.imageUrl, contentDescription = substitute.title, contentScale = ContentScale.Crop, modifier = Modifier.fillMaxSize())
            }
        }
        Spacer(Modifier.width(10.dp))
        Column(Modifier.weight(1f)) {
            Text(substitute.title, fontWeight = FontWeight.SemiBold, fontSize = 13.sp, color = TextPrimary, maxLines = 2, overflow = TextOverflow.Ellipsis)
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(vnd(substitute.currentPrice), fontWeight = FontWeight.ExtraBold, fontSize = 13.sp, color = SkyBluePrimary)
                if (substitute.discountPercent > 0) Text("  -${substitute.discountPercent}%", fontSize = 11.sp, color = TextMuted, fontWeight = FontWeight.Bold)
            }
            if (conflicts.isNotEmpty()) Text("Chứa: ${conflicts.joinToString(", ")}", fontSize = 11.sp, color = CoralRed)
        }
        Spacer(Modifier.width(8.dp))
        Button(onClick = onSelect, shape = RoundedCornerShape(14.dp), colors = ButtonDefaults.buttonColors(containerColor = SkyBluePrimary), contentPadding = PaddingValues(horizontal = 14.dp)) {
            Text("Chọn", fontSize = 13.sp, color = androidx.compose.ui.graphics.Color.White)
        }
    }
}
