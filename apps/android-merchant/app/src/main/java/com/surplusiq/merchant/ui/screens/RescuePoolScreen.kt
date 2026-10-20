package com.surplusiq.merchant.ui.screens

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Shield
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.surplusiq.merchant.data.*
import com.surplusiq.merchant.ui.components.*
import com.surplusiq.merchant.ui.theme.*
import kotlinx.coroutines.launch
import java.time.LocalDateTime

private data class PoolStatusStyle(val label: String, val bg: Color, val fg: Color)

private fun poolStatus(s: String) = when (s) {
    "DRAFT" -> PoolStatusStyle("Nháp", SqSurfaceSoft, SqInkMuted)
    "OPEN" -> PoolStatusStyle("Mở đăng ký", Color(0xFFE1F2FA), Color(0xFF3D73A8))
    "AGGREGATING" -> PoolStatusStyle("Tổng hợp nhu cầu", Color(0xFFE1F2FA), Color(0xFF3D73A8))
    "PENDING_STORE" -> PoolStatusStyle("Chờ cửa hàng", SqButterWash, WarningText)
    "OFFER_PUBLISHED" -> PoolStatusStyle("Đề nghị cung ứng", SqCoralWash, SqCoralDeep)
    "ORDERING_OPEN" -> PoolStatusStyle("Mở đặt hàng", SqMintWash, SqMintDeep)
    "COMPLETED" -> PoolStatusStyle("Hoàn tất", SqMintWash, SqMintDeep)
    "INSUFFICIENT" -> PoolStatusStyle("Không đủ điều kiện", SqSurfaceSoft, SqInkSoft)
    "CANCELLED" -> PoolStatusStyle("Đã hủy", SqCoralWash, SqCoralDeep)
    "EXPIRED" -> PoolStatusStyle("Hết hạn", SqSurfaceSoft, SqInkMuted)
    else -> PoolStatusStyle(s, SqSurfaceSoft, SqInkSoft)
}

private val BUDGET_LABEL = mapOf(
    "UNSPECIFIED" to "Không nêu", "UNDER_30K" to "< 30.000đ", "30K_50K" to "30–50.000đ",
    "50K_100K" to "50–100.000đ", "OVER_100K" to "≥ 100.000đ"
)

private fun money(n: Long?) = n?.let { currency(it) } ?: "—"

@Composable
private fun PoolBadge(status: String) {
    val s = poolStatus(status)
    Text(
        s.label, fontSize = 12.sp, fontWeight = FontWeight.Bold, color = s.fg,
        modifier = Modifier.clip(RoundedCornerShape(50)).background(s.bg).padding(horizontal = 10.dp, vertical = 4.dp)
    )
}

/** CM-B02 Rescue Pool Manager: danh sách đợt, tạo đợt, chi tiết kèm nhu cầu tổng hợp và báo cáo. */
@Composable
fun RescuePoolScreen(repository: StoreRepository, onBack: () -> Unit) {
    var selectedId by remember { mutableStateOf<String?>(null) }
    BackHandler(enabled = selectedId != null) { selectedId = null }
    selectedId?.let { PoolDetailView(repository, it, onBack = { selectedId = null }) }
        ?: PoolList(repository, onBack, onSelect = { selectedId = it })
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun PoolList(repository: StoreRepository, onBack: () -> Unit, onSelect: (String) -> Unit) {
    var pools by remember { mutableStateOf<List<RescuePool>?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    var creating by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    fun load() {
        error = null
        scope.launch { repository.getRescuePools().fold(onSuccess = { pools = it }, onFailure = { error = it.message }) }
    }
    LaunchedEffect(Unit) { load() }

    Column(modifier = Modifier.fillMaxSize().background(SqCanvas).padding(horizontal = 20.dp)) {
        ScreenHeader("Rescue Pool", onBack) {
            IconButton(onClick = { creating = true }, modifier = Modifier.clip(androidx.compose.foundation.shape.CircleShape).background(SqCoral)) {
                Icon(Icons.Default.Add, contentDescription = "Tạo đợt", tint = Color.White)
            }
        }
        Spacer(Modifier.height(8.dp))
        val list = pools
        when {
            error != null -> ErrorState(error!!, ::load)
            list == null -> FullScreenLoading()
            list.isEmpty() -> EmptyState("Chưa có đợt nào", "Tạo đợt gom nhu cầu để biết khách cần gì trước khi đăng món.")
            else -> LazyColumn(verticalArrangement = Arrangement.spacedBy(12.dp), contentPadding = PaddingValues(bottom = 24.dp)) {
                items(list) { p ->
                    SqCard(modifier = Modifier.clickable { onSelect(p.id) }) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Column(Modifier.weight(1f)) {
                                Text(p.poolTitle, fontSize = 15.sp, fontWeight = FontWeight.Bold, color = SqInk)
                                Text("${p.targetCategory} · ${p.serviceArea}", fontSize = 12.sp, color = SqInkSoft)
                            }
                            PoolBadge(p.poolStatus)
                        }
                        Spacer(Modifier.height(8.dp))
                        Text(
                            "Đóng đăng ký ${shortDateTime(p.registrationCloseAt)} · ${p.registrationCount}/${p.minimumDemand} suất · ${p.confirmedOrderCount} đơn",
                            fontSize = 12.sp, color = SqInkSoft
                        )
                    }
                }
            }
        }
    }

    if (creating) {
        ModalBottomSheet(
            onDismissRequest = { creating = false }, containerColor = SqSurface,
            sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
        ) {
            CreatePoolForm(repository, onCreated = { id -> creating = false; load(); onSelect(id) })
        }
    }
}

/** Đủ trường bắt buộc BR-B02-03/04 mới cho gửi; backend kiểm tra lại toàn bộ. */
@Composable
private fun CreatePoolForm(repository: StoreRepository, onCreated: (String) -> Unit) {
    var title by remember { mutableStateOf("") }
    var category by remember { mutableStateOf("") }
    var area by remember { mutableStateOf("") }
    var openAt by remember { mutableStateOf<LocalDateTime?>(null) }
    var closeAt by remember { mutableStateOf<LocalDateTime?>(null) }
    var confirmAt by remember { mutableStateOf<LocalDateTime?>(null) }
    var pickupStart by remember { mutableStateOf<LocalDateTime?>(null) }
    var pickupEnd by remember { mutableStateOf<LocalDateTime?>(null) }
    var minDemand by remember { mutableStateOf("") }
    var maxSupply by remember { mutableStateOf("") }
    var budgetMin by remember { mutableStateOf("") }
    var budgetMax by remember { mutableStateOf("") }
    var endCondition by remember { mutableStateOf("Đóng khi hết suất cung ứng hoặc hết hạn đề nghị") }
    var busy by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    val minN = minDemand.toIntOrNull()
    val maxN = maxSupply.toIntOrNull()
    val dates = listOf(openAt, closeAt, confirmAt, pickupStart, pickupEnd)
    val valid = title.isNotBlank() && category.isNotBlank() && area.isNotBlank() && endCondition.isNotBlank() &&
        dates.all { it != null } && minN != null && minN >= 1 && maxN != null && maxN >= 1

    Column(
        modifier = Modifier.fillMaxWidth().verticalScroll(rememberScrollState()).padding(horizontal = 20.dp).padding(bottom = 32.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        Text("Tạo đợt gom nhu cầu", fontSize = 20.sp, fontWeight = FontWeight.ExtraBold, color = SqInk)
        SqField("Tên đợt", title) { title = it }
        SqField("Nhóm món (trùng nhóm món trong danh mục)", category) { category = it }
        SqField("Khu vực phục vụ", area) { area = it }
        DateTimeField("Mở đăng ký", openAt) { openAt = it }
        DateTimeField("Đóng đăng ký", closeAt) { closeAt = it }
        DateTimeField("Hạn cửa hàng quyết định cung ứng", confirmAt) { confirmAt = it }
        DateTimeField("Khung nhận từ", pickupStart) { pickupStart = it }
        DateTimeField("Khung nhận đến", pickupEnd) { pickupEnd = it }
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            SqField("Ngưỡng tối thiểu (suất)", minDemand, Modifier.weight(1f), keyboardType = KeyboardType.Number) { minDemand = it.filter(Char::isDigit) }
            SqField("Nguồn cung tối đa (suất)", maxSupply, Modifier.weight(1f), keyboardType = KeyboardType.Number) { maxSupply = it.filter(Char::isDigit) }
        }
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            SqField("Ngân sách từ (đ)", budgetMin, Modifier.weight(1f), keyboardType = KeyboardType.Number) { budgetMin = it.filter(Char::isDigit) }
            SqField("đến (đ)", budgetMax, Modifier.weight(1f), keyboardType = KeyboardType.Number) { budgetMax = it.filter(Char::isDigit) }
        }
        SqField("Điều kiện kết thúc (công bố cho khách)", endCondition) { endCondition = it }
        InlineError(error)
        PrimaryButton("Tạo đợt (Nháp)", enabled = valid, loading = busy, onClick = {
            if (maxN!! < minN!!) { error = "Nguồn cung tối đa phải ≥ ngưỡng tối thiểu."; return@PrimaryButton }
            busy = true
            error = null
            val body = buildMap<String, Any> {
                put("poolTitle", title.trim()); put("targetCategory", category.trim()); put("serviceArea", area.trim())
                put("registrationOpenAt", openAt!!.toIsoUtc()); put("registrationCloseAt", closeAt!!.toIsoUtc())
                put("confirmDeadlineAt", confirmAt!!.toIsoUtc())
                put("pickupWindowStart", pickupStart!!.toIsoUtc()); put("pickupWindowEnd", pickupEnd!!.toIsoUtc())
                put("minimumDemand", minN); put("maximumSupply", maxN)
                budgetMin.toLongOrNull()?.let { put("targetBudgetMin", it) }
                budgetMax.toLongOrNull()?.let { put("targetBudgetMax", it) }
                put("endCondition", endCondition.trim())
            }
            scope.launch {
                repository.createRescuePool(body).fold(onSuccess = { onCreated(it.id) }, onFailure = { error = it.message })
                busy = false
            }
        })
    }
}

private enum class PoolModal { OFFER, CANCEL, INSUFFICIENT, CLOSE_REGISTRATION }

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun PoolDetailView(repository: StoreRepository, id: String, onBack: () -> Unit) {
    var pool by remember { mutableStateOf<RescuePoolDetail?>(null) }
    var report by remember { mutableStateOf<RescuePoolReport?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    var actionError by remember { mutableStateOf<String?>(null) }
    var busy by remember { mutableStateOf(false) }
    var modal by remember { mutableStateOf<PoolModal?>(null) }
    val scope = rememberCoroutineScope()

    fun refresh() {
        scope.launch {
            repository.getRescuePool(id).fold(onSuccess = { pool = it }, onFailure = { error = it.message })
            repository.getRescuePoolReport(id).onSuccess { report = it }
        }
    }
    LaunchedEffect(id) { refresh() }

    Column(modifier = Modifier.fillMaxSize().background(SqCanvas).padding(horizontal = 20.dp)) {
        ScreenHeader("Chi tiết đợt", onBack)
        val p = pool
        when {
            error != null -> ErrorState(error!!) { error = null; refresh() }
            p == null -> FullScreenLoading()
            else -> LazyColumn(verticalArrangement = Arrangement.spacedBy(12.dp), contentPadding = PaddingValues(bottom = 24.dp)) {
                val can = { s: String -> s in p.allowedTransitions }
                item {
                    Text(p.poolTitle, fontSize = 20.sp, fontWeight = FontWeight.ExtraBold, color = SqInk)
                    Spacer(Modifier.height(6.dp))
                    PoolBadge(p.poolStatus)
                    p.cancellationReason?.let { Text("Lý do: $it", fontSize = 13.sp, color = SqInkSoft, modifier = Modifier.padding(top = 6.dp)) }
                }
                item {
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        if (can("OPEN")) {
                            PrimaryButton("Mở đăng ký", loading = busy, onClick = {
                                busy = true; actionError = null
                                scope.launch {
                                    repository.openRescuePool(id).fold(onSuccess = { refresh() }, onFailure = { actionError = it.message })
                                    busy = false
                                }
                            })
                        }
                        if (can("AGGREGATING")) GhostButton("Chốt đăng ký sớm") { modal = PoolModal.CLOSE_REGISTRATION }
                        if (can("OFFER_PUBLISHED") || can("ORDERING_OPEN")) {
                            PrimaryButton(if (p.offerVersion > 0) "Sửa đề nghị cung ứng" else "Công bố đề nghị cung ứng", onClick = { modal = PoolModal.OFFER })
                        }
                        if (can("INSUFFICIENT")) GhostButton("Đóng: Không đủ điều kiện") { modal = PoolModal.INSUFFICIENT }
                        if (can("CANCELLED")) GhostButton("Từ chối / Hủy đợt", danger = true) { modal = PoolModal.CANCEL }
                        InlineError(actionError)
                    }
                }
                item {
                    SqCard {
                        SectionTitle("Điều kiện đã công bố")
                        InfoRow("Nhóm món", p.targetCategory)
                        InfoRow("Khu vực", p.serviceArea)
                        InfoRow("Đăng ký", "${shortDateTime(p.registrationOpenAt)} → ${shortDateTime(p.registrationCloseAt)}")
                        InfoRow("Hạn quyết định", shortDateTime(p.confirmDeadlineAt))
                        InfoRow("Ngưỡng / Tối đa", "${p.minimumDemand} / ${p.maximumSupply} suất")
                        InfoRow("Ngân sách dự kiến", "${money(p.targetBudgetMin)} – ${money(p.targetBudgetMax)}")
                        InfoRow("Khung nhận dự kiến", "${shortDateTime(p.pickupWindowStart)} → ${shortDateTime(p.pickupWindowEnd)}")
                        InfoRow("Kết thúc khi", p.endCondition)
                    }
                }
                item {
                    SqCard {
                        SectionTitle("Nhu cầu tổng hợp")
                        Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(vertical = 6.dp)) {
                            Icon(Icons.Default.Shield, contentDescription = null, tint = SqInkMuted, modifier = Modifier.size(14.dp))
                            Spacer(Modifier.width(6.dp))
                            Text("Chỉ số liệu tổng hợp, không có thông tin cá nhân của khách (BR-B02-08).", fontSize = 12.sp, color = SqInkMuted)
                        }
                        InfoRow("Đăng ký hiệu lực", "${p.demand.totalRegistrations}")
                        InfoRow("Tổng suất quan tâm", "${p.demand.totalRequestedQuantity} suất")
                        InfoRow(
                            "So với ngưỡng",
                            if (p.demand.meetsMinimumDemand) "Đã đủ ngưỡng tối thiểu" else "Còn thiếu ${p.minimumDemand - p.demand.totalRequestedQuantity} suất"
                        )
                        if (p.demand.exceedsMaximumSupply) InfoRow("Lưu ý", "Nhu cầu vượt nguồn cung tối đa")
                        Distribution("Theo ngân sách", p.demand.budgetDistribution.map { (BUDGET_LABEL[it.bucket] ?: it.bucket) to "${it.registrations} đăng ký · ${it.quantity} suất" })
                        Distribution("Theo giờ nhận mong muốn", p.demand.pickupWindowDistribution.map { (if (it.slot == "FLEXIBLE") "Linh hoạt" else it.slot) to "${it.registrations} đăng ký · ${it.quantity} suất" })
                    }
                }
                if (p.offerVersion > 0) item {
                    SqCard {
                        SectionTitle("Đề nghị cung ứng (phiên bản ${p.offerVersion})")
                        InfoRow("Giá / suất", money(p.proposedPrice))
                        InfoRow("Số suất cung ứng", "${p.offeredQuantity ?: 0}")
                        InfoRow("Đã có đơn / Còn lại", "${p.confirmedQuantity} / ${p.remainingSupply ?: 0}")
                        InfoRow("Khung nhận", "${shortDateTime(p.offerPickupStart)} → ${shortDateTime(p.offerPickupEnd)}")
                        InfoRow("Hạn khách xác nhận", shortDateTime(p.offerExpiryAt))
                    }
                }
                item {
                    SqCard {
                        SectionTitle("Báo cáo đợt")
                        val r = report
                        if (r == null) Text("Đang tải…", fontSize = 12.sp, color = SqInkSoft) else {
                            InfoRow("Số đăng ký (tất cả)", "${r.registrations.total}")
                            InfoRow("Đã rút", "${r.registrations.withdrawn}")
                            InfoRow("Đơn đã tạo", "${r.ordersCreated}")
                            InfoRow("Đơn đã nhận", "${r.ordersFulfilled}")
                            InfoRow("Số suất đã bán", "${r.soldQuantity}")
                            if (r.failureReasons.isNotEmpty()) Distribution("Lý do thất bại", r.failureReasons.map { it.reason to "${it.count}" })
                        }
                    }
                }
            }
        }

        val current = pool
        if (current != null && modal == PoolModal.OFFER) {
            ModalBottomSheet(
                onDismissRequest = { modal = null }, containerColor = SqSurface,
                sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
            ) { SupplyOfferForm(repository, current) { modal = null; refresh() } }
        }
        val m = modal
        if (m == PoolModal.CANCEL || m == PoolModal.INSUFFICIENT || m == PoolModal.CLOSE_REGISTRATION) {
            ReasonDialog(
                title = when (m) {
                    PoolModal.CANCEL -> "Từ chối / Hủy đợt"
                    PoolModal.INSUFFICIENT -> "Đóng: Không đủ điều kiện"
                    else -> "Chốt đăng ký sớm"
                },
                hint = when (m) {
                    PoolModal.CANCEL -> "Khách đã đăng ký sẽ được thông báo. Đơn chính thức (nếu có) được hủy và hoàn tiền theo chính sách hiện hành."
                    PoolModal.INSUFFICIENT -> "Không có đơn nào được tạo, không thu tiền khách. Khách được thông báo đợt không đủ điều kiện."
                    else -> "Hệ thống tổng hợp ngay: đủ ngưỡng → Chờ cửa hàng, thiếu → Không đủ điều kiện."
                },
                onDismiss = { modal = null },
                onSubmit = { reason ->
                    val res = when (m) {
                        PoolModal.CLOSE_REGISTRATION -> repository.closePoolRegistration(id, reason)
                        PoolModal.CANCEL -> repository.closeRescuePool(id, reason, "CANCELLED")
                        else -> repository.closeRescuePool(id, reason, "INSUFFICIENT")
                    }
                    res.onSuccess { modal = null; refresh() }.exceptionOrNull()?.message
                }
            )
        }
    }
}

@Composable
internal fun GhostButton(text: String, danger: Boolean = false, onClick: () -> Unit) {
    OutlinedButton(
        onClick = onClick, modifier = Modifier.fillMaxWidth().height(48.dp), shape = RoundedCornerShape(24.dp),
        border = BorderStroke(1.dp, if (danger) SqCoralDeep else SqLine)
    ) { Text(text, fontWeight = FontWeight.SemiBold, color = if (danger) SqCoralDeep else SqInk) }
}

@Composable
internal fun Distribution(title: String, rows: List<Pair<String, String>>) {
    if (rows.isEmpty()) return
    Spacer(Modifier.height(8.dp))
    Text(title.uppercase(), fontSize = 11.sp, fontWeight = FontWeight.Bold, color = SqInkMuted)
    rows.forEach { (k, v) -> InfoRow(k, v) }
}

/** Hộp nhập lý do bắt buộc (được ghi nhật ký); [onSubmit] trả thông báo lỗi hoặc null nếu thành công. */
@Composable
internal fun ReasonDialog(title: String, hint: String, onDismiss: () -> Unit, onSubmit: suspend (String) -> String?) {
    var reason by remember { mutableStateOf("") }
    var busy by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()
    ConfirmDialog(
        title = title, message = hint, confirmLabel = if (busy) "Đang gửi…" else "Xác nhận",
        confirmEnabled = reason.isNotBlank() && !busy, onDismiss = onDismiss,
        onConfirm = {
            busy = true; error = null
            scope.launch { error = onSubmit(reason.trim()); busy = false }
        }
    ) {
        Spacer(Modifier.height(8.dp))
        SqField("Lý do (bắt buộc, được ghi nhật ký)", reason, singleLine = false) { reason = it }
        InlineError(error)
    }
}

@Composable
private fun SupplyOfferForm(repository: StoreRepository, pool: RescuePoolDetail, onDone: () -> Unit) {
    var offers by remember { mutableStateOf<List<OfferDto>>(emptyList()) }
    var offerId by remember { mutableStateOf(pool.linkedOfferId ?: "") }
    var qty by remember { mutableStateOf(pool.offeredQuantity?.toString() ?: "") }
    var expiry by remember { mutableStateOf<LocalDateTime?>(null) }
    var reason by remember { mutableStateOf("") }
    var busy by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()
    val isRevision = pool.offerVersion > 0
    LaunchedEffect(Unit) { repository.getRescuePoolOffers().onSuccess { offers = it.data } }
    val qtyN = qty.toIntOrNull()
    val valid = offerId.isNotEmpty() && qtyN != null && qtyN >= maxOf(1, pool.confirmedQuantity) && qtyN <= pool.maximumSupply &&
        expiry != null && (!isRevision || reason.isNotBlank())

    Column(
        modifier = Modifier.fillMaxWidth().verticalScroll(rememberScrollState()).padding(horizontal = 20.dp).padding(bottom = 32.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        Text(if (isRevision) "Sửa đề nghị cung ứng" else "Công bố đề nghị cung ứng", fontSize = 20.sp, fontWeight = FontWeight.ExtraBold, color = SqInk)
        if (isRevision) {
            InfoBanner("Công bố lại sẽ tạo phiên bản ${pool.offerVersion + 1}. Mọi khách chưa đặt phải xem và xác nhận lại điều kiện mới; đơn đã tạo giữ nguyên.")
        }
        Text("Suất bán nguồn (tồn thật, giá & khung nhận lấy từ suất này)", fontSize = 12.sp, color = SqInkSoft)
        if (offers.isEmpty()) Text("Chưa có suất nào đang mở.", fontSize = 13.sp, color = SqInkMuted)
        offers.forEach { o ->
            val sel = o.id == offerId
            Row(
                modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(14.dp))
                    .background(if (sel) SqCoralWash else SqSurfaceSoft).clickable { offerId = o.id }.padding(12.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                RadioButton(selected = sel, onClick = { offerId = o.id }, colors = RadioButtonDefaults.colors(selectedColor = SqCoral))
                Text(
                    "${currency(o.currentPrice)} · còn ${o.remainingQuantity} · ${shortDateTime(o.pickupStart)}–${shortTime(o.pickupEnd)}",
                    fontSize = 13.sp, color = SqInk
                )
            }
        }
        SqField("Số suất cung ứng (≤ ${pool.maximumSupply}, đã có đơn ${pool.confirmedQuantity})", qty, keyboardType = KeyboardType.Number) { qty = it.filter(Char::isDigit) }
        DateTimeField("Hạn khách xác nhận mua", expiry) { expiry = it }
        if (isRevision) SqField("Lý do thay đổi (bắt buộc)", reason, singleLine = false) { reason = it }
        InlineError(error)
        PrimaryButton("Công bố cho khách đã đăng ký", enabled = valid, loading = busy, onClick = {
            busy = true; error = null
            val body = buildMap<String, Any> {
                put("offerId", offerId); put("offeredQuantity", qtyN!!); put("offerExpiryAt", expiry!!.toIsoUtc())
                if (isRevision) put("changeReason", reason.trim())
            }
            scope.launch {
                repository.supplyPoolOffer(pool.id, body).fold(onSuccess = { onDone() }, onFailure = { error = it.message })
                busy = false
            }
        })
    }
}
