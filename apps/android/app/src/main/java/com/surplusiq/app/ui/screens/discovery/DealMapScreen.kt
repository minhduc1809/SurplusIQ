package com.surplusiq.app.ui.screens.discovery

import android.content.Intent
import android.net.Uri
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.slideInVertically
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Directions
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.MyLocation
import androidx.compose.material.icons.filled.Storefront
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.surplusiq.app.domain.model.Deal
import com.surplusiq.app.ui.theme.ForestGreenDark
import com.surplusiq.app.ui.theme.ForestGreenPrimary
import com.surplusiq.app.ui.theme.TextMuted
import com.surplusiq.app.ui.theme.TextPrimary
import com.surplusiq.app.ui.theme.TextSecondary

@Composable
fun DealMapScreen(
    deals: List<Deal>,
    onDealClick: (Deal) -> Unit,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    var selectedDeal by remember { mutableStateOf(deals.firstOrNull()) }

    Box(
        modifier = modifier
            .fillMaxSize()
            .background(Color(0xFFF0F6FA))
    ) {
        // Map Surface Simulation (Saigon Center Grid Pattern)
        Canvas(modifier = Modifier.fillMaxSize()) {
            val width = size.width
            val height = size.height

            // Simulated River Curve (Bạch Đằng / Sông Sài Gòn - Light Blue)
            drawLine(
                color = Color(0xFFBAE6FD),
                start = Offset(width * 0.85f, 0f),
                end = Offset(width * 0.65f, height),
                strokeWidth = 36f
            )

            // Grid streets
            val streetColor = Color(0xFFE2E8F0)
            for (i in 1..8) {
                drawLine(
                    color = streetColor,
                    start = Offset(0f, height * (i / 9f)),
                    end = Offset(width, height * (i / 9f)),
                    strokeWidth = 4f
                )
                drawLine(
                    color = streetColor,
                    start = Offset(width * (i / 9f), 0f),
                    end = Offset(width * (i / 9f), height),
                    strokeWidth = 4f
                )
            }

            // Radar circle (radius ring - Soft Sky Blue)
            drawCircle(
                color = ForestGreenPrimary.copy(alpha = 0.08f),
                radius = width * 0.38f,
                center = Offset(width * 0.5f, height * 0.45f)
            )
            drawCircle(
                color = ForestGreenPrimary.copy(alpha = 0.25f),
                radius = width * 0.38f,
                center = Offset(width * 0.5f, height * 0.45f),
                style = androidx.compose.ui.graphics.drawscope.Stroke(width = 2f)
            )
        }

        // Central User Marker ("You are here")
        Box(
            modifier = Modifier
                .align(Alignment.Center)
                .offset(y = (-40).dp),
            contentAlignment = Alignment.Center
        ) {
            Box(
                modifier = Modifier
                    .size(36.dp)
                    .clip(CircleShape)
                    .background(ForestGreenPrimary.copy(alpha = 0.2f))
            )
            Box(
                modifier = Modifier
                    .size(16.dp)
                    .clip(CircleShape)
                    .background(ForestGreenPrimary)
                    .border(2.dp, Color.White, CircleShape)
            )
        }

        // Deal Pin Markers on Map
        val pinOffsets = listOf(
            Offset(0.35f, 0.32f),
            Offset(0.60f, 0.28f),
            Offset(0.28f, 0.52f),
            Offset(0.68f, 0.50f),
            Offset(0.42f, 0.62f),
            Offset(0.75f, 0.38f)
        )

        deals.forEachIndexed { index, deal ->
            val positionRatio = pinOffsets.getOrElse(index) { Offset(0.5f + (index * 0.05f), 0.4f) }
            val isSelected = selectedDeal?.id == deal.id

            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(
                        start = (positionRatio.x * 320).dp,
                        top = (positionRatio.y * 540).dp
                    )
            ) {
                Surface(
                    onClick = { selectedDeal = deal },
                    shape = RoundedCornerShape(16.dp),
                    color = if (isSelected) ForestGreenPrimary else Color.White,
                    shadowElevation = if (isSelected) 8.dp else 3.dp,
                    border = androidx.compose.foundation.BorderStroke(
                        1.dp,
                        if (isSelected) ForestGreenDark else Color(0xFFDDDDDD)
                    ),
                    modifier = Modifier.wrapContentSize()
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 5.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            imageVector = Icons.Default.Storefront,
                            contentDescription = null,
                            tint = if (isSelected) Color.White else ForestGreenPrimary,
                            modifier = Modifier.size(14.dp)
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            text = "${deal.discountPrice / 1000}k",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            color = if (isSelected) Color.White else TextPrimary
                        )
                    }
                }
            }
        }

        // Floating Deal Preview Card (when a pin is selected)
        selectedDeal?.let { currentDeal ->
            AnimatedVisibility(
                visible = true,
                enter = fadeIn() + slideInVertically(initialOffsetY = { it }),
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .padding(16.dp)
            ) {
                Card(
                    shape = RoundedCornerShape(20.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                    elevation = CardDefaults.cardElevation(defaultElevation = 8.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(modifier = Modifier.padding(14.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            AsyncImage(
                                model = currentDeal.coverImageUrl,
                                contentDescription = currentDeal.title,
                                contentScale = ContentScale.Crop,
                                modifier = Modifier
                                    .size(72.dp)
                                    .clip(RoundedCornerShape(12.dp))
                            )

                            Spacer(modifier = Modifier.width(12.dp))

                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text = currentDeal.storeName,
                                    fontSize = 12.sp,
                                    color = TextSecondary,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis
                                )
                                Text(
                                    text = currentDeal.title,
                                    fontSize = 14.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = TextPrimary,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis
                                )

                                Spacer(modifier = Modifier.height(4.dp))

                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Text(
                                        text = "${String.format("%,d", currentDeal.originalPrice)} ₫",
                                        fontSize = 11.sp,
                                        textDecoration = TextDecoration.LineThrough,
                                        color = TextMuted
                                    )
                                    Spacer(modifier = Modifier.width(6.dp))
                                    Text(
                                        text = "${String.format("%,d", currentDeal.discountPrice)} ₫",
                                        fontSize = 14.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = ForestGreenPrimary
                                    )
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Text(
                                        text = "• ${currentDeal.distanceText}",
                                        fontSize = 11.sp,
                                        color = TextSecondary
                                    )
                                }
                            }
                        }

                        Spacer(modifier = Modifier.height(12.dp))

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            OutlinedButton(
                                onClick = {
                                    com.surplusiq.app.ui.util.NavigationUtil.openMapOrCopyAddress(
                                        context = context,
                                        storeAddress = currentDeal.storeAddress,
                                        storeName = currentDeal.storeName
                                    )
                                },
                                shape = RoundedCornerShape(12.dp),
                                modifier = Modifier.weight(1f).height(40.dp)
                            ) {
                                Icon(
                                    imageVector = Icons.Default.Directions,
                                    contentDescription = null,
                                    modifier = Modifier.size(16.dp)
                                )
                                Spacer(modifier = Modifier.width(4.dp))
                                Text(text = "Chỉ đường", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                            }

                            Button(
                                onClick = { onDealClick(currentDeal) },
                                shape = RoundedCornerShape(12.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = ForestGreenPrimary),
                                modifier = Modifier.weight(1.3f).height(40.dp)
                            ) {
                                Text(text = "Xem chi tiết", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                }
            }
        }
    }
}
