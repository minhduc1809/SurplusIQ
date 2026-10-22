plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

// API_BASE_URL: địa chỉ backend. Mặc định 10.0.2.2:4000 (emulator); điện thoại thật cắm USB dùng
// `adb reverse tcp:4000 tcp:4000` rồi build với -PAPI_BASE_URL=http://127.0.0.1:4000/
val apiBaseUrl: String = (project.findProperty("API_BASE_URL") as String?) ?: "http://10.0.2.2:4000/"

android {
    namespace = "com.surplusiq.merchant"
    compileSdk = 36

    defaultConfig {
        buildConfigField("String", "API_BASE_URL", "\"$apiBaseUrl\"")
        applicationId = "com.surplusiq.merchant"
        minSdk = 26
        targetSdk = 36
        versionCode = 1
        versionName = "1.0.0"
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }
    buildFeatures {
        compose = true
        buildConfig = true
    }
    composeOptions {
        kotlinCompilerExtensionVersion = "1.5.11"
    }
}

dependencies {
    val composeBom = platform("androidx.compose:compose-bom:2024.04.01")
    implementation(composeBom)

    implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.7.0")
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.7.0")
    implementation("androidx.activity:activity-compose:1.9.0")
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-graphics")
    implementation("androidx.compose.material3:material3:1.2.1")
    implementation("androidx.compose.material:material-icons-extended")
    implementation("androidx.navigation:navigation-compose:2.7.7")

    implementation("com.squareup.retrofit2:retrofit:2.11.0")
    implementation("com.squareup.retrofit2:converter-gson:2.11.0")
    implementation("com.squareup.okhttp3:logging-interceptor:4.12.0")

    // S41 quét QR nhận hàng: trình quét của Google Play services - không cần quyền camera hay CameraX.
    implementation("com.google.android.gms:play-services-code-scanner:16.1.0")
}
