package com.surplusiq.app.ui.screens.postpurchase

import android.net.Uri
import com.surplusiq.app.ui.components.SqCard
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AddPhotoAlternate
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.surplusiq.app.domain.model.ActiveOrder
import com.surplusiq.app.domain.repository.InteractionsRepository
import com.surplusiq.app.ui.theme.CoralRed
import com.surplusiq.app.ui.theme.ForestGreenDark
import com.surplusiq.app.ui.theme.ForestGreenPrimary
import com.surplusiq.app.ui.theme.TextMuted
import com.surplusiq.app.ui.theme.TextPrimary
import com.surplusiq.app.ui.theme.TextSecondary
import kotlinx.coroutines.launch
import java.io.InputStream

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CreateComplaintScreen(
    order: ActiveOrder,
    interactionsRepository: InteractionsRepository,
    onUploadEvidence: ((ByteArray, String, (Boolean, String?) -> Unit) -> Unit)? = null,
    onBackClick: () -> Unit,
    onSubmitSuccess: () -> Unit,
    modifier: Modifier = Modifier
) {
    val coroutineScope = rememberCoroutineScope()
    val context = LocalContext.current

    val complaintCategories = listOf(
        "Thức ăn ôi thiu / biến chất (An toàn thực phẩm)",
        "Không đúng loại món như mô tả",
        "Thiếu số lượng / trọng lượng",
        "Cửa hàng đóng cửa khi đến nhận",
        "Khác"
    )

    var selectedCategory by remember { mutableStateOf(complaintCategories.first()) }
    var description by remember { mutableStateOf("") }
    val evidenceImages = remember { mutableStateListOf<String>() }
    var isSubmitting by remember { mutableStateOf(false) }
    var isUploadingPhoto by remember { mutableStateOf(false) }
    var generatedComplaintCode by remember { mutableStateOf("") }
    var showSuccessDialog by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }

    val photoPickerLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent()
    ) { uri: Uri? ->
        if (uri != null) {
            try {
                val inputStream: InputStream? = context.contentResolver.openInputStream(uri)
                val bytes = inputStream?.use { it.readBytes() }
                if (bytes != null && bytes.isNotEmpty()) {
                    if (onUploadEvidence != null) {
                        isUploadingPhoto = true
                        onUploadEvidence(bytes, "evidence_${System.currentTimeMillis()}.jpg") { success, uploadedUrl ->
                            isUploadingPhoto = false
                            if (success && uploadedUrl != null) {
                                evidenceImages.add(uploadedUrl)
                            } else {
                                errorMessage = "Không thể tải ảnh bằng chứng lên máy chủ."
                            }
                        }
                    } else {
                        evidenceImages.add(uri.toString())
                    }
                }
            } catch (e: Exception) {
                errorMessage = "Lỗi khi đọc file ảnh: ${e.localizedMessage}"
            }
        }
    }

    Column(
        modifier = modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
    ) {
        TopAppBar(
            title = {
                Text(
                    text = "Khiếu nại đơn hàng",
                    fontWeight = FontWeight.Bold,
                    fontSize = 18.sp
                )
            },
            navigationIcon = {
                IconButton(onClick = onBackClick) {
                    Icon(
                        imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                        contentDescription = "Back"
                    )
                }
            },
            colors = TopAppBarDefaults.topAppBarColors(
                containerColor = MaterialTheme.colorScheme.surface
            )
        )

        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(20.dp)
        ) {
            // Rule Banner: 24h & 48h limit (BR-026 & R1-061)
            SqCard(
                shape = RoundedCornerShape(12.dp),
                colors = CardDefaults.cardColors(containerColor = CoralRed.copy(alpha = 0.08f)),
                border = androidx.compose.foundation.BorderStroke(1.dp, CoralRed.copy(alpha = 0.3f)),
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(
                    modifier = Modifier.padding(14.dp),
                    verticalAlignment = Alignment.Top
                ) {
                    Icon(
                        imageVector = Icons.Default.Warning,
                        contentDescription = null,
                        tint = CoralRed,
                        modifier = Modifier.size(20.dp).padding(top = 2.dp)
                    )
                    Spacer(modifier = Modifier.width(10.dp))
                    Column {
                        Text(
                            text = "Thời hạn khiếu nại",
                            fontWeight = FontWeight.Bold,
                            fontSize = 13.sp,
                            color = CoralRed
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = "Khiếu nại chỉ được chấp nhận trong vòng 24 giờ sau khi nhận hàng. Cửa hàng có tối đa 48 giờ để xử lý và hoàn tiền.",
                            fontSize = 12.sp,
                            color = TextPrimary,
                            lineHeight = 16.sp
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(18.dp))

            // Order Target Card
            SqCard(
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(
                    modifier = Modifier.padding(16.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text(
                            text = order.deal.storeName,
                            fontWeight = FontWeight.Bold,
                            fontSize = 15.sp
                        )
                        Text(
                            text = "Đơn #${order.orderCode} • ${order.deal.title}",
                            fontSize = 12.sp,
                            color = TextSecondary
                        )
                    }
                    Text(
                        text = "${String.format("%,d", order.totalPrice)} ₫",
                        fontWeight = FontWeight.Bold,
                        color = ForestGreenPrimary,
                        fontSize = 14.sp
                    )
                }
            }

            Spacer(modifier = Modifier.height(20.dp))

            // Reason Category Dropdown / Selection
            Text(
                text = "Lý do khiếu nại:",
                fontWeight = FontWeight.Bold,
                fontSize = 14.sp,
                color = TextPrimary
            )

            Spacer(modifier = Modifier.height(8.dp))

            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                complaintCategories.forEach { category ->
                    val isSelected = selectedCategory == category
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(12.dp))
                            .background(
                                if (isSelected) ForestGreenPrimary.copy(alpha = 0.12f)
                                else MaterialTheme.colorScheme.surface
                            )
                            .border(
                                width = if (isSelected) 1.5.dp else 1.dp,
                                color = if (isSelected) ForestGreenPrimary else MaterialTheme.colorScheme.outline.copy(alpha = 0.2f),
                                shape = RoundedCornerShape(12.dp)
                            )
                            .clickable { selectedCategory = category }
                            .padding(horizontal = 14.dp, vertical = 12.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        RadioButton(
                            selected = isSelected,
                            onClick = { selectedCategory = category },
                            colors = RadioButtonDefaults.colors(selectedColor = ForestGreenPrimary)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = category,
                            fontSize = 13.sp,
                            fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal,
                            color = TextPrimary
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(20.dp))

            // Description Input (10 - 500 characters, R1-061)
            Text(
                text = "Mô tả chi tiết vấn đề:",
                fontWeight = FontWeight.Bold,
                fontSize = 14.sp,
                color = TextPrimary
            )

            Spacer(modifier = Modifier.height(8.dp))

            OutlinedTextField(
                value = description,
                onValueChange = { if (it.length <= 500) description = it },
                placeholder = { Text("Vui lòng nêu rõ tình trạng món ăn, bao bì khi nhận hoặc lý do không hài lòng (tối thiểu 10 ký tự)...") },
                modifier = Modifier.fillMaxWidth().height(140.dp),
                shape = RoundedCornerShape(12.dp),
                supportingText = {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text(
                            text = if (description.length < 10) "Tối thiểu 10 ký tự" else "Hợp lệ",
                            color = if (description.length >= 10) ForestGreenPrimary else CoralRed,
                            fontSize = 11.sp
                        )
                        Text(
                            text = "${description.length} / 500",
                            color = TextMuted,
                            fontSize = 11.sp
                        )
                    }
                }
            )

            Spacer(modifier = Modifier.height(20.dp))

            // Evidence Photos Section (max 3 images, R1-061)
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Ảnh chụp bằng chứng (${evidenceImages.size}/3):",
                    fontWeight = FontWeight.Bold,
                    fontSize = 14.sp,
                    color = TextPrimary
                )
            }

            Spacer(modifier = Modifier.height(8.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                // Display attached photos
                evidenceImages.forEachIndexed { index, url ->
                    val fullUrl = if (url.startsWith("http") || url.startsWith("content://")) url else com.surplusiq.app.BuildConfig.API_BASE_URL.trimEnd('/') + url
                    Box(
                        modifier = Modifier
                            .size(90.dp)
                            .clip(RoundedCornerShape(12.dp))
                    ) {
                        AsyncImage(
                            model = fullUrl,
                            contentDescription = "Evidence $index",
                            contentScale = ContentScale.Crop,
                            modifier = Modifier.fillMaxSize()
                        )
                        IconButton(
                            onClick = { evidenceImages.removeAt(index) },
                            modifier = Modifier
                                .align(Alignment.TopEnd)
                                .size(24.dp)
                                .background(Color.Black.copy(alpha = 0.6f), CircleShape)
                        ) {
                            Icon(
                                imageVector = Icons.Default.Close,
                                contentDescription = "Remove",
                                tint = Color.White,
                                modifier = Modifier.size(14.dp)
                            )
                        }
                    }
                }

                // Add photo slot button
                if (evidenceImages.size < 3) {
                    Box(
                        modifier = Modifier
                            .size(90.dp)
                            .clip(RoundedCornerShape(12.dp))
                            .border(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.3f), RoundedCornerShape(12.dp))
                            .background(MaterialTheme.colorScheme.surface)
                            .clickable {
                                if (onUploadEvidence != null) photoPickerLauncher.launch("image/*")
                            },
                        contentAlignment = Alignment.Center
                    ) {
                        if (isUploadingPhoto) {
                            CircularProgressIndicator(
                                color = ForestGreenPrimary,
                                modifier = Modifier.size(24.dp),
                                strokeWidth = 2.dp
                            )
                        } else {
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                Icon(
                                    imageVector = Icons.Default.AddPhotoAlternate,
                                    contentDescription = "Add Photo",
                                    tint = ForestGreenPrimary,
                                    modifier = Modifier.size(24.dp)
                                )
                                Spacer(modifier = Modifier.height(4.dp))
                                Text(
                                    text = "Tải ảnh",
                                    fontSize = 11.sp,
                                    color = TextSecondary
                                )
                            }
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(24.dp))

            // Error notice if any
            if (errorMessage != null) {
                Text(
                    text = errorMessage!!,
                    color = CoralRed,
                    fontSize = 12.sp,
                    modifier = Modifier.padding(bottom = 12.dp)
                )
            }

            // Submit Button
            val isFormValid = description.trim().length >= 10
            Button(
                onClick = {
                    if (!isFormValid) {
                        errorMessage = "Vui lòng nhập mô tả chi tiết tối thiểu 10 ký tự."
                        return@Button
                    }
                    errorMessage = null
                    isSubmitting = true
                    coroutineScope.launch {
                        val result = interactionsRepository.submitComplaint(
                            orderId = order.id,
                            category = selectedCategory,
                            description = description,
                            imageUrls = evidenceImages.toList()
                        )
                        isSubmitting = false
                        if (result.isSuccess) {
                            generatedComplaintCode = result.getOrNull()?.id ?: "CMP-8941"
                            showSuccessDialog = true
                        } else {
                            errorMessage = result.exceptionOrNull()?.message ?: "Có lỗi xảy ra khi gửi khiếu nại"
                        }
                    }
                },
                enabled = isFormValid && !isSubmitting,
                modifier = Modifier.fillMaxWidth().height(50.dp),
                shape = RoundedCornerShape(25.dp),
                colors = ButtonDefaults.buttonColors(containerColor = CoralRed)
            ) {
                if (isSubmitting) {
                    CircularProgressIndicator(
                        color = Color.White,
                        modifier = Modifier.size(20.dp),
                        strokeWidth = 2.dp
                    )
                } else {
                    Text(
                        text = "Gửi khiếu nại (Chờ phản hồi 48h)",
                        fontSize = 15.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.White
                    )
                }
            }
        }
    }

    if (showSuccessDialog) {
        AlertDialog(
            onDismissRequest = {
                showSuccessDialog = false
                onSubmitSuccess()
            },
            icon = {
                Icon(
                    imageVector = Icons.Default.CheckCircle,
                    contentDescription = null,
                    tint = ForestGreenPrimary,
                    modifier = Modifier.size(48.dp)
                )
            },
            title = {
                Text(
                    text = "Đã tiếp nhận khiếu nại!",
                    fontWeight = FontWeight.Bold
                )
            },
            text = {
                Column {
                    Text(
                        text = "Mã khiếu nại: $generatedComplaintCode",
                        fontWeight = FontWeight.Bold,
                        color = ForestGreenDark,
                        fontSize = 14.sp
                    )
                    Spacer(modifier = Modifier.height(6.dp))
                    Text(
                        text = "Hệ thống đã gửi thông báo đến cửa hàng. Cửa hàng có tối đa 48 giờ để xử lý. Nếu quá hạn, bạn sẽ được tự động hoàn tiền 100%.",
                        fontSize = 13.sp,
                        lineHeight = 18.sp
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        showSuccessDialog = false
                        onSubmitSuccess()
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = ForestGreenPrimary)
                ) {
                    Text("Tôi đã hiểu")
                }
            }
        )
    }
}
