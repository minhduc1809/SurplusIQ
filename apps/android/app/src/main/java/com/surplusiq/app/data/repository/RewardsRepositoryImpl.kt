package com.surplusiq.app.data.repository

import com.surplusiq.app.data.remote.api.RewardsApiService
import com.surplusiq.app.data.remote.dto.RedeemRewardRequest
import com.surplusiq.app.data.remote.dto.RewardLedgerEntryDto
import com.surplusiq.app.domain.model.RedeemResult
import com.surplusiq.app.domain.model.RewardBalanceInfo
import com.surplusiq.app.domain.model.RewardCatalog
import com.surplusiq.app.domain.model.RewardCatalogItem
import com.surplusiq.app.domain.model.RewardRuleSection
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

    override suspend fun getCatalog(): Result<RewardCatalog> = try {
        val response = rewardsApiService.getCatalog()
        val body = response.body()
        if (response.isSuccessful && body != null) {
            Result.success(
                RewardCatalog(
                    body.pointsBalance, body.dailyLimit, body.redeemedToday,
                    body.items.map { RewardCatalogItem(it.id, it.name, it.points, it.valueVnd, it.minOrderVnd, it.validDays, it.canRedeem, it.shortfall) }
                )
            )
        } else Result.failure(Exception("Không thể tải danh mục đổi điểm (${response.code()})"))
    } catch (e: Exception) {
        Result.failure(e)
    }

    override suspend fun getRules(): Result<List<RewardRuleSection>> = try {
        val response = rewardsApiService.getRules()
        val body = response.body()
        if (response.isSuccessful && body != null) Result.success(body.sections.map { RewardRuleSection(it.title, it.body) })
        else Result.failure(Exception("Không thể tải quy tắc chương trình (${response.code()})"))
    } catch (e: Exception) {
        Result.failure(e)
    }

    /** Trả lỗi thật của máy chủ (không đủ điểm, hết lượt trong ngày...) để khách biết vì sao không đổi được. */
    override suspend fun redeem(redemptionId: String): Result<RedeemResult> = try {
        val response = rewardsApiService.redeem(RedeemRewardRequest(redemptionId))
        val body = response.body()
        if (response.isSuccessful && body != null) {
            Result.success(RedeemResult(body.pointsBalance, body.voucher?.name, body.voucher?.expiresAt))
        } else {
            val serverMessage = runCatching { org.json.JSONObject(response.errorBody()?.string().orEmpty()).optString("message") }.getOrNull()
            Result.failure(Exception(serverMessage?.takeIf { it.isNotBlank() } ?: "Đổi điểm không thành công (${response.code()})"))
        }
    } catch (e: Exception) {
        Result.failure(Exception("Không kết nối được. Kiểm tra mạng rồi thử lại."))
    }

    private fun RewardLedgerEntryDto.toEntry() = RewardHistoryEntry(
        id = id,
        entryType = entryType,
        pointsDelta = pointsDelta,
        reason = reason,
        createdAt = createdAt
    )
}
