package com.surplusiq.app.domain.repository

import com.surplusiq.app.domain.model.RedeemResult
import com.surplusiq.app.domain.model.RewardBalanceInfo
import com.surplusiq.app.domain.model.RewardCatalog
import com.surplusiq.app.domain.model.RewardRuleSection
import com.surplusiq.app.domain.model.RewardHistoryEntry

/** Rescue Rewards (CM-C04): số dư và lịch sử điểm thưởng. */
interface RewardsRepository {
    suspend fun getBalance(): Result<RewardBalanceInfo>
    suspend fun getHistory(): Result<List<RewardHistoryEntry>>
    suspend fun getCatalog(): Result<RewardCatalog>
    suspend fun getRules(): Result<List<RewardRuleSection>>
    suspend fun redeem(redemptionId: String): Result<RedeemResult>
}
