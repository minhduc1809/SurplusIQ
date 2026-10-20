package com.surplusiq.app.domain.repository

import com.surplusiq.app.domain.model.BasketSuggestion
import com.surplusiq.app.domain.model.CompareDeal
import com.surplusiq.app.domain.model.Deal
import com.surplusiq.app.domain.model.DealAlert
import com.surplusiq.app.domain.model.DealAlertCriteria
import com.surplusiq.app.domain.model.MapPin
import com.surplusiq.app.domain.model.SavedDealItem
import com.surplusiq.app.domain.model.StoreDetail
import com.surplusiq.app.domain.model.StoreOption
import com.surplusiq.app.domain.model.RadarDeal
import com.surplusiq.app.domain.model.TrustpassInfo
import com.surplusiq.app.domain.model.UserPreferences

interface DiscoveryRepository {
    suspend fun getNearbyDeals(
        latitude: Double? = 10.7769,
        longitude: Double? = 106.7009,
        radiusKm: Double = 2.0,
        searchQuery: String? = null,
        preferences: UserPreferences? = null,
        minDiscountPercent: Int? = null,
        sortBy: String? = null
    ): Result<List<Deal>>

    suspend fun getDealDetail(id: String): Result<Deal>

    suspend fun toggleFavorite(dealId: String, storeId: String, currentStatus: Boolean): Result<Boolean>

    /** Rescue Radar (CM-C05): xếp hạng deal theo khả năng nhận kịp, không chỉ khoảng cách. */
    suspend fun getRadarRanking(
        latitude: Double? = null,
        longitude: Double? = null,
        radiusKm: Double? = null,
        budgetMax: Double? = null
    ): Result<List<RadarDeal>>

    /** TrustPass (CM-C03): hồ sơ minh bạch món của một deal. */
    suspend fun getDealTrustpass(dealId: String): Result<TrustpassInfo>

    /** Rescue Basket (CM-C01): gợi ý tổ hợp suất theo ngân sách/số người. */
    suspend fun suggestBasket(
        budgetMax: Double,
        peopleCount: Int,
        latitude: Double? = null,
        longitude: Double? = null,
        radiusKm: Double? = null,
        avoidAllergens: List<String>? = null
    ): Result<List<BasketSuggestion>>

    /** K10 (R1-021): điểm ghim cửa hàng có deal đang mở quanh vị trí. */
    suspend fun getMapPins(latitude: Double?, longitude: Double?, radiusKm: Double?): Result<List<MapPin>>

    /** K14 (R1-027): chi tiết cửa hàng + deal đang mở. */
    suspend fun getStoreDetail(storeId: String): Result<StoreDetail>

    /** K18 (R1-028): cửa hàng yêu thích kèm thông tin quán. */
    suspend fun getFavoriteStores(): Result<List<StoreDetail>>

    /** K14/K18 (R1-028, R1-029): thêm/bỏ yêu thích, trả lỗi thật của backend (vd. tối đa 50). */
    suspend fun setStoreFavorite(storeId: String, favorite: Boolean): Result<Unit>

    /** K16 (R1-036): so sánh 2-3 suất. */
    suspend fun compareDeals(dealIds: List<String>): Result<List<CompareDeal>>

    /** K17 (R1-034): deal đã lưu. */
    suspend fun getSavedDeals(): Result<List<SavedDealItem>>

    suspend fun setDealSaved(dealId: String, saved: Boolean): Result<Unit>

    /** K17 (R1-035): tối đa 20 deal xem gần nhất. */
    suspend fun getViewHistory(): Result<List<SavedDealItem>>

    suspend fun recordDealView(dealId: String): Result<Unit>

    /** K19/K20 (R1-031, R1-032): cảnh báo deal. */
    suspend fun getDealAlerts(): Result<List<DealAlert>>

    /** id null = tạo mới. */
    suspend fun saveDealAlert(id: String?, criteria: DealAlertCriteria, isActive: Boolean): Result<DealAlert>

    suspend fun deleteDealAlert(id: String): Result<Unit>

    /** K20: tìm cửa hàng theo tên qua tìm kiếm deal (backend lọc theo tên món hoặc tên quán). */
    suspend fun searchStores(query: String): Result<List<StoreOption>>

    /** K15: xem danh sách đánh giá công khai của quán kèm phân bổ sao. */
    suspend fun getStoreReviews(storeId: String, rating: Int? = null, page: Int = 1, limit: Int = 10): Result<com.surplusiq.app.data.remote.dto.StoreReviewsResponseDto>
}
