package com.surplusiq.app.domain.repository

import com.surplusiq.app.domain.model.AddressSuggestion
import com.surplusiq.app.domain.model.LocationSettings
import com.surplusiq.app.domain.model.SavedPlace
import kotlinx.coroutines.flow.StateFlow

/** Nhóm "Truy cập và vị trí" (K06-K08): vị trí khám phá, định vị/tìm địa chỉ trên máy, địa điểm đã lưu. */
interface LocationRepository {
    /** Vị trí đang dùng để lọc deal; ghim tạm (K08) ghi đè tạm thời cho tới khi xóa. */
    val location: StateFlow<LocationSettings>

    /** true khi khách đã qua màn quyền vị trí và bán kính (K06) ít nhất một lần. */
    fun isLocationConfigured(): Boolean

    /** Áp dụng vị trí; chỉ lưu bền khi không phải ghim tạm. */
    fun applyLocation(settings: LocationSettings)

    /** Bỏ ghim tạm, quay về vị trí đã lưu. */
    fun clearTemporaryLocation()

    /** Vị trí hiện tại của thiết bị (cần quyền ACCESS_*_LOCATION đã cấp). */
    suspend fun getCurrentDeviceLocation(): Result<AddressSuggestion>

    suspend fun searchAddress(query: String): Result<List<AddressSuggestion>>

    suspend fun reverseGeocode(latitude: Double, longitude: Double): String?

    suspend fun getSavedPlaces(): Result<List<SavedPlace>>

    suspend fun createSavedPlace(label: String, latitude: Double, longitude: Double, radiusKm: Double?): Result<SavedPlace>

    suspend fun deleteSavedPlace(id: String): Result<Unit>
}
