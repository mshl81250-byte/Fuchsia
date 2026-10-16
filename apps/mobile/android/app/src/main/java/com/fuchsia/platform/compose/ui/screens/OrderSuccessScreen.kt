package com.fuchsia.platform.compose.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Check
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.fuchsia.platform.compose.ui.theme.FuchsiaColors

@Composable
fun OrderSuccessScreen(orderId: Int, onContinueShopping: () -> Unit, onTrackOrder: () -> Unit) {
    Column(
        modifier = Modifier.fillMaxSize().background(FuchsiaColors.Cream).padding(horizontal = 24.dp, vertical = 30.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Box(
            modifier = Modifier.size(88.dp).background(FuchsiaColors.Rose, CircleShape),
            contentAlignment = Alignment.Center,
        ) {
            Icon(Icons.Rounded.Check, contentDescription = null, tint = FuchsiaColors.Primary, modifier = Modifier.size(42.dp))
        }
        Spacer(Modifier.height(22.dp))
        Text("تم استلام الطلب", color = FuchsiaColors.Ink, style = androidx.compose.material3.MaterialTheme.typography.headlineMedium, textAlign = TextAlign.Center)
        Text("بدأت فرحة جديدة", color = FuchsiaColors.TextAccent, style = androidx.compose.material3.MaterialTheme.typography.titleLarge, modifier = Modifier.padding(top = 5.dp))
        Text(
            "أُرسل طلبك إلى فوشيا بنجاح. سيجري التواصل بشأن التوصيل أو مراجعة الدفع بحسب الطريقة المختارة.",
            modifier = Modifier.fillMaxWidth().padding(top = 10.dp),
            color = FuchsiaColors.Muted,
            style = androidx.compose.material3.MaterialTheme.typography.bodyMedium,
            textAlign = TextAlign.Center,
        )
        Card(
            modifier = Modifier.fillMaxWidth().padding(top = 24.dp),
            shape = RoundedCornerShape(19.dp),
            colors = CardDefaults.cardColors(containerColor = FuchsiaColors.White),
            border = androidx.compose.foundation.BorderStroke(1.dp, FuchsiaColors.Line),
        ) {
            Column(Modifier.fillMaxWidth().padding(17.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Text("رقم الطلب", color = FuchsiaColors.Muted, style = androidx.compose.material3.MaterialTheme.typography.bodyMedium)
                Text("#$orderId", color = FuchsiaColors.TextAccent, style = androidx.compose.material3.MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.ExtraBold)
                Text("احتفظ بهذا الرقم للمتابعة", color = FuchsiaColors.Muted, style = androidx.compose.material3.MaterialTheme.typography.bodyMedium)
            }
        }
        Spacer(Modifier.height(25.dp))
        OutlinedButton(
            onClick = onTrackOrder,
            modifier = Modifier.fillMaxWidth().height(53.dp),
            shape = RoundedCornerShape(16.dp),
            border = androidx.compose.foundation.BorderStroke(1.dp, FuchsiaColors.Primary),
        ) {
            Text("تتبع الطلب الآن", color = FuchsiaColors.TextAccent, fontWeight = FontWeight.Bold)
        }
        Spacer(Modifier.height(10.dp))
        Button(
            onClick = onContinueShopping,
            modifier = Modifier.fillMaxWidth().height(55.dp),
            shape = RoundedCornerShape(16.dp),
            colors = ButtonDefaults.buttonColors(containerColor = FuchsiaColors.Primary),
        ) {
            Text("العودة إلى المتجر", color = FuchsiaColors.OnPrimary, fontWeight = FontWeight.Bold)
        }
    }
}
