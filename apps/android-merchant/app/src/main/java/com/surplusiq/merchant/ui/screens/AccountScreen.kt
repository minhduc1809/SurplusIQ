package com.surplusiq.merchant.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Logout
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material.icons.filled.ExpandLess
import androidx.compose.material.icons.filled.ExpandMore
import androidx.compose.material.icons.filled.Person
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.surplusiq.merchant.data.SessionManager
import com.surplusiq.merchant.data.StoreRepository
import com.surplusiq.merchant.ui.components.*
import com.surplusiq.merchant.ui.theme.*
import kotlinx.coroutines.launch

/**
 * S05 - Tài khoản của tôi. Email/vai trò lấy từ phiên đăng nhập (backend không có trường họ tên người dùng
 * và không có endpoint "me" cho kênh STORE).
 */
@Composable
fun AccountScreen(repository: StoreRepository, session: SessionManager, onLogout: () -> Unit, onOpenStoreMenu: () -> Unit = {}) {
    var showPassword by remember { mutableStateOf(false) }
    var current by remember { mutableStateOf("") }
    var newPassword by remember { mutableStateOf("") }
    var confirm by remember { mutableStateOf("") }
    var isSaving by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var info by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    fun changePassword() {
        info = null
        error = passwordError(newPassword, confirm)
        if (error != null) return
        // Phiên đăng nhập trước bản này chưa lưu userId.
        val userId = session.getUserId() ?: run { error = "Vui lòng đăng xuất và đăng nhập lại để đổi mật khẩu."; return }
        isSaving = true
        scope.launch {
            val result = repository.changePassword(userId, current, newPassword)
            isSaving = false
            result.fold(
                onSuccess = {
                    current = ""; newPassword = ""; confirm = ""
                    info = it.message ?: "Đổi mật khẩu thành công."
                },
                onFailure = { error = it.message }
            )
        }
    }

    Column(modifier = Modifier.fillMaxSize().background(SqCanvas).verticalScroll(rememberScrollState()).padding(horizontal = 20.dp).padding(top = 4.dp, bottom = 24.dp)) {
        Text(text = "Tài khoản của tôi", fontSize = 26.sp, fontWeight = FontWeight.ExtraBold, color = SqInk)
        Spacer(modifier = Modifier.height(16.dp))

        Row(
            modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(18.dp)).background(SqSurface).padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(modifier = Modifier.size(48.dp).clip(CircleShape).background(SqCoralWash), contentAlignment = Alignment.Center) {
                Icon(Icons.Default.Person, contentDescription = null, tint = SqCoralDeep)
            }
            Spacer(modifier = Modifier.width(12.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(text = session.getUserEmail() ?: "—", fontSize = 15.sp, fontWeight = FontWeight.SemiBold, color = SqInk)
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = permissionLabel(session.getPermission()),
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Bold,
                    color = SqMintDeep,
                    modifier = Modifier.clip(RoundedCornerShape(50)).background(SqMintWash).padding(horizontal = 10.dp, vertical = 4.dp)
                )
            }
        }

        Spacer(modifier = Modifier.height(16.dp))
        Row(
            modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(18.dp)).background(SqSurface).clickable { onOpenStoreMenu() }.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(text = "Cửa hàng & gói dịch vụ", fontSize = 15.sp, fontWeight = FontWeight.SemiBold, color = SqInk)
                Text(text = "Hồ sơ, vận hành, dự báo, định giá", fontSize = 12.sp, color = SqInkSoft)
            }
            Icon(Icons.AutoMirrored.Filled.KeyboardArrowRight, contentDescription = null, tint = SqInkMuted)
        }

        Spacer(modifier = Modifier.height(12.dp))
        Row(
            modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(18.dp)).background(SqSurface).clickable { showPassword = !showPassword }.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(text = "Đổi mật khẩu", fontSize = 15.sp, fontWeight = FontWeight.SemiBold, color = SqInk, modifier = Modifier.weight(1f))
            Icon(if (showPassword) Icons.Default.ExpandLess else Icons.Default.ExpandMore, contentDescription = null, tint = SqInkMuted)
        }
        if (showPassword) {
        Spacer(modifier = Modifier.height(8.dp))
        Column(modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(18.dp)).background(SqSurface).padding(16.dp)) {
            Spacer(modifier = Modifier.height(12.dp))
            PasswordField(value = current, onValueChange = { current = it }, placeholder = "Mật khẩu hiện tại")
            Spacer(modifier = Modifier.height(10.dp))
            PasswordField(value = newPassword, onValueChange = { newPassword = it }, placeholder = "Mật khẩu mới")
            Spacer(modifier = Modifier.height(10.dp))
            PasswordField(value = confirm, onValueChange = { confirm = it }, placeholder = "Nhập lại mật khẩu mới")
            Spacer(modifier = Modifier.height(6.dp))
            Text(text = "Tối thiểu 6 ký tự. Các phiên đăng nhập trên thiết bị khác sẽ bị thu hồi.", fontSize = 12.sp, color = SqInkMuted)
            if (error != null) {
                Spacer(modifier = Modifier.height(10.dp))
                ErrorBanner(error ?: "")
            } else if (info != null) {
                Spacer(modifier = Modifier.height(10.dp))
                InfoBanner(info ?: "")
            }
            Spacer(modifier = Modifier.height(16.dp))
            PrimaryButton(
                text = "Cập nhật mật khẩu",
                onClick = ::changePassword,
                enabled = current.isNotBlank() && newPassword.isNotBlank(),
                loading = isSaving
            )
        }
        }

        Spacer(modifier = Modifier.height(20.dp))
        OutlinedButton(
            onClick = onLogout,
            modifier = Modifier.fillMaxWidth().height(50.dp),
            shape = RoundedCornerShape(25.dp)
        ) {
            Icon(Icons.AutoMirrored.Filled.Logout, contentDescription = null, tint = SqCoralDeep, modifier = Modifier.size(18.dp))
            Spacer(modifier = Modifier.width(8.dp))
            Text(text = "Đăng xuất", color = SqCoralDeep, fontWeight = FontWeight.Bold)
        }
    }
}
