package com.surplusiq.app.ui.components.map

import android.content.Context
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.Path
import android.graphics.RectF
import android.graphics.Typeface
import android.graphics.drawable.BitmapDrawable
import android.graphics.drawable.Drawable
import com.surplusiq.app.domain.model.MapPin

/**
 * Vẽ ghim quán dạng bong bóng trắng nổi trên đầu ghim: dòng nhỏ (số suất · giá từ) và tên quán in đậm,
 * mũi nhọn chỉ xuống chấm cam đúng vị trí quán. [selected] đổi viền sang cam.
 */
internal fun pinBubbleDrawable(context: Context, pin: MapPin, selected: Boolean): Drawable {
    val d = context.resources.displayMetrics.density
    val name = ellipsize(pin.storeName, 22)
    val sub = buildString {
        append("${pin.activeDealsCount} suất")
        pin.minPrice?.let { append(" · từ ${String.format("%,d", it)}₫") }
    }

    val namePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = 0xFF1F1F1F.toInt(); textSize = 14f * d; typeface = Typeface.DEFAULT_BOLD }
    val subPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = 0xFF7A7A7A.toInt(); textSize = 11f * d }
    val padX = 12f * d
    val padY = 8f * d
    val bubbleW = maxOf(namePaint.measureText(name), subPaint.measureText(sub)) + padX * 2
    val bubbleH = padY * 2 + 11f * d + 4f * d + 14f * d
    val tail = 8f * d
    val dot = 18f * d
    val w = bubbleW + 8f * d
    val h = bubbleH + tail + dot + 8f * d

    val bmp = Bitmap.createBitmap(w.toInt(), h.toInt(), Bitmap.Config.ARGB_8888)
    val c = Canvas(bmp)
    val left = 4f * d
    val rect = RectF(left, 2f * d, left + bubbleW, 2f * d + bubbleH)

    val shadow = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = 0x33000000; maskFilter = null }
    c.drawRoundRect(RectF(rect).apply { offset(0f, 2f * d) }, 16f * d, 16f * d, shadow)
    val fill = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = 0xFFFFFFFF.toInt() }
    c.drawRoundRect(rect, 16f * d, 16f * d, fill)
    val cx = w / 2
    c.drawPath(Path().apply {
        moveTo(cx - tail, rect.bottom - 1f); lineTo(cx, rect.bottom + tail); lineTo(cx + tail, rect.bottom - 1f); close()
    }, fill)
    if (selected) {
        c.drawRoundRect(rect, 16f * d, 16f * d, Paint(Paint.ANTI_ALIAS_FLAG).apply {
            style = Paint.Style.STROKE; strokeWidth = 2f * d; color = 0xFFFF8A3D.toInt()
        })
    }

    c.drawText(sub, rect.left + padX, rect.top + padY + 11f * d - 1f, subPaint)
    c.drawText(name, rect.left + padX, rect.top + padY + 11f * d + 4f * d + 12f * d, namePaint)

    val dotCy = rect.bottom + tail + dot / 2 + 2f * d
    c.drawCircle(cx, dotCy, dot / 2 + 4f * d, Paint(Paint.ANTI_ALIAS_FLAG).apply { color = 0x33FF8A3D })
    c.drawCircle(cx, dotCy, dot / 2 - 2f * d, Paint(Paint.ANTI_ALIAS_FLAG).apply { color = 0xFFFF8A3D.toInt() })
    c.drawCircle(cx, dotCy, 3f * d, Paint(Paint.ANTI_ALIAS_FLAG).apply { color = 0xFFFFFFFF.toInt() })

    return BitmapDrawable(context.resources, bmp)
}

private fun ellipsize(text: String, max: Int) = if (text.length <= max) text else text.take(max - 1).trimEnd() + "…"
