package com.surplusiq.app.data.repository

import com.surplusiq.app.data.remote.api.RewardsApiService
import com.surplusiq.app.data.remote.dto.RedeemRewardRequest
import com.surplusiq.app.data.remote.dto.RewardLedgerEntryDto
import com.surplusiq.app.domain.model.RewardBalanceInfo
import com.surplusiq.app.domain.model.RewardHistoryEntry
import com.surplusiq.app.domain.repository.RewardsRepository
import javax.inject.Inject
import javax.inject.Singleton

/** Không tự tạo số dư/lịch sử giả khi API lỗi - trả Result.failure để UI hiển thị lỗi thật (rule 0.1). */
@Singleton
class RewardsRepositoryImpl @Inject constructor(
    private val rewardsApiService: RewardsApiService
) : RewardsRepository {

    override suspend fun getBalance(): Result<RewardBalanceInfo> {
        return try {
            val response = rewardsApiService.getBalance()
            val body = response.body()
            if (response.isSuccessful && body != null) {
                Result.success(RewardBalanceInfo(pointsBalance = body.pointsBalance))
            } else {
                Result.failure(Exception("Không thể tải số dư điểm thưởng (${response.code()})"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun getHistory(): Result<List<RewardHistoryEntry>> {
        return try {
            val response = rewardsApiService.getHistory()
            val body = response.body()
            if (response.isSuccessful && body != null) {
                Result.success(body.map { it.toEntry() })
            } else {
                Result.failure(Exception("Không thể tải lịch sử điểm thưởng (${response.code()})"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun redeem(points: Int, redemptionId: String): Result<RewardBalanceInfo> {
        return try {
            val response = rewardsApiService.redeem(RedeemRewardRequest(points, redemptionId))
            val body = response.body()
            if (response.isSuccessful && body != null) {
                Result.success(RewardBalanceInfo(pointsBalance = body.pointsBalance))
            } else {
                Result.failure(Exception("Đổi điểm thất bại - số dư không đủ hoặc có lỗi (${response.code()})"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    private fun RewardLedgerEntryDto.toEntry() = RewardHistoryEntry(
        id = id,
        entryType = entryType,
        pointsDelta = pointsDelta,
        reason = reason,
        createdAt = createdAt
    )
}
