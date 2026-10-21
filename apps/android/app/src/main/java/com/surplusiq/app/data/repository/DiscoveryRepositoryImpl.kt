package com.surplusiq.app.data.repository

import com.surplusiq.app.data.remote.api.DiscoveryApiService
import com.surplusiq.app.data.remote.api.ProfileApiService
import com.surplusiq.app.data.remote.dto.BasketCandidateDto
import com.surplusiq.app.data.remote.dto.BasketSubstitutesRequest
import com.surplusiq.app.data.remote.dto.BasketCheckoutRequest
import com.surplusiq.app.data.remote.dto.BasketCheckoutItemRequest
import com.surplusiq.app.data.remote.dto.DealItemDto
import com.surplusiq.app.data.remote.dto.RadarItemDto
import com.surplusiq.app.data.remote.dto.SuggestBasketRequest
import com.surplusiq.app.domain.model.BasketItem
import com.surplusiq.app.domain.model.BasketSuggestion
import com.surplusiq.app.domain.model.BasketSubstituteItem
import com.surplusiq.app.domain.model.BasketHoldResult
import com.surplusiq.app.domain.model.BasketHeldItem
import com.surplusiq.app.domain.model.Deal
import com.surplusiq.app.domain.model.DealCategory
import com.surplusiq.app.domain.model.DietaryType
import com.surplusiq.app.domain.model.RadarDeal
import com.surplusiq.app.domain.model.TrustpassInfo
import com.surplusiq.app.domain.model.UserPreferences
import com.surplusiq.app.domain.repository.DiscoveryRepository
import com.surplusiq.app.data.remote.apiCall
import com.surplusiq.app.data.remote.dto.DealAlertDto
import com.surplusiq.app.data.remote.dto.DealAlertRequest
import com.surplusiq.app.data.remote.dto.OfferSummaryDto
import com.surplusiq.app.data.remote.dto.StoreProfileDto
import com.surplusiq.app.domain.model.CompareDeal
import com.surplusiq.app.domain.model.DealAlert
import com.surplusiq.app.domain.model.DealAlertCriteria
import com.surplusiq.app.domain.model.MapPin
import com.surplusiq.app.domain.model.SavedDealItem
import com.surplusiq.app.domain.model.StoreDetail
import com.surplusiq.app.domain.model.StoreOption
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.coroutineScope
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import javax.inject.Inject
import javax.inject.Singleton
import kotlin.math.roundToInt

private val TIME_FORMAT: DateTimeFormatter = DateTimeFormatter.ofPattern("HH:mm")

/** Key ngày trong openHours (jsonb) của cửa hàng, theo đúng định dạng merchant app lưu. */
private val WEEK_DAYS = listOf(
    "monday" to "Thứ 2", "tuesday" to "Thứ 3", "wednesday" to "Thứ 4", "thursday" to "Thứ 5",
    "friday" to "Thứ 6", "saturday" to "Thứ 7", "sunday" to "Chủ nhật"
)

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
        preferences: UserPreferences?,
        minDiscountPercent: Int?,
        sortBy: String?
    ): Result<List<Deal>> =
        // Bán kính đã lọc ở backend (PostGIS) khi có tọa độ; danh sách rỗng/lỗi trả nguyên trạng, không thay bằng dữ liệu mẫu.
        apiCall("Không thể tải danh sách deal", {
            discoveryApiService.findNearbyDeals(
                latitude = latitude,
                longitude = longitude,
                radiusKm = radiusKm,
                search = searchQuery,
                minDiscountPercent = minDiscountPercent,
                sortBy = sortBy
            )
        }) { body -> applyLocalFilters(body.data.map { mapDtoToDeal(it) }, searchQuery, 0.0, preferences) }

    override suspend fun getDealDetail(id: String): Result<Deal> {
        // Không thay bằng dữ liệu mẫu khi lỗi: khách có thể đặt nhầm suất hoặc tin thông tin dị ứng bịa.
        return apiCall("Không thể tải chi tiết deal", { discoveryApiService.getDealDetail(id) }) { detail ->
            val store = detail.store
            val storeId = store?.id.orEmpty()
            Deal(
                id = detail.id,
                storeId = storeId,
                storeName = store?.name.orEmpty(),
                storeAddress = store?.address.orEmpty(),
                storeLogoUrl = store?.logoUrl.orEmpty(),
                coverImageUrl = store?.coverImageUrl.orEmpty(),
                title = detail.title,
                description = detail.description.orEmpty(),
                whatYouCouldGet = detail.whatYouCouldGet.joinToString(" • "),
                category = parseCategory(detail.category),
                originalPrice = detail.originalPrice.toInt(),
                discountPrice = detail.currentPrice.toInt(),
                discountPercent = detail.discountPercent,
                remainingStock = detail.remainingQuantity,
                initialStock = detail.remainingQuantity,
                pickupWindowText = pickupWindowText(detail.pickupStart, detail.pickupEnd),
                isToday = true,
                distanceText = "",
                rating = store?.rating ?: 0.0,
                reviewCount = store?.reviewCount ?: 0,
                allergens = detail.allergens,
                dietaryType = parseDietary(detail.dietaryTypes.firstOrNull()),
                isFavorite = favoriteOverrides[storeId] ?: (store?.isFavorite == true)
            )
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

    override suspend fun getRadarRanking(
        latitude: Double?,
        longitude: Double?,
        radiusKm: Double?,
        budgetMax: Double?,
        pickupFrom: String?,
        pickupTo: String?,
        excludeAllergens: List<String>?,
        prioritizeInTime: Boolean?
    ): Result<List<RadarDeal>> {
        return try {
            val response = discoveryApiService.getRadarRanking(
                latitude = latitude,
                longitude = longitude,
                radiusKm = radiusKm,
                budgetMax = budgetMax,
                pickupFrom = pickupFrom,
                pickupTo = pickupTo,
                excludeAllergens = excludeAllergens?.takeIf { it.isNotEmpty() }?.joinToString(","),
                prioritizeInTime = prioritizeInTime
            )
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!.data.map { mapRadarItemToRadarDeal(it) })
            } else {
                Result.failure(Exception("Không thể tải Rescue Radar (${response.code()})"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun getForYou(latitude: Double?, longitude: Double?, radiusKm: Double?): Result<com.surplusiq.app.domain.model.ForYouResult> {
        return try {
            val response = discoveryApiService.getForYou(latitude = latitude, longitude = longitude, radiusKm = radiusKm, limit = 30)
            val body = response.body()
            if (response.isSuccessful && body != null) {
                Result.success(
                    com.surplusiq.app.domain.model.ForYouResult(
                        deals = body.data.map { dto ->
                            com.surplusiq.app.domain.model.ForYouDeal(
                                deal = Deal(
                                    id = dto.id,
                                    storeId = dto.storeId,
                                    storeName = dto.storeName,
                                    storeAddress = dto.storeAddress.orEmpty(),
                                    storeLogoUrl = "",
                                    coverImageUrl = dto.imageUrl.orEmpty(),
                                    title = dto.title,
                                    description = "",
                                    whatYouCouldGet = dto.title,
                                    category = parseCategory(dto.category),
                                    originalPrice = dto.originalPrice.toInt(),
                                    discountPrice = dto.currentPrice.toInt(),
                                    discountPercent = dto.discountPercent,
                                    remainingStock = dto.remainingQuantity,
                                    initialStock = dto.remainingQuantity,
                                    pickupWindowText = "Còn ${dto.minutesLeftToPickup} phút để nhận",
                                    isToday = true,
                                    distanceText = dto.distanceMeters?.let { m -> if (m < 1000) "${m.toInt()} m" else "%.1f km".format(m / 1000.0) }.orEmpty(),
                                    // Máy chủ chưa trả điểm đánh giá ở danh sách này; không bịa số.
                                    rating = 0.0,
                                    reviewCount = 0,
                                    allergens = emptyList(),
                                    dietaryType = DietaryType.NONE,
                                    isFavorite = favoriteOverrides[dto.storeId] ?: false,
                                    isUrgent = dto.minutesLeftToPickup <= 30
                                ),
                                reasons = dto.forYouReasons
                            )
                        },
                        excludedByDietary = body.meta.excludedByDietary,
                        personalised = body.meta.personalised,
                        note = body.meta.note
                    )
                )
            } else {
                Result.failure(Exception("Không thể tải gợi ý dành cho bạn (${response.code()})"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun getDealTrustpass(dealId: String): Result<TrustpassInfo> {
        return try {
            val response = discoveryApiService.getDealTrustpass(dealId)
            val dto = response.body()
            if (response.isSuccessful && dto != null) {
                Result.success(
                    TrustpassInfo(
                        itemId = dto.itemId,
                        ingredients = dto.ingredients,
                        allergens = dto.allergens,
                        expiryAt = dto.expiryAt,
                        pickupWindowNote = dto.pickupWindowNote ?: "",
                        storageInstructions = dto.storageInstructions,
                        informationSource = dto.informationSource ?: "UNKNOWN",
                        verificationStatus = dto.verificationStatus ?: "UNKNOWN",
                        missingFields = dto.missingFields
                    )
                )
            } else {
                Result.failure(Exception("Không thể tải hồ sơ TrustPass (${response.code()})"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun suggestBasket(
        budgetMax: Double,
        peopleCount: Int,
        latitude: Double?,
        longitude: Double?,
        radiusKm: Double?,
        avoidAllergens: List<String>?
    ): Result<List<BasketSuggestion>> {
        return try {
            val response = discoveryApiService.suggestBasket(
                SuggestBasketRequest(
                    budgetMax = budgetMax,
                    peopleCount = peopleCount,
                    latitude = latitude,
                    longitude = longitude,
                    radiusKm = radiusKm,
                    avoidAllergens = avoidAllergens
                )
            )
            val body = response.body()
            if (response.isSuccessful && body != null) {
                Result.success(body.baskets.map { mapBasketCandidate(it) })
            } else {
                Result.failure(Exception("Không thể gợi ý giỏ Rescue Basket (${response.code()})"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun getMapPins(latitude: Double?, longitude: Double?, radiusKm: Double?): Result<List<MapPin>> =
        apiCall("Không thể tải bản đồ deal", { discoveryApiService.findMapPins(latitude, longitude, radiusKm) }) { pins ->
            pins.map {
                MapPin(
                    storeId = it.storeId,
                    storeName = it.storeName,
                    storeAddress = it.storeAddress.orEmpty(),
                    latitude = it.latitude,
                    longitude = it.longitude,
                    activeDealsCount = it.activeDealsCount,
                    minPrice = it.minPrice?.toInt(),
                    maxDiscountPercent = it.maxDiscountPercent ?: 0,
                    distanceText = formatDistance(it.distanceMeters)
                )
            }
        }

    override suspend fun getStoreDetail(storeId: String): Result<StoreDetail> =
        apiCall("Không thể tải thông tin cửa hàng", { discoveryApiService.getStoreDetail(storeId) }) { body ->
            val store = body.store
            val weekly = parseOpenHours(store.openHours)
            val todayLabel = WEEK_DAYS.firstOrNull { it.first == LocalDate.now().dayOfWeek.name.lowercase() }?.second
            StoreDetail(
                id = store.id,
                name = store.name,
                address = store.address.orEmpty(),
                phone = store.phone,
                logoUrl = store.logoUrl,
                averageRating = store.averageRating?.takeIf { (store.reviewsCount ?: 0) > 0 },
                reviewsCount = store.reviewsCount ?: 0,
                todayHours = weekly.firstOrNull { it.first == todayLabel }?.second,
                weeklyHours = weekly,
                activeDeals = body.activeDeals.map { offerToDeal(it, store) }
            )
        }

    override suspend fun getFavoriteStores(): Result<List<StoreDetail>> {
        val ids = apiCall("Không thể tải cửa hàng yêu thích", { profileApiService.getFavorites() }) { list ->
            list.map { it.storeId }
        }.getOrElse { return Result.failure(it) }
        ids.forEach { favoriteOverrides[it] = true }
        // Backend favorites chỉ trả storeId: lấy thông tin quán song song; quán tạm ngưng (404) bị bỏ qua.
        val stores = coroutineScope { ids.map { async { getStoreDetail(it).getOrNull() } }.awaitAll() }
        return Result.success(stores.filterNotNull())
    }

    override suspend fun setStoreFavorite(storeId: String, favorite: Boolean): Result<Unit> =
        apiCall("Không thể cập nhật cửa hàng yêu thích", {
            if (favorite) profileApiService.addFavorite(storeId) else profileApiService.removeFavorite(storeId)
        }) { favoriteOverrides[storeId] = favorite }

    override suspend fun compareDeals(dealIds: List<String>): Result<List<CompareDeal>> =
        apiCall("Không thể so sánh các suất", { discoveryApiService.compareDeals(dealIds.joinToString(",")) }) { body ->
            body.deals.map {
                CompareDeal(
                    id = it.id,
                    title = it.item?.name ?: "Suất cứu món",
                    storeName = it.store?.name.orEmpty(),
                    imageUrl = it.item?.imageUrl,
                    originalPrice = it.originalPrice.toInt(),
                    currentPrice = it.currentPrice.toInt(),
                    discountPercent = it.discountPercent,
                    pickupWindow = formatPickupWindow(it.pickupStart, it.pickupEnd),
                    ingredients = it.item?.ingredients,
                    allergens = it.item?.allergens?.takeIf { list -> list.isNotEmpty() },
                    rating = it.store?.averageRating?.takeIf { _ -> (it.store.reviewsCount ?: 0) > 0 },
                    reviewsCount = it.store?.reviewsCount ?: 0,
                    remainingQuantity = it.remainingQuantity,
                    isAvailable = it.isAvailable
                )
            }
        }

    override suspend fun getSavedDeals(): Result<List<SavedDealItem>> =
        apiCall("Không thể tải deal đã lưu", { discoveryApiService.getSavedDeals() }) { list ->
            list.map { SavedDealItem(it.offerId, it.deal?.let { offer -> offerToDeal(offer) }, it.isExpired) }
        }

    override suspend fun setDealSaved(dealId: String, saved: Boolean): Result<Unit> =
        apiCall("Không thể cập nhật deal đã lưu", {
            if (saved) discoveryApiService.saveDeal(dealId) else discoveryApiService.unsaveDeal(dealId)
        }) { }

    override suspend fun getViewHistory(): Result<List<SavedDealItem>> =
        apiCall("Không thể tải lịch sử xem", { discoveryApiService.getViewHistory() }) { list ->
            list.map {
                val offer = OfferSummaryDto(
                    id = it.offerId,
                    storeName = it.storeName,
                    title = it.title,
                    originalPrice = it.originalPrice,
                    currentPrice = it.currentPrice,
                    discountPercent = if (it.originalPrice > 0) ((1 - it.currentPrice / it.originalPrice) * 100).roundToInt() else 0,
                    remainingQuantity = it.remainingQuantity
                )
                SavedDealItem(it.offerId, offerToDeal(offer), isExpired = it.status != "OPEN" || it.remainingQuantity <= 0)
            }
        }

    override suspend fun recordDealView(dealId: String): Result<Unit> =
        apiCall("Không thể ghi lịch sử xem", { discoveryApiService.recordViewHistory(dealId) }) { }

    override suspend fun getDealAlerts(): Result<List<DealAlert>> =
        apiCall("Không thể tải cảnh báo deal", { discoveryApiService.getDealAlerts() }) { list -> list.map { it.toDomain() } }

    override suspend fun saveDealAlert(id: String?, criteria: DealAlertCriteria, isActive: Boolean): Result<DealAlert> {
        val request = DealAlertRequest(criteria = criteria.toMap(), isActive = isActive)
        return apiCall("Không thể lưu cảnh báo deal", {
            if (id == null) discoveryApiService.createDealAlert(request) else discoveryApiService.updateDealAlert(id, request)
        }) { it.toDomain() }
    }

    override suspend fun deleteDealAlert(id: String): Result<Unit> =
        apiCall("Không thể xóa cảnh báo deal", { discoveryApiService.deleteDealAlert(id) }) { }

    override suspend fun searchStores(query: String): Result<List<StoreOption>> =
        apiCall("Không thể tìm cửa hàng", { discoveryApiService.findNearbyDeals(search = query, limit = 50) }) { body ->
            body.data.distinctBy { it.storeId }.map { StoreOption(it.storeId, it.storeName, it.storeAddress.orEmpty()) }
        }

    private fun offerToDeal(dto: OfferSummaryDto, store: StoreProfileDto? = null): Deal {
        val storeId = dto.storeId ?: store?.id.orEmpty()
        return Deal(
            id = dto.id,
            storeId = storeId,
            storeName = dto.storeName ?: store?.name.orEmpty(),
            storeAddress = dto.storeAddress ?: store?.address.orEmpty(),
            storeLogoUrl = store?.logoUrl.orEmpty(),
            coverImageUrl = dto.imageUrl.orEmpty(),
            title = dto.title,
            description = "",
            whatYouCouldGet = "",
            category = parseCategory(dto.category),
            originalPrice = dto.originalPrice.toInt(),
            discountPrice = dto.currentPrice.toInt(),
            discountPercent = dto.discountPercent,
            remainingStock = dto.remainingQuantity,
            initialStock = dto.remainingQuantity,
            pickupWindowText = formatPickupWindow(dto.pickupStart, dto.pickupEnd),
            distanceText = "",
            rating = store?.averageRating ?: 0.0,
            reviewCount = store?.reviewsCount ?: 0,
            allergens = emptyList(),
            isFavorite = favoriteOverrides[storeId] ?: false,
            isUrgent = dto.remainingQuantity in 1..2
        )
    }

    private fun DealAlertDto.toDomain() = DealAlert(
        id = id,
        criteria = DealAlertCriteria(
            category = criteria["category"] as? String,
            storeId = criteria["storeId"] as? String,
            storeName = criteria["storeName"] as? String,
            maxPrice = (criteria["maxPrice"] as? Number)?.toInt(),
            minDiscountPercent = (criteria["minDiscountPercent"] as? Number)?.toInt(),
            timeFrom = criteria["timeFrom"] as? String,
            timeTo = criteria["timeTo"] as? String,
            radiusKm = (criteria["radiusKm"] as? Number)?.toDouble(),
            notifyAt = criteria["notifyAt"] as? String
        ),
        isActive = isActive,
        triggeredCount = triggeredCount,
        lastTriggeredAt = lastTriggeredAt
    )

    private fun DealAlertCriteria.toMap(): Map<String, Any> = listOfNotNull(
        category?.let { "category" to it },
        storeId?.let { "storeId" to it },
        storeName?.let { "storeName" to it },
        maxPrice?.let { "maxPrice" to it },
        minDiscountPercent?.let { "minDiscountPercent" to it },
        timeFrom?.let { "timeFrom" to it },
        timeTo?.let { "timeTo" to it },
        radiusKm?.let { "radiusKm" to it },
        notifyAt?.let { "notifyAt" to it }
    ).toMap()

    private fun parseOpenHours(raw: Map<String, Any?>?): List<Pair<String, String>> = WEEK_DAYS.mapNotNull { (key, label) ->
        val day = raw?.get(key) as? Map<*, *> ?: return@mapNotNull null
        label to if (day["closed"] == true) "Nghỉ" else "${day["open"] ?: "--:--"} - ${day["close"] ?: "--:--"}"
    }

    private fun formatPickupWindow(start: String?, end: String?): String {
        fun time(iso: String?) = iso?.let {
            runCatching { Instant.parse(it).atZone(ZoneId.systemDefault()).format(TIME_FORMAT) }.getOrNull()
        }
        val from = time(start)
        val to = time(end) ?: return ""
        return if (from != null) "$from - $to" else "Trước $to"
    }

    private fun formatDistance(meters: Double?): String? = meters?.let {
        if (it < 1000) "${it.toInt()} m" else "%.1f km".format(it / 1000.0)
    }

    private fun mapRadarItemToRadarDeal(dto: RadarItemDto): RadarDeal {
        val orig = dto.originalPrice.toInt()
        val curr = dto.currentPrice.toInt()
        val distText = if (dto.distanceMeters != null) {
            if (dto.distanceMeters < 1000) "${dto.distanceMeters.toInt()} m" else "%.1f km".format(dto.distanceMeters / 1000.0)
        } else "Chưa rõ khoảng cách"
        val deal = Deal(
            id = dto.id,
            storeId = dto.storeId,
            storeName = dto.storeName,
            storeAddress = dto.storeAddress ?: "Chưa có địa chỉ",
            storeLogoUrl = "",
            coverImageUrl = dto.imageUrl.orEmpty(),
            title = dto.title,
            description = "Suất cứu món xếp hạng theo khả năng nhận kịp từ ${dto.storeName}.",
            whatYouCouldGet = dto.title,
            category = parseCategory(dto.category),
            originalPrice = orig,
            discountPrice = curr,
            discountPercent = dto.discountPercent,
            remainingStock = dto.remainingQuantity,
            initialStock = dto.remainingQuantity + 2,
            pickupWindowText = "Còn ${dto.minutesLeftToPickup} phút để nhận",
            isToday = true,
            distanceText = distText,
            rating = 4.7,
            reviewCount = 98,
            allergens = emptyList(),
            dietaryType = DietaryType.NONE,
            isFavorite = favoriteOverrides[dto.storeId] ?: false,
            isUrgent = dto.minutesLeftToPickup <= 30
        )
        return RadarDeal(
            deal = deal,
            minutesLeftToPickup = dto.minutesLeftToPickup,
            canArriveInTime = dto.canArriveInTime,
            rankingReasons = dto.rankingReasons
        )
    }

    private fun mapBasketCandidate(dto: BasketCandidateDto): BasketSuggestion {
        return BasketSuggestion(
            storeId = dto.storeId,
            storeName = dto.storeName,
            items = dto.items.map { BasketItem(it.offerId, it.title, it.price.toInt()) },
            estimatedTotal = dto.estimatedTotal.toInt(),
            withinBudget = dto.withinBudget,
            meetsPeopleCount = dto.meetsPeopleCount,
            rankingReasons = dto.rankingReasons
        )
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
            "" // chưa có vị trí khách -> không biết khoảng cách
        }

        return Deal(
            id = dto.id,
            storeId = dto.storeId,
            storeName = dto.storeName,
            storeAddress = dto.storeAddress.orEmpty(),
            storeLogoUrl = dto.storeLogoUrl.orEmpty(),
            coverImageUrl = dto.imageUrl.orEmpty(),
            title = dto.title,
            description = "",
            whatYouCouldGet = "",
            category = parseCategory(dto.category),
            originalPrice = orig,
            discountPrice = curr,
            discountPercent = dto.discountPercent,
            remainingStock = dto.remainingQuantity,
            initialStock = dto.remainingQuantity,
            pickupWindowText = pickupWindowText(dto.pickupStart, dto.pickupEnd),
            isToday = true,
            distanceText = distText,
            // Danh sách deal không kèm điểm đánh giá/dị ứng: để trống thay vì bịa (chi tiết deal mới có).
            rating = 0.0,
            reviewCount = 0,
            allergens = emptyList(),
            dietaryType = DietaryType.NONE,
            isFavorite = favoriteOverrides[dto.storeId] ?: false,
            isUrgent = dto.remainingQuantity <= 2
        )
    }

    /** "Hôm nay 19:00 - 21:30" từ mốc giờ ISO của backend (giờ máy); rỗng nếu thiếu dữ liệu. */
    private fun pickupWindowText(start: String?, end: String?): String {
        fun hhmm(iso: String?) = runCatching {
            java.time.OffsetDateTime.parse(iso).atZoneSameInstant(java.time.ZoneId.systemDefault()).toLocalTime().toString().take(5)
        }.getOrNull()
        val s = hhmm(start) ?: return ""
        val e = hhmm(end) ?: return "Hôm nay từ $s"
        return "Hôm nay $s - $e"
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

    override suspend fun getStoreReviews(
        storeId: String,
        rating: Int?,
        page: Int,
        limit: Int
    ): Result<com.surplusiq.app.data.remote.dto.StoreReviewsResponseDto> =
        apiCall("Không thể tải danh sách đánh giá của cửa hàng", {
            discoveryApiService.getStoreReviews(storeId, rating, page, limit)
        }) { it }

    override suspend fun getBasketSubstitutes(
        storeId: String,
        excludeOfferIds: List<String>,
        maxPrice: Double?,
        avoidAllergens: List<String>
    ): Result<List<BasketSubstituteItem>> =
        apiCall("Không thể tải danh sách món thay thế", {
            discoveryApiService.getBasketSubstitutes(
                BasketSubstitutesRequest(
                    storeId = storeId,
                    excludeOfferIds = excludeOfferIds,
                    maxPrice = maxPrice,
                    avoidAllergens = avoidAllergens
                )
            )
        }) { body ->
            body.substitutes.map {
                BasketSubstituteItem(
                    id = it.id,
                    title = it.title,
                    currentPrice = it.currentPrice.toInt(),
                    originalPrice = it.originalPrice.toInt(),
                    discountPercent = it.discountPercent,
                    remainingQuantity = it.remainingQuantity,
                    imageUrl = it.imageUrl,
                    category = it.category,
                    allergens = it.allergens
                )
            }
        }

    override suspend fun checkoutBasket(
        storeId: String,
        items: List<Pair<String, Int>>,
        pickupTimeWindow: String?,
        notes: String?
    ): Result<BasketHoldResult> =
        apiCall("Không thể đặt giữ giỏ hàng", {
            discoveryApiService.checkoutBasket(
                BasketCheckoutRequest(
                    storeId = storeId,
                    items = items.map { BasketCheckoutItemRequest(offerId = it.first, quantity = it.second) },
                    pickupTimeWindow = pickupTimeWindow,
                    notes = notes
                )
            )
        }) { body ->
            BasketHoldResult(
                success = body.success,
                storeId = body.storeId,
                orderIds = body.orderIds,
                totalAmount = body.totalAmount.toInt(),
                holdExpiresAt = body.holdExpiresAt,
                items = body.items.map {
                    BasketHeldItem(
                        offerId = it.offerId,
                        orderId = it.orderId,
                        title = it.title,
                        quantity = it.quantity,
                        unitPrice = it.unitPrice.toInt(),
                        totalPrice = it.totalPrice.toInt()
                    )
                },
                message = body.message
            )
        }

    override suspend fun toggleBackInStock(offerId: String): Result<com.surplusiq.app.data.remote.dto.BackInStockResponseDto> =
        apiCall("Không thể đăng ký nhận tin có hàng lại", { discoveryApiService.toggleBackInStock(offerId) }) { it }

    override suspend fun getBackInStockStatus(offerId: String): Result<Boolean> =
        apiCall("Không thể kiểm tra trạng thái báo hàng", { discoveryApiService.getBackInStockStatus(offerId) }) { it.subscribed }

    override suspend fun getPriceHistory(offerId: String): Result<com.surplusiq.app.data.remote.dto.PriceHistoryDto> =
        apiCall("Không thể tải lịch sử giá", { discoveryApiService.getPriceHistory(offerId) }) { it }
}

