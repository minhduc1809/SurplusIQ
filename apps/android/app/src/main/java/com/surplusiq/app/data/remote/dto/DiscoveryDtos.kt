package com.surplusiq.app.data.remote.dto

import com.google.gson.annotations.SerializedName

data class NearbyDealsResponse(
    @SerializedName("data") val data: List<DealItemDto> = emptyList(),
    @SerializedName("meta") val meta: PaginationMetaDto? = null
)

data class PaginationMetaDto(
    @SerializedName("total") val total: Int,
    @SerializedName("page") val page: Int,
    @SerializedName("limit") val limit: Int,
    @SerializedName("totalPages") val totalPages: Int
)

data class DealItemDto(
    @SerializedName("id") val id: String,
    @SerializedName("itemId") val itemId: String? = null,
    @SerializedName("storeId") val storeId: String,
    @SerializedName("storeName") val storeName: String,
    @SerializedName("storeAddress") val storeAddress: String? = null,
    @SerializedName("storeLogoUrl") val storeLogoUrl: String? = null,
    @SerializedName("distanceMeters") val distanceMeters: Double? = null,
    @SerializedName("distanceKm") val distanceKm: Double? = null,
    @SerializedName("title") val title: String,
    @SerializedName("category") val category: String? = null,
    @SerializedName("imageUrl") val imageUrl: String? = null,
    @SerializedName("originalPrice") val originalPrice: Double,
    @SerializedName("currentPrice") val currentPrice: Double,
    @SerializedName("discountPercent") val discountPercent: Int,
    @SerializedName("remainingQuantity") val remainingQuantity: Int,
    @SerializedName("pickupStart") val pickupStart: String? = null,
    @SerializedName("pickupEnd") val pickupEnd: String? = null,
    @SerializedName("expiresAt") val expiresAt: String? = null
)

data class DealDetailDto(
    @SerializedName("id") val id: String,
    @SerializedName("title") val title: String,
    @SerializedName("description") val description: String? = null,
    @SerializedName("category") val category: String? = null,
    @SerializedName("originalPrice") val originalPrice: Double,
    @SerializedName("currentPrice") val currentPrice: Double,
    @SerializedName("discountPercent") val discountPercent: Int,
    @SerializedName("remainingQuantity") val remainingQuantity: Int,
    @SerializedName("pickupStart") val pickupStart: String? = null,
    @SerializedName("pickupEnd") val pickupEnd: String? = null,
    @SerializedName("store") val store: StoreDetailDto? = null,
    @SerializedName("allergens") val allergens: List<String> = emptyList(),
    @SerializedName("dietaryTypes") val dietaryTypes: List<String> = emptyList(),
    @SerializedName("whatYouCouldGet") val whatYouCouldGet: List<String> = emptyList()
)

data class StoreDetailDto(
    @SerializedName("id") val id: String,
    @SerializedName("name") val name: String,
    @SerializedName("address") val address: String,
    @SerializedName("rating") val rating: Double? = null,
    @SerializedName("reviewCount") val reviewCount: Int? = null,
    @SerializedName("logoUrl") val logoUrl: String? = null,
    @SerializedName("coverImageUrl") val coverImageUrl: String? = null,
    @SerializedName("isFavorite") val isFavorite: Boolean = false
)

// --- Rescue Radar (CM-C05) ---
data class RadarResponseDto(
    @SerializedName("data") val data: List<RadarItemDto> = emptyList(),
    @SerializedName("meta") val meta: RadarMetaDto? = null
)

data class RadarMetaDto(
    @SerializedName("total") val total: Int,
    @SerializedName("locationSource") val locationSource: String? = null
)

data class RadarItemDto(
    @SerializedName("id") val id: String,
    @SerializedName("storeId") val storeId: String,
    @SerializedName("itemId") val itemId: String? = null,
    @SerializedName("storeName") val storeName: String,
    @SerializedName("storeAddress") val storeAddress: String? = null,
    @SerializedName("title") val title: String,
    @SerializedName("category") val category: String? = null,
    @SerializedName("imageUrl") val imageUrl: String? = null,
    @SerializedName("originalPrice") val originalPrice: Double,
    @SerializedName("currentPrice") val currentPrice: Double,
    @SerializedName("discountPercent") val discountPercent: Int,
    @SerializedName("remainingQuantity") val remainingQuantity: Int,
    @SerializedName("pickupEnd") val pickupEnd: String? = null,
    @SerializedName("distanceMeters") val distanceMeters: Double? = null,
    @SerializedName("minutesLeftToPickup") val minutesLeftToPickup: Int,
    @SerializedName("canArriveInTime") val canArriveInTime: Boolean? = null,
    @SerializedName("travelTimeSource") val travelTimeSource: String? = null,
    @SerializedName("rankingScore") val rankingScore: Double,
    @SerializedName("rankingReasons") val rankingReasons: List<String> = emptyList()
)

// --- TrustPass (CM-C03) ---
data class TrustpassDto(
    @SerializedName("itemId") val itemId: String,
    @SerializedName("ingredients") val ingredients: String? = null,
    @SerializedName("allergens") val allergens: List<String>? = null,
    @SerializedName("expiryAt") val expiryAt: String? = null,
    @SerializedName("pickupWindowNote") val pickupWindowNote: String? = null,
    @SerializedName("storageInstructions") val storageInstructions: String? = null,
    @SerializedName("informationSource") val informationSource: String? = null,
    @SerializedName("verificationStatus") val verificationStatus: String? = null,
    @SerializedName("versionNo") val versionNo: Int? = null,
    @SerializedName("publishedAt") val publishedAt: String? = null,
    @SerializedName("reviewStatus") val reviewStatus: String? = null,
    @SerializedName("missingFields") val missingFields: List<String> = emptyList(),
    @SerializedName("isOfferActive") val isOfferActive: Boolean? = null
)

// --- Rescue Basket (CM-C01) ---
data class SuggestBasketRequest(
    @SerializedName("budgetMax") val budgetMax: Double,
    @SerializedName("peopleCount") val peopleCount: Int,
    @SerializedName("latitude") val latitude: Double? = null,
    @SerializedName("longitude") val longitude: Double? = null,
    @SerializedName("radiusKm") val radiusKm: Double? = null,
    @SerializedName("avoidAllergens") val avoidAllergens: List<String>? = null
)

data class SuggestBasketResponse(
    @SerializedName("hasResults") val hasResults: Boolean,
    @SerializedName("message") val message: String? = null,
    @SerializedName("baskets") val baskets: List<BasketCandidateDto> = emptyList()
)

data class BasketCandidateDto(
    @SerializedName("storeId") val storeId: String,
    @SerializedName("storeName") val storeName: String,
    @SerializedName("items") val items: List<BasketItemDto> = emptyList(),
    @SerializedName("estimatedTotal") val estimatedTotal: Double,
    @SerializedName("withinBudget") val withinBudget: Boolean,
    @SerializedName("meetsPeopleCount") val meetsPeopleCount: Boolean,
    @SerializedName("rankingReasons") val rankingReasons: List<String> = emptyList()
)

data class BasketItemDto(
    @SerializedName("offerId") val offerId: String,
    @SerializedName("title") val title: String,
    @SerializedName("price") val price: Double
)

// --- Bản đồ deal (R1-021): DiscoveryService.findMapPins ---
data class MapPinDto(
    @SerializedName("storeId") val storeId: String,
    @SerializedName("storeName") val storeName: String,
    @SerializedName("storeAddress") val storeAddress: String? = null,
    @SerializedName("latitude") val latitude: Double,
    @SerializedName("longitude") val longitude: Double,
    @SerializedName("activeDealsCount") val activeDealsCount: Int = 0,
    @SerializedName("minPrice") val minPrice: Double? = null,
    @SerializedName("maxDiscountPercent") val maxDiscountPercent: Int? = null,
    @SerializedName("distanceMeters") val distanceMeters: Double? = null
)

// --- Chi tiết cửa hàng (R1-027) + store trong chi tiết/so sánh deal ---
data class StoreDetailResponse(
    @SerializedName("store") val store: StoreProfileDto,
    @SerializedName("activeDeals") val activeDeals: List<OfferSummaryDto> = emptyList()
)

data class StoreProfileDto(
    @SerializedName("id") val id: String,
    @SerializedName("name") val name: String,
    @SerializedName("address") val address: String? = null,
    @SerializedName("phone") val phone: String? = null,
    @SerializedName("logoUrl") val logoUrl: String? = null,
    // jsonb tự do: {"monday": {"open":"07:00","close":"21:30","closed":false}}
    @SerializedName("openHours") val openHours: Map<String, Any?>? = null,
    @SerializedName("averageRating") val averageRating: Double? = null,
    @SerializedName("reviewsCount") val reviewsCount: Int? = null
)

/** Suất bán dạng rút gọn: activeDeals của cửa hàng và deal trong saved-deals. */
data class OfferSummaryDto(
    @SerializedName("id") val id: String,
    @SerializedName("storeId") val storeId: String? = null,
    @SerializedName("storeName") val storeName: String? = null,
    @SerializedName("storeAddress") val storeAddress: String? = null,
    @SerializedName("title") val title: String,
    @SerializedName("category") val category: String? = null,
    @SerializedName("imageUrl") val imageUrl: String? = null,
    @SerializedName("originalPrice") val originalPrice: Double,
    @SerializedName("currentPrice") val currentPrice: Double,
    @SerializedName("discountPercent") val discountPercent: Int = 0,
    @SerializedName("remainingQuantity") val remainingQuantity: Int = 0,
    @SerializedName("pickupStart") val pickupStart: String? = null,
    @SerializedName("pickupEnd") val pickupEnd: String? = null
)

// --- So sánh deal (R1-036): mỗi phần tử là shape của DiscoveryService.getDealDetail ---
data class CompareDealsResponse(
    @SerializedName("count") val count: Int,
    @SerializedName("deals") val deals: List<CompareDealDto> = emptyList()
)

data class CompareDealDto(
    @SerializedName("id") val id: String,
    @SerializedName("isAvailable") val isAvailable: Boolean = true,
    @SerializedName("originalPrice") val originalPrice: Double,
    @SerializedName("currentPrice") val currentPrice: Double,
    @SerializedName("discountPercent") val discountPercent: Int = 0,
    @SerializedName("remainingQuantity") val remainingQuantity: Int = 0,
    @SerializedName("pickupStart") val pickupStart: String? = null,
    @SerializedName("pickupEnd") val pickupEnd: String? = null,
    @SerializedName("item") val item: CompareItemDto? = null,
    @SerializedName("store") val store: StoreProfileDto? = null
)

data class CompareItemDto(
    @SerializedName("name") val name: String? = null,
    @SerializedName("ingredients") val ingredients: String? = null,
    @SerializedName("allergens") val allergens: List<String>? = null,
    @SerializedName("imageUrl") val imageUrl: String? = null
)

// --- Deal đã lưu (R1-034) & lịch sử xem (R1-035) ---
data class SavedDealEntryDto(
    @SerializedName("offerId") val offerId: String,
    @SerializedName("savedAt") val savedAt: String? = null,
    @SerializedName("isExpired") val isExpired: Boolean = false,
    @SerializedName("deal") val deal: OfferSummaryDto? = null
)

data class ViewHistoryDto(
    @SerializedName("id") val id: String,
    @SerializedName("offerId") val offerId: String,
    @SerializedName("viewedAt") val viewedAt: String? = null,
    @SerializedName("title") val title: String,
    @SerializedName("storeName") val storeName: String? = null,
    @SerializedName("currentPrice") val currentPrice: Double = 0.0,
    @SerializedName("originalPrice") val originalPrice: Double = 0.0,
    @SerializedName("status") val status: String? = null,
    @SerializedName("remainingQuantity") val remainingQuantity: Int = 0
)

// --- Cảnh báo deal (R1-031, R1-032): criteria là jsonb tự do ---
data class DealAlertDto(
    @SerializedName("id") val id: String,
    @SerializedName("criteria") val criteria: Map<String, Any?> = emptyMap(),
    @SerializedName("isActive") val isActive: Boolean = true,
    @SerializedName("triggeredCount") val triggeredCount: Int = 0,
    @SerializedName("lastTriggeredAt") val lastTriggeredAt: String? = null
)

data class DealAlertRequest(
    @SerializedName("criteria") val criteria: Map<String, Any>? = null,
    @SerializedName("isActive") val isActive: Boolean? = null
)
