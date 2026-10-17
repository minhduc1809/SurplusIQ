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
    @SerializedName("rating") val rating: Double? = 4.8,
    @SerializedName("reviewCount") val reviewCount: Int? = 120,
    @SerializedName("logoUrl") val logoUrl: String? = null,
    @SerializedName("coverImageUrl") val coverImageUrl: String? = null,
    @SerializedName("isFavorite") val isFavorite: Boolean = false
)

data class MapPinDto(
    @SerializedName("storeId") val storeId: String,
    @SerializedName("storeName") val storeName: String,
    @SerializedName("latitude") val latitude: Double,
    @SerializedName("longitude") val longitude: Double,
    @SerializedName("availableDealsCount") val availableDealsCount: Int,
    @SerializedName("lowestPrice") val lowestPrice: Double? = null
)
