package com.surplusiq.app.ui.screens.postpurchase

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.RateReview
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import com.surplusiq.app.ui.components.BackTopBar
import com.surplusiq.app.ui.components.EmptyState

/**
 * K38 - Đánh giá của tôi. Backend có PUT/DELETE customer/reviews/:id (DELETE = ẩn, status HIDDEN,
 * không xóa vĩnh viễn) nhưng CHƯA có API liệt kê đánh giá của khách, nên không thể hiển thị danh
 * sách thật. Màn báo rõ tính năng chưa khả dụng thay vì dựng dữ liệu giả.
 */
@Composable
fun MyReviewsScreen(onBackClick: () -> Unit) {
    Column(modifier = Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background)) {
        BackTopBar("Đánh giá của tôi", onBackClick)
        EmptyState(
            icon = Icons.Default.RateReview,
            title = "Danh sách đánh giá chưa khả dụng",
            subtitle = "Hệ thống chưa hỗ trợ xem lại các đánh giá đã gửi. Bạn vẫn có thể đánh giá đơn đã nhận từ Chi tiết đơn hàng."
        )
    }
}
