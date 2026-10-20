package com.surplusiq.app.data.remote.dto

import com.google.gson.annotations.SerializedName

/** Phản hồi sau khi tải ảnh lên thành công (R1-068, R1-006) */
data class UploadResponseDto(
    @SerializedName("url") val url: String,
    @SerializedName("filename") val filename: String,
    @SerializedName("size") val size: Long,
    @SerializedName("mimetype") val mimetype: String
)
