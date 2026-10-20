package com.surplusiq.app.domain.repository

import com.surplusiq.app.data.remote.dto.ComplaintResponse
import com.surplusiq.app.data.remote.dto.CustomerImpactBadgesResponse
import com.surplusiq.app.data.remote.dto.CustomerImpactDto
import com.surplusiq.app.data.remote.dto.FaqCategoryDto
import com.surplusiq.app.data.remote.dto.ReviewResponse
import com.surplusiq.app.data.remote.dto.SupportMessageResponse
import com.surplusiq.app.data.remote.dto.SupportTicketDetailResponse
import com.surplusiq.app.data.remote.dto.SupportTicketResponse
import com.surplusiq.app.data.remote.dto.ViolationReportResponse

interface InteractionsRepository {
    suspend fun submitComplaint(
        orderId: String,
        category: String,
        description: String,
        imageUrls: List<String>
    ): Result<ComplaintResponse>

    suspend fun submitReview(
        orderId: String,
        rating: Int,
        comment: String?
    ): Result<ReviewResponse>

    suspend fun getComplaints(): Result<List<ComplaintResponse>>

    suspend fun withdrawComplaint(complaintId: String): Result<Boolean>

    /** R1-062: chi tiết khiếu nại kèm cửa hàng, mã đơn, ảnh. */
    suspend fun getComplaintDetail(complaintId: String): Result<ComplaintResponse>

    /** R1-068: bổ sung ảnh bằng chứng (URL) khi khiếu nại đang chờ cửa hàng. */
    suspend fun addComplaintAttachments(complaintId: String, photoUrls: List<String>): Result<Boolean>

    /** R1-069: báo cáo vi phạm cửa hàng / deal / đánh giá. */
    suspend fun createViolationReport(targetType: String, targetId: String, reason: String): Result<ViolationReportResponse>

    /** Mở yêu cầu hỗ trợ người thật CSKH, tối đa 5 yêu cầu đang mở (R1-070). */
    suspend fun createSupportTicket(subject: String, message: String): Result<SupportTicketResponse>

    suspend fun getSupportTickets(): Result<List<SupportTicketResponse>>

    suspend fun getSupportTicketDetail(ticketId: String): Result<SupportTicketDetailResponse>

    suspend fun sendSupportMessage(ticketId: String, message: String): Result<SupportMessageResponse>

    suspend fun closeSupportTicket(ticketId: String): Result<Boolean>

    /** R1-076: thống kê tác động cá nhân */
    suspend fun getCustomerImpact(): Result<CustomerImpactDto>

    /** R1-081: huy hiệu & tiến trình mở khóa, thẻ chia sẻ mạng xã hội */
    suspend fun getCustomerImpactBadges(): Result<CustomerImpactBadgesResponse>

    /** R1-072: FAQ trung tâm hỗ trợ, public no-auth */
    suspend fun getHelpCenterFaq(): Result<List<FaqCategoryDto>>

    /** R1-069: báo cáo vi phạm cửa hàng. */
    suspend fun reportStore(storeId: String, reason: String): Result<Unit>
}
