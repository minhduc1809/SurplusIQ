package com.surplusiq.app.ui.screens.profile

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
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.CameraAlt
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Email
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Phone
import androidx.compose.material.icons.filled.Radar
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.surplusiq.app.ui.theme.CoralRed
import com.surplusiq.app.ui.theme.ForestGreenPrimary
import com.surplusiq.app.ui.theme.TextMuted
import com.surplusiq.app.ui.theme.TextPrimary
import com.surplusiq.app.ui.theme.TextSecondary
import com.surplusiq.app.ui.viewmodel.ProfileViewModel
import java.io.InputStream
import kotlin.math.roundToInt

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun EditProfileScreen(
    viewModel: ProfileViewModel,
    onBackClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val uiState by viewModel.uiState.collectAsState()
    val userProfile = uiState.userProfile

    var fullName by remember(userProfile?.fullName) {
        mutableStateOf(userProfile?.fullName ?: "")
    }
    var avatarUrl by remember(userProfile?.avatarUrl) {
        mutableStateOf(userProfile?.avatarUrl)
    }
    var searchRadiusKm by remember(userProfile?.searchRadiusKm) {
        mutableStateOf((userProfile?.searchRadiusKm ?: 5.0).toFloat())
    }

    var selectedImageUri by remember { mutableStateOf<Uri?>(null) }
    var showEmailSheet by remember { mutableStateOf(false) }
    var localErrorMessage by remember { mutableStateOf<String?>(null) }
    val snackbarHostState = remember { SnackbarHostState() }

    val photoPickerLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent()
    ) { uri: Uri? ->
        if (uri != null) {
            selectedImageUri = uri
            try {
                val inputStream: InputStream? = context.contentResolver.openInputStream(uri)
                val bytes = inputStream?.use { it.readBytes() }
                if (bytes != null && bytes.isNotEmpty()) {
                    viewModel.uploadAvatar(
                        bytes = bytes,
                        fileName = "avatar_${System.currentTimeMillis()}.jpg",
                        mimeType = context.contentResolver.getType(uri) ?: "image/jpeg"
                    ) { success, uploadedUrl ->
                        if (success && uploadedUrl != null) {
                            avatarUrl = uploadedUrl
                        } else {
                            localErrorMessage = "Không thể tải ảnh lên máy chủ."
                        }
                    }
                }
            } catch (e: Exception) {
                localErrorMessage = "Lỗi khi đọc file ảnh: ${e.localizedMessage}"
            }
        }
    }

    val isNameValid = fullName.trim().length in 2..60

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        text = "Chỉnh sửa hồ sơ",
                        fontWeight = FontWeight.Bold,
                        fontSize = 18.sp
                    )
                },
                navigationIcon = {
                    IconButton(onClick = onBackClick) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = "Quay lại"
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface
                )
            )
        },
        snackbarHost = { SnackbarHost(snackbarHostState) },
        modifier = modifier
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .background(MaterialTheme.colorScheme.background)
                .verticalScroll(rememberScrollState())
                .padding(20.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            // Khối Avatar với nút chọn ảnh
            Box(
                modifier = Modifier
                    .size(110.dp)
                    .clip(CircleShape),
                contentAlignment = Alignment.Center
            ) {
                if (selectedImageUri != null) {
                    AsyncImage(
                        model = selectedImageUri,
                        contentDescription = "Xem trước ảnh đại diện",
                        contentScale = ContentScale.Crop,
                        modifier = Modifier
                            .fillMaxSize()
                            .clip(CircleShape)
                    )
                } else if (!avatarUrl.isNullOrBlank()) {
                    // Xử lý link tương đối hoặc tuyệt đối
                    val fullAvatarUrl = if (avatarUrl!!.startsWith("http")) avatarUrl else com.surplusiq.app.BuildConfig.API_BASE_URL.trimEnd('/') + avatarUrl
                    AsyncImage(
                        model = fullAvatarUrl,
                        contentDescription = "Avatar",
                        contentScale = ContentScale.Crop,
                        modifier = Modifier
                            .fillMaxSize()
                            .clip(CircleShape)
                    )
                } else {
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .background(ForestGreenPrimary.copy(alpha = 0.15f)),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = Icons.Default.Person,
                            contentDescription = null,
                            tint = ForestGreenPrimary,
                            modifier = Modifier.size(56.dp)
                        )
                    }
                }

                // Overlay Camera Button
                Box(
                    modifier = Modifier
                        .align(Alignment.BottomEnd)
                        .padding(4.dp)
                        .size(34.dp)
                        .clip(CircleShape)
                        .background(ForestGreenPrimary)
                        .clickable { photoPickerLauncher.launch("image/*") },
                    contentAlignment = Alignment.Center
                ) {
                    if (uiState.isUploadingAvatar) {
                        CircularProgressIndicator(
                            color = Color.White,
                            strokeWidth = 2.dp,
                            modifier = Modifier.size(16.dp)
                        )
                    } else {
                        Icon(
                            imageVector = Icons.Default.CameraAlt,
                            contentDescription = "Chọn ảnh",
                            tint = Color.White,
                            modifier = Modifier.size(18.dp)
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = "Chạm vào biểu tượng máy ảnh để đổi avatar",
                fontSize = 12.sp,
                color = TextMuted
            )

            Spacer(modifier = Modifier.height(24.dp))

            // Form Fields
            SqCard(
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(
                    modifier = Modifier.padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    // Họ và tên (R1-006: 2 - 60 ký tự)
                    Column {
                        Text(
                            text = "Họ và tên *",
                            fontWeight = FontWeight.SemiBold,
                            fontSize = 13.sp,
                            color = TextPrimary
                        )
                        Spacer(modifier = Modifier.height(6.dp))
                        OutlinedTextField(
                            value = fullName,
                            onValueChange = {
                                if (it.length <= 60) fullName = it
                            },
                            singleLine = true,
                            placeholder = { Text("Nhập họ và tên của bạn") },
                            isError = fullName.isNotBlank() && !isNameValid,
                            supportingText = {
                                Text(
                                    text = if (fullName.isNotBlank() && !isNameValid) "Họ tên phải từ 2 đến 60 ký tự."
                                    else "${fullName.trim().length} / 60 ký tự",
                                    fontSize = 11.sp,
                                    color = if (fullName.isNotBlank() && !isNameValid) CoralRed else TextMuted
                                )
                            },
                            shape = RoundedCornerShape(12.dp),
                            modifier = Modifier.fillMaxWidth()
                        )
                    }

                    // Số điện thoại (Chỉ xem)
                    Column {
                        Text(
                            text = "Số điện thoại",
                            fontWeight = FontWeight.SemiBold,
                            fontSize = 13.sp,
                            color = TextPrimary
                        )
                        Spacer(modifier = Modifier.height(6.dp))
                        OutlinedTextField(
                            value = userProfile?.phone ?: "",
                            onValueChange = {},
                            readOnly = true,
                            enabled = false,
                            leadingIcon = {
                                Icon(
                                    imageVector = Icons.Default.Phone,
                                    contentDescription = null,
                                    tint = TextMuted
                                )
                            },
                            supportingText = {
                                Text(
                                    text = "Số điện thoại dùng để nhận món và xác thực danh tính.",
                                    fontSize = 11.sp,
                                    color = TextMuted
                                )
                            },
                            shape = RoundedCornerShape(12.dp),
                            modifier = Modifier.fillMaxWidth()
                        )
                    }

                    // Email: chỉ gắn/đổi sau khi xác minh bằng OTP gửi về chính email đó
                    Column {
                        Text(
                            text = "Email",
                            fontWeight = FontWeight.SemiBold,
                            fontSize = 13.sp,
                            color = TextPrimary
                        )
                        Spacer(modifier = Modifier.height(6.dp))
                        OutlinedTextField(
                            value = userProfile?.email ?: "",
                            onValueChange = {},
                            readOnly = true,
                            placeholder = { Text("Chưa thêm email") },
                            leadingIcon = { Icon(Icons.Default.Email, contentDescription = null, tint = TextMuted) },
                            trailingIcon = {
                                TextButton(onClick = { showEmailSheet = true }) {
                                    Text(if (userProfile?.email.isNullOrBlank()) "Thêm" else "Đổi", fontWeight = FontWeight.Bold, color = ForestGreenPrimary)
                                }
                            },
                            supportingText = {
                                Text(
                                    text = "Dùng để nhận mã OTP khi đổi mật khẩu và đăng nhập bằng email.",
                                    fontSize = 11.sp,
                                    color = TextMuted
                                )
                            },
                            shape = RoundedCornerShape(12.dp),
                            modifier = Modifier.fillMaxWidth()
                        )
                    }

                    // Bán kính tìm kiếm deal (R1-009: 0.5 - 10 km)
                    Column {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(
                                    imageVector = Icons.Default.Radar,
                                    contentDescription = null,
                                    tint = ForestGreenPrimary,
                                    modifier = Modifier.size(18.dp)
                                )
                                Spacer(modifier = Modifier.width(6.dp))
                                Text(
                                    text = "Bán kính tìm suất mặc định",
                                    fontWeight = FontWeight.SemiBold,
                                    fontSize = 13.sp,
                                    color = TextPrimary
                                )
                            }
                            Text(
                                text = "%.1f km".format(searchRadiusKm),
                                fontWeight = FontWeight.Bold,
                                fontSize = 14.sp,
                                color = ForestGreenPrimary
                            )
                        }

                        Spacer(modifier = Modifier.height(4.dp))
                        Slider(
                            value = searchRadiusKm,
                            onValueChange = { searchRadiusKm = (it * 10).roundToInt() / 10f },
                            valueRange = 0.5f..10.0f,
                            steps = 18, // mỗi bước 0.5 km
                            colors = SliderDefaults.colors(
                                thumbColor = ForestGreenPrimary,
                                activeTrackColor = ForestGreenPrimary
                            )
                        )
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text("0.5 km", fontSize = 11.sp, color = TextMuted)
                            Text("10.0 km", fontSize = 11.sp, color = TextMuted)
                        }
                    }
                }
            }

            // Báo lỗi nếu có
            val activeError = localErrorMessage ?: uiState.updateProfileError ?: uiState.uploadAvatarError
            if (activeError != null) {
                Spacer(modifier = Modifier.height(16.dp))
                Text(
                    text = activeError,
                    color = CoralRed,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.SemiBold
                )
            }

            Spacer(modifier = Modifier.height(28.dp))

            // Nút Lưu thay đổi
            Button(
                onClick = {
                    localErrorMessage = null
                    viewModel.updateProfile(
                        fullName = fullName,
                        avatarUrl = avatarUrl,
                        searchRadiusKm = searchRadiusKm.toDouble()
                    ) { success, _ ->
                        if (success) {
                            onBackClick()
                        }
                    }
                },
                enabled = isNameValid && !uiState.isUpdatingProfile && !uiState.isUploadingAvatar,
                shape = RoundedCornerShape(12.dp),
                colors = ButtonDefaults.buttonColors(containerColor = ForestGreenPrimary),
                modifier = Modifier
                    .fillMaxWidth()
                    .height(50.dp)
            ) {
                if (uiState.isUpdatingProfile) {
                    CircularProgressIndicator(
                        color = Color.White,
                        strokeWidth = 2.dp,
                        modifier = Modifier.size(20.dp)
                    )
                } else {
                    Icon(imageVector = Icons.Default.Check, contentDescription = null)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "Lưu thay đổi",
                        fontSize = 15.sp,
                        fontWeight = FontWeight.Bold
                    )
                }
            }
        }
    }

    if (showEmailSheet) {
        EmailVerifySheet(
            viewModel = viewModel,
            onDismiss = { showEmailSheet = false }
        )
    }
}

/** Thêm/đổi email: nhập email -> nhận OTP -> nhập mã để xác nhận. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun EmailVerifySheet(viewModel: ProfileViewModel, onDismiss: () -> Unit) {
    var email by remember { mutableStateOf("") }
    var code by remember { mutableStateOf("") }
    var sent by remember { mutableStateOf(false) }
    var busy by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var preview by remember { mutableStateOf<String?>(null) }
    var info by remember { mutableStateOf<String?>(null) }
    val emailValid = android.util.Patterns.EMAIL_ADDRESS.matcher(email.trim()).matches()

    ModalBottomSheet(onDismissRequest = onDismiss) {
        Column(
            Modifier.fillMaxWidth().padding(horizontal = 20.dp).padding(bottom = 28.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Text("Xác minh email", fontWeight = FontWeight.Bold, fontSize = 17.sp)
            OutlinedTextField(
                value = email,
                onValueChange = { email = it; error = null },
                enabled = !sent,
                singleLine = true,
                label = { Text("Email mới") },
                shape = RoundedCornerShape(12.dp),
                modifier = Modifier.fillMaxWidth()
            )
            if (sent) {
                OutlinedTextField(
                    value = code,
                    onValueChange = { code = it.filter(Char::isDigit).take(6); error = null },
                    singleLine = true,
                    label = { Text("Mã OTP 6 số") },
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier.fillMaxWidth()
                )
                info?.let { Text(it, fontSize = 12.sp, color = TextSecondary) }
                preview?.let { Text("Môi trường thử nghiệm: mã là $it (chưa gửi email thật).", fontSize = 12.sp, color = TextSecondary) }
            }
            error?.let { Text(it, color = CoralRed, fontSize = 12.sp, fontWeight = FontWeight.SemiBold) }
            Button(
                onClick = {
                    busy = true; error = null
                    if (!sent) {
                        viewModel.requestEmailOtp(email) { ok, msg, pv ->
                            busy = false
                            if (ok) { sent = true; preview = pv; info = if (pv == null) "Đã gửi mã OTP tới ${email.trim()}. Kiểm tra hộp thư (cả mục Spam)." else null } else error = msg
                        }
                    } else {
                        viewModel.confirmEmail(email, code) { ok, msg ->
                            busy = false
                            if (ok) onDismiss() else error = msg
                        }
                    }
                },
                enabled = !busy && if (sent) code.length == 6 else emailValid,
                shape = RoundedCornerShape(12.dp),
                colors = ButtonDefaults.buttonColors(containerColor = ForestGreenPrimary),
                modifier = Modifier.fillMaxWidth().height(50.dp)
            ) {
                if (busy) CircularProgressIndicator(color = Color.White, strokeWidth = 2.dp, modifier = Modifier.size(20.dp))
                else Text(if (sent) "Xác nhận email" else "Gửi mã OTP", fontWeight = FontWeight.Bold)
            }
        }
    }
}
