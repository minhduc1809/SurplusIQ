package com.surplusiq.app.ui.util

import android.content.Context
import android.content.Intent
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter

private val dateTimeFormat = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm")
private val dateFormat = DateTimeFormatter.ofPattern("dd/MM/yyyy")
private val timeFormat = DateTimeFormatter.ofPattern("HH:mm")

fun parseIsoMillis(iso: String?): Long? = iso?.let { runCatching { Instant.parse(it).toEpochMilli() }.getOrNull() }

private fun format(millis: Long?, formatter: DateTimeFormatter): String =
    millis?.let { Instant.ofEpochMilli(it).atZone(ZoneId.systemDefault()).format(formatter) } ?: "—"

fun formatDateTime(iso: String?): String = format(parseIsoMillis(iso), dateTimeFormat)
fun formatDate(iso: String?): String = format(parseIsoMillis(iso), dateFormat)
fun formatDateTimeMillis(millis: Long?): String = format(millis, dateTimeFormat)
fun formatTimeMillis(millis: Long?): String = format(millis, timeFormat)

/** "35.000 ₫" - định dạng tiền VND thống nhất cho các màn mới. */
fun formatVnd(amount: Number?): String =
    amount?.let { "%,d ₫".format(it.toLong()).replace(',', '.') } ?: "—"

/** Mở bảng chia sẻ Android (Zalo, tin nhắn, ...) với nội dung văn bản. */
fun shareText(context: Context, text: String, chooserTitle: String = "Chia sẻ qua") {
    val intent = Intent(Intent.ACTION_SEND).apply {
        type = "text/plain"
        putExtra(Intent.EXTRA_TEXT, text)
    }
    context.startActivity(Intent.createChooser(intent, chooserTitle))
}
