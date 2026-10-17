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
import com.surplusiq.app.data.mock.SampleData
import com.surplusiq.app.domain.model.ActiveOrder
import com.surplusiq.app.domain.model.Deal
import com.surplusiq.app.domain.model.UserPreferences
import com.surplusiq.app.ui.components.NavTab
import com.surplusiq.app.ui.components.SurplusBottomNav
import com.surplusiq.app.ui.screens.ai.SaveBiteAiSheet
import com.surplusiq.app.ui.screens.checkout.OrderHoldCheckoutScreen
import com.surplusiq.app.ui.screens.discovery.BrowseScreen
import com.surplusiq.app.ui.screens.discovery.DealDetailScreen
import com.surplusiq.app.ui.screens.discovery.DiscoverHomeScreen
import com.surplusiq.app.ui.screens.discovery.PreferencesScreen
import com.surplusiq.app.ui.screens.favourites.FavouritesScreen
import com.surplusiq.app.ui.screens.pickup.PickupPassScreen
import com.surplusiq.app.ui.screens.profile.ProfileScreen

import androidx.hilt.navigation.compose.hiltViewModel
import com.surplusiq.app.ui.viewmodel.DiscoveryViewModel

sealed class AppDestination {
    object MainTabs : AppDestination()
    data class DealDetail(val deal: Deal) : AppDestination()
    object Preferences : AppDestination()
    data class CheckoutHold(val deal: Deal) : AppDestination()
    data class PickupPass(val order: ActiveOrder) : AppDestination()
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SurplusAppRoot(
    discoveryViewModel: DiscoveryViewModel = hiltViewModel()
) {
    val discoveryState by discoveryViewModel.uiState.collectAsState()
    val dealsList = discoveryState.deals
    var selectedTab by remember { mutableStateOf(NavTab.DISCOVER) }
    var currentDestination by remember { mutableStateOf<AppDestination>(AppDestination.MainTabs) }
    var showAiBottomSheet by remember { mutableStateOf(false) }

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
                                onOpenAiChat = { showAiBottomSheet = true }
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
