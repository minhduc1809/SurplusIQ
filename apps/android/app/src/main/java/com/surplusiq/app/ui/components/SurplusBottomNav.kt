package com.surplusiq.app.ui.components

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Explore
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.ShoppingBag
import androidx.compose.material.icons.filled.ShoppingBasket
import androidx.compose.material.icons.outlined.Explore
import androidx.compose.material.icons.outlined.FavoriteBorder
import androidx.compose.material.icons.outlined.PersonOutline
import androidx.compose.material.icons.outlined.ShoppingBag
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import com.surplusiq.app.ui.theme.SkyBluePrimary
import com.surplusiq.app.ui.theme.TextMuted

enum class NavTab(
    val title: String,
    val selectedIcon: ImageVector,
    val unselectedIcon: ImageVector
) {
    DISCOVER("Khám phá", Icons.Filled.Explore, Icons.Outlined.Explore),
    BROWSE("Deal", Icons.Filled.ShoppingBag, Icons.Outlined.ShoppingBag),
    FAVOURITES("Yêu thích", Icons.Filled.Favorite, Icons.Outlined.FavoriteBorder),
    ME("Tôi", Icons.Filled.Person, Icons.Outlined.PersonOutline)
}

/** Nút giữa nổi mở "Rổ cứu" (gợi ý giỏ thực phẩm theo ngân sách), không phải một tab. */
@Composable
fun SurplusBottomNav(
    selectedTab: NavTab,
    onTabSelected: (NavTab) -> Unit,
    onBasketClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    SqBottomBar(
        items = NavTab.values().map { BottomBarItem(it.name, it.title, it.selectedIcon, it.unselectedIcon) },
        selectedKey = selectedTab.name,
        onSelect = { onTabSelected(NavTab.valueOf(it)) },
        accent = SkyBluePrimary,
        inactive = TextMuted,
        modifier = modifier,
        center = BottomBarItem("BASKET", "Rổ cứu", Icons.Filled.ShoppingBasket, Icons.Filled.ShoppingBasket),
        onCenterClick = onBasketClick
    )
}
