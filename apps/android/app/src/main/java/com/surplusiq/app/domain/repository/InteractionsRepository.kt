package com.surplusiq.app.domain.repository

import com.surplusiq.app.data.remote.dto.ComplaintResponse
import com.surplusiq.app.data.remote.dto.ReviewResponse

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
}
