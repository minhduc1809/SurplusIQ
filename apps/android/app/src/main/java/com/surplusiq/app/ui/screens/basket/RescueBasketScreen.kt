package com.surplusiq.app.ui.screens.basket

import androidx.compose.foundation.background
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
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Remove
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
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
import com.surplusiq.app.ui.theme.SkyBluePrimary
import com.surplusiq.app.ui.theme.SurfaceSubtle
import com.surplusiq.app.ui.theme.TextMuted
import com.surplusiq.app.ui.theme.TextPrimary
import com.surplusiq.app.ui.theme.TextSecondary

private val BudgetPresets = listOf(50_000, 100_000, 150_000, 200_000)

/**
 * Giỏ cứu tự động (CM-C01): gợi ý tổ hợp suất theo ngân sách và số người ăn; chỉ tính toán, không giữ tồn hay tạo đơn.
 * Điện thoại: một cột cuộn. Từ 840dp: cột trái là biểu mẫu, cột phải là kết quả gợi ý.
 */
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

    BasketFrame(
        title = "Giỏ cứu tự động",
        subtitle = "Chọn ngân sách và số người ăn",
        onBack = onBackClick,
        modifier = modifier,
        bottomBar = chosen?.let { c ->
            {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Column(Modifier.weight(1f).padding(end = 12.dp)) {
                        Text("Tổng thanh toán", fontSize = 11.sp, color = TextSecondary)
                        Text(vnd(c.estimatedTotal), fontSize = 20.sp, fontWeight = FontWeight.ExtraBold, color = TextPrimary, maxLines = 1)
                        Text(
                            if (c.withinBudget) "Trong ngân sách ${vnd(budget)}" else "Vượt ngân sách ${vnd(budget)}",
                            fontSize = 11.sp,
                            color = if (c.withinBudget) TextSecondary else CoralRed
                        )
                    }
                    PrimaryAction("Xem và chỉnh giỏ", onClick = { onSelectBasket(c) })
                }
            }
        }
    ) { inner ->
        BoxWithConstraints(Modifier.padding(inner).fillMaxSize(), contentAlignment = Alignment.TopCenter) {
            val wide = maxWidth >= WIDE_BREAKPOINT
            val form: @Composable ColumnScope.() -> Unit = {
                BudgetAndPeopleCard(
                    budgetText = budgetText,
                    onBudgetChange = { budgetText = it },
                    budget = budget,
                    people = people,
                    onPeopleChange = { people = it },
                    isLoading = isLoading,
                    onSuggest = { selected = 0; onSuggest(budget.toDouble(), people) }
                )
            }
            val results: @Composable ColumnScope.() -> Unit = {
                when {
                    errorMessage != null -> Text(errorMessage, color = CoralRed, fontSize = 13.sp)
                    suggestions.isEmpty() && !isLoading ->
                        MutedText("Nhập ngân sách và số người rồi bấm \"Gợi ý giỏ món\".")
                    suggestions.isNotEmpty() -> {
                        SectionLabel("Gợi ý cho bạn")
                        suggestions.forEachIndexed { index, basket ->
                            BasketOptionCard(
                                basket = basket,
                                people = people,
                                isBest = index == 0,
                                isSelected = index == selected,
                                onPick = { selected = index }
                            )
                        }
                    }
                }
            }
            if (wide) {
                Row(
                    Modifier.widthIn(max = WIDE_MAX_WIDTH).fillMaxSize().padding(horizontal = 16.dp, vertical = 8.dp),
                    horizontalArrangement = Arrangement.spacedBy(20.dp)
                ) {
                    Column(Modifier.weight(0.42f).verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(14.dp), content = form)
                    Column(Modifier.weight(0.58f).verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(14.dp), content = results)
                }
            } else {
                Column(
                    Modifier.widthIn(max = CONTENT_MAX_WIDTH).fillMaxSize().verticalScroll(rememberScrollState()).padding(horizontal = 16.dp, vertical = 8.dp),
                    verticalArrangement = Arrangement.spacedBy(14.dp)
                ) {
                    form()
                    results()
                    Spacer(Modifier.height(8.dp))
                }
            }
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun BudgetAndPeopleCard(
    budgetText: String,
    onBudgetChange: (String) -> Unit,
    budget: Long,
    people: Int,
    onPeopleChange: (Int) -> Unit,
    isLoading: Boolean,
    onSuggest: () -> Unit
) {
    BasketCardBox {
        SectionLabel("Ngân sách tối đa")
        Spacer(Modifier.height(10.dp))
        Row(
            Modifier.fillMaxWidth().heightIn(min = 56.dp).clip(RoundedCornerShape(16.dp)).background(SurfaceSubtle)
                .border(1.5.dp, SkyBluePrimary.copy(alpha = 0.6f), RoundedCornerShape(16.dp)).padding(horizontal = 16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text("₫", fontSize = 20.sp, fontWeight = FontWeight.Bold, color = TextSecondary)
            Spacer(Modifier.width(10.dp))
            BasicTextField(
                value = budgetText,
                onValueChange = { onBudgetChange(it.filter { c -> c.isDigit() }.take(9)) },
                singleLine = true,
                textStyle = TextStyle(fontSize = 20.sp, fontWeight = FontWeight.ExtraBold, color = TextPrimary),
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                cursorBrush = SolidColor(SkyBluePrimary),
                modifier = Modifier.weight(1f)
            )
            Text("VND", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = TextMuted)
        }
        Spacer(Modifier.height(10.dp))
        FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            BudgetPresets.forEach { p ->
                val on = budget == p.toLong()
                Text(
                    vnd(p),
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Bold,
                    color = if (on) Color.White else TextPrimary,
                    maxLines = 1,
                    modifier = Modifier.clip(RoundedCornerShape(12.dp)).background(if (on) SkyBluePrimary else SurfaceSubtle)
                        .clickable { onBudgetChange(p.toString()) }.padding(horizontal = 14.dp, vertical = 10.dp)
                )
            }
        }

        Spacer(Modifier.height(16.dp))
        HorizontalDivider(color = DividerColor)
        Spacer(Modifier.height(14.dp))

        Row(verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f).padding(end = 8.dp)) {
                SectionLabel("Số người ăn")
                Text("Khẩu phần vừa đủ, tránh lãng phí", fontSize = 12.sp, color = TextSecondary)
            }
            Stepper(Icons.Default.Remove, "Giảm số người", enabled = people > 1) { onPeopleChange(people - 1) }
            Text("$people", fontSize = 18.sp, fontWeight = FontWeight.ExtraBold, color = TextPrimary, modifier = Modifier.widthIn(min = 40.dp), textAlign = androidx.compose.ui.text.style.TextAlign.Center)
            Stepper(Icons.Default.Add, "Tăng số người", enabled = people < 20) { onPeopleChange(people + 1) }
        }

        Spacer(Modifier.height(18.dp))
        PrimaryAction("Gợi ý giỏ món", enabled = budget > 0, loading = isLoading, modifier = Modifier.fillMaxWidth(), onClick = onSuggest)
    }
}

@Composable
private fun Stepper(icon: androidx.compose.ui.graphics.vector.ImageVector, desc: String, enabled: Boolean, onClick: () -> Unit) {
    Box(
        Modifier.size(40.dp).clip(CircleShape).background(if (enabled) CoralWash else SurfaceSubtle).clickable(enabled = enabled, onClick = onClick),
        contentAlignment = Alignment.Center
    ) { Icon(icon, contentDescription = desc, tint = if (enabled) SkyBluePrimary else TextMuted, modifier = Modifier.size(20.dp)) }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun BasketOptionCard(basket: BasketSuggestion, people: Int, isBest: Boolean, isSelected: Boolean, onPick: () -> Unit) {
    Column(
        Modifier.fillMaxWidth().clip(RoundedCornerShape(20.dp)).background(MaterialTheme.colorScheme.surface)
            .border(if (isSelected) 1.5.dp else 1.dp, if (isSelected) SkyBluePrimary else DividerColor, RoundedCornerShape(20.dp))
            .clickable(onClick = onPick).padding(16.dp)
    ) {
        Row(verticalAlignment = Alignment.Top) {
            Column(Modifier.weight(1f)) {
                if (isBest) {
                    Pill("Phù hợp nhất", CoralWash, SkyBluePrimary)
                    Spacer(Modifier.height(8.dp))
                }
                Text(basket.storeName, fontWeight = FontWeight.ExtraBold, fontSize = 16.sp, color = TextPrimary)
            }
            if (isSelected) Box(Modifier.size(24.dp).clip(CircleShape).background(SkyBluePrimary), contentAlignment = Alignment.Center) {
                Icon(Icons.Default.Check, contentDescription = "Đang chọn", tint = Color.White, modifier = Modifier.size(15.dp))
            }
        }

        Spacer(Modifier.height(12.dp))
        SectionLabel("Món trong giỏ")
        Spacer(Modifier.height(6.dp))
        basket.items.forEachIndexed { i, item ->
            Row(Modifier.fillMaxWidth().padding(vertical = 5.dp), verticalAlignment = Alignment.CenterVertically) {
                Box(Modifier.size(22.dp).clip(CircleShape).background(SurfaceSubtle), contentAlignment = Alignment.Center) {
                    Text("${i + 1}", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = TextSecondary)
                }
                Spacer(Modifier.width(10.dp))
                Text(item.title, fontSize = 13.sp, color = TextPrimary, modifier = Modifier.weight(1f).padding(end = 8.dp))
                Text(vnd(item.price), fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = TextSecondary, maxLines = 1)
            }
        }

        Spacer(Modifier.height(8.dp))
        FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            if (basket.meetsPeopleCount) Pill("Đủ cho $people người") else Pill("Chưa đủ cho $people người", CoralRed.copy(alpha = 0.12f), CoralRed)
            if (basket.withinBudget) Pill("Trong ngân sách") else Pill("Vượt ngân sách", CoralRed.copy(alpha = 0.12f), CoralRed)
        }
        basket.rankingReasons.forEach { reason ->
            Text("• $reason", fontSize = 12.sp, color = TextSecondary, lineHeight = 16.sp, modifier = Modifier.padding(top = 6.dp))
        }

        Spacer(Modifier.height(12.dp))
        HorizontalDivider(color = DividerColor)
        Spacer(Modifier.height(10.dp))
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
            Text("Giá giỏ", fontSize = 13.sp, color = TextSecondary)
            Text(vnd(basket.estimatedTotal), fontSize = 18.sp, fontWeight = FontWeight.ExtraBold, color = TextPrimary)
        }
    }
}
