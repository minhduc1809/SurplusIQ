package com.surplusiq.app.ui.screens.onboarding

import androidx.compose.animation.core.animateDpAsState
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Eco
import androidx.compose.material.icons.filled.NearMe
import androidx.compose.material.icons.filled.QrCodeScanner
import androidx.compose.material.icons.filled.WorkspacePremium
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.surplusiq.app.ui.theme.ForestGreenDark
import com.surplusiq.app.ui.theme.ForestGreenPrimary
import com.surplusiq.app.ui.theme.PrimaryOrange
import com.surplusiq.app.ui.theme.TextMuted
import com.surplusiq.app.ui.theme.TextPrimary
import com.surplusiq.app.ui.theme.TextSecondary
import kotlinx.coroutines.launch

data class OnboardingSlide(
    val badge: String,
    val title: String,
    val description: String,
    val icon: ImageVector,
    val themeColor: Color,
    val gradientColors: List<Color>
)

val ONBOARDING_SLIDES = listOf(
    OnboardingSlide(
        badge = "CỨU MÓN NGON",
        title = "Chống Lãng Phí Thực Phẩm",
        description = "Khám phá các suất ăn tươi ngon chất lượng cao từ các nhà hàng, tiệm bánh uy tín với giá ưu đãi mỗi ngày.",
        icon = Icons.Default.Eco,
        themeColor = ForestGreenPrimary,
        gradientColors = listOf(Color(0xFF2E7D32), Color(0xFF81C784))
    ),
    OnboardingSlide(
        badge = "LẤY HÀNG TIỆN LỢI",
        title = "Nhận Nhanh Bằng Mã QR",
        description = "Đặt giữ suất trước và đến nhận trong khung giờ hẹn. Quét mã QR tại quầy hoặc tạo mã nhận hộ cho người thân nhận thay nhanh chóng.",
        icon = Icons.Default.QrCodeScanner,
        themeColor = PrimaryOrange,
        gradientColors = listOf(Color(0xFFE65100), Color(0xFFFFB74D))
    ),
    OnboardingSlide(
        badge = "TÌM KIẾM THÔNG MINH",
        title = "Radar Quét Suất Quanh Bạn",
        description = "Tự động gợi ý các suất ngon trong bán kính bạn chọn quanh vị trí của bạn. Bật thông báo để không bao giờ bỏ lỡ món yêu thích từ tiệm quen.",
        icon = Icons.Default.NearMe,
        themeColor = Color(0xFF0288D1),
        gradientColors = listOf(Color(0xFF01579B), Color(0xFF4FC3F7))
    ),
    OnboardingSlide(
        badge = "BẢO VỆ HÀNH TINH",
        title = "Tích Điểm Xanh & Ưu Đãi",
        description = "Mỗi phần ăn bạn giải cứu là một phần thực phẩm không bị lãng phí. Tích lũy huy hiệu sống xanh và đổi hàng ngàn voucher hấp dẫn.",
        icon = Icons.Default.WorkspacePremium,
        themeColor = ForestGreenDark,
        gradientColors = listOf(Color(0xFF1B5E20), Color(0xFF66BB6A))
    )
)

/**
 * KX09: Hành trình khách hàng mới (Onboarding 4 slide vuốt ngang)
 */
@OptIn(ExperimentalFoundationApi::class)
@Composable
fun OnboardingScreen(
    onFinishOnboarding: () -> Unit,
    modifier: Modifier = Modifier
) {
    val pagerState = rememberPagerState(pageCount = { ONBOARDING_SLIDES.size })
    val scope = rememberCoroutineScope()

    Scaffold(
        modifier = modifier.fillMaxSize(),
        topBar = {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 12.dp),
                horizontalArrangement = Arrangement.End,
                verticalAlignment = Alignment.CenterVertically
            ) {
                if (pagerState.currentPage < ONBOARDING_SLIDES.size - 1) {
                    TextButton(onClick = onFinishOnboarding) {
                        Text(
                            text = "Bỏ qua",
                            color = TextMuted,
                            fontWeight = FontWeight.Medium,
                            fontSize = 14.sp
                        )
                    }
                } else {
                    Spacer(modifier = Modifier.height(36.dp))
                }
            }
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(horizontal = 24.dp, vertical = 16.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            HorizontalPager(
                state = pagerState,
                modifier = Modifier
                    .weight(1f)
                    .fillMaxWidth()
            ) { page ->
                val slide = ONBOARDING_SLIDES[page]
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(horizontal = 16.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.Center
                ) {
                    // Circular Illustration with Icon & Gradient
                    Box(
                        modifier = Modifier
                            .size(160.dp)
                            .clip(CircleShape)
                            .background(
                                Brush.linearGradient(slide.gradientColors)
                            ),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = slide.icon,
                            contentDescription = null,
                            tint = Color.White,
                            modifier = Modifier.size(80.dp)
                        )
                    }

                    Spacer(modifier = Modifier.height(36.dp))

                    // Badge
                    Surface(
                        color = slide.themeColor.copy(alpha = 0.12f),
                        shape = RoundedCornerShape(16.dp)
                    ) {
                        Text(
                            text = slide.badge,
                            color = slide.themeColor,
                            fontWeight = FontWeight.Bold,
                            fontSize = 12.sp,
                            modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
                            letterSpacing = 0.5.sp
                        )
                    }

                    Spacer(modifier = Modifier.height(14.dp))

                    // Title
                    Text(
                        text = slide.title,
                        fontWeight = FontWeight.ExtraBold,
                        fontSize = 24.sp,
                        color = TextPrimary,
                        textAlign = TextAlign.Center
                    )

                    Spacer(modifier = Modifier.height(12.dp))

                    // Description
                    Text(
                        text = slide.description,
                        fontSize = 15.sp,
                        color = TextSecondary,
                        textAlign = TextAlign.Center,
                        lineHeight = 22.sp
                    )
                }
            }

            // Pager Indicator Dots
            Row(
                modifier = Modifier.padding(vertical = 24.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                repeat(ONBOARDING_SLIDES.size) { index ->
                    val isSelected = pagerState.currentPage == index
                    val width by animateDpAsState(
                        targetValue = if (isSelected) 28.dp else 8.dp,
                        label = "dotWidth"
                    )
                    Box(
                        modifier = Modifier
                            .height(8.dp)
                            .width(width)
                            .clip(RoundedCornerShape(4.dp))
                            .background(
                                if (isSelected) PrimaryOrange else TextMuted.copy(alpha = 0.3f)
                            )
                    )
                }
            }

            // Action Button
            Button(
                onClick = {
                    if (pagerState.currentPage < ONBOARDING_SLIDES.size - 1) {
                        scope.launch {
                            pagerState.animateScrollToPage(pagerState.currentPage + 1)
                        }
                    } else {
                        onFinishOnboarding()
                    }
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(52.dp),
                shape = RoundedCornerShape(14.dp),
                colors = ButtonDefaults.buttonColors(containerColor = PrimaryOrange)
            ) {
                Text(
                    text = if (pagerState.currentPage == ONBOARDING_SLIDES.size - 1) "Bắt đầu khám phá ngay" else "Tiếp tục",
                    fontWeight = FontWeight.Bold,
                    fontSize = 16.sp,
                    color = Color.White
                )
            }

            Spacer(modifier = Modifier.height(12.dp))
        }
    }
}
