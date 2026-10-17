package com.surplusiq.app.data.remote.api

import com.surplusiq.app.data.remote.dto.PickupPassDto
import retrofit2.Response
import retrofit2.http.GET
import retrofit2.http.Path

interface PickupsApiService {

    @GET("customer/orders/{orderId}/pickup-pass")
    suspend fun getPickupPass(
        @Path("orderId") orderId: String
    ): Response<PickupPassDto>
}
