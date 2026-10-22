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
import com.surplusiq.merchant.ui.components.sqSurface
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import com.surplusiq.merchant.ui.theme.*

private val GROUPS = listOf(
    "Hồ sơ và vận hành" to listOf(
        Triple("store-profile", "Hồ sơ cửa hàng", "Tên, địa chỉ, SĐT, giờ mở cửa"),
        Triple("store-legal", "Hồ sơ kinh doanh và hợp đồng", "Thông tin pháp lý, hợp đồng hợp tác đã ký"),
        Triple("store-settings", "Cài đặt vận hành & quy tắc", "Khung giờ nhận, giá sàn, suất tối đa mỗi đơn"),
        Triple("store-pause", "Tạm ngưng / mở lại", "Dừng nhận đơn trong hôm nay"),
        Triple("store-schedule", "Lịch cửa hàng", "Ngày nghỉ và giờ đặc biệt"),
        Triple("data-export", "Xuất dữ liệu", "Đơn hàng, sao kê đối soát"),
        Triple("activity-log", "Nhật ký hoạt động", "Lịch sử thao tác 12 tháng"),
    ),
    "Trợ lý AI" to listOf(
        Triple("ai", "Trợ lý AI", "Hỏi đáp, báo cáo tuần, cảnh báo, đề xuất, nhật ký"),
    ),
    "Báo cáo và đối soát" to listOf(
        Triple("reports", "Báo cáo kinh doanh", "Hao hụt, thu hồi, theo món, theo giờ, so sánh kỳ"),
        Triple("reconciliation", "Đối soát và sao kê tuần", "Doanh thu, hoa hồng, thực nhận (chủ cửa hàng)"),
        Triple("impact", "Tác động môi trường", "Số suất cứu được và liên kết chia sẻ"),
    ),
    "Ưu đãi và chiến dịch" to listOf(
        Triple("promotions", "Ưu đãi", "Giảm % hoặc giảm tiền theo nhóm khách"),
        Triple("campaigns", "Chiến dịch thông báo", "Lên lịch gửi thông báo đến khách"),
    ),
    "Hỗ trợ" to listOf(
        Triple("support", "Yêu cầu hỗ trợ", "Gửi và trao đổi với bộ phận hỗ trợ nền tảng"),
    ),
    "Khách hàng" to listOf(
        Triple("customers", "Khách của cửa hàng", "Khách đã mua, phân nhóm, lượt yêu thích (ẩn danh)"),
        Triple("complaints", "Khiếu nại", "Xử lý trong hạn, hoàn tiền hoặc từ chối"),
        Triple("reviews", "Đánh giá của khách", "Xem và phản hồi công khai"),
    ),
    "Cứu hàng tồn" to listOf(
        Triple("rescue-timeline", "Suất sắp hết hạn", "Suất cứu món sắp đóng nhận, xếp theo nguy cơ tồn"),
        Triple("rescue-pool", "Mua chung theo đợt", "Gom nhu cầu của nhiều khách theo từng đợt"),
        Triple("rescue-bridge", "Bàn giao suất dư", "Bàn giao suất còn lại cho đơn vị tiếp nhận"),
        Triple("rescue-lab", "Phòng mô phỏng", "Mô phỏng mức giảm, so sánh kịch bản (Chuyên nghiệp)"),
    ),
    "Gói dịch vụ" to listOf(
        Triple("subscription", "Gói dịch vụ", "So sánh Cơ bản và Chuyên nghiệp"),
        Triple("invoices", "Hóa đơn gói", "Lịch sử thanh toán"),
        Triple("quotas", "Hạn mức sử dụng", "Đã dùng / còn lại"),
    ),
    "Dự báo và định giá" to listOf(
        Triple("forecast", "Dự báo số lượng", "Số nên làm cho ngày mai theo món (Chuyên nghiệp)"),
        Triple("forecast-actuals", "Số thực tế cuối ngày", "Số đã làm, bán tại quầy, giờ hết hàng (Chuyên nghiệp)"),
        Triple("special-events", "Sự kiện đặc biệt", "Lễ, khuyến mãi, ngày nghỉ (Chuyên nghiệp)"),
        Triple("forecast-trends", "Độ chính xác và xu hướng", "Xu hướng 7 ngày tới (Chuyên nghiệp)"),
        Triple("price-proposals", "Đề xuất giá theo giờ", "Duyệt giá giảm cho suất đang mở (Chuyên nghiệp)"),
        Triple("price-history", "Lịch sử quyết định giá", "Các lần đổi giá theo ngày (Chuyên nghiệp)"),
    ),
)

@Composable
fun StoreMenuScreen(onNavigate: (String) -> Unit, onBack: (() -> Unit)?, storeName: String = "", email: String = "") {
    Column(modifier = Modifier.fillMaxSize().background(SqCanvas).verticalScroll(rememberScrollState()).padding(20.dp)) {
        if (onBack != null) ScreenHeader("Cửa hàng", onBack)
        else {
            Text("Thêm", fontSize = 26.sp, fontWeight = FontWeight.ExtraBold, color = SqInk)
            Spacer(modifier = Modifier.height(12.dp))
            Row(
                modifier = Modifier.fillMaxWidth().sqSurface(20.dp, 3.dp).clickable { onNavigate("account") }.padding(16.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Box(Modifier.size(48.dp).clip(androidx.compose.foundation.shape.CircleShape).background(SqCoralWash), contentAlignment = Alignment.Center) {
                    Text(storeName.trim().take(1).ifEmpty { "?" }.uppercase(), fontWeight = FontWeight.Bold, color = SqCoral, fontSize = 18.sp)
                }
                Spacer(modifier = Modifier.width(12.dp))
                Column(modifier = Modifier.weight(1f)) {
                    Text(storeName.ifBlank { "Cửa hàng của bạn" }, fontSize = 16.sp, fontWeight = FontWeight.Bold, color = SqInk, maxLines = 1)
                    Text(email.ifBlank { "Tài khoản và bảo mật" }, fontSize = 12.sp, color = SqInkSoft, maxLines = 1)
                }
                Icon(Icons.AutoMirrored.Filled.KeyboardArrowRight, contentDescription = null, tint = SqInkMuted)
            }
        }
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
