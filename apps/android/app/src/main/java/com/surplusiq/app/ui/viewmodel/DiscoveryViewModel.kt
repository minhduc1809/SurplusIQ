package com.surplusiq.app.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.surplusiq.app.domain.model.Deal
import com.surplusiq.app.domain.model.UserPreferences
import com.surplusiq.app.domain.repository.DiscoveryRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class DiscoveryUiState(
    val deals: List<Deal> = emptyList(),
    val isLoading: Boolean = false,
    val searchQuery: String = "",
    val radiusKm: Double = 2.0,
    val preferences: UserPreferences = UserPreferences(),
    val errorMessage: String? = null
)

@HiltViewModel
class DiscoveryViewModel @Inject constructor(
    private val discoveryRepository: DiscoveryRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(DiscoveryUiState(isLoading = true))
    val uiState: StateFlow<DiscoveryUiState> = _uiState.asStateFlow()

    init {
        loadDeals()
    }

    fun loadDeals() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, errorMessage = null)
            val currentState = _uiState.value
            val result = discoveryRepository.getNearbyDeals(
                radiusKm = currentState.radiusKm,
                searchQuery = currentState.searchQuery.ifBlank { null },
                preferences = currentState.preferences
            )

            result.fold(
                onSuccess = { deals ->
                    _uiState.value = _uiState.value.copy(deals = deals, isLoading = false)
                },
                onFailure = { error ->
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        errorMessage = error.localizedMessage ?: "Không thể tải danh sách món cứu hộ"
                    )
                }
            )
        }
    }

    fun onSearchQueryChanged(query: String) {
        _uiState.value = _uiState.value.copy(searchQuery = query)
        loadDeals()
    }

    fun onRadiusChanged(radiusKm: Double) {
        _uiState.value = _uiState.value.copy(radiusKm = radiusKm)
        loadDeals()
    }

    fun onPreferencesUpdated(preferences: UserPreferences) {
        _uiState.value = _uiState.value.copy(preferences = preferences)
        loadDeals()
    }

    fun toggleFavorite(deal: Deal) {
        viewModelScope.launch {
            val result = discoveryRepository.toggleFavorite(deal.id, deal.storeId, deal.isFavorite)
            result.onSuccess { newFav ->
                val updatedList = _uiState.value.deals.map {
                    if (it.storeId == deal.storeId) it.copy(isFavorite = newFav) else it
                }
                _uiState.value = _uiState.value.copy(deals = updatedList)
            }
        }
    }
}
