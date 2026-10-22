package com.surplusiq.app.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.surplusiq.app.domain.model.AddressSuggestion
import com.surplusiq.app.domain.model.LocationSettings
import com.surplusiq.app.domain.model.SavedPlace
import com.surplusiq.app.domain.repository.LocationRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class PlacesUiState(
    val location: LocationSettings = LocationSettings(),
    /** Vị trí đang chọn trên K06/K07/K08 (chưa áp dụng). */
    val selected: AddressSuggestion? = null,
    val suggestions: List<AddressSuggestion> = emptyList(),
    val isSearching: Boolean = false,
    val isLocating: Boolean = false,
    /** Vị trí thiết bị lấy được ở màn bản đồ (vẽ chấm "bạn đang ở đây"). */
    val deviceLocation: AddressSuggestion? = null,
    val locateError: String? = null,
    val savedPlaces: List<SavedPlace> = emptyList(),
    val isPlacesLoading: Boolean = false,
    val placesError: String? = null,
    val isSaving: Boolean = false,
    val message: String? = null
)

/** K06 Quyền vị trí & bán kính, K07 Địa điểm của tôi, K08 Ghim vị trí tạm. */
@HiltViewModel
class PlacesViewModel @Inject constructor(
    private val locationRepository: LocationRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(PlacesUiState())
    val uiState: StateFlow<PlacesUiState> = _uiState.asStateFlow()

    init {
        viewModelScope.launch {
            locationRepository.location.collect { location -> _uiState.update { it.copy(location = location) } }
        }
    }

    fun isLocationConfigured(): Boolean = locationRepository.isLocationConfigured()

    /**
     * Tài khoản đã có địa điểm lưu trên máy chủ (vd. "Công ty") thì dùng địa điểm đầu tiên làm vị trí ban đầu,
     * không bắt chọn lại. Trả false khi chưa có địa điểm nào (tài khoản mới) để hiện màn chọn vị trí.
     */
    suspend fun restoreFromSavedPlaces(): Boolean {
        val place = locationRepository.getSavedPlaces().getOrNull()?.firstOrNull() ?: return false
        locationRepository.applyLocation(
            LocationSettings(
                latitude = place.latitude,
                longitude = place.longitude,
                radiusKm = place.radiusKm ?: LocationSettings.DEFAULT_RADIUS_KM,
                label = place.label
            )
        )
        return true
    }

    /** Mở màn chọn vị trí: bắt đầu từ vị trí đang dùng (nếu có). */
    fun startSelection() {
        val current = _uiState.value.location
        _uiState.update {
            it.copy(
                selected = if (current.latitude != null && current.longitude != null) {
                    AddressSuggestion(current.label ?: "Vị trí đang dùng", current.latitude, current.longitude)
                } else null,
                suggestions = emptyList()
            )
        }
    }

    /** Form thêm địa điểm (K07) bắt đầu trống. */
    fun clearSelection() = _uiState.update { it.copy(selected = null, suggestions = emptyList()) }

    fun searchAddress(query: String) {
        if (query.isBlank()) return
        viewModelScope.launch {
            _uiState.update { it.copy(isSearching = true) }
            locationRepository.searchAddress(query.trim()).fold(
                onSuccess = { results ->
                    _uiState.update {
                        it.copy(
                            isSearching = false,
                            suggestions = results,
                            message = if (results.isEmpty()) "Không tìm thấy địa chỉ phù hợp." else null
                        )
                    }
                },
                onFailure = { e -> _uiState.update { it.copy(isSearching = false, message = e.message) } }
            )
        }
    }

    fun selectSuggestion(suggestion: AddressSuggestion) {
        _uiState.update { it.copy(selected = suggestion, suggestions = emptyList()) }
    }

    fun useDeviceLocation() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLocating = true) }
            locationRepository.getCurrentDeviceLocation().fold(
                onSuccess = { found -> _uiState.update { it.copy(isLocating = false, selected = found) } },
                onFailure = { e -> _uiState.update { it.copy(isLocating = false, message = e.message) } }
            )
        }
    }

    /** Nút định vị trên bản đồ: lấy vị trí máy, dùng làm vị trí tìm quán (tạm thời, không ghi đè địa điểm đã lưu). */
    fun locateMe() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLocating = true, locateError = null) }
            locationRepository.getCurrentDeviceLocation().fold(
                onSuccess = { found ->
                    locationRepository.applyLocation(
                        LocationSettings(
                            latitude = found.latitude,
                            longitude = found.longitude,
                            radiusKm = _uiState.value.location.radiusKm,
                            label = found.address,
                            isTemporary = true
                        )
                    )
                    _uiState.update { it.copy(isLocating = false, deviceLocation = found) }
                },
                onFailure = { e -> _uiState.update { it.copy(isLocating = false, locateError = e.message) } }
            )
        }
    }

    fun reportLocatePermissionDenied() = _uiState.update {
        it.copy(locateError = "Chưa cấp quyền vị trí. Bạn có thể nhập địa chỉ hoặc ghim vị trí thủ công.")
    }

    /** K08: tâm bản đồ dừng ở điểm mới -> tra địa chỉ của điểm ghim. */
    fun onPinMoved(latitude: Double, longitude: Double) {
        _uiState.update { it.copy(selected = AddressSuggestion(PIN_RESOLVING, latitude, longitude)) }
        viewModelScope.launch {
            val address = locationRepository.reverseGeocode(latitude, longitude)
                ?: "%.5f, %.5f".format(latitude, longitude)
            _uiState.update { state ->
                if (state.selected?.latitude == latitude && state.selected.longitude == longitude) {
                    state.copy(selected = AddressSuggestion(address, latitude, longitude))
                } else state
            }
        }
    }

    /**
     * Áp dụng vị trí đang chọn (hoặc giữ tọa độ hiện có nếu chỉ đổi bán kính).
     * temporary = ghim tạm K08, không ghi đè vị trí đã lưu.
     */
    fun applyLocation(radiusKm: Double, temporary: Boolean = false) {
        val selected = _uiState.value.selected
        val current = _uiState.value.location
        locationRepository.applyLocation(
            LocationSettings(
                latitude = selected?.latitude ?: current.latitude,
                longitude = selected?.longitude ?: current.longitude,
                radiusKm = radiusKm.coerceIn(LocationSettings.MIN_RADIUS_KM, LocationSettings.MAX_RADIUS_KM),
                label = selected?.address ?: current.label,
                isTemporary = temporary
            )
        )
    }

    fun applySavedPlace(place: SavedPlace) {
        locationRepository.applyLocation(
            LocationSettings(
                latitude = place.latitude,
                longitude = place.longitude,
                radiusKm = place.radiusKm ?: _uiState.value.location.radiusKm,
                label = place.label
            )
        )
    }

    fun loadSavedPlaces() {
        viewModelScope.launch {
            _uiState.update { it.copy(isPlacesLoading = true, placesError = null) }
            locationRepository.getSavedPlaces().fold(
                onSuccess = { places -> _uiState.update { it.copy(isPlacesLoading = false, savedPlaces = places) } },
                onFailure = { e -> _uiState.update { it.copy(isPlacesLoading = false, placesError = e.message) } }
            )
        }
    }

    /** Lưu vị trí đang chọn thành địa điểm quen thuộc (K07 form, chip "Lưu thành địa điểm" ở K08). */
    fun createPlace(label: String, radiusKm: Double?, onSuccess: () -> Unit = {}) {
        val selected = _uiState.value.selected ?: run {
            _uiState.update { it.copy(message = "Chọn địa chỉ trước khi lưu.") }
            return
        }
        viewModelScope.launch {
            _uiState.update { it.copy(isSaving = true) }
            locationRepository.createSavedPlace(label, selected.latitude, selected.longitude, radiusKm).fold(
                onSuccess = { place ->
                    _uiState.update {
                        it.copy(isSaving = false, savedPlaces = listOf(place) + it.savedPlaces, message = "Đã lưu \"${place.label}\".")
                    }
                    onSuccess()
                },
                onFailure = { e -> _uiState.update { it.copy(isSaving = false, message = e.message) } }
            )
        }
    }

    fun deletePlace(place: SavedPlace) {
        viewModelScope.launch {
            locationRepository.deleteSavedPlace(place.id).fold(
                onSuccess = { _uiState.update { s -> s.copy(savedPlaces = s.savedPlaces - place, message = "Đã xóa \"${place.label}\".") } },
                onFailure = { e -> _uiState.update { it.copy(message = e.message) } }
            )
        }
    }

    fun consumeMessage() = _uiState.update { it.copy(message = null) }

    companion object {
        const val PIN_RESOLVING = "Đang xác định địa chỉ..."
    }
}
