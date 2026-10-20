package com.surplusiq.merchant.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.ErrorOutline
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.filled.VisibilityOff
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.focus.onFocusEvent
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.surplusiq.merchant.ui.theme.*

/** Khối trắng kiểu NutriWise: bo góc, viền nhạt, bóng ấm mềm. */
fun Modifier.sqSurface(radius: androidx.compose.ui.unit.Dp = 22.dp, elevation: androidx.compose.ui.unit.Dp = 4.dp): Modifier {
    val shape = RoundedCornerShape(radius)
    return this
        .shadow(elevation, shape, ambientColor = SqWarmShadow, spotColor = SqWarmShadow)
        .clip(shape)
        .background(SqSurface)
        .border(1.dp, SqLine, shape)
}

/** SqStatusBadge rule 6.3 - luôn có label, không chỉ chấm màu. */
private val STATUS_MAP = mapOf(
    "OPEN" to (SqMintWash to SqMintDeep to "Đang nhận đặt"),
    "SOLD_OUT" to (SqSurfaceSoft to SqInkMuted to "Đã hết"),
    "CLOSED" to (SqSurfaceSoft to SqInkMuted to "Đã đóng"),
    "CANCELLED" to (SqCoralWash to SqCoralDeep to "Đã hủy"),
    "DRAFT" to (SqSurfaceSoft to SqInkMuted to "Nháp"),
    "PENDING_PAYMENT" to (SqLilacWash to SqCoralDeep to "Chờ thanh toán"),
    "PAID" to (SqMintWash to SqMintDeep to "Đã thanh toán"),
    "PICKED_UP" to (SqMintWash to SqMintDeep to "Đã nhận hàng"),
    "PICKUP_EXPIRED" to (SqSurfaceSoft to SqInkMuted to "Quá hạn nhận"),
    "REFUNDED" to (SqCoralWash to SqCoralDeep to "Đã hoàn tiền"),
    "ACTIVE" to (SqMintWash to SqMintDeep to "Hoạt động"),
    "ARCHIVED" to (SqSurfaceSoft to SqInkMuted to "Đã lưu trữ"),
)

@Composable
fun StatusBadge(status: String) {
    val (bgFg, label) = STATUS_MAP[status] ?: ((SqSurfaceSoft to SqInkSoft) to status)
    val (bg, fg) = bgFg
    Box(
        modifier = Modifier.clip(RoundedCornerShape(50)).background(bg).padding(horizontal = 10.dp, vertical = 4.dp)
    ) {
        Text(text = label, fontSize = 12.sp, fontWeight = FontWeight.Bold, color = fg)
    }
}

@Composable
fun FullScreenLoading() {
    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        CircularProgressIndicator(color = SqCoral)
    }
}

@Composable
fun ErrorState(message: String, onRetry: () -> Unit) {
    Column(
        modifier = Modifier.fillMaxWidth().padding(32.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Icon(Icons.Default.ErrorOutline, contentDescription = null, tint = SqError, modifier = Modifier.size(32.dp))
        Spacer(modifier = Modifier.height(12.dp))
        Text(text = message, fontSize = 14.sp, color = SqInk, textAlign = TextAlign.Center)
        Spacer(modifier = Modifier.height(16.dp))
        Button(onClick = onRetry, colors = ButtonDefaults.buttonColors(containerColor = SqCoral)) {
            Text("Thử lại")
        }
    }
}

@Composable
fun EmptyState(title: String, message: String) {
    Column(
        modifier = Modifier.fillMaxWidth().padding(32.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Box(modifier = Modifier.size(56.dp).clip(RoundedCornerShape(18.dp)).background(SqButterWash))
        Spacer(modifier = Modifier.height(12.dp))
        Text(text = title, fontSize = 16.sp, fontWeight = FontWeight.Bold, color = SqInk)
        Spacer(modifier = Modifier.height(4.dp))
        Text(text = message, fontSize = 13.sp, color = SqInkSoft, textAlign = TextAlign.Center)
    }
}

@Composable
fun MetricCard(
    label: String,
    value: String,
    accent: androidx.compose.ui.graphics.Color,
    modifier: Modifier = Modifier,
    icon: ImageVector? = null
) {
    Column(
        modifier = modifier
            .sqSurface(20.dp)
            .padding(16.dp)
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            if (icon != null) {
                Box(
                    modifier = Modifier.size(32.dp).clip(CircleShape).background(accent.copy(alpha = 0.15f)),
                    contentAlignment = Alignment.Center
                ) { Icon(icon, contentDescription = null, tint = accent, modifier = Modifier.size(18.dp)) }
            } else {
                Box(modifier = Modifier.size(10.dp).clip(CircleShape).background(accent))
            }
            Spacer(modifier = Modifier.width(8.dp))
            Text(text = label, fontSize = 12.sp, color = SqInkMuted, maxLines = 1, overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis)
        }
        Spacer(modifier = Modifier.height(10.dp))
        Text(text = value, fontSize = 22.sp, fontWeight = FontWeight.Bold, color = SqInk, maxLines = 1, overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis)
    }
}

fun currency(n: Long): String = "%,dđ".format(n).replace(",", ".")

/** Ô nhập của form xác thực/tài khoản (trước là private trong LoginScreen). */
@Composable
fun MerchantField(
    value: String,
    onValueChange: (String) -> Unit,
    placeholder: String,
    icon: ImageVector,
    keyboardType: KeyboardType = KeyboardType.Text,
    visualTransformation: VisualTransformation = VisualTransformation.None,
    enabled: Boolean = true,
    trailingIcon: (@Composable () -> Unit)? = null
) {
    var isFocused by remember { mutableStateOf(false) }
    val borderColor = if (isFocused) SqCoral else Color.Transparent

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .height(54.dp)
            .clip(RoundedCornerShape(14.dp))
            .background(SqSurfaceSoft)
            .border(1.5.dp, borderColor, RoundedCornerShape(14.dp))
            .padding(horizontal = 16.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(icon, contentDescription = null, tint = SqCoralDeep, modifier = Modifier.size(20.dp))
        Spacer(modifier = Modifier.width(12.dp))
        Box(modifier = Modifier.weight(1f)) {
            BasicTextField(
                value = value,
                onValueChange = onValueChange,
                singleLine = true,
                enabled = enabled,
                textStyle = TextStyle(fontSize = 15.sp, color = if (enabled) SqInk else SqInkMuted, fontWeight = FontWeight.Medium),
                cursorBrush = SolidColor(SqCoral),
                keyboardOptions = KeyboardOptions(keyboardType = keyboardType),
                visualTransformation = visualTransformation,
                modifier = Modifier.fillMaxWidth().onFocusEvent { isFocused = it.isFocused },
                decorationBox = { inner ->
                    if (value.isEmpty()) Text(text = placeholder, fontSize = 15.sp, color = SqInkMuted)
                    inner()
                }
            )
        }
        trailingIcon?.invoke()
    }
}

@Composable
fun PasswordField(value: String, onValueChange: (String) -> Unit, placeholder: String = "Mật khẩu") {
    var visible by remember { mutableStateOf(false) }
    MerchantField(
        value = value,
        onValueChange = onValueChange,
        placeholder = placeholder,
        icon = Icons.Default.Lock,
        keyboardType = KeyboardType.Password,
        visualTransformation = if (visible) VisualTransformation.None else PasswordVisualTransformation(),
        trailingIcon = {
            IconButton(onClick = { visible = !visible }) {
                Icon(
                    imageVector = if (visible) Icons.Default.Visibility else Icons.Default.VisibilityOff,
                    contentDescription = if (visible) "Ẩn mật khẩu" else "Hiện mật khẩu",
                    tint = SqInkMuted
                )
            }
        }
    )
}

@Composable
fun ErrorBanner(message: String) {
    Row(
        modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp)).background(SqCoralWash).padding(12.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(Icons.Default.ErrorOutline, contentDescription = null, tint = SqCoralDeep, modifier = Modifier.size(18.dp))
        Spacer(modifier = Modifier.width(8.dp))
        Text(text = message, color = SqCoralDeep, fontSize = 12.sp, fontWeight = FontWeight.Medium)
    }
}

@Composable
fun InfoBanner(message: String) {
    Text(
        text = message,
        color = SqMintDeep,
        fontSize = 12.sp,
        fontWeight = FontWeight.Medium,
        modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp)).background(SqMintWash).padding(12.dp)
    )
}

@Composable
fun PrimaryButton(text: String, onClick: () -> Unit, enabled: Boolean = true, loading: Boolean = false) {
    Button(
        onClick = onClick,
        enabled = enabled && !loading,
        modifier = Modifier.fillMaxWidth().height(54.dp),
        shape = RoundedCornerShape(27.dp),
        colors = ButtonDefaults.buttonColors(containerColor = SqCoral, disabledContainerColor = SqCoral.copy(alpha = 0.5f))
    ) {
        if (loading) {
            CircularProgressIndicator(color = Color.White, strokeWidth = 2.5.dp, modifier = Modifier.size(22.dp))
        } else {
            Text(text = text, fontSize = 16.sp, fontWeight = FontWeight.Bold, color = Color.White)
        }
    }
}

/** Khung chung cho các màn xác thực phụ: nút quay lại + thẻ trắng cuộn được. */
@Composable
fun AuthCard(onBackClick: () -> Unit, content: @Composable ColumnScope.() -> Unit) {
    Box(modifier = Modifier.fillMaxSize().background(SqCanvas)) {
        IconButton(
            onClick = onBackClick,
            modifier = Modifier.padding(top = 48.dp, start = 20.dp).size(40.dp).clip(CircleShape).background(SqSurfaceSoft)
        ) {
            Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Quay lại", tint = SqCoralDeep)
        }
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(top = 108.dp, bottom = 32.dp)
                .padding(horizontal = 20.dp)
                .verticalScroll(rememberScrollState())
        ) {
            Column(
                modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(28.dp)).background(SqSurface).border(1.dp, SqLine, RoundedCornerShape(28.dp)).padding(24.dp),
                content = content
            )
        }
    }
}

/** Mật khẩu: tối thiểu 8 ký tự, có cả chữ và số; trả về lỗi hiển thị hoặc null nếu hợp lệ. */
fun passwordError(password: String, confirm: String): String? = when {
    password.length < 8 || password.none(Char::isLetter) || password.none(Char::isDigit) -> "Mật khẩu tối thiểu 8 ký tự, gồm cả chữ và số."
    password != confirm -> "Mật khẩu nhập lại không khớp."
    else -> null
}

/** Nhãn vai trò theo StorePermission. */
fun permissionLabel(permission: String?): String = when (permission) {
    "OWNER" -> "Chủ cửa hàng"
    "MANAGER" -> "Quản lý"
    "COUNTER" -> "Nhân viên quầy"
    else -> "Chưa rõ vai trò"
}
