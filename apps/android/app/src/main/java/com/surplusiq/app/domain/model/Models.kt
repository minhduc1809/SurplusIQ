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
    NONE("Bình thường"),
    VEGETARIAN("Ăn chay"),
    VEGAN("Thuần chay")
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

/** Thông tin giao dịch VietQR/giả lập thật từ backend (R1-041). */
data class PaymentInfo(
    val transactionId: String,
    val orderId: String,
    val orderCode: String,
    val amount: Long,
    val transferSyntax: String,
    val bankAccount: String,
    val bankBin: String,
    val bankName: String,
    val qrUrl: String,
    val holdExpiresAtMillis: Long,
    val status: String
)

/** Kết quả "Kiểm tra lại" thanh toán - trạng thái thật từ backend, không đoán (R1-056). */
data class PaymentRecheckResult(
    val orderId: String,
    val orderStatus: String,
    val paymentStatus: String,
    val message: String
)

data class UserImpactStats(
    val totalSavedMoneyVnd: Long = 0L,
    val totalRescuedKg: Double = 0.0,
    val totalReducedCo2Kg: Double = 0.0,
    val totalRescuedBags: Int = 0
)

/** Rescue Radar (CM-C05): deal xếp hạng kèm lý do - không chỉ khoảng cách/giảm giá. */
data class RadarDeal(
    val deal: Deal,
    val minutesLeftToPickup: Int,
    val canArriveInTime: Boolean?,
    val rankingReasons: List<String>
)

/** K21: suất gợi ý kèm lý do có căn cứ do máy chủ tính từ lịch sử thật của khách. */
data class ForYouDeal(
    val deal: Deal,
    val reasons: List<String>
)

data class ForYouResult(
    val deals: List<ForYouDeal>,
    /** Số suất bị loại vì chứa chất gây dị ứng hoặc món khách loại trừ. */
    val excludedByDietary: Int,
    val personalised: Boolean,
    val note: String?
)

/**
 * TrustPass (CM-C03, BR-C03-02): null = "chưa được cung cấp", khác với [] ("khai báo
 * rõ là không có"). Giữ nullable, KHÔNG mặc định null thành danh sách rỗng.
 */
data class TrustpassInfo(
    val itemId: String,
    val ingredients: String?,
    val allergens: List<String>?,
    val expiryAt: String?,
    val pickupWindowNote: String,
    val storageInstructions: String?,
    val informationSource: String,
    val verificationStatus: String,
    val missingFields: List<String>
)

data class BasketItem(
    val offerId: String,
    val title: String,
    val price: Int
)

/** Rescue Basket (CM-C01): tổ hợp suất gợi ý - chỉ tính toán, không giữ tồn/tạo đơn. */
data class BasketSuggestion(
    val storeId: String,
    val storeName: String,
    val items: List<BasketItem>,
    val estimatedTotal: Int,
    val withinBudget: Boolean,
    val meetsPeopleCount: Boolean,
    val rankingReasons: List<String>
)

/** Rescue Rewards (CM-C04): ledger điểm thưởng. */
data class RewardBalanceInfo(
    val pointsBalance: Int
)

data class RewardCatalogItem(
    val id: String,
    val name: String,
    val points: Int,
    val valueVnd: Int,
    val minOrderVnd: Int,
    val validDays: Int,
    val canRedeem: Boolean,
    val shortfall: Int
)

data class RewardCatalog(
    val pointsBalance: Int,
    val dailyLimit: Int,
    val redeemedToday: Int,
    val items: List<RewardCatalogItem>
)

data class RewardRuleSection(val title: String, val body: String)

/** Kết quả đổi điểm: số dư mới và voucher đã vào ví. */
data class RedeemResult(val pointsBalance: Int, val voucherName: String?, val voucherExpiresAt: String?)

data class RewardHistoryEntry(
    val id: String,
    val entryType: String,
    val pointsDelta: Int,
    val reason: String?,
    val createdAt: String?
)

data class UserProfile(
    val id: String,
    val phone: String,
    val fullName: String,
    val avatarUrl: String? = null,
    val searchRadiusKm: Double = 5.0,
    val impactStats: UserImpactStats = UserImpactStats()
)

data class AppNotification(
    val id: String,
    val type: String,
    val title: String,
    val body: String,
    val isRead: Boolean,
    val createdAt: String
)

data class NotificationSettings(
    val transactionPush: Boolean = true,
    val promoPush: Boolean = true,
    val reminderPush: Boolean = true
)

/** Tên hiển thị tiếng Việt; [DealCategory.displayName] giữ nguyên vì còn dùng làm giá trị lọc gửi backend. */
fun DealCategory.viName() = when (this) {
    DealCategory.MEALS -> "Món chính"
    DealCategory.BAKED_GOODS -> "Bánh"
    DealCategory.GROCERIES -> "Nông sản"
    DealCategory.OTHER -> "Khác"
}

fun CollectionTimeSlot.viTitle() = when (this) {
    CollectionTimeSlot.MORNING -> "Sáng"
    CollectionTimeSlot.NOON -> "Trưa"
    CollectionTimeSlot.EVENING -> "Tối"
}
