package com.surplusiq.merchant.ui.screens

import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.TextButton
import androidx.compose.material.icons.filled.Close
import androidx.compose.foundation.layout.heightIn
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.foundation.lazy.grid.items as gridItems
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Archive
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.FactCheck
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Unarchive
import androidx.compose.material.icons.filled.UploadFile
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.surplusiq.merchant.data.ItemDto
import com.surplusiq.merchant.data.StoreRepository
import com.surplusiq.merchant.ui.components.*
import com.surplusiq.merchant.ui.theme.*
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

private val STATUS_OPTIONS = listOf("ACTIVE" to "Đang dùng", "ARCHIVED" to "Đã lưu trữ", "ALL" to "Tất cả")
private val SORT_OPTIONS = listOf("createdAt" to "Mới nhất", "name" to "Tên A–Z")
private const val PAGE_SIZE = 20

@Composable
private fun RemovableChip(label: String, onRemove: () -> Unit) {
    Row(
        Modifier.clip(RoundedCornerShape(50)).background(SqCoralWash).clickable(onClick = onRemove).padding(start = 14.dp, end = 8.dp).heightIn(min = 36.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(label, fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = SqCoralDeep)
        Spacer(Modifier.width(4.dp))
        Icon(Icons.Default.Close, contentDescription = "Bỏ lọc $label", tint = SqCoralDeep, modifier = Modifier.size(16.dp))
    }
}

@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
private fun ItemFilterSheet(status: String, category: String?, sort: String, onStatus: (String) -> Unit, onCategory: (String?) -> Unit, onSort: (String) -> Unit, onReset: () -> Unit, onDismiss: () -> Unit) {
    ModalBottomSheet(onDismissRequest = onDismiss, containerColor = SqSurface) {
        Column(Modifier.padding(horizontal = 20.dp).padding(bottom = 28.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text("Bộ lọc", fontSize = 20.sp, fontWeight = FontWeight.ExtraBold, color = SqInk, modifier = Modifier.weight(1f))
                TextButton(onClick = onReset) { Text("Đặt lại", color = SqCoralDeep) }
            }
            Spacer(Modifier.height(10.dp))
            Text("Trạng thái", fontSize = 13.sp, fontWeight = FontWeight.Medium, color = SqInkSoft)
            Spacer(Modifier.height(8.dp))
            SqSegmented(STATUS_OPTIONS, status, onSelect = onStatus)
            Spacer(Modifier.height(18.dp))
            Text("Nhóm món", fontSize = 13.sp, fontWeight = FontWeight.Medium, color = SqInkSoft)
            Spacer(Modifier.height(8.dp))
            FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                SqChip("Tất cả", category == null) { onCategory(null) }
                ITEM_CATEGORIES.forEach { c -> SqChip(c, category == c) { onCategory(c) } }
            }
            Spacer(Modifier.height(18.dp))
            Text("Sắp xếp", fontSize = 13.sp, fontWeight = FontWeight.Medium, color = SqInkSoft)
            Spacer(Modifier.height(8.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) { SORT_OPTIONS.forEach { (v, l) -> SqChip(l, sort == v) { onSort(v) } } }
            Spacer(Modifier.height(22.dp))
            PrimaryButton("Xem kết quả", onClick = onDismiss)
        }
    }
}

/** S20 - Danh sách món (GET store/items có tìm, lọc loại/trạng thái, sắp xếp, phân trang). */
@Composable
fun ItemsScreen(repository: StoreRepository, onNavigate: (String) -> Unit) {
    var items by remember { mutableStateOf<List<ItemDto>>(emptyList()) }
    var page by remember { mutableIntStateOf(1) }
    var totalPages by remember { mutableIntStateOf(1) }
    var isLoading by remember { mutableStateOf(true) }
    var loadingMore by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var actionError by remember { mutableStateOf<String?>(null) }
    var search by rememberSaveable { mutableStateOf("") }
    var category by rememberSaveable { mutableStateOf<String?>(null) }
    var status by rememberSaveable { mutableStateOf("ACTIVE") }
    var sort by rememberSaveable { mutableStateOf("createdAt") }
    var reloadKey by remember { mutableIntStateOf(0) }
    var showFilters by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    suspend fun fetch(p: Int) =
        repository.getItems(search, category, status, sort, if (sort == "name") "ASC" else "DESC", p, PAGE_SIZE)

    LaunchedEffect(search, category, status, sort, reloadKey) {
        delay(300) // gom các lần gõ tìm kiếm liên tiếp
        isLoading = true
        error = null
        fetch(1).fold(
            onSuccess = { items = it.data; page = 1; totalPages = it.totalPages },
            onFailure = { error = it.message }
        )
        isLoading = false
    }

    fun loadMore() {
        loadingMore = true
        scope.launch {
            fetch(page + 1).fold(
                onSuccess = { items = items + it.data; page += 1; totalPages = it.totalPages },
                onFailure = { actionError = it.message }
            )
            loadingMore = false
        }
    }

    fun toggleArchive(item: ItemDto) {
        actionError = null
        scope.launch {
            val result = if (item.status == "ARCHIVED") repository.restoreItem(item.id) else repository.archiveItem(item.id)
            result.fold(onSuccess = { reloadKey++ }, onFailure = { actionError = it.message })
        }
    }

    Column(modifier = Modifier.fillMaxSize().background(SqCanvas).padding(horizontal = 20.dp).padding(top = 20.dp)) {
        FoodSwitch("items", onNavigate)
        TabHeader(
            title = "Thực phẩm", addLabel = "Thêm món", onAdd = { onNavigate("item-new") },
            menu = listOf(
                MenuEntry("Nhập món từ CSV", Icons.Default.UploadFile) { onNavigate("items-import") },
                MenuEntry("Kiểm tra dữ liệu", Icons.Default.FactCheck) { onNavigate("items-quality") },
            )
        )
        Spacer(modifier = Modifier.height(12.dp))
        val activeFilters = (if (category != null) 1 else 0) + (if (status != "ACTIVE") 1 else 0) + (if (sort != "createdAt") 1 else 0)
        Row(verticalAlignment = Alignment.CenterVertically) {
            SqSearchBar(search, "Tìm món theo tên…", Modifier.weight(1f)) { search = it }
            Spacer(modifier = Modifier.width(10.dp))
            FilterButton(activeFilters) { showFilters = true }
        }
        if (activeFilters > 0) {
            Spacer(modifier = Modifier.height(10.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.horizontalScroll(rememberScrollState())) {
                category?.let { RemovableChip(it) { category = null } }
                if (status != "ACTIVE") RemovableChip(STATUS_OPTIONS.first { it.first == status }.second) { status = "ACTIVE" }
                if (sort != "createdAt") RemovableChip(SORT_OPTIONS.first { it.first == sort }.second) { sort = "createdAt" }
            }
        }
        Spacer(modifier = Modifier.height(12.dp))
        InlineError(actionError)
        Spacer(modifier = Modifier.height(6.dp))

        when {
            isLoading -> FullScreenLoading()
            error != null -> ErrorState(message = error!!, onRetry = { reloadKey++ })
            items.isEmpty() -> EmptyState(
                if (search.isBlank() && category == null) "Chưa có món nào" else "Không có món phù hợp",
                if (search.isBlank() && category == null) "Thêm món đầu tiên để tạo suất cuối ngày." else "Thử bỏ bớt bộ lọc hoặc đổi từ khóa."
            )
            else -> androidx.compose.foundation.lazy.grid.LazyVerticalGrid(
                columns = androidx.compose.foundation.lazy.grid.GridCells.Fixed(2),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
                contentPadding = PaddingValues(bottom = 92.dp)
            ) {
                gridItems(items, key = { it.id }) { item ->
                    ItemCard(
                        item = item,
                        onOpen = { onNavigate("item/${item.id}") },
                        onAddPhoto = { onNavigate("item-edit/${item.id}") },
                        menu = listOf(
                            MenuEntry("Xem chi tiết", Icons.Default.Visibility) { onNavigate("item/${item.id}") },
                            MenuEntry("Sửa", Icons.Default.Edit) { onNavigate("item-edit/${item.id}") },
                            if (item.status == "ARCHIVED") MenuEntry("Khôi phục", Icons.Default.Unarchive) { toggleArchive(item) }
                            else MenuEntry("Lưu trữ", Icons.Default.Archive) { toggleArchive(item) },
                        )
                    )
                }
                if (page < totalPages) item(span = { androidx.compose.foundation.lazy.grid.GridItemSpan(2) }) {
                    TextButton(onClick = ::loadMore, enabled = !loadingMore, modifier = Modifier.fillMaxWidth()) {
                        Text(if (loadingMore) "Đang tải…" else "Tải thêm", color = SqCoral)
                    }
                }
            }
        }
    }

    if (showFilters) ItemFilterSheet(
        status = status, category = category, sort = sort,
        onStatus = { status = it }, onCategory = { category = it }, onSort = { sort = it },
        onReset = { status = "ACTIVE"; category = null; sort = "createdAt" },
        onDismiss = { showFilters = false }
    )
}

@Composable
private fun SearchBox(value: String, placeholder: String, onChange: (String) -> Unit) {
    Row(
        modifier = Modifier.fillMaxWidth().height(48.dp).clip(RoundedCornerShape(12.dp)).background(SqSurface).padding(horizontal = 14.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(Icons.Default.Search, contentDescription = null, tint = SqInkMuted, modifier = Modifier.size(18.dp))
        Spacer(modifier = Modifier.width(8.dp))
        BasicTextField(
            value = value,
            onValueChange = onChange,
            singleLine = true,
            modifier = Modifier.fillMaxWidth(),
            textStyle = TextStyle(fontSize = 14.sp, color = SqInk),
            cursorBrush = SolidColor(SqCoral),
            decorationBox = { inner ->
                if (value.isEmpty()) Text(placeholder, fontSize = 14.sp, color = SqInkMuted)
                inner()
            }
        )
    }
}

/** Thẻ món dạng lưới: ảnh hoặc icon theo nhóm, tên, nhóm và hạn dùng, giá và trạng thái. */
@Composable
private fun ItemCard(item: ItemDto, onOpen: () -> Unit, onAddPhoto: () -> Unit, menu: List<MenuEntry>) {
    Column(Modifier.fillMaxWidth().sqSurface(20.dp, 3.dp).clickable(onClick = onOpen).padding(12.dp)) {
        Box(Modifier.fillMaxWidth()) {
            if (item.imageUrl.isNullOrBlank()) PhotoPlaceholderButton("Thêm ảnh", onAddPhoto, Modifier.fillMaxWidth().height(96.dp))
            else RemoteImage(item.imageUrl, modifier = Modifier.fillMaxWidth().height(96.dp), corner = 14.dp, fallback = categoryIcon(item.category))
            Box(Modifier.align(Alignment.TopEnd)) { OverflowMenu(menu, contentDescription = "Thao tác với ${item.name}") }
        }
        Spacer(Modifier.height(8.dp))
        Text(item.name, fontSize = 14.sp, fontWeight = FontWeight.Bold, color = SqInk, maxLines = 2, overflow = TextOverflow.Ellipsis, minLines = 2)
        Text(
            listOfNotNull(item.category, item.standardShelfLifeHours?.let { "HSD ${it}h" }).joinToString(" · "),
            fontSize = 11.sp, color = SqInkSoft, maxLines = 1, overflow = TextOverflow.Ellipsis
        )
        Spacer(Modifier.height(6.dp))
        Text(currency(item.originalPrice), fontSize = 14.sp, fontWeight = FontWeight.ExtraBold, color = SqInk)
        Spacer(Modifier.height(4.dp))
        StatusBadge(status = item.status)
    }
}
