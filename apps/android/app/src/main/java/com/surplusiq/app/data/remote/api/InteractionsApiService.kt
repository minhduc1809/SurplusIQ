package com.surplusiq.app.data.remote.api

import com.surplusiq.app.data.remote.dto.ComplaintResponse
import com.surplusiq.app.data.remote.dto.CreateComplaintRequest
import com.surplusiq.app.data.remote.dto.CreateReviewRequest
import com.surplusiq.app.data.remote.dto.ReviewResponse
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

    @POST("customer/complaints/{id}/withdraw")
    suspend fun withdrawComplaint(
        @Path("id") id: String
    ): Response<Map<String, Any>>
}
