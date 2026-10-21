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
import com.surplusiq.app.data.remote.realtime.RealtimeEvent
import com.surplusiq.app.data.remote.realtime.RealtimeWebSocketClient
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
    val minDiscountPercent: Int? = null,
    val sortBy: String? = null,
    val errorMessage: String? = null,
    // Rescue Radar (CM-C05)
    val radarDeals: List<RadarDeal> = emptyList(),
    val isRadarLoading: Boolean = false,
    val radarErrorMessage: String? = null,
    // K21: Gợi ý dành cho bạn
    val forYou: com.surplusiq.app.domain.model.ForYouResult? = null,
    val isForYouLoading: Boolean = false,
    val forYouErrorMessage: String? = null,
    // TrustPass (CM-C03)
    val trustpass: TrustpassInfo? = null,
    val isTrustpassLoading: Boolean = false,
    val trustpassErrorMessage: String? = null,
    // Rescue Basket (CM-C01)
    val basketSuggestions: List<BasketSuggestion> = emptyList(),
    val isBasketLoading: Boolean = false,
    val basketErrorMessage: String? = null,
    // Rescue Basket Tùy chỉnh & Đặt giữ (KC03, KC04)
    val activeBasketStoreId: String? = null,
    val activeBasketStoreName: String? = null,
    val customBasketItems: List<com.surplusiq.app.domain.model.BasketCustomItem> = emptyList(),
    val availableSubstitutes: List<com.surplusiq.app.domain.model.BasketSubstituteItem> = emptyList(),
    val isSubstitutesLoading: Boolean = false,
    val substitutesErrorMessage: String? = null,
    val isCheckingOutBasket: Boolean = false,
    val basketCheckoutResult: com.surplusiq.app.domain.model.BasketHoldResult? = null,
    val basketCheckoutError: String? = null,
    // KX06: Báo khi có hàng lại
    val isBackInStockSubscribed: Boolean = false,
    val isTogglingBackInStock: Boolean = false,
    val backInStockMessage: String? = null,
    // KX07: Lịch sử và biến động giá
    val priceHistory: com.surplusiq.app.data.remote.dto.PriceHistoryDto? = null,
    val isPriceHistoryLoading: Boolean = false,
    val priceHistoryError: String? = null
)

@HiltViewModel
class DiscoveryViewModel @Inject constructor(
    private val discoveryRepository: DiscoveryRepository,
    private val locationRepository: LocationRepository,
    private val realtimeWebSocketClient: RealtimeWebSocketClient
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

        // Kết nối WebSocket thời gian thực (deal.stock_updated, deal.flash_rescue, order.hold_reserved)
        realtimeWebSocketClient.connect()
        viewModelScope.launch {
            realtimeWebSocketClient.events.collect { event ->
                when (event) {
                    is RealtimeEvent.DealStockUpdated -> {
                        val currentDeals = _uiState.value.deals.map { deal ->
                            if (deal.id == event.dealId) deal.copy(remainingStock = event.remainingQuantity) else deal
                        }
                        val currentPins = _uiState.value.mapPins.map { pin ->
                            if (pin.storeId == event.storeId) {
                                val newCount = if (event.remainingQuantity <= 0) (pin.activeDealsCount - 1).coerceAtLeast(0) else pin.activeDealsCount
                                pin.copy(activeDealsCount = newCount)
                            } else pin
                        }
                        _uiState.value = _uiState.value.copy(deals = currentDeals, mapPins = currentPins)
                    }
                    is RealtimeEvent.DealFlashRescue -> {
                        // Tải lại deal và map pins khi có quán tung deal xả hàng tức thì
                        loadDeals()
                        loadMapPins()
                    }
                    is RealtimeEvent.OrderHoldReserved -> {
                        val currentDeals = _uiState.value.deals.map { deal ->
                            if (deal.id == event.dealId) {
                                deal.copy(remainingStock = (deal.remainingStock - event.reservedQuantity).coerceAtLeast(0))
                            } else deal
                        }
                        _uiState.value = _uiState.value.copy(deals = currentDeals)
                    }
                    is RealtimeEvent.Connected -> {
                        // Kết nối WebSocket thành công
                    }
                }
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
                preferences = currentState.preferences,
                minDiscountPercent = currentState.minDiscountPercent,
                sortBy = currentState.sortBy
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

    fun updateFilterSort(minDiscountPercent: Int?, sortBy: String?) {
        _uiState.value = _uiState.value.copy(
            minDiscountPercent = minDiscountPercent,
            sortBy = sortBy
        )
        loadDeals()
    }

    fun resetFilterSort() {
        _uiState.value = _uiState.value.copy(
            minDiscountPercent = null,
            sortBy = null
        )
        loadDeals()
    }

    fun loadForYou() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isForYouLoading = true, forYouErrorMessage = null)
            val location = _uiState.value.location
            discoveryRepository.getForYou(location.latitude, location.longitude, location.radiusKm).fold(
                onSuccess = { _uiState.value = _uiState.value.copy(forYou = it, isForYouLoading = false) },
                onFailure = {
                    _uiState.value = _uiState.value.copy(
                        isForYouLoading = false,
                        forYouErrorMessage = it.localizedMessage ?: "Không thể tải gợi ý dành cho bạn"
                    )
                }
            )
        }
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

    // --- Rescue Basket KC03 & KC04 ---

    fun initCustomBasket(basket: BasketSuggestion, allDeals: List<Deal> = emptyList()) {
        val customItems = basket.items.map { item ->
            val matchingDeal = allDeals.find { it.id == item.offerId }
            com.surplusiq.app.domain.model.BasketCustomItem(
                offerId = item.offerId,
                title = item.title,
                price = item.price,
                quantity = 1,
                imageUrl = matchingDeal?.coverImageUrl,
                allergens = matchingDeal?.allergens ?: emptyList()
            )
        }
        _uiState.value = _uiState.value.copy(
            activeBasketStoreId = basket.storeId,
            activeBasketStoreName = basket.storeName,
            customBasketItems = customItems,
            availableSubstitutes = emptyList(),
            substitutesErrorMessage = null,
            basketCheckoutResult = null,
            basketCheckoutError = null
        )
    }

    fun updateBasketItemQuantity(offerId: String, newQuantity: Int) {
        val currentItems = _uiState.value.customBasketItems
        val updated = if (newQuantity <= 0) {
            currentItems.filterNot { it.offerId == offerId }
        } else {
            currentItems.map { if (it.offerId == offerId) it.copy(quantity = newQuantity) else it }
        }
        _uiState.value = _uiState.value.copy(customBasketItems = updated)
    }

    fun removeBasketItem(offerId: String) {
        updateBasketItemQuantity(offerId, 0)
    }

    fun loadSubstitutes(avoidAllergens: List<String> = emptyList()) {
        val storeId = _uiState.value.activeBasketStoreId ?: return
        val currentOfferIds = _uiState.value.customBasketItems.map { it.offerId }
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isSubstitutesLoading = true, substitutesErrorMessage = null)
            val result = discoveryRepository.getBasketSubstitutes(
                storeId = storeId,
                excludeOfferIds = currentOfferIds,
                avoidAllergens = avoidAllergens
            )
            result.fold(
                onSuccess = { substitutes ->
                    _uiState.value = _uiState.value.copy(
                        availableSubstitutes = substitutes,
                        isSubstitutesLoading = false
                    )
                },
                onFailure = { error ->
                    _uiState.value = _uiState.value.copy(
                        isSubstitutesLoading = false,
                        substitutesErrorMessage = error.localizedMessage ?: "Không thể tải món thay thế"
                    )
                }
            )
        }
    }

    fun substituteItem(oldOfferId: String, substitute: com.surplusiq.app.domain.model.BasketSubstituteItem) {
        val currentItems = _uiState.value.customBasketItems
        val oldItem = currentItems.find { it.offerId == oldOfferId }
        val qty = oldItem?.quantity ?: 1
        val newItem = com.surplusiq.app.domain.model.BasketCustomItem(
            offerId = substitute.id,
            title = substitute.title,
            price = substitute.currentPrice,
            quantity = qty,
            imageUrl = substitute.imageUrl,
            allergens = substitute.allergens
        )
        val updated = currentItems.map { if (it.offerId == oldOfferId) newItem else it }
        _uiState.value = _uiState.value.copy(
            customBasketItems = updated,
            availableSubstitutes = _uiState.value.availableSubstitutes.filterNot { it.id == substitute.id }
        )
    }

    fun checkoutBasket(
        pickupTimeWindow: String? = null,
        notes: String? = null,
        onSuccess: (com.surplusiq.app.domain.model.BasketHoldResult) -> Unit = {}
    ) {
        val storeId = _uiState.value.activeBasketStoreId ?: return
        val items = _uiState.value.customBasketItems.map { it.offerId to it.quantity }
        if (items.isEmpty()) return

        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isCheckingOutBasket = true, basketCheckoutError = null)
            val result = discoveryRepository.checkoutBasket(
                storeId = storeId,
                items = items,
                pickupTimeWindow = pickupTimeWindow,
                notes = notes
            )
            result.fold(
                onSuccess = { holdResult ->
                    _uiState.value = _uiState.value.copy(
                        isCheckingOutBasket = false,
                        basketCheckoutResult = holdResult,
                        basketCheckoutError = null
                    )
                    onSuccess(holdResult)
                },
                onFailure = { error ->
                    _uiState.value = _uiState.value.copy(
                        isCheckingOutBasket = false,
                        basketCheckoutError = error.localizedMessage ?: "Không thể đặt giữ giỏ hàng"
                    )
                }
            )
        }
    }

    /**
     * KX06: Tải trạng thái đăng ký báo khi có hàng lại
     */
    fun loadBackInStockStatus(dealId: String) {
        viewModelScope.launch {
            discoveryRepository.getBackInStockStatus(dealId).onSuccess { subscribed ->
                _uiState.value = _uiState.value.copy(isBackInStockSubscribed = subscribed)
            }
        }
    }

    /**
     * KX06: Bật/tắt thông báo khi deal có hàng lại
     */
    fun toggleBackInStock(dealId: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isTogglingBackInStock = true, backInStockMessage = null)
            val result = discoveryRepository.toggleBackInStock(dealId)
            result.fold(
                onSuccess = { res ->
                    _uiState.value = _uiState.value.copy(
                        isTogglingBackInStock = false,
                        isBackInStockSubscribed = res.subscribed,
                        backInStockMessage = res.message ?: if (res.subscribed) "Đã bật báo khi có hàng lại" else "Đã tắt báo có hàng"
                    )
                },
                onFailure = { err ->
                    _uiState.value = _uiState.value.copy(
                        isTogglingBackInStock = false,
                        backInStockMessage = err.localizedMessage ?: "Không thể đăng ký nhận tin"
                    )
                }
            )
        }
    }

    /**
     * KX07: Lấy lịch sử biến động giá minh bạch của deal
     */
    fun loadPriceHistory(dealId: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isPriceHistoryLoading = true, priceHistoryError = null)
            val result = discoveryRepository.getPriceHistory(dealId)
            result.fold(
                onSuccess = { dto ->
                    _uiState.value = _uiState.value.copy(
                        priceHistory = dto,
                        isPriceHistoryLoading = false
                    )
                },
                onFailure = { err ->
                    _uiState.value = _uiState.value.copy(
                        priceHistoryError = err.localizedMessage ?: "Không thể tải lịch sử giá",
                        isPriceHistoryLoading = false
                    )
                }
            )
        }
    }

    override fun onCleared() {
        super.onCleared()
        realtimeWebSocketClient.disconnect()
    }
}
