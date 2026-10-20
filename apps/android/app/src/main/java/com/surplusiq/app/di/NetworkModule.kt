package com.surplusiq.app.di

import com.surplusiq.app.data.remote.AuthInterceptor
import com.surplusiq.app.data.remote.SessionManager
import com.surplusiq.app.data.remote.TokenAuthenticator
import com.surplusiq.app.data.remote.api.*
import com.surplusiq.app.data.remote.api.UploadApiService
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object NetworkModule {

    @Provides
    @Singleton
    fun provideLoggingInterceptor(): HttpLoggingInterceptor {
        return HttpLoggingInterceptor().apply {
            level = HttpLoggingInterceptor.Level.BODY
        }
    }

    @Provides
    @Singleton
    fun provideOkHttpClient(
        authInterceptor: AuthInterceptor,
        tokenAuthenticator: TokenAuthenticator,
        loggingInterceptor: HttpLoggingInterceptor
    ): OkHttpClient {
        return OkHttpClient.Builder()
            .addInterceptor(authInterceptor)
            .authenticator(tokenAuthenticator)
            .addInterceptor(loggingInterceptor)
            .connectTimeout(15, TimeUnit.SECONDS)
            .readTimeout(20, TimeUnit.SECONDS)
            .writeTimeout(15, TimeUnit.SECONDS)
            .build()
    }

    @Provides
    @Singleton
    fun provideRetrofit(
        okHttpClient: OkHttpClient,
        sessionManager: SessionManager
    ): Retrofit {
        return Retrofit.Builder()
            .baseUrl(sessionManager.getBaseUrl())
            .client(okHttpClient)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
    }

    @Provides
    @Singleton
    fun provideAuthApiService(retrofit: Retrofit): AuthApiService =
        retrofit.create(AuthApiService::class.java)

    @Provides
    @Singleton
    fun provideDiscoveryApiService(retrofit: Retrofit): DiscoveryApiService =
        retrofit.create(DiscoveryApiService::class.java)

    @Provides
    @Singleton
    fun provideOrdersApiService(retrofit: Retrofit): OrdersApiService =
        retrofit.create(OrdersApiService::class.java)

    @Provides
    @Singleton
    fun providePickupsApiService(retrofit: Retrofit): PickupsApiService =
        retrofit.create(PickupsApiService::class.java)

    @Provides
    @Singleton
    fun provideProfileApiService(retrofit: Retrofit): ProfileApiService =
        retrofit.create(ProfileApiService::class.java)

    @Provides
    @Singleton
    fun provideAiApiService(retrofit: Retrofit): AiApiService =
        retrofit.create(AiApiService::class.java)

    @Provides
    @Singleton
    fun provideInteractionsApiService(retrofit: Retrofit): InteractionsApiService =
        retrofit.create(InteractionsApiService::class.java)

    @Provides
    @Singleton
    fun providePaymentsApiService(retrofit: Retrofit): PaymentsApiService =
        retrofit.create(PaymentsApiService::class.java)

    @Provides
    @Singleton
    fun provideRewardsApiService(retrofit: Retrofit): RewardsApiService =
        retrofit.create(RewardsApiService::class.java)

    @Provides
    @Singleton
    fun provideNotificationsApiService(retrofit: Retrofit): NotificationsApiService =
        retrofit.create(NotificationsApiService::class.java)

    @Provides
    @Singleton
    fun provideRescuePoolApiService(retrofit: Retrofit): RescuePoolApiService =
        retrofit.create(RescuePoolApiService::class.java)

    @Provides
    @Singleton
    fun provideUploadApiService(retrofit: Retrofit): UploadApiService =
        retrofit.create(UploadApiService::class.java)
}
