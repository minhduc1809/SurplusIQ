package com.surplusiq.app.ui.screens.profile

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.AccountBalance
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.CreditCard
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.QrCode2
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.surplusiq.app.data.remote.dto.RefundBankAccountDto
import com.surplusiq.app.ui.components.ErrorState
import com.surplusiq.app.ui.components.LoadingState
import com.surplusiq.app.ui.theme.ForestGreenPrimary
import com.surplusiq.app.ui.theme.PrimaryOrange
import com.surplusiq.app.ui.theme.TextMuted
import com.surplusiq.app.ui.theme.TextPrimary
import com.surplusiq.app.ui.theme.TextSecondary

data class BankOption(val bin: String, val shortName: String, val fullName: String)

val VIETNAM_BANKS = listOf(
    BankOption("970422", "MB Bank", "Ngân hàng TMCP Quân Đội"),
    BankOption("970436", "Vietcombank", "Ngân hàng Ngoại Thương Việt Nam"),
    BankOption("970407", "Techcombank", "Ngân hàng Kỹ Thương Việt Nam"),
    BankOption("970432", "VPBank", "Ngân hàng Việt Nam Thịnh Vượng"),
    BankOption("970416", "ACB", "Ngân hàng Á Châu"),
    BankOption("970415", "VietinBank", "Ngân hàng Công Thương Việt Nam"),
    BankOption("970418", "BIDV", "Ngân hàng Đầu tư và Phát triển Việt Nam"),
    BankOption("970423", "TPBank", "Ngân hàng Tiên Phong"),
    BankOption("970405", "Agribank", "Ngân hàng Nông nghiệp & PT Nông thôn"),
    BankOption("970437", "HDBank", "Ngân hàng Phát triển TP.HCM"),
    BankOption("970403", "Sacombank", "Ngân hàng Sài Gòn Thương Tín"),
    BankOption("970441", "VIB", "Ngân hàng Quốc Tế")
)

/**
 * KX01: Màn hình quản lý tài khoản ngân hàng nhận tiền hoàn VietQR
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RefundBankAccountScreen(
    refundBankAccount: RefundBankAccountDto?,
    isLoading: Boolean,
    errorMessage: String?,
    isSaving: Boolean,
    saveSuccess: Boolean,
    onBackClick: () -> Unit,
    onRetry: () -> Unit,
    onSave: (bankBin: String, bankName: String, accountNumber: String, accountHolder: String) -> Unit,
    onDismissSuccess: () -> Unit,
    modifier: Modifier = Modifier
) {
    var selectedBank by remember { mutableStateOf(VIETNAM_BANKS.first()) }
    var accountNumber by remember { mutableStateOf("") }
    var accountHolder by remember { mutableStateOf("") }
    var showBankMenu by remember { mutableStateOf(false) }
    var validationError by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(refundBankAccount) {
        if (refundBankAccount != null) {
            val matched = VIETNAM_BANKS.find { it.bin == refundBankAccount.bankBin }
            if (matched != null) selectedBank = matched
            accountNumber = refundBankAccount.accountNumber
            accountHolder = refundBankAccount.accountHolder
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Tài khoản nhận hoàn tiền", fontWeight = FontWeight.Bold, fontSize = 17.sp) },
                navigationIcon = {
                    IconButton(onClick = onBackClick) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Quay lại")
                    }
                }
            )
        },
        modifier = modifier
    ) { padding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            when {
                isLoading -> {
                    LoadingState()
                }
                errorMessage != null && refundBankAccount == null -> {
                    ErrorState(
                        message = errorMessage,
                        onRetry = onRetry
                    )
                }
                else -> {
                    Column(
                        modifier = Modifier
                            .fillMaxSize()
                            .verticalScroll(rememberScrollState())
                            .padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(16.dp)
                    ) {
                        // Card hướng dẫn VietQR
                        Card(
                            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)),
                            shape = RoundedCornerShape(12.dp)
                        ) {
                            Row(
                                modifier = Modifier.padding(14.dp),
                                horizontalArrangement = Arrangement.spacedBy(12.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Icon(
                                    Icons.Default.QrCode2,
                                    contentDescription = null,
                                    tint = PrimaryOrange,
                                    modifier = Modifier.size(36.dp)
                                )
                                Column {
                                    Text(
                                        "Hoàn tiền tự động qua VietQR",
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 14.sp,
                                        color = TextPrimary
                                    )
                                    Spacer(modifier = Modifier.height(4.dp))
                                    Text(
                                        "Tiền hoàn sẽ được chuyển tự động vào tài khoản này theo chuẩn VietQR 24/7 khi đơn hàng bị hủy hoặc được duyệt khiếu nại hoàn tiền.",
                                        fontSize = 12.sp,
                                        color = TextSecondary,
                                        lineHeight = 16.sp
                                    )
                                }
                            }
                        }

                        if (saveSuccess) {
                            Surface(
                                color = ForestGreenPrimary.copy(alpha = 0.15f),
                                shape = RoundedCornerShape(8.dp),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Row(
                                    modifier = Modifier.padding(12.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                                ) {
                                    Icon(Icons.Default.CheckCircle, contentDescription = null, tint = ForestGreenPrimary)
                                    Text(
                                        "Đã lưu tài khoản ngân hàng VietQR thành công!",
                                        color = ForestGreenPrimary,
                                        fontSize = 13.sp,
                                        fontWeight = FontWeight.Medium
                                    )
                                }
                            }
                        }

                        // Chọn ngân hàng
                        Text("Ngân hàng thụ hưởng", fontWeight = FontWeight.SemiBold, fontSize = 14.sp, color = TextPrimary)
                        ExposedDropdownMenuBox(
                            expanded = showBankMenu,
                            onExpandedChange = { showBankMenu = it }
                        ) {
                            OutlinedTextField(
                                value = "${selectedBank.shortName} - ${selectedBank.fullName}",
                                onValueChange = {},
                                readOnly = true,
                                trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = showBankMenu) },
                                leadingIcon = { Icon(Icons.Default.AccountBalance, contentDescription = null, tint = PrimaryOrange) },
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .menuAnchor(),
                                shape = RoundedCornerShape(10.dp)
                            )
                            ExposedDropdownMenu(
                                expanded = showBankMenu,
                                onDismissRequest = { showBankMenu = false }
                            ) {
                                VIETNAM_BANKS.forEach { bank ->
                                    DropdownMenuItem(
                                        text = {
                                            Column {
                                                Text(bank.shortName, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                                                Text(bank.fullName, fontSize = 12.sp, color = TextSecondary)
                                            }
                                        },
                                        onClick = {
                                            selectedBank = bank
                                            showBankMenu = false
                                        }
                                    )
                                }
                            }
                        }

                        // Số tài khoản
                        Text("Số tài khoản", fontWeight = FontWeight.SemiBold, fontSize = 14.sp, color = TextPrimary)
                        OutlinedTextField(
                            value = accountNumber,
                            onValueChange = {
                                accountNumber = it.filter { c -> c.isLetterOrDigit() }
                                validationError = null
                            },
                            placeholder = { Text("Ví dụ: 0388123456", color = TextMuted) },
                            leadingIcon = { Icon(Icons.Default.CreditCard, contentDescription = null, tint = PrimaryOrange) },
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(10.dp),
                            singleLine = true
                        )

                        // Tên chủ tài khoản
                        Text("Tên chủ tài khoản (Viết hoa không dấu hoặc có dấu)", fontWeight = FontWeight.SemiBold, fontSize = 14.sp, color = TextPrimary)
                        OutlinedTextField(
                            value = accountHolder,
                            onValueChange = {
                                accountHolder = it.uppercase()
                                validationError = null
                            },
                            placeholder = { Text("Ví dụ: NGUYEN VAN A", color = TextMuted) },
                            leadingIcon = { Icon(Icons.Default.Person, contentDescription = null, tint = PrimaryOrange) },
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(10.dp),
                            singleLine = true
                        )

                        if (validationError != null) {
                            Text(
                                text = validationError ?: "",
                                color = MaterialTheme.colorScheme.error,
                                fontSize = 12.sp,
                                modifier = Modifier.padding(start = 4.dp)
                            )
                        }

                        if (refundBankAccount?.updatedAt != null) {
                            Text(
                                "Lần cập nhật gần nhất: ${refundBankAccount.updatedAt}",
                                fontSize = 11.sp,
                                color = TextMuted
                            )
                        }

                        Spacer(modifier = Modifier.height(8.dp))

                        Button(
                            onClick = {
                                when {
                                    accountNumber.trim().length < 6 -> {
                                        validationError = "Số tài khoản phải từ 6 ký tự trở lên"
                                    }
                                    accountHolder.trim().length < 3 -> {
                                        validationError = "Vui lòng nhập họ tên chủ tài khoản"
                                    }
                                    else -> {
                                        validationError = null
                                        onSave(selectedBank.bin, selectedBank.shortName, accountNumber.trim(), accountHolder.trim())
                                    }
                                }
                            },
                            enabled = !isSaving,
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(50.dp),
                            shape = RoundedCornerShape(12.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = PrimaryOrange)
                        ) {
                            if (isSaving) {
                                CircularProgressIndicator(color = MaterialTheme.colorScheme.onPrimary, modifier = Modifier.size(22.dp), strokeWidth = 2.dp)
                            } else {
                                Text("Lưu tài khoản VietQR", fontWeight = FontWeight.Bold, fontSize = 15.sp)
                            }
                        }
                    }
                }
            }
        }
    }
}
