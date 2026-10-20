package com.surplusiq.app.data.repository

import com.surplusiq.app.data.remote.api.UploadApiService
import com.surplusiq.app.domain.repository.MediaRepository
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.asRequestBody
import okhttp3.RequestBody.Companion.toRequestBody
import java.io.File
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class MediaRepositoryImpl @Inject constructor(
    private val uploadApiService: UploadApiService
) : MediaRepository {

    override suspend fun uploadImage(file: File, mimeType: String): Result<String> = runCatching {
        val requestBody = file.asRequestBody(mimeType.toMediaTypeOrNull())
        val part = MultipartBody.Part.createFormData("file", file.name, requestBody)
        val response = uploadApiService.uploadImage(part)
        if (response.isSuccessful && response.body() != null) {
            response.body()!!.url
        } else {
            throw Exception(response.errorBody()?.string() ?: "Tải ảnh thất bại")
        }
    }

    override suspend fun uploadImageBytes(bytes: ByteArray, fileName: String, mimeType: String): Result<String> = runCatching {
        val requestBody = bytes.toRequestBody(mimeType.toMediaTypeOrNull())
        val part = MultipartBody.Part.createFormData("file", fileName, requestBody)
        val response = uploadApiService.uploadImage(part)
        if (response.isSuccessful && response.body() != null) {
            response.body()!!.url
        } else {
            throw Exception(response.errorBody()?.string() ?: "Tải ảnh thất bại")
        }
    }
}
