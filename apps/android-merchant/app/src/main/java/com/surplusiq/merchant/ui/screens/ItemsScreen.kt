package com.surplusiq.merchant.ui.screens

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
        TabHeader(
            title = "Món", addLabel = "Thêm món", onAdd = { onNavigate("item-new") },
            menu = listOf(
                MenuEntry("Nhập món từ CSV", Icons.Default.UploadFile) { onNavigate("items-import") },
                MenuEntry("Kiểm tra dữ liệu", Icons.Default.FactCheck) { onNavigate("items-quality") },
            )
        )
        Spacer(modifier = Modifier.height(12.dp))
        SearchBox(search, "Tìm món theo tên…") { search = it }
        Spacer(modifier = Modifier.height(10.dp))
        ChipRow(listOf<Pair<String?, String>>(null to "Tất cả loại") + ITEM_CATEGORIES.map { it to it }, category) { category = it }
        Spacer(modifier = Modifier.height(8.dp))
        Row(verticalAlignment = Alignment.CenterVertically) {
            ChipRow(STATUS_OPTIONS, status, modifier = Modifier.weight(1f)) { status = it }
            Spacer(modifier = Modifier.width(8.dp))
            SqDropdown("", SORT_OPTIONS, sort, modifier = Modifier.width(132.dp)) { sort = it }
        }
        InlineError(actionError)
        Spacer(modifier = Modifier.height(6.dp))

        when {
            isLoading -> FullScreenLoading()
            error != null -> ErrorState(message = error!!, onRetry = { reloadKey++ })
            items.isEmpty() -> EmptyState(
                if (search.isBlank() && category == null) "Chưa có món nào" else "Không có món phù hợp",
                if (search.isBlank() && category == null) "Thêm món đầu tiên để tạo suất cuối ngày." else "Thử bỏ bớt bộ lọc hoặc đổi từ khóa."
            )
            else -> LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp), contentPadding = PaddingValues(bottom = 20.dp)) {
                items(items, key = { it.id }) { item ->
                    ItemRow(
                        item = item,
                        onOpen = { onNavigate("item/${item.id}") },
                        menu = listOf(
                            MenuEntry("Xem chi tiết", Icons.Default.Visibility) { onNavigate("item/${item.id}") },
                            MenuEntry("Sửa", Icons.Default.Edit) { onNavigate("item-edit/${item.id}") },
                            if (item.status == "ARCHIVED") MenuEntry("Khôi phục", Icons.Default.Unarchive) { toggleArchive(item) }
                            else MenuEntry("Lưu trữ", Icons.Default.Archive) { toggleArchive(item) },
                        )
                    )
                }
                if (page < totalPages) item {
                    TextButton(onClick = ::loadMore, enabled = !loadingMore, modifier = Modifier.fillMaxWidth()) {
                        Text(if (loadingMore) "Đang tải…" else "Tải thêm", color = SqCoral)
                    }
                }
            }
        }
    }
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

@Composable
private fun ItemRow(item: ItemDto, onOpen: () -> Unit, menu: List<MenuEntry>) {
    Row(
        modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(SqSurface).clickable(onClick = onOpen)
            .padding(start = 12.dp, top = 12.dp, bottom = 12.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        RemoteImage(item.imageUrl, modifier = Modifier.size(52.dp))
        Spacer(modifier = Modifier.width(12.dp))
        Column(modifier = Modifier.weight(1f)) {
            Text(text = item.name, fontSize = 14.sp, fontWeight = FontWeight.SemiBold, color = SqInk, maxLines = 1, overflow = TextOverflow.Ellipsis)
            Text(
                text = listOfNotNull(item.category, item.standardShelfLifeHours?.let { "HSD ${it}h" }).joinToString(" · "),
                fontSize = 12.sp, color = SqInkSoft
            )
            Spacer(modifier = Modifier.height(6.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(text = currency(item.originalPrice), fontSize = 13.sp, fontWeight = FontWeight.Bold, color = SqInk)
                Spacer(modifier = Modifier.width(8.dp))
                StatusBadge(status = item.status)
            }
        }
        OverflowMenu(menu, contentDescription = "Thao tác với ${item.name}")
    }
}
