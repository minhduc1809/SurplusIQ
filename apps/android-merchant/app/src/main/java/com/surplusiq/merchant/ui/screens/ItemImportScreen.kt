package com.surplusiq.merchant.ui.screens

import android.content.Context
import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Download
import androidx.compose.material.icons.filled.ErrorOutline
import androidx.compose.material.icons.filled.FileOpen
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.surplusiq.merchant.data.CsvImportSummaryDto
import com.surplusiq.merchant.data.ItemRequest
import com.surplusiq.merchant.data.StoreRepository
import com.surplusiq.merchant.ui.components.*
import com.surplusiq.merchant.ui.theme.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.ByteArrayOutputStream

private val CSV_COLUMNS = listOf(
    "name", "category", "originalPrice", "standardShelfLifeHours", "costPrice", "weightGrams", "ingredients", "allergens",
)
private val REQUIRED_COLUMNS = CSV_COLUMNS.take(4)
private val NUMBER_COLUMNS = listOf("originalPrice", "standardShelfLifeHours", "costPrice", "weightGrams")
private const val MAX_ROWS = 500
private const val MAX_BYTES = 2 * 1024 * 1024
private const val BOM = "\uFEFF"

private val TEMPLATE = BOM + CSV_COLUMNS.joinToString(",") + "\n" +
    "Bánh mì hoa cúc,Bánh mì,85000,24,35000,300,\"Bột mì, bơ, trứng\",Gluten;Trứng\n"

/** line = số thứ tự bản ghi trong tệp (dòng tiêu đề là 1). */
private data class CsvRow(val line: Int, val name: String, val request: ItemRequest?, val error: String?)

private data class FailedRow(val line: Int, val name: String, val error: String)

/** CSV tối giản theo RFC 4180: dấu phẩy, ô trong ngoặc kép (được chứa dấu phẩy/xuống dòng), "" là dấu ngoặc kép. */
internal fun parseCsv(text: String): List<List<String>> {
    val rows = mutableListOf<List<String>>()
    var row = mutableListOf<String>()
    val cell = StringBuilder()
    var quoted = false
    var i = 0
    fun endRow() {
        row.add(cell.toString()); cell.clear()
        if (row.any { it.isNotBlank() }) rows.add(row)
        row = mutableListOf()
    }
    while (i < text.length) {
        val c = text[i]
        when {
            quoted && c == '"' && text.getOrNull(i + 1) == '"' -> { cell.append('"'); i++ }
            c == '"' -> quoted = !quoted
            !quoted && c == ',' -> { row.add(cell.toString()); cell.clear() }
            !quoted && (c == '\n' || c == '\r') -> { if (c == '\r' && text.getOrNull(i + 1) == '\n') i++; endRow() }
            else -> cell.append(c)
        }
        i++
    }
    endRow()
    return rows
}

private fun csvCell(s: String): String = if (s.any { it == ',' || it == '"' || it == '\n' }) "\"" + s.replace("\"", "\"\"") + "\"" else s

/** Bảng CSV -> các dòng đã kiểm tra theo cùng quy tắc với form món; trả lỗi cấp tệp nếu sai cấu trúc. */
private fun validateTable(table: List<List<String>>): Pair<List<CsvRow>, String?> {
    val header = table.firstOrNull()?.map { it.trim().removePrefix(BOM) } ?: return emptyList<CsvRow>() to "Tệp trống."
    val index = CSV_COLUMNS.associateWith { col -> header.indexOfFirst { it.equals(col, ignoreCase = true) } }
    val missing = REQUIRED_COLUMNS.filter { index.getValue(it) < 0 }
    if (missing.isNotEmpty()) return emptyList<CsvRow>() to "Thiếu cột bắt buộc: ${missing.joinToString(", ")}. Hãy dùng tệp mẫu."
    val body = table.drop(1)
    if (body.isEmpty()) return emptyList<CsvRow>() to "Tệp chưa có dòng dữ liệu."
    if (body.size > MAX_ROWS) return emptyList<CsvRow>() to "Tệp có ${body.size} dòng, tối đa $MAX_ROWS dòng mỗi lần."

    return body.mapIndexed { i, cells ->
        fun col(name: String): String = index.getValue(name).takeIf { it >= 0 }?.let { cells.getOrNull(it) }?.trim().orEmpty()
        val badNumber = NUMBER_COLUMNS.firstOrNull { col(it).isNotEmpty() && col(it).toLongOrNull() == null }
        val request = ItemRequest(
            name = col("name"),
            category = col("category"),
            originalPrice = col("originalPrice").toLongOrNull(),
            standardShelfLifeHours = col("standardShelfLifeHours").toIntOrNull(),
            costPrice = col("costPrice").toLongOrNull(),
            weightGrams = col("weightGrams").toIntOrNull(),
            ingredients = col("ingredients").ifEmpty { null },
            allergens = col("allergens").split(';').map { it.trim() }.filter { it.isNotEmpty() },
        )
        val error = badNumber?.let { "Cột $it phải là số nguyên." } ?: itemError(request)
        CsvRow(line = i + 2, name = request.name.orEmpty(), request = request.takeIf { error == null }, error = error)
    } to null
}

/** Đọc tệp đã chọn, dừng sớm nếu vượt 2 MB (null = quá lớn). */
private fun readLimited(context: Context, uri: Uri): ByteArray? {
    val out = ByteArrayOutputStream()
    context.contentResolver.openInputStream(uri)?.use { input ->
        val buffer = ByteArray(8192)
        while (true) {
            val n = input.read(buffer)
            if (n < 0) break
            out.write(buffer, 0, n)
            if (out.size() > MAX_BYTES) return null
        }
    }
    return out.toByteArray()
}

/** S23 - Nhập món từ CSV: tải mẫu, chọn tệp, kiểm tra từng dòng, gửi các dòng hợp lệ (POST store/items/import-csv). */
@Composable
fun ItemImportScreen(repository: StoreRepository, onBack: () -> Unit) {
    val context = LocalContext.current
    var fileName by remember { mutableStateOf<String?>(null) }
    var rows by remember { mutableStateOf<List<CsvRow>>(emptyList()) }
    var fileError by remember { mutableStateOf<String?>(null) }
    var importing by remember { mutableStateOf(false) }
    var importError by remember { mutableStateOf<String?>(null) }
    var result by remember { mutableStateOf<CsvImportSummaryDto?>(null) }
    var failed by remember { mutableStateOf<List<FailedRow>>(emptyList()) }
    var saveMessage by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()
    val validRows = rows.filter { it.request != null }

    val saveFile = rememberFileSaver("text/csv") { ok -> saveMessage = if (ok) "Đã lưu tệp." else "Không lưu được tệp." }
    val picker = rememberLauncherForActivityResult(ActivityResultContracts.OpenDocument()) { uri ->
        if (uri == null) return@rememberLauncherForActivityResult
        scope.launch {
            fileError = null; result = null; failed = emptyList(); rows = emptyList()
            fileName = uri.lastPathSegment?.substringAfterLast('/')
            val bytes = withContext(Dispatchers.IO) { runCatching { readLimited(context, uri) } }
            bytes.fold(
                onSuccess = { data ->
                    if (data == null) { fileError = "Tệp vượt quá 2 MB."; return@fold }
                    val (checked, err) = validateTable(parseCsv(String(data, Charsets.UTF_8)))
                    rows = checked; fileError = err
                },
                onFailure = { fileError = "Không đọc được tệp." }
            )
        }
    }

    fun import() {
        importing = true
        importError = null
        scope.launch {
            repository.importItemsCsv(validRows.map { it.request!! }).fold(
                onSuccess = { summary ->
                    result = summary
                    // index của backend là vị trí 1-based trong mảng đã gửi -> quy về số dòng trong tệp.
                    failed = rows.filter { it.error != null }.map { FailedRow(it.line, it.name, it.error!!) } +
                        summary.errors.mapNotNull { e -> validRows.getOrNull(e.index - 1)?.let { FailedRow(it.line, it.name, e.error) } }
                },
                onFailure = { importError = it.message }
            )
            importing = false
        }
    }

    LazyColumn(
        modifier = Modifier.fillMaxSize().background(SqCanvas),
        contentPadding = PaddingValues(20.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item { ScreenHeader("Nhập món từ CSV", onBack) }

        item {
            SqCard {
                StepHeader(1, "Tải tệp mẫu")
                Text("Cột bắt buộc: name, category, originalPrice, standardShelfLifeHours. Dị ứng cách nhau bằng dấu chấm phẩy.",
                    fontSize = 12.sp, color = SqInkSoft)
                Spacer(modifier = Modifier.height(10.dp))
                OutlinedButton(onClick = { saveFile("mau-nhap-mon.csv", TEMPLATE.toByteArray()) }, shape = RoundedCornerShape(24.dp)) {
                    Icon(Icons.Default.Download, contentDescription = null, tint = SqCoral, modifier = Modifier.size(18.dp))
                    Spacer(modifier = Modifier.width(6.dp))
                    Text("Tải mẫu CSV", color = SqInk)
                }
                InlineSuccess(saveMessage)
            }
        }

        item {
            SqCard {
                StepHeader(2, "Chọn tệp")
                Text("Tối đa $MAX_ROWS dòng và 2 MB. Hạn mức số dòng mỗi lần còn tùy gói (Cơ bản 100, Chuyên nghiệp 500).", fontSize = 12.sp, color = SqInkSoft)
                Spacer(modifier = Modifier.height(10.dp))
                OutlinedButton(
                    onClick = { picker.launch(arrayOf("text/csv", "text/comma-separated-values", "text/plain", "application/vnd.ms-excel")) },
                    shape = RoundedCornerShape(24.dp)
                ) {
                    Icon(Icons.Default.FileOpen, contentDescription = null, tint = SqCoral, modifier = Modifier.size(18.dp))
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(fileName ?: "Chọn tệp CSV", color = SqInk, maxLines = 1, overflow = TextOverflow.Ellipsis)
                }
                InlineError(fileError)
            }
        }

        if (rows.isNotEmpty() && result == null) {
            item {
                SqCard {
                    StepHeader(3, "Kiểm tra dữ liệu")
                    Text("${validRows.size} dòng hợp lệ · ${rows.size - validRows.size} dòng lỗi", fontSize = 13.sp, color = SqInkSoft)
                    InlineError(importError)
                    Spacer(modifier = Modifier.height(10.dp))
                    PrimaryButton("Nhập ${validRows.size} dòng hợp lệ", enabled = validRows.isNotEmpty(), loading = importing, onClick = ::import)
                }
            }
            items(rows, key = { it.line }) { row -> RowCheck(row.line, row.name, row.error) }
        }

        result?.let { summary ->
            item {
                SqCard {
                    SectionTitle("Kết quả nhập")
                    Spacer(modifier = Modifier.height(10.dp))
                    Row(Modifier.height(IntrinsicSize.Min), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        MetricCard("Đã nhập", "${summary.imported}", SqMint, Modifier.weight(1f).fillMaxHeight())
                        MetricCard("Lỗi", "${failed.size}", SqCoral, Modifier.weight(1f).fillMaxHeight())
                    }
                    if (failed.isNotEmpty()) {
                        Spacer(modifier = Modifier.height(10.dp))
                        OutlinedButton(
                            onClick = {
                                val csv = BOM + "line,name,error\n" + failed.joinToString("") { "${it.line},${csvCell(it.name)},${csvCell(it.error)}\n" }
                                saveFile("loi-nhap-mon.csv", csv.toByteArray())
                            },
                            shape = RoundedCornerShape(24.dp)
                        ) {
                            Icon(Icons.Default.Download, contentDescription = null, tint = SqCoral, modifier = Modifier.size(18.dp))
                            Spacer(modifier = Modifier.width(6.dp))
                            Text("Tải tệp lỗi", color = SqInk)
                        }
                    }
                }
            }
            items(failed, key = { "f${it.line}" }) { f -> RowCheck(f.line, f.name, f.error) }
        }
    }
}

@Composable
private fun StepHeader(step: Int, title: String) {
    Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(bottom = 6.dp)) {
        Box(modifier = Modifier.size(24.dp).clip(CircleShape).background(SqCoral), contentAlignment = Alignment.Center) {
            Text("$step", color = Color.White, fontSize = 12.sp, fontWeight = FontWeight.Bold)
        }
        Spacer(modifier = Modifier.width(10.dp))
        SectionTitle(title)
    }
}

@Composable
private fun RowCheck(line: Int, name: String, error: String?) {
    Row(
        modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp)).background(if (error == null) SqMintWash else SqCoralWash).padding(12.dp),
        verticalAlignment = Alignment.Top
    ) {
        Icon(
            if (error == null) Icons.Default.CheckCircle else Icons.Default.ErrorOutline, contentDescription = if (error == null) "Hợp lệ" else "Lỗi",
            tint = if (error == null) SqMintDeep else SqCoralDeep, modifier = Modifier.size(18.dp)
        )
        Spacer(modifier = Modifier.width(10.dp))
        Column {
            Text("Dòng $line · ${name.ifBlank { "(chưa có tên)" }}", fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = SqInk)
            if (error != null) Text(error, fontSize = 12.sp, color = SqCoralDeep)
        }
    }
}
