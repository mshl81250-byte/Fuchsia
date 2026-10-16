package com.fuchsia.platform.compose.ui.screens
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.core.tween
import androidx.compose.foundation.BorderStroke

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ArrowBack
import androidx.compose.material.icons.rounded.EventAvailable
import androidx.compose.material.icons.rounded.Info
import androidx.compose.material.icons.rounded.TableRestaurant
import androidx.compose.material.icons.rounded.Weekend
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.fuchsia.designsystem.FuchsiaPrimaryButton
import com.fuchsia.designsystem.FuchsiaSectionTitle
import com.fuchsia.designsystem.FuchsiaFormatters
import com.fuchsia.platform.compose.ui.theme.FuchsiaColors

@Composable
internal fun CommerceHeader(
    title: String,
    subtitle: String,
    onBack: () -> Unit,
    trailing: (@Composable () -> Unit)? = null,
) {
    AnimatedVisibility(
        visible = true,
        enter = fadeIn(tween(300)) + slideInVertically(tween(360)) { -it / 4 },
    ) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(bottom = 14.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            Surface(
                shape = RoundedCornerShape(15.dp),
                color = FuchsiaColors.OnPrimary,
                border = BorderStroke(1.dp, FuchsiaColors.Line),
            ) {
                IconButton(onClick = onBack, modifier = Modifier.size(46.dp)) {
                    Icon(Icons.AutoMirrored.Rounded.ArrowBack, contentDescription = "رجوع", tint = FuchsiaColors.Primary)
                }
            }
            Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                Text(title, style = MaterialTheme.typography.titleLarge, color = FuchsiaColors.Ink, fontWeight = FontWeight.ExtraBold)
                if (subtitle.isNotBlank()) Text(subtitle, style = MaterialTheme.typography.bodyMedium.copy(fontSize = 12.sp), color = FuchsiaColors.Muted)
            }
            trailing?.invoke()
        }
    }
}

@Composable
internal fun CommerceSectionTitle(title: String, detail: String? = null) {
    FuchsiaSectionTitle(title = title, detail = detail, modifier = Modifier.padding(top = 5.dp, bottom = 3.dp))
}

@Composable
internal fun CommerceField(
    value: String,
    onValueChange: (String) -> Unit,
    label: String,
    modifier: Modifier = Modifier,
    keyboardType: KeyboardType = KeyboardType.Text,
    minLines: Int = 1,
    maxLines: Int = if (minLines == 1) 1 else 4,
    placeholder: String? = null,
) {
    OutlinedTextField(
        value = value,
        onValueChange = onValueChange,
        modifier = modifier.fillMaxWidth(),
        label = { Text(label) },
        placeholder = placeholder?.let { { Text(it) } },
        singleLine = maxLines == 1,
        minLines = minLines,
        maxLines = maxLines,
        shape = RoundedCornerShape(15.dp),
        keyboardOptions = KeyboardOptions(keyboardType = keyboardType),
        colors = OutlinedTextFieldDefaults.colors(
            focusedBorderColor = FuchsiaColors.Primary,
            unfocusedBorderColor = FuchsiaColors.Line,
            cursorColor = FuchsiaColors.Primary,
            focusedContainerColor = FuchsiaColors.White,
            unfocusedContainerColor = FuchsiaColors.White,
            focusedTextColor = FuchsiaColors.Ink,
            unfocusedTextColor = FuchsiaColors.Ink,
            focusedPlaceholderColor = FuchsiaColors.Muted,
            unfocusedPlaceholderColor = FuchsiaColors.Muted,
            focusedLabelColor = FuchsiaColors.TextAccent,
            unfocusedLabelColor = FuchsiaColors.Muted,
        ),
    )
}

@Composable
internal fun CommercePrimaryButton(
    text: String,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    busy: Boolean = false,
    onClick: () -> Unit,
) {
    FuchsiaPrimaryButton(text = text, modifier = modifier.height(56.dp), enabled = enabled, busy = busy, onClick = onClick)
}

@Composable
internal fun CommerceMoneyRow(label: String, amount: Double, bold: Boolean = false, accent: Boolean = false) {
    Row(
        modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(label, color = if (accent) FuchsiaColors.TextAccent else FuchsiaColors.Ink, fontWeight = if (bold) FontWeight.Bold else FontWeight.Normal)
        Text(
            formatYemeniRiyal(amount),
            color = if (accent) FuchsiaColors.TextAccent else FuchsiaColors.Ink,
            fontWeight = if (bold) FontWeight.ExtraBold else FontWeight.Medium,
        )
    }
}

@Composable
internal fun RentalTypeBadge(name: String, modifier: Modifier = Modifier, compact: Boolean = false, rentalCategory: String? = null) {
    val label = when (rentalCategory) {
        "kosh" -> if (compact) "إيجار كوش" else "كوشة أعراس · إيجار"
        "table" -> if (compact) "إيجار طاولات" else "طاولات مناسبات · إيجار"
        else -> if (compact) "إيجار" else "إيجار مناسبات"
    }
    val icon = when (rentalCategory) {
        "kosh" -> Icons.Rounded.Weekend
        "table" -> Icons.Rounded.TableRestaurant
        else -> Icons.Rounded.EventAvailable
    }
    Surface(modifier = modifier, shape = RoundedCornerShape(12.dp), color = FuchsiaColors.Gold.copy(alpha = .16f)) {
        Row(
            modifier = Modifier.padding(horizontal = if (compact) 8.dp else 10.dp, vertical = if (compact) 5.dp else 7.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(5.dp),
        ) {
            Icon(icon, contentDescription = label, tint = FuchsiaColors.Gold, modifier = Modifier.size(if (compact) 15.dp else 18.dp))
            Text(label, color = FuchsiaColors.Ink, fontSize = if (compact) 9.sp else 11.sp, fontWeight = FontWeight.Bold, maxLines = 1)
        }
    }
}

@Composable
internal fun RentalAudienceBadge(audience: String, compact: Boolean = false) {
    val label = when (audience) {
        "women" -> if (compact) "نسائي" else "مناسب للنساء"
        "men" -> if (compact) "رجالي" else "مناسب للرجال"
        else -> if (compact) "للنساء والرجال" else "مناسب للنساء والرجال"
    }
    Surface(shape = RoundedCornerShape(10.dp), color = FuchsiaColors.RoseLight) {
        Text(label, Modifier.padding(horizontal = 8.dp, vertical = 4.dp), color = FuchsiaColors.TextAccent, fontSize = if (compact) 9.sp else 11.sp, fontWeight = FontWeight.Bold, maxLines = 1)
    }
}

@Composable
internal fun CommerceNotice(message: String, isError: Boolean = false, modifier: Modifier = Modifier) {
    Surface(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(14.dp),
        color = (if (isError) FuchsiaColors.Error else FuchsiaColors.Primary).copy(alpha = 0.075f),
        border = androidx.compose.foundation.BorderStroke(1.dp, (if (isError) FuchsiaColors.Error else FuchsiaColors.Line).copy(alpha = 0.45f)),
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 13.dp, vertical = 11.dp),
            horizontalArrangement = Arrangement.spacedBy(9.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(Icons.Rounded.Info, contentDescription = null, tint = if (isError) FuchsiaColors.Error else FuchsiaColors.Primary, modifier = Modifier.size(18.dp))
            Text(message, color = if (isError) FuchsiaColors.Error else FuchsiaColors.Ink, style = MaterialTheme.typography.bodyMedium)
        }
    }
}

@Composable
internal fun CommerceEmptyState(title: String, detail: String, action: String, onAction: () -> Unit) {
    Column(
        modifier = Modifier.fillMaxWidth().padding(horizontal = 18.dp, vertical = 36.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(11.dp),
    ) {
        Surface(shape = RoundedCornerShape(23.dp), color = FuchsiaColors.Rose, modifier = Modifier.size(70.dp)) {
            androidx.compose.foundation.layout.Box(contentAlignment = Alignment.Center) {
                Text("✿", color = FuchsiaColors.TextAccent, fontSize = 30.sp)
            }
        }
        Text(title, style = MaterialTheme.typography.titleLarge, color = FuchsiaColors.Ink, textAlign = TextAlign.Center)
        Text(detail, style = MaterialTheme.typography.bodyMedium, color = FuchsiaColors.Muted, textAlign = TextAlign.Center)
        Spacer(Modifier.height(2.dp))
        CommercePrimaryButton(text = action, onClick = onAction)
    }
}

internal fun formatYemeniRiyal(value: Double): String =
    FuchsiaFormatters.yemeniRiyal(value)
