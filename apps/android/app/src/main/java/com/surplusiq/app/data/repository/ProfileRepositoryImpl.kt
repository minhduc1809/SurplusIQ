package com.surplusiq.app.data.repository

import com.surplusiq.app.data.remote.SessionManager
import com.surplusiq.app.data.remote.api.ProfileApiService
import com.surplusiq.app.data.remote.dto.AccountDeleteResponse
import com.surplusiq.app.data.remote.dto.ConsentDto
import com.surplusiq.app.data.remote.dto.DataExportResponse
import com.surplusiq.app.data.remote.dto.OrderLockStatusDto
import com.surplusiq.app.data.remote.dto.PaymentTransactionRecordDto
import com.surplusiq.app.data.remote.dto.PromotionWalletItemDto
import com.surplusiq.app.data.remote.dto.UpdateCustomerProfileRequest
import com.surplusiq.app.data.remote.dto.CustomerProfileDto
import retrofit2.Response
import com.surplusiq.app.data.remote.dto.UpdateDietaryProfileRequest
import com.surplusiq.app.domain.model.DietaryType
import com.surplusiq.app.domain.model.UserImpactStats
import com.surplusiq.app.domain.model.UserProfile
import com.surplusiq.app.domain.repository.ProfileRepository
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class ProfileRepositoryImpl @Inject constructor(
    private val profileApiService: ProfileApiService,
    private val sessionManager: SessionManager
) : ProfileRepository {

    override suspend fun getProfile(): Result<UserProfile> {
        return try {
            val response = profileApiService.getProfile()
            if (response.isSuccessful && response.body() != null) {
                Result.success(mapToUserProfile(response.body()!!))
            } else {
                Result.success(createFallbackProfile())
            }
        } catch (_: Exception) {
            Result.success(createFallbackProfile())
        }
    }

    override suspend fun updateProfile(
        fullName: String?,
        avatarUrl: String?,
        searchRadiusKm: Double?
    ): Result<UserProfile> {
        return try {
            val request = UpdateCustomerProfileRequest(
                fullName = fullName,
                avatarUrl = avatarUrl,
                searchRadiusKm = searchRadiusKm
            )
            val response = profileApiService.updateProfile(request)
            if (response.isSuccessful && response.body() != null) {
                val updated = mapToUserProfile(response.body()!!)
                // Cập nhật session cache nếu fullName thay đổi
                if (!fullName.isNullOrBlank()) {
                    sessionManager.updateFullName(updated.fullName)
                }
                Result.success(updated)
            } else {
                Result.failure(Exception("Không thể cập nhật hồ sơ (${response.code()})"))
            }
        } catch (e: Exception) {
            Result.failure(Exception("Lỗi kết nối khi cập nhật hồ sơ", e))
        }
    }

    override suspend fun getDietaryProfile(): Result<com.surplusiq.app.data.remote.dto.DietaryProfileDto> =
        com.surplusiq.app.data.remote.apiCall("Không thể tải hồ sơ ăn uống", { profileApiService.getDietaryProfile() }) { it }

    override suspend fun updateDietaryProfile(allergens: List<String>, excludedItems: List<String>): Result<Boolean> =
        com.surplusiq.app.data.remote.apiCall("Không thể cập nhật hồ sơ ăn uống", {
            profileApiService.updateDietaryProfile(
                UpdateDietaryProfileRequest(
                    allergens = allergens,
                    excludedItems = excludedItems
                )
            )
        }) { true }

    override suspend fun updateDietaryPreferences(dietaryType: DietaryType, allergies: List<String>): Result<Boolean> {
        val excluded = if (dietaryType != DietaryType.NONE) listOf(dietaryType.name) else emptyList()
        return updateDietaryProfile(allergens = allergies, excludedItems = excluded)
    }

    override suspend fun getFavoriteStoreIds(): Result<Set<String>> =
        com.surplusiq.app.data.remote.apiCall("Không thể tải cửa hàng yêu thích", { profileApiService.getFavorites() }) { list ->
            list.map { it.storeId }.toSet()
        }

    override suspend fun getConsents(): Result<List<ConsentDto>> {
        return try {
            val response = profileApiService.getConsents()
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception("Không thể tải lịch sử chấp thuận (${response.code()})"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun requestAccountDelete(): Result<AccountDeleteResponse> {
        return try {
            val response = profileApiService.requestAccountDelete()
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception("Không thể gửi yêu cầu xóa tài khoản (${response.code()})"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun cancelAccountDelete(): Result<AccountDeleteResponse> {
        return try {
            val response = profileApiService.cancelAccountDelete()
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception("Không thể hủy yêu cầu xóa tài khoản (${response.code()})"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun exportUserData(): Result<DataExportResponse> {
        return try {
            val response = profileApiService.exportUserData()
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception("Không thể xuất dữ liệu cá nhân (${response.code()})"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun getTransactions(): Result<List<PaymentTransactionRecordDto>> =
        call("Không thể tải lịch sử giao dịch") { profileApiService.getTransactions() }

    override suspend fun getOrderLockStatus(): Result<OrderLockStatusDto> =
        call("Không thể tải trạng thái khóa đặt") { profileApiService.getOrderLockStatus() }

    override suspend fun getPromotionWallet(): Result<List<PromotionWalletItemDto>> =
        call("Không thể tải ví ưu đãi") { profileApiService.getPromotionWallet() }

    override suspend fun claimPromotion(promotionId: String): Result<Boolean> {
        return try {
            val response = profileApiService.claimPromotion(promotionId)
            when {
                response.isSuccessful -> Result.success(true)
                response.code() == 404 -> Result.failure(Exception("Mã ưu đãi không tồn tại hoặc đã kết thúc."))
                response.code() == 409 -> Result.failure(Exception("Bạn đã thu thập mã ưu đãi này rồi."))
                // Promotion id là UUID; mã sai định dạng có thể bị DB từ chối với 500.
                else -> Result.failure(Exception("Mã ưu đãi không hợp lệ (${response.code()})."))
            }
        } catch (e: Exception) {
            Result.failure(Exception("Không kết nối được. Kiểm tra mạng rồi thử lại.", e))
        }
    }

    /** Gọi API trả body bắt buộc; lỗi HTTP/mạng -> Result.failure với thông báo thật. */
    private suspend fun <T> call(errorPrefix: String, request: suspend () -> Response<T>): Result<T> {
        return try {
            val response = request()
            val body = response.body()
            if (response.isSuccessful && body != null) Result.success(body)
            else Result.failure(Exception("$errorPrefix (${response.code()})"))
        } catch (e: Exception) {
            Result.failure(Exception("Không kết nối được. Kiểm tra mạng rồi thử lại.", e))
        }
    }

    private fun createFallbackProfile(): UserProfile {
        return UserProfile(
            id = sessionManager.getUserId() ?: "",
            phone = sessionManager.getPhone() ?: "",
            fullName = sessionManager.getFullName(),
            avatarUrl = null,
            searchRadiusKm = 5.0,
            impactStats = UserImpactStats(0L, 0.0, 0.0, 0)
        )
    }

    private fun mapToUserProfile(dto: CustomerProfileDto): UserProfile {
        val statsDto = dto.impactStats
        val stats = UserImpactStats(
            totalSavedMoneyVnd = statsDto?.moneySavedVnd ?: 0L,
            totalRescuedKg = statsDto?.foodSavedKg ?: 0.0,
            totalReducedCo2Kg = statsDto?.co2AvoidedKg ?: 0.0,
            totalRescuedBags = 0
        )
        return UserProfile(
            id = dto.id,
            phone = dto.phone,
            fullName = dto.fullName,
            avatarUrl = dto.avatarUrl,
            searchRadiusKm = dto.searchRadiusKm ?: 5.0,
            impactStats = stats
        )
    }
}
