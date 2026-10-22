package com.surplusiq.app.ui.screens.basket

import androidx.compose.animation.AnimatedVisibility
import com.surplusiq.app.ui.components.SqCard
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.ErrorOutline
import androidx.compose.material.icons.filled.Storefront
import androidx.compose.material.icons.filled.Timer
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.surplusiq.app.domain.model.BasketCustomItem
import com.surplusiq.app.domain.model.BasketHoldResult
import com.surplusiq.app.ui.theme.*
import kotlinx.coroutines.delay
import java.time.Instant
import java.time.temporal.ChronoUnit

/**
 * Màn hình Đặt giữ giỏ cứu (KC04):
 * - Kiểm tra trước khi đặt (tóm tắt danh sách món, thành tiền)
 * - Nhập ghi chú & khung giờ nhận hàng
 * - Đặt giữ giỏ nguyên tử (10 phút)
 * - Đếm ngược 10 phút sau khi giữ thành công
 * - Xử lý thông báo khi có món hết hàng (rollback nguyên tử)
 */
@OptIn(ExperimentalMaterial3Api::class)
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
    var pickupWindow by remember { mutableStateOf("Hôm nay trong 1-2 giờ tới") }
    var notes by remember { mutableStateOf("") }
    val totalAmount = remember(items) { items.sumOf { it.price * it.quantity } }

    // Đồng hồ đếm ngược 10 phút nếu đã hold thành công
    var remainingSeconds by remember(checkoutResult?.holdExpiresAt) {
        val seconds = if (checkoutResult?.holdExpiresAt != null) {
            try {
                val expires = Instant.parse(checkoutResult.holdExpiresAt)
                val diff = ChronoUnit.SECONDS.between(Instant.now(), expires)
                if (diff > 0) diff else 600L
            } catch (_: Exception) {
                600L
            }
        } else 600L
        mutableLongStateOf(seconds)
    }

    LaunchedEffect(checkoutResult) {
        if (checkoutResult != null) {
            while (remainingSeconds > 0) {
                delay(1000)
                remainingSeconds--
            }
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        text = if (checkoutResult != null) "Đặt giữ thành công" else "Xác nhận đặt giữ giỏ",
                        fontWeight = FontWeight.Bold,
                        fontSize = 17.sp,
                        color = MaterialTheme.colorScheme.onSurface
                    )
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
            Surface(
                tonalElevation = 8.dp,
                shadowElevation = 8.dp,
                color = MaterialTheme.colorScheme.surface
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 12.dp)
                        .navigationBarsPadding()
                ) {
                    if (checkoutResult != null) {
                        Button(
                            onClick = onNavigateToMyOrders,
                            shape = RoundedCornerShape(24.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = ForestGreenPrimary),
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(48.dp)
                        ) {
                            Text("Xem đơn hàng của tôi", fontWeight = FontWeight.Bold)
                        }
                    } else {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column {
                                Text("Tổng thanh toán", fontSize = 12.sp, color = TextSecondary)
                                Text(
                                    text = "${"%,d".format(totalAmount)} ₫",
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 18.sp,
                                    color = ForestGreenPrimary
                                )
                            }
                            Button(
                                onClick = {
                                    onConfirmCheckout(
                                        pickupWindow.takeIf { it.isNotBlank() },
                                        notes.takeIf { it.isNotBlank() }
                                    )
                                },
                                enabled = !isCheckingOut && items.isNotEmpty(),
                                shape = RoundedCornerShape(24.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = ForestGreenPrimary),
                                modifier = Modifier.height(48.dp)
                            ) {
                                if (isCheckingOut) {
                                    CircularProgressIndicator(
                                        color = MaterialTheme.colorScheme.onPrimary,
                                        modifier = Modifier.size(20.dp),
                                        strokeWidth = 2.dp
                                    )
                                } else {
                                    Text("Giữ giỏ 10 phút", fontWeight = FontWeight.Bold)
                                }
                            }
                        }
                    }
                }
            }
        },
        modifier = modifier
    ) { innerPadding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            // Trường hợp ĐÃ HOLD THÀNH CÔNG
            if (checkoutResult != null) {
                item {
                    SqCard(
                        colors = CardDefaults.cardColors(
                            containerColor = ForestGreenPrimary.copy(alpha = 0.1f)
                        ),
                        shape = RoundedCornerShape(16.dp)
                    ) {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(18.dp),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Icon(
                                imageVector = Icons.Default.CheckCircle,
                                contentDescription = null,
                                tint = ForestGreenPrimary,
                                modifier = Modifier.size(48.dp)
                            )
                            Spacer(modifier = Modifier.height(8.dp))
                            Text(
                                text = "Giỏ cứu đã được giữ chỗ!",
                                fontWeight = FontWeight.Bold,
                                fontSize = 17.sp,
                                color = ForestGreenPrimary
                            )
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(
                                text = "Quán đang chuẩn bị đơn cho bạn. Vui lòng hoàn tất thanh toán hoặc đến nhận trước khi hết giờ giữ chỗ.",
                                fontSize = 12.sp,
                                color = TextSecondary,
                                modifier = Modifier.padding(horizontal = 8.dp)
                            )

                            Spacer(modifier = Modifier.height(14.dp))
                            val minutes = remainingSeconds / 60
                            val seconds = remainingSeconds % 60
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                modifier = Modifier
                                    .clip(RoundedCornerShape(20.dp))
                                    .background(ForestGreenPrimary)
                                    .padding(horizontal = 14.dp, vertical = 6.dp)
                            ) {
                                Icon(
                                    imageVector = Icons.Default.Timer,
                                    contentDescription = null,
                                    tint = MaterialTheme.colorScheme.onPrimary,
                                    modifier = Modifier.size(16.dp)
                                )
                                Spacer(modifier = Modifier.width(6.dp))
                                Text(
                                    text = "Thời gian giữ còn: %02d:%02d".format(minutes, seconds),
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 13.sp,
                                    color = MaterialTheme.colorScheme.onPrimary
                                )
                            }
                        }
                    }
                }

                item {
                    SqCard(shape = RoundedCornerShape(12.dp)) {
                        Column(modifier = Modifier.padding(14.dp)) {
                            Text(
                                text = "Mã đơn hàng giữ chỗ (${checkoutResult.orderIds.size} đơn)",
                                fontWeight = FontWeight.Bold,
                                fontSize = 14.sp
                            )
                            Spacer(modifier = Modifier.height(6.dp))
                            checkoutResult.items.forEach { heldItem ->
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(vertical = 4.dp),
                                    horizontalArrangement = Arrangement.SpaceBetween
                                ) {
                                    Text(
                                        text = "${heldItem.title} x${heldItem.quantity}",
                                        fontSize = 13.sp,
                                        color = MaterialTheme.colorScheme.onSurface
                                    )
                                    Text(
                                        text = "${"%,d".format(heldItem.totalPrice)} ₫",
                                        fontWeight = FontWeight.SemiBold,
                                        fontSize = 13.sp,
                                        color = ForestGreenPrimary
                                    )
                                }
                            }
                            HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp))
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Text("Tổng cộng", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                                Text(
                                    text = "${"%,d".format(checkoutResult.totalAmount)} ₫",
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 15.sp,
                                    color = ForestGreenPrimary
                                )
                            }
                        }
                    }
                }
            } else {
                // Trường hợp CHƯA CHECKOUT
                if (checkoutError != null) {
                    item {
                        SqCard(
                            colors = CardDefaults.cardColors(
                                containerColor = CoralRed.copy(alpha = 0.1f)
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
                                    imageVector = Icons.Default.ErrorOutline,
                                    contentDescription = null,
                                    tint = CoralRed,
                                    modifier = Modifier.size(24.dp)
                                )
                                Spacer(modifier = Modifier.width(10.dp))
                                Column {
                                    Text(
                                        text = "Không thể giữ giỏ hàng",
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 13.sp,
                                        color = CoralRed
                                    )
                                    Text(
                                        text = checkoutError,
                                        fontSize = 12.sp,
                                        color = MaterialTheme.colorScheme.onSurface
                                    )
                                }
                            }
                        }
                    }
                }

                item {
                    SqCard(shape = RoundedCornerShape(12.dp)) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(14.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                imageVector = Icons.Default.Storefront,
                                contentDescription = null,
                                tint = ForestGreenPrimary,
                                modifier = Modifier.size(24.dp)
                            )
                            Spacer(modifier = Modifier.width(12.dp))
                            Column {
                                Text(
                                    text = "Quán cung ứng",
                                    fontSize = 11.sp,
                                    color = TextSecondary
                                )
                                Text(
                                    text = storeName,
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 15.sp,
                                    color = MaterialTheme.colorScheme.onSurface
                                )
                            }
                        }
                    }
                }

                item {
                    SqCard(shape = RoundedCornerShape(12.dp)) {
                        Column(modifier = Modifier.padding(14.dp)) {
                            Text(
                                text = "Món trong giỏ (${items.sumOf { it.quantity }})",
                                fontWeight = FontWeight.Bold,
                                fontSize = 14.sp
                            )
                            Spacer(modifier = Modifier.height(8.dp))
                            items.forEach { item ->
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(vertical = 4.dp),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text(
                                            text = item.title,
                                            fontSize = 13.sp,
                                            fontWeight = FontWeight.Medium
                                        )
                                        Text(
                                            text = "${"%,d".format(item.price)} ₫ x ${item.quantity}",
                                            fontSize = 12.sp,
                                            color = TextSecondary
                                        )
                                    }
                                    Text(
                                        text = "${"%,d".format(item.price * item.quantity)} ₫",
                                        fontWeight = FontWeight.SemiBold,
                                        fontSize = 13.sp,
                                        color = MaterialTheme.colorScheme.onSurface
                                    )
                                }
                            }
                        }
                    }
                }

                item {
                    SqCard(shape = RoundedCornerShape(12.dp)) {
                        Column(modifier = Modifier.padding(14.dp)) {
                            Text(
                                text = "Thông tin nhận hàng",
                                fontWeight = FontWeight.Bold,
                                fontSize = 14.sp
                            )
                            Spacer(modifier = Modifier.height(10.dp))
                            OutlinedTextField(
                                value = pickupWindow,
                                onValueChange = { pickupWindow = it },
                                label = { Text("Khung giờ nhận dự kiến") },
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(8.dp)
                            )
                            Spacer(modifier = Modifier.height(10.dp))
                            OutlinedTextField(
                                value = notes,
                                onValueChange = { notes = it },
                                label = { Text("Ghi chú cho quán (tùy chọn)") },
                                placeholder = { Text("Ví dụ: Không hành, lấy muỗng đũa...") },
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(8.dp),
                                maxLines = 3
                            )
                        }
                    }
                }

                item {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(8.dp))
                            .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f))
                            .padding(12.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            imageVector = Icons.Default.Timer,
                            contentDescription = null,
                            tint = ForestGreenPrimary,
                            modifier = Modifier.size(20.dp)
                        )
                        Spacer(modifier = Modifier.width(10.dp))
                        Text(
                            text = "Hệ thống sẽ giữ suất cho bạn trong 10 phút. Nếu không đến nhận hoặc thanh toán trước hạn, suất sẽ tự động giải phóng.",
                            fontSize = 12.sp,
                            color = TextSecondary
                        )
                    }
                }
            }
        }
    }
}
