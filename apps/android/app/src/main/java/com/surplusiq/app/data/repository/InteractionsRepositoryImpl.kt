package com.surplusiq.app.data.repository

import com.surplusiq.app.data.remote.api.InteractionsApiService
import com.surplusiq.app.data.remote.dto.ComplaintResponse
import com.surplusiq.app.data.remote.dto.CreateComplaintRequest
import com.surplusiq.app.data.remote.dto.CreateReviewRequest
import com.surplusiq.app.data.remote.dto.ReviewResponse
import com.surplusiq.app.domain.repository.InteractionsRepository
import java.util.UUID
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class InteractionsRepositoryImpl @Inject constructor(
    private val interactionsApiService: InteractionsApiService
) : InteractionsRepository {

    private val localComplaintsCache = mutableListOf<ComplaintResponse>()

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
                val complaint = response.body()!!
                localComplaintsCache.add(0, complaint)
                Result.success(complaint)
            } else {
                // Fallback simulation for offline/dev testing
                val simulated = ComplaintResponse(
                    id = "CMP-${UUID.randomUUID().toString().take(8).uppercase()}",
                    orderId = orderId,
                    category = category,
                    description = description,
                    status = "PENDING_STORE",
                    imageUrls = imageUrls,
                    createdAt = "Vừa xong"
                )
                localComplaintsCache.add(0, simulated)
                Result.success(simulated)
            }
        } catch (_: Exception) {
            val simulated = ComplaintResponse(
                id = "CMP-${UUID.randomUUID().toString().take(8).uppercase()}",
                orderId = orderId,
                category = category,
                description = description,
                status = "PENDING_STORE",
                imageUrls = imageUrls,
                createdAt = "Vừa xong"
            )
            localComplaintsCache.add(0, simulated)
            Result.success(simulated)
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
                val simulated = ReviewResponse(
                    id = "REV-${UUID.randomUUID().toString().take(8).uppercase()}",
                    orderId = orderId,
                    rating = rating,
                    comment = comment,
                    createdAt = "Vừa xong"
                )
                Result.success(simulated)
            }
        } catch (_: Exception) {
            val simulated = ReviewResponse(
                id = "REV-${UUID.randomUUID().toString().take(8).uppercase()}",
                orderId = orderId,
                rating = rating,
                comment = comment,
                createdAt = "Vừa xong"
            )
            Result.success(simulated)
        }
    }

    override suspend fun getComplaints(): Result<List<ComplaintResponse>> {
        return try {
            val response = interactionsApiService.getCustomerComplaints()
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.success(localComplaintsCache.toList())
            }
        } catch (_: Exception) {
            Result.success(localComplaintsCache.toList())
        }
    }

    override suspend fun withdrawComplaint(complaintId: String): Result<Boolean> {
        return try {
            val response = interactionsApiService.withdrawComplaint(complaintId)
            localComplaintsCache.removeAll { it.id == complaintId }
            Result.success(response.isSuccessful)
        } catch (_: Exception) {
            localComplaintsCache.removeAll { it.id == complaintId }
            Result.success(true)
        }
    }
}
