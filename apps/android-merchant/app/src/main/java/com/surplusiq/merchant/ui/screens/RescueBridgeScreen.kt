package com.surplusiq.merchant.ui.screens

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.GppMaybe
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.surplusiq.merchant.data.*
import com.surplusiq.merchant.ui.components.*
import com.surplusiq.merchant.ui.theme.*
import kotlinx.coroutines.launch
import java.time.LocalDateTime

private data class BridgeStatusStyle(val label: String, val bg: Color, val fg: Color)

private fun bridgeStatus(s: String) = when (s) {
    "DRAFT" -> BridgeStatusStyle("Nháp", SqSurfaceSoft, SqInkMuted)
    "SENT" -> BridgeStatusStyle("Đã gửi", Color(0xFFE1F2FA), Color(0xFF3D73A8))
    "ACCEPTED" -> BridgeStatusStyle("Đã chấp nhận", SqCoralWash, SqCoralDeep)
    "REJECTED" -> BridgeStatusStyle("Bị từ chối", SqCoralWash, SqCoralDeep)
    "AWAITING_HANDOVER" -> BridgeStatusStyle("Chờ bàn giao", SqButterWash, WarningText)
    "HANDED_OVER" -> BridgeStatusStyle("Đã bàn giao", SqMintWash, SqMintDeep)
    "PARTIAL" -> BridgeStatusStyle("Bàn giao một phần", SqMintWash, SqMintDeep)
    "FAILED" -> BridgeStatusStyle("Thất bại", SqSurfaceSoft, SqInkSoft)
    "CANCELLED" -> BridgeStatusStyle("Đã hủy", SqCoralWash, SqCoralDeep)
    else -> BridgeStatusStyle(s, SqSurfaceSoft, SqInkSoft)
}

private val TRANSPORT = mapOf(
    "RECIPIENT_PICKUP" to "Đơn vị tự đến nhận (đơn vị chịu chi phí vận chuyển)",
    "STORE_DELIVERY" to "Cửa hàng giao đến (cửa hàng chịu chi phí vận chuyển)"
)

private val ACTION_LABEL = mapOf(
    "RESCUE_BRIDGE_CREATED" to "Tạo đề nghị, giữ suất khỏi tồn bán",
    "RESCUE_BRIDGE_SENT" to "Gửi đề nghị cho đơn vị",
    "RESCUE_BRIDGE_LINK_ROTATED" to "Cấp lại link phản hồi",
    "RESCUE_BRIDGE_ACCEPTED" to "Đơn vị chấp nhận",
    "RESCUE_BRIDGE_REJECTED" to "Đơn vị từ chối",
    "RESCUE_BRIDGE_AWAITING_HANDOVER" to "Cửa hàng thống nhất điều kiện",
    "RESCUE_BRIDGE_SENDER_CONFIRMED" to "Cửa hàng xác nhận đã giao",
    "RESCUE_BRIDGE_RECIPIENT_CONFIRMED" to "Đơn vị xác nhận đã nhận",
    "RESCUE_BRIDGE_DISPUTED" to "Chuyển vận hành xử lý tranh chấp",
    "RESCUE_BRIDGE_HANDED_OVER" to "Hoàn tất bàn giao toàn bộ",
    "RESCUE_BRIDGE_PARTIAL" to "Hoàn tất bàn giao một phần",
    "RESCUE_BRIDGE_FAILED" to "Thất bại",
    "RESCUE_BRIDGE_CANCELLED" to "Hủy"
)

@Composable
private fun BridgeBadge(status: String) {
    val s = bridgeStatus(status)
    Text(
        s.label, fontSize = 12.sp, fontWeight = FontWeight.Bold, color = s.fg,
        modifier = Modifier.clip(RoundedCornerShape(50)).background(s.bg).padding(horizontal = 10.dp, vertical = 4.dp)
    )
}

/** CM-B03 Rescue Bridge. Đơn vị tiếp nhận phản hồi qua link riêng trên web (họ không có tài khoản trong app). */
@Composable
fun RescueBridgeScreen(repository: StoreRepository, onBack: () -> Unit) {
    var selectedId by remember { mutableStateOf<String?>(null) }
    var tab by remember { mutableIntStateOf(0) }
    BackHandler(enabled = selectedId != null) { selectedId = null }
    val id = selectedId
    if (id != null) {
        TransferDetailView(repository, id, onBack = { selectedId = null })
        return
    }
    Column(modifier = Modifier.fillMaxSize().background(SqCanvas).padding(horizontal = 20.dp)) {
        ScreenHeader("Bàn giao suất dư", onBack)
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.padding(vertical = 8.dp)) {
            SqChip("Đề nghị bàn giao", tab == 0) { tab = 0 }
            SqChip("Báo cáo", tab == 1) { tab = 1 }
        }
        if (tab == 0) TransferList(repository, onSelect = { selectedId = it }) else BridgeReportView(repository)
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun TransferList(repository: StoreRepository, onSelect: (String) -> Unit) {
    var list by remember { mutableStateOf<List<BridgeTransfer>?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    var creating by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    fun load() {
        error = null
        scope.launch { repository.getBridgeTransfers().fold(onSuccess = { list = it }, onFailure = { error = it.message }) }
    }
    LaunchedEffect(Unit) { load() }

    Box(Modifier.fillMaxSize()) {
        val l = list
        when {
            error != null -> ErrorState(error!!, ::load)
            l == null -> FullScreenLoading()
            l.isEmpty() -> EmptyState("Chưa có đề nghị bàn giao", "Khi còn suất cuối khung nhận, tạo đề nghị để bàn giao cho đơn vị tiếp nhận đã được duyệt.")
            else -> LazyColumn(verticalArrangement = Arrangement.spacedBy(12.dp), contentPadding = PaddingValues(bottom = 96.dp)) {
                items(l) { t ->
                    SqCard(modifier = Modifier.clickable { onSelect(t.id) }) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Column(Modifier.weight(1f)) {
                                Text(t.foodCategory, fontSize = 15.sp, fontWeight = FontWeight.Bold, color = SqInk)
                                Text(t.recipientOrgName ?: "Chưa chọn đơn vị", fontSize = 12.sp, color = SqInkSoft)
                            }
                            if (t.isDisputed) {
                                Icon(Icons.Default.GppMaybe, contentDescription = "Tranh chấp", tint = SqError, modifier = Modifier.size(18.dp))
                                Spacer(Modifier.width(6.dp))
                            }
                            BridgeBadge(t.transferStatus)
                        }
                        Spacer(Modifier.height(8.dp))
                        Text(
                            "Hạn nhận ${shortDateTime(t.handoverDeadline)} · ${t.quantityProposed} / ${t.quantityAccepted ?: "—"} / ${t.quantityHandedOver ?: "—"} suất (đề nghị / chấp nhận / đã giao)",
                            fontSize = 12.sp, color = SqInkSoft
                        )
                    }
                }
            }
        }
        FloatingActionButton(
            onClick = { creating = true }, containerColor = SqCoral, contentColor = Color.White,
            modifier = Modifier.align(Alignment.BottomEnd).padding(bottom = 16.dp), shape = CircleShape
        ) { Icon(Icons.Default.Add, contentDescription = "Tạo đề nghị") }
    }

    if (creating) {
        ModalBottomSheet(
            onDismissRequest = { creating = false }, containerColor = SqSurface,
            sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
        ) { CreateTransferForm(repository) { id -> creating = false; load(); onSelect(id) } }
    }
}

@Composable
private fun CreateTransferForm(repository: StoreRepository, onCreated: (String) -> Unit) {
    var offers by remember { mutableStateOf<List<BridgeEligibleOffer>?>(null) }
    var offersError by remember { mutableStateOf<String?>(null) }
    var offerId by remember { mutableStateOf("") }
    var qty by remember { mutableStateOf("") }
    var category by remember { mutableStateOf("") }
    var availableAt by remember { mutableStateOf<LocalDateTime?>(null) }
    var deadline by remember { mutableStateOf<LocalDateTime?>(null) }
    var storage by remember { mutableStateOf("") }
    var transport by remember { mutableStateOf("RECIPIENT_PICKUP") }
    var busy by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()
    LaunchedEffect(Unit) {
        repository.getBridgeEligibleOffers().fold(onSuccess = { offers = it }, onFailure = { offersError = it.message })
    }
    val list = offers.orEmpty()
    val selected = list.firstOrNull { it.offerId == offerId }
    val qtyN = qty.toIntOrNull()
    val needCategory = selected != null && selected.foodCategory == null
    val valid = selected != null && qtyN != null && qtyN in 1..selected.remainingQuantity && availableAt != null && deadline != null &&
        storage.isNotBlank() && (!needCategory || category.isNotBlank())

    Column(
        modifier = Modifier.fillMaxWidth().verticalScroll(rememberScrollState()).padding(horizontal = 20.dp).padding(bottom = 32.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        Text("Tạo đề nghị bàn giao", fontSize = 20.sp, fontWeight = FontWeight.ExtraBold, color = SqInk)
        Text("Lô / suất còn lại", fontSize = 12.sp, color = SqInkSoft)
        offersError?.let { InlineError(it) }
        if (offers != null && list.isEmpty()) Text("Không có lô nào còn khả dụng và chưa hết hạn.", fontSize = 13.sp, color = SqInkMuted)
        list.forEach { o ->
            val sel = o.offerId == offerId
            Row(
                modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(14.dp))
                    .background(if (sel) SqCoralWash else SqSurfaceSoft).clickable { offerId = o.offerId }.padding(12.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                RadioButton(selected = sel, onClick = { offerId = o.offerId }, colors = RadioButtonDefaults.colors(selectedColor = SqCoral))
                Text(
                    (if (o.suggested) "★ " else "") + "${o.itemName ?: "Túi bất ngờ"} · còn ${o.remainingQuantity} · hạn dùng ${shortDateTime(o.lotExpiresAt)}",
                    fontSize = 13.sp, color = SqInk
                )
            }
        }
        if (list.any { it.suggested }) Text("★ = gợi ý: gần cuối khung nhận và còn nhiều suất.", fontSize = 12.sp, color = SqInkMuted)
        SqField(
            "Số lượng thực tế có thể bàn giao" + (selected?.let { " (≤ ${it.remainingQuantity})" } ?: ""), qty,
            keyboardType = KeyboardType.Number
        ) { qty = it.filter(Char::isDigit) }
        if (needCategory) SqField("Nhóm món (suất không gắn món)", category) { category = it }
        DateTimeField("Sẵn sàng từ", availableAt) { availableAt = it }
        DateTimeField("Hạn nhận", deadline) { deadline = it }
        SqField("Điều kiện bảo quản (cửa hàng tự khai báo)", storage, singleLine = false) { storage = it }
        Text("Trách nhiệm vận chuyển & chi phí", fontSize = 12.sp, color = SqInkSoft)
        TRANSPORT.forEach { (k, v) ->
            Row(
                modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(14.dp))
                    .background(if (transport == k) SqCoralWash else SqSurfaceSoft).clickable { transport = k }.padding(12.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                RadioButton(selected = transport == k, onClick = { transport = k }, colors = RadioButtonDefaults.colors(selectedColor = SqCoral))
                Text(v, fontSize = 13.sp, color = SqInk)
            }
        }
        InfoBanner("Số lượng sẽ được giữ ngay khỏi tồn bán cho khách. Hủy đề nghị để trả lại.")
        InlineError(error)
        PrimaryButton("Tạo đề nghị (Nháp)", enabled = valid, loading = busy, onClick = {
            busy = true; error = null
            val body = buildMap<String, Any> {
                put("offerId", offerId); put("quantity", qtyN!!)
                put("availableAt", availableAt!!.toIsoUtc()); put("handoverDeadline", deadline!!.toIsoUtc())
                put("storageNotes", storage.trim()); put("transportResponsibility", transport)
                if (category.isNotBlank()) put("foodCategory", category.trim())
            }
            scope.launch {
                repository.createBridgeTransfer(body).fold(onSuccess = { onCreated(it.id) }, onFailure = { error = it.message })
                busy = false
            }
        })
    }
}

private enum class BridgeModal { HANDOVER, FAIL, CANCEL }

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun TransferDetailView(repository: StoreRepository, id: String, onBack: () -> Unit) {
    var t by remember { mutableStateOf<BridgeTransferDetail?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    var actionError by remember { mutableStateOf<String?>(null) }
    var busy by remember { mutableStateOf(false) }
    var link by remember { mutableStateOf<String?>(null) }
    var modal by remember { mutableStateOf<BridgeModal?>(null) }
    var responsible by remember { mutableStateOf("") }
    val scope = rememberCoroutineScope()

    fun reload() {
        scope.launch { repository.getBridgeTransfer(id).fold(onSuccess = { t = it }, onFailure = { error = it.message }) }
    }
    fun <T> run(call: suspend () -> Result<T>, onOk: (T) -> Unit = {}) {
        busy = true; actionError = null
        scope.launch {
            call().fold(onSuccess = { onOk(it); reload() }, onFailure = { actionError = it.message })
            busy = false
        }
    }
    LaunchedEffect(id) { reload() }

    Column(modifier = Modifier.fillMaxSize().background(SqCanvas).padding(horizontal = 20.dp)) {
        ScreenHeader("Chi tiết bàn giao", onBack)
        val d = t
        when {
            error != null -> ErrorState(error!!) { error = null; reload() }
            d == null -> FullScreenLoading()
            else -> LazyColumn(verticalArrangement = Arrangement.spacedBy(12.dp), contentPadding = PaddingValues(bottom = 24.dp)) {
                val can = { a: String -> a in d.allowedActions }
                item {
                    Text("${d.offer?.itemName ?: d.foodCategory} · ${d.quantityProposed} suất", fontSize = 20.sp, fontWeight = FontWeight.ExtraBold, color = SqInk)
                    Spacer(Modifier.height(6.dp))
                    BridgeBadge(d.transferStatus)
                    d.failureReason?.let { Text("Lý do: $it", fontSize = 13.sp, color = SqInkSoft, modifier = Modifier.padding(top = 6.dp)) }
                }
                if (d.isDisputed) item {
                    InfoBanner("Đang tranh chấp - đã chuyển vận hành nền tảng xử lý, hệ thống không tự kết luận bên đúng. ${d.disputeNote ?: ""}")
                }
                item {
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        if (can("CONFIRM_HANDOVER")) PrimaryButton("Xác nhận đã bàn giao", onClick = { modal = BridgeModal.HANDOVER })
                        if (can("ROTATE_LINK")) GhostButton("Cấp lại link cho đơn vị") {
                            run({ repository.rotateBridgeLink(id) }) { link = it.responseLink }
                        }
                        if (can("FAIL")) GhostButton("Báo thất bại") { modal = BridgeModal.FAIL }
                        if (can("CANCEL")) GhostButton("Hủy đề nghị", danger = true) { modal = BridgeModal.CANCEL }
                        InlineError(actionError)
                        link?.let { LinkBox(it) }
                    }
                }
                item {
                    SqCard {
                        SectionTitle("Đề nghị")
                        InfoRow("Nhóm món", d.foodCategory)
                        InfoRow("Đang giữ khỏi tồn bán", "${d.reservedQuantity} suất")
                        InfoRow("Sẵn sàng → Hạn nhận", "${shortDateTime(d.availableAt)} → ${shortDateTime(d.handoverDeadline)}")
                        InfoRow("Vận chuyển", TRANSPORT[d.transportResponsibility] ?: d.transportResponsibility)
                        InfoRow("Bảo quản (cửa hàng khai báo)", d.storageNotes)
                    }
                }
                if (d.transferStatus == "DRAFT") item { MatchesSection(repository, id) { l -> link = l; reload() } }
                d.recipientOrg?.let { org ->
                    item {
                        SqCard {
                            SectionTitle("Đơn vị tiếp nhận & phản hồi")
                            InfoRow("Đơn vị", org.name)
                            if (org.contactName != null) InfoRow("Liên hệ", "${org.contactName} · ${org.contactPhone ?: ""}")
                            InfoRow("Số lượng chấp nhận", d.quantityAccepted?.let { "$it / ${d.quantityProposed}" } ?: "Chưa phản hồi")
                            InfoRow("Giờ đến nhận", shortDateTime(d.agreedPickupAt))
                            InfoRow("Người phụ trách (đơn vị)", d.recipientResponsibleName ?: "—")
                            InfoRow("Người phụ trách (cửa hàng)", d.storeResponsibleName ?: "—")
                            d.recipientNote?.let { Text("Ghi chú đơn vị: $it", fontSize = 13.sp, color = SqInk, modifier = Modifier.padding(top = 8.dp)) }
                            if (can("CONFIRM_AGREEMENT")) {
                                Spacer(Modifier.height(12.dp))
                                if (d.quantityAccepted != d.quantityProposed) {
                                    InfoBanner("Đơn vị đề xuất nhận ${d.quantityAccepted}/${d.quantityProposed} suất. Phần còn lại đã trả về tồn bán. Không đồng ý thì hủy đề nghị.")
                                    Spacer(Modifier.height(8.dp))
                                }
                                SqField("Người chịu trách nhiệm phía cửa hàng", responsible) { responsible = it }
                                Spacer(Modifier.height(8.dp))
                                PrimaryButton("Đồng ý điều kiện → Chờ bàn giao", enabled = responsible.isNotBlank(), loading = busy, onClick = {
                                    run({ repository.confirmBridgeAgreement(id, responsible.trim()) })
                                })
                            }
                        }
                    }
                }
                if (d.senderConfirmedAt != null || d.recipientConfirmedAt != null || d.quantityHandedOver != null) item {
                    SqCard {
                        SectionTitle("Xác nhận bàn giao")
                        InfoRow("Cửa hàng xác nhận", d.senderConfirmedAt?.let { "${d.senderConfirmedQuantity} suất · ${shortDateTime(it)}" } ?: "Chưa")
                        InfoRow(
                            "Đơn vị xác nhận",
                            d.recipientConfirmedAt?.let { "${d.recipientConfirmedQuantity} suất · ${d.recipientConfirmedBy} · ${shortDateTime(it)}" } ?: "Chưa"
                        )
                        InfoRow("Bằng chứng", d.evidenceReference ?: "—")
                        d.quantityHandedOver?.let { InfoRow("Thực tế bàn giao", "$it suất (chênh ${(d.quantityAccepted ?: 0) - it})") }
                    }
                }
                item {
                    SqCard {
                        SectionTitle("Nhật ký")
                        d.history.forEach { h ->
                            val reason = (h.newValue?.get("reason") as? String)?.let { " - $it" } ?: ""
                            Text(
                                "${shortDateTime(h.createdAt)} · ${ACTION_LABEL[h.action] ?: h.action}$reason",
                                fontSize = 13.sp, color = SqInk, modifier = Modifier.padding(vertical = 4.dp)
                            )
                        }
                    }
                }
            }
        }

        val cur = t
        val m = modal
        if (cur != null && m == BridgeModal.HANDOVER) {
            ModalBottomSheet(
                onDismissRequest = { modal = null }, containerColor = SqSurface,
                sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
            ) { HandoverForm(repository, cur) { modal = null; reload() } }
        }
        if (m == BridgeModal.FAIL || m == BridgeModal.CANCEL) {
            ReasonDialog(
                title = if (m == BridgeModal.FAIL) "Báo thất bại" else "Hủy đề nghị",
                hint = "Toàn bộ suất đang giữ sẽ trả về tồn bán. Lý do được ghi nhật ký.",
                onDismiss = { modal = null },
                onSubmit = { reason ->
                    val res = if (m == BridgeModal.FAIL) repository.failBridgeTransfer(id, reason) else repository.cancelBridgeTransfer(id, reason)
                    res.onSuccess { modal = null; reload() }.exceptionOrNull()?.message
                }
            )
        }
    }
}

@Composable
private fun MatchesSection(repository: StoreRepository, id: String, onSent: (String) -> Unit) {
    var data by remember { mutableStateOf<BridgeMatches?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    var busyId by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()
    LaunchedEffect(id) { repository.getBridgeMatches(id).fold(onSuccess = { data = it }, onFailure = { error = it.message }) }

    SqCard {
        SectionTitle("Chọn đơn vị tiếp nhận phù hợp")
        Text(
            "Chỉ đơn vị đã được duyệt, nhận đúng nhóm món, đủ năng lực, phục vụ khu vực cửa hàng và có giờ nhận trùng khung bàn giao. Thông tin liên hệ hiển thị sau khi gửi.",
            fontSize = 12.sp, color = SqInkMuted, modifier = Modifier.padding(vertical = 6.dp)
        )
        val d = data
        when {
            d == null && error == null -> Text("Đang tải…", fontSize = 13.sp, color = SqInkSoft)
            d != null && d.matches.isEmpty() -> InfoBanner(d.message ?: "Chưa có đơn vị phù hợp.")
        }
        d?.matches?.forEach { o ->
            Row(Modifier.fillMaxWidth().padding(vertical = 8.dp), verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text(o.name, fontSize = 14.sp, fontWeight = FontWeight.Bold, color = SqInk)
                    Text(
                        "Tối đa ${o.maxQuantityPerTransfer} suất/lần · ${o.serviceAreas.joinToString(", ")}" +
                            (o.receivingWindowStart?.let { " · nhận ${it.take(5)}–${o.receivingWindowEnd?.take(5)}" } ?: "") +
                            (o.capacityNote?.let { " · $it" } ?: ""),
                        fontSize = 12.sp, color = SqInkSoft
                    )
                }
                Button(
                    onClick = {
                        busyId = o.id; error = null
                        scope.launch {
                            repository.sendBridgeTransfer(id, o.id).fold(onSuccess = { onSent(it.responseLink) }, onFailure = { error = it.message })
                            busyId = null
                        }
                    },
                    enabled = busyId == null, shape = RoundedCornerShape(20.dp), colors = ButtonDefaults.buttonColors(containerColor = SqCoral)
                ) { Text(if (busyId == o.id) "Đang gửi…" else "Gửi", color = Color.White, fontWeight = FontWeight.Bold) }
            }
        }
        InlineError(error)
    }
}

@Composable
private fun LinkBox(link: String) {
    val clipboard = LocalClipboardManager.current
    var copied by remember { mutableStateOf(false) }
    Column(
        modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(14.dp)).background(SqButterWash).padding(12.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        Text("Gửi link này cho người liên hệ của đơn vị để họ chấp nhận/từ chối và xác nhận nhận hàng. Link chỉ hiển thị một lần.", fontSize = 13.sp, color = SqInk)
        Text(link, fontSize = 12.sp, color = SqInkSoft)
        OutlinedButton(onClick = { clipboard.setText(AnnotatedString(link)); copied = true }) { Text(if (copied) "Đã chép" else "Chép link", color = SqInk) }
    }
}

@Composable
private fun HandoverForm(repository: StoreRepository, transfer: BridgeTransferDetail, onDone: () -> Unit) {
    var qty by remember { mutableStateOf((transfer.senderConfirmedQuantity ?: transfer.quantityAccepted)?.toString() ?: "") }
    var evidence by remember { mutableStateOf(transfer.evidenceReference ?: "") }
    var busy by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()
    val qtyN = qty.toIntOrNull()
    val valid = qtyN != null && qtyN >= 1 && qtyN <= (transfer.quantityAccepted ?: Int.MAX_VALUE) &&
        (!transfer.evidenceRequired || evidence.isNotBlank())

    Column(
        modifier = Modifier.fillMaxWidth().verticalScroll(rememberScrollState()).padding(horizontal = 20.dp).padding(bottom = 32.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        Text("Xác nhận đã bàn giao", fontSize = 20.sp, fontWeight = FontWeight.ExtraBold, color = SqInk)
        Text("Chỉ hoàn tất khi đơn vị tiếp nhận cũng xác nhận cùng số lượng. Số lệch sẽ chuyển vận hành xử lý.", fontSize = 13.sp, color = SqInkSoft)
        SqField("Số lượng thực giao (≤ ${transfer.quantityAccepted})", qty, keyboardType = KeyboardType.Number) { qty = it.filter(Char::isDigit) }
        SqField("Bằng chứng: link ảnh / số biên bản" + if (transfer.evidenceRequired) " (bắt buộc)" else "", evidence) { evidence = it }
        InlineError(error)
        PrimaryButton("Xác nhận", enabled = valid, loading = busy, onClick = {
            busy = true; error = null
            val body = buildMap<String, Any> {
                put("quantityHandedOver", qtyN!!)
                if (evidence.isNotBlank()) put("evidenceReference", evidence.trim())
            }
            scope.launch {
                repository.confirmBridgeHandover(transfer.id, body).fold(onSuccess = { onDone() }, onFailure = { error = it.message })
                busy = false
            }
        })
    }
}

@Composable
private fun BridgeReportView(repository: StoreRepository) {
    var r by remember { mutableStateOf<BridgeReport?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()
    fun load() { error = null; scope.launch { repository.getBridgeReport().fold(onSuccess = { r = it }, onFailure = { error = it.message }) } }
    LaunchedEffect(Unit) { load() }
    val d = r
    when {
        error != null -> ErrorState(error!!, ::load)
        d == null -> FullScreenLoading()
        else -> LazyColumn(verticalArrangement = Arrangement.spacedBy(12.dp), contentPadding = PaddingValues(bottom = 24.dp)) {
            item {
                SqCard {
                    SectionTitle("Đề nghị · Chấp nhận · Thực tế bàn giao")
                    InfoRow("Đã gửi đề nghị", "${d.proposed.quantity} suất (${d.proposed.count} đề nghị)")
                    InfoRow("Được chấp nhận", "${d.accepted.quantity} suất (${d.accepted.count})")
                    InfoRow("Thực tế bàn giao", "${d.handedOver.quantity} suất (${d.handedOver.count})")
                    InfoRow("Thiếu so với chấp nhận", "${d.shortfallQuantity} suất")
                    InfoRow("Tranh chấp đang mở", "${d.openDisputes}")
                    Text(d.note, fontSize = 12.sp, color = SqInkMuted, modifier = Modifier.padding(top = 8.dp))
                }
            }
            item {
                SqCard {
                    SectionTitle("Theo trạng thái")
                    d.byStatus.forEach { InfoRow(bridgeStatus(it.status).label, "${it.count}") }
                }
            }
            item {
                SqCard {
                    SectionTitle("Lý do từ chối / thất bại / hủy")
                    if (d.closedReasons.isEmpty()) Text("Chưa có.", fontSize = 13.sp, color = SqInkSoft)
                    d.closedReasons.forEach { c ->
                        Row(Modifier.fillMaxWidth().padding(vertical = 4.dp), verticalAlignment = Alignment.CenterVertically) {
                            BridgeBadge(c.status)
                            Spacer(Modifier.width(8.dp))
                            Text(c.reason, fontSize = 13.sp, color = SqInk, modifier = Modifier.weight(1f))
                            Text("${c.count}", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = SqInk)
                        }
                    }
                }
            }
        }
    }
}
