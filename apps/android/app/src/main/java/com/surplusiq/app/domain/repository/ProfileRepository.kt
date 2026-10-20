package com.surplusiq.app.domain.repository

import com.surplusiq.app.data.remote.dto.AccountDeleteResponse
import com.surplusiq.app.data.remote.dto.ConsentDto
import com.surplusiq.app.data.remote.dto.DataExportResponse
import com.surplusiq.app.data.remote.dto.OrderLockStatusDto
import com.surplusiq.app.data.remote.dto.PaymentTransactionRecordDto
import com.surplusiq.app.data.remote.dto.PromotionWalletItemDto
import com.surplusiq.app.data.remote.dto.DietaryProfileDto
import com.surplusiq.app.domain.model.DietaryType
import com.surplusiq.app.domain.model.UserProfile

interface ProfileRepository {
    suspend fun getProfile(): Result<UserProfile>
    suspend fun getDietaryProfile(): Result<DietaryProfileDto>
    suspend fun updateDietaryProfile(allergens: List<String>, excludedItems: List<String>): Result<Boolean>
    suspend fun updateDietaryPreferences(dietaryType: DietaryType, allergies: List<String>): Result<Boolean>
    suspend fun getFavoriteStoreIds(): Result<Set<String>>

    /** GDPR (R1-012, R1-017): lịch sử chấp thuận điều khoản */
    suspend fun getConsents(): Result<List<ConsentDto>>

    /** R1-011/R1-019/BR-007: yêu cầu xóa tài khoản, ân hạn 7 ngày */
    suspend fun requestAccountDelete(): Result<AccountDeleteResponse>

    /** R1-019: hủy yêu cầu xóa tài khoản trong thời gian ân hạn */
    suspend fun cancelAccountDelete(): Result<AccountDeleteResponse>

    /** R1-018: xuất dữ liệu cá nhân, link tải về hiệu lực 24h */
    suspend fun exportUserData(): Result<DataExportResponse>

    /** R1-077: lịch sử thanh toán & hoàn tiền */
    suspend fun getTransactions(): Result<List<PaymentTransactionRecordDto>>

    /** R1-048, BR-020: trạng thái khóa đặt */
    suspend fun getOrderLockStatus(): Result<OrderLockStatusDto>

    /** R1-078: ví ưu đãi */
    suspend fun getPromotionWallet(): Result<List<PromotionWalletItemDto>>

    /** R1-079: thu thập ưu đãi vào ví theo ID promotion */
    suspend fun claimPromotion(promotionId: String): Result<Boolean>
}
