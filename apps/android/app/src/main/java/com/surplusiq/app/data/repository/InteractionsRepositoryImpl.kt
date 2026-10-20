package com.surplusiq.app.data.repository

import com.surplusiq.app.data.remote.api.InteractionsApiService
import com.surplusiq.app.data.remote.apiCall
import com.surplusiq.app.data.remote.dto.CreateViolationReportRequest
import com.surplusiq.app.data.remote.dto.AddComplaintAttachmentsRequest
import com.surplusiq.app.data.remote.dto.ComplaintResponse
import com.surplusiq.app.data.remote.dto.ViolationReportResponse
import com.surplusiq.app.data.remote.dto.CreateComplaintRequest
import com.surplusiq.app.data.remote.dto.CreateReviewRequest
import com.surplusiq.app.data.remote.dto.CreateSupportTicketRequest
import com.surplusiq.app.data.remote.dto.CustomerImpactBadgesResponse
import com.surplusiq.app.data.remote.dto.CustomerImpactDto
import com.surplusiq.app.data.remote.dto.FaqCategoryDto
import com.surplusiq.app.data.remote.dto.ReviewResponse
import com.surplusiq.app.data.remote.dto.SendSupportMessageRequest
import com.surplusiq.app.data.remote.dto.SupportMessageResponse
import com.surplusiq.app.data.remote.dto.SupportTicketDetailResponse
import com.surplusiq.app.data.remote.dto.SupportTicketResponse
import com.surplusiq.app.domain.repository.InteractionsRepository
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class InteractionsRepositoryImpl @Inject constructor(
    private val interactionsApiService: InteractionsApiService
) : InteractionsRepository {

    override suspend fun submitComplaint(
        orderId: String,
        category: String,
        description: String,
        imageUrls: List<String>
    ): Result<ComplaintResponse> {
        return try {
            val response = interactionsApiService.createComplaint(
                orderId = orderId,
                request = CreateComplaintRequest(
                    category = category,
                    description = description,
                    imageUrls = imageUrls
                )
            )
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(apiError(response.code(), response.errorBody()?.string()))
            }
        } catch (e: Exception) {
            Result.failure(networkError(e))
        }
    }

    override suspend fun submitReview(
        orderId: String,
        rating: Int,
        comment: String?
    ): Result<ReviewResponse> {
        return try {
            val response = interactionsApiService.createReview(
                orderId = orderId,
                request = CreateReviewRequest(rating = rating, comment = comment)
            )
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(apiError(response.code(), response.errorBody()?.string()))
            }
        } catch (e: Exception) {
            Result.failure(networkError(e))
        }
    }

    override suspend fun getComplaints(): Result<List<ComplaintResponse>> {
        return try {
            val response = interactionsApiService.getCustomerComplaints()
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(apiError(response.code(), response.errorBody()?.string()))
            }
        } catch (e: Exception) {
            Result.failure(networkError(e))
        }
    }

    override suspend fun withdrawComplaint(complaintId: String): Result<Boolean> {
        return try {
            val response = interactionsApiService.withdrawComplaint(complaintId)
            if (response.isSuccessful) Result.success(true)
            else Result.failure(apiError(response.code(), response.errorBody()?.string()))
        } catch (e: Exception) {
            Result.failure(networkError(e))
        }
    }

    override suspend fun getComplaintDetail(complaintId: String): Result<ComplaintResponse> {
        return try {
            val response = interactionsApiService.getComplaintDetail(complaintId)
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(apiError(response.code(), response.errorBody()?.string()))
            }
        } catch (e: Exception) {
            Result.failure(networkError(e))
        }
    }

    override suspend fun addComplaintAttachments(complaintId: String, photoUrls: List<String>): Result<Boolean> {
        return try {
            val response = interactionsApiService.addComplaintAttachments(
                complaintId,
                AddComplaintAttachmentsRequest(photoUrls = photoUrls)
            )
            if (response.isSuccessful) Result.success(true)
            else Result.failure(apiError(response.code(), response.errorBody()?.string()))
        } catch (e: Exception) {
            Result.failure(networkError(e))
        }
    }

    override suspend fun createViolationReport(
        targetType: String,
        targetId: String,
        reason: String
    ): Result<ViolationReportResponse> {
        return try {
            val response = interactionsApiService.createViolationReport(
                CreateViolationReportRequest(targetType = targetType, targetId = targetId, reason = reason)
            )
            when {
                response.isSuccessful && response.body() != null -> Result.success(response.body()!!)
                response.code() == 409 -> Result.failure(Exception("Bạn đã gửi báo cáo cho đối tượng này rồi."))
                else -> Result.failure(apiError(response.code(), response.errorBody()?.string()))
            }
        } catch (e: Exception) {
            Result.failure(networkError(e))
        }
    }

    override suspend fun createSupportTicket(subject: String, message: String): Result<SupportTicketResponse> {
        return try {
            val response = interactionsApiService.createSupportTicket(
                CreateSupportTicketRequest(subject = subject, message = message)
            )
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(apiError(response.code(), response.errorBody()?.string()))
            }
        } catch (e: Exception) {
            Result.failure(networkError(e))
        }
    }

    override suspend fun getSupportTickets(): Result<List<SupportTicketResponse>> {
        return try {
            val response = interactionsApiService.getCustomerSupportTickets()
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(apiError(response.code(), response.errorBody()?.string()))
            }
        } catch (e: Exception) {
            Result.failure(networkError(e))
        }
    }

    override suspend fun getSupportTicketDetail(ticketId: String): Result<SupportTicketDetailResponse> {
        return try {
            val response = interactionsApiService.getSupportTicketDetail(ticketId)
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(apiError(response.code(), response.errorBody()?.string()))
            }
        } catch (e: Exception) {
            Result.failure(networkError(e))
        }
    }

    override suspend fun sendSupportMessage(ticketId: String, message: String): Result<SupportMessageResponse> {
        return try {
            val response = interactionsApiService.sendSupportMessage(
                ticketId,
                SendSupportMessageRequest(message = message)
            )
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(apiError(response.code(), response.errorBody()?.string()))
            }
        } catch (e: Exception) {
            Result.failure(networkError(e))
        }
    }

    override suspend fun closeSupportTicket(ticketId: String): Result<Boolean> {
        return try {
            val response = interactionsApiService.closeSupportTicket(ticketId)
            if (response.isSuccessful) Result.success(true)
            else Result.failure(apiError(response.code(), response.errorBody()?.string()))
        } catch (e: Exception) {
            Result.failure(networkError(e))
        }
    }

    override suspend fun getCustomerImpact(): Result<CustomerImpactDto> {
        return try {
            val response = interactionsApiService.getCustomerImpact()
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(apiError(response.code(), response.errorBody()?.string()))
            }
        } catch (e: Exception) {
            Result.failure(networkError(e))
        }
    }

    override suspend fun getCustomerImpactBadges(): Result<CustomerImpactBadgesResponse> {
        return try {
            val response = interactionsApiService.getCustomerImpactBadges()
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(apiError(response.code(), response.errorBody()?.string()))
            }
        } catch (e: Exception) {
            Result.failure(networkError(e))
        }
    }

    override suspend fun getHelpCenterFaq(): Result<List<FaqCategoryDto>> {
        return try {
            val response = interactionsApiService.getHelpCenterFaq()
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(apiError(response.code(), response.errorBody()?.string()))
            }
        } catch (e: Exception) {
            Result.failure(networkError(e))
        }
    }

    override suspend fun reportStore(storeId: String, reason: String): Result<Unit> =
        apiCall("Không thể gửi báo cáo", {
            interactionsApiService.createViolationReport(CreateViolationReportRequest("STORE", storeId, reason))
        }) { }

    override suspend fun getCustomerReviews(): Result<List<com.surplusiq.app.data.remote.dto.CustomerReviewDto>> =
        apiCall("Không thể tải danh sách đánh giá của bạn", {
            interactionsApiService.getCustomerReviews()
        }) { it }

    override suspend fun updateReview(
        reviewId: String,
        rating: Int,
        comment: String?
    ): Result<ReviewResponse> =
        apiCall("Không thể cập nhật đánh giá", {
            interactionsApiService.updateReview(
                reviewId,
                com.surplusiq.app.data.remote.dto.UpdateReviewRequest(rating, comment)
            )
        }) { it }

    override suspend fun hideReview(reviewId: String): Result<Boolean> =
        apiCall("Không thể ẩn đánh giá", {
            interactionsApiService.hideReview(reviewId)
        }) { true }

    private fun apiError(code: Int, body: String?): Exception {
        val message = when (code) {
            400 -> "Yêu cầu không hợp lệ, vui lòng kiểm tra lại thông tin."
            401 -> "Phiên đăng nhập đã hết. Đăng nhập lại để tiếp tục."
            404 -> "Không tìm thấy dữ liệu yêu cầu."
            429 -> "Bạn đã đạt giới hạn 5 yêu cầu hỗ trợ đang mở."
            in 500..599 -> "Hệ thống đang gặp sự cố. Vui lòng thử lại sau."
            else -> body?.takeIf { it.isNotBlank() } ?: "Không thể hoàn tất yêu cầu."
        }
        return Exception(message)
    }

    private fun networkError(e: Exception): Exception {
        return Exception("Không kết nối được. Kiểm tra mạng rồi thử lại.", e)
    }
}
