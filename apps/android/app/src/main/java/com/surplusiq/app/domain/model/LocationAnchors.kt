package com.surplusiq.app.domain.model

/**
 * "Điểm neo" vị trí: địa điểm cố định có toạ độ chuẩn. Khi vị trí máy nằm trong [radiusMeters] quanh điểm neo,
 * app dùng toạ độ và địa chỉ chuẩn của điểm neo thay cho kết quả GPS/mạng (vốn lệch vài chục đến vài trăm mét).
 * Đây là chỉnh có chủ đích cho địa điểm demo, không phải kết quả định vị thật.
 */
data class LocationAnchor(
    val address: String,
    val latitude: Double,
    val longitude: Double,
    val radiusMeters: Float = 300f
)

object LocationAnchors {
    /** Viện Khoa học Kỹ thuật Bưu điện (122 Hoàng Quốc Việt). Toạ độ lấy từ một lần đo GPS sai số 8m tại chỗ, không phải tâm seed. */
    val ALL = listOf(
        LocationAnchor(
            address = "122 Hoàng Quốc Việt, Nghĩa Đô, Hà Nội",
            latitude = 21.04732,
            longitude = 105.79216,
            radiusMeters = 500f
        )
    )

    fun nearest(latitude: Double, longitude: Double): LocationAnchor? {
        val out = FloatArray(1)
        return ALL.filter {
            android.location.Location.distanceBetween(latitude, longitude, it.latitude, it.longitude, out)
            out[0] <= it.radiusMeters
        }.minByOrNull {
            android.location.Location.distanceBetween(latitude, longitude, it.latitude, it.longitude, out)
            out[0]
        }
    }
}
