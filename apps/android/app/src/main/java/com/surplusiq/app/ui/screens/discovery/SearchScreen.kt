package com.surplusiq.app.ui.screens.discovery

import android.content.Context
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalSoftwareKeyboardController
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.surplusiq.app.data.remote.api.AiApiService
import com.surplusiq.app.data.remote.dto.CustomerAiSearchRequest
import com.surplusiq.app.domain.model.Deal
import com.surplusiq.app.domain.repository.DiscoveryRepository
import com.surplusiq.app.ui.components.DealCard
import com.surplusiq.app.ui.theme.*
import kotlinx.coroutines.launch

private const val PREFS_NAME = "surplusiq_search_prefs"
private const val KEY_RECENT_SEARCHES = "recent_queries"

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SearchScreen(
    allDeals: List<Deal>,
    onBackClick: () -> Unit,
    onDealClick: (Deal) -> Unit,
    onFavoriteToggle: (Deal) -> Unit,
    aiApiService: AiApiService? = null,
    discoveryRepository: DiscoveryRepository? = null,
    userLatitude: Double? = null,
    userLongitude: Double? = null,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val coroutineScope = rememberCoroutineScope()
    val keyboardController = LocalSoftwareKeyboardController.current
    val focusRequester = remember { FocusRequester() }

    var searchQuery by remember { mutableStateOf("") }
    var isAiMode by remember { mutableStateOf(false) }

    // Quản lý lịch sử tìm kiếm gần đây qua SharedPreferences
    val prefs = remember { context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE) }
    var recentSearches by remember {
        mutableStateOf(
            prefs.getStringSet(KEY_RECENT_SEARCHES, emptySet())?.toList()?.reversed() ?: emptyList()
        )
    }

    fun saveSearchQuery(q: String) {
        val trimmed = q.trim()
        if (trimmed.isBlank()) return
        val current = recentSearches.toMutableList()
        current.remove(trimmed)
        current.add(0, trimmed)
        val trimmedList = current.take(10)
        recentSearches = trimmedList
        prefs.edit().putStringSet(KEY_RECENT_SEARCHES, trimmedList.toSet()).apply()
    }

    fun removeRecent(q: String) {
        val current = recentSearches.toMutableList()
        current.remove(q)
        recentSearches = current
        prefs.edit().putStringSet(KEY_RECENT_SEARCHES, current.toSet()).apply()
    }

    fun clearAllRecent() {
        recentSearches = emptyList()
        prefs.edit().remove(KEY_RECENT_SEARCHES).apply()
    }

    // Kết quả tìm kiếm
    var isLoading by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    var searchResults by remember { mutableStateOf<List<Deal>>(emptyList()) }
    var aiExplanation by remember { mutableStateOf<String?>(null) }
    var hasPerformedSearch by remember { mutableStateOf(false) }

    val trendingKeywords = listOf(
        "Cơm tấm", "Bánh mì sourdough", "Salad chay", "Trái cây tươi", "Cơm trưa 35k", "Trà sữa"
    )

    fun performSearch(queryToSearch: String, useAi: Boolean = isAiMode) {
        val q = queryToSearch.trim()
        if (q.isBlank()) return
        saveSearchQuery(q)
        keyboardController?.hide()

        coroutineScope.launch {
            isLoading = true
            errorMessage = null
            hasPerformedSearch = true
            aiExplanation = null

            if (useAi && aiApiService != null) {
                try {
                    val response = aiApiService.searchDealsWithAi(
                        CustomerAiSearchRequest(
                            query = q,
                            latitude = userLatitude,
                            longitude = userLongitude
                        )
                    )
                    if (response.isSuccessful && response.body() != null) {
                        val body = response.body()!!
                        aiExplanation = body.explanation.ifBlank { null }
                        val matchedIds = body.matchedOffers.map { it.offerId }.toSet()
                        // Lọc từ allDeals hoặc đối chiếu
                        val matchedDeals = allDeals.filter { it.id in matchedIds }
                        // Nếu backend có deal mới chưa có trong allDeals, ta fallback hiển thị deals khớp
                        searchResults = if (matchedDeals.isNotEmpty()) {
                            matchedDeals
                        } else {
                            allDeals.filter {
                                it.title.contains(q, ignoreCase = true) ||
                                it.storeName.contains(q, ignoreCase = true) ||
                                it.whatYouCouldGet.contains(q, ignoreCase = true)
                            }
                        }
                    } else {
                        errorMessage = "SaveBite AI không thể xử lý yêu cầu lúc này (${response.code()})"
                        // Fallback sang local filter
                        searchResults = allDeals.filter {
                            it.title.contains(q, ignoreCase = true) ||
                            it.storeName.contains(q, ignoreCase = true)
                        }
                    }
                } catch (e: Exception) {
                    errorMessage = e.localizedMessage ?: "Lỗi kết nối khi tìm kiếm AI"
                    searchResults = allDeals.filter {
                        it.title.contains(q, ignoreCase = true) ||
                        it.storeName.contains(q, ignoreCase = true)
                    }
                } finally {
                    isLoading = false
                }
            } else {
                // Tìm kiếm tiêu chuẩn qua Repository hoặc local deals
                if (discoveryRepository != null) {
                    val res = discoveryRepository.getNearbyDeals(
                        latitude = userLatitude,
                        longitude = userLongitude,
                        searchQuery = q
                    )
                    res.fold(
                        onSuccess = { deals ->
                            searchResults = deals
                            isLoading = false
                        },
                        onFailure = { err ->
                            // Fallback local filter
                            searchResults = allDeals.filter {
                                it.title.contains(q, ignoreCase = true) ||
                                it.storeName.contains(q, ignoreCase = true)
                            }
                            isLoading = false
                        }
                    )
                } else {
                    searchResults = allDeals.filter {
                        it.title.contains(q, ignoreCase = true) ||
                        it.storeName.contains(q, ignoreCase = true) ||
                        it.whatYouCouldGet.contains(q, ignoreCase = true)
                    }
                    isLoading = false
                }
            }
        }
    }

    LaunchedEffect(Unit) {
        focusRequester.requestFocus()
    }

    Column(
        modifier = modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
    ) {
        // Search Header Bar
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 10.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            IconButton(
                onClick = onBackClick,
                modifier = Modifier.size(40.dp)
            ) {
                Icon(
                    imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                    contentDescription = "Quay lại",
                    tint = TextPrimary
                )
            }

            Spacer(modifier = Modifier.width(6.dp))

            // Text Input
            OutlinedTextField(
                value = searchQuery,
                onValueChange = { searchQuery = it },
                modifier = Modifier
                    .weight(1f)
                    .focusRequester(focusRequester),
                placeholder = {
                    Text(
                        text = if (isAiMode) "Hỏi AI: Món trưa chay dưới 40k..." else "Tìm món ăn, cửa hàng...",
                        fontSize = 14.sp,
                        color = TextMuted
                    )
                },
                singleLine = true,
                shape = RoundedCornerShape(24.dp),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = if (isAiMode) LilacAccent else ForestGreenPrimary,
                    unfocusedBorderColor = DividerColor,
                    focusedContainerColor = MaterialTheme.colorScheme.surface,
                    unfocusedContainerColor = MaterialTheme.colorScheme.surface
                ),
                trailingIcon = {
                    if (searchQuery.isNotEmpty()) {
                        IconButton(onClick = { searchQuery = ""; hasPerformedSearch = false }) {
                            Icon(Icons.Default.Close, contentDescription = "Xóa", tint = TextMuted)
                        }
                    }
                },
                keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
                keyboardActions = KeyboardActions(onSearch = { performSearch(searchQuery) })
            )

            Spacer(modifier = Modifier.width(8.dp))

            // Search Submit Button
            IconButton(
                onClick = { performSearch(searchQuery) },
                modifier = Modifier
                    .size(44.dp)
                    .clip(CircleShape)
                    .background(if (isAiMode) LilacAccent else ForestGreenPrimary)
            ) {
                Icon(
                    imageVector = Icons.Default.Search,
                    contentDescription = "Tìm kiếm",
                    tint = Color.White,
                    modifier = Modifier.size(20.dp)
                )
            }
        }

        // AI Mode Toggle Banner
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 4.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            FilterChip(
                selected = !isAiMode,
                onClick = { isAiMode = false },
                label = { Text("Tìm kiếm chuẩn", fontSize = 12.sp) },
                leadingIcon = { Icon(Icons.Default.Search, contentDescription = null, modifier = Modifier.size(14.dp)) },
                colors = FilterChipDefaults.filterChipColors(
                    selectedContainerColor = ForestGreenPrimary.copy(alpha = 0.15f),
                    selectedLabelColor = ForestGreenPrimary
                )
            )

            FilterChip(
                selected = isAiMode,
                onClick = { isAiMode = true },
                label = { Text("SaveBite AI Assistant", fontSize = 12.sp, fontWeight = FontWeight.Bold) },
                leadingIcon = { Icon(Icons.Default.AutoAwesome, contentDescription = null, modifier = Modifier.size(14.dp)) },
                colors = FilterChipDefaults.filterChipColors(
                    selectedContainerColor = LilacWash,
                    selectedLabelColor = Color(0xFF6B58C4)
                )
            )
        }

        Spacer(modifier = Modifier.height(8.dp))

        // Content Area
        when {
            isLoading -> {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(32.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        CircularProgressIndicator(
                            color = if (isAiMode) LilacAccent else ForestGreenPrimary,
                            modifier = Modifier.size(36.dp)
                        )
                        Spacer(modifier = Modifier.height(14.dp))
                        Text(
                            text = if (isAiMode) "SaveBite AI đang quét danh sách món phù hợp..." else "Đang tìm kiếm deal cứu hộ...",
                            fontSize = 13.sp,
                            color = TextSecondary
                        )
                    }
                }
            }

            hasPerformedSearch -> {
                // Hiển thị kết quả tìm kiếm
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(horizontal = 16.dp, vertical = 12.dp),
                    verticalArrangement = Arrangement.spacedBy(14.dp)
                ) {
                    // Thẻ AI Explanation nếu có
                    if (aiExplanation != null) {
                        item {
                            Card(
                                shape = RoundedCornerShape(16.dp),
                                colors = CardDefaults.cardColors(containerColor = LilacWash),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Row(
                                    modifier = Modifier.padding(14.dp),
                                    verticalAlignment = Alignment.Top
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.AutoAwesome,
                                        contentDescription = "AI",
                                        tint = Color(0xFF6B58C4),
                                        modifier = Modifier.size(22.dp)
                                    )
                                    Spacer(modifier = Modifier.width(10.dp))
                                    Column {
                                        Text(
                                            text = "Gợi ý thông minh từ SaveBite AI",
                                            fontWeight = FontWeight.Bold,
                                            fontSize = 13.sp,
                                            color = Color(0xFF513F9E)
                                        )
                                        Spacer(modifier = Modifier.height(4.dp))
                                        Text(
                                            text = aiExplanation!!,
                                            fontSize = 13.sp,
                                            lineHeight = 18.sp,
                                            color = TextPrimary
                                        )
                                    }
                                }
                            }
                        }
                    }

                    if (errorMessage != null) {
                        item {
                            Text(
                                text = errorMessage!!,
                                color = CoralRed,
                                fontSize = 12.sp,
                                modifier = Modifier.padding(vertical = 4.dp)
                            )
                        }
                    }

                    item {
                        Text(
                            text = "Kết quả tìm kiếm (${searchResults.size})",
                            fontSize = 14.sp,
                            fontWeight = FontWeight.Bold,
                            color = TextSecondary
                        )
                    }

                    if (searchResults.isEmpty()) {
                        item {
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(vertical = 40.dp),
                                contentAlignment = Alignment.Center
                            ) {
                                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                    Icon(
                                        imageVector = Icons.Default.SearchOff,
                                        contentDescription = null,
                                        tint = TextMuted,
                                        modifier = Modifier.size(48.dp)
                                    )
                                    Spacer(modifier = Modifier.height(12.dp))
                                    Text(
                                        text = "Không tìm thấy món nào cho '$searchQuery'",
                                        fontWeight = FontWeight.SemiBold,
                                        color = TextPrimary,
                                        fontSize = 15.sp
                                    )
                                    Spacer(modifier = Modifier.height(6.dp))
                                    Text(
                                        text = "Hãy thử từ khóa ngắn hơn hoặc bật chế độ SaveBite AI để tìm theo ý muốn.",
                                        color = TextSecondary,
                                        fontSize = 13.sp,
                                        textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                                        modifier = Modifier.padding(horizontal = 24.dp)
                                    )
                                }
                            }
                        }
                    } else {
                        items(searchResults, key = { it.id }) { deal ->
                            DealCard(
                                deal = deal,
                                onDealClick = onDealClick,
                                onFavoriteToggle = onFavoriteToggle
                            )
                        }
                    }
                }
            }

            else -> {
                // Màn hình trước khi tìm: Lịch sử & Xu hướng
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(horizontal = 16.dp, vertical = 12.dp)
                ) {
                    // Lịch sử tìm kiếm gần đây
                    if (recentSearches.isNotEmpty()) {
                        item {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    text = "Tìm kiếm gần đây",
                                    fontSize = 14.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = TextPrimary
                                )
                                TextButton(onClick = { clearAllRecent() }) {
                                    Text("Xóa tất cả", fontSize = 12.sp, color = TextMuted)
                                }
                            }
                        }

                        items(recentSearches) { query ->
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clickable {
                                        searchQuery = query
                                        performSearch(query)
                                    }
                                    .padding(vertical = 10.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Icon(
                                        imageVector = Icons.Default.History,
                                        contentDescription = null,
                                        tint = TextMuted,
                                        modifier = Modifier.size(18.dp)
                                    )
                                    Spacer(modifier = Modifier.width(12.dp))
                                    Text(
                                        text = query,
                                        fontSize = 14.sp,
                                        color = TextPrimary
                                    )
                                }
                                IconButton(
                                    onClick = { removeRecent(query) },
                                    modifier = Modifier.size(24.dp)
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.Close,
                                        contentDescription = "Xóa",
                                        tint = TextMuted,
                                        modifier = Modifier.size(16.dp)
                                    )
                                }
                            }
                            HorizontalDivider(color = DividerColor.copy(alpha = 0.5f))
                        }

                        item { Spacer(modifier = Modifier.height(24.dp)) }
                    }

                    // Xu hướng tìm kiếm
                    item {
                        Text(
                            text = "Từ khóa phổ biến",
                            fontSize = 14.sp,
                            fontWeight = FontWeight.Bold,
                            color = TextPrimary
                        )
                        Spacer(modifier = Modifier.height(12.dp))
                    }

                    item {
                        LazyRow(
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            items(trendingKeywords) { keyword ->
                                Box(
                                    modifier = Modifier
                                        .clip(RoundedCornerShape(20.dp))
                                        .background(SurfaceSubtle)
                                        .border(1.dp, DividerColor, RoundedCornerShape(20.dp))
                                        .clickable {
                                            searchQuery = keyword
                                            performSearch(keyword)
                                        }
                                        .padding(horizontal = 14.dp, vertical = 8.dp)
                                ) {
                                    Text(
                                        text = keyword,
                                        fontSize = 13.sp,
                                        fontWeight = FontWeight.Medium,
                                        color = TextPrimary
                                    )
                                }
                            }
                        }
                    }

                    item {
                        Spacer(modifier = Modifier.height(24.dp))
                        // Gợi ý tính năng AI
                        Card(
                            shape = RoundedCornerShape(16.dp),
                            colors = CardDefaults.cardColors(containerColor = LilacWash.copy(alpha = 0.7f)),
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable {
                                    isAiMode = true
                                    searchQuery = "Tìm món trưa chay dưới 40k gần tôi"
                                }
                        ) {
                            Row(
                                modifier = Modifier.padding(16.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Box(
                                    modifier = Modifier
                                        .size(42.dp)
                                        .clip(CircleShape)
                                        .background(LilacAccent),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.AutoAwesome,
                                        contentDescription = null,
                                        tint = Color.White,
                                        modifier = Modifier.size(22.dp)
                                    )
                                }
                                Spacer(modifier = Modifier.width(12.dp))
                                Column {
                                    Text(
                                        text = "Thử tìm kiếm với SaveBite AI",
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 14.sp,
                                        color = Color(0xFF513F9E)
                                    )
                                    Spacer(modifier = Modifier.height(2.dp))
                                    Text(
                                        text = "Gõ bất kỳ câu mô tả nào bạn muốn, AI sẽ chọn món phù hợp nhất.",
                                        fontSize = 12.sp,
                                        color = TextSecondary
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
