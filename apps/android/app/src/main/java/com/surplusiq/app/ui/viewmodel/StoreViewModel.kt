package com.surplusiq.app.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.surplusiq.app.domain.model.StoreDetail
import com.surplusiq.app.domain.repository.DiscoveryRepository
import com.surplusiq.app.domain.repository.InteractionsRepository
import com.surplusiq.app.domain.repository.ProfileRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class StoreUiState(
    // K14 Chi tiết cửa hàng
    val store: StoreDetail? = null,
    val isStoreLoading: Boolean = false,
    val storeError: String? = null,
    val favoriteStoreIds: Set<String> = emptySet(),
    val isReporting: Boolean = false,
    // K18 Cửa hàng yêu thích
    val favoriteStores: List<StoreDetail> = emptyList(),
    val isFavoritesLoading: Boolean = false,
    val favoritesError: String? = null,
    val message: String? = null,
    // K15 Đánh giá công khai của cửa hàng
    val storeReviews: com.surplusiq.app.data.remote.dto.StoreReviewsResponseDto? = null,
    val isStoreReviewsLoading: Boolean = false,
    val storeReviewsError: String? = null,
    val selectedRatingFilter: Int? = null
)

@HiltViewModel
class StoreViewModel @Inject constructor(
    private val discoveryRepository: DiscoveryRepository,
    private val profileRepository: ProfileRepository,
    private val interactionsRepository: InteractionsRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(StoreUiState())
    val uiState: StateFlow<StoreUiState> = _uiState.asStateFlow()

    fun openStore(storeId: String) {
        viewModelScope.launch {
            _uiState.update { it.copy(isStoreLoading = true, storeError = null, store = null) }
            // Khách vãng lai không có danh sách yêu thích -> coi như rỗng.
            profileRepository.getFavoriteStoreIds().onSuccess { ids -> _uiState.update { it.copy(favoriteStoreIds = ids) } }
            discoveryRepository.getStoreDetail(storeId).fold(
                onSuccess = { store -> _uiState.update { it.copy(isStoreLoading = false, store = store) } },
                onFailure = { e -> _uiState.update { it.copy(isStoreLoading = false, storeError = e.message) } }
            )
        }
    }

    fun toggleFavorite(storeId: String) {
        val favorite = storeId !in _uiState.value.favoriteStoreIds
        setFavorite(storeId, favorite)
    }

    fun loadFavorites() {
        viewModelScope.launch {
            _uiState.update { it.copy(isFavoritesLoading = true, favoritesError = null) }
            discoveryRepository.getFavoriteStores().fold(
                onSuccess = { stores ->
                    _uiState.update {
                        it.copy(isFavoritesLoading = false, favoriteStores = stores, favoriteStoreIds = stores.map { s -> s.id }.toSet())
                    }
                },
                onFailure = { e -> _uiState.update { it.copy(isFavoritesLoading = false, favoritesError = e.message) } }
            )
        }
    }

    /** K18: bỏ yêu thích ngay trên danh sách; undoFavoriteRemoval() khôi phục lại. */
    fun removeFavorite(store: StoreDetail) {
        _uiState.update { it.copy(favoriteStores = it.favoriteStores - store) }
        setFavorite(store.id, false, onFailure = {
            _uiState.update { it.copy(favoriteStores = it.favoriteStores + store) }
        })
    }

    fun undoFavoriteRemoval(store: StoreDetail, index: Int) {
        _uiState.update {
            val list = it.favoriteStores.toMutableList().apply { add(index.coerceIn(0, size), store) }
            it.copy(favoriteStores = list)
        }
        setFavorite(store.id, true, onFailure = {
            _uiState.update { it.copy(favoriteStores = it.favoriteStores - store) }
        })
    }

    fun reportStore(storeId: String, reason: String) {
        viewModelScope.launch {
            _uiState.update { it.copy(isReporting = true) }
            interactionsRepository.reportStore(storeId, reason.trim()).fold(
                onSuccess = { _uiState.update { it.copy(isReporting = false, message = "Đã gửi báo cáo. Đội ngũ SurplusIQ sẽ xem xét.") } },
                onFailure = { e -> _uiState.update { it.copy(isReporting = false, message = e.message) } }
            )
        }
    }

    fun consumeMessage() = _uiState.update { it.copy(message = null) }

    /** K15: Tải đánh giá công khai của quán */
    fun loadStoreReviews(storeId: String, rating: Int? = null, page: Int = 1) {
        viewModelScope.launch {
            _uiState.update { it.copy(isStoreReviewsLoading = true, storeReviewsError = null, selectedRatingFilter = rating) }
            discoveryRepository.getStoreReviews(storeId, rating, page).fold(
                onSuccess = { res ->
                    _uiState.update { it.copy(isStoreReviewsLoading = false, storeReviews = res) }
                },
                onFailure = { e ->
                    _uiState.update { it.copy(isStoreReviewsLoading = false, storeReviewsError = e.message) }
                }
            )
        }
    }

    private fun setFavorite(storeId: String, favorite: Boolean, onFailure: () -> Unit = {}) {
        val previous = _uiState.value.favoriteStoreIds
        _uiState.update { it.copy(favoriteStoreIds = if (favorite) previous + storeId else previous - storeId) }
        viewModelScope.launch {
            discoveryRepository.setStoreFavorite(storeId, favorite).onFailure { e ->
                _uiState.update { it.copy(favoriteStoreIds = previous, message = e.message) }
                onFailure()
            }
        }
    }
}
