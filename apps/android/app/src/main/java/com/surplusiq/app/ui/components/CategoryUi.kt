package com.surplusiq.app.ui.components

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.BakeryDining
import androidx.compose.material.icons.filled.Cake
import androidx.compose.material.icons.filled.Category
import androidx.compose.material.icons.filled.Eco
import androidx.compose.material.icons.filled.Fastfood
import androidx.compose.material.icons.filled.KebabDining
import androidx.compose.material.icons.filled.LocalCafe
import androidx.compose.material.icons.filled.LocalGroceryStore
import androidx.compose.material.icons.filled.RamenDining
import androidx.compose.material.icons.filled.RiceBowl
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import com.surplusiq.app.domain.model.DealCategory

/** Biểu tượng và màu nhấn của từng nhóm món, dùng chung cho trang chủ và bản đồ. */
fun DealCategory.icon(): ImageVector = when (this) {
    DealCategory.RICE -> Icons.Default.RiceBowl
    DealCategory.NOODLE -> Icons.Default.RamenDining
    DealCategory.BREAD -> Icons.Default.BakeryDining
    DealCategory.FASTFOOD -> Icons.Default.Fastfood
    DealCategory.SNACK -> Icons.Default.KebabDining
    DealCategory.HEALTHY -> Icons.Default.Eco
    DealCategory.SWEET -> Icons.Default.Cake
    DealCategory.DRINK -> Icons.Default.LocalCafe
    DealCategory.PRODUCE -> Icons.Default.LocalGroceryStore
    DealCategory.OTHER -> Icons.Default.Category
}

fun DealCategory.accent(): Color = when (this) {
    DealCategory.RICE -> Color(0xFFF59E0B)
    DealCategory.NOODLE -> Color(0xFFEF6C00)
    DealCategory.BREAD -> Color(0xFFB7791F)
    DealCategory.FASTFOOD -> Color(0xFFE53935)
    DealCategory.SNACK -> Color(0xFF8D6E63)
    DealCategory.HEALTHY -> Color(0xFF43A047)
    DealCategory.SWEET -> Color(0xFFEC407A)
    DealCategory.DRINK -> Color(0xFF1E88E5)
    DealCategory.PRODUCE -> Color(0xFF7CB342)
    DealCategory.OTHER -> Color(0xFF78909C)
}
