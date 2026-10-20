package com.surplusiq.merchant.ui.screens

import android.content.Intent
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.surplusiq.merchant.data.ReconCycle
import com.surplusiq.merchant.data.StatementDetailResponse
import com.surplusiq.merchant.data.StatementDto
import com.surplusiq.merchant.data.StoreRepository
import com.surplusiq.merchant.ui.components.*
import com.surplusiq.merchant.ui.theme.*
import kotlinx.coroutines.launch

private val LINE_TYPE = mapOf("SALE" to "Doanh thu đơn", "REFUND" to "Hoàn tiền", "COMMISSION" to "Hoa hồng", "SUBSCRIPTION" to "Phí thuê bao")

/**
 * S51 - Đối soát tuần hiện tại (tính trực tiếp, chưa chốt) và S52 - danh sách sao kê đã chốt.
 * GET store/reports/reconciliation, chỉ chủ cửa hàng. Hoa hồng mặc định 10% do backend tính.
 */
@Composable
fun ReconciliationScreen(repository: StoreRepository, onOpen: (String) -> Unit, onBack: () -> Unit) {
    var cycle by remember { mutableStateOf<ReconCycle?>(null) }
    var history by remember { mutableStateOf<List<StatementDto>>(emptyList()) }
    var error by remember { mutableStateOf<String?>(null) }
    var reloadKey by remember { mutableIntStateOf(0) }

    LaunchedEffect(reloadKey) {
        error = null; cycle = null
        repository.getReconciliation().fold(
            onSuccess = { cycle = it.currentCycle; history = it.history },
            onFailure = { error = it.message }
        )
    }

    Column(Modifier.fillMaxSize().background(SqCanvas).verticalScroll(rememberScrollState()).padding(20.dp)) {
        ScreenHeader("Đối soát và sao kê", onBack)
        Spacer(Modifier.height(12.dp))
        val c = cycle
        when {
            error != null -> ErrorState(error!!) { reloadKey++ }
            c == null -> FullScreenLoading()
            else -> {
                SqCard {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text("Tuần hiện tại", fontSize = 16.sp, fontWeight = FontWeight.ExtraBold, color = SqInk, modifier = Modifier.weight(1f))
                        Text("Kỳ chưa chốt", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = SqButter)
                    }
                    Text("${shortDate(c.periodStart)} – ${shortDate(c.periodEnd)}", fontSize = 12.sp, color = SqInkSoft)
                    Spacer(Modifier.height(8.dp))
                    c.orderSummary?.let {
                        InfoRow("Đơn đã nhận", "${it.pickedUpCount} · ${currency(it.pickedUpAmount)}")
                        InfoRow("Khách không đến", "${it.noShowCount} · ${currency(it.noShowAmount)}")
                    }
                    InfoRow("Tiền thu", currency(c.grossSales))
                    InfoRow("Hoa hồng (${(c.commissionRate * 100).toInt()}%)", "-${currency(c.commissionAmount)}", SqCoralDeep)
                    InfoRow("Hoàn tiền khiếu nại", "-${currency(c.refundsDeduction)}", SqCoralDeep)
                    InfoRow("Phí thuê bao", "-${currency(c.subscriptionFee)}", SqCoralDeep)
                    HorizontalDivider(color = SqLine, modifier = Modifier.padding(vertical = 6.dp))
                    InfoRow("Thực nhận dự kiến", currency(c.netPayout), SqMintDeep)
                    c.explanation?.let { Text(it, fontSize = 11.sp, color = SqInkMuted, modifier = Modifier.padding(top = 4.dp)) }
                }
                Spacer(Modifier.height(16.dp))
                SectionTitle("Sao kê đã chốt")
                Spacer(Modifier.height(8.dp))
                if (history.isEmpty()) EmptyState("Chưa có sao kê", "Sao kê được chốt vào cuối mỗi tuần (thứ hai đến chủ nhật).")
                history.forEach { s ->
                    Row(
                        Modifier.fillMaxWidth().sqSurface(18.dp, 2.dp).clickable { onOpen(s.id) }.padding(14.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column(Modifier.weight(1f)) {
                            Text("${shortDate(s.weekStart)} – ${shortDate(s.weekEnd)}", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = SqInk)
                            Text("Thu ${currency(s.gross)} · hoa hồng ${currency(s.commission)}", fontSize = 12.sp, color = SqInkSoft)
                        }
                        Column(horizontalAlignment = Alignment.End) {
                            Text(currency(s.netPayable), fontSize = 14.sp, fontWeight = FontWeight.Bold, color = SqMintDeep)
                            Text(if (s.status == "LOCKED") "Đã chốt" else "Nháp", fontSize = 11.sp, color = SqInkMuted)
                        }
                    }
                    Spacer(Modifier.height(8.dp))
                }
            }
        }
    }
}

/** S52 - Chi tiết sao kê tuần: tổng hợp, các dòng bút toán, tải CSV. Sao kê đã chốt không sửa được. */
@Composable
fun StatementDetailScreen(repository: StoreRepository, statementId: String, onBack: () -> Unit) {
    var detail by remember { mutableStateOf<StatementDetailResponse?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    var msg by remember { mutableStateOf<String?>(null) }
    var csvError by remember { mutableStateOf<String?>(null) }
    var reloadKey by remember { mutableIntStateOf(0) }
    val scope = rememberCoroutineScope()
    val saveCsv = rememberFileSaver("text/csv") { ok -> if (ok) msg = "Đã lưu tệp CSV." else csvError = "Không ghi được tệp." }

    LaunchedEffect(statementId, reloadKey) {
        error = null
        repository.getStatement(statementId).fold(onSuccess = { detail = it }, onFailure = { error = it.message })
    }

    Column(Modifier.fillMaxSize().background(SqCanvas).verticalScroll(rememberScrollState()).padding(20.dp)) {
        ScreenHeader("Chi tiết sao kê", onBack)
        Spacer(Modifier.height(12.dp))
        val d = detail
        when {
            error != null -> ErrorState(error!!) { reloadKey++ }
            d == null -> FullScreenLoading()
            else -> {
                val s = d.statement
                SqCard {
                    Text("${shortDate(s.weekStart)} – ${shortDate(s.weekEnd)}", fontSize = 18.sp, fontWeight = FontWeight.ExtraBold, color = SqInk)
                    Text(if (s.status == "LOCKED") "Đã chốt, không sửa được" else "Bản nháp", fontSize = 12.sp, color = SqInkSoft)
                    Spacer(Modifier.height(8.dp))
                    InfoRow("Tổng thu", currency(s.gross))
                    InfoRow("Hoa hồng", "-${currency(s.commission)}", SqCoralDeep)
                    InfoRow("Hoàn tiền", "-${currency(s.refunds)}", SqCoralDeep)
                    InfoRow("Phí thuê bao", "-${currency(s.subscriptionFee)}", SqCoralDeep)
                    if (s.adjustments != 0L) InfoRow("Điều chỉnh", currency(s.adjustments))
                    HorizontalDivider(color = SqLine, modifier = Modifier.padding(vertical = 6.dp))
                    InfoRow("Thực nhận", currency(s.netPayable), SqMintDeep)
                    s.checksum?.let { Text("Checksum: ${it.take(16)}…", fontSize = 10.sp, color = SqInkMuted) }
                }
                Spacer(Modifier.height(12.dp))
                InlineError(csvError)
                InlineSuccess(msg)
                PrimaryButton("Tải CSV", onClick = {
                    csvError = null; msg = null
                    scope.launch {
                        repository.getStatementCsv(statementId).fold(
                            onSuccess = { saveCsv(it.filename, it.content.toByteArray(Charsets.UTF_8)) },
                            onFailure = { csvError = it.message }
                        )
                    }
                })
                Spacer(Modifier.height(12.dp))
                SqCard {
                    SectionTitle("Các dòng bút toán (${d.lines.size})")
                    if (d.lines.isEmpty()) Text("Sao kê chưa có dòng chi tiết.", fontSize = 12.sp, color = SqInkSoft)
                    d.lines.forEach { l ->
                        Row(Modifier.padding(vertical = 4.dp), verticalAlignment = Alignment.CenterVertically) {
                            Column(Modifier.weight(1f)) {
                                Text(LINE_TYPE[l.type] ?: l.type, fontSize = 13.sp, color = SqInk)
                                Text(shortDateTime(l.createdAt), fontSize = 11.sp, color = SqInkMuted)
                            }
                            Text(currency(l.amount), fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = SqInk)
                        }
                    }
                }
            }
        }
    }
}

/** S54 - Tác động môi trường: số liệu ước tính + liên kết công khai để chia sẻ (POST store/reports/public-impact-link). */
@Composable
fun ImpactScreen(repository: StoreRepository, onBack: () -> Unit) {
    val ctx = LocalContext.current
    var data by remember { mutableStateOf<com.surplusiq.merchant.data.PublicImpactLinkResponse?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    var reloadKey by remember { mutableIntStateOf(0) }

    LaunchedEffect(reloadKey) {
        error = null
        repository.getPublicImpactLink().fold(onSuccess = { data = it }, onFailure = { error = it.message })
    }

    Column(Modifier.fillMaxSize().background(SqCanvas).verticalScroll(rememberScrollState()).padding(20.dp)) {
        ScreenHeader("Tác động môi trường", onBack)
        Spacer(Modifier.height(12.dp))
        val d = data
        when {
            error != null -> ErrorState(error!!) { reloadKey++ }
            d == null -> FullScreenLoading()
            else -> {
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    MetricCard("Suất cứu được", "${d.metrics.totalRescuedMeals}", SqMint, Modifier.weight(1f))
                    MetricCard("Thực phẩm", "%.1f kg".format(d.metrics.estimatedFoodSavedKg), SqCoral, Modifier.weight(1f))
                }
                Spacer(Modifier.height(10.dp))
                SqCard {
                    InfoRow("CO₂ giảm", "%.1f kg".format(d.metrics.estimatedCo2SavedKg), SqMintDeep)
                    Text("Ước tính: 0,4 kg thực phẩm và 2,5 kg CO₂ cho mỗi suất cứu được.", fontSize = 11.sp, color = SqInkMuted)
                }
                Spacer(Modifier.height(10.dp))
                SqCard {
                    SectionTitle("Chia sẻ thành tích")
                    Text(d.shareText, fontSize = 13.sp, color = SqInk, modifier = Modifier.padding(vertical = 6.dp))
                    Text(d.publicUrl, fontSize = 12.sp, color = SqCoralDeep)
                }
                Spacer(Modifier.height(12.dp))
                PrimaryButton("Chia sẻ", onClick = {
                    val send = Intent(Intent.ACTION_SEND).apply {
                        type = "text/plain"
                        putExtra(Intent.EXTRA_TEXT, "${d.shareText}\n${d.publicUrl}")
                    }
                    ctx.startActivity(Intent.createChooser(send, "Chia sẻ tác động"))
                })
            }
        }
    }
}
