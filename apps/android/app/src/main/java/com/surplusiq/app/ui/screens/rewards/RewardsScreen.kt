package com.surplusiq.app.ui.screens.rewards

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Stars
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.surplusiq.app.domain.model.RewardHistoryEntry
import com.surplusiq.app.ui.theme.AmberAccent
import com.surplusiq.app.ui.theme.CoralRed
import com.surplusiq.app.ui.theme.ForestGreenPrimary
import com.surplusiq.app.ui.theme.TextMuted
import com.surplusiq.app.ui.theme.TextPrimary
import com.surplusiq.app.ui.theme.TextSecondary
import com.surplusiq.app.ui.viewmodel.RewardsUiState

/** Rescue Rewards (CM-C04): số dư + lịch sử bút toán điểm thưởng. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RewardsScreen(
    state: RewardsUiState,
    onBackClick: () -> Unit,
    onRetry: () -> Unit,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
    ) {
        TopAppBar(
            title = { Text("Rescue Rewards", fontWeight = FontWeight.Bold, fontSize = 17.sp) },
            navigationIcon = {
                IconButton(onClick = onBackClick) {
                    Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                }
            }
        )

        when {
            state.isLoading -> {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = ForestGreenPrimary)
                }
            }
            state.errorMessage != null -> {
                Column(
                    modifier = Modifier.fillMaxSize().padding(24.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.Center
                ) {
                    Text(state.errorMessage, color = CoralRed, fontSize = 14.sp)
                    Spacer(modifier = Modifier.height(12.dp))
                    Button(onClick = onRetry) { Text("Thử lại") }
                }
            }
            else -> {
                Column(modifier = Modifier.fillMaxWidth().padding(16.dp)) {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(16.dp),
                        colors = CardDefaults.cardColors(containerColor = ForestGreenPrimary)
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth().padding(20.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(Icons.Default.Stars, contentDescription = null, tint = AmberAccent)
                            Spacer(modifier = Modifier.width(12.dp))
                            Column {
                                Text("Số dư điểm thưởng", color = androidx.compose.ui.graphics.Color.White, fontSize = 13.sp)
                                Text(
                                    "${state.pointsBalance} điểm",
                                    color = androidx.compose.ui.graphics.Color.White,
                                    fontSize = 24.sp,
                                    fontWeight = FontWeight.ExtraBold
                                )
                            }
                        }
                    }
                }

                if (state.redeemMessage != null) {
                    Text(
                        text = state.redeemMessage,
                        modifier = Modifier.padding(horizontal = 16.dp),
                        fontSize = 13.sp,
                        color = ForestGreenPrimary
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                }

                Text(
                    text = "Lịch sử bút toán",
                    modifier = Modifier.padding(horizontal = 16.dp),
                    fontWeight = FontWeight.Bold,
                    fontSize = 14.sp,
                    color = TextPrimary
                )

                if (state.history.isEmpty()) {
                    Text(
                        text = "Chưa có bút toán điểm thưởng nào.",
                        modifier = Modifier.padding(16.dp),
                        color = TextSecondary
                    )
                } else {
                    LazyColumn(
                        contentPadding = PaddingValues(16.dp),
                        verticalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        items(state.history) { entry -> RewardHistoryRow(entry) }
                    }
                }
            }
        }
    }
}

@Composable
private fun RewardHistoryRow(entry: RewardHistoryEntry) {
    Card(shape = RoundedCornerShape(10.dp)) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(12.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column {
                Text(entry.entryType, fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = TextPrimary)
                Text(
                    entry.reason ?: "",
                    fontSize = 12.sp,
                    color = TextMuted
                )
            }
            Text(
                text = if (entry.pointsDelta >= 0) "+${entry.pointsDelta}" else "${entry.pointsDelta}",
                fontWeight = FontWeight.Bold,
                color = if (entry.pointsDelta >= 0) ForestGreenPrimary else CoralRed
            )
        }
    }
}
