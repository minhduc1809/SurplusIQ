package com.surplusiq.app.ui.util

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.widget.Toast

object NavigationUtil {
    /**
     * Mở ứng dụng bản đồ bên ngoài với tọa độ/địa chỉ cửa hàng (R1-038, BR-013).
     * Tuyệt đối không gửi vị trí của khách hàng lên server nền tảng (tuân thủ BR-013).
     * Nếu thiết bị không cài ứng dụng bản đồ hoặc mở thất bại: tự động sao chép địa chỉ vào clipboard và báo Toast.
     */
    fun openMapOrCopyAddress(
        context: Context,
        storeAddress: String,
        storeName: String = "",
        lat: Double = 0.0,
        lng: Double = 0.0
    ) {
        val query = if (storeName.isNotBlank()) "$storeName, $storeAddress" else storeAddress
        val encodedQuery = Uri.encode(query)

        val mapIntentUri = if (lat != 0.0 && lng != 0.0) {
            Uri.parse("geo:$lat,$lng?q=$lat,$lng($encodedQuery)")
        } else {
            Uri.parse("geo:0,0?q=$encodedQuery")
        }

        val mapIntent = Intent(Intent.ACTION_VIEW, mapIntentUri).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK
        }

        try {
            context.startActivity(mapIntent)
        } catch (e: Exception) {
            // Fallback 1: Thử mở bằng URL Google Maps trên web browser
            try {
                val browserUri = Uri.parse("https://www.google.com/maps/search/?api=1&query=$encodedQuery")
                val browserIntent = Intent(Intent.ACTION_VIEW, browserUri).apply {
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK
                }
                context.startActivity(browserIntent)
            } catch (ex: Exception) {
                // Fallback 2 (BR-013): Sao chép địa chỉ vào bộ nhớ tạm
                copyAddressToClipboard(context, storeAddress)
            }
        }
    }

    fun copyAddressToClipboard(context: Context, storeAddress: String) {
        val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
        val clip = ClipData.newPlainText("Địa chỉ cửa hàng", storeAddress)
        clipboard.setPrimaryClip(clip)
        Toast.makeText(context, "Đã sao chép địa chỉ cửa hàng: $storeAddress", Toast.LENGTH_LONG).show()
    }
}
