package com.surplusiq.app.data.remote.api

import com.surplusiq.app.data.remote.dto.AddComplaintAttachmentsRequest
import com.surplusiq.app.data.remote.dto.ComplaintResponse
import com.surplusiq.app.data.remote.dto.CreateViolationReportRequest
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
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path

interface InteractionsApiService {

    @POST("customer/orders/{orderId}/complaints")
    suspend fun createComplaint(
        @Path("orderId") orderId: String,
        @Body request: CreateComplaintRequest
    ): Response<ComplaintResponse>

    @GET("customer/complaints")
    suspend fun getCustomerComplaints(): Response<List<ComplaintResponse>>

    @GET("customer/complaints/{id}")
    suspend fun getComplaintDetail(
        @Path("id") id: String
    ): Response<ComplaintResponse>

    @POST("customer/orders/{orderId}/reviews")
    suspend fun createReview(
        @Path("orderId") orderId: String,
        @Body request: CreateReviewRequest
    ): Response<ReviewResponse>

    @GET("customer/reviews")
    suspend fun getCustomerReviews(): Response<List<com.surplusiq.app.data.remote.dto.CustomerReviewDto>>

    @retrofit2.http.PUT("customer/reviews/{id}")
    suspend fun updateReview(
        @Path("id") id: String,
        @Body request: com.surplusiq.app.data.remote.dto.UpdateReviewRequest
    ): Response<ReviewResponse>

    @retrofit2.http.DELETE("customer/reviews/{id}")
    suspend fun hideReview(
        @Path("id") id: String
    ): Response<Map<String, Any>>

    @POST("customer/complaints/{id}/withdraw")
    suspend fun withdrawComplaint(
        @Path("id") id: String
    ): Response<Map<String, Any>>

    @POST("customer/complaints/{id}/attachments")
    suspend fun addComplaintAttachments(
        @Path("id") id: String,
        @Body request: AddComplaintAttachmentsRequest
    ): Response<Map<String, Any>>

    @POST("customer/reports")
    suspend fun createViolationReport(
        @Body request: CreateViolationReportRequest
    ): Response<ViolationReportResponse>

    @POST("customer/support-tickets")
    suspend fun createSupportTicket(
        @Body request: CreateSupportTicketRequest
    ): Response<SupportTicketResponse>

    @GET("customer/support-tickets")
    suspend fun getCustomerSupportTickets(): Response<List<SupportTicketResponse>>

    @GET("customer/support-tickets/{id}")
    suspend fun getSupportTicketDetail(
        @Path("id") id: String
    ): Response<SupportTicketDetailResponse>

    @POST("customer/support-tickets/{id}/messages")
    suspend fun sendSupportMessage(
        @Path("id") id: String,
        @Body request: SendSupportMessageRequest
    ): Response<SupportMessageResponse>

    @POST("customer/support-tickets/{id}/close")
    suspend fun closeSupportTicket(
        @Path("id") id: String
    ): Response<Map<String, Any>>

    @GET("customer/impact")
    suspend fun getCustomerImpact(): Response<CustomerImpactDto>

    @GET("customer/impact/badges")
    suspend fun getCustomerImpactBadges(): Response<CustomerImpactBadgesResponse>

    @GET("customer/help-center/faq")
    suspend fun getHelpCenterFaq(): Response<List<FaqCategoryDto>>

}
