package com.surplusiq.app.domain.util

import java.text.Normalizer

/**
 * Tìm kiếm gần đúng cho tiếng Việt: không phân biệt hoa thường và dấu, chấp nhận gõ thiếu dấu, sai một vài ký tự
 * và gõ dở (tiền tố). Mọi từ khóa phải khớp ít nhất một trường.
 */
object FuzzySearch {
    private val diacritics = Regex("\\p{InCombiningDiacriticalMarks}+")

    fun normalize(text: String): String =
        diacritics.replace(Normalizer.normalize(text.lowercase(), Normalizer.Form.NFD), "")
            .replace('đ', 'd')
            .replace(Regex("[^a-z0-9 ]"), " ")
            .replace(Regex("\\s+"), " ")
            .trim()

    /** true khi mọi từ của [query] khớp với một từ nào đó trong các [fields]. Query rỗng luôn khớp. */
    fun matches(query: String, vararg fields: String?): Boolean {
        // Gõ có dấu thì khớp đúng dấu ("phở" không ra "Phố"); gõ không dấu mới bỏ qua dấu và cho sai nhẹ.
        val q = Normalizer.normalize(query.trim().lowercase(), Normalizer.Form.NFC)
        val hasMarks = diacritics.replace(Normalizer.normalize(q, Normalizer.Form.NFD), "").replace('đ', 'd') != q
        if (hasMarks) {
            val hay = Normalizer.normalize(fields.filterNotNull().joinToString(" ").lowercase(), Normalizer.Form.NFC)
            return q.split(' ').filter { it.isNotEmpty() }.all { hay.contains(it) }
        }
        val tokens = normalize(query).split(' ').filter { it.isNotEmpty() }
        if (tokens.isEmpty()) return true
        val haystack = normalize(fields.filterNotNull().joinToString(" "))
        val words = haystack.split(' ').filter { it.isNotEmpty() }
        return tokens.all { token -> haystack.contains(token) || words.any { wordMatches(it, token) } }
    }

    private fun wordMatches(word: String, token: String): Boolean {
        // Từ ngắn phải khớp đúng tiền tố, nếu không "bún" sẽ khớp cả "bánh", "bàn"...
        if (token.length < 5) return word.startsWith(token)
        val allowed = if (token.length >= 8) 2 else 1
        // So sánh với phần đầu của từ để gõ dở vẫn khớp ("bun" với "bun tuoi", "bunn" với "bun")
        return distance(word.take(token.length), token) <= allowed || distance(word, token) <= allowed
    }

    private fun distance(a: String, b: String): Int {
        if (a == b) return 0
        if (a.isEmpty()) return b.length
        if (b.isEmpty()) return a.length
        var prev = IntArray(b.length + 1) { it }
        for (i in 1..a.length) {
            val cur = IntArray(b.length + 1)
            cur[0] = i
            for (j in 1..b.length) {
                val cost = if (a[i - 1] == b[j - 1]) 0 else 1
                cur[j] = minOf(cur[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost)
            }
            prev = cur
        }
        return prev[b.length]
    }
}
