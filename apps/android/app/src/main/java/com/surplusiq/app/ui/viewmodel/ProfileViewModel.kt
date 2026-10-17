package com.surplusiq.app.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.surplusiq.app.domain.model.DietaryType
import com.surplusiq.app.domain.model.UserProfile
import com.surplusiq.app.domain.repository.AuthRepository
import com.surplusiq.app.domain.repository.ProfileRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class ProfileUiState(
    val userProfile: UserProfile? = null,
    val favoriteStoreIds: Set<String> = emptySet(),
    val isLoading: Boolean = false,
    val isLoggedOut: Boolean = false
)

@HiltViewModel
class ProfileViewModel @Inject constructor(
    private val profileRepository: ProfileRepository,
    private val authRepository: AuthRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(ProfileUiState(isLoading = true))
    val uiState: StateFlow<ProfileUiState> = _uiState.asStateFlow()

    init {
        loadProfile()
    }

    fun loadProfile() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true)
            val profileResult = profileRepository.getProfile()
            val favoritesResult = profileRepository.getFavoriteStoreIds()

            val profile = profileResult.getOrNull()
            val favorites = favoritesResult.getOrDefault(emptySet())

            _uiState.value = _uiState.value.copy(
                userProfile = profile,
                favoriteStoreIds = favorites,
                isLoading = false
            )
        }
    }

    fun updateDietaryPreferences(dietaryType: DietaryType, allergies: List<String>) {
        viewModelScope.launch {
            profileRepository.updateDietaryPreferences(dietaryType, allergies)
        }
    }

    fun logout() {
        viewModelScope.launch {
            authRepository.logout()
            _uiState.value = _uiState.value.copy(isLoggedOut = true)
        }
    }
}
