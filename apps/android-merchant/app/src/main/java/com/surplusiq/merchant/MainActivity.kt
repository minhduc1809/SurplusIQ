package com.surplusiq.merchant

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.border
import androidx.compose.material.icons.automirrored.outlined.ReceiptLong
import androidx.compose.material.icons.outlined.Home
import androidx.compose.material.icons.outlined.Inventory2
import androidx.compose.material.icons.outlined.Notifications
import androidx.compose.material.icons.outlined.Restaurant
import com.surplusiq.merchant.ui.components.BottomBarItem
import com.surplusiq.merchant.ui.components.SqBottomBar
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ReceiptLong
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.Inventory2
import androidx.compose.material.icons.filled.QrCodeScanner
import androidx.compose.material.icons.filled.Restaurant
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.navigation.NavDestination.Companion.hierarchy
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.navigation.NavType
import androidx.navigation.navArgument
import com.surplusiq.merchant.data.ApiClient
import com.surplusiq.merchant.data.SessionManager
import com.surplusiq.merchant.data.StoreRepository
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.ui.Alignment
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.surplusiq.merchant.ui.theme.SqCanvas
import com.surplusiq.merchant.ui.theme.SqInk
import com.surplusiq.merchant.ui.theme.SqInkSoft
import com.surplusiq.merchant.ui.screens.*
import com.surplusiq.merchant.ui.theme.SqCoral
import com.surplusiq.merchant.ui.theme.SqCoralWash
import com.surplusiq.merchant.ui.theme.SqSurface
import com.surplusiq.merchant.ui.theme.SurplusIqMerchantTheme
import com.surplusiq.merchant.ui.theme.SqLine
import com.surplusiq.merchant.ui.theme.SqInkMuted

private data class Tab(
    val route: String,
    val label: String,
    val selectedIcon: androidx.compose.ui.graphics.vector.ImageVector,
    val icon: androidx.compose.ui.graphics.vector.ImageVector
)

private val SCREENS_WITHOUT_HEADER = setOf("notifications", "account", "tasks")

private val TABS = listOf(
    Tab("today", "Hôm nay", Icons.Filled.Home, Icons.Outlined.Home),
    Tab("items", "Món", Icons.Filled.Restaurant, Icons.Outlined.Restaurant),
    Tab("verify", "Quét QR", Icons.Filled.QrCodeScanner, Icons.Filled.QrCodeScanner),
    Tab("offers", "Suất", Icons.Filled.Inventory2, Icons.Outlined.Inventory2),
    Tab("orders", "Đơn", Icons.AutoMirrored.Filled.ReceiptLong, Icons.AutoMirrored.Outlined.ReceiptLong),
)

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val session = SessionManager(applicationContext)
        val repository = StoreRepository(ApiClient.get(session))

        setContent {
            SurplusIqMerchantTheme {
                var isLoggedIn by remember { mutableStateOf(session.isLoggedIn()) }
                val sessionExpired by SessionManager.expired.collectAsState()
                LaunchedEffect(sessionExpired) {
                    if (sessionExpired) {
                        isLoggedIn = false
                        SessionManager.expired.value = false
                    }
                }
                var authScreen by remember { mutableStateOf("login") }
                // Email chuyển từ màn quên mật khẩu/đăng ký sang màn nhập OTP.
                var authEmail by remember { mutableStateOf("") }
                if (isLoggedIn) {
                    MerchantApp(repository = repository, session = session, onLogout = {
                        session.logout()
                        isLoggedIn = false
                        authScreen = "login"
                    })
                } else {
                    when (authScreen) {
                        "forgot" -> ForgotPasswordScreen(
                            repository = repository,
                            onBackClick = { authScreen = "login" },
                            onCodeSent = { authEmail = it; authScreen = "reset" }
                        )
                        "reset", "verify" -> OtpVerificationScreen(
                            repository = repository,
                            email = authEmail,
                            isReset = authScreen == "reset",
                            onBackClick = { authScreen = "login" },
                            onDone = { authScreen = "login" }
                        )
                        "register" -> RegisterScreen(
                            repository = repository,
                            onBackClick = { authScreen = "login" },
                            onRegistered = { authEmail = it; authScreen = "verify" }
                        )
                        "activate" -> ActivateStaffScreen(
                            repository = repository,
                            session = session,
                            onBackClick = { authScreen = "login" },
                            onActivated = { isLoggedIn = true }
                        )
                        else -> LoginScreen(
                            repository = repository,
                            session = session,
                            onLoginSuccess = { isLoggedIn = true },
                            onForgotPasswordClick = { authScreen = "forgot" },
                            onRegisterClick = { authScreen = "register" },
                            onActivateClick = { authScreen = "activate" }
                        )
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun MerchantApp(repository: StoreRepository, session: SessionManager, onLogout: () -> Unit) {
    val navController = rememberNavController()
    val currentEntry by navController.currentBackStackEntryAsState()
    var unreadCount by remember { mutableIntStateOf(0) }
    var storeName by remember { mutableStateOf("") }
    LaunchedEffect(Unit) { repository.getStoreProfile().onSuccess { storeName = it.store.name } }

    // Làm mới số chưa đọc mỗi khi đổi màn (gồm cả khi rời màn Thông báo sau khi đọc).
    LaunchedEffect(currentEntry?.destination?.route) {
        repository.getNotifications(limit = 1).onSuccess { unreadCount = it.unreadCount }
    }

    fun open(route: String, tab: Boolean = false) = navController.navigate(route) {
        launchSingleTop = true
        if (tab) {
            popUpTo(navController.graph.findStartDestination().id) { saveState = true }
            restoreState = true
        }
    }

    Scaffold(
        containerColor = com.surplusiq.merchant.ui.theme.SqCanvas,
        topBar = {
            val route = currentEntry?.destination?.route
            val isTab = TABS.any { it.route == route }
            if (isTab) {
                TopAppBar(
                    title = {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier.clip(RoundedCornerShape(12.dp)).clickable { open("account") }
                        ) {
                            Box(
                                modifier = Modifier.size(44.dp).clip(CircleShape).background(SqCoralWash).border(2.dp, SqCoral.copy(alpha = 0.4f), CircleShape),
                                contentAlignment = Alignment.Center
                            ) {
                                Text(
                                    text = storeName.trim().take(1).ifEmpty { "?" }.uppercase(),
                                    fontWeight = FontWeight.Bold,
                                    color = SqCoral
                                )
                            }
                            Spacer(modifier = Modifier.width(12.dp))
                            Column {
                                Text(
                                    text = when (java.time.LocalTime.now().hour) {
                                        in 5..10 -> "Chào buổi sáng,"
                                        in 11..17 -> "Chào buổi chiều,"
                                        else -> "Chào buổi tối,"
                                    },
                                    fontSize = 12.sp,
                                    color = SqInkSoft
                                )
                                Text(
                                    text = storeName.ifBlank { "Cửa hàng của bạn" },
                                    fontSize = 16.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = SqInk,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis
                                )
                            }
                        }
                    },
                    actions = {
                        IconButton(
                            onClick = { open("notifications") },
                            modifier = Modifier.padding(end = 8.dp).size(44.dp).border(1.dp, SqLine, CircleShape).background(SqSurface, CircleShape)
                        ) {
                            BadgedBox(badge = {
                                if (unreadCount > 0) Badge(containerColor = SqCoral) { Text(if (unreadCount > 99) "99+" else "$unreadCount") }
                            }) {
                                Icon(Icons.Outlined.Notifications, contentDescription = "Thông báo, $unreadCount chưa đọc", tint = SqInkSoft)
                            }
                        }
                    },
                    colors = TopAppBarDefaults.topAppBarColors(containerColor = SqCanvas)
                )
            } else if (route in SCREENS_WITHOUT_HEADER) {
                // Các màn này không tự có ScreenHeader nên cần nút quay lại.
                TopAppBar(
                    title = {},
                    navigationIcon = {
                        IconButton(onClick = { navController.popBackStack() }) {
                            Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Quay lại")
                        }
                    },
                    colors = TopAppBarDefaults.topAppBarColors(containerColor = SqCanvas)
                )
            }
        },
        bottomBar = {
            val backStackEntry by navController.currentBackStackEntryAsState()
            val currentRoute = backStackEntry?.destination
            SqBottomBar(
                items = TABS.filter { it.route != "verify" }.map { BottomBarItem(it.route, it.label, it.selectedIcon, it.icon) },
                selectedKey = TABS.firstOrNull { tab -> currentRoute?.hierarchy?.any { it.route == tab.route } == true }?.route,
                onSelect = { open(it, tab = true) },
                accent = SqCoral,
                inactive = SqInkMuted,
                center = TABS.first { it.route == "verify" }.let { BottomBarItem(it.route, it.label, it.selectedIcon, it.icon) },
                onCenterClick = { open("verify", tab = true) }
            )
        }
    ) { padding ->
        NavHost(navController = navController, startDestination = "today", modifier = Modifier.padding(padding)) {
            composable("today") { TodayScreen(repository, onOpenTasks = { open("tasks") }, onNavigate = ::open) }
            composable("tasks") { TasksScreen(repository, onNavigate = ::open) }
            composable("notifications") {
                NotificationsScreen(repository, canMarkAll = session.getPermission() != "COUNTER", onNavigate = ::open)
            }
            composable("account") { AccountScreen(repository, session, onLogout, onOpenStoreMenu = { open("store-menu") }) }
            composable("items") { ItemsScreen(repository, onNavigate = ::open) }
            composable("offers") { OffersScreen(repository, onNavigate = ::open) }
            composable("orders") { OrdersScreen(repository, onNavigate = ::open) }
            composable("verify") { PickupVerifyScreen(repository) }

            // Hồ sơ & vận hành (S09-S15) + Gói dịch vụ (S16-S19)
            val back: () -> Unit = { navController.popBackStack() }
            composable("rescue-bridge") { RescueBridgeScreen(repository, onBack = back) }
            composable("rescue-pool") { RescuePoolScreen(repository, onBack = back) }
            composable("rescue-timeline") { RescueTimelineScreen(repository, onBack = back) }
            composable("store-menu") { StoreMenuScreen(onNavigate = ::open, onBack = back) }
            composable("store-profile") { StoreProfileScreen(repository, onBack = back) }
            composable("store-settings") { OperationalSettingsScreen(repository, onBack = back) }
            composable("store-pause") { StorePauseScreen(repository, onOpenSchedule = { open("store-schedule") }, onBack = back) }
            composable("store-schedule") { StoreScheduleScreen(repository, onBack = back) }
            composable("data-export") { DataExportScreen(repository, onBack = back) }
            composable("activity-log") { ActivityLogScreen(repository, onBack = back) }
            composable("subscription") { SubscriptionScreen(repository, onNavigate = ::open, onBack = back) }
            composable("subscription-renew") { SubscriptionRenewScreen(repository, onBack = back) }
            composable("invoices") { InvoicesScreen(repository, onBack = back) }
            composable("quotas") { UsageQuotasScreen(repository, onUpgrade = { open("subscription") }, onBack = back) }

            // Dự báo và định giá (S32-S37)
            composable("forecast") { ForecastScreen(repository, onNavigate = ::open, onBack = back) }
            composable("forecast-actuals") { DailyActualsScreen(repository, onBack = back) }
            composable("special-events") { SpecialEventsScreen(repository, onBack = back) }
            composable("forecast-trends") { ForecastTrendsScreen(repository, onNavigate = ::open, onBack = back) }
            composable("price-proposals") { PriceProposalsScreen(repository, onNavigate = ::open, onBack = back) }
            composable("price-history") { PriceHistoryScreen(repository, onBack = back) }

            // Đơn và nhận hàng (S40, S42)
            composable("order/{id}") { entry ->
                OrderDetailScreen(
                    repository,
                    orderId = entry.arguments?.getString("id").orEmpty(),
                    canCancel = session.getPermission() != "COUNTER",
                    onBack = back
                )
            }
            composable("pickup-schedule") { PickupScheduleScreen(repository, onOpenOrder = { open("order/$it") }, onBack = back) }

            // Danh mục món (S20-S24) - vào từ tab "Món"
            /** Sau khi tạo xong: thay màn form bằng màn chi tiết để Back về danh sách. */
            fun replace(from: String, to: String) = navController.navigate(to) { popUpTo(from) { inclusive = true } }
            composable("item/{id}") { entry ->
                ItemDetailScreen(repository, itemId = entry.arguments?.getString("id").orEmpty(), onNavigate = ::open, onBack = back)
            }
            composable("item-new") { ItemFormScreen(repository, itemId = null, onSaved = { replace("item-new", "item/$it") }, onBack = back) }
            composable("item-edit/{id}") { entry ->
                ItemFormScreen(repository, itemId = entry.arguments?.getString("id").orEmpty(), onSaved = { back() }, onBack = back)
            }
            composable("items-import") { ItemImportScreen(repository, onBack = back) }
            composable("items-quality") { DataQualityScreen(repository, onNavigate = ::open, onBack = back) }

            // Suất và tồn kho (S25-S31) - vào từ tab "Suất"
            composable(
                "offer-new?itemId={itemId}",
                arguments = listOf(navArgument("itemId") { type = NavType.StringType; nullable = true; defaultValue = null })
            ) { entry ->
                OfferCreateScreen(
                    repository, presetItemId = entry.arguments?.getString("itemId"),
                    onCreated = { replace("offer-new?itemId={itemId}", "offer/$it") }, onBack = back
                )
            }
            composable("offer/{id}") { entry ->
                OfferDetailScreen(repository, offerId = entry.arguments?.getString("id").orEmpty(), onNavigate = ::open, onBack = back)
            }
            composable("offer-history/{id}") { entry ->
                OfferHistoryScreen(repository, offerId = entry.arguments?.getString("id").orEmpty(), onBack = back)
            }
            composable("offers-clone") { CloneYesterdayScreen(repository, onDone = back, onBack = back) }
            composable("surprise-bags") { SurpriseBagScreen(repository, onNavigate = ::open, onBack = back) }
            composable("donation-suggestions") { DonationSuggestionsScreen(repository, onNavigate = ::open, onBack = back) }
        }
    }
}
