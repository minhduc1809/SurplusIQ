package com.surplusiq.app.ui.navigation

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Scaffold
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.hilt.navigation.compose.hiltViewModel
import com.surplusiq.app.domain.model.ActiveOrder
import com.surplusiq.app.domain.model.Deal
import com.surplusiq.app.ui.components.NavTab
import com.surplusiq.app.ui.components.SurplusBottomNav
import com.surplusiq.app.ui.screens.ai.SaveBiteAiSheet
import com.surplusiq.app.ui.screens.auth.LoginScreen
import com.surplusiq.app.ui.screens.auth.OtpVerificationScreen
import com.surplusiq.app.ui.screens.auth.RegisterScreen
import com.surplusiq.app.ui.screens.checkout.OrderHoldCheckoutScreen
import com.surplusiq.app.ui.screens.discovery.BrowseScreen
import com.surplusiq.app.ui.screens.discovery.DealDetailScreen
import com.surplusiq.app.ui.screens.discovery.DiscoverHomeScreen
import com.surplusiq.app.ui.screens.discovery.PreferencesScreen
import com.surplusiq.app.ui.screens.favourites.FavouritesScreen
import com.surplusiq.app.ui.screens.orders.MyOrdersScreen
import com.surplusiq.app.ui.screens.orders.OrderDetailScreen
import com.surplusiq.app.ui.screens.pickup.PickupPassScreen
import com.surplusiq.app.ui.screens.profile.ProfileScreen
import com.surplusiq.app.ui.viewmodel.AuthViewModel
import com.surplusiq.app.ui.viewmodel.DiscoveryViewModel
import com.surplusiq.app.ui.viewmodel.MyOrdersViewModel

sealed class AppDestination {
    object MainTabs : AppDestination()
    data class DealDetail(val deal: Deal) : AppDestination()
    object Preferences : AppDestination()
    data class CheckoutHold(val deal: Deal) : AppDestination()
    data class PickupPass(val order: ActiveOrder) : AppDestination()
    object MyOrders : AppDestination()
    data class OrderDetail(val order: ActiveOrder) : AppDestination()
}

enum class AuthScreenState {
    LOGIN,
    REGISTER,
    OTP
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SurplusAppRoot(
    discoveryViewModel: DiscoveryViewModel = hiltViewModel(),
    authViewModel: AuthViewModel = hiltViewModel(),
    myOrdersViewModel: MyOrdersViewModel = hiltViewModel()
) {
    val authState by authViewModel.uiState.collectAsState()
    val discoveryState by discoveryViewModel.uiState.collectAsState()
    val myOrdersState by myOrdersViewModel.uiState.collectAsState()

    val dealsList = discoveryState.deals
    var selectedTab by remember { mutableStateOf(NavTab.DISCOVER) }
    var currentDestination by remember { mutableStateOf<AppDestination>(AppDestination.MainTabs) }
    var authScreenState by remember { mutableStateOf(AuthScreenState.LOGIN) }
    var showAiBottomSheet by remember { mutableStateOf(false) }

    // Session gateway: if not logged in and didn't select guest mode -> show Auth Flow
    if (!authState.isLoggedIn && !authState.isGuestMode) {
        if (authState.isOtpSent) {
            OtpVerificationScreen(
                state = authState,
                onOtpChange = { authViewModel.onOtpChanged(it) },
                onVerifyClick = { authViewModel.verifyOtp() },
                onResendOtpClick = { authViewModel.resendOtp() },
                onBackClick = { authScreenState = AuthScreenState.REGISTER }
            )
        } else {
            when (authScreenState) {
                AuthScreenState.LOGIN -> {
                    LoginScreen(
                        state = authState,
                        onPhoneChange = { authViewModel.onPhoneChanged(it) },
                        onPasswordChange = { authViewModel.onPasswordChanged(it) },
                        onLoginClick = { authViewModel.login() },
                        onNavigateToRegister = { authScreenState = AuthScreenState.REGISTER },
                        onContinueAsGuest = { authViewModel.continueAsGuest() }
                    )
                }

                AuthScreenState.REGISTER -> {
                    RegisterScreen(
                        state = authState,
                        onFullNameChange = { authViewModel.onFullNameChanged(it) },
                        onPhoneChange = { authViewModel.onPhoneChanged(it) },
                        onPasswordChange = { authViewModel.onPasswordChanged(it) },
                        onRegisterClick = { authViewModel.register() },
                        onBackToLogin = { authScreenState = AuthScreenState.LOGIN }
                    )
                }

                AuthScreenState.OTP -> {
                    OtpVerificationScreen(
                        state = authState,
                        onOtpChange = { authViewModel.onOtpChanged(it) },
                        onVerifyClick = { authViewModel.verifyOtp() },
                        onResendOtpClick = { authViewModel.resendOtp() },
                        onBackClick = { authScreenState = AuthScreenState.REGISTER }
                    )
                }
            }
        }
        return
    }

    when (val dest = currentDestination) {
        is AppDestination.DealDetail -> {
            DealDetailScreen(
                deal = dest.deal,
                onBackClick = { currentDestination = AppDestination.MainTabs },
                onReserveClick = { selectedDeal ->
                    currentDestination = AppDestination.CheckoutHold(selectedDeal)
                }
            )
        }

        is AppDestination.Preferences -> {
            PreferencesScreen(
                currentPreferences = discoveryState.preferences,
                onBackClick = { currentDestination = AppDestination.MainTabs },
                onApplyPreferences = { updatedPrefs ->
                    discoveryViewModel.onPreferencesUpdated(updatedPrefs)
                    currentDestination = AppDestination.MainTabs
                }
            )
        }

        is AppDestination.CheckoutHold -> {
            OrderHoldCheckoutScreen(
                deal = dest.deal,
                onBackClick = { currentDestination = AppDestination.DealDetail(dest.deal) },
                onPaymentSuccess = { createdOrder ->
                    myOrdersViewModel.loadOrders()
                    currentDestination = AppDestination.PickupPass(createdOrder)
                }
            )
        }

        is AppDestination.PickupPass -> {
            PickupPassScreen(
                order = dest.order,
                onBackClick = { currentDestination = AppDestination.MainTabs }
            )
        }

        is AppDestination.MyOrders -> {
            MyOrdersScreen(
                state = myOrdersState,
                onTabSelected = { myOrdersViewModel.selectTab(it) },
                onOrderClick = { order -> currentDestination = AppDestination.OrderDetail(order) },
                onOpenPickupPass = { order -> currentDestination = AppDestination.PickupPass(order) },
                onResumePayment = { order -> currentDestination = AppDestination.CheckoutHold(order.deal) },
                onBackClick = { currentDestination = AppDestination.MainTabs }
            )
        }

        is AppDestination.OrderDetail -> {
            OrderDetailScreen(
                order = dest.order,
                onBackClick = { currentDestination = AppDestination.MyOrders },
                onOpenPickupPass = { order -> currentDestination = AppDestination.PickupPass(order) },
                onResumePayment = { order -> currentDestination = AppDestination.CheckoutHold(order.deal) },
                onCancelOrder = { orderId -> myOrdersViewModel.cancelOrder(orderId) }
            )
        }

        is AppDestination.MainTabs -> {
            Scaffold(
                bottomBar = {
                    SurplusBottomNav(
                        selectedTab = selectedTab,
                        onTabSelected = { selectedTab = it }
                    )
                }
            ) { innerPadding ->
                Box(modifier = Modifier.padding(innerPadding)) {
                    when (selectedTab) {
                        NavTab.DISCOVER -> {
                            DiscoverHomeScreen(
                                deals = dealsList,
                                onDealClick = { deal ->
                                    currentDestination = AppDestination.DealDetail(deal)
                                },
                                onFavoriteToggle = { discoveryViewModel.toggleFavorite(it) },
                                onOpenPreferences = {
                                    currentDestination = AppDestination.Preferences
                                },
                                onOpenAiChat = { showAiBottomSheet = true },
                                onSeeAllClick = { selectedTab = NavTab.BROWSE }
                            )
                        }

                        NavTab.BROWSE -> {
                            BrowseScreen(
                                deals = dealsList,
                                onBackClick = { selectedTab = NavTab.DISCOVER },
                                onDealClick = { deal ->
                                    currentDestination = AppDestination.DealDetail(deal)
                                },
                                onFavoriteToggle = { discoveryViewModel.toggleFavorite(it) }
                            )
                        }

                        NavTab.FAVOURITES -> {
                            FavouritesScreen(
                                favoriteDeals = dealsList.filter { it.isFavorite },
                                onDealClick = { deal ->
                                    currentDestination = AppDestination.DealDetail(deal)
                                },
                                onFavoriteToggle = { discoveryViewModel.toggleFavorite(it) }
                            )
                        }

                        NavTab.ME -> {
                            ProfileScreen(
                                onOpenAiChat = { showAiBottomSheet = true },
                                onOpenMyOrders = {
                                    myOrdersViewModel.loadOrders()
                                    currentDestination = AppDestination.MyOrders
                                },
                                onLogout = { authViewModel.logout() }
                            )
                        }
                    }
                }
            }
        }
    }

    // AI Assistant Bottom Sheet
    if (showAiBottomSheet) {
        ModalBottomSheet(
            onDismissRequest = { showAiBottomSheet = false }
        ) {
            SaveBiteAiSheet(
                allDeals = dealsList,
                onDealClick = { deal ->
                    showAiBottomSheet = false
                    currentDestination = AppDestination.DealDetail(deal)
                },
                onClose = { showAiBottomSheet = false }
            )
        }
    }
}
