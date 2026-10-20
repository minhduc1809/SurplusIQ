package com.surplusiq.merchant.ui.screens

import android.content.Intent
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.surplusiq.merchant.data.InviteStaffResponse
import com.surplusiq.merchant.data.StaffListResponse
import com.surplusiq.merchant.data.StaffMemberDto
import com.surplusiq.merchant.data.StoreRepository
import com.surplusiq.merchant.ui.components.*
import com.surplusiq.merchant.ui.theme.*
import kotlinx.coroutines.launch

private val ROLES = listOf("MANAGER" to "Quản lý", "COUNTER" to "Nhân viên quầy")
private val ROLE_HINT = mapOf(
    "MANAGER" to "Vận hành hằng ngày, không động đến gói, thanh toán, nhân viên và cấu hình.",
    "COUNTER" to "Quét QR nhận hàng, xem đơn và lịch hẹn nhận."
)
private val MEMBER_STATUS = mapOf("INVITED" to "Chờ kích hoạt", "ACTIVE" to "Hoạt động", "LOCKED" to "Tạm khóa")

private fun memberName(m: StaffMemberDto) = m.user?.fullName?.takeIf { it.isNotBlank() } ?: m.user?.email ?: m.user?.phone ?: "Nhân viên"

/**
 * S63/S64 - Nhân viên (GET/POST store/staff, PATCH/DELETE store/staff/:id). Chỉ chủ cửa hàng.
 * Backend không có họ tên nhân viên và không tự gửi email mời: chủ nhận token một lần để chuyển cho nhân viên,
 * nhân viên dùng màn "Kích hoạt tài khoản nhân viên" ở trang đăng nhập. Liên kết mời hết hạn sau 72 giờ.
 */
@Composable
fun StaffScreen(repository: StoreRepository, onBack: () -> Unit) {
    var data by remember { mutableStateOf<StaffListResponse?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    var actionError by remember { mutableStateOf<String?>(null) }
    var inviting by remember { mutableStateOf(false) }
    var invited by remember { mutableStateOf<InviteStaffResponse?>(null) }
    var changing by remember { mutableStateOf<StaffMemberDto?>(null) }
    var removing by remember { mutableStateOf<StaffMemberDto?>(null) }
    var locking by remember { mutableStateOf<StaffMemberDto?>(null) }
    var reloadKey by remember { mutableIntStateOf(0) }
    val scope = rememberCoroutineScope()

    LaunchedEffect(reloadKey) {
        error = null
        repository.getStaff().fold(onSuccess = { data = it }, onFailure = { error = it.message })
    }

    fun run(block: suspend () -> Result<*>) {
        actionError = null
        scope.launch { block().fold(onSuccess = { reloadKey++ }, onFailure = { actionError = it.message }) }
    }

    LazyColumn(Modifier.fillMaxSize().background(SqCanvas), contentPadding = PaddingValues(20.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
        item {
            ScreenHeader("Nhân viên", onBack)
            Spacer(Modifier.height(8.dp))
            PrimaryButton("＋ Mời nhân viên", onClick = { inviting = true })
            InlineError(actionError)
        }
        val d = data
        when {
            error != null -> item { ErrorState(error!!) { reloadKey++ } }
            d == null -> item { FullScreenLoading() }
            else -> {
                if (d.members.isEmpty()) item { EmptyState("Chưa có nhân viên", "Mời nhân viên để cùng quét QR và vận hành.") }
                items(d.members, key = { it.id }) { m ->
                    SqCard {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Column(Modifier.weight(1f)) {
                                Text(memberName(m), fontSize = 15.sp, fontWeight = FontWeight.Bold, color = SqInk)
                                if (!m.user?.fullName.isNullOrBlank()) Text(m.user?.email.orEmpty(), fontSize = 12.sp, color = SqInkMuted)
                                Text(permissionLabel(m.permission), fontSize = 12.sp, color = SqInkSoft)
                                Text(m.lastActiveAt?.let { "Hoạt động cuối ${shortDateTime(it)}" } ?: "Chưa hoạt động", fontSize = 11.sp, color = SqInkMuted)
                            }
                            Text(MEMBER_STATUS[m.status] ?: m.status, fontSize = 12.sp, fontWeight = FontWeight.Bold, color = if (m.status == "ACTIVE") SqMintDeep else SqCoralDeep)
                        }
                        if (m.permission != "OWNER") Row {
                            TextButton(onClick = { changing = m }, contentPadding = PaddingValues(0.dp)) { Text("Đổi quyền", color = SqInk) }
                            Spacer(Modifier.width(12.dp))
                            if (m.status == "LOCKED") TextButton(onClick = { run { repository.updateStaff(m.id, m.permission, "ACTIVE") } }, contentPadding = PaddingValues(0.dp)) { Text("Mở khóa", color = SqMintDeep) }
                            else TextButton(onClick = { locking = m }, contentPadding = PaddingValues(0.dp)) { Text("Tạm khóa", color = SqCoralDeep) }
                            Spacer(Modifier.width(12.dp))
                            TextButton(onClick = { removing = m }, contentPadding = PaddingValues(0.dp)) { Text("Gỡ", color = SqInkSoft) }
                        }
                    }
                }
                if (d.pendingInvites.isNotEmpty()) {
                    item { SectionTitle("Lời mời chưa dùng") }
                    items(d.pendingInvites, key = { it.id }) { inv ->
                        SqCard {
                            Text(inv.email, fontSize = 14.sp, fontWeight = FontWeight.SemiBold, color = SqInk)
                            Text("${inv.fullName.orEmpty()} · ${permissionLabel(inv.permission)} · hết hạn ${shortDateTime(inv.expiresAt)}", fontSize = 12.sp, color = SqInkSoft)
                        }
                    }
                }
            }
        }
    }

    if (inviting) InviteDialog(repository, onDismiss = { inviting = false }) { invited = it; inviting = false; reloadKey++ }
    invited?.let { InviteTokenDialog(it) { invited = null } }
    changing?.let { m ->
        RoleDialog(m, onDismiss = { changing = null }) { role ->
            changing = null
            run { repository.updateStaff(m.id, role, null) }
        }
    }
    locking?.let { m ->
        ReasonDialog("Tạm khóa ${memberName(m)}", "Nhân viên không đăng nhập được cho đến khi mở khóa. Lý do được ghi vào nhật ký.", { locking = null }) { reason ->
            val r = repository.updateStaff(m.id, m.permission, "LOCKED", reason)
            r.fold(onSuccess = { locking = null; reloadKey++; null }, onFailure = { it.message })
        }
    }
    removing?.let { m ->
        ConfirmDialog(
            title = "Gỡ nhân viên?", message = "${memberName(m)} sẽ không đăng nhập được vào cửa hàng. Lịch sử thao tác vẫn được giữ.",
            confirmLabel = "Gỡ", onDismiss = { removing = null },
            onConfirm = { removing = null; run { repository.removeStaff(m.id) } }
        )
    }
}

@Composable
private fun RoleChoice(selected: String, onSelect: (String) -> Unit) {
    ChipRow(ROLES, selected, onSelect = onSelect)
    Text(ROLE_HINT[selected].orEmpty(), fontSize = 12.sp, color = SqInkSoft, modifier = Modifier.padding(top = 6.dp))
}

@Composable
private fun InviteDialog(repository: StoreRepository, onDismiss: () -> Unit, onDone: (InviteStaffResponse) -> Unit) {
    var fullName by remember { mutableStateOf("") }
    var email by remember { mutableStateOf("") }
    var role by remember { mutableStateOf("COUNTER") }
    var busy by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()
    val valid = android.util.Patterns.EMAIL_ADDRESS.matcher(email.trim()).matches()
    ConfirmDialog(
        title = "Mời nhân viên", message = "Gói Cơ bản tối đa 1 nhân viên, gói Chuyên nghiệp tối đa 5 người đang hoạt động.",
        confirmLabel = if (busy) "Đang tạo…" else "Tạo lời mời", confirmEnabled = valid && fullName.trim().length in 2..60 && !busy, onDismiss = onDismiss,
        onConfirm = {
            busy = true; error = null
            scope.launch {
                repository.inviteStaff(fullName.trim(), email.trim(), role).fold(onSuccess = { onDone(it) }, onFailure = { error = it.message })
                busy = false
            }
        }
    ) {
        Spacer(Modifier.height(8.dp))
        SqField("Họ tên (2–60 ký tự)", fullName) { fullName = it.take(60) }
        Spacer(Modifier.height(8.dp))
        SqField("Email nhân viên", email, keyboardType = androidx.compose.ui.text.input.KeyboardType.Email) { email = it.take(100) }
        Spacer(Modifier.height(8.dp))
        RoleChoice(role) { role = it }
        InlineError(error)
    }
}

@Composable
private fun InviteTokenDialog(res: InviteStaffResponse, onDismiss: () -> Unit) {
    val ctx = LocalContext.current
    ConfirmDialog(
        title = "Đã tạo lời mời",
        message = "Hệ thống không tự gửi email. Gửi mã này cho nhân viên, họ nhập ở màn Kích hoạt tài khoản. Mã chỉ hiện một lần, hết hạn sau 72 giờ.",
        confirmLabel = "Gửi mã", onDismiss = onDismiss,
        onConfirm = {
            val send = Intent(Intent.ACTION_SEND).apply { type = "text/plain"; putExtra(Intent.EXTRA_TEXT, "Mã kích hoạt SurplusIQ: ${res.invitationToken}") }
            ctx.startActivity(Intent.createChooser(send, "Gửi mã mời"))
        }
    ) {
        Spacer(Modifier.height(8.dp))
        androidx.compose.foundation.text.selection.SelectionContainer { Text(res.invitationToken, fontSize = 12.sp, color = SqInk) }
    }
}

@Composable
private fun RoleDialog(m: StaffMemberDto, onDismiss: () -> Unit, onSubmit: (String) -> Unit) {
    var role by remember { mutableStateOf(m.permission) }
    ConfirmDialog(
        title = "Đổi quyền", message = memberName(m), confirmLabel = "Lưu", confirmEnabled = role != m.permission,
        onDismiss = onDismiss, onConfirm = { onSubmit(role) }
    ) {
        Spacer(Modifier.height(8.dp))
        RoleChoice(role) { role = it }
    }
}
