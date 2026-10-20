package com.surplusiq.app.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.surplusiq.app.domain.model.BasketSuggestion
import com.surplusiq.app.domain.model.Deal
import com.surplusiq.app.domain.model.LocationSettings
import com.surplusiq.app.domain.model.MapPin
import com.surplusiq.app.domain.model.RadarDeal
import com.surplusiq.app.domain.model.TrustpassInfo
import com.surplusiq.app.domain.model.UserPreferences
import com.surplusiq.app.domain.repository.DiscoveryRepository
import com.surplusiq.app.domain.repository.LocationRepository
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
    // Vị trí khám phá (K06/K08) - nguồn sự thật nằm ở LocationRepository
    val location: LocationSettings = LocationSettings(),
    // Bản đồ deal (K10)
    val mapPins: List<MapPin> = emptyList(),
    val isMapLoading: Boolean = false,
    val mapErrorMessage: String? = null,
    val preferences: UserPreferences = UserPreferences(),
    val errorMessage: String? = null,
    // Rescue Radar (CM-C05)
    val radarDeals: List<RadarDeal> = emptyList(),
    val isRadarLoading: Boolean = false,
    val radarErrorMessage: String? = null,
    // TrustPass (CM-C03)
    val trustpass: TrustpassInfo? = null,
    val isTrustpassLoading: Boolean = false,
    val trustpassErrorMessage: String? = null,
    // Rescue Basket (CM-C01)
    val basketSuggestions: List<BasketSuggestion> = emptyList(),
    val isBasketLoading: Boolean = false,
    val basketErrorMessage: String? = null
)

@HiltViewModel
class DiscoveryViewModel @Inject constructor(
    private val discoveryRepository: DiscoveryRepository,
    private val locationRepository: LocationRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(DiscoveryUiState(isLoading = true))
    val uiState: StateFlow<DiscoveryUiState> = _uiState.asStateFlow()

    init {
        // Mỗi lần vị trí/bán kính đổi (K06, K07, K08) thì tải lại deal theo vị trí mới.
        viewModelScope.launch {
            locationRepository.location.collect { location ->
                _uiState.value = _uiState.value.copy(location = location)
                loadDeals()
                if (_uiState.value.mapPins.isNotEmpty() || _uiState.value.mapErrorMessage != null) loadMapPins()
            }
        }
    }

    fun loadMapPins() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isMapLoading = true, mapErrorMessage = null)
            val location = _uiState.value.location
            discoveryRepository.getMapPins(location.latitude, location.longitude, location.radiusKm).fold(
                onSuccess = { _uiState.value = _uiState.value.copy(mapPins = it, isMapLoading = false) },
                onFailure = { _uiState.value = _uiState.value.copy(isMapLoading = false, mapErrorMessage = it.message) }
            )
        }
    }

    /** Bỏ "Đang xem ở vị trí khác" (K08), quay về vị trí đã lưu. */
    fun clearTemporaryLocation() = locationRepository.clearTemporaryLocation()

    /** K17: ghi lịch sử xem khi mở chi tiết deal; khách vãng lai (401) bỏ qua. */
    fun recordDealView(dealId: String) {
        viewModelScope.launch { discoveryRepository.recordDealView(dealId) }
    }

    fun loadDeals() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, errorMessage = null)
            val currentState = _uiState.value
            val result = discoveryRepository.getNearbyDeals(
                latitude = currentState.location.latitude,
                longitude = currentState.location.longitude,
                radiusKm = currentState.location.radiusKm,
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

    fun onPreferencesUpdated(preferences: UserPreferences) {
        _uiState.value = _uiState.value.copy(preferences = preferences)
        loadDeals()
    }

    fun loadRadarRanking() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isRadarLoading = true, radarErrorMessage = null)
            val result = discoveryRepository.getRadarRanking()
            result.fold(
                onSuccess = { radarDeals ->
                    _uiState.value = _uiState.value.copy(radarDeals = radarDeals, isRadarLoading = false)
                },
                onFailure = { error ->
                    _uiState.value = _uiState.value.copy(
                        isRadarLoading = false,
                        radarErrorMessage = error.localizedMessage ?: "Không thể tải Rescue Radar"
                    )
                }
            )
        }
    }

    fun loadTrustpass(dealId: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isTrustpassLoading = true, trustpassErrorMessage = null, trustpass = null)
            val result = discoveryRepository.getDealTrustpass(dealId)
            result.fold(
                onSuccess = { info ->
                    _uiState.value = _uiState.value.copy(trustpass = info, isTrustpassLoading = false)
                },
                onFailure = { error ->
                    _uiState.value = _uiState.value.copy(
                        isTrustpassLoading = false,
                        trustpassErrorMessage = error.localizedMessage ?: "Không thể tải hồ sơ TrustPass"
                    )
                }
            )
        }
    }

    fun clearTrustpass() {
        _uiState.value = _uiState.value.copy(trustpass = null, trustpassErrorMessage = null)
    }

    fun suggestBasket(budgetMax: Double, peopleCount: Int) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isBasketLoading = true, basketErrorMessage = null)
            val result = discoveryRepository.suggestBasket(budgetMax = budgetMax, peopleCount = peopleCount)
            result.fold(
                onSuccess = { baskets ->
                    _uiState.value = _uiState.value.copy(basketSuggestions = baskets, isBasketLoading = false)
                },
                onFailure = { error ->
                    _uiState.value = _uiState.value.copy(
                        isBasketLoading = false,
                        basketErrorMessage = error.localizedMessage ?: "Không thể gợi ý giỏ Rescue Basket"
                    )
                }
            )
        }
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
