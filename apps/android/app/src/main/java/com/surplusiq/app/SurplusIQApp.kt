package com.surplusiq.app

import android.app.Application
import com.surplusiq.app.data.remote.SessionManager
import dagger.hilt.android.HiltAndroidApp
import javax.inject.Inject

@HiltAndroidApp
class SurplusIQApp : Application() {
    @Inject lateinit var sessionManager: SessionManager

    override fun onCreate() {
        super.onCreate()
        // Người dùng bỏ chọn "Ghi nhớ đăng nhập": mỗi lần mở app mới phải đăng nhập lại.
        if (!sessionManager.isRememberLogin()) sessionManager.clearSession()
    }
}
