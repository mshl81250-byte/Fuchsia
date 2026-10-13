package com.fuchsia.designsystem

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp

@Composable
fun FuchsiaPrimaryButton(
    text: String,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    busy: Boolean = false,
    onClick: () -> Unit,
) {
    Button(
        onClick = onClick,
        enabled = enabled && !busy,
        modifier = modifier
            .fillMaxWidth()
            .heightIn(min = 56.dp)
            .background(
                brush = Brush.horizontalGradient(listOf(MaterialTheme.colorScheme.primary, FuchsiaColors.PrimaryDark)),
                shape = RoundedCornerShape(18.dp),
            ),
        shape = RoundedCornerShape(16.dp),
        colors = ButtonDefaults.buttonColors(
            containerColor = Color.Transparent,
            contentColor = MaterialTheme.colorScheme.onPrimary,
            disabledContainerColor = MaterialTheme.colorScheme.surfaceVariant,
            disabledContentColor = MaterialTheme.colorScheme.onSurface,
        ),
        elevation = ButtonDefaults.buttonElevation(defaultElevation = 5.dp, pressedElevation = 1.dp, focusedElevation = 4.dp),
    ) {
        if (busy) CircularProgressIndicator(Modifier.size(20.dp), color = MaterialTheme.colorScheme.onPrimary, strokeWidth = 2.dp)
        else Text(text, style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.Bold)
    }
}

@Composable
fun FuchsiaSurfaceCard(
    modifier: Modifier = Modifier,
    content: @Composable () -> Unit,
) {
    Card(
        modifier = modifier,
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
        content = { content() },
    )
}

@Composable
fun FuchsiaSectionTitle(
    title: String,
    detail: String? = null,
    modifier: Modifier = Modifier,
) {
    Row(
        modifier = modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        Text(title, modifier = Modifier.weight(1f), style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onSurface)
        if (!detail.isNullOrBlank()) {
            Text(detail, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

enum class FuchsiaStatusTone { Neutral, Success, Warning, Error, Info }

@Composable
fun FuchsiaStatusChip(
    label: String,
    modifier: Modifier = Modifier,
    tone: FuchsiaStatusTone = FuchsiaStatusTone.Neutral,
) {
    val background: Color
    val foreground: Color
    when (tone) {
        FuchsiaStatusTone.Neutral -> { background = MaterialTheme.colorScheme.surfaceVariant; foreground = MaterialTheme.colorScheme.onSurface }
        FuchsiaStatusTone.Success -> { background = FuchsiaColors.Success.copy(alpha = if (MaterialTheme.colorScheme.background == FuchsiaColors.Cream) .12f else .20f); foreground = FuchsiaColors.Success }
        FuchsiaStatusTone.Warning -> { background = FuchsiaColors.Warning.copy(alpha = .16f); foreground = FuchsiaColors.Warning }
        FuchsiaStatusTone.Error -> { background = FuchsiaColors.Error.copy(alpha = .13f); foreground = FuchsiaColors.Error }
        FuchsiaStatusTone.Info -> { background = FuchsiaColors.Info.copy(alpha = .14f); foreground = FuchsiaColors.Info }
    }
    Surface(modifier = modifier, shape = CircleShape, color = background, contentColor = foreground) {
        Text(label, modifier = Modifier.padding(horizontal = 11.dp, vertical = 6.dp), style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.SemiBold)
    }
}
