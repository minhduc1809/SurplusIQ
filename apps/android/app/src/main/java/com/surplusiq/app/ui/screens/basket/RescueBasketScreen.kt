package com.surplusiq.app.ui.screens.basket

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.surplusiq.app.domain.model.BasketSuggestion
import com.surplusiq.app.ui.theme.CoralRed
import com.surplusiq.app.ui.theme.ForestGreenPrimary
import com.surplusiq.app.ui.theme.TextMuted
import com.surplusiq.app.ui.theme.TextPrimary
import com.surplusiq.app.ui.theme.TextSecondary

/** Rescue Basket (CM-C01): gợi ý tổ hợp suất theo ngân sách/số người - không giữ tồn, không tạo đơn. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RescueBasketScreen(
    suggestions: List<BasketSuggestion>,
    isLoading: Boolean,
    errorMessage: String?,
    onBackClick: () -> Unit,
    onSuggest: (budgetMax: Double, peopleCount: Int) -> Unit,
    modifier: Modifier = Modifier
) {
    var budgetText by remember { mutableStateOf("100000") }
    var peopleText by remember { mutableStateOf("2") }

    Column(
        modifier = modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
    ) {
        TopAppBar(
            title = { Text("Rescue Basket", fontWeight = FontWeight.Bold, fontSize = 17.sp) },
            navigationIcon = {
                IconButton(onClick = onBackClick) {
                    Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                }
            }
        )

        Column(modifier = Modifier.fillMaxWidth().padding(16.dp)) {
            OutlinedTextField(
                value = budgetText,
                onValueChange = { budgetText = it.filter { c -> c.isDigit() } },
                label = { Text("Ngân sách tối đa (VND)") },
                modifier = Modifier.fillMaxWidth()
            )
            Spacer(modifier = Modifier.height(10.dp))
            OutlinedTextField(
                value = peopleText,
                onValueChange = { peopleText = it.filter { c -> c.isDigit() } },
                label = { Text("Số người ăn") },
                modifier = Modifier.fillMaxWidth()
            )
            Spacer(modifier = Modifier.height(14.dp))
            Button(
                onClick = {
                    val budget = budgetText.toDoubleOrNull() ?: 0.0
                    val people = peopleText.toIntOrNull() ?: 1
                    if (budget > 0 && people > 0) {
                        onSuggest(budget, people)
                    }
                },
                modifier = Modifier.fillMaxWidth().height(48.dp),
                shape = RoundedCornerShape(24.dp),
                colors = ButtonDefaults.buttonColors(containerColor = ForestGreenPrimary)
            ) {
                Text("Gợi ý giỏ")
            }
        }

        when {
            isLoading -> {
                Box(modifier = Modifier.fillMaxWidth().padding(32.dp), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = ForestGreenPrimary)
                }
            }
            errorMessage != null -> {
                Text(errorMessage, modifier = Modifier.padding(16.dp), color = CoralRed)
            }
            suggestions.isEmpty() -> {
                Text(
                    "Nhập ngân sách và số người, sau đó bấm \"Gợi ý giỏ\" để xem tổ hợp suất phù hợp.",
                    modifier = Modifier.padding(16.dp),
                    color = TextSecondary
                )
            }
            else -> {
                LazyColumn(
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    items(suggestions) { basket -> BasketCard(basket) }
                }
            }
        }
    }
}

@Composable
private fun BasketCard(basket: BasketSuggestion) {
    Card(shape = RoundedCornerShape(12.dp)) {
        Column(modifier = Modifier.fillMaxWidth().padding(14.dp)) {
            Text(basket.storeName, fontWeight = FontWeight.Bold, fontSize = 15.sp, color = TextPrimary)
            Spacer(modifier = Modifier.height(6.dp))
            basket.items.forEach { item ->
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text(item.title, fontSize = 13.sp, color = TextSecondary)
                    Text("${"%,d".format(item.price)} ₫", fontSize = 13.sp, color = TextSecondary)
                }
            }
            Spacer(modifier = Modifier.height(6.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text("Tổng", fontWeight = FontWeight.SemiBold, fontSize = 14.sp, color = TextPrimary)
                Text(
                    "${"%,d".format(basket.estimatedTotal)} ₫",
                    fontWeight = FontWeight.Bold,
                    fontSize = 14.sp,
                    color = ForestGreenPrimary
                )
            }
            Spacer(modifier = Modifier.height(6.dp))
            basket.rankingReasons.forEach { reason ->
                Text("• $reason", fontSize = 11.sp, color = TextMuted)
            }
        }
    }
}
