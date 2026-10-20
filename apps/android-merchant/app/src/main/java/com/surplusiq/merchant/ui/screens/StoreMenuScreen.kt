package com.surplusiq.merchant.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.surplusiq.merchant.ui.components.ScreenHeader
import com.surplusiq.merchant.ui.theme.*

private val GROUPS = listOf(
    "Hồ sơ và vận hành" to listOf(
        Triple("store-profile", "Hồ sơ cửa hàng", "Tên, địa chỉ, SĐT, giờ mở cửa"),
        Triple("store-settings", "Cài đặt vận hành & quy tắc", "Khung giờ nhận, giá sàn, suất tối đa mỗi đơn"),
        Triple("store-pause", "Tạm ngưng / mở lại", "Dừng nhận đơn trong hôm nay"),
        Triple("store-schedule", "Lịch cửa hàng", "Ngày nghỉ và giờ đặc biệt"),
        Triple("data-export", "Xuất dữ liệu", "Đơn hàng, sao kê đối soát"),
        Triple("activity-log", "Nhật ký hoạt động", "Lịch sử thao tác 12 tháng"),
    ),
    "Rescue" to listOf(
        Triple("rescue-timeline", "Rescue Timeline", "Lô cần xử lý trước theo nguy cơ hết hạn"),
        Triple("rescue-pool", "Rescue Pool", "Gom nhu cầu mua chung theo đợt"),
        Triple("rescue-bridge", "Rescue Bridge", "Bàn giao suất còn lại cho đơn vị tiếp nhận"),
    ),
    "Gói dịch vụ" to listOf(
        Triple("subscription", "Gói dịch vụ", "So sánh Cơ bản và Pro"),
        Triple("invoices", "Hóa đơn gói", "Lịch sử thanh toán"),
        Triple("quotas", "Hạn mức sử dụng", "Đã dùng / còn lại"),
    ),
    "Dự báo và định giá" to listOf(
        Triple("forecast", "Dự báo số lượng", "Số nên làm cho ngày mai theo món (Pro)"),
        Triple("forecast-actuals", "Số thực tế cuối ngày", "Số đã làm, bán tại quầy, giờ hết hàng"),
        Triple("special-events", "Sự kiện đặc biệt", "Lễ, khuyến mãi, ngày nghỉ"),
        Triple("forecast-trends", "Độ chính xác và xu hướng", "Xu hướng 7 ngày tới (Pro)"),
        Triple("price-proposals", "Đề xuất giá theo giờ", "Duyệt giá giảm cho suất đang mở (Pro)"),
        Triple("price-history", "Lịch sử quyết định giá", "Các lần đổi giá theo ngày"),
    ),
)

@Composable
fun StoreMenuScreen(onNavigate: (String) -> Unit, onBack: () -> Unit) {
    Column(modifier = Modifier.fillMaxSize().background(SqCanvas).verticalScroll(rememberScrollState()).padding(20.dp)) {
        ScreenHeader("Cửa hàng", onBack)
        GROUPS.forEach { (group, rows) ->
            Spacer(modifier = Modifier.height(16.dp))
            Text(text = group, fontSize = 13.sp, fontWeight = FontWeight.Bold, color = SqInkMuted)
            Spacer(modifier = Modifier.height(8.dp))
            Column(modifier = Modifier.clip(RoundedCornerShape(16.dp)).background(SqSurface)) {
                rows.forEach { (route, title, subtitle) ->
                    Row(
                        modifier = Modifier.fillMaxWidth().clickable { onNavigate(route) }.padding(16.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(text = title, fontSize = 15.sp, fontWeight = FontWeight.SemiBold, color = SqInk)
                            Text(text = subtitle, fontSize = 12.sp, color = SqInkSoft)
                        }
                        Icon(Icons.AutoMirrored.Filled.KeyboardArrowRight, contentDescription = null, tint = SqInkMuted)
                    }
                }
            }
        }
    }
}
