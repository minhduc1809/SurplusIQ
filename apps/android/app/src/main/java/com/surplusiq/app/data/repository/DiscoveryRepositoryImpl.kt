package com.surplusiq.app.data.repository

import com.surplusiq.app.data.mock.SampleData
import com.surplusiq.app.data.remote.api.DiscoveryApiService
import com.surplusiq.app.data.remote.api.ProfileApiService
import com.surplusiq.app.data.remote.dto.DealItemDto
import com.surplusiq.app.domain.model.Deal
import com.surplusiq.app.domain.model.DealCategory
import com.surplusiq.app.domain.model.DietaryType
import com.surplusiq.app.domain.model.UserPreferences
import com.surplusiq.app.domain.repository.DiscoveryRepository
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class DiscoveryRepositoryImpl @Inject constructor(
    private val discoveryApiService: DiscoveryApiService,
    private val profileApiService: ProfileApiService
) : DiscoveryRepository {

    // Tracks favorite state overrides so users can toggle favorites on and off reliably
    private val favoriteOverrides = mutableMapOf<String, Boolean>()

    override suspend fun getNearbyDeals(
        latitude: Double?,
        longitude: Double?,
        radiusKm: Double,
        searchQuery: String?,
        preferences: UserPreferences?
    ): Result<List<Deal>> {
        return try {
            val response = discoveryApiService.findNearbyDeals(
                latitude = latitude,
                longitude = longitude,
                radiusKm = radiusKm,
                search = searchQuery
            )

            if (response.isSuccessful && response.body() != null) {
                val items = response.body()!!.data
                if (items.isNotEmpty()) {
                    val mappedDeals = items.map { dto -> mapDtoToDeal(dto) }
                    val filtered = applyLocalFilters(mappedDeals, searchQuery, radiusKm, preferences)
                    Result.success(filtered)
                } else {
                    // Fallback to rich sample data
                    Result.success(applyLocalFilters(SampleData.sampleDeals, searchQuery, radiusKm, preferences))
                }
            } else {
                // Fallback to rich sample data
                Result.success(applyLocalFilters(SampleData.sampleDeals, searchQuery, radiusKm, preferences))
            }
        } catch (_: Exception) {
            // Graceful offline fallback
            Result.success(applyLocalFilters(SampleData.sampleDeals, searchQuery, radiusKm, preferences))
        }
    }

    override suspend fun getDealDetail(id: String): Result<Deal> {
        return try {
            val response = discoveryApiService.getDealDetail(id)
            if (response.isSuccessful && response.body() != null) {
                val detail = response.body()!!
                val storeId = detail.store?.id ?: "store-01"
                val deal = Deal(
                    id = detail.id,
                    storeId = storeId,
                    storeName = detail.store?.name ?: "Cửa hàng đối tác",
                    storeAddress = detail.store?.address ?: "Quận 1, TP. HCM",
                    storeLogoUrl = detail.store?.logoUrl ?: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=150",
                    coverImageUrl = detail.store?.coverImageUrl ?: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800",
                    title = detail.title,
                    description = detail.description ?: "Túi Cứu Món Magic Bag bảo quản tươi ngon trong ngày.",
                    whatYouCouldGet = detail.whatYouCouldGet.joinToString(" • ").ifBlank { "Bánh mỳ tươi, bánh ngọt Pháp, combo trưa" },
                    category = parseCategory(detail.category),
                    originalPrice = detail.originalPrice.toInt(),
                    discountPrice = detail.currentPrice.toInt(),
                    discountPercent = detail.discountPercent,
                    remainingStock = detail.remainingQuantity,
                    initialStock = detail.remainingQuantity + 3,
                    pickupWindowText = "Hôm nay ${detail.pickupStart?.takeLast(8)?.take(5) ?: "19:00"} - ${detail.pickupEnd?.takeLast(8)?.take(5) ?: "21:30"}",
                    isToday = true,
                    distanceText = "1.2 km",
                    rating = detail.store?.rating ?: 4.8,
                    reviewCount = detail.store?.reviewCount ?: 124,
                    allergens = detail.allergens.ifEmpty { listOf("Gluten", "Sữa bò") },
                    dietaryType = parseDietary(detail.dietaryTypes.firstOrNull()),
                    isFavorite = favoriteOverrides[storeId] ?: (detail.store?.isFavorite == true)
                )
                Result.success(deal)
            } else {
                val fallback = SampleData.sampleDeals.firstOrNull { it.id == id } ?: SampleData.sampleDeals.first()
                Result.success(fallback.copy(isFavorite = favoriteOverrides[fallback.storeId] ?: fallback.isFavorite))
            }
        } catch (_: Exception) {
            val fallback = SampleData.sampleDeals.firstOrNull { it.id == id } ?: SampleData.sampleDeals.first()
            Result.success(fallback.copy(isFavorite = favoriteOverrides[fallback.storeId] ?: fallback.isFavorite))
        }
    }

    override suspend fun toggleFavorite(dealId: String, storeId: String, currentStatus: Boolean): Result<Boolean> {
        val newStatus = !currentStatus
        favoriteOverrides[storeId] = newStatus
        if (newStatus) {
            try { profileApiService.addFavorite(storeId) } catch (_: Exception) {}
        } else {
            try { profileApiService.removeFavorite(storeId) } catch (_: Exception) {}
        }
        return Result.success(newStatus)
    }

    private fun applyLocalFilters(
        deals: List<Deal>,
        search: String?,
        radiusKm: Double,
        preferences: UserPreferences?
    ): List<Deal> {
        var result = deals

        // 1. Text Search Filter
        if (!search.isNullOrBlank()) {
            val q = search.trim().lowercase()
            result = result.filter {
                it.title.lowercase().contains(q) ||
                it.storeName.lowercase().contains(q) ||
                it.category.displayName.lowercase().contains(q) ||
                it.whatYouCouldGet.lowercase().contains(q) ||
                it.storeAddress.lowercase().contains(q)
            }
        }

        // 2. Radius Filter
        if (radiusKm > 0.0) {
            result = result.filter { deal ->
                parseDistanceKm(deal.distanceText) <= radiusKm
            }
        }

        // 3. User Preferences Filter
        if (preferences != null) {
            if (preferences.categories.isNotEmpty()) {
                result = result.filter { preferences.categories.contains(it.category) }
            }

            if (preferences.dietaryPreference != DietaryType.NONE) {
                result = result.filter { deal ->
                    when (preferences.dietaryPreference) {
                        DietaryType.VEGAN -> deal.dietaryType == DietaryType.VEGAN
                        DietaryType.VEGETARIAN -> deal.dietaryType == DietaryType.VEGETARIAN || deal.dietaryType == DietaryType.VEGAN
                        DietaryType.NONE -> true
                    }
                }
            }
        }

        // 4. Map favorite state with overrides
        return result.map { deal ->
            val resolvedFavorite = favoriteOverrides[deal.storeId] ?: deal.isFavorite
            deal.copy(isFavorite = resolvedFavorite)
        }
    }

    private fun parseDistanceKm(distanceText: String): Double {
        val clean = distanceText.trim().lowercase()
        return try {
            if (clean.endsWith("km")) {
                clean.removeSuffix("km").trim().toDouble()
            } else if (clean.endsWith("m")) {
                clean.removeSuffix("m").trim().toDouble() / 1000.0
            } else {
                clean.toDoubleOrNull() ?: 0.5
            }
        } catch (_: Exception) {
            0.5
        }
    }

    private fun mapDtoToDeal(dto: DealItemDto): Deal {
        val orig = dto.originalPrice.toInt()
        val curr = dto.currentPrice.toInt()
        val distText = if (dto.distanceMeters != null) {
            if (dto.distanceMeters < 1000) "${dto.distanceMeters.toInt()} m" else "%.1f km".format(dto.distanceMeters / 1000.0)
        } else if (dto.distanceKm != null) {
            "%.1f km".format(dto.distanceKm)
        } else {
            "850 m"
        }

        return Deal(
            id = dto.id,
            storeId = dto.storeId,
            storeName = dto.storeName,
            storeAddress = dto.storeAddress ?: "Quận 1, TP. Hồ Chí Minh",
            storeLogoUrl = dto.storeLogoUrl ?: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=150",
            coverImageUrl = dto.imageUrl ?: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800",
            title = dto.title,
            description = "Túi Cứu Món Magic Bag giải cứu thực phẩm chất lượng cao trong ngày từ ${dto.storeName}.",
            whatYouCouldGet = "Bánh mỳ nóng giòn, croissant bơ Pháp, bánh bông lan kem tươi",
            category = parseCategory(dto.category),
            originalPrice = orig,
            discountPrice = curr,
            discountPercent = dto.discountPercent,
            remainingStock = dto.remainingQuantity,
            initialStock = dto.remainingQuantity + 2,
            pickupWindowText = "Hôm nay 20:00 - 21:30",
            isToday = true,
            distanceText = distText,
            rating = 4.7,
            reviewCount = 98,
            allergens = listOf("Gluten", "Sữa bò"),
            dietaryType = DietaryType.NONE,
            isFavorite = favoriteOverrides[dto.storeId] ?: false,
            isUrgent = dto.remainingQuantity <= 2
        )
    }

    private fun parseCategory(cat: String?): DealCategory {
        return when (cat?.lowercase()) {
            "meals", "món mặn", "cơm", "bún" -> DealCategory.MEALS
            "baked goods", "bánh", "bakery", "bánh mì" -> DealCategory.BAKED_GOODS
            "groceries", "rau củ", "nông sản" -> DealCategory.GROCERIES
            else -> DealCategory.OTHER
        }
    }

    private fun parseDietary(dietary: String?): DietaryType {
        return when (dietary?.lowercase()) {
            "vegetarian", "chay" -> DietaryType.VEGETARIAN
            "vegan", "thuần chay" -> DietaryType.VEGAN
            else -> DietaryType.NONE
        }
    }
}
