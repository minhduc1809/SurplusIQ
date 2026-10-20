package com.surplusiq.app.ui.screens.auth

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.surplusiq.app.R
import com.surplusiq.app.ui.components.AuthIllustration
import com.surplusiq.app.ui.components.AuthIllustrationKind
import com.surplusiq.app.ui.theme.ForestGreenDark
import com.surplusiq.app.ui.theme.ForestGreenPrimary
import com.surplusiq.app.ui.theme.SurfaceWhite

/** Màn Splash/Welcome - cổng vào trước Đăng nhập/Đăng ký, theo đúng bố cục tham khảo. */
@Composable
fun WelcomeScreen(
    onLoginClick: () -> Unit,
    onRegisterClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier
            .fillMaxSize()
            .background(SurfaceWhite)
            .padding(horizontal = 24.dp),
        verticalArrangement = Arrangement.Center
    ) {
        Box(modifier = Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
            Image(
                painter = painterResource(id = R.drawable.logo_surplusiq_icon),
                contentDescription = "SurplusIQ",
                contentScale = ContentScale.Fit,
                modifier = Modifier.height(56.dp)
            )
        }

        Spacer(modifier = Modifier.height(12.dp))

        Text(
            text = "Welcome to SurplusIQ",
            fontSize = 20.sp,
            fontWeight = FontWeight.ExtraBold,
            color = ForestGreenDark,
            modifier = Modifier.fillMaxWidth(),
            textAlign = androidx.compose.ui.text.style.TextAlign.Center
        )

        Spacer(modifier = Modifier.height(32.dp))

        Box(modifier = Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
            AuthIllustration(kind = AuthIllustrationKind.WELCOME, sizeDp = 320)
        }

        Spacer(modifier = Modifier.height(40.dp))

        Button(
            onClick = onLoginClick,
            modifier = Modifier.fillMaxWidth().height(52.dp),
            shape = RoundedCornerShape(12.dp),
            colors = ButtonDefaults.buttonColors(containerColor = ForestGreenPrimary)
        ) {
            Text(text = "Đăng nhập", fontSize = 15.sp, fontWeight = FontWeight.Bold, color = Color.White)
        }

        Spacer(modifier = Modifier.height(12.dp))

        OutlinedButton(
            onClick = onRegisterClick,
            modifier = Modifier.fillMaxWidth().height(52.dp),
            shape = RoundedCornerShape(12.dp),
            border = androidx.compose.foundation.BorderStroke(1.5.dp, ForestGreenPrimary),
            colors = ButtonDefaults.outlinedButtonColors(containerColor = SurfaceWhite)
        ) {
            Text(text = "Đăng ký", fontSize = 15.sp, fontWeight = FontWeight.Bold, color = ForestGreenDark)
        }
    }
}
