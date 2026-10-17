package com.surplusiq.app.domain.repository

import com.surplusiq.app.domain.model.DietaryType
import com.surplusiq.app.domain.model.UserProfile

interface ProfileRepository {
    suspend fun getProfile(): Result<UserProfile>
    suspend fun updateDietaryPreferences(dietaryType: DietaryType, allergies: List<String>): Result<Boolean>
    suspend fun getFavoriteStoreIds(): Result<Set<String>>
}
