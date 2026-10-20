package com.surplusiq.app.domain.repository

import java.io.File

interface MediaRepository {
    suspend fun uploadImage(file: File, mimeType: String = "image/jpeg"): Result<String>
    suspend fun uploadImageBytes(bytes: ByteArray, fileName: String, mimeType: String = "image/jpeg"): Result<String>
}
