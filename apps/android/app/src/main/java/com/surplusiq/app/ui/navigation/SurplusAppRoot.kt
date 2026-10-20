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
import androidx.compose.ui.platform.LocalContext
import androidx.credentials.exceptions.GetCredentialException
import androidx.hilt.navigation.compose.hiltViewModel
import com.surplusiq.app.data.auth.GoogleSignInHelper
import com.surplusiq.app.domain.model.ActiveOrder
import com.surplusiq.app.domain.model.Deal
import androidx.compose.ui.Alignment
import androidx.compose.ui.unit.dp
import com.surplusiq.app.ui.components.AiMascotFab
import com.surplusiq.app.domain.model.UserImpactStats
import com.surplusiq.app.ui.components.NavTab
import kotlinx.coroutines.launch
import com.surplusiq.app.ui.components.SurplusBottomNav
import com.surplusiq.app.ui.screens.ai.SaveBiteAiSheet
import com.surplusiq.app.ui.screens.auth.ForgotPasswordScreen
import com.surplusiq.app.ui.screens.auth.LoginScreen
import com.surplusiq.app.ui.screens.auth.OtpVerificationScreen
import com.surplusiq.app.ui.screens.auth.RegisterScreen
import com.surplusiq.app.ui.screens.auth.ResetPasswordScreen
import com.surplusiq.app.ui.screens.auth.WelcomeScreen
import com.surplusiq.app.ui.screens.basket.RescueBasketScreen
import com.surplusiq.app.ui.screens.basket.BasketDetailScreen
import com.surplusiq.app.ui.screens.basket.BasketCheckoutScreen
import com.surplusiq.app.ui.screens.checkout.OrderHoldCheckoutScreen
import com.surplusiq.app.ui.screens.discovery.BrowseScreen
import com.surplusiq.app.ui.screens.discovery.DealDetailScreen
import com.surplusiq.app.ui.screens.discovery.DiscoverHomeScreen
import com.surplusiq.app.ui.screens.discovery.PreferencesScreen
import com.surplusiq.app.ui.screens.discovery.SearchScreen
import com.surplusiq.app.ui.screens.favourites.FavouritesScreen
import com.surplusiq.app.ui.screens.notifications.NotificationsScreen
import com.surplusiq.app.ui.screens.orders.MyOrdersScreen
import com.surplusiq.app.ui.screens.orders.OrderDetailScreen
import com.surplusiq.app.ui.screens.pickup.PickupPassScreen
import com.surplusiq.app.ui.screens.postpurchase.CreateComplaintScreen
import com.surplusiq.app.ui.screens.postpurchase.CreateReviewScreen
import com.surplusiq.app.ui.screens.profile.ChangePasswordScreen
import com.surplusiq.app.ui.screens.profile.DietaryProfileScreen
import com.surplusiq.app.ui.screens.profile.ImpactScreen
import com.surplusiq.app.ui.screens.profile.PrivacyDataScreen
import com.surplusiq.app.ui.screens.profile.ProfileScreen
import com.surplusiq.app.ui.screens.basket.RescueBasketScreen
import com.surplusiq.app.ui.screens.rewards.RewardsScreen
import com.surplusiq.app.ui.screens.support.HelpCenterScreen
import com.surplusiq.app.ui.screens.support.SupportTicketDetailScreen
import com.surplusiq.app.ui.screens.support.SupportTicketListScreen
import com.surplusiq.app.ui.viewmodel.AuthViewModel
import com.surplusiq.app.ui.viewmodel.DiscoveryViewModel
import com.surplusiq.app.ui.viewmodel.InteractionsViewModel
import com.surplusiq.app.ui.viewmodel.MyOrdersViewModel
import com.surplusiq.app.ui.viewmodel.ProfileViewModel
import com.surplusiq.app.ui.viewmodel.RewardsViewModel
import com.surplusiq.app.ui.viewmodel.NotificationsViewModel
import com.surplusiq.app.ui.viewmodel.RescuePoolViewModel
import com.surplusiq.app.ui.screens.pool.RescuePoolDetailScreen
import com.surplusiq.app.ui.screens.pool.RescuePoolListScreen
import com.surplusiq.app.domain.model.DealAlert
import com.surplusiq.app.ui.screens.alerts.DealAlertEditScreen
import com.surplusiq.app.ui.screens.alerts.DealAlertsScreen
import com.surplusiq.app.ui.screens.discovery.CompareDealsScreen
import com.surplusiq.app.ui.screens.discovery.SavedDealsScreen
import com.surplusiq.app.ui.screens.location.LocationSettingsScreen
import com.surplusiq.app.ui.screens.location.PinLocationScreen
import com.surplusiq.app.ui.screens.location.SavedPlacesScreen
import com.surplusiq.app.ui.screens.store.StoreDetailScreen
import com.surplusiq.app.ui.screens.store.StoreReviewsScreen
import com.surplusiq.app.ui.viewmodel.DealAlertsViewModel
import com.surplusiq.app.ui.viewmodel.PlacesViewModel
import com.surplusiq.app.ui.viewmodel.SavedDealsViewModel
import com.surplusiq.app.ui.viewmodel.StoreViewModel
import com.surplusiq.app.ui.screens.orders.OrderLockStatusScreen
import com.surplusiq.app.ui.screens.orders.ReceiptScreen
import com.surplusiq.app.ui.screens.orders.ReorderScreen
import com.surplusiq.app.ui.screens.postpurchase.ComplaintDetailScreen
import com.surplusiq.app.ui.screens.postpurchase.ComplaintListScreen
import com.surplusiq.app.ui.screens.postpurchase.MyReviewsScreen
import com.surplusiq.app.ui.screens.postpurchase.ReportTarget
import com.surplusiq.app.ui.screens.postpurchase.ReportViolationScreen
import com.surplusiq.app.ui.screens.profile.EditProfileScreen
import com.surplusiq.app.ui.screens.profile.NotificationSettingsScreen
import com.surplusiq.app.ui.screens.profile.TransactionHistoryScreen
import com.surplusiq.app.ui.screens.rewards.PromotionWalletScreen
import com.surplusiq.app.ui.viewmodel.PromotionWalletViewModel

sealed class AppDestination {
    object MainTabs : AppDestination()
    data class DealDetail(val deal: Deal, val back: AppDestination = MainTabs) : AppDestination()
    object Preferences : AppDestination()
    data class CheckoutHold(val deal: Deal) : AppDestination()
    data class PickupPass(val order: ActiveOrder) : AppDestination()
    object MyOrders : AppDestination()
    data class OrderDetail(val order: ActiveOrder) : AppDestination()
    data class CreateReview(val order: ActiveOrder) : AppDestination()
    data class CreateComplaint(val order: ActiveOrder) : AppDestination()
    object ChangePassword : AppDestination()
    object Rewards : AppDestination()
    object RescueBasket : AppDestination()
    object BasketDetail : AppDestination()
    object BasketCheckout : AppDestination()
    object Notifications : AppDestination()
    object SupportTickets : AppDestination()
    data class SupportTicketDetail(val ticketId: String) : AppDestination()
    object RescuePoolList : AppDestination()
    data class RescuePoolDetail(val poolId: String) : AppDestination()
    object Impact : AppDestination()
    object AiChat : AppDestination()
    object PrivacyData : AppDestination()
    object HelpCenter : AppDestination()
    data class OrderReceipt(val order: ActiveOrder) : AppDestination()
    data class Reorder(val order: ActiveOrder) : AppDestination()
    object OrderLockStatus : AppDestination()
    object ComplaintList : AppDestination()
    data class ComplaintDetail(val complaintId: String) : AppDestination()
    object MyReviews : AppDestination()
    data class ReportViolation(val order: ActiveOrder) : AppDestination()
    object TransactionHistory : AppDestination()
    object PromotionWallet : AppDestination()
    // Nhóm "Truy cập và vị trí" + "Khám phá deal" (K06-K08, K14, K16-K20)
    object LocationSettings : AppDestination()
    object SavedPlaces : AppDestination()
    object PinLocation : AppDestination()
    data class StoreDetail(val storeId: String, val back: AppDestination = MainTabs) : AppDestination()
    object SavedDeals : AppDestination()
    data class CompareDeals(val dealIds: List<String>) : AppDestination()
    object DealAlerts : AppDestination()
    data class DealAlertEdit(val alert: DealAlert?) : AppDestination()
    object DietaryProfile : AppDestination()
    object Search : AppDestination()
    data class StoreReviews(val storeId: String, val back: AppDestination = MainTabs) : AppDestination()
    object EditProfile : AppDestination()
    object NotificationSettings : AppDestination()
}

enum class AuthScreenState {
    WELCOME,
    LOGIN,
    REGISTER,
    FORGOT_PASSWORD,
    RESET_PASSWORD
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SurplusAppRoot(
    discoveryViewModel: DiscoveryViewModel = hiltViewModel(),
    authViewModel: AuthViewModel = hiltViewModel(),
    myOrdersViewModel: MyOrdersViewModel = hiltViewModel(),
    interactionsViewModel: InteractionsViewModel = hiltViewModel(),
    rewardsViewModel: RewardsViewModel = hiltViewModel(),
    notificationsViewModel: NotificationsViewModel = hiltViewModel(),
    rescuePoolViewModel: RescuePoolViewModel = hiltViewModel(),
    profileViewModel: ProfileViewModel = hiltViewModel(),
    promotionWalletViewModel: PromotionWalletViewModel = hiltViewModel(),
    placesViewModel: PlacesViewModel = hiltViewModel(),
    storeViewModel: StoreViewModel = hiltViewModel(),
    savedDealsViewModel: SavedDealsViewModel = hiltViewModel(),
    dealAlertsViewModel: DealAlertsViewModel = hiltViewModel()
) {
    val placesState by placesViewModel.uiState.collectAsState()
    val storeState by storeViewModel.uiState.collectAsState()
    val savedDealsState by savedDealsViewModel.uiState.collectAsState()
    val dealAlertsState by dealAlertsViewModel.uiState.collectAsState()
    val rescuePoolState by rescuePoolViewModel.uiState.collectAsState()
    val context = LocalContext.current
    val coroutineScope = rememberCoroutineScope()
    val authState by authViewModel.uiState.collectAsState()
    val discoveryState by discoveryViewModel.uiState.collectAsState()
    val myOrdersState by myOrdersViewModel.uiState.collectAsState()
    val rewardsState by rewardsViewModel.uiState.collectAsState()
    val notificationsState by notificationsViewModel.uiState.collectAsState()
    val interactionsState by interactionsViewModel.uiState.collectAsState()
    val profileUiState by profileViewModel.uiState.collectAsState()
    val promotionWalletState by promotionWalletViewModel.uiState.collectAsState()
    // Đơn thật đã biết trong phiên - để ghép mã đơn/cửa hàng cho các màn chỉ có orderId.
    val knownOrders = myOrdersState.activeOrders + myOrdersState.pastOrders

    LaunchedEffect(authState.isLoggedIn) {
        if (authState.isLoggedIn) {
            notificationsViewModel.load()
            // shortcut: call this once Firebase Messaging is added (needs google-services.json from
            // Firebase console for package com.surplusiq.app, project surplusiq-dev per .env's FCM_PROJECT_ID)
            // and FirebaseMessaging.getInstance().token is available
            // notificationsViewModel's repository exposes registerFcmToken(token, deviceId) for this.
        }
    }

    val dealsList = discoveryState.deals
    val displayName = profileUiState.userProfile?.fullName?.takeIf { it.isNotBlank() } ?: authState.fullName
    LaunchedEffect(authState.isLoggedIn) { if (authState.isLoggedIn) profileViewModel.loadProfile() }
    var selectedTab by remember { mutableStateOf(NavTab.DISCOVER) }
    LaunchedEffect(selectedTab, authState.isLoggedIn) { if (selectedTab == NavTab.ME && authState.isLoggedIn) interactionsViewModel.loadImpact() }
    var currentDestination by remember { mutableStateOf<AppDestination>(AppDestination.MainTabs) }
    var authScreenState by remember { mutableStateOf(AuthScreenState.WELCOME) }
    
    // K06: lần đầu vào app (đăng nhập hoặc khách) mà chưa thiết lập vị trí -> màn quyền vị trí & bán kính.
    LaunchedEffect(authState.isLoggedIn, authState.isGuestMode) {
        if ((authState.isLoggedIn || authState.isGuestMode) && !placesViewModel.isLocationConfigured()) {
            placesViewModel.startSelection()
            currentDestination = AppDestination.LocationSettings
        }
    }

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
                AuthScreenState.WELCOME -> {
                    WelcomeScreen(
                        onLoginClick = { authScreenState = AuthScreenState.LOGIN },
                        onRegisterClick = { authScreenState = AuthScreenState.REGISTER }
                    )
                }

                AuthScreenState.LOGIN -> {
                    LoginScreen(
                        state = authState,
                        onPhoneChange = { authViewModel.onPhoneChanged(it) },
                        onPasswordChange = { authViewModel.onPasswordChanged(it) },
                        onLoginClick = { authViewModel.login() },
                        onNavigateToRegister = { authScreenState = AuthScreenState.REGISTER },
                        onNavigateToForgotPassword = {
                            authViewModel.resetForgotPasswordFlow()
                            authScreenState = AuthScreenState.FORGOT_PASSWORD
                        },
                        onContinueAsGuest = { authViewModel.continueAsGuest() },
                        onGoogleLoginClick = {
                            coroutineScope.launch {
                                try {
                                    val idToken = GoogleSignInHelper.requestIdToken(context)
                                    authViewModel.loginWithGoogle(idToken)
                                } catch (e: GetCredentialException) {
                                    authViewModel.onGoogleSignInFailed(
                                        e.localizedMessage ?: "Đăng nhập Google thất bại"
                                    )
                                }
                            }
                        },
                        onBackClick = { authScreenState = AuthScreenState.WELCOME }
                    )
                }

                AuthScreenState.FORGOT_PASSWORD -> {
                    LaunchedEffect(authState.isForgotCodeSent) {
                        if (authState.isForgotCodeSent) {
                            authScreenState = AuthScreenState.RESET_PASSWORD
                        }
                    }
                    ForgotPasswordScreen(
                        state = authState,
                        onTargetChange = { authViewModel.onForgotTargetChanged(it) },
                        onSendCodeClick = { authViewModel.requestPasswordReset() },
                        onBackClick = { authScreenState = AuthScreenState.LOGIN }
                    )
                }

                AuthScreenState.RESET_PASSWORD -> {
                    ResetPasswordScreen(
                        state = authState,
                        onOtpChange = { authViewModel.onResetOtpChanged(it) },
                        onNewPasswordChange = { authViewModel.onNewPasswordChanged(it) },
                        onConfirmPasswordChange = { authViewModel.onConfirmNewPasswordChanged(it) },
                        onResetClick = { authViewModel.confirmPasswordReset() },
                        onBackClick = { authScreenState = AuthScreenState.FORGOT_PASSWORD },
                        onDone = {
                            authViewModel.resetForgotPasswordFlow()
                            authScreenState = AuthScreenState.LOGIN
                        }
                    )
                }

                AuthScreenState.REGISTER -> {
                    RegisterScreen(
                        state = authState,
                        onFullNameChange = { authViewModel.onFullNameChanged(it) },
                        onPhoneChange = { authViewModel.onPhoneChanged(it) },
                        onPasswordChange = { authViewModel.onPasswordChanged(it) },
                        onRegisterClick = { authViewModel.register() },
                        onBackToLogin = { authScreenState = AuthScreenState.LOGIN },
                        onGoogleRegisterClick = {
                            coroutineScope.launch {
                                try {
                                    val idToken = GoogleSignInHelper.requestIdToken(context)
                                    authViewModel.loginWithGoogle(idToken)
                                } catch (e: GetCredentialException) {
                                    authViewModel.onGoogleSignInFailed(
                                        e.localizedMessage ?: "Đăng nhập Google thất bại"
                                    )
                                }
                            }
                        }
                    )
                }

            }
        }
        return
    }

    when (val dest = currentDestination) {
        is AppDestination.DealDetail -> {
            // K17: ghi lịch sử xem + biết deal đã lưu chưa (chỉ khi đã đăng nhập; khách không có danh sách).
            LaunchedEffect(dest.deal.id) {
                if (authState.isLoggedIn) {
                    discoveryViewModel.recordDealView(dest.deal.id)
                    savedDealsViewModel.loadSaved()
                }
            }
            val isSaved = dest.deal.id in savedDealsState.savedIds
            DealDetailScreen(
                deal = dest.deal,
                onBackClick = { currentDestination = dest.back },
                isSaved = isSaved,
                onToggleSaved = if (authState.isLoggedIn) {
                    { savedDealsViewModel.setSaved(dest.deal.id, !isSaved) }
                } else null,
                onOpenStore = dest.deal.storeId.takeIf { it.isNotBlank() }?.let { storeId ->
                    {
                        storeViewModel.openStore(storeId)
                        currentDestination = AppDestination.StoreDetail(storeId, back = dest)
                    }
                },
                onReserveClick = { selectedDeal ->
                    currentDestination = AppDestination.CheckoutHold(selectedDeal)
                },
                trustpass = discoveryState.trustpass,
                isTrustpassLoading = discoveryState.isTrustpassLoading,
                trustpassErrorMessage = discoveryState.trustpassErrorMessage,
                onLoadTrustpass = { discoveryViewModel.loadTrustpass(dest.deal.id) },
                userAllergens = profileUiState.allergens
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
                onBrowseDeals = { currentDestination = AppDestination.MainTabs },
                onPaymentSuccess = { createdOrder ->
                    myOrdersViewModel.loadOrders()
                    currentDestination = AppDestination.PickupPass(createdOrder)
                }
            )
        }

        is AppDestination.PickupPass -> {
            PickupPassScreen(
                order = dest.order,
                onBackClick = { currentDestination = AppDestination.MainTabs },
                onNavigateToReview = { order -> currentDestination = AppDestination.CreateReview(order) },
                onNavigateToComplaint = { order -> currentDestination = AppDestination.CreateComplaint(order) }
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
                ordersState = myOrdersState,
                onPrepareCancel = { orderId -> myOrdersViewModel.prepareCancel(orderId) },
                onConfirmCancel = { orderId, reason -> myOrdersViewModel.confirmCancel(orderId, reason) },
                onOpenReceipt = { order ->
                    myOrdersViewModel.loadReceipt(order.id)
                    currentDestination = AppDestination.OrderReceipt(order)
                },
                onOpenReorder = { order ->
                    myOrdersViewModel.checkReorder(order.id)
                    currentDestination = AppDestination.Reorder(order)
                },
                onOpenReport = { order ->
                    interactionsViewModel.resetViolationReport()
                    currentDestination = AppDestination.ReportViolation(order)
                },
                onOpenReview = { order -> currentDestination = AppDestination.CreateReview(order) },
                onOpenComplaint = { order -> currentDestination = AppDestination.CreateComplaint(order) },
                proxyCode = myOrdersState.proxyCode,
                isProxyCodeLoading = myOrdersState.isProxyCodeLoading,
                proxyCodeError = myOrdersState.proxyCodeError,
                onLoadProxyCode = { orderId -> myOrdersViewModel.loadProxyCode(orderId) },
                onCreateProxyCode = { orderId -> myOrdersViewModel.createProxyCode(orderId) },
                onRevokeProxyCode = { orderId -> myOrdersViewModel.revokeProxyCode(orderId) }
            )
        }

        is AppDestination.CreateReview -> {
            CreateReviewScreen(
                order = dest.order,
                interactionsRepository = interactionsViewModel.interactionsRepository,
                onBackClick = { currentDestination = AppDestination.OrderDetail(dest.order) },
                onSubmitSuccess = {
                    myOrdersViewModel.loadOrders()
                    currentDestination = AppDestination.MyOrders
                }
            )
        }

        is AppDestination.CreateComplaint -> {
            CreateComplaintScreen(
                order = dest.order,
                interactionsRepository = interactionsViewModel.interactionsRepository,
                onUploadEvidence = { bytes, fileName, callback ->
                    interactionsViewModel.uploadEvidence(bytes, fileName, onResult = callback)
                },
                onBackClick = { currentDestination = AppDestination.OrderDetail(dest.order) },
                onSubmitSuccess = {
                    myOrdersViewModel.loadOrders()
                    currentDestination = AppDestination.MyOrders
                }
            )
        }

        is AppDestination.ChangePassword -> {
            ChangePasswordScreen(
                state = authState,
                onCurrentPasswordChange = { authViewModel.onCurrentPasswordChanged(it) },
                onNewPasswordChange = { authViewModel.onNewChangePasswordChanged(it) },
                onConfirmPasswordChange = { authViewModel.onConfirmChangePasswordChanged(it) },
                onChangeClick = { authViewModel.changePassword() },
                onBackClick = {
                    authViewModel.resetChangePasswordFlow()
                    currentDestination = AppDestination.MainTabs
                },
                onSuccess = {
                    authViewModel.resetChangePasswordFlow()
                    currentDestination = AppDestination.MainTabs
                }
            )
        }

        is AppDestination.Rewards -> {
            RewardsScreen(
                state = rewardsState,
                onBackClick = { currentDestination = AppDestination.MainTabs },
                onRetry = { rewardsViewModel.load() }
            )
        }

        is AppDestination.Notifications -> {
            NotificationsScreen(
                state = notificationsState,
                onBackClick = { currentDestination = AppDestination.MainTabs },
                onRetry = { notificationsViewModel.load() },
                onNotificationClick = { notification -> notificationsViewModel.markAsRead(notification.id) },
                onMarkAllRead = { notificationsViewModel.markAllAsRead() },
                onSaveSettings = { settings -> notificationsViewModel.saveSettings(settings) }
            )
        }

        is AppDestination.SupportTickets -> {
            SupportTicketListScreen(
                tickets = interactionsState.supportTickets,
                isLoading = interactionsState.isSupportTicketsLoading,
                errorMessage = interactionsState.supportTicketsError,
                onBackClick = { currentDestination = AppDestination.MainTabs },
                onTicketClick = { ticket ->
                    interactionsViewModel.loadSupportTicketDetail(ticket.id)
                    currentDestination = AppDestination.SupportTicketDetail(ticket.id)
                },
                onCreateTicket = { subject, message ->
                    interactionsViewModel.createSupportTicket(subject, message) {}
                }
            )
        }

        is AppDestination.SupportTicketDetail -> {
            SupportTicketDetailScreen(
                detail = interactionsState.selectedTicket,
                isLoading = interactionsState.isTicketDetailLoading,
                errorMessage = interactionsState.ticketDetailError,
                isSending = interactionsState.isSendingTicketMessage,
                onBackClick = { currentDestination = AppDestination.SupportTickets },
                onSendMessage = { message -> interactionsViewModel.sendSupportMessage(dest.ticketId, message) },
                onCloseTicket = { interactionsViewModel.closeSupportTicket(dest.ticketId) }
            )
        }

        is AppDestination.RescueBasket -> {
            RescueBasketScreen(
                suggestions = discoveryState.basketSuggestions,
                isLoading = discoveryState.isBasketLoading,
                errorMessage = discoveryState.basketErrorMessage,
                onBackClick = { currentDestination = AppDestination.MainTabs },
                onSuggest = { budget, people -> discoveryViewModel.suggestBasket(budget, people) },
                onSelectBasket = { basket ->
                    discoveryViewModel.initCustomBasket(basket, discoveryState.deals)
                    currentDestination = AppDestination.BasketDetail
                }
            )
        }

        is AppDestination.BasketDetail -> {
            BasketDetailScreen(
                storeName = discoveryState.activeBasketStoreName ?: "Cửa hàng",
                items = discoveryState.customBasketItems,
                userAllergens = profileUiState.allergens,
                availableSubstitutes = discoveryState.availableSubstitutes,
                isSubstitutesLoading = discoveryState.isSubstitutesLoading,
                substitutesError = discoveryState.substitutesErrorMessage,
                onBackClick = { currentDestination = AppDestination.RescueBasket },
                onQuantityChange = { offerId, qty -> discoveryViewModel.updateBasketItemQuantity(offerId, qty) },
                onRemoveItem = { offerId -> discoveryViewModel.removeBasketItem(offerId) },
                onRequestSubstitutes = {
                    discoveryViewModel.loadSubstitutes(profileUiState.allergens)
                },
                onApplySubstitute = { oldOfferId, sub -> discoveryViewModel.substituteItem(oldOfferId, sub) },
                onProceedToCheckout = { currentDestination = AppDestination.BasketCheckout }
            )
        }

        is AppDestination.BasketCheckout -> {
            BasketCheckoutScreen(
                storeName = discoveryState.activeBasketStoreName ?: "Cửa hàng",
                items = discoveryState.customBasketItems,
                isCheckingOut = discoveryState.isCheckingOutBasket,
                checkoutResult = discoveryState.basketCheckoutResult,
                checkoutError = discoveryState.basketCheckoutError,
                onBackClick = { currentDestination = AppDestination.BasketDetail },
                onConfirmCheckout = { pickupWindow, notes ->
                    discoveryViewModel.checkoutBasket(pickupWindow, notes)
                },
                onNavigateToMyOrders = {
                    myOrdersViewModel.loadOrders()
                    currentDestination = AppDestination.MyOrders
                }
            )
        }

        is AppDestination.RescuePoolList -> {
            RescuePoolListScreen(
                state = rescuePoolState,
                onBackClick = { currentDestination = AppDestination.MainTabs },
                onSearch = { area -> rescuePoolViewModel.loadPools(area) },
                onPoolClick = { pool ->
                    rescuePoolViewModel.openPool(pool.id)
                    currentDestination = AppDestination.RescuePoolDetail(pool.id)
                }
            )
        }

        is AppDestination.RescuePoolDetail -> {
            RescuePoolDetailScreen(
                state = rescuePoolState,
                onBackClick = {
                    rescuePoolViewModel.loadPools()
                    currentDestination = AppDestination.RescuePoolList
                },
                onRetry = { rescuePoolViewModel.refreshPool(dest.poolId) },
                onRegister = { qty, budget, start, end -> rescuePoolViewModel.register(dest.poolId, qty, budget, start, end) },
                onUpdate = { qty, budget, start, end -> rescuePoolViewModel.updateRegistration(dest.poolId, qty, budget, start, end) },
                onWithdraw = { reason -> rescuePoolViewModel.withdraw(dest.poolId, reason) },
                onConfirmOffer = { version -> rescuePoolViewModel.confirmOffer(dest.poolId, version) },
                onOpenMyOrders = {
                    myOrdersViewModel.loadOrders()
                    currentDestination = AppDestination.MyOrders
                }
            )
        }

        is AppDestination.Impact -> {
            ImpactScreen(
                impact = interactionsState.impact,
                isImpactLoading = interactionsState.isImpactLoading,
                impactError = interactionsState.impactError,
                badges = interactionsState.impactBadges,
                isBadgesLoading = interactionsState.isBadgesLoading,
                badgesError = interactionsState.badgesError,
                onBackClick = { currentDestination = AppDestination.MainTabs },
                onRetry = {
                    interactionsViewModel.loadImpact()
                    interactionsViewModel.loadImpactBadges()
                }
            )
        }

        is AppDestination.PrivacyData -> {
            PrivacyDataScreen(
                state = profileUiState,
                onBackClick = { currentDestination = AppDestination.MainTabs },
                onExportData = { profileViewModel.exportUserData() },
                onRequestDelete = { profileViewModel.requestAccountDelete() },
                onCancelDelete = { profileViewModel.cancelAccountDelete() }
            )
        }

        is AppDestination.HelpCenter -> {
            HelpCenterScreen(
                categories = interactionsState.faqCategories,
                isLoading = interactionsState.isFaqLoading,
                errorMessage = interactionsState.faqError,
                onBackClick = { currentDestination = AppDestination.MainTabs },
                onRetry = { interactionsViewModel.loadHelpCenterFaq() }
            )
        }

        is AppDestination.OrderReceipt -> {
            ReceiptScreen(
                receipt = myOrdersState.receipt,
                isLoading = myOrdersState.isReceiptLoading,
                errorMessage = myOrdersState.receiptError,
                onBackClick = { currentDestination = AppDestination.OrderDetail(dest.order) },
                onRetry = { myOrdersViewModel.loadReceipt(dest.order.id) }
            )
        }

        is AppDestination.Reorder -> {
            ReorderScreen(
                oldOrder = dest.order,
                state = myOrdersState,
                onBackClick = { currentDestination = AppDestination.OrderDetail(dest.order) },
                onRetry = { myOrdersViewModel.checkReorder(dest.order.id) },
                onQuickOrder = { deal -> currentDestination = AppDestination.CheckoutHold(deal) },
                onBrowseDeals = { currentDestination = AppDestination.MainTabs }
            )
        }

        is AppDestination.OrderLockStatus -> {
            OrderLockStatusScreen(
                lock = profileUiState.orderLock,
                isLoading = profileUiState.isOrderLockLoading,
                errorMessage = profileUiState.orderLockError,
                knownOrders = knownOrders,
                onBackClick = { currentDestination = AppDestination.MainTabs },
                onRetry = { profileViewModel.loadOrderLock() }
            )
        }

        is AppDestination.ComplaintList -> {
            ComplaintListScreen(
                complaints = interactionsState.complaints,
                isLoading = interactionsState.isLoading,
                errorMessage = interactionsState.errorMessage,
                onBackClick = { currentDestination = AppDestination.MainTabs },
                onRetry = { interactionsViewModel.loadComplaints() },
                onComplaintClick = { complaint ->
                    interactionsViewModel.loadComplaintDetail(complaint.id)
                    currentDestination = AppDestination.ComplaintDetail(complaint.id)
                }
            )
        }

        is AppDestination.ComplaintDetail -> {
            ComplaintDetailScreen(
                complaint = interactionsState.selectedComplaint?.takeIf { it.id == dest.complaintId },
                isLoading = interactionsState.isComplaintDetailLoading,
                errorMessage = interactionsState.complaintDetailError,
                isActionLoading = interactionsState.isComplaintActionLoading,
                actionMessage = interactionsState.complaintActionMessage,
                onBackClick = { currentDestination = AppDestination.ComplaintList },
                onRetry = { interactionsViewModel.loadComplaintDetail(dest.complaintId) },
                onAddEvidence = { urls -> interactionsViewModel.addComplaintEvidence(dest.complaintId, urls) },
                onWithdraw = { interactionsViewModel.withdrawComplaint(dest.complaintId) }
            )
        }

        is AppDestination.MyReviews -> {
            MyReviewsScreen(
                state = interactionsState,
                onLoad = { interactionsViewModel.loadMyReviews() },
                onUpdateReview = { id, rating, comment -> interactionsViewModel.updateMyReview(id, rating, comment) },
                onHideReview = { id -> interactionsViewModel.hideMyReview(id) },
                onConsumeMessage = { interactionsViewModel.consumeReviewActionMessage() },
                onBackClick = { currentDestination = AppDestination.MainTabs }
            )
        }

        is AppDestination.ReportViolation -> {
            val targets = knownOrders.ifEmpty { listOf(dest.order) }.flatMap { order ->
                listOf(
                    ReportTarget("STORE", order.deal.storeId, order.deal.storeName),
                    ReportTarget("DEAL", order.deal.id, "${order.deal.title} - ${order.deal.storeName}")
                )
            }.distinctBy { it.type to it.id }
            ReportViolationScreen(
                targets = targets,
                initialTargetId = dest.order.deal.storeId,
                isSubmitting = interactionsState.isReportSubmitting,
                errorMessage = interactionsState.reportError,
                submitted = interactionsState.submittedReport,
                onBackClick = { currentDestination = AppDestination.OrderDetail(dest.order) },
                onSubmit = { type, id, reason -> interactionsViewModel.submitViolationReport(type, id, reason) }
            )
        }

        is AppDestination.TransactionHistory -> {
            TransactionHistoryScreen(
                transactions = profileUiState.transactions,
                isLoading = profileUiState.isTransactionsLoading,
                errorMessage = profileUiState.transactionsError,
                knownOrders = knownOrders,
                onBackClick = { currentDestination = AppDestination.MainTabs },
                onRetry = { profileViewModel.loadTransactions() }
            )
        }

        is AppDestination.PromotionWallet -> {
            PromotionWalletScreen(
                state = promotionWalletState,
                onBackClick = { currentDestination = AppDestination.MainTabs },
                onRetry = { promotionWalletViewModel.load() },
                onClaim = { code -> promotionWalletViewModel.claim(code) }
            )
        }

        is AppDestination.LocationSettings -> {
            LocationSettingsScreen(
                state = placesState,
                onBackClick = { currentDestination = AppDestination.MainTabs },
                onUseDeviceLocation = { placesViewModel.useDeviceLocation() },
                onSearchAddress = { placesViewModel.searchAddress(it) },
                onSelectSuggestion = { placesViewModel.selectSuggestion(it) },
                onApply = { radius ->
                    placesViewModel.applyLocation(radius)
                    currentDestination = AppDestination.MainTabs
                },
                onOpenSavedPlaces = {
                    placesViewModel.loadSavedPlaces()
                    currentDestination = AppDestination.SavedPlaces
                },
                onOpenPinLocation = {
                    placesViewModel.startSelection()
                    currentDestination = AppDestination.PinLocation
                },
                onConsumeMessage = { placesViewModel.consumeMessage() }
            )
        }

        is AppDestination.SavedPlaces -> {
            SavedPlacesScreen(
                state = placesState,
                onBackClick = {
                    placesViewModel.startSelection()
                    currentDestination = AppDestination.LocationSettings
                },
                onRetry = { placesViewModel.loadSavedPlaces() },
                onUsePlace = { place ->
                    placesViewModel.applySavedPlace(place)
                    currentDestination = AppDestination.MainTabs
                },
                onDeletePlace = { placesViewModel.deletePlace(it) },
                onStartAdd = { placesViewModel.clearSelection() },
                onSearchAddress = { placesViewModel.searchAddress(it) },
                onSelectSuggestion = { placesViewModel.selectSuggestion(it) },
                onUseDeviceLocation = { placesViewModel.useDeviceLocation() },
                onCreatePlace = { label, radius, onSuccess -> placesViewModel.createPlace(label, radius, onSuccess) },
                onConsumeMessage = { placesViewModel.consumeMessage() }
            )
        }

        is AppDestination.PinLocation -> {
            PinLocationScreen(
                state = placesState,
                onBackClick = {
                    placesViewModel.startSelection()
                    currentDestination = AppDestination.LocationSettings
                },
                onPinMoved = { lat, lng -> placesViewModel.onPinMoved(lat, lng) },
                onSearchAddress = { placesViewModel.searchAddress(it) },
                onSelectSuggestion = { placesViewModel.selectSuggestion(it) },
                onViewDealsHere = { radius ->
                    placesViewModel.applyLocation(radius, temporary = true)
                    selectedTab = NavTab.DISCOVER
                    currentDestination = AppDestination.MainTabs
                },
                onSaveAsPlace = { label, radius -> placesViewModel.createPlace(label, radius) },
                onConsumeMessage = { placesViewModel.consumeMessage() }
            )
        }

        is AppDestination.StoreDetail -> {
            StoreDetailScreen(
                state = storeState,
                onBackClick = { currentDestination = dest.back },
                onRetry = { storeViewModel.openStore(dest.storeId) },
                onToggleFavorite = { storeViewModel.toggleFavorite(it) },
                onReport = { storeId, reason -> storeViewModel.reportStore(storeId, reason) },
                onDealClick = { deal -> currentDestination = AppDestination.DealDetail(deal, back = dest) },
                onConsumeMessage = { storeViewModel.consumeMessage() },
                onOpenReviews = { storeId -> currentDestination = AppDestination.StoreReviews(storeId, back = dest) }
            )
        }

        is AppDestination.StoreReviews -> {
            StoreReviewsScreen(
                storeId = dest.storeId,
                state = storeState,
                onLoadReviews = { storeId, rating -> storeViewModel.loadStoreReviews(storeId, rating) },
                onBackClick = { currentDestination = dest.back }
            )
        }

        is AppDestination.EditProfile -> {
            EditProfileScreen(
                viewModel = profileViewModel,
                onBackClick = { currentDestination = AppDestination.MainTabs }
            )
        }

        is AppDestination.NotificationSettings -> {
            NotificationSettingsScreen(
                viewModel = notificationsViewModel,
                onBackClick = { currentDestination = AppDestination.MainTabs }
            )
        }

        is AppDestination.SavedDeals -> {
            SavedDealsScreen(
                state = savedDealsState,
                onBackClick = { currentDestination = AppDestination.MainTabs },
                onLoadSaved = { savedDealsViewModel.loadSaved() },
                onLoadHistory = { savedDealsViewModel.loadHistory() },
                onUnsave = { savedDealsViewModel.setSaved(it, false) },
                onDealClick = { deal -> currentDestination = AppDestination.DealDetail(deal, back = AppDestination.SavedDeals) },
                onCompare = { ids ->
                    savedDealsViewModel.compare(ids)
                    currentDestination = AppDestination.CompareDeals(ids)
                },
                onConsumeMessage = { savedDealsViewModel.consumeMessage() }
            )
        }

        is AppDestination.CompareDeals -> {
            CompareDealsScreen(
                deals = savedDealsState.compareDeals,
                isLoading = savedDealsState.isCompareLoading,
                errorMessage = savedDealsState.compareError,
                onRetry = { savedDealsViewModel.compare(dest.dealIds) },
                onBackClick = { currentDestination = AppDestination.SavedDeals }
            )
        }

        is AppDestination.DealAlerts -> {
            DealAlertsScreen(
                state = dealAlertsState,
                onBackClick = { currentDestination = AppDestination.MainTabs },
                onRetry = { dealAlertsViewModel.load() },
                onCreate = { currentDestination = AppDestination.DealAlertEdit(null) },
                onEdit = { currentDestination = AppDestination.DealAlertEdit(it) },
                onToggle = { alert, active -> dealAlertsViewModel.setActive(alert, active) },
                onDelete = { dealAlertsViewModel.delete(it) },
                onConsumeMessage = { dealAlertsViewModel.consumeMessage() }
            )
        }

        is AppDestination.DealAlertEdit -> {
            DealAlertEditScreen(
                alert = dest.alert,
                defaultRadiusKm = discoveryState.location.radiusKm,
                state = dealAlertsState,
                onBackClick = { currentDestination = AppDestination.DealAlerts },
                onSearchStores = { dealAlertsViewModel.searchStores(it) },
                onSave = { criteria, isActive ->
                    dealAlertsViewModel.save(dest.alert?.id, criteria, isActive) {
                        currentDestination = AppDestination.DealAlerts
                    }
                }
            )
        }

        is AppDestination.AiChat -> {
            SaveBiteAiSheet(
                allDeals = dealsList,
                onDealClick = { deal -> currentDestination = AppDestination.DealDetail(deal) },
                onClose = { currentDestination = AppDestination.MainTabs }
            )
        }

        is AppDestination.DietaryProfile -> {
            DietaryProfileScreen(
                state = profileUiState,
                onBackClick = { currentDestination = AppDestination.MainTabs },
                onSaveProfile = { allergens, excludedItems ->
                    profileViewModel.saveDietaryProfile(allergens, excludedItems)
                },
                onRetryLoad = { profileViewModel.loadDietaryProfile() }
            )
        }

        is AppDestination.Search -> {
            SearchScreen(
                allDeals = dealsList,
                onBackClick = { currentDestination = AppDestination.MainTabs },
                onDealClick = { deal ->
                    currentDestination = AppDestination.DealDetail(deal, back = AppDestination.Search)
                },
                onFavoriteToggle = { discoveryViewModel.toggleFavorite(it) },
                userLatitude = discoveryState.location.latitude,
                userLongitude = discoveryState.location.longitude
            )
        }

        is AppDestination.MainTabs -> {
            Scaffold(
                bottomBar = {
                    SurplusBottomNav(
                        selectedTab = selectedTab,
                        onTabSelected = { selectedTab = it },
                        onBasketClick = { currentDestination = AppDestination.RescueBasket }
                    )
                }
            ) { innerPadding ->
                Box(modifier = Modifier.padding(innerPadding)) {
                    when (selectedTab) {
                        NavTab.DISCOVER -> {
                            DiscoverHomeScreen(
                                deals = dealsList,
                                userName = displayName,
                                onOpenProfile = { selectedTab = NavTab.ME },
                                onDealClick = { deal ->
                                    currentDestination = AppDestination.DealDetail(deal)
                                },
                                onFavoriteToggle = { discoveryViewModel.toggleFavorite(it) },
                                onOpenPreferences = {
                                    currentDestination = AppDestination.Preferences
                                },
                                onSeeAllClick = { selectedTab = NavTab.BROWSE },
                                unreadNotificationCount = notificationsState.unreadCount,
                                onOpenNotifications = { currentDestination = AppDestination.Notifications },
                                location = discoveryState.location,
                                onOpenLocation = {
                                    placesViewModel.startSelection()
                                    currentDestination = AppDestination.LocationSettings
                                },
                                onClearTemporaryLocation = { discoveryViewModel.clearTemporaryLocation() },
                                mapPins = discoveryState.mapPins,
                                isMapLoading = discoveryState.isMapLoading,
                                mapErrorMessage = discoveryState.mapErrorMessage,
                                onLoadMap = { discoveryViewModel.loadMapPins() },
                                onOpenStore = { storeId ->
                                    storeViewModel.openStore(storeId)
                                    currentDestination = AppDestination.StoreDetail(storeId)
                                },
                                isLoading = discoveryState.isLoading,
                                errorMessage = discoveryState.errorMessage,
                                onRetry = { discoveryViewModel.loadDeals() },
                                onOpenSearch = { currentDestination = AppDestination.Search },
                                currentSortBy = discoveryState.sortBy,
                                currentMinDiscount = discoveryState.minDiscountPercent,
                                onApplyFilterSort = { sortBy, minDiscount ->
                                    discoveryViewModel.updateFilterSort(minDiscount, sortBy)
                                },
                                onResetFilterSort = {
                                    discoveryViewModel.resetFilterSort()
                                }
                            )
                        }

                        NavTab.BROWSE -> {
                            BrowseScreen(
                                deals = dealsList,
                                onBackClick = { selectedTab = NavTab.DISCOVER },
                                onDealClick = { deal ->
                                    currentDestination = AppDestination.DealDetail(deal)
                                },
                                onFavoriteToggle = { discoveryViewModel.toggleFavorite(it) },
                                radarDeals = discoveryState.radarDeals,
                                isRadarLoading = discoveryState.isRadarLoading,
                                radarErrorMessage = discoveryState.radarErrorMessage,
                                onLoadRadar = { discoveryViewModel.loadRadarRanking() },
                                onOpenSavedDeals = { currentDestination = AppDestination.SavedDeals }
                            )
                        }

                        NavTab.FAVOURITES -> {
                            FavouritesScreen(
                                state = storeState,
                                onLoad = { storeViewModel.loadFavorites() },
                                onStoreClick = { storeId ->
                                    storeViewModel.openStore(storeId)
                                    currentDestination = AppDestination.StoreDetail(storeId)
                                },
                                onRemoveFavorite = { storeViewModel.removeFavorite(it) },
                                onUndoRemove = { store, index -> storeViewModel.undoFavoriteRemoval(store, index) },
                                onOpenSavedDeals = { currentDestination = AppDestination.SavedDeals },
                                onOpenDealAlerts = {
                                    dealAlertsViewModel.load()
                                    currentDestination = AppDestination.DealAlerts
                                },
                                onConsumeMessage = { storeViewModel.consumeMessage() }
                            )
                        }

                        NavTab.ME -> {
                            ProfileScreen(
                                userName = displayName,
                                userPhone = profileUiState.userProfile?.phone?.takeIf { it.isNotBlank() } ?: authState.phone,
                                avatarUrl = profileUiState.userProfile?.avatarUrl,
                                onOpenEditProfile = { currentDestination = AppDestination.EditProfile },
                                // shortcut: API chưa có CO2, ước tính 2.5 kg CO2/kg thực phẩm; thay bằng số liệu server khi có
                                stats = interactionsState.impact?.let {
                                    UserImpactStats(
                                        totalSavedMoneyVnd = it.totalSavingsVnd,
                                        totalRescuedKg = it.totalFoodSavedKg,
                                        totalReducedCo2Kg = it.totalFoodSavedKg * 2.5,
                                        totalRescuedBags = it.totalOrders
                                    )
                                },
                                onOpenPreferences = { currentDestination = AppDestination.Preferences },
                                onOpenAiChat = { currentDestination = AppDestination.AiChat },
                                onOpenMyOrders = {
                                    myOrdersViewModel.loadOrders()
                                    currentDestination = AppDestination.MyOrders
                                },
                                onOpenChangePassword = {
                                    currentDestination = AppDestination.ChangePassword
                                },
                                onOpenRewards = {
                                    rewardsViewModel.load()
                                    currentDestination = AppDestination.Rewards
                                },
                                onOpenPromotionWallet = {
                                    promotionWalletViewModel.load()
                                    currentDestination = AppDestination.PromotionWallet
                                },
                                onOpenTransactions = {
                                    profileViewModel.loadTransactions()
                                    currentDestination = AppDestination.TransactionHistory
                                },
                                onOpenOrderLock = {
                                    profileViewModel.loadOrderLock()
                                    currentDestination = AppDestination.OrderLockStatus
                                },
                                onOpenComplaints = {
                                    interactionsViewModel.loadComplaints()
                                    currentDestination = AppDestination.ComplaintList
                                },
                                onOpenMyReviews = { currentDestination = AppDestination.MyReviews },
                                onOpenSupportTickets = {
                                    interactionsViewModel.loadSupportTickets()
                                    currentDestination = AppDestination.SupportTickets
                                },
                                onOpenRescuePool = {
                                    rescuePoolViewModel.loadPools()
                                    currentDestination = AppDestination.RescuePoolList
                                },
                                onOpenRescueBasket = {
                                    currentDestination = AppDestination.RescueBasket
                                },
                                onOpenImpact = {
                                    interactionsViewModel.loadImpact()
                                    interactionsViewModel.loadImpactBadges()
                                    currentDestination = AppDestination.Impact
                                },
                                onOpenPrivacyData = {
                                    profileViewModel.loadConsents()
                                    currentDestination = AppDestination.PrivacyData
                                },
                                onOpenHelpCenter = {
                                    interactionsViewModel.loadHelpCenterFaq()
                                    currentDestination = AppDestination.HelpCenter
                                },
                                onOpenLocationSettings = {
                                    placesViewModel.startSelection()
                                    currentDestination = AppDestination.LocationSettings
                                },
                                onOpenSavedDeals = { currentDestination = AppDestination.SavedDeals },
                                onOpenDealAlerts = {
                                    dealAlertsViewModel.load()
                                    currentDestination = AppDestination.DealAlerts
                                },
                                onOpenDietaryProfile = {
                                    profileViewModel.loadDietaryProfile()
                                    currentDestination = AppDestination.DietaryProfile
                                },
                                onOpenNotificationSettings = {
                                    currentDestination = AppDestination.NotificationSettings
                                },
                                onLogout = { authViewModel.logout() }
                            )
                        }
                    }
                    AiMascotFab(
                        onClick = { currentDestination = AppDestination.AiChat },
                        modifier = Modifier.align(Alignment.BottomEnd).padding(end = 16.dp, bottom = 16.dp)
                    )
                }
            }
        }
    }
}
