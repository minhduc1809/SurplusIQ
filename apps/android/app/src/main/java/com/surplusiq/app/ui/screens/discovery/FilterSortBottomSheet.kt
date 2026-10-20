package com.surplusiq.app.ui.screens.discovery

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.surplusiq.app.ui.theme.*

data class FilterSortOptions(
    val sortBy: String? = null,
    val minDiscountPercent: Int? = null
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FilterSortBottomSheet(
    currentSortBy: String?,
    currentMinDiscount: Int?,
    onDismissRequest: () -> Unit,
    onApply: (sortBy: String?, minDiscount: Int?) -> Unit,
    onReset: () -> Unit
) {
    var selectedSort by remember { mutableStateOf(currentSortBy) }
    var selectedDiscount by remember { mutableStateOf(currentMinDiscount) }

    val sortList = listOf(
        null to "Gần tôi nhất (Mặc định)",
        "price_asc" to "Giá tăng dần",
        "discount_desc" to "% Giảm sâu nhất",
        "closing_soon" to "Sắp hết hạn thu gom"
    )

    val discountList = listOf(
        null to "Tất cả mức giảm",
        20 to "Từ 20% trở lên",
        30 to "Từ 30% trở lên",
        50 to "Từ 50% trở lên",
        70 to "Giảm sốc từ 70%"
    )

    ModalBottomSheet(
        onDismissRequest = onDismissRequest,
        shape = RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp),
        containerColor = MaterialTheme.colorScheme.surface,
        dragHandle = {
            Box(
                modifier = Modifier
                    .padding(vertical = 12.dp)
                    .width(44.dp)
                    .height(4.dp)
                    .clip(RoundedCornerShape(2.dp))
                    .background(DividerColor)
            )
        }
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp)
                .verticalScroll(rememberScrollState())
        ) {
            // Header
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = 16.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Bộ lọc & Sắp xếp",
                    fontSize = 20.sp,
                    fontWeight = FontWeight.Bold,
                    color = TextPrimary
                )
                IconButton(onClick = onDismissRequest) {
                    Icon(
                        imageVector = Icons.Default.Close,
                        contentDescription = "Đóng",
                        tint = TextSecondary
                    )
                }
            }

            // Sắp xếp theo
            Text(
                text = "SẮP XẾP THEO",
                fontSize = 12.sp,
                fontWeight = FontWeight.Bold,
                color = TextSecondary,
                letterSpacing = 0.5.sp
            )
            Spacer(modifier = Modifier.height(10.dp))
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                sortList.forEach { (key, label) ->
                    val isSelected = selectedSort == key
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(12.dp))
                            .background(if (isSelected) ForestGreenPrimary.copy(alpha = 0.08f) else SurfaceSubtle)
                            .border(
                                width = 1.dp,
                                color = if (isSelected) ForestGreenPrimary else DividerColor,
                                shape = RoundedCornerShape(12.dp)
                            )
                            .clickable { selectedSort = key }
                            .padding(horizontal = 16.dp, vertical = 12.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = label,
                            fontSize = 14.sp,
                            fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                            color = if (isSelected) ForestGreenPrimary else TextPrimary
                        )
                        if (isSelected) {
                            Icon(
                                imageVector = Icons.Default.Check,
                                contentDescription = null,
                                tint = ForestGreenPrimary,
                                modifier = Modifier.size(18.dp)
                            )
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(20.dp))

            // Mức giảm giá tối thiểu
            Text(
                text = "MỨC GIẢM GIÁ TỐI THIỂU",
                fontSize = 12.sp,
                fontWeight = FontWeight.Bold,
                color = TextSecondary,
                letterSpacing = 0.5.sp
            )
            Spacer(modifier = Modifier.height(10.dp))
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                discountList.forEach { (pct, label) ->
                    val isSelected = selectedDiscount == pct
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(12.dp))
                            .background(if (isSelected) ForestGreenPrimary.copy(alpha = 0.08f) else SurfaceSubtle)
                            .border(
                                width = 1.dp,
                                color = if (isSelected) ForestGreenPrimary else DividerColor,
                                shape = RoundedCornerShape(12.dp)
                            )
                            .clickable { selectedDiscount = pct }
                            .padding(horizontal = 16.dp, vertical = 12.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = label,
                            fontSize = 14.sp,
                            fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                            color = if (isSelected) ForestGreenPrimary else TextPrimary
                        )
                        if (isSelected) {
                            Icon(
                                imageVector = Icons.Default.Check,
                                contentDescription = null,
                                tint = ForestGreenPrimary,
                                modifier = Modifier.size(18.dp)
                            )
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(28.dp))

            // Buttons (Đặt lại & Áp dụng)
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = 24.dp),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                OutlinedButton(
                    onClick = {
                        selectedSort = null
                        selectedDiscount = null
                        onReset()
                        onDismissRequest()
                    },
                    modifier = Modifier
                        .weight(1f)
                        .height(48.dp),
                    shape = RoundedCornerShape(24.dp),
                    colors = ButtonDefaults.outlinedButtonColors(contentColor = TextSecondary)
                ) {
                    Text("Đặt lại", fontWeight = FontWeight.SemiBold)
                }

                Button(
                    onClick = {
                        onApply(selectedSort, selectedDiscount)
                        onDismissRequest()
                    },
                    modifier = Modifier
                        .weight(1.5f)
                        .height(48.dp),
                    shape = RoundedCornerShape(24.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = ForestGreenPrimary)
                ) {
                    Text("Áp dụng", fontWeight = FontWeight.Bold, color = Color.White)
                }
            }
        }
    }
}
