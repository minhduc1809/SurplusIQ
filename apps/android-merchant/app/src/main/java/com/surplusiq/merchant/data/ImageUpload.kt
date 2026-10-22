package com.surplusiq.merchant.data

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.toRequestBody
import java.io.ByteArrayOutputStream

data class UploadResult(val url: String)

private const val MAX_SIDE = 1600
private const val MAX_BYTES = 4_500_000

/** Thu nhỏ ảnh chụp từ máy về tối đa 1600px, JPEG 85%, để luôn dưới giới hạn 5 MB của backend. */
private fun compress(context: Context, uri: Uri): ByteArray {
    val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
    context.contentResolver.openInputStream(uri)?.use { BitmapFactory.decodeStream(it, null, bounds) }
    var sample = 1
    while (bounds.outWidth / sample > MAX_SIDE * 2 || bounds.outHeight / sample > MAX_SIDE * 2) sample *= 2
    val bitmap = context.contentResolver.openInputStream(uri)?.use {
        BitmapFactory.decodeStream(it, null, BitmapFactory.Options().apply { inSampleSize = sample })
    } ?: error("Không đọc được ảnh.")
    val scale = minOf(1f, MAX_SIDE.toFloat() / maxOf(bitmap.width, bitmap.height))
    val scaled = if (scale < 1f) Bitmap.createScaledBitmap(bitmap, (bitmap.width * scale).toInt(), (bitmap.height * scale).toInt(), true) else bitmap
    var quality = 85
    while (true) {
        val out = ByteArrayOutputStream()
        scaled.compress(Bitmap.CompressFormat.JPEG, quality, out)
        if (out.size() <= MAX_BYTES || quality <= 40) return out.toByteArray()
        quality -= 15
    }
}

/** Chọn ảnh từ máy, thu nhỏ rồi tải lên (POST store/uploads/image); trả địa chỉ ảnh công khai. */
suspend fun StoreRepository.uploadImageUri(context: Context, uri: Uri): Result<String> = withContext(Dispatchers.IO) {
    runCatching { compress(context, uri) }.fold(
        onSuccess = { bytes ->
            val part = MultipartBody.Part.createFormData("file", "image.jpg", bytes.toRequestBody("image/jpeg".toMediaType()))
            uploadImage(part).map { it.url }
        },
        onFailure = { Result.failure(Exception("Không đọc được ảnh đã chọn.")) }
    )
}
