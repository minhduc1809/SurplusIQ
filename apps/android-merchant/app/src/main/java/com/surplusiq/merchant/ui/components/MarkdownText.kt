package com.surplusiq.merchant.ui.components

import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight

private val HEADING = Regex("""^#{1,6}\s+""")
private val BULLET = Regex("""^\s*[*-]\s+""")
private val LONE_STAR = Regex("""(?<!\*)\*(?!\*)""")

/** Markdown tối giản cho câu trả lời AI: tiêu đề (#), in đậm (**), gạch đầu dòng (* hoặc -), bỏ dấu ` thừa. */
fun markdownToAnnotated(src: String): AnnotatedString = buildAnnotatedString {
    src.lines().forEachIndexed { idx, raw ->
        if (idx > 0) append("\n")
        var line = raw.trimEnd()
        var heading = false
        val h = HEADING.find(line)
        val b = BULLET.find(line)
        if (h != null) {
            line = line.removeRange(h.range)
            heading = true
        } else if (b != null) {
            line = "• " + line.removeRange(b.range)
        }
        line.split("**").forEachIndexed { i, part ->
            val bold = heading || i % 2 == 1
            if (bold) pushStyle(SpanStyle(fontWeight = FontWeight.Bold))
            append(part.replace("`", "").replace(LONE_STAR, ""))
            if (bold) pop()
        }
    }
}
