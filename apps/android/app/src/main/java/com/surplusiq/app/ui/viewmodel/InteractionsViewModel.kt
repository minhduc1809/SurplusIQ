package com.surplusiq.app.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.surplusiq.app.data.remote.dto.ComplaintResponse
import com.surplusiq.app.data.remote.dto.CustomerImpactBadgesResponse
import com.surplusiq.app.data.remote.dto.CustomerImpactDto
import com.surplusiq.app.data.remote.dto.FaqCategoryDto
import com.surplusiq.app.data.remote.dto.ReviewResponse
import com.surplusiq.app.data.remote.dto.SupportTicketDetailResponse
import com.surplusiq.app.data.remote.dto.SupportTicketResponse
import com.surplusiq.app.data.remote.dto.ViolationReportResponse
import com.surplusiq.app.domain.repository.InteractionsRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class InteractionsUiState(
    val complaints: List<ComplaintResponse> = emptyList(),
    val isLoading: Boolean = false,
    val errorMessage: String? = null,
    val lastSubmittedReview: ReviewResponse? = null,
    val lastSubmittedComplaint: ComplaintResponse? = null,
    val supportTickets: List<SupportTicketResponse> = emptyList(),
    val isSupportTicketsLoading: Boolean = false,
    val supportTicketsError: String? = null,
    val selectedTicket: SupportTicketDetailResponse? = null,
    val isTicketDetailLoading: Boolean = false,
    val ticketDetailError: String? = null,
    val isSendingTicketMessage: Boolean = false,
    // R1-076/R1-081: tác động cá nhân & huy hiệu
    val impact: CustomerImpactDto? = null,
    val isImpactLoading: Boolean = false,
    val impactError: String? = null,
    val impactBadges: CustomerImpactBadgesResponse? = null,
    val isBadgesLoading: Boolean = false,
    val badgesError: String? = null,
    // R1-072: FAQ trung tâm hỗ trợ
    val faqCategories: List<FaqCategoryDto> = emptyList(),
    val isFaqLoading: Boolean = false,
    val faqError: String? = null,
    // K36 Chi tiết khiếu nại (R1-062, R1-063, R1-068)
    val selectedComplaint: ComplaintResponse? = null,
    val isComplaintDetailLoading: Boolean = false,
    val complaintDetailError: String? = null,
    val isComplaintActionLoading: Boolean = false,
    val complaintActionMessage: String? = null,
    // K39 Báo cáo vi phạm (R1-069)
    val isReportSubmitting: Boolean = false,
    val reportError: String? = null,
    val submittedReport: ViolationReportResponse? = null,
    // K38 Đánh giá của tôi (R1-065, R1-066)
    val myReviews: List<com.surplusiq.app.data.remote.dto.CustomerReviewDto> = emptyList(),
    val isMyReviewsLoading: Boolean = false,
    val myReviewsError: String? = null,
    val reviewActionMessage: String? = null,
    val isReviewActionLoading: Boolean = false
)

@HiltViewModel
class InteractionsViewModel @Inject constructor(
    val interactionsRepository: InteractionsRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(InteractionsUiState())
    val uiState: StateFlow<InteractionsUiState> = _uiState.asStateFlow()

    fun loadComplaints() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, errorMessage = null)
            val result = interactionsRepository.getComplaints()
            result.fold(
                onSuccess = { list ->
                    _uiState.value = _uiState.value.copy(
                        complaints = list,
                        isLoading = false
                    )
                },
                onFailure = { err ->
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        errorMessage = err.localizedMessage ?: "Không thể tải danh sách khiếu nại"
                    )
                }
            )
        }
    }

    fun loadComplaintDetail(complaintId: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(
                isComplaintDetailLoading = true,
                complaintDetailError = null,
                complaintActionMessage = null
            )
            interactionsRepository.getComplaintDetail(complaintId).fold(
                onSuccess = { detail ->
                    _uiState.value = _uiState.value.copy(selectedComplaint = detail, isComplaintDetailLoading = false)
                },
                onFailure = { err ->
                    _uiState.value = _uiState.value.copy(
                        isComplaintDetailLoading = false,
                        complaintDetailError = err.localizedMessage ?: "Không thể tải chi tiết khiếu nại"
                    )
                }
            )
        }
    }

    fun addComplaintEvidence(complaintId: String, photoUrls: List<String>) =
        runComplaintAction(complaintId, "Đã bổ sung bằng chứng.") {
            interactionsRepository.addComplaintAttachments(complaintId, photoUrls)
        }

    fun withdrawComplaint(complaintId: String) =
        runComplaintAction(complaintId, "Đã rút khiếu nại.") {
            interactionsRepository.withdrawComplaint(complaintId)
        }

    private fun runComplaintAction(
        complaintId: String,
        successMessage: String,
        action: suspend () -> Result<Boolean>
    ) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isComplaintActionLoading = true, complaintActionMessage = null)
            val result = action()
            _uiState.value = _uiState.value.copy(
                isComplaintActionLoading = false,
                complaintActionMessage = result.fold(
                    onSuccess = { successMessage },
                    onFailure = { it.localizedMessage ?: "Không thể cập nhật khiếu nại" }
                )
            )
            if (result.isSuccess) {
                loadComplaintDetail(complaintId)
                loadComplaints()
            }
        }
    }

    fun submitViolationReport(targetType: String, targetId: String, reason: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isReportSubmitting = true, reportError = null, submittedReport = null)
            interactionsRepository.createViolationReport(targetType, targetId, reason).fold(
                onSuccess = { report ->
                    _uiState.value = _uiState.value.copy(isReportSubmitting = false, submittedReport = report)
                },
                onFailure = { err ->
                    _uiState.value = _uiState.value.copy(
                        isReportSubmitting = false,
                        reportError = err.localizedMessage ?: "Không thể gửi báo cáo"
                    )
                }
            )
        }
    }

    fun resetViolationReport() {
        _uiState.value = _uiState.value.copy(isReportSubmitting = false, reportError = null, submittedReport = null)
    }

    fun loadSupportTickets() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isSupportTicketsLoading = true, supportTicketsError = null)
            val result = interactionsRepository.getSupportTickets()
            result.fold(
                onSuccess = { list ->
                    _uiState.value = _uiState.value.copy(supportTickets = list, isSupportTicketsLoading = false)
                },
                onFailure = { err ->
                    _uiState.value = _uiState.value.copy(
                        isSupportTicketsLoading = false,
                        supportTicketsError = err.localizedMessage ?: "Không thể tải danh sách yêu cầu hỗ trợ"
                    )
                }
            )
        }
    }

    fun createSupportTicket(subject: String, message: String, onCreated: (String) -> Unit) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isSupportTicketsLoading = true, supportTicketsError = null)
            val result = interactionsRepository.createSupportTicket(subject, message)
            result.fold(
                onSuccess = { ticket ->
                    _uiState.value = _uiState.value.copy(isSupportTicketsLoading = false)
                    loadSupportTickets()
                    onCreated(ticket.id)
                },
                onFailure = { err ->
                    _uiState.value = _uiState.value.copy(
                        isSupportTicketsLoading = false,
                        supportTicketsError = err.localizedMessage ?: "Không thể mở yêu cầu hỗ trợ"
                    )
                }
            )
        }
    }

    fun loadSupportTicketDetail(ticketId: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isTicketDetailLoading = true, ticketDetailError = null)
            val result = interactionsRepository.getSupportTicketDetail(ticketId)
            result.fold(
                onSuccess = { detail ->
                    _uiState.value = _uiState.value.copy(selectedTicket = detail, isTicketDetailLoading = false)
                },
                onFailure = { err ->
                    _uiState.value = _uiState.value.copy(
                        isTicketDetailLoading = false,
                        ticketDetailError = err.localizedMessage ?: "Không thể tải chi tiết yêu cầu hỗ trợ"
                    )
                }
            )
        }
    }

    fun sendSupportMessage(ticketId: String, message: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isSendingTicketMessage = true, ticketDetailError = null)
            val result = interactionsRepository.sendSupportMessage(ticketId, message)
            result.fold(
                onSuccess = {
                    _uiState.value = _uiState.value.copy(isSendingTicketMessage = false)
                    loadSupportTicketDetail(ticketId)
                },
                onFailure = { err ->
                    _uiState.value = _uiState.value.copy(
                        isSendingTicketMessage = false,
                        ticketDetailError = err.localizedMessage ?: "Không thể gửi tin nhắn"
                    )
                }
            )
        }
    }

    fun closeSupportTicket(ticketId: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isTicketDetailLoading = true, ticketDetailError = null)
            val result = interactionsRepository.closeSupportTicket(ticketId)
            result.fold(
                onSuccess = {
                    loadSupportTicketDetail(ticketId)
                },
                onFailure = { err ->
                    _uiState.value = _uiState.value.copy(
                        isTicketDetailLoading = false,
                        ticketDetailError = err.localizedMessage ?: "Không thể đóng yêu cầu hỗ trợ"
                    )
                }
            )
        }
    }

    fun loadImpact() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isImpactLoading = true, impactError = null)
            val result = interactionsRepository.getCustomerImpact()
            result.fold(
                onSuccess = { impact ->
                    _uiState.value = _uiState.value.copy(impact = impact, isImpactLoading = false)
                },
                onFailure = { err ->
                    _uiState.value = _uiState.value.copy(
                        isImpactLoading = false,
                        impactError = err.localizedMessage ?: "Không thể tải thống kê tác động"
                    )
                }
            )
        }
    }

    fun loadImpactBadges() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isBadgesLoading = true, badgesError = null)
            val result = interactionsRepository.getCustomerImpactBadges()
            result.fold(
                onSuccess = { badges ->
                    _uiState.value = _uiState.value.copy(impactBadges = badges, isBadgesLoading = false)
                },
                onFailure = { err ->
                    _uiState.value = _uiState.value.copy(
                        isBadgesLoading = false,
                        badgesError = err.localizedMessage ?: "Không thể tải huy hiệu"
                    )
                }
            )
        }
    }

    fun loadHelpCenterFaq() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isFaqLoading = true, faqError = null)
            val result = interactionsRepository.getHelpCenterFaq()
            result.fold(
                onSuccess = { categories ->
                    _uiState.value = _uiState.value.copy(faqCategories = categories, isFaqLoading = false)
                },
                onFailure = { err ->
                    _uiState.value = _uiState.value.copy(
                        isFaqLoading = false,
                        faqError = err.localizedMessage ?: "Không thể tải câu hỏi thường gặp"
                    )
                }
            )
        }
    }

    fun loadMyReviews() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isMyReviewsLoading = true, myReviewsError = null)
            val result = interactionsRepository.getCustomerReviews()
            result.fold(
                onSuccess = { list ->
                    _uiState.value = _uiState.value.copy(
                        myReviews = list,
                        isMyReviewsLoading = false
                    )
                },
                onFailure = { error ->
                    _uiState.value = _uiState.value.copy(
                        isMyReviewsLoading = false,
                        myReviewsError = error.message
                    )
                }
            )
        }
    }

    fun updateMyReview(reviewId: String, rating: Int, comment: String?, onSuccess: () -> Unit = {}) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isReviewActionLoading = true)
            val result = interactionsRepository.updateReview(reviewId, rating, comment)
            result.fold(
                onSuccess = {
                    _uiState.value = _uiState.value.copy(
                        isReviewActionLoading = false,
                        reviewActionMessage = "Đã cập nhật đánh giá thành công."
                    )
                    loadMyReviews()
                    onSuccess()
                },
                onFailure = { error ->
                    _uiState.value = _uiState.value.copy(
                        isReviewActionLoading = false,
                        reviewActionMessage = error.message ?: "Không thể cập nhật đánh giá."
                    )
                }
            )
        }
    }

    fun hideMyReview(reviewId: String, onSuccess: () -> Unit = {}) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isReviewActionLoading = true)
            val result = interactionsRepository.hideReview(reviewId)
            result.fold(
                onSuccess = {
                    _uiState.value = _uiState.value.copy(
                        isReviewActionLoading = false,
                        reviewActionMessage = "Đã ẩn đánh giá thành công."
                    )
                    loadMyReviews()
                    onSuccess()
                },
                onFailure = { error ->
                    _uiState.value = _uiState.value.copy(
                        isReviewActionLoading = false,
                        reviewActionMessage = error.message ?: "Không thể ẩn đánh giá."
                    )
                }
            )
        }
    }

    fun consumeReviewActionMessage() {
        _uiState.value = _uiState.value.copy(reviewActionMessage = null)
    }
}
