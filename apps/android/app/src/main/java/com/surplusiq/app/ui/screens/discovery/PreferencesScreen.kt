package com.surplusiq.app.ui.screens.discovery

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Eco
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.surplusiq.app.domain.model.CollectionTimeSlot
import com.surplusiq.app.domain.model.DealCategory
import com.surplusiq.app.domain.model.DietaryType
import com.surplusiq.app.domain.model.UserPreferences
import com.surplusiq.app.ui.theme.CoralRed
import com.surplusiq.app.ui.theme.ForestGreenDark
import com.surplusiq.app.ui.theme.ForestGreenPrimary
import com.surplusiq.app.ui.theme.TextMuted
import com.surplusiq.app.ui.theme.TextPrimary
import com.surplusiq.app.ui.theme.TextSecondary

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PreferencesScreen(
    currentPreferences: UserPreferences,
    onBackClick: () -> Unit,
    onApplyPreferences: (UserPreferences) -> Unit,
    modifier: Modifier = Modifier
) {
    var filterMatchingOnly by remember { mutableStateOf(currentPreferences.filterMatchingOnly) }
    var selectedCategories by remember { mutableStateOf(currentPreferences.categories) }
    var selectedDietary by remember { mutableStateOf(currentPreferences.dietaryPreference) }
    var selectedTimeSlots by remember { mutableStateOf(currentPreferences.collectionTimes) }

    val categoryColors = mapOf(
        DealCategory.MEALS to Color(0xFFFEF9C3),       // Pale Yellow
        DealCategory.BAKED_GOODS to Color(0xFFFFEDD5), // Pale Orange/Peach
        DealCategory.GROCERIES to Color(0xFFDCFCE7),   // Pale Green
        DealCategory.OTHER to Color(0xFFE0F2FE)        // Pale Blue
    )

    Box(
        modifier = modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(bottom = 80.dp)
        ) {
            // Top App Bar
            TopAppBar(
                title = {
                    Text(
                        text = "Preferences",
                        fontWeight = FontWeight.Bold,
                        fontSize = 18.sp
                    )
                },
                navigationIcon = {
                    IconButton(onClick = onBackClick) {
                        Icon(
                            imageVector = Icons.Default.ArrowBack,
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
                    .padding(16.dp)
            ) {
                // Switch: Show Magic Bags matching your preferences
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 8.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "Show Magic Bags matching your preferences",
                        fontSize = 14.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = TextPrimary,
                        modifier = Modifier.weight(1f)
                    )
                    Switch(
                        checked = filterMatchingOnly,
                        onCheckedChange = { filterMatchingOnly = it },
                        colors = SwitchDefaults.colors(
                            checkedThumbColor = Color.White,
                            checkedTrackColor = ForestGreenPrimary
                        )
                    )
                }

                Spacer(modifier = Modifier.height(16.dp))

                // Section 1: Select your preferences below (matching green highlighted container)
                Text(
                    text = "Select your preferences below",
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Bold,
                    color = TextPrimary
                )

                Spacer(modifier = Modifier.height(10.dp))

                Column(
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                    modifier = Modifier
                        .fillMaxWidth()
                        .border(1.5.dp, ForestGreenPrimary.copy(alpha = 0.4f), RoundedCornerShape(14.dp))
                        .padding(10.dp)
                ) {
                    DealCategory.values().forEach { category ->
                        val isChecked = selectedCategories.contains(category)
                        val bgColor = categoryColors[category] ?: Color(0xFFF3F4F6)

                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(64.dp)
                                .clip(RoundedCornerShape(12.dp))
                                .background(bgColor)
                                .clickable {
                                    selectedCategories = if (isChecked) {
                                        if (selectedCategories.size > 1) selectedCategories - category else selectedCategories
                                    } else {
                                        selectedCategories + category
                                    }
                                }
                                .padding(horizontal = 16.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = category.displayName,
                                fontSize = 16.sp,
                                fontWeight = FontWeight.Bold,
                                color = TextPrimary
                            )

                            // Checkmark circle
                            Box(
                                modifier = Modifier
                                    .size(28.dp)
                                    .clip(CircleShape)
                                    .background(if (isChecked) ForestGreenPrimary else Color.White)
                                    .border(1.dp, ForestGreenPrimary, CircleShape),
                                contentAlignment = Alignment.Center
                            ) {
                                if (isChecked) {
                                    Icon(
                                        imageVector = Icons.Default.Check,
                                        contentDescription = "Selected",
                                        tint = Color.White,
                                        modifier = Modifier.size(18.dp)
                                    )
                                }
                            }
                        }
                    }
                }

                Spacer(modifier = Modifier.height(24.dp))

                // Section 2: Dietary preferences
                Text(
                    text = "Dietary preferences",
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Bold,
                    color = TextPrimary
                )

                Spacer(modifier = Modifier.height(10.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    DietaryType.values().forEach { type ->
                        val isSelected = selectedDietary == type
                        Box(
                            modifier = Modifier
                                .clip(RoundedCornerShape(20.dp))
                                .background(if (isSelected) ForestGreenPrimary else Color.Transparent)
                                .border(
                                    1.dp,
                                    if (isSelected) ForestGreenPrimary else MaterialTheme.colorScheme.outline.copy(alpha = 0.5f),
                                    RoundedCornerShape(20.dp)
                                )
                                .clickable { selectedDietary = type }
                                .padding(horizontal = 14.dp, vertical = 10.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                if (type != DietaryType.NONE) {
                                    Icon(
                                        imageVector = Icons.Default.Eco,
                                        contentDescription = null,
                                        tint = if (isSelected) Color.White else ForestGreenPrimary,
                                        modifier = Modifier.size(16.dp)
                                    )
                                    Spacer(modifier = Modifier.width(4.dp))
                                }
                                Text(
                                    text = type.displayName.split(" / ")[0],
                                    fontSize = 13.sp,
                                    fontWeight = FontWeight.SemiBold,
                                    color = if (isSelected) Color.White else TextPrimary
                                )
                            }
                        }
                    }
                }

                Spacer(modifier = Modifier.height(24.dp))

                // Section 3: Preferred collection times (highlighted in red frame in screenshot)
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .border(1.2.dp, CoralRed, RoundedCornerShape(10.dp))
                        .padding(12.dp)
                ) {
                    Column {
                        Text(
                            text = "Preferred collection times",
                            fontSize = 14.sp,
                            fontWeight = FontWeight.Bold,
                            color = TextPrimary
                        )

                        Spacer(modifier = Modifier.height(10.dp))

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            CollectionTimeSlot.values().forEach { slot ->
                                val isSelected = selectedTimeSlots.contains(slot)
                                Box(
                                    modifier = Modifier
                                        .weight(1f)
                                        .clip(RoundedCornerShape(12.dp))
                                        .background(if (isSelected) ForestGreenPrimary else Color.White)
                                        .border(
                                            1.dp,
                                            if (isSelected) ForestGreenPrimary else MaterialTheme.colorScheme.outline.copy(alpha = 0.5f),
                                            RoundedCornerShape(12.dp)
                                        )
                                        .clickable {
                                            selectedTimeSlots = if (isSelected) {
                                                if (selectedTimeSlots.size > 1) selectedTimeSlots - slot else selectedTimeSlots
                                            } else {
                                                selectedTimeSlots + slot
                                            }
                                        }
                                        .padding(vertical = 10.dp, horizontal = 8.dp),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                        Row(verticalAlignment = Alignment.CenterVertically) {
                                            Text(
                                                text = slot.title,
                                                fontSize = 13.sp,
                                                fontWeight = FontWeight.Bold,
                                                color = if (isSelected) Color.White else TextPrimary
                                            )
                                            if (isSelected) {
                                                Spacer(modifier = Modifier.width(4.dp))
                                                Icon(
                                                    imageVector = Icons.Default.Check,
                                                    contentDescription = null,
                                                    tint = Color.White,
                                                    modifier = Modifier.size(14.dp)
                                                )
                                            }
                                        }
                                        Spacer(modifier = Modifier.height(2.dp))
                                        Text(
                                            text = slot.timeRange,
                                            fontSize = 10.sp,
                                            color = if (isSelected) Color.White.copy(alpha = 0.8f) else TextSecondary
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        // Bottom Actions: Reset all & Apply
        Row(
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .fillMaxWidth()
                .background(MaterialTheme.colorScheme.surface)
                .padding(horizontal = 20.dp, vertical = 14.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            TextButton(
                onClick = {
                    filterMatchingOnly = true
                    selectedCategories = DealCategory.values().toSet()
                    selectedDietary = DietaryType.NONE
                    selectedTimeSlots = CollectionTimeSlot.values().toSet()
                }
            ) {
                Text(
                    text = "Reset all",
                    fontSize = 15.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = TextSecondary
                )
            }

            Button(
                onClick = {
                    onApplyPreferences(
                        UserPreferences(
                            filterMatchingOnly = filterMatchingOnly,
                            categories = selectedCategories,
                            dietaryPreference = selectedDietary,
                            collectionTimes = selectedTimeSlots
                        )
                    )
                },
                modifier = Modifier
                    .width(160.dp)
                    .height(48.dp),
                shape = RoundedCornerShape(24.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = ForestGreenPrimary
                )
            ) {
                Text(
                    text = "Apply",
                    fontSize = 15.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.White
                )
            }
        }
    }
}
