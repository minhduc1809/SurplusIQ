package com.surplusiq.app.ui.screens.buyer

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Schedule
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.surplusiq.app.ui.theme.AmberAccent
import com.surplusiq.app.ui.theme.EmeraldPrimary
import com.surplusiq.app.ui.theme.TextSecondaryDark

data class DealItem(
    val id: String,
    val storeName: String,
    val distanceKm: Double,
    val productName: String,
    val originalPrice: Int,
    val discountPrice: Int,
    val discountPercent: Int,
    val remainingStock: Int,
    val pickupUntil: String
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun BuyerDealListScreen() {
    val sampleDeals = listOf(
        DealItem(
            id = "1",
            storeName = "Artisan Bakery Pastry",
            distanceKm = 0.4,
            productName = "Túi bí ẩn: 3 Bánh Mì Bơ Tỏi & Croissant",
            originalPrice = 95000,
            discountPrice = 45000,
            discountPercent = 52,
            remainingStock = 4,
            pickupUntil = "21:30"
        ),
        DealItem(
            id = "2",
            storeName = "The Coffee House & Bakery",
            distanceKm = 0.8,
            productName = "Suất Cứu Món: 2 Mousse Socola & Tiramisu",
            originalPrice = 110000,
            discountPrice = 55000,
            discountPercent = 50,
            remainingStock = 2,
            pickupUntil = "22:00"
        ),
        DealItem(
            id = "3",
            storeName = "Tiệm Bánh Mì Mẹ Làm",
            distanceKm = 1.2,
            productName = "Set 4 Bánh Mì Men Tự Nhiên Sourdough",
            originalPrice = 70000,
            discountPrice = 38000,
            discountPercent = 45,
            remainingStock = 6,
            pickupUntil = "21:00"
        )
    )

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text(
                            text = "SaveBite • Cứu Món",
                            fontWeight = FontWeight.Bold,
                            fontSize = 20.sp
                        )
                        Text(
                            text = "Giảm giá sâu • Lấy hàng trước giờ đóng cửa",
                            fontSize = 12.sp,
                            color = TextSecondaryDark
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface
                )
            )
        }
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(horizontal = 16.dp, vertical = 8.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            items(sampleDeals) { deal ->
                DealCard(deal = deal)
            }
        }
    }
}

@Composable
fun DealCard(deal: DealItem) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface
        )
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = deal.storeName,
                    fontSize = 14.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = EmeraldPrimary
                )
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = Icons.Default.LocationOn,
                        contentDescription = "Khoảng cách",
                        tint = TextSecondaryDark,
                        modifier = Modifier.size(14.dp)
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        text = "${deal.distanceKm} km",
                        fontSize = 12.sp,
                        color = TextSecondaryDark
                    )
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            Text(
                text = deal.productName,
                fontSize = 17.sp,
                fontWeight = FontWeight.Bold
            )

            Spacer(modifier = Modifier.height(10.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.Bottom
            ) {
                Column {
                    Text(
                        text = "${String.format("%,d", deal.originalPrice)} ₫",
                        fontSize = 13.sp,
                        textDecoration = TextDecoration.LineThrough,
                        color = TextSecondaryDark
                    )
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            text = "${String.format("%,d", deal.discountPrice)} ₫",
                            fontSize = 20.sp,
                            fontWeight = FontWeight.ExtraBold,
                            color = EmeraldPrimary
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Box(
                            modifier = Modifier
                                .clip(RoundedCornerShape(6.dp))
                                .background(AmberAccent.copy(alpha = 0.2f))
                                .padding(horizontal = 6.dp, vertical = 2.dp)
                        ) {
                            Text(
                                text = "-${deal.discountPercent}%",
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold,
                                color = AmberAccent
                            )
                        }
                    }
                }

                Column(horizontalAlignment = Alignment.End) {
                    Text(
                        text = "Còn ${deal.remainingStock} suất",
                        fontSize = 12.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = Color.White
                    )
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier.padding(top = 2.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.Schedule,
                            contentDescription = "Hạn nhận",
                            tint = TextSecondaryDark,
                            modifier = Modifier.size(12.dp)
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            text = "Trước ${deal.pickupUntil}",
                            fontSize = 11.sp,
                            color = TextSecondaryDark
                        )
                    }
                }
            }
        }
    }
}
