package com.fuchsia.platform.compose.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawing
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ArrowBack
import androidx.compose.material.icons.rounded.MarkEmailRead
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.fuchsia.platform.compose.data.FuchsiaApi
import com.fuchsia.platform.compose.data.SessionVault
import com.fuchsia.platform.compose.ui.theme.FuchsiaColors
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

@Composable
fun VerifyScreen(
    email: String,
    debugCode: String?,
    onBack: () -> Unit,
    onVerified: () -> Unit,
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var code by rememberSaveable { mutableStateOf("") }
    var secondsLeft by rememberSaveable { mutableIntStateOf(180) }
    var busy by rememberSaveable { mutableStateOf(false) }
    var error by rememberSaveable { mutableStateOf("") }

    LaunchedEffect(Unit) {
        while (secondsLeft > 0) {
            delay(1_000)
            secondsLeft -= 1
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(FuchsiaColors.Cream)
            .windowInsetsPadding(WindowInsets.safeDrawing)
            .imePadding()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 22.dp, vertical = 10.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            IconButton(onClick = onBack, modifier = Modifier.size(48.dp)) {
                Icon(Icons.AutoMirrored.Rounded.ArrowBack, contentDescription = "رجوع", tint = FuchsiaColors.Ink)
            }
        }
        Spacer(Modifier.height(30.dp))
        Card(
            modifier = Modifier.align(Alignment.CenterHorizontally).size(76.dp),
            shape = RoundedCornerShape(24.dp),
            colors = CardDefaults.cardColors(containerColor = FuchsiaColors.Rose),
        ) {
            androidx.compose.foundation.layout.Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Icon(Icons.Rounded.MarkEmailRead, contentDescription = null, tint = FuchsiaColors.Primary, modifier = Modifier.size(36.dp))
            }
        }
        Spacer(Modifier.height(20.dp))
        Text(
            "التحقق من البريد الإلكتروني",
            modifier = Modifier.fillMaxWidth(),
            style = MaterialTheme.typography.headlineMedium,
            color = FuchsiaColors.Ink,
            textAlign = TextAlign.Center,
        )
        Text(
            "أرسلنا رمزًا من 6 أرقام إلى\n$email",
            modifier = Modifier.fillMaxWidth().padding(top = 7.dp, bottom = 20.dp),
            style = MaterialTheme.typography.bodyMedium,
            color = FuchsiaColors.Muted,
            textAlign = TextAlign.Center,
        )

        if (!debugCode.isNullOrBlank()) {
            Card(
                modifier = Modifier.fillMaxWidth().padding(bottom = 14.dp),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = FuchsiaColors.RoseLight),
                border = androidx.compose.foundation.BorderStroke(1.dp, FuchsiaColors.Line),
            ) {
                Column(
                    modifier = Modifier.fillMaxWidth().padding(14.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(3.dp),
                ) {
                    Text("رمز التحقق للاختبار", color = FuchsiaColors.PrimaryDark, fontWeight = FontWeight.Bold, fontSize = 12.sp)
                    Text(debugCode, color = FuchsiaColors.Primary, fontWeight = FontWeight.ExtraBold, fontSize = 27.sp, letterSpacing = 5.sp)
                }
            }
        }

        OutlinedTextField(
            value = code,
            onValueChange = { value -> code = value.filter(Char::isDigit).take(6); error = "" },
            modifier = Modifier.fillMaxWidth(),
            singleLine = true,
            shape = RoundedCornerShape(16.dp),
            label = { Text("رمز التحقق") },
            placeholder = { Text("● ● ● ● ● ●", letterSpacing = 4.sp) },
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.NumberPassword),
            textStyle = MaterialTheme.typography.headlineMedium.copy(textAlign = TextAlign.Center, letterSpacing = 7.sp),
            colors = OutlinedTextFieldDefaults.colors(
                focusedBorderColor = FuchsiaColors.Primary,
                unfocusedBorderColor = FuchsiaColors.Line,
                focusedLabelColor = FuchsiaColors.Primary,
                cursorColor = FuchsiaColors.Primary,
                focusedContainerColor = FuchsiaColors.White,
                unfocusedContainerColor = FuchsiaColors.White,
            ),
        )
        if (error.isNotBlank()) {
            Spacer(Modifier.height(10.dp))
            ErrorMessage(error)
        }
        Spacer(Modifier.height(16.dp))
        Button(
            onClick = {
                busy = true
                scope.launch {
                    try {
                        val session = FuchsiaApi.verifyRegistrationCode(email, code)
                        SessionVault.save(context, session.user, session.token)
                        onVerified()
                    } catch (failure: Throwable) {
                        error = failure.message ?: "تعذر التحقق من الرمز."
                    } finally {
                        busy = false
                    }
                }
            },
            enabled = code.length == 6 && !busy,
            modifier = Modifier.fillMaxWidth().height(56.dp),
            shape = RoundedCornerShape(16.dp),
            colors = ButtonDefaults.buttonColors(containerColor = FuchsiaColors.Primary),
        ) {
            if (busy) CircularProgressIndicator(modifier = Modifier.size(21.dp), color = FuchsiaColors.White, strokeWidth = 2.dp)
            else Text("تأكيد وإنشاء الحساب", fontWeight = FontWeight.Bold)
        }
        Spacer(Modifier.height(15.dp))
        Text(
            text = if (secondsLeft > 0) "تنتهي صلاحية الرمز خلال ${secondsLeft / 60}:${(secondsLeft % 60).toString().padStart(2, '0')}" else "انتهت صلاحية الرمز؛ يرجى العودة إلى شاشة التسجيل لطلب رمز جديد.",
            modifier = Modifier.fillMaxWidth(),
            color = FuchsiaColors.Muted,
            style = MaterialTheme.typography.bodyMedium,
            textAlign = TextAlign.Center,
        )
    }
}
