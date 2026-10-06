package com.fuchsia.platform.compose.ui.screens

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.scaleIn
import androidx.compose.animation.scaleOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.CheckCircle
import androidx.compose.material.icons.rounded.Info
import androidx.compose.material.icons.rounded.WarningAmber
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.fuchsia.platform.compose.ui.theme.FuchsiaColors

@Composable
fun FuchsiaNoticeHost(hostState: SnackbarHostState, modifier: Modifier = Modifier) {
    val data by rememberUpdatedState(hostState.currentSnackbarData)
    val message = data?.visuals?.message.orEmpty()
    val isError = message.contains("تعذر") || message.contains("فشل") || message.contains("خطأ") || message.contains("غير متاح")
    val isInfo = message.contains("يرجى") || message.contains("جارٍ") || message.contains("تحديث")
    val icon = when {
        isError -> Icons.Rounded.WarningAmber
        isInfo -> Icons.Rounded.Info
        else -> Icons.Rounded.CheckCircle
    }
    val accent = if (isError) FuchsiaColors.Error else FuchsiaColors.Primary
    val background = if (isError) Color(0xFFFFF1F2) else FuchsiaColors.White

    Box(modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 12.dp), contentAlignment = Alignment.TopCenter) {
        AnimatedVisibility(
            visible = data != null,
            enter = slideInVertically(initialOffsetY = { -it / 2 }) + fadeIn() + scaleIn(initialScale = .95f),
            exit = slideOutVertically(targetOffsetY = { -it / 2 }) + fadeOut() + scaleOut(targetScale = .95f),
        ) {
            Card(
                onClick = { data?.dismiss() },
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(20.dp),
                colors = CardDefaults.cardColors(containerColor = background),
                elevation = CardDefaults.cardElevation(defaultElevation = 8.dp),
            ) {
                Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 13.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    Icon(icon, contentDescription = null, tint = accent, modifier = Modifier.size(25.dp))
                    Text(message, color = FuchsiaColors.Ink, fontSize = 13.sp, fontWeight = FontWeight.SemiBold, modifier = Modifier.weight(1f))
                    Spacer(Modifier.width(2.dp))
                }
            }
        }
    }
}
