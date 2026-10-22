package com.surplusiq.app.ui.screens.discovery

import androidx.compose.animation.AnimatedVisibility
import com.surplusiq.app.ui.components.SqCard
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.filled.TrendingDown
import androidx.compose.material.icons.filled.Verified
import com.surplusiq.app.data.remote.dto.PriceHistoryDto
import androidx.compose.material.icons.outlined.FavoriteBorder
import androidx.compose.material.icons.outlined.BookmarkBorder
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.surplusiq.app.domain.model.Deal
import com.surplusiq.app.domain.model.DealCategory
import com.surplusiq.app.domain.model.TrustpassInfo
import com.surplusiq.app.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DealDetailScreen(
    deal: Deal,
    onBackClick: () -> Unit,
    onReserveClick: (Deal) -> Unit,
    trustpass: TrustpassInfo? = null,
    isTrustpassLoading: Boolean = false,
    trustpassErrorMessage: String? = null,
    onLoadTrustpass: () -> Unit = {},
    // K17: lưu deal xem sau; K14: mở trang cửa hàng
    isSaved: Boolean = false,
    onToggleSaved: (() -> Unit)? = null,
    onOpenStore: (() -> Unit)? = null,
    userAllergens: List<String> = emptyList(),
    // KX06: Báo khi có hàng lại
    isBackInStockSubscribed: Boolean = false,
    isTogglingBackInStock: Boolean = false,
    onToggleBackInStock: (() -> Unit)? = null,
    // KX07: Lịch sử giá minh bạch
    priceHistory: PriceHistoryDto? = null,
    isPriceHistoryLoading: Boolean = false,
    priceHistoryError: String? = null,
    onLoadPriceHistory: (() -> Unit)? = null,
    // Tim cửa hàng yêu thích: trạng thái do máy chủ quyết định, không tự đổi cục bộ
    isFavorite: Boolean = deal.isFavorite,
    onToggleFavorite: () -> Unit = {},
    favoriteMessage: String? = null,
    onFavoriteMessageShown: () -> Unit = {},
    modifier: Modifier = Modifier
) {
    var showFavoriteToast by remember { mutableStateOf(false) }
    var toastText by remember { mutableStateOf("Đã thêm cửa hàng vào danh sách yêu thích") }
    LaunchedEffect(favoriteMessage) {
        if (favoriteMessage != null) {
            toastText = favoriteMessage
            showFavoriteToast = true
            onFavoriteMessageShown()
        }
    }
    var showTrustpass by remember { mutableStateOf(false) }
    var showAiTips by remember { mutableStateOf(false) }
    var showPriceHistorySheet by remember { mutableStateOf(false) }
    val context = androidx.compose.ui.platform.LocalContext.current

    val dealAllergens = remember(deal.allergens, trustpass?.allergens) {
        (deal.allergens + (trustpass?.allergens ?: emptyList())).distinct()
    }
    val matchedAllergens = remember(userAllergens, dealAllergens) {
        userAllergens.filter { ua ->
            dealAllergens.any { da ->
                da.equals(ua, ignoreCase = true) ||
                da.contains(ua, ignoreCase = true) ||
                ua.contains(da, ignoreCase = true)
            }
        }
    }

    Box(
        modifier = modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
        ) {
            // Hero Image Header
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(260.dp)
            ) {
                AsyncImage(
                    model = deal.coverImageUrl,
                    contentDescription = deal.title,
                    contentScale = ContentScale.Crop,
                    modifier = Modifier.fillMaxSize()
                )

                // Top Actions (Back, Share, Bookmark, Favorite)
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .statusBarsPadding()
                        .padding(horizontal = 16.dp, vertical = 12.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    IconButton(
                        onClick = onBackClick,
                        modifier = Modifier
                            .size(40.dp)
                            .clip(CircleShape)
                            .background(Color.Black.copy(alpha = 0.4f))
                    ) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = "Quay lại",
                            tint = Color.White
                        )
                    }

                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        // Nút chia sẻ deal
                        IconButton(
                            onClick = {
                                val shareIntent = android.content.Intent(android.content.Intent.ACTION_SEND).apply {
                                    type = "text/plain"
                                    putExtra(
                                        android.content.Intent.EXTRA_TEXT,
                                        "Cùng giải cứu suất ăn '${deal.title}' tại ${deal.storeName} với giá chỉ ${String.format("%,d", deal.discountPrice)} ₫ (giảm ${deal.discountPercent}%) trên SurplusIQ!"
                                    )
                                }
                                context.startActivity(android.content.Intent.createChooser(shareIntent, "Chia sẻ suất cứu hộ"))
                            },
                            modifier = Modifier
                                .size(40.dp)
                                .clip(CircleShape)
                                .background(Color.Black.copy(alpha = 0.4f))
                        ) {
                            Icon(
                                imageVector = Icons.Default.Share,
                                contentDescription = "Chia sẻ",
                                tint = Color.White
                            )
                        }

                        if (onToggleSaved != null) {
                            IconButton(
                                onClick = onToggleSaved,
                                modifier = Modifier
                                    .size(40.dp)
                                    .clip(CircleShape)
                                    .background(Color.Black.copy(alpha = 0.4f))
                            ) {
                                Icon(
                                    imageVector = if (isSaved) Icons.Filled.Bookmark else Icons.Outlined.BookmarkBorder,
                                    contentDescription = if (isSaved) "Bỏ lưu suất" else "Lưu suất",
                                    tint = Color.White
                                )
                            }
                        }

                        IconButton(
                            onClick = {
                                if (!isFavorite) {
                                    toastText = "Đã thêm cửa hàng vào danh sách yêu thích"
                                    showFavoriteToast = true
                                }
                                onToggleFavorite()
                            },
                            modifier = Modifier
                                .size(40.dp)
                                .clip(CircleShape)
                                .background(Color.Black.copy(alpha = 0.4f))
                        ) {
                            Icon(
                                imageVector = if (isFavorite) Icons.Filled.Favorite else Icons.Outlined.FavoriteBorder,
                                contentDescription = "Favorite",
                                tint = if (isFavorite) CoralRed else Color.White
                            )
                        }
                    }
                }

                // Remaining stock badge
                Box(
                    modifier = Modifier
                        .align(Alignment.BottomStart)
                        .padding(start = 16.dp, bottom = 16.dp)
                        .clip(RoundedCornerShape(20.dp))
                        .background(Color.Black.copy(alpha = 0.8f))
                        .padding(horizontal = 12.dp, vertical = 6.dp)
                ) {
                    Text(
                        text = "Còn ${deal.remainingStock} suất",
                        color = Color.White,
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Bold
                    )
                }
            }

            // Store Info & Title
            Column(modifier = Modifier.padding(16.dp)) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(8.dp))
                        .clickable(enabled = onOpenStore != null) { onOpenStore?.invoke() }
                ) {
                    Box(
                        modifier = Modifier
                            .size(36.dp)
                            .clip(CircleShape)
                            .background(ForestGreenContainer),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(Icons.Default.Storefront, contentDescription = null, tint = ForestGreenPrimary, modifier = Modifier.size(20.dp))
                        AsyncImage(
                            model = deal.storeLogoUrl.ifBlank { null },
                            contentDescription = deal.storeName,
                            contentScale = ContentScale.Crop,
                            modifier = Modifier.fillMaxSize()
                        )
                    }
                    Spacer(modifier = Modifier.width(10.dp))
                    Text(
                        text = deal.storeName,
                        fontSize = 17.sp,
                        fontWeight = FontWeight.Bold,
                        color = TextPrimary,
                        modifier = Modifier.weight(1f)
                    )
                    if (onOpenStore != null) {
                        Icon(Icons.Default.ChevronRight, contentDescription = "Xem cửa hàng", tint = TextMuted)
                    }
                }

                Spacer(modifier = Modifier.height(14.dp))

                // Magic Bag Title & Pricing
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = deal.title,
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Bold,
                        color = TextPrimary,
                        modifier = Modifier.weight(1f).padding(end = 12.dp)
                    )
                    Column(horizontalAlignment = Alignment.End) {
                        Text(
                            text = "${String.format("%,d", deal.originalPrice)} ₫",
                            fontSize = 13.sp,
                            textDecoration = TextDecoration.LineThrough,
                            color = TextMuted
                        )
                        Text(
                            text = "${String.format("%,d", deal.discountPrice)} ₫",
                            softWrap = false,
                            fontSize = 20.sp,
                            fontWeight = FontWeight.ExtraBold,
                            color = ForestGreenPrimary
                        )
                    }
                }

                Spacer(modifier = Modifier.height(8.dp))

                // Rating
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = Icons.Default.Star,
                        contentDescription = "Rating",
                        tint = ForestGreenPrimary,
                        modifier = Modifier.size(16.dp)
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        text = if (deal.reviewCount > 0) "%.1f (%d)".format(deal.rating, deal.reviewCount) else "Chưa có đánh giá",
                        fontSize = 13.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = TextPrimary
                    )
                }

                // Cảnh báo dị ứng cá nhân hóa theo hồ sơ người dùng (K58 / K13)
                if (matchedAllergens.isNotEmpty()) {
                    Spacer(modifier = Modifier.height(10.dp))
                    SqCard(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp),
                        colors = CardDefaults.cardColors(containerColor = CoralRedLight),
                        border = BorderStroke(1.dp, CoralRed)
                    ) {
                        Row(
                            modifier = Modifier.padding(12.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                imageVector = Icons.Default.Warning,
                                contentDescription = "Cảnh báo dị ứng",
                                tint = CoralRed,
                                modifier = Modifier.size(24.dp)
                            )
                            Spacer(modifier = Modifier.width(10.dp))
                            Column {
                                Text(
                                    text = "CẢNH BÁO DỊ ỨNG",
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 12.sp,
                                    color = CoralRed
                                )
                                Spacer(modifier = Modifier.height(2.dp))
                                Text(
                                    text = "Món này có chứa: ${matchedAllergens.joinToString(", ")} trùng với hồ sơ ăn uống của bạn. Vui lòng kiểm tra kỹ!",
                                    fontSize = 13.sp,
                                    color = TextPrimary
                                )
                            }
                        }
                    }
                }

                Spacer(modifier = Modifier.height(14.dp))

                // Highlighted Collection Time Box (matching red frame from screenshot)
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .border(
                            width = 1.2.dp,
                            color = CoralRed,
                            shape = RoundedCornerShape(8.dp)
                        )
                        .background(CoralRed.copy(alpha = 0.04f))
                        .padding(horizontal = 12.dp, vertical = 10.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                imageVector = Icons.Default.Schedule,
                                contentDescription = "Schedule",
                                tint = CoralRed,
                                modifier = Modifier.size(18.dp)
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = deal.pickupWindowText.ifBlank { "Khung giờ nhận do cửa hàng quy định" },
                                fontSize = 14.sp,
                                fontWeight = FontWeight.Bold,
                                color = TextPrimary
                            )
                        }
                        if (deal.isToday) {
                            Box(
                                modifier = Modifier
                                    .clip(RoundedCornerShape(6.dp))
                                    .background(ForestGreenPrimary)
                                    .padding(horizontal = 8.dp, vertical = 3.dp)
                            ) {
                                Text(
                                    text = "Hôm nay",
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Color.White
                                )
                            }
                        }
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))

                // Address Row with Directions Action (R1-038)
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(8.dp))
                        .clickable {
                            com.surplusiq.app.ui.util.NavigationUtil.openMapOrCopyAddress(
                                context = context,
                                storeAddress = deal.storeAddress,
                                storeName = deal.storeName
                            )
                        }
                        .padding(vertical = 6.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        imageVector = Icons.Default.LocationOn,
                        contentDescription = "Địa chỉ",
                        tint = ForestGreenPrimary,
                        modifier = Modifier.size(20.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = deal.storeAddress,
                            fontSize = 13.sp,
                            color = TextPrimary
                        )
                        Text(
                            text = "Chạm để chỉ đường tới quán bằng bản đồ",
                            fontSize = 12.sp,
                            color = ForestGreenPrimary,
                            fontWeight = FontWeight.Medium
                        )
                    }
                    Icon(
                        imageVector = Icons.Default.ChevronRight,
                        contentDescription = "Chi tiết",
                        tint = TextMuted
                    )
                }

                HorizontalDivider(
                    modifier = Modifier.padding(vertical = 14.dp),
                    color = MaterialTheme.colorScheme.outline.copy(alpha = 0.2f)
                )

                // WHAT YOU COULD GET Section
                if (deal.whatYouCouldGet.isNotBlank()) {
                    Text(
                        text = "TRONG TÚI CÓ GÌ",
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold,
                        color = TextSecondary,
                        letterSpacing = 0.5.sp
                    )
                    Spacer(modifier = Modifier.height(6.dp))
                    Text(
                        text = deal.whatYouCouldGet,
                        fontSize = 14.sp,
                        color = TextPrimary,
                        lineHeight = 20.sp
                    )
                    HorizontalDivider(
                        modifier = Modifier.padding(vertical = 14.dp),
                        color = MaterialTheme.colorScheme.outline.copy(alpha = 0.2f)
                    )
                }

                // TrustPass (CM-C03): hồ sơ minh bạch món - không phải chứng nhận an toàn tuyệt đối
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(8.dp))
                        .clickable {
                            showTrustpass = !showTrustpass
                            if (showTrustpass) onLoadTrustpass()
                        }
                        .padding(vertical = 6.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = "Thành phần, dị ứng & hồ sơ minh bạch",
                            fontSize = 14.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = TextPrimary
                        )
                        Text(
                            text = (trustpass?.allergens?.takeIf { it.isNotEmpty() } ?: deal.allergens)
                                .joinToString(", ")
                                .ifEmpty { if (trustpass != null) "Cửa hàng chưa khai báo chất gây dị ứng" else "Bấm để xem thành phần và dị ứng" },
                            fontSize = 12.sp,
                            color = TextSecondary
                        )
                    }
                    Icon(
                        imageVector = Icons.Default.ChevronRight,
                        contentDescription = "Mở rộng",
                        tint = TextMuted
                    )
                }

                AnimatedVisibility(visible = showTrustpass) {
                    SqCard(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(top = 8.dp),
                        shape = RoundedCornerShape(12.dp),
                        colors = CardDefaults.cardColors(containerColor = ForestGreenPrimary.copy(alpha = 0.05f))
                    ) {
                        Column(modifier = Modifier.padding(14.dp)) {
                            when {
                                isTrustpassLoading -> {
                                    Text("Đang tải hồ sơ minh bạch...", fontSize = 13.sp, color = TextSecondary)
                                }
                                trustpassErrorMessage != null -> {
                                    Text(trustpassErrorMessage, fontSize = 13.sp, color = CoralRed)
                                }
                                trustpass != null -> {
                                    TrustpassField("Thành phần", trustpass.ingredients)
                                    Spacer(modifier = Modifier.height(8.dp))
                                    TrustpassAllergensField(trustpass.allergens)
                                    Spacer(modifier = Modifier.height(8.dp))
                                    TrustpassField("Hạn dùng", trustpass.expiryAt)
                                    Spacer(modifier = Modifier.height(8.dp))
                                    TrustpassField("Bảo quản", trustpass.storageInstructions)
                                    Spacer(modifier = Modifier.height(8.dp))
                                    Text(
                                        text = trustpass.pickupWindowNote.replace(Regex("\\s*\\(BR-[A-Za-z0-9-]+\\)"), ""),
                                        fontSize = 11.sp,
                                        color = TextMuted
                                    )
                                    Spacer(modifier = Modifier.height(10.dp))
                                    Text(
                                        text = "Nguồn thông tin: " + when (trustpass.informationSource) {
                                            "STORE" -> "Cửa hàng khai báo"
                                            "PLATFORM_VERIFIED" -> "Nền tảng xác minh"
                                            else -> trustpass.informationSource
                                        } + " • " + when (trustpass.verificationStatus) {
                                            "VERIFIED" -> "Đã xác minh"
                                            "DECLARED" -> "Chưa xác minh độc lập"
                                            else -> trustpass.verificationStatus
                                        },
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.SemiBold,
                                        color = ForestGreenDark
                                    )
                                }
                                else -> {
                                    Text("Chưa có dữ liệu minh bạch.", fontSize = 13.sp, color = TextSecondary)
                                }
                            }
                        }
                    }
                }

                HorizontalDivider(
                    modifier = Modifier.padding(vertical = 14.dp),
                    color = MaterialTheme.colorScheme.outline.copy(alpha = 0.2f)
                )

                // SaveBite AI Tips: Mẹo bảo quản & tái chế (K13)
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(8.dp))
                        .clickable { showAiTips = !showAiTips }
                        .padding(vertical = 6.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier.weight(1f)
                    ) {
                        Box(
                            modifier = Modifier
                                .size(32.dp)
                                .clip(CircleShape)
                                .background(LilacAccent.copy(alpha = 0.2f)),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                imageVector = Icons.Default.AutoAwesome,
                                contentDescription = null,
                                tint = Color(0xFF6B58C4),
                                modifier = Modifier.size(18.dp)
                            )
                        }
                        Spacer(modifier = Modifier.width(10.dp))
                        Column {
                            Text(
                                text = "Mẹo hâm nóng & bảo quản",
                                fontSize = 14.sp,
                                fontWeight = FontWeight.SemiBold,
                                color = TextPrimary
                            )
                            Text(
                                text = "Theo hướng dẫn của cửa hàng và loại món",
                                fontSize = 12.sp,
                                color = TextSecondary
                            )
                        }
                    }
                    Icon(
                        imageVector = if (showAiTips) Icons.Default.KeyboardArrowUp else Icons.Default.ChevronRight,
                        contentDescription = "Mở rộng",
                        tint = TextMuted
                    )
                }

                AnimatedVisibility(visible = showAiTips) {
                    SqCard(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(top = 8.dp),
                        shape = RoundedCornerShape(12.dp),
                        colors = CardDefaults.cardColors(containerColor = LilacWash)
                    ) {
                        Column(modifier = Modifier.padding(14.dp)) {
                            Text(
                                text = "Hướng dẫn hâm nóng & bảo quản",
                                fontWeight = FontWeight.Bold,
                                fontSize = 13.sp,
                                color = Color(0xFF513F9E)
                            )
                            Spacer(modifier = Modifier.height(6.dp))
                            val storageGuide = trustpass?.storageInstructions?.takeIf { it.isNotBlank() } ?: when (deal.category) {
                                DealCategory.BREAD, DealCategory.SWEET -> "• Làm nóng: Xịt một chút nước lên vỏ bánh rồi nướng ở 180°C trong 3-4 phút để vỏ giòn rụm như mới ra lò.\n• Bảo quản: Để ngăn đông nếu không dùng hết trong 24h, khi ăn chỉ cần rã đông ở nhiệt độ phòng."
                                DealCategory.RICE, DealCategory.NOODLE, DealCategory.FASTFOOD, DealCategory.SNACK -> "• Hâm nóng: Sử dụng chảo với một chút dầu/nước, hoặc đậy kín trong lò vi sóng để món ăn không bị khô.\n• Bảo quản: Giữ ở ngăn mát tủ lạnh (dưới 5°C) và dùng tốt nhất trong vòng 24 giờ."
                                DealCategory.PRODUCE, DealCategory.HEALTHY -> "• Sơ chế: Rửa sạch và để ráo nước trước khi cho vào hộp kín trong ngăn mát.\n• Ý tưởng chế biến: Có thể nấu canh soup thanh nhiệt, làm salad trộn sốt mè rang hoặc làm sinh tố trái cây."
                                DealCategory.DRINK, DealCategory.OTHER -> "• Bảo quản nơi khô ráo, thoáng mát hoặc ngăn mát tủ lạnh tùy tính chất thực phẩm.\n• Dùng hết trong khung thời gian khuyến nghị để đảm bảo hương vị chuẩn nhất."
                            }
                            Text(
                                text = storageGuide,
                                fontSize = 13.sp,
                                lineHeight = 19.sp,
                                color = TextPrimary
                            )

                            Spacer(modifier = Modifier.height(10.dp))
                            Text(
                                text = "Cùng SurplusIQ giảm lãng phí thực phẩm và bảo vệ môi trường.",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.SemiBold,
                                color = ForestGreenDark
                            )
                        }
                    }
                }

                HorizontalDivider(
                    modifier = Modifier.padding(vertical = 14.dp),
                    color = MaterialTheme.colorScheme.outline.copy(alpha = 0.2f)
                )

                // KX07: Lịch sử và Biến động giá cứu món (Minh bạch)
                SqCard(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(10.dp))
                        .clickable {
                            showPriceHistorySheet = true
                            onLoadPriceHistory?.invoke()
                        },
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f))
                ) {
                    Row(
                        modifier = Modifier.padding(14.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(10.dp),
                            modifier = Modifier.weight(1f)
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(36.dp)
                                    .clip(CircleShape)
                                    .background(ForestGreenPrimary.copy(alpha = 0.15f)),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(
                                    imageVector = Icons.Default.TrendingDown,
                                    contentDescription = null,
                                    tint = ForestGreenPrimary,
                                    modifier = Modifier.size(20.dp)
                                )
                            }
                            Column {
                                Text(
                                    text = "Biến động & Lịch sử giá (Minh bạch)",
                                    fontSize = 14.sp,
                                    fontWeight = FontWeight.SemiBold,
                                    color = TextPrimary
                                )
                                Text(
                                    text = "Tiết kiệm ${deal.discountPercent}% so với giá niêm yết • Bấm xem chi tiết",
                                    fontSize = 12.sp,
                                    color = TextSecondary
                                )
                            }
                        }
                        Icon(
                            imageVector = Icons.Default.ChevronRight,
                            contentDescription = "Chi tiết",
                            tint = TextMuted
                        )
                    }
                }

            }
            // Nút đặt giữ suất nằm cuối trang, cuộn cùng nội dung; chừa chỗ thanh điều hướng
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 20.dp, vertical = 14.dp)
            ) {
                if (deal.remainingStock <= 0) {
                    Button(
                        onClick = { onToggleBackInStock?.invoke() },
                        enabled = !isTogglingBackInStock,
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(52.dp),
                        shape = RoundedCornerShape(26.dp),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = if (isBackInStockSubscribed) ForestGreenPrimary else PrimaryOrange
                        )
                    ) {
                        Icon(
                            imageVector = if (isBackInStockSubscribed) Icons.Default.Check else Icons.Default.NotificationsActive,
                            contentDescription = null,
                            tint = Color.White,
                            modifier = Modifier.size(18.dp)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = if (isBackInStockSubscribed) "✓ Đang nhận báo khi có hàng lại" else "🔔 Báo tôi khi có hàng lại (Hết hàng)",
                            fontSize = 15.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color.White
                        )
                    }
                } else {
                    Button(
                        onClick = { onReserveClick(deal) },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(52.dp),
                        shape = RoundedCornerShape(26.dp),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = ForestGreenPrimary
                        )
                    ) {
                        Text(
                            text = "Đặt giữ suất",
                            fontSize = 16.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color.White
                        )
                    }
                }
            }
            Spacer(modifier = Modifier.windowInsetsPadding(WindowInsets.navigationBars).height(8.dp))
        }

        // Toast Notification Overlay: "Great! This store was added to your list of favourites" (Image 2 Screen 1)
        AnimatedVisibility(
            visible = showFavoriteToast,
            enter = fadeIn(),
            exit = fadeOut(),
            modifier = Modifier
                .align(Alignment.TopCenter)
                .padding(top = 70.dp, start = 20.dp, end = 20.dp)
        ) {
            SqCard(
                shape = RoundedCornerShape(12.dp),
                colors = CardDefaults.cardColors(containerColor = Color.White),
                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
            ) {
                Row(
                    modifier = Modifier
                        .padding(horizontal = 16.dp, vertical = 12.dp)
                        .fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        imageVector = Icons.Filled.Favorite,
                        contentDescription = null,
                        tint = CoralRed,
                        modifier = Modifier.size(18.dp)
                    )
                    Spacer(modifier = Modifier.width(10.dp))
                    Text(
                        text = toastText,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = TextPrimary
                    )
                }
            }
        }
    }

    if (showPriceHistorySheet) {
        ModalBottomSheet(onDismissRequest = { showPriceHistorySheet = false }) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 20.dp, vertical = 12.dp)
                    .verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "Lịch sử biến động giá",
                        fontSize = 17.sp,
                        fontWeight = FontWeight.Bold,
                        color = TextPrimary
                    )
                    IconButton(onClick = { showPriceHistorySheet = false }) {
                        Icon(Icons.Default.Close, contentDescription = "Đóng")
                    }
                }

                // Banner cam kết minh bạch (KX07)
                Surface(
                    color = ForestGreenPrimary.copy(alpha = 0.1f),
                    shape = RoundedCornerShape(10.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(
                        modifier = Modifier.padding(12.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        Icon(Icons.Default.Verified, contentDescription = null, tint = ForestGreenPrimary, modifier = Modifier.size(24.dp))
                        Text(
                            text = priceHistory?.transparencyCommitment ?: "SurplusIQ cam kết hiển thị giá thực tế từ đối tác, không nâng giá để tạo khuyến mãi ảo.",
                            fontSize = 12.sp,
                            color = ForestGreenDark,
                            lineHeight = 16.sp,
                            fontWeight = FontWeight.Medium
                        )
                    }
                }

                when {
                    isPriceHistoryLoading -> {
                        Box(modifier = Modifier.fillMaxWidth().height(120.dp), contentAlignment = Alignment.Center) {
                            CircularProgressIndicator(color = PrimaryOrange)
                        }
                    }
                    priceHistoryError != null && priceHistory == null -> {
                        Text(priceHistoryError ?: "Không thể tải lịch sử giá", color = CoralRed, fontSize = 13.sp)
                    }
                    else -> {
                        val history = priceHistory
                        // Bảng tóm tắt giá
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            SqCard(
                                modifier = Modifier.weight(1f),
                                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.4f)),
                                shape = RoundedCornerShape(10.dp)
                            ) {
                                Column(modifier = Modifier.padding(12.dp)) {
                                    Text("Giá gốc", fontSize = 11.sp, color = TextMuted)
                                    Text(
                                        "${String.format("%,d", history?.originalPrice ?: deal.originalPrice.toLong())} đ",
                                        fontSize = 15.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = TextSecondary,
                                        style = androidx.compose.ui.text.TextStyle(textDecoration = androidx.compose.ui.text.style.TextDecoration.LineThrough)
                                    )
                                }
                            }
                            SqCard(
                                modifier = Modifier.weight(1f),
                                colors = CardDefaults.cardColors(containerColor = PrimaryOrange.copy(alpha = 0.12f)),
                                shape = RoundedCornerShape(10.dp)
                            ) {
                                Column(modifier = Modifier.padding(12.dp)) {
                                    Text("Giá cứu món", fontSize = 11.sp, color = PrimaryOrange, fontWeight = FontWeight.SemiBold)
                                    Text(
                                        "${String.format("%,d", history?.currentPrice ?: deal.discountPrice.toLong())} đ",
                                        fontSize = 16.sp,
                                        fontWeight = FontWeight.ExtraBold,
                                        color = PrimaryOrange
                                    )
                                }
                            }
                        }

                        // Danh sách mốc biến động
                        Text("Các mốc thời gian điều chỉnh:", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = TextPrimary)

                        val timeline = history?.timeline ?: listOf(
                            com.surplusiq.app.data.remote.dto.PricePointDto(
                                label = "Giá gốc niêm yết",
                                price = deal.originalPrice.toLong(),
                                timestamp = "Trước mở bán",
                                discountPercent = 0,
                                note = "Giá niêm yết tại quán"
                            ),
                            com.surplusiq.app.data.remote.dto.PricePointDto(
                                label = "Giá mở bán cứu món",
                                price = deal.discountPrice.toLong(),
                                timestamp = "Hôm nay",
                                discountPercent = deal.discountPercent,
                                note = "Tiết kiệm ${deal.discountPercent}%"
                            )
                        )

                        timeline.forEachIndexed { idx, point ->
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(12.dp),
                                verticalAlignment = Alignment.Top
                            ) {
                                Box(
                                    modifier = Modifier
                                        .size(10.dp)
                                        .padding(top = 4.dp)
                                        .clip(CircleShape)
                                        .background(if (idx == timeline.size - 1) PrimaryOrange else ForestGreenPrimary)
                                )
                                Column(modifier = Modifier.weight(1f)) {
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceBetween
                                    ) {
                                        Text(point.label, fontWeight = FontWeight.Bold, fontSize = 13.sp, color = TextPrimary)
                                        Text("${String.format("%,d", point.price)} đ", fontWeight = FontWeight.Bold, fontSize = 13.sp, color = PrimaryOrange)
                                    }
                                    if (!point.note.isNullOrBlank()) {
                                        Text(point.note, fontSize = 12.sp, color = TextSecondary)
                                    }
                                    Text(formatPricePointTime(point.timestamp), fontSize = 11.sp, color = TextMuted)
                                    if (idx < timeline.size - 1) {
                                        HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp), color = MaterialTheme.colorScheme.outline.copy(alpha = 0.15f))
                                    }
                                }
                            }
                        }
                    }
                }
                Spacer(modifier = Modifier.height(20.dp))
            }
        }
    }
}


/** BR-C03-02: null = "Chưa được cung cấp" - không suy diễn thành "Không có". */
@Composable
private fun TrustpassField(label: String, value: String?) {
    Column {
        Text(text = label, fontSize = 12.sp, fontWeight = FontWeight.Bold, color = TextSecondary)
        Text(
            text = value ?: "Chưa được cung cấp",
            fontSize = 13.sp,
            color = if (value != null) TextPrimary else TextMuted
        )
    }
}

/** allergens == null -> "Chưa được cung cấp"; allergens == [] -> khai báo rõ là không có (BR-C03-02). */
@Composable
private fun TrustpassAllergensField(allergens: List<String>?) {
    Column {
        Text(text = "Dị ứng", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = TextSecondary)
        when {
            allergens == null -> Text("Chưa được cung cấp", fontSize = 13.sp, color = TextMuted)
            allergens.isEmpty() -> Text("Cửa hàng khai báo rõ: không có chất gây dị ứng", fontSize = 13.sp, color = TextPrimary)
            else -> Row(modifier = Modifier.padding(top = 4.dp)) {
                allergens.forEach { allergen ->
                    Box(
                        modifier = Modifier
                            .padding(end = 6.dp)
                            .clip(RoundedCornerShape(12.dp))
                            .background(CoralRed.copy(alpha = 0.1f))
                            .padding(horizontal = 10.dp, vertical = 4.dp)
                    ) {
                        Text(text = allergen, fontSize = 12.sp, color = CoralRed)
                    }
                }
            }
        }
    }
}


/** Đổi mốc thời gian ISO của máy chủ thành "21/10/2026 20:25"; chuỗi không phải ISO giữ nguyên. */
private fun formatPricePointTime(raw: String): String = try {
    java.time.OffsetDateTime.parse(raw).atZoneSameInstant(java.time.ZoneId.systemDefault())
        .format(java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm"))
} catch (_: Exception) { raw }
