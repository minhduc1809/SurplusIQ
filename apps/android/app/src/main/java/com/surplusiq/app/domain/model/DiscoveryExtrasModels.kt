package com.surplusiq.app.domain.model

/**
 * Vị trí dùng để khám phá deal (K06/K08). latitude/longitude null = chưa có vị trí,
 * khi đó backend trả deal không lọc theo bán kính. isTemporary = ghim tạm (K08), không lưu bền.
 */
data class LocationSettings(
    val latitude: Double? = null,
    val longitude: Double? = null,
    val radiusKm: Double = DEFAULT_RADIUS_KM,
    val label: String? = null,
    val isTemporary: Boolean = false
) {
    val hasCoordinates: Boolean get() = latitude != null && longitude != null

    companion object {
        const val DEFAULT_RADIUS_KM = 2.0
        const val MIN_RADIUS_KM = 0.5
        const val MAX_RADIUS_KM = 10.0
    }
}

/** Kết quả tìm địa chỉ/định vị trên thiết bị (Geocoder/LocationManager của Android). */
data class AddressSuggestion(
    val address: String,
    val latitude: Double,
    val longitude: Double
)

/** Địa điểm quen thuộc (K07, R1-015), tối đa 5. address là reverse-geocode trên máy, backend không lưu. */
data class SavedPlace(
    val id: String,
    val label: String,
    val latitude: Double,
    val longitude: Double,
    val radiusKm: Double?,
    val address: String?
) {
    companion object {
        const val MAX_PLACES = 5
        const val MAX_LABEL_LENGTH = 30
    }
}

/** Điểm ghim cửa hàng trên bản đồ deal (K10, R1-021). */
data class MapPin(
    val storeId: String,
    val storeName: String,
    val storeAddress: String,
    val latitude: Double,
    val longitude: Double,
    val activeDealsCount: Int,
    val minPrice: Int?,
    val maxDiscountPercent: Int,
    val distanceText: String?,
    /** Loại món của các suất đang mở (để lọc theo loại trên bản đồ). */
    val categories: List<String> = emptyList()
)

/** Chi tiết cửa hàng (K14, R1-027); cũng dùng cho danh sách cửa hàng yêu thích (K18). */
data class StoreDetail(
    val id: String,
    val name: String,
    val address: String,
    val phone: String?,
    val logoUrl: String?,
    val averageRating: Double?,
    val reviewsCount: Int,
    val todayHours: String?,
    val weeklyHours: List<Pair<String, String>>,
    val activeDeals: List<Deal>
)

/** Một mục "Đã lưu" hoặc "Xem gần đây" (K17). deal null khi suất đã bị xóa khỏi hệ thống. */
data class SavedDealItem(
    val offerId: String,
    val deal: Deal?,
    val isExpired: Boolean
)

/** Một cột trong bảng so sánh deal (K16, R1-036). */
data class CompareDeal(
    val id: String,
    val title: String,
    val storeName: String,
    val imageUrl: String?,
    val originalPrice: Int,
    val currentPrice: Int,
    val discountPercent: Int,
    val pickupWindow: String,
    val ingredients: String?,
    val allergens: List<String>?,
    val rating: Double?,
    val reviewsCount: Int,
    val remainingQuantity: Int,
    val isAvailable: Boolean
) {
    companion object {
        const val MIN_ITEMS = 2
        const val MAX_ITEMS = 3
    }
}

/** Tiêu chí cảnh báo deal (K19/K20). Lưu vào jsonb criteria của backend với đúng các key bên dưới. */
data class DealAlertCriteria(
    val category: String? = null,
    val storeId: String? = null,
    val storeName: String? = null,
    val maxPrice: Int? = null,
    val minDiscountPercent: Int? = null,
    val timeFrom: String? = null,
    val timeTo: String? = null,
    val radiusKm: Double? = null,
    val notifyAt: String? = null
) {
    val isEmpty: Boolean get() = this == DealAlertCriteria()
}

data class DealAlert(
    val id: String,
    val criteria: DealAlertCriteria,
    val isActive: Boolean,
    val triggeredCount: Int,
    val lastTriggeredAt: String?
)

/** Cửa hàng tìm được để chọn trong form cảnh báo (K20). */
data class StoreOption(val id: String, val name: String, val address: String)

// --- Rescue Basket Tùy chỉnh & Đặt giữ (KC03, KC04) ---
data class BasketCustomItem(
    val offerId: String,
    val title: String,
    val price: Int,
    val quantity: Int = 1,
    val imageUrl: String? = null,
    val allergens: List<String> = emptyList()
)

data class BasketSubstituteItem(
    val id: String,
    val title: String,
    val currentPrice: Int,
    val originalPrice: Int,
    val discountPercent: Int,
    val remainingQuantity: Int,
    val imageUrl: String?,
    val category: String?,
    val allergens: List<String>
)

data class BasketHeldItem(
    val offerId: String,
    val orderId: String,
    val title: String,
    val quantity: Int,
    val unitPrice: Int,
    val totalPrice: Int
)

data class BasketHoldResult(
    val success: Boolean,
    val storeId: String,
    val orderIds: List<String>,
    val totalAmount: Int,
    val holdExpiresAt: String,
    val items: List<BasketHeldItem>,
    val message: String?
)

