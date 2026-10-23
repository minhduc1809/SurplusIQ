package com.surplusiq.app.ui.screens.basket

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.ErrorOutline
import androidx.compose.material.icons.filled.Storefront
import androidx.compose.material.icons.filled.Timer
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.surplusiq.app.domain.model.BasketCustomItem
import com.surplusiq.app.domain.model.BasketHoldResult
import com.surplusiq.app.ui.theme.CoralRed
import com.surplusiq.app.ui.theme.DividerColor
import com.surplusiq.app.ui.theme.SkyBluePrimary
import com.surplusiq.app.ui.theme.SurfaceSubtle
import com.surplusiq.app.ui.theme.TextPrimary
import com.surplusiq.app.ui.theme.TextSecondary
import kotlinx.coroutines.delay
import java.time.Instant
import java.time.temporal.ChronoUnit

/**
 * Đặt giữ giỏ cứu (KC04): xem lại món, chọn khung giờ nhận, ghi chú rồi giữ giỏ nguyên tử trong 10 phút.
 * Điện thoại: một cột. Từ 840dp: thông tin nhận hàng bên trái, món và thanh toán bên phải.
 */
@OptIn(ExperimentalLayoutApi::class)
@Composable
fun BasketCheckoutScreen(
    storeName: String,
    items: List<BasketCustomItem>,
    isCheckingOut: Boolean,
    checkoutResult: BasketHoldResult?,
    checkoutError: String?,
    onBackClick: () -> Unit,
    onConfirmCheckout: (pickupWindow: String?, notes: String?) -> Unit,
    onNavigateToMyOrders: () -> Unit,
    modifier: Modifier = Modifier
) {
    var notes by remember { mutableStateOf("") }
    val totalAmount = remember(items) { items.sumOf { it.price * it.quantity } }

    // Đếm ngược theo hạn giữ thật của máy chủ; không đọc được thì dùng 10 phút mặc định của luật giữ suất.
    var remainingSeconds by remember(checkoutResult?.holdExpiresAt) {
        val seconds = checkoutResult?.holdExpiresAt?.let {
            runCatching { ChronoUnit.SECONDS.between(Instant.now(), Instant.parse(it)) }.getOrNull()?.takeIf { s -> s > 0 }
        } ?: 600L
        mutableLongStateOf(seconds)
    }
    LaunchedEffect(checkoutResult) {
        if (checkoutResult != null) while (remainingSeconds > 0) { delay(1000); remainingSeconds-- }
    }

    BasketFrame(
        title = if (checkoutResult != null) "Đã giữ giỏ" else "Xác nhận đặt giữ",
        subtitle = storeName,
        onBack = onBackClick,
        modifier = modifier,
        bottomBar = {
            if (checkoutResult != null) {
                PrimaryAction("Xem đơn hàng của tôi", modifier = Modifier.fillMaxWidth(), onClick = onNavigateToMyOrders)
            } else {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Column(Modifier.weight(1f).padding(end = 12.dp)) {
                        Text("Tổng thanh toán", fontSize = 11.sp, color = TextSecondary)
                        Text(vnd(totalAmount), fontSize = 20.sp, fontWeight = FontWeight.ExtraBold, color = TextPrimary, maxLines = 1)
                    }
                    PrimaryAction(
                        "Giữ giỏ 10 phút",
                        enabled = items.isNotEmpty(),
                        loading = isCheckingOut,
                        onClick = { onConfirmCheckout(null, notes.trim().takeIf { it.isNotBlank() }) }
                    )
                }
            }
        }
    ) { inner ->
        BoxWithConstraints(Modifier.padding(inner).fillMaxSize(), contentAlignment = Alignment.TopCenter) {
            val wide = maxWidth >= WIDE_BREAKPOINT

            val receiveCard: @Composable ColumnScope.() -> Unit = {
                BasketCardBox {
                    SectionLabel("Ghi chú cho quán")
                    Spacer(Modifier.height(10.dp))
                    OutlinedTextField(
                        value = notes, onValueChange = { notes = it.take(200) },
                        label = { Text("Tùy chọn") },
                        placeholder = { Text("Ví dụ: không hành, thêm đũa") },
                        supportingText = { Text("${notes.length}/200", modifier = Modifier.fillMaxWidth(), textAlign = TextAlign.End) },
                        modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(14.dp), maxLines = 3
                    )
                }
                Row(Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(CoralWash).padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.Timer, contentDescription = null, tint = SkyBluePrimary, modifier = Modifier.size(20.dp))
                    Spacer(Modifier.width(10.dp))
                    Text("Suất được giữ 10 phút, nhận hàng theo khung giờ của từng suất. Quá hạn mà chưa thanh toán, suất tự trả lại.", fontSize = 12.sp, color = TextPrimary, lineHeight = 17.sp)
                }
            }

            val itemsCard: @Composable ColumnScope.() -> Unit = {
                BasketCardBox {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(Modifier.size(40.dp).clip(RoundedCornerShape(12.dp)).background(CoralWash), contentAlignment = Alignment.Center) {
                            Icon(Icons.Default.Storefront, contentDescription = null, tint = SkyBluePrimary)
                        }
                        Spacer(Modifier.width(12.dp))
                        Column {
                            Text("Quán cung ứng", fontSize = 11.sp, color = TextSecondary)
                            Text(storeName, fontWeight = FontWeight.ExtraBold, fontSize = 15.sp, color = TextPrimary)
                        }
                    }
                    Spacer(Modifier.height(14.dp))
                    HorizontalDivider(color = DividerColor)
                    Spacer(Modifier.height(10.dp))
                    SectionLabel("Món trong giỏ (${items.sumOf { it.quantity }})")
                    Spacer(Modifier.height(6.dp))
                    items.forEach { item -> LineRow("${item.title}", "${vnd(item.price)} x ${item.quantity}", vnd(item.price * item.quantity)) }
                    Spacer(Modifier.height(8.dp))
                    HorizontalDivider(color = DividerColor)
                    Spacer(Modifier.height(10.dp))
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                        Text("Tổng", fontWeight = FontWeight.Bold, fontSize = 14.sp, color = TextPrimary)
                        Text(vnd(totalAmount), fontWeight = FontWeight.ExtraBold, fontSize = 20.sp, color = SkyBluePrimary, maxLines = 1)
                    }
                }
            }

            val errorCard: @Composable ColumnScope.() -> Unit = {
                if (checkoutError != null) {
                    Row(Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(CoralRed.copy(alpha = 0.1f)).padding(14.dp), verticalAlignment = Alignment.Top) {
                        Icon(Icons.Default.ErrorOutline, contentDescription = null, tint = CoralRed, modifier = Modifier.size(22.dp))
                        Spacer(Modifier.width(10.dp))
                        Column {
                            Text("Không thể giữ giỏ", fontWeight = FontWeight.Bold, fontSize = 13.sp, color = CoralRed)
                            Text(checkoutError, fontSize = 12.sp, color = TextPrimary)
                        }
                    }
                }
            }

            val successCards: @Composable ColumnScope.() -> Unit = {
                val r = checkoutResult
                if (r != null) {
                    Column(
                        Modifier.fillMaxWidth().clip(RoundedCornerShape(20.dp)).background(CoralWash).padding(20.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Icon(Icons.Default.CheckCircle, contentDescription = null, tint = SkyBluePrimary, modifier = Modifier.size(44.dp))
                        Spacer(Modifier.height(8.dp))
                        Text("Giỏ cứu đã được giữ", fontWeight = FontWeight.ExtraBold, fontSize = 18.sp, color = TextPrimary)
                        Text("Thanh toán hoặc đến nhận trước khi hết giờ giữ.", fontSize = 12.sp, color = TextSecondary, textAlign = TextAlign.Center, modifier = Modifier.padding(top = 4.dp))
                        Spacer(Modifier.height(14.dp))
                        Row(
                            Modifier.clip(RoundedCornerShape(50)).background(TextPrimary).padding(horizontal = 16.dp, vertical = 8.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(Icons.Default.Timer, contentDescription = null, tint = Color.White, modifier = Modifier.size(16.dp))
                            Spacer(Modifier.width(6.dp))
                            Text("Còn %02d:%02d".format(remainingSeconds / 60, remainingSeconds % 60), fontWeight = FontWeight.Bold, fontSize = 14.sp, color = Color.White)
                        }
                    }
                    BasketCardBox {
                        SectionLabel("Đã giữ (${r.orderIds.size} đơn)")
                        Spacer(Modifier.height(6.dp))
                        r.items.forEach { h -> LineRow(h.title, "x${h.quantity}", vnd(h.totalPrice)) }
                        Spacer(Modifier.height(8.dp))
                        HorizontalDivider(color = DividerColor)
                        Spacer(Modifier.height(10.dp))
                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                            Text("Tổng cộng", fontWeight = FontWeight.Bold, fontSize = 14.sp, color = TextPrimary)
                            Text(vnd(r.totalAmount), fontWeight = FontWeight.ExtraBold, fontSize = 20.sp, color = SkyBluePrimary, maxLines = 1)
                        }
                    }
                }
            }

            when {
                checkoutResult != null -> Column(
                    Modifier.widthIn(max = CONTENT_MAX_WIDTH).fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(14.dp), content = successCards
                )
                wide -> Row(
                    Modifier.widthIn(max = WIDE_MAX_WIDTH).fillMaxSize().padding(16.dp),
                    horizontalArrangement = Arrangement.spacedBy(20.dp)
                ) {
                    Column(Modifier.weight(0.5f).verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(14.dp)) { errorCard(); receiveCard() }
                    Column(Modifier.weight(0.5f).verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(14.dp), content = itemsCard)
                }
                else -> Column(
                    Modifier.widthIn(max = CONTENT_MAX_WIDTH).fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(14.dp)
                ) { errorCard(); itemsCard(); receiveCard(); Spacer(Modifier.height(8.dp)) }
            }
        }
    }
}

@Composable
private fun LineRow(title: String, detail: String, amount: String) {
    Row(Modifier.fillMaxWidth().padding(vertical = 5.dp), verticalAlignment = Alignment.Top) {
        Column(Modifier.weight(1f).padding(end = 12.dp)) {
            Text(title, fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = TextPrimary)
            Text(detail, fontSize = 12.sp, color = TextSecondary)
        }
        Text(amount, fontSize = 13.sp, fontWeight = FontWeight.Bold, color = TextPrimary, maxLines = 1)
    }
}
