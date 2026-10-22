package com.surplusiq.app.data.repository

import android.Manifest
import android.annotation.SuppressLint
import android.content.Context
import android.content.pm.PackageManager
import android.location.Geocoder
import android.location.Location
import android.location.LocationListener
import android.os.Bundle
import android.os.Looper
import com.surplusiq.app.domain.model.LocationAnchors
import android.location.LocationManager
import android.os.CancellationSignal
import androidx.core.content.ContextCompat
import androidx.core.location.LocationManagerCompat
import com.surplusiq.app.data.remote.api.ProfileApiService
import com.surplusiq.app.data.remote.apiCall
import com.surplusiq.app.data.remote.dto.CreateSavedPlaceRequest
import com.surplusiq.app.data.remote.dto.SavedPlaceDto
import com.surplusiq.app.domain.model.AddressSuggestion
import com.surplusiq.app.domain.model.LocationSettings
import com.surplusiq.app.domain.model.SavedPlace
import com.surplusiq.app.domain.repository.LocationRepository
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withContext
import kotlinx.coroutines.withTimeoutOrNull
import java.util.Locale
import javax.inject.Inject
import javax.inject.Singleton
import kotlin.coroutines.resume

@Singleton
class LocationRepositoryImpl @Inject constructor(
    @ApplicationContext private val context: Context,
    private val profileApiService: ProfileApiService
) : LocationRepository {

    // Vị trí chỉ lưu trên máy (BR-013: không gửi vị trí khách lên server ngoài tham số truy vấn deal).
    private val prefs = context.getSharedPreferences("surplusiq_location_prefs", Context.MODE_PRIVATE)
    private val _location = MutableStateFlow(readPersisted())
    override val location: StateFlow<LocationSettings> = _location.asStateFlow()

    override fun isLocationConfigured(): Boolean = prefs.getBoolean(KEY_CONFIGURED, false)

    override fun applyLocation(settings: LocationSettings) {
        if (!settings.isTemporary) {
            prefs.edit().apply {
                putBoolean(KEY_CONFIGURED, true)
                putFloat(KEY_RADIUS, settings.radiusKm.toFloat())
                putString(KEY_LABEL, settings.label)
                if (settings.latitude != null && settings.longitude != null) {
                    putString(KEY_LAT, settings.latitude.toString())
                    putString(KEY_LNG, settings.longitude.toString())
                } else {
                    remove(KEY_LAT)
                    remove(KEY_LNG)
                }
                apply()
            }
        }
        _location.value = settings
    }

    override fun clearTemporaryLocation() {
        _location.value = readPersisted()
    }

    private fun readPersisted() = LocationSettings(
        latitude = prefs.getString(KEY_LAT, null)?.toDoubleOrNull(),
        longitude = prefs.getString(KEY_LNG, null)?.toDoubleOrNull(),
        radiusKm = prefs.getFloat(KEY_RADIUS, LocationSettings.DEFAULT_RADIUS_KM.toFloat()).toDouble(),
        label = prefs.getString(KEY_LABEL, null)
    )

    @SuppressLint("MissingPermission") // đã kiểm tra quyền ngay bên dưới
    override suspend fun getCurrentDeviceLocation(): Result<AddressSuggestion> {
        val granted = listOf(Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION)
            .any { ContextCompat.checkSelfPermission(context, it) == PackageManager.PERMISSION_GRANTED }
        if (!granted) return Result.failure(Exception("Chưa cấp quyền vị trí cho SurplusIQ."))

        val manager = context.getSystemService(Context.LOCATION_SERVICE) as LocationManager
        val location = acquireLocation(manager)
            ?: return Result.failure(
                if (listOf(LocationManager.GPS_PROVIDER, LocationManager.NETWORK_PROVIDER).none { manager.isProviderEnabled(it) })
                    Exception("Dịch vụ định vị đang tắt. Bật vị trí trong cài đặt máy rồi thử lại.")
                else Exception("Không lấy được vị trí hiện tại. Thử lại hoặc nhập địa chỉ thủ công.")
            )

        // Điểm neo: gần địa điểm đã biết thì dùng toạ độ và địa chỉ chuẩn (xem LocationAnchors)
        LocationAnchors.nearest(location.latitude, location.longitude)?.let {
            return Result.success(AddressSuggestion(it.address, it.latitude, it.longitude))
        }
        val address = reverseGeocode(location.latitude, location.longitude) ?: "Vị trí hiện tại"
        return Result.success(AddressSuggestion(address, location.latitude, location.longitude))
    }

    /**
     * Ưu tiên GPS: nghe cả GPS và mạng, dừng khi có điểm sai số <= [TARGET_ACCURACY_METERS]m; hết [LOCATION_TIMEOUT_MS]
     * thì lấy điểm chính xác nhất đã nhận, không có thì dùng vị trí cuối cùng của hệ thống.
     */
    @SuppressLint("MissingPermission")
    private suspend fun acquireLocation(manager: LocationManager): Location? {
        val providers = listOf(LocationManager.GPS_PROVIDER, LocationManager.NETWORK_PROVIDER).filter { manager.isProviderEnabled(it) }
        if (providers.isEmpty()) return null
        var best: Location? = null
        withTimeoutOrNull(LOCATION_TIMEOUT_MS) {
            suspendCancellableCoroutine<Unit> { cont ->
                val listener = object : LocationListener {
                    override fun onLocationChanged(loc: Location) {
                        if (best == null || loc.accuracy < best!!.accuracy) best = loc
                        if (loc.hasAccuracy() && loc.accuracy <= TARGET_ACCURACY_METERS && cont.isActive) cont.resume(Unit)
                    }
                    @Deprecated("Bắt buộc trên API < 29") override fun onStatusChanged(p: String?, s: Int, e: Bundle?) {}
                    override fun onProviderEnabled(p: String) {}
                    override fun onProviderDisabled(p: String) {}
                }
                providers.forEach { manager.requestLocationUpdates(it, 1000L, 0f, listener, Looper.getMainLooper()) }
                cont.invokeOnCancellation { manager.removeUpdates(listener) }
            }
        }
        return best ?: providers.mapNotNull { manager.getLastKnownLocation(it) }.minByOrNull { it.accuracy }
    }

    @Suppress("DEPRECATION") // API đồng bộ chạy trên IO; bản listener chỉ có từ API 33 (minSdk 26)
    override suspend fun searchAddress(query: String): Result<List<AddressSuggestion>> = withContext(Dispatchers.IO) {
        if (!Geocoder.isPresent()) return@withContext Result.failure(Exception("Thiết bị không hỗ trợ tìm địa chỉ."))
        try {
            val results = geocoder().getFromLocationName(query, MAX_SUGGESTIONS).orEmpty().map {
                AddressSuggestion(it.getAddressLine(0) ?: query, it.latitude, it.longitude)
            }
            Result.success(results)
        } catch (e: Exception) {
            Result.failure(Exception("Không tìm được địa chỉ. Kiểm tra mạng rồi thử lại.", e))
        }
    }

    @Suppress("DEPRECATION")
    override suspend fun reverseGeocode(latitude: Double, longitude: Double): String? = withContext(Dispatchers.IO) {
        LocationAnchors.nearest(latitude, longitude)?.let { return@withContext it.address }
        if (!Geocoder.isPresent()) return@withContext null
        try {
            geocoder().getFromLocation(latitude, longitude, 1)?.firstOrNull()?.getAddressLine(0)
        } catch (_: Exception) {
            null
        }
    }

    override suspend fun getSavedPlaces(): Result<List<SavedPlace>> =
        apiCall("Không thể tải địa điểm đã lưu", { profileApiService.getSavedPlaces() }) { it }
            .map { list -> list.mapNotNull { toSavedPlace(it) } }

    override suspend fun createSavedPlace(
        label: String,
        latitude: Double,
        longitude: Double,
        radiusKm: Double?
    ): Result<SavedPlace> =
        apiCall("Không thể lưu địa điểm", {
            profileApiService.createSavedPlace(CreateSavedPlaceRequest(label.trim(), latitude, longitude, radiusKm))
        }) { it }.mapCatching { dto -> toSavedPlace(dto) ?: error("Địa điểm trả về thiếu tọa độ") }

    override suspend fun deleteSavedPlace(id: String): Result<Unit> =
        apiCall("Không thể xóa địa điểm", { profileApiService.deleteSavedPlace(id) }) { }

    private suspend fun toSavedPlace(dto: SavedPlaceDto): SavedPlace? {
        val coords = dto.location?.coordinates ?: return null
        if (coords.size < 2) return null
        val (lng, lat) = coords // GeoJSON: [longitude, latitude]
        return SavedPlace(dto.id, dto.label, lat, lng, dto.radiusKm, reverseGeocode(lat, lng))
    }

    private fun geocoder() = Geocoder(context, Locale.forLanguageTag("vi-VN"))

    private companion object {
        const val KEY_CONFIGURED = "key_location_configured"
        const val KEY_LAT = "key_location_lat"
        const val KEY_LNG = "key_location_lng"
        const val KEY_RADIUS = "key_location_radius_km"
        const val KEY_LABEL = "key_location_label"
        const val LOCATION_TIMEOUT_MS = 20_000L
        const val TARGET_ACCURACY_METERS = 30f
        const val MAX_SUGGESTIONS = 5
    }
}
