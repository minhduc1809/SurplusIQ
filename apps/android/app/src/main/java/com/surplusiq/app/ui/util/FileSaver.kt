package com.surplusiq.app.ui.util

import android.graphics.Paint
import android.graphics.Typeface
import android.graphics.pdf.PdfDocument
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.runtime.*
import androidx.compose.ui.platform.LocalContext
import java.io.ByteArrayOutputStream

/** Mở hộp thoại "Lưu thành" của hệ thống rồi ghi [bytes]; cùng mẫu với app merchant. */
@Composable
fun rememberFileSaver(mimeType: String, onResult: (Boolean) -> Unit): (fileName: String, bytes: ByteArray) -> Unit {
    val context = LocalContext.current
    var pending by remember { mutableStateOf<ByteArray?>(null) }
    val launcher = rememberLauncherForActivityResult(ActivityResultContracts.CreateDocument(mimeType)) { uri ->
        val bytes = pending
        pending = null
        if (uri == null || bytes == null) return@rememberLauncherForActivityResult
        val ok = runCatching {
            context.contentResolver.openOutputStream(uri)?.use { it.write(bytes) } != null
        }.getOrDefault(false)
        onResult(ok)
    }
    return { fileName, bytes ->
        pending = bytes
        launcher.launch(fileName)
    }
}

/** PDF một trang khổ A6 gồm tiêu đề, các dòng nhãn - giá trị và ghi chú cuối trang. */
fun buildSimplePdf(title: String, rows: List<Pair<String, String>>, footer: String): ByteArray {
    val width = 298
    val height = 420
    val doc = PdfDocument()
    val page = doc.startPage(PdfDocument.PageInfo.Builder(width, height, 1).create())
    val canvas = page.canvas
    val titlePaint = Paint().apply { textSize = 14f; typeface = Typeface.DEFAULT_BOLD; isAntiAlias = true }
    val labelPaint = Paint().apply { textSize = 9f; color = 0xFF536164.toInt(); isAntiAlias = true }
    val valuePaint = Paint().apply { textSize = 9f; typeface = Typeface.DEFAULT_BOLD; isAntiAlias = true; textAlign = Paint.Align.RIGHT }
    val footerPaint = Paint().apply { textSize = 8f; color = 0xFF879394.toInt(); isAntiAlias = true }

    var y = 32f
    canvas.drawText(title, 20f, y, titlePaint)
    y += 22f
    rows.forEach { (label, value) ->
        canvas.drawText(label, 20f, y, labelPaint)
        canvas.drawText(value, width - 20f, y, valuePaint)
        y += 16f
    }
    canvas.drawText(footer, 20f, height - 24f, footerPaint)
    doc.finishPage(page)
    return ByteArrayOutputStream().use { out ->
        doc.writeTo(out)
        doc.close()
        out.toByteArray()
    }
}
