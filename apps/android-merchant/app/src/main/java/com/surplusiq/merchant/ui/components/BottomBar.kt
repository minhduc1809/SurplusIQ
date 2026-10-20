package com.surplusiq.merchant.ui.components

import androidx.compose.foundation.border
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

/** Một mục của thanh điều hướng: icon đặc khi chọn, icon viền khi chưa chọn. */
data class BottomBarItem(val key: String, val label: String, val selectedIcon: ImageVector, val icon: ImageVector)

/**
 * Thanh điều hướng đáy: nền trắng bo góc trên lớn, nút hành động chính nổi giữa có viền trắng.
 * [items] chia đôi hai bên [center]; [center] = null thì dàn đều.
 */
@Composable
fun SqBottomBar(
    items: List<BottomBarItem>,
    selectedKey: String?,
    onSelect: (String) -> Unit,
    accent: Color,
    inactive: Color,
    modifier: Modifier = Modifier,
    center: BottomBarItem? = null,
    onCenterClick: () -> Unit = {}
) {
    val shape = RoundedCornerShape(32.dp)
    val half = items.size / 2
    Box(modifier = modifier.fillMaxWidth().navigationBarsPadding().padding(start = 14.dp, end = 14.dp, bottom = 10.dp, top = 22.dp)) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .shadow(14.dp, shape, ambientColor = Color(0x403B2A22), spotColor = Color(0x403B2A22))
                .clip(shape)
                .background(Color.White)
                .border(1.dp, Color(0xFFF0E7E1), shape)
                .padding(horizontal = 6.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            items.forEachIndexed { i, item ->
                if (center != null && i == half) Spacer(Modifier.weight(0.9f))
                BarItem(item, item.key == selectedKey, accent, inactive, Modifier.weight(1f)) { onSelect(item.key) }
            }
        }
        if (center != null) {
            Box(
                modifier = Modifier
                    .align(Alignment.TopCenter)
                    .offset(y = (-26).dp)
                    .size(66.dp)
                    .shadow(12.dp, CircleShape, ambientColor = accent.copy(alpha = 0.45f), spotColor = accent.copy(alpha = 0.45f))
                    .clip(CircleShape)
                    .background(Color.White)
                    .padding(5.dp)
                    .clip(CircleShape)
                    .background(accent)
                    .clickable(onClick = onCenterClick)
                    .semantics { contentDescription = center.label },
                contentAlignment = Alignment.Center
            ) {
                Icon(center.icon, contentDescription = null, tint = Color.White, modifier = Modifier.size(30.dp))
            }
        }
    }
}

@Composable
private fun BarItem(item: BottomBarItem, selected: Boolean, accent: Color, inactive: Color, modifier: Modifier, onClick: () -> Unit) {
    val color = if (selected) accent else inactive
    Column(
        modifier = modifier
            .clip(RoundedCornerShape(20.dp))
            .background(if (selected) accent.copy(alpha = 0.12f) else Color.Transparent)
            .clickable(interactionSource = remember { MutableInteractionSource() }, indication = null, onClick = onClick)
            .padding(vertical = 6.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Icon(if (selected) item.selectedIcon else item.icon, contentDescription = null, tint = color, modifier = Modifier.size(24.dp))
        Spacer(Modifier.height(2.dp))
        Text(item.label, fontSize = 11.sp, fontWeight = if (selected) FontWeight.Bold else FontWeight.Medium, color = color, maxLines = 1)
    }
}
