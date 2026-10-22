package com.surplusiq.app.ui.screens.basket

import androidx.compose.foundation.background
import com.surplusiq.app.ui.components.SqCard
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Eco
import androidx.compose.material.icons.filled.Remove
import androidx.compose.material.icons.filled.Add
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.surplusiq.app.domain.model.BasketSuggestion
import com.surplusiq.app.ui.theme.CoralRed
import com.surplusiq.app.ui.theme.DividerColor
import com.surplusiq.app.ui.theme.ForestGreenDark
import com.surplusiq.app.ui.theme.ForestGreenPrimary
import com.surplusiq.app.ui.theme.LilacAccent
import com.surplusiq.app.ui.theme.LilacWash
import com.surplusiq.app.ui.theme.MintDeep
import com.surplusiq.app.ui.theme.SkyBlueContainer
import com.surplusiq.app.ui.theme.SkyBlueIce
import com.surplusiq.app.ui.theme.SkyBlueLight
import com.surplusiq.app.ui.theme.SurfaceSubtle
import com.surplusiq.app.ui.theme.TextMuted
import com.surplusiq.app.ui.theme.TextPrimary
import com.surplusiq.app.ui.theme.TextSecondary
import java.text.NumberFormat
import java.util.Locale

private val BudgetPresets = listOf(50_000, 100_000, 150_000, 200_000)

private fun vnd(value: Number): String = NumberFormat.getInstance(Locale("vi", "VN")).format(value) + "đ"

/** Giỏ cứu tự động (CM-C01): gợi ý tổ hợp suất theo ngân sách và số người ăn; chỉ tính toán, không giữ tồn hay tạo đơn. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RescueBasketScreen(
    suggestions: List<BasketSuggestion>,
    isLoading: Boolean,
    errorMessage: String?,
    onBackClick: () -> Unit,
    onSuggest: (budgetMax: Double, peopleCount: Int) -> Unit,
    onSelectBasket: (BasketSuggestion) -> Unit = {},
    modifier: Modifier = Modifier
) {
    var budgetText by remember { mutableStateOf("100000") }
    var people by remember { mutableIntStateOf(2) }
    var selected by remember { mutableIntStateOf(0) }
    val budget = budgetText.toLongOrNull() ?: 0L
    val chosen = suggestions.getOrNull(selected)

    Scaffold(
        modifier = modifier.fillMaxSize(),
        containerColor = MaterialTheme.colorScheme.background,
        topBar = {
            Row(
                Modifier.fillMaxWidth().statusBarsPadding().padding(horizontal = 12.dp, vertical = 8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                IconButton(
                    onClick = onBackClick,
                    modifier = Modifier.size(40.dp).clip(CircleShape).background(MaterialTheme.colorScheme.surface)
                ) { Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Quay lại") }
                Column(Modifier.weight(1f).padding(horizontal = 12.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text("Giỏ cứu tự động", fontWeight = FontWeight.ExtraBold, fontSize = 17.sp, color = TextPrimary)
                        Spacer(Modifier.width(6.dp))
                        Row(
                            Modifier.clip(RoundedCornerShape(50)).background(LilacWash).padding(horizontal = 8.dp, vertical = 2.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(Icons.Default.AutoAwesome, contentDescription = null, tint = LilacAccent, modifier = Modifier.size(11.dp))
                            Spacer(Modifier.width(3.dp))
                            Text("AI Smart", fontSize = 10.sp, fontWeight = FontWeight.Bold, color = LilacAccent)
                        }
                    }
                    Text("Rescue Basket • SurplusIQ", fontSize = 11.sp, color = TextSecondary)
                }
                Spacer(Modifier.size(40.dp))
            }
        },
        bottomBar = {
            if (chosen != null) {
                Surface(shadowElevation = 10.dp, color = MaterialTheme.colorScheme.surface) {
                    Row(
                        Modifier.fillMaxWidth().navigationBarsPadding().padding(horizontal = 16.dp, vertical = 12.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column(Modifier.weight(1f)) {
                            Text("Tổng thanh toán", fontSize = 11.sp, color = TextSecondary)
                            Text(vnd(chosen.estimatedTotal), fontSize = 20.sp, fontWeight = FontWeight.ExtraBold, color = TextPrimary)
                            Text(
                                if (chosen.withinBudget) "Trong ngân sách ${vnd(budget)}" else "Vượt ngân sách ${vnd(budget)}",
                                fontSize = 11.sp,
                                color = if (chosen.withinBudget) MintDeep else CoralRed
                            )
                        }
                        Row(
                            Modifier
                                .clip(RoundedCornerShape(16.dp))
                                .background(Brush.horizontalGradient(listOf(SkyBlueLight, ForestGreenPrimary)))
                                .clickable { onSelectBasket(chosen) }
                                .padding(horizontal = 18.dp, vertical = 14.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text("Xem & Tùy chỉnh giỏ này", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                            Icon(Icons.AutoMirrored.Filled.KeyboardArrowRight, contentDescription = null, tint = Color.White)
                        }
                    }
                }
            }
        }
    ) { inner ->
        Column(
            Modifier
                .padding(inner)
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 16.dp, vertical = 8.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            // Giới thiệu
            Row(
                Modifier.fillMaxWidth().clip(RoundedCornerShape(18.dp)).background(SkyBlueIce).padding(14.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Box(Modifier.size(40.dp).clip(RoundedCornerShape(12.dp)).background(Color.White.copy(alpha = 0.7f)), contentAlignment = Alignment.Center) {
                    Icon(Icons.Default.Eco, contentDescription = null, tint = MintDeep)
                }
                Spacer(Modifier.width(12.dp))
                Column {
                    Text("Tiết kiệm chi phí bữa ăn", fontWeight = FontWeight.ExtraBold, fontSize = 14.sp, color = MintDeep)
                    Text("Giải cứu thực phẩm ngon, chọn tổ hợp suất vừa ngân sách của bạn.", fontSize = 12.sp, color = TextSecondary, lineHeight = 16.sp)
                }
            }

            // Ngân sách + số người
            SqCard(
                shape = RoundedCornerShape(22.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(Modifier.padding(16.dp)) {
                    Text("NGÂN SÁCH TỐI ĐA CỦA BẠN", fontSize = 11.sp, fontWeight = FontWeight.ExtraBold, color = TextSecondary, letterSpacing = 0.6.sp)
                    Spacer(Modifier.height(10.dp))
                    Row(
                        Modifier
                            .fillMaxWidth()
                            .height(56.dp)
                            .clip(RoundedCornerShape(16.dp))
                            .background(SurfaceSubtle)
                            .border(1.5.dp, ForestGreenPrimary.copy(alpha = 0.6f), RoundedCornerShape(16.dp))
                            .padding(horizontal = 16.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text("₫", fontSize = 20.sp, fontWeight = FontWeight.Bold, color = TextSecondary)
                        Spacer(Modifier.width(10.dp))
                        BasicTextField(
                            value = budgetText,
                            onValueChange = { budgetText = it.filter { c -> c.isDigit() }.take(9) },
                            singleLine = true,
                            textStyle = TextStyle(fontSize = 20.sp, fontWeight = FontWeight.ExtraBold, color = TextPrimary),
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                            cursorBrush = SolidColor(ForestGreenPrimary),
                            modifier = Modifier.weight(1f)
                        )
                        Text("VND", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = TextMuted)
                    }
                    Spacer(Modifier.height(10.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        BudgetPresets.forEach { p ->
                            val on = budget == p.toLong()
                            Box(
                                Modifier
                                    .weight(1f)
                                    .clip(RoundedCornerShape(12.dp))
                                    .background(if (on) ForestGreenPrimary else SurfaceSubtle)
                                    .clickable { budgetText = p.toString() }
                                    .padding(vertical = 10.dp),
                                contentAlignment = Alignment.Center
                            ) {
                                Text(vnd(p), fontSize = 12.sp, fontWeight = FontWeight.Bold, color = if (on) Color.White else TextPrimary, maxLines = 1)
                            }
                        }
                    }

                    Spacer(Modifier.height(18.dp))
                    HorizontalDivider(color = DividerColor)
                    Spacer(Modifier.height(14.dp))

                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Column(Modifier.weight(1f)) {
                            Text("SỐ NGƯỜI ĂN", fontSize = 11.sp, fontWeight = FontWeight.ExtraBold, color = TextSecondary, letterSpacing = 0.6.sp)
                            Text("Khẩu phần vừa đủ, tránh lãng phí", fontSize = 12.sp, color = TextSecondary)
                        }
                        StepperButton(Icons.Default.Remove, "Giảm số người", enabled = people > 1) { people-- }
                        Text("$people người", fontSize = 15.sp, fontWeight = FontWeight.ExtraBold, color = TextPrimary, modifier = Modifier.padding(horizontal = 12.dp))
                        StepperButton(Icons.Default.Add, "Tăng số người", enabled = people < 20) { people++ }
                    }

                    Spacer(Modifier.height(16.dp))
                    val canSuggest = budget > 0 && !isLoading
                    Row(
                        Modifier
                            .fillMaxWidth()
                            .height(54.dp)
                            .clip(RoundedCornerShape(16.dp))
                            .background(
                                if (canSuggest) Brush.horizontalGradient(listOf(SkyBlueLight, ForestGreenPrimary))
                                else SolidColor(ForestGreenPrimary.copy(alpha = 0.4f))
                            )
                            .clickable(enabled = canSuggest) {
                                selected = 0
                                onSuggest(budget.toDouble(), people)
                            },
                        horizontalArrangement = Arrangement.Center,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        if (isLoading) {
                            CircularProgressIndicator(Modifier.size(22.dp), strokeWidth = 2.5.dp, color = Color.White)
                        } else {
                            Icon(Icons.Default.AutoAwesome, contentDescription = null, tint = Color.White, modifier = Modifier.size(18.dp))
                            Spacer(Modifier.width(8.dp))
                            Text("Gợi ý giỏ món tối ưu", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 15.sp)
                        }
                    }
                }
            }

            // Kết quả
            when {
                errorMessage != null -> Text(errorMessage, color = CoralRed, fontSize = 13.sp)
                suggestions.isEmpty() && !isLoading -> Text(
                    "Nhập ngân sách và số người, rồi bấm \"Gợi ý giỏ món tối ưu\" để xem tổ hợp suất phù hợp quanh bạn.",
                    color = TextSecondary,
                    fontSize = 13.sp,
                    lineHeight = 18.sp
                )
                suggestions.isNotEmpty() -> {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(Modifier.size(8.dp).clip(CircleShape).background(MintDeep))
                        Spacer(Modifier.width(8.dp))
                        Text("GỢI Ý DÀNH RIÊNG CHO BẠN", fontSize = 11.sp, fontWeight = FontWeight.ExtraBold, color = TextSecondary, letterSpacing = 0.6.sp)
                    }
                    suggestions.forEachIndexed { index, basket ->
                        BasketCard(
                            basket = basket,
                            people = people,
                            budget = budget,
                            isBest = index == 0,
                            isSelected = index == selected,
                            onPick = { selected = index }
                        )
                    }
                    Spacer(Modifier.height(8.dp))
                }
            }
        }
    }
}

@Composable
private fun StepperButton(icon: androidx.compose.ui.graphics.vector.ImageVector, desc: String, enabled: Boolean, onClick: () -> Unit) {
    Box(
        Modifier
            .size(36.dp)
            .clip(CircleShape)
            .background(if (enabled) SkyBlueContainer else SurfaceSubtle)
            .clickable(enabled = enabled, onClick = onClick),
        contentAlignment = Alignment.Center
    ) { Icon(icon, contentDescription = desc, tint = if (enabled) ForestGreenDark else TextMuted, modifier = Modifier.size(18.dp)) }
}

@Composable
private fun BasketCard(
    basket: BasketSuggestion,
    people: Int,
    budget: Long,
    isBest: Boolean,
    isSelected: Boolean,
    onPick: () -> Unit
) {
    SqCard(
        shape = RoundedCornerShape(22.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = if (isSelected) 4.dp else 1.dp),
        modifier = Modifier
            .fillMaxWidth()
            .border(if (isSelected) 1.5.dp else 0.dp, if (isSelected) ForestGreenPrimary else Color.Transparent, RoundedCornerShape(22.dp))
            .clickable(onClick = onPick)
    ) {
        Column(Modifier.fillMaxWidth().padding(16.dp)) {
            Row(verticalAlignment = Alignment.Top) {
                Column(Modifier.weight(1f)) {
                    if (isBest) {
                        Row(
                            Modifier.clip(RoundedCornerShape(50)).background(SkyBlueContainer).padding(horizontal = 10.dp, vertical = 3.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) { Text("Combo tối ưu nhất", fontSize = 11.sp, fontWeight = FontWeight.ExtraBold, color = ForestGreenDark) }
                        Spacer(Modifier.height(8.dp))
                    }
                    Text(basket.storeName, fontWeight = FontWeight.ExtraBold, fontSize = 16.sp, color = TextPrimary)
                }
            }

            Spacer(Modifier.height(10.dp))
            Text("MÓN TRONG GIỎ", fontSize = 10.sp, fontWeight = FontWeight.ExtraBold, color = TextMuted, letterSpacing = 0.6.sp)
            Spacer(Modifier.height(6.dp))
            basket.items.forEachIndexed { i, item ->
                Row(Modifier.fillMaxWidth().padding(vertical = 5.dp), verticalAlignment = Alignment.CenterVertically) {
                    Box(Modifier.size(22.dp).clip(CircleShape).background(SkyBlueContainer), contentAlignment = Alignment.Center) {
                        Text("${i + 1}", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = ForestGreenDark)
                    }
                    Spacer(Modifier.width(10.dp))
                    Text(item.title, fontSize = 13.sp, color = TextPrimary, modifier = Modifier.weight(1f))
                    Text(vnd(item.price), fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = TextSecondary)
                }
            }

            Spacer(Modifier.height(8.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                StatusPill(if (basket.meetsPeopleCount) "Đủ khẩu phần cho $people người" else "Chưa đủ khẩu phần cho $people người", basket.meetsPeopleCount)
                StatusPill(if (basket.withinBudget) "Trong ngân sách" else "Vượt ngân sách", basket.withinBudget)
            }

            if (basket.rankingReasons.isNotEmpty()) {
                Spacer(Modifier.height(10.dp))
                basket.rankingReasons.forEach { reason ->
                    Text("• $reason", fontSize = 11.sp, color = TextSecondary, lineHeight = 15.sp)
                }
            }

            Spacer(Modifier.height(10.dp))
            HorizontalDivider(color = DividerColor)
            Spacer(Modifier.height(10.dp))
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Text("Giá combo", fontSize = 13.sp, color = TextSecondary)
                Text(vnd(basket.estimatedTotal), fontSize = 18.sp, fontWeight = FontWeight.ExtraBold, color = ForestGreenDark)
            }
        }
    }
}

@Composable
private fun StatusPill(text: String, ok: Boolean) {
    Row(
        Modifier.clip(RoundedCornerShape(50)).background(if (ok) SkyBlueIce else CoralRed.copy(alpha = 0.12f)).padding(horizontal = 10.dp, vertical = 4.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        if (ok) {
            Icon(Icons.Default.Check, contentDescription = null, tint = MintDeep, modifier = Modifier.size(12.dp))
            Spacer(Modifier.width(3.dp))
        }
        Text(text, fontSize = 10.sp, fontWeight = FontWeight.Bold, color = if (ok) MintDeep else CoralRed)
    }
}
