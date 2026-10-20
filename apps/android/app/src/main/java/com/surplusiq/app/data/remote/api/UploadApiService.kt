package com.surplusiq.app.data.remote.api

import com.surplusiq.app.data.remote.dto.UploadResponseDto
import okhttp3.MultipartBody
import retrofit2.Response
import retrofit2.http.Multipart
import retrofit2.http.POST
import retrofit2.http.Part

interface UploadApiService {
    @Multipart
    @POST("upload/image")
    suspend fun uploadImage(
        @Part file: MultipartBody.Part
    ): Response<UploadResponseDto>
}
