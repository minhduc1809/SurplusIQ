package com.surplusiq.app.domain.model

data class Deal(
    val id: String,
    val storeId: String,
    val storeName: String,
    val storeAddress: String,
    val storeLogoUrl: String,
    val coverImageUrl: String,
    val title: String,
    val description: String,
    val whatYouCouldGet: String,
    val category: DealCategory,
    val originalPrice: Int,
    val discountPrice: Int,
    val discountPercent: Int,
    val remainingStock: Int,
    val initialStock: Int,
    val pickupWindowText: String, // e.g. "Collect today 20:50 - 21:20"
    val isToday: Boolean = true,
    val distanceText: String,     // e.g. "582 m" or "1.2 km"
    val rating: Double,           // e.g. 4.3
    val reviewCount: Int,         // e.g. 121
    val allergens: List<String>,  // e.g. ["Gluten", "Sữa bò", "Trứng"]
    val dietaryType: DietaryType = DietaryType.NONE,
    val isFavorite: Boolean = false,
    val isUrgent: Boolean = false  // Closes in less than 60 mins
)

enum class DealCategory(val displayName: String, val subtitle: String) {
    MEALS("Meals", "Cơm, bún, mì, món mặn"),
    BAKED_GOODS("Baked goods", "Bánh mì, bánh ngọt, croissant, tiramisu"),
    GROCERIES("Groceries", "Rau củ hữu cơ, trái cây, nông sản"),
    OTHER("Other", "Thức uống, combo đặc biệt")
}

enum class DietaryType(val displayName: String) {
    NONE("None / Bình thường"),
    VEGETARIAN("Vegetarian / Ăn chay"),
    VEGAN("Vegan / Thuần chay")
}

enum class CollectionTimeSlot(val title: String, val timeRange: String) {
    MORNING("Morning", "05:00 - 10:00"),
    NOON("Noon", "10:00 - 14:00"),
    EVENING("Evening", "17:00 - 21:30")
}

data class UserPreferences(
    val filterMatchingOnly: Boolean = true,
    val categories: Set<DealCategory> = setOf(
        DealCategory.MEALS,
        DealCategory.BAKED_GOODS,
        DealCategory.GROCERIES,
        DealCategory.OTHER
    ),
    val dietaryPreference: DietaryType = DietaryType.NONE,
    val collectionTimes: Set<CollectionTimeSlot> = setOf(
        CollectionTimeSlot.MORNING,
        CollectionTimeSlot.NOON,
        CollectionTimeSlot.EVENING
    )
)

data class ActiveOrder(
    val id: String,
    val orderCode: String,
    val deal: Deal,
    val quantity: Int,
    val unitPrice: Int,
    val totalPrice: Int,
    val holdExpiresAtMillis: Long,
    val status: OrderStatus,
    val qrToken: String,
    val fallbackPin: String,
    val pickupWindow: String
)

enum class OrderStatus {
    PENDING_PAYMENT,
    PAID_WAITING_PICKUP,
    PICKED_UP,
    EXPIRED,
    CANCELLED
}

data class UserImpactStats(
    val totalSavedMoneyVnd: Long = 4820000L,
    val totalRescuedKg: Double = 18.5,
    val totalReducedCo2Kg: Double = 46.2,
    val totalRescuedBags: Int = 14
)

data class UserProfile(
    val id: String,
    val phone: String,
    val fullName: String,
    val avatarUrl: String? = null,
    val impactStats: UserImpactStats = UserImpactStats()
)
