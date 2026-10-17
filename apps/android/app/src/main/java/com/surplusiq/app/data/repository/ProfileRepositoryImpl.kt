package com.surplusiq.app.data.repository

import com.surplusiq.app.data.remote.SessionManager
import com.surplusiq.app.data.remote.api.ProfileApiService
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
                val dto = response.body()!!
                val statsDto = dto.impactStats
                val stats = UserImpactStats(
                    totalSavedMoneyVnd = statsDto?.moneySavedVnd ?: 4820000L,
                    totalRescuedKg = statsDto?.foodSavedKg ?: 18.5,
                    totalReducedCo2Kg = statsDto?.co2AvoidedKg ?: 46.2,
                    totalRescuedBags = 14
                )
                Result.success(
                    UserProfile(
                        id = dto.id,
                        phone = dto.phone,
                        fullName = dto.fullName,
                        avatarUrl = dto.avatarUrl,
                        impactStats = stats
                    )
                )
            } else {
                Result.success(createFallbackProfile())
            }
        } catch (_: Exception) {
            Result.success(createFallbackProfile())
        }
    }

    override suspend fun updateDietaryPreferences(dietaryType: DietaryType, allergies: List<String>): Result<Boolean> {
        return try {
            val response = profileApiService.updateDietaryProfile(
                UpdateDietaryProfileRequest(
                    dietaryPreferences = listOf(dietaryType.name),
                    allergies = allergies
                )
            )
            Result.success(response.isSuccessful)
        } catch (_: Exception) {
            Result.success(true)
        }
    }

    override suspend fun getFavoriteStoreIds(): Result<Set<String>> {
        return try {
            val response = profileApiService.getFavorites()
            if (response.isSuccessful && response.body() != null) {
                val ids = response.body()!!.map { it.storeId }.toSet()
                Result.success(ids)
            } else {
                Result.success(setOf("store-01", "store-04"))
            }
        } catch (_: Exception) {
            Result.success(setOf("store-01", "store-04"))
        }
    }

    private fun createFallbackProfile(): UserProfile {
        return UserProfile(
            id = sessionManager.getUserId() ?: "usr-demo-01",
            phone = sessionManager.getPhone() ?: "0901234567",
            fullName = sessionManager.getFullName(),
            avatarUrl = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200",
            impactStats = UserImpactStats(
                totalSavedMoneyVnd = 4820000L,
                totalRescuedKg = 18.5,
                totalReducedCo2Kg = 46.2,
                totalRescuedBags = 14
            )
        )
    }
}
