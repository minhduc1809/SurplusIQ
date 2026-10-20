package com.surplusiq.app.ui.screens.profile

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.surplusiq.app.data.remote.dto.ConsentDto
import com.surplusiq.app.ui.theme.CoralRed
import com.surplusiq.app.ui.theme.ForestGreenPrimary
import com.surplusiq.app.ui.theme.TextMuted
import com.surplusiq.app.ui.theme.TextPrimary
import com.surplusiq.app.ui.theme.TextSecondary
import com.surplusiq.app.ui.viewmodel.ProfileUiState

/** Quyền riêng tư & dữ liệu (GDPR): lịch sử chấp thuận, xuất dữ liệu, xóa tài khoản (R1-012, R1-017, R1-018, R1-019). */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PrivacyDataScreen(
    state: ProfileUiState,
    onBackClick: () -> Unit,
    onExportData: () -> Unit,
    onRequestDelete: () -> Unit,
    onCancelDelete: () -> Unit,
    modifier: Modifier = Modifier
) {
    var showDeleteConfirm by remember { mutableStateOf(false) }
    val isPendingDelete = state.deleteRequestStatus == "PENDING_DELETE"

    Column(
        modifier = modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
    ) {
        TopAppBar(
            title = { Text("Quyền riêng tư & dữ liệu", fontWeight = FontWeight.Bold, fontSize = 17.sp) },
            navigationIcon = {
                IconButton(onClick = onBackClick) {
                    Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                }
            }
        )

        LazyColumn(
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            item {
                Card(shape = RoundedCornerShape(14.dp), modifier = Modifier.fillMaxWidth()) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text("Xuất dữ liệu của tôi", fontWeight = FontWeight.Bold, fontSize = 14.sp, color = TextPrimary)
                        Text(
                            "Nhận liên kết tải toàn bộ dữ liệu cá nhân, có hiệu lực 24 giờ (R1-018).",
                            fontSize = 12.sp,
                            color = TextSecondary
                        )
                        Spacer(modifier = Modifier.height(10.dp))
                        Button(
                            onClick = onExportData,
                            enabled = !state.isExportLoading,
                            colors = ButtonDefaults.buttonColors(containerColor = ForestGreenPrimary)
                        ) {
                            if (state.isExportLoading) {
                                CircularProgressIndicator(modifier = Modifier.size(16.dp), color = androidx.compose.ui.graphics.Color.White)
                            } else {
                                Text("Xuất dữ liệu của tôi")
                            }
                        }
                        if (state.exportMessage != null) {
                            Spacer(modifier = Modifier.height(8.dp))
                            Text(state.exportMessage, fontSize = 12.sp, color = ForestGreenPrimary)
                        }
                        if (state.exportDownloadUrl != null) {
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(state.exportDownloadUrl, fontSize = 11.sp, color = TextMuted)
                        }
                    }
                }
            }

            item {
                Card(shape = RoundedCornerShape(14.dp), modifier = Modifier.fillMaxWidth()) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text("Yêu cầu xóa tài khoản", fontWeight = FontWeight.Bold, fontSize = 14.sp, color = TextPrimary)
                        Text(
                            if (isPendingDelete)
                                "Tài khoản đang trong 7 ngày ân hạn trước khi bị xóa (BR-007)."
                            else
                                "Tài khoản sẽ được ẩn danh sau 7 ngày ân hạn kể từ khi gửi yêu cầu (R1-011, R1-019, BR-007).",
                            fontSize = 12.sp,
                            color = TextSecondary
                        )
                        Spacer(modifier = Modifier.height(10.dp))
                        if (isPendingDelete) {
                            Button(
                                onClick = onCancelDelete,
                                enabled = !state.isAccountDeleteActionLoading,
                                colors = ButtonDefaults.buttonColors(containerColor = ForestGreenPrimary)
                            ) {
                                Text("Hủy yêu cầu")
                            }
                        } else {
                            Button(
                                onClick = { showDeleteConfirm = true },
                                enabled = !state.isAccountDeleteActionLoading,
                                colors = ButtonDefaults.buttonColors(containerColor = CoralRed)
                            ) {
                                Text("Yêu cầu xóa tài khoản")
                            }
                        }
                        if (state.accountDeleteMessage != null) {
                            Spacer(modifier = Modifier.height(8.dp))
                            Text(state.accountDeleteMessage, fontSize = 12.sp, color = TextSecondary)
                        }
                    }
                }
            }

            item {
                Text(
                    "Lịch sử chấp thuận điều khoản",
                    fontWeight = FontWeight.Bold,
                    fontSize = 14.sp,
                    color = TextPrimary
                )
            }

            if (state.isConsentsLoading) {
                item {
                    Box(modifier = Modifier.fillMaxWidth().padding(24.dp), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator(color = ForestGreenPrimary)
                    }
                }
            } else if (state.consentsError != null) {
                item { Text(state.consentsError, fontSize = 12.sp, color = CoralRed) }
            } else if (state.consents.isEmpty()) {
                item { Text("Chưa có lịch sử chấp thuận nào.", fontSize = 12.sp, color = TextMuted) }
            } else {
                items(state.consents) { consent -> ConsentRow(consent) }
            }
        }

        if (showDeleteConfirm) {
            AlertDialog(
                onDismissRequest = { showDeleteConfirm = false },
                title = { Text("Xóa tài khoản?") },
                text = {
                    Text(
                        "Sau khi gửi yêu cầu, tài khoản sẽ có 7 ngày ân hạn để bạn hủy. " +
                            "Hết thời hạn, dữ liệu cá nhân sẽ bị ẩn danh và không thể hoàn tác (BR-007)."
                    )
                },
                confirmButton = {
                    TextButton(onClick = {
                        showDeleteConfirm = false
                        onRequestDelete()
                    }) { Text("Xác nhận xóa", color = CoralRed) }
                },
                dismissButton = {
                    TextButton(onClick = { showDeleteConfirm = false }) { Text("Hủy") }
                }
            )
        }
    }
}

@Composable
private fun ConsentRow(consent: ConsentDto) {
    Card(shape = RoundedCornerShape(10.dp), modifier = Modifier.fillMaxWidth()) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(12.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column {
                Text(consent.type, fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = TextPrimary)
                Text("Phiên bản ${consent.version} • ${consent.grantedAt ?: ""}", fontSize = 11.sp, color = TextMuted)
            }
            Text(
                text = if (consent.granted) "Đã chấp thuận" else "Đã rút lại",
                fontSize = 12.sp,
                fontWeight = FontWeight.SemiBold,
                color = if (consent.granted) ForestGreenPrimary else CoralRed
            )
        }
    }
}
