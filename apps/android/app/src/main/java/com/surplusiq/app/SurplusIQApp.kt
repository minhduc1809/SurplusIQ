package com.surplusiq.app

import android.app.Application
import com.surplusiq.app.data.remote.SessionManager
import coil.Coil
import coil.ImageLoader
import coil.map.Mapper
import coil.request.Options
import dagger.hilt.android.HiltAndroidApp
import javax.inject.Inject

@HiltAndroidApp
class SurplusIQApp : Application() {
    @Inject lateinit var sessionManager: SessionManager

    override fun onCreate() {
        super.onCreate()
        // Ảnh từ kho ngoài (Unsplash, Cloudinary) tải qua backend để không phụ thuộc mạng của máy có chặn kho ảnh hay không.
        Coil.setImageLoader(ImageLoader.Builder(this).components { add(ExternalImageMapper()) }.crossfade(true).build())
        // Người dùng bỏ chọn "Ghi nhớ đăng nhập": mỗi lần mở app mới phải đăng nhập lại.
        if (!sessionManager.isRememberLogin()) sessionManager.clearSession()
    }
}

/** Đổi https://images.unsplash.com/... và https://res.cloudinary.com/... thành địa chỉ proxy của backend. */
private class ExternalImageMapper : Mapper<String, String> {
    override fun map(data: String, options: Options): String? {
        if (!(data.startsWith("https://images.unsplash.com/") || data.startsWith("https://res.cloudinary.com/"))) return null
        return BuildConfig.API_BASE_URL.trimEnd('/') + "/media/proxy?url=" + java.net.URLEncoder.encode(data, "UTF-8")
    }
}
