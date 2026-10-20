package com.surplusiq.app.ui.screens.profile

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Shield
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.surplusiq.app.ui.theme.SurfaceWhite
import com.surplusiq.app.ui.theme.CoralRed
import com.surplusiq.app.ui.theme.DividerColor
import com.surplusiq.app.ui.theme.ForestGreenPrimary
import com.surplusiq.app.ui.theme.TextMuted
import com.surplusiq.app.ui.theme.TextPrimary
import com.surplusiq.app.ui.theme.TextSecondary
import com.surplusiq.app.ui.viewmodel.ProfileUiState

/**
 * Màn hình Hồ sơ ăn uống & dị ứng (K58 / R1-016)
 *
 * Cho phép khách hàng khai báo:
 * 1. Danh sách các chất/nhóm gây dị ứng thực phẩm nghiêm ngặt (Allergens).
 * 2. Chế độ ăn uống & thực phẩm kiêng (Excluded items).
 * 3. Đồng ý lưu trữ dữ liệu sức khỏe nhạy cảm.
 *
 * Dữ liệu này dùng để cảnh báo tự động trên Chi tiết deal (K13) và Giỏ cứu (KC03).
 */
@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
fun DietaryProfileScreen(
    state: ProfileUiState,
    onBackClick: () -> Unit,
    onSaveProfile: (allergens: List<String>, excludedItems: List<String>) -> Unit,
    onRetryLoad: () -> Unit,
    modifier: Modifier = Modifier
) {
    val commonAllergens = remember {
        listOf("Gluten", "Sữa bò", "Trứng", "Đậu phộng", "Hạt cây", "Hải sản", "Đậu nành", "Mè (Vừng)")
    }

    val commonDiets = remember {
        listOf("Ăn chay", "Thuần chay", "Halal", "Không ăn cay", "Không hành / tỏi", "Không thịt bò", "Không thịt heo")
    }

    var selectedAllergens by remember(state.allergens) {
        mutableStateOf(state.allergens.toSet())
    }

    var selectedExcluded by remember(state.excludedItems) {
        mutableStateOf(state.excludedItems.toSet())
    }

    var customAllergenText by remember { mutableStateOf("") }
    var customExcludedText by remember { mutableStateOf("") }
    var consentGranted by remember { mutableStateOf(true) }
    val snackbarHostState = remember { SnackbarHostState() }

    LaunchedEffect(state.dietarySaveSuccess) {
        if (state.dietarySaveSuccess) {
            snackbarHostState.showSnackbar("Đã lưu hồ sơ ăn uống & dị ứng thành công!")
        }
    }

    LaunchedEffect(state.dietaryError) {
        state.dietaryError?.let { err ->
            snackbarHostState.showSnackbar(err)
        }
    }

    Scaffold(
        snackbarHost = { SnackbarHost(snackbarHostState) },
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        "Hồ sơ ăn uống & dị ứng",
                        fontWeight = FontWeight.Bold,
                        fontSize = 17.sp,
                        color = TextPrimary
                    )
                },
                navigationIcon = {
                    IconButton(onClick = onBackClick) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Quay lại", tint = TextPrimary)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.background
                )
            )
        },
        bottomBar = {
            Surface(
                color = SurfaceWhite,
                tonalElevation = 6.dp,
                border = BorderStroke(1.dp, DividerColor),
                modifier = Modifier.fillMaxWidth()
            ) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp)
                ) {
                    Button(
                        onClick = {
                            if (consentGranted) {
                                onSaveProfile(selectedAllergens.toList(), selectedExcluded.toList())
                            }
                        },
                        enabled = !state.isDietarySaving && consentGranted,
                        shape = RoundedCornerShape(14.dp),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = ForestGreenPrimary,
                            disabledContainerColor = DividerColor
                        ),
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(52.dp)
                    ) {
                        if (state.isDietarySaving) {
                            CircularProgressIndicator(
                                color = Color.White,
                                strokeWidth = 2.dp,
                                modifier = Modifier.size(20.dp)
                            )
                            Spacer(Modifier.width(8.dp))
                            Text("Đang lưu...", fontWeight = FontWeight.SemiBold, fontSize = 15.sp)
                        } else {
                            Text("Lưu hồ sơ ăn uống", fontWeight = FontWeight.Bold, fontSize = 15.sp)
                        }
                    }
                }
            }
        },
        modifier = modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
    ) { paddingValues ->
        if (state.isDietaryLoading) {
            Box(
                contentAlignment = Alignment.Center,
                modifier = Modifier
                    .fillMaxSize()
                    .padding(paddingValues)
            ) {
                CircularProgressIndicator(color = ForestGreenPrimary)
            }
        } else {
            LazyColumn(
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp),
                modifier = Modifier
                    .fillMaxSize()
                    .padding(paddingValues)
            ) {
                // Khối thông tin cảnh báo an toàn thực phẩm
                item {
                    Card(
                        colors = CardDefaults.cardColors(
                            containerColor = Color(0xFFFFF4EC)
                        ),
                        shape = RoundedCornerShape(14.dp),
                        border = BorderStroke(1.dp, Color(0xFFFFD8BF)),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Row(
                            verticalAlignment = Alignment.Top,
                            modifier = Modifier.padding(14.dp)
                        ) {
                            Icon(
                                Icons.Default.Shield,
                                contentDescription = null,
                                tint = ForestGreenPrimary,
                                modifier = Modifier.size(24.dp)
                            )
                            Spacer(Modifier.width(10.dp))
                            Column {
                                Text(
                                    "Bảo vệ an toàn thực phẩm",
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 14.sp,
                                    color = TextPrimary
                                )
                                Spacer(Modifier.height(4.dp))
                                Text(
                                    "Dữ liệu dị ứng được dùng để tự động đối chiếu với thành phần TrustPass của deal. Khi phát hiện món có thể gây dị ứng, hệ thống sẽ cảnh báo nổi bật trước khi bạn đặt mua.",
                                    fontSize = 13.sp,
                                    lineHeight = 18.sp,
                                    color = TextSecondary
                                )
                            }
                        }
                    }
                }

                // 1. NHÓM DỊ ỨNG THỰC PHẨM
                item {
                    Text(
                        "1. Chất & nhóm gây dị ứng (Allergens)",
                        fontWeight = FontWeight.Bold,
                        fontSize = 15.sp,
                        color = TextPrimary
                    )
                    Text(
                        "Chọn các thành phần bạn bị dị ứng nghiêm ngặt:",
                        fontSize = 13.sp,
                        color = TextMuted,
                        modifier = Modifier.padding(top = 2.dp, bottom = 8.dp)
                    )

                    FlowRow(
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        val allAllergensList = (commonAllergens + selectedAllergens).distinct()
                        allAllergensList.forEach { allergen ->
                            val isSelected = selectedAllergens.contains(allergen)
                            FilterChip(
                                selected = isSelected,
                                onClick = {
                                    selectedAllergens = if (isSelected) {
                                        selectedAllergens - allergen
                                    } else {
                                        selectedAllergens + allergen
                                    }
                                },
                                label = {
                                    Text(
                                        allergen,
                                        fontWeight = if (isSelected) FontWeight.SemiBold else FontWeight.Normal,
                                        fontSize = 13.sp
                                    )
                                },
                                leadingIcon = if (isSelected) {
                                    {
                                        Icon(
                                            Icons.Default.Check,
                                            contentDescription = null,
                                            tint = Color.White,
                                            modifier = Modifier.size(16.dp)
                                        )
                                    }
                                } else null,
                                colors = FilterChipDefaults.filterChipColors(
                                    selectedContainerColor = CoralRed,
                                    selectedLabelColor = Color.White,
                                    containerColor = SurfaceWhite,
                                    labelColor = TextPrimary
                                ),
                                border = FilterChipDefaults.filterChipBorder(
                                    enabled = true,
                                    selected = isSelected,
                                    borderColor = DividerColor,
                                    selectedBorderColor = CoralRed
                                ),
                                shape = RoundedCornerShape(10.dp)
                            )
                        }
                    }

                    // Ô thêm dị ứng khác
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(top = 10.dp)
                    ) {
                        OutlinedTextField(
                            value = customAllergenText,
                            onValueChange = { customAllergenText = it },
                            placeholder = { Text("Thêm dị ứng khác...", fontSize = 13.sp, color = TextMuted) },
                            singleLine = true,
                            shape = RoundedCornerShape(10.dp),
                            modifier = Modifier
                                .weight(1f)
                                .height(50.dp)
                        )
                        Spacer(Modifier.width(8.dp))
                        FilledTonalButton(
                            onClick = {
                                val trimmed = customAllergenText.trim()
                                if (trimmed.isNotBlank()) {
                                    selectedAllergens = selectedAllergens + trimmed
                                    customAllergenText = ""
                                }
                            },
                            enabled = customAllergenText.isNotBlank(),
                            shape = RoundedCornerShape(10.dp),
                            modifier = Modifier.height(50.dp)
                        ) {
                            Icon(Icons.Default.Add, contentDescription = "Thêm")
                        }
                    }
                }

                // 2. CHẾ ĐỘ ĂN UỐNG & MÓN KIÊNG
                item {
                    Spacer(Modifier.height(8.dp))
                    Text(
                        "2. Chế độ ăn uống & Thực phẩm kiêng",
                        fontWeight = FontWeight.Bold,
                        fontSize = 15.sp,
                        color = TextPrimary
                    )
                    Text(
                        "Chọn chế độ ăn kiêng hoặc thực phẩm bạn không muốn ăn:",
                        fontSize = 13.sp,
                        color = TextMuted,
                        modifier = Modifier.padding(top = 2.dp, bottom = 8.dp)
                    )

                    FlowRow(
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        val allExcludedList = (commonDiets + selectedExcluded).distinct()
                        allExcludedList.forEach { item ->
                            val isSelected = selectedExcluded.contains(item)
                            FilterChip(
                                selected = isSelected,
                                onClick = {
                                    selectedExcluded = if (isSelected) {
                                        selectedExcluded - item
                                    } else {
                                        selectedExcluded + item
                                    }
                                },
                                label = {
                                    Text(
                                        item,
                                        fontWeight = if (isSelected) FontWeight.SemiBold else FontWeight.Normal,
                                        fontSize = 13.sp
                                    )
                                },
                                leadingIcon = if (isSelected) {
                                    {
                                        Icon(
                                            Icons.Default.Check,
                                            contentDescription = null,
                                            tint = Color.White,
                                            modifier = Modifier.size(16.dp)
                                        )
                                    }
                                } else null,
                                colors = FilterChipDefaults.filterChipColors(
                                    selectedContainerColor = ForestGreenPrimary,
                                    selectedLabelColor = Color.White,
                                    containerColor = SurfaceWhite,
                                    labelColor = TextPrimary
                                ),
                                border = FilterChipDefaults.filterChipBorder(
                                    enabled = true,
                                    selected = isSelected,
                                    borderColor = DividerColor,
                                    selectedBorderColor = ForestGreenPrimary
                                ),
                                shape = RoundedCornerShape(10.dp)
                            )
                        }
                    }

                    // Ô thêm món kiêng khác
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(top = 10.dp)
                    ) {
                        OutlinedTextField(
                            value = customExcludedText,
                            onValueChange = { customExcludedText = it },
                            placeholder = { Text("Thêm món/nguyên liệu kiêng...", fontSize = 13.sp, color = TextMuted) },
                            singleLine = true,
                            shape = RoundedCornerShape(10.dp),
                            modifier = Modifier
                                .weight(1f)
                                .height(50.dp)
                        )
                        Spacer(Modifier.width(8.dp))
                        FilledTonalButton(
                            onClick = {
                                val trimmed = customExcludedText.trim()
                                if (trimmed.isNotBlank()) {
                                    selectedExcluded = selectedExcluded + trimmed
                                    customExcludedText = ""
                                }
                            },
                            enabled = customExcludedText.isNotBlank(),
                            shape = RoundedCornerShape(10.dp),
                            modifier = Modifier.height(50.dp)
                        ) {
                            Icon(Icons.Default.Add, contentDescription = "Thêm")
                        }
                    }
                }

                // 3. ĐỒNG Ý LƯU TRỮ DỮ LIỆU SỨC KHỎE
                item {
                    Spacer(Modifier.height(8.dp))
                    Card(
                        colors = CardDefaults.cardColors(containerColor = SurfaceWhite),
                        shape = RoundedCornerShape(14.dp),
                        border = BorderStroke(1.dp, DividerColor),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(14.dp)
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    "Đồng ý lưu dữ liệu ăn uống",
                                    fontWeight = FontWeight.SemiBold,
                                    fontSize = 14.sp,
                                    color = TextPrimary
                                )
                                Spacer(Modifier.height(2.dp))
                                Text(
                                    "Thông tin này thuộc dữ liệu sức khỏe nhạy cảm, chỉ dùng để đối chiếu an toàn thực phẩm trên ứng dụng SurplusIQ.",
                                    fontSize = 12.sp,
                                    lineHeight = 16.sp,
                                    color = TextMuted
                                )
                            }
                            Spacer(Modifier.width(12.dp))
                            Switch(
                                checked = consentGranted,
                                onCheckedChange = { consentGranted = it },
                                colors = SwitchDefaults.colors(
                                    checkedThumbColor = Color.White,
                                    checkedTrackColor = ForestGreenPrimary
                                )
                            )
                        }
                    }
                }

                item {
                    Spacer(Modifier.height(20.dp))
                }
            }
        }
    }
}
