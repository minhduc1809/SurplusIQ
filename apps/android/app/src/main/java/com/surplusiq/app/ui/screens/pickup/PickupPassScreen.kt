package com.surplusiq.app.ui.screens.pickup

import android.app.Activity
import android.content.ContextWrapper
import android.view.WindowManager
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.DirectionsWalk
import androidx.compose.material.icons.filled.BrightnessHigh
import androidx.compose.material.icons.filled.Call
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Directions
import androidx.compose.material.icons.filled.ErrorOutline
import androidx.compose.material.icons.filled.ReportProblem
import androidx.compose.material.icons.filled.Star
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.surplusiq.app.domain.model.ActiveOrder
import com.surplusiq.app.ui.theme.CoralRed
import com.surplusiq.app.ui.theme.ForestGreenDark
import com.surplusiq.app.ui.theme.ForestGreenPrimary
import com.surplusiq.app.ui.theme.TextMuted
import com.surplusiq.app.ui.theme.TextSecondary
import com.surplusiq.app.ui.util.rememberQrBitmap
import com.surplusiq.app.ui.viewmodel.PickupPassViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PickupPassScreen(
    order: ActiveOrder,
    onBackClick: () -> Unit,
    onNavigateToReview: ((ActiveOrder) -> Unit)? = null,
    onNavigateToComplaint: ((ActiveOrder) -> Unit)? = null,
    modifier: Modifier = Modifier,
    viewModel: PickupPassViewModel = hiltViewModel()
) {
    val context = LocalContext.current
    val haptic = LocalHapticFeedback.current
    val state by viewModel.uiState.collectAsState()

    LaunchedEffect(order.id) { viewModel.loadPickupPass(order.id) }

    LaunchedEffect(state.isPickedUp) {
        if (state.isPickedUp) haptic.performHapticFeedback(HapticFeedbackType.LongPress)
    }

    // BR-020: tăng sáng tối đa & giữ màn hình sáng để máy quét của quán dễ đọc mã.
    DisposableEffect(Unit) {
        val activity = context as? Activity
            ?: (context as? ContextWrapper)?.baseContext as? Activity
        val window = activity?.window
        val originalBrightness = window?.attributes?.screenBrightness
            ?: WindowManager.LayoutParams.BRIGHTNESS_OVERRIDE_NONE

        window?.let { win ->
            val layoutParams = win.attributes
            layoutParams.screenBrightness = WindowManager.LayoutParams.BRIGHTNESS_OVERRIDE_FULL
            win.attributes = layoutParams
            win.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        }

        onDispose {
            window?.let { win ->
                val layoutParams = win.attributes
                layoutParams.screenBrightness = originalBrightness
                win.attributes = layoutParams
                win.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
            }
        }
    }

    Column(modifier = modifier.fillMaxSize().background(MaterialTheme.colorScheme.background)) {
        TopAppBar(
            title = { Text(text = "Vé nhận hàng Cứu Món", fontWeight = FontWeight.Bold, fontSize = 18.sp) },
            navigationIcon = {
                IconButton(onClick = onBackClick) {
                    Icon(imageVector = Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Quay lại")
                }
            },
            actions = {
                Icon(
                    imageVector = Icons.Default.BrightnessHigh,
                    contentDescription = "Đã tăng sáng tối đa",
                    tint = ForestGreenPrimary,
                    modifier = Modifier.padding(end = 16.dp).size(22.dp)
                )
            },
            colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.surface)
        )

        Column(
            modifier = Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(20.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            when {
                state.isLoading -> Box(
                    modifier = Modifier.fillMaxWidth().padding(top = 60.dp),
                    contentAlignment = Alignment.Center
                ) { CircularProgressIndicator(color = ForestGreenPrimary) }

                state.errorMessage != null && state.passInfo == null -> PickupPassErrorCard(
                    message = state.errorMessage!!,
                    onRetry = { viewModel.loadPickupPass(order.id) }
                )

                state.passInfo != null -> PickupPassContent(
                    order = order,
                    qrToken = state.passInfo!!.qrToken,
                    backupPin = state.passInfo!!.fallbackPin,
                    isPickedUp = state.isPickedUp,
                    hasNotifiedArrival = state.hasNotifiedArrival,
                    onNotifyArriving = { viewModel.notifyArriving(order.id) },
                    onReviewClick = { onNavigateToReview?.invoke(order) },
                    onComplaintClick = { onNavigateToComplaint?.invoke(order) },
                    context = context
                )
            }
        }
    }
}

@Composable
private fun PickupPassErrorCard(message: String, onRetry: () -> Unit) {
    Column(
        modifier = Modifier.fillMaxWidth().padding(top = 48.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Icon(Icons.Default.ErrorOutline, contentDescription = null, tint = CoralRed, modifier = Modifier.size(32.dp))
        Spacer(modifier = Modifier.height(12.dp))
        Text(text = message, fontSize = 14.sp, textAlign = TextAlign.Center)
        Spacer(modifier = Modifier.height(16.dp))
        Button(onClick = onRetry, colors = ButtonDefaults.buttonColors(containerColor = ForestGreenPrimary)) {
            Text("Thử lại")
        }
    }
}

@Composable
private fun PickupPassContent(
    order: ActiveOrder,
    qrToken: String,
    backupPin: String,
    isPickedUp: Boolean,
    hasNotifiedArrival: Boolean,
    onNotifyArriving: () -> Unit,
    onReviewClick: () -> Unit,
    onComplaintClick: () -> Unit,
    context: android.content.Context
) {
    val qrBitmap = rememberQrBitmap(qrToken)

    // Banner tăng sáng (BR-020)
    Card(
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = ForestGreenPrimary.copy(alpha = 0.08f)),
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(modifier = Modifier.padding(horizontal = 14.dp, vertical = 10.dp), verticalAlignment = Alignment.CenterVertically) {
            Icon(Icons.Default.BrightnessHigh, contentDescription = null, tint = ForestGreenPrimary, modifier = Modifier.size(18.dp))
            Spacer(modifier = Modifier.width(10.dp))
            Text(
                text = "Màn hình đã tự động tăng sáng cực đại để máy quét của quán dễ đọc mã QR.",
                fontSize = 12.sp,
                color = ForestGreenDark,
                lineHeight = 16.sp
            )
        }
    }

    Spacer(modifier = Modifier.height(16.dp))

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(24.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 3.dp)
    ) {
        Column(modifier = Modifier.padding(24.dp), horizontalAlignment = Alignment.CenterHorizontally) {
            Text(
                text = if (isPickedUp) "ĐÃ NHẬN HÀNG THÀNH CÔNG" else "VÉ NHẬN HÀNG HỢP LỆ",
                fontSize = 13.sp,
                fontWeight = FontWeight.Bold,
                color = if (isPickedUp) ForestGreenPrimary else ForestGreenDark,
                letterSpacing = 1.sp
            )

            Spacer(modifier = Modifier.height(6.dp))
            Text(text = order.deal.storeName, fontSize = 20.sp, fontWeight = FontWeight.Bold, textAlign = TextAlign.Center)
            Spacer(modifier = Modifier.height(18.dp))

            Box(
                modifier = Modifier.size(210.dp).clip(RoundedCornerShape(16.dp)).background(Color.White)
                    .border(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.2f), RoundedCornerShape(16.dp)),
                contentAlignment = Alignment.Center
            ) {
                when {
                    isPickedUp -> Icon(
                        imageVector = Icons.Default.CheckCircle,
                        contentDescription = "Đã nhận hàng",
                        tint = ForestGreenPrimary,
                        modifier = Modifier.size(120.dp)
                    )
                    qrBitmap != null -> Image(
                        bitmap = qrBitmap.asImageBitmap(),
                        contentDescription = "Mã QR nhận hàng",
                        modifier = Modifier.size(190.dp)
                    )
                    else -> Text(
                        text = "Không tạo được mã QR. Dùng mã dự phòng bên dưới.",
                        fontSize = 12.sp,
                        color = TextMuted,
                        textAlign = TextAlign.Center,
                        modifier = Modifier.padding(16.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.height(14.dp))

            Box(
                modifier = Modifier.clip(RoundedCornerShape(8.dp))
                    .background(MaterialTheme.colorScheme.surfaceVariant)
                    .padding(horizontal = 14.dp, vertical = 6.dp)
            ) {
                Text(
                    text = "Mã dự phòng: $backupPin",
                    fontSize = 14.sp,
                    fontWeight = FontWeight.ExtraBold,
                    color = ForestGreenDark,
                    letterSpacing = 1.sp
                )
            }

            Spacer(modifier = Modifier.height(16.dp))
            HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.2f))
            Spacer(modifier = Modifier.height(14.dp))

            InfoRow("Mã đơn hàng:", "#${order.orderCode}")
            Spacer(modifier = Modifier.height(8.dp))
            InfoRow("Món:", "${order.deal.title} (x${order.quantity})")
            Spacer(modifier = Modifier.height(8.dp))
            InfoRow(
                "Tổng tiền:",
                "${String.format("%,d", order.totalPrice)} ₫",
                valueColor = ForestGreenPrimary,
                valueBold = true
            )
            Spacer(modifier = Modifier.height(8.dp))
            InfoRow("Khung giờ nhận:", order.pickupWindow)
        }
    }

    Spacer(modifier = Modifier.height(16.dp))

    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
        OutlinedButton(
            onClick = {
                com.surplusiq.app.ui.util.NavigationUtil.openMapOrCopyAddress(
                    context = context,
                    storeAddress = order.deal.storeAddress,
                    storeName = order.deal.storeName
                )
            },
            modifier = Modifier.weight(1f).height(44.dp),
            shape = RoundedCornerShape(12.dp)
        ) {
            Icon(imageVector = Icons.Default.Directions, contentDescription = null, modifier = Modifier.size(16.dp))
            Spacer(modifier = Modifier.width(6.dp))
            Text(text = "Chỉ đường", fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
        }

        OutlinedButton(
            onClick = {
                // Lưu ý đã biết: Deal hiện chưa có số điện thoại cửa hàng thật từ
                // backend, nên chưa thể gọi đúng số - ẩn đến khi có dữ liệu thật
                // thay vì gọi nhầm số cố định.
            },
            enabled = false,
            modifier = Modifier.weight(1f).height(44.dp),
            shape = RoundedCornerShape(12.dp)
        ) {
            Icon(imageVector = Icons.Default.Call, contentDescription = null, modifier = Modifier.size(16.dp))
            Spacer(modifier = Modifier.width(6.dp))
            Text(text = "Gọi quán", fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
        }
    }

    Spacer(modifier = Modifier.height(16.dp))

    if (!isPickedUp) {
        Button(
            onClick = onNotifyArriving,
            enabled = !hasNotifiedArrival,
            modifier = Modifier.fillMaxWidth().height(48.dp),
            shape = RoundedCornerShape(24.dp),
            colors = ButtonDefaults.buttonColors(containerColor = ForestGreenPrimary)
        ) {
            Icon(imageVector = Icons.AutoMirrored.Filled.DirectionsWalk, contentDescription = null, modifier = Modifier.size(18.dp))
            Spacer(modifier = Modifier.width(8.dp))
            Text(
                text = if (hasNotifiedArrival) "Đã thông báo quán: Bạn sắp đến!" else "Tôi sắp đến quán (Báo trước 1 lần)",
                fontSize = 14.sp,
                fontWeight = FontWeight.Bold
            )
        }

        Text(
            text = "Màn hình sẽ tự cập nhật khi quán quét mã nhận hàng cho bạn.",
            fontSize = 11.sp,
            color = TextMuted,
            textAlign = TextAlign.Center,
            modifier = Modifier.padding(top = 10.dp)
        )
    } else {
        Column(modifier = Modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Text(
                text = "Cảm ơn bạn đã cứu món! Hãy đánh giá hoặc báo vấn đề nếu có.",
                fontSize = 13.sp,
                color = TextSecondary,
                textAlign = TextAlign.Center,
                modifier = Modifier.fillMaxWidth()
            )
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp), modifier = Modifier.fillMaxWidth()) {
                OutlinedButton(onClick = onReviewClick, modifier = Modifier.weight(1f)) {
                    Icon(Icons.Default.Star, contentDescription = null, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(6.dp))
                    Text("Đánh giá")
                }
                OutlinedButton(onClick = onComplaintClick, modifier = Modifier.weight(1f)) {
                    Icon(Icons.Default.ReportProblem, contentDescription = null, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(6.dp))
                    Text("Khiếu nại")
                }
            }
        }
    }
}

@Composable
private fun InfoRow(
    label: String,
    value: String,
    valueColor: Color = Color.Unspecified,
    valueBold: Boolean = false
) {
    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
        Text(text = label, color = TextSecondary, fontSize = 13.sp)
        Text(
            text = value,
            fontWeight = if (valueBold) FontWeight.Bold else FontWeight.Medium,
            color = valueColor,
            fontSize = if (valueBold) 15.sp else 13.sp
        )
    }
}
