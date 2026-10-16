package com.fuchsia.platform.compose.ui.screens

import android.util.Patterns
import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.animation.togetherWith
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
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
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.safeDrawing
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.ui.graphics.Brush
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ArrowBack
import androidx.compose.material.icons.rounded.Email
import androidx.compose.material.icons.rounded.Lock
import androidx.compose.material.icons.rounded.Person
import androidx.compose.material.icons.rounded.Phone
import androidx.compose.material.icons.rounded.Visibility
import androidx.compose.material.icons.rounded.VisibilityOff
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.foundation.Image
import androidx.compose.ui.layout.ContentScale
import com.fuchsia.platform.compose.R
import com.fuchsia.platform.compose.data.FuchsiaApi
import com.fuchsia.platform.compose.data.SessionVault
import com.fuchsia.platform.compose.ui.theme.FuchsiaColors
import kotlinx.coroutines.launch

@Composable
fun AuthScreen(
    startWithRegister: Boolean = false,
    onBack: () -> Unit,
    onAuthComplete: () -> Unit,
    onCodeRequested: (String, String?) -> Unit,
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var isRegister by rememberSaveable(startWithRegister) { mutableStateOf(startWithRegister) }
    var fullName by rememberSaveable { mutableStateOf("") }
    var phone by rememberSaveable { mutableStateOf("") }
    var email by rememberSaveable { mutableStateOf("") }
    var password by rememberSaveable { mutableStateOf("") }
    var showPassword by rememberSaveable { mutableStateOf(false) }
    var busy by rememberSaveable { mutableStateOf(false) }
    var error by rememberSaveable { mutableStateOf("") }

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
            Spacer(Modifier.weight(1f))
            Text(if (isRegister) "إنشاء حساب" else "تسجيل الدخول", color = FuchsiaColors.Muted, style = MaterialTheme.typography.labelLarge)
        }
        Spacer(Modifier.height(4.dp))
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.Center, verticalAlignment = Alignment.CenterVertically) {
            Image(painter = painterResource(R.drawable.fuchsia_logo), contentDescription = "فوشيا بوتيك", modifier = Modifier.size(width = 68.dp, height = 66.dp), contentScale = ContentScale.Fit)
            Spacer(Modifier.width(8.dp))
            Column(horizontalAlignment = Alignment.End, verticalArrangement = Arrangement.spacedBy(0.dp)) {
                Text("بوتيك", color = FuchsiaColors.TextAccent, fontWeight = FontWeight.ExtraBold, fontSize = 20.sp)
            }
        }
        Spacer(Modifier.height(6.dp))
        AnimatedContent(
            targetState = isRegister,
            label = "auth-heading-transition",
            transitionSpec = {
                (slideInVertically(tween(260)) { it / 3 } + fadeIn(tween(220))) togetherWith
                    (slideOutVertically(tween(220)) { -it / 4 } + fadeOut(tween(150)))
            },
        ) { registerMode ->
            Column(Modifier.fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally) {
                Text(
                    text = if (registerMode) "مرحبًا بك في فوشيا" else "مرحبًا من جديد",
                    style = MaterialTheme.typography.headlineMedium,
                    color = FuchsiaColors.Ink,
                    textAlign = TextAlign.Center,
                )
                Text(
                    text = if (registerMode) "إنشاء الحساب يفتح لك خيارات تناسب كل مناسبة." else "تسجيل الدخول لمتابعة اختيار الهدية.",
                    modifier = Modifier.padding(top = 4.dp, bottom = 17.dp),
                    style = MaterialTheme.typography.bodyMedium,
                    color = FuchsiaColors.Muted,
                    textAlign = TextAlign.Center,
                )
            }
        }
        Row(Modifier.fillMaxWidth().padding(bottom = 14.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            if (!isRegister) {
                Button(onClick = { isRegister = false; error = "" }, modifier = Modifier.weight(1f).height(44.dp), shape = RoundedCornerShape(13.dp), colors = ButtonDefaults.buttonColors(containerColor = FuchsiaColors.Primary)) {
                    Text("تسجيل الدخول", fontWeight = FontWeight.Bold, fontSize = 12.sp)
                }
                OutlinedButton(onClick = { isRegister = true; error = "" }, modifier = Modifier.weight(1f).height(44.dp), shape = RoundedCornerShape(13.dp)) {
                    Text("إنشاء حساب", color = FuchsiaColors.TextAccent, fontWeight = FontWeight.Bold, fontSize = 12.sp)
                }
            } else {
                OutlinedButton(onClick = { isRegister = false; error = "" }, modifier = Modifier.weight(1f).height(44.dp), shape = RoundedCornerShape(13.dp)) {
                    Text("تسجيل الدخول", color = FuchsiaColors.TextAccent, fontWeight = FontWeight.Bold, fontSize = 12.sp)
                }
                Button(onClick = { isRegister = true; error = "" }, modifier = Modifier.weight(1f).height(44.dp), shape = RoundedCornerShape(13.dp), colors = ButtonDefaults.buttonColors(containerColor = FuchsiaColors.Primary)) {
                    Text("إنشاء حساب", fontWeight = FontWeight.Bold, fontSize = 12.sp)
                }
            }
        }

        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(24.dp),
            colors = CardDefaults.cardColors(containerColor = FuchsiaColors.White),
            elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
        ) {
            Column(
                modifier = Modifier.fillMaxWidth().padding(17.dp),
                verticalArrangement = Arrangement.spacedBy(11.dp),
            ) {
                AnimatedVisibility(
                    visible = isRegister,
                    enter = slideInVertically(tween(260)) { -it / 2 } + fadeIn(tween(220)),
                    exit = slideOutVertically(tween(180)) { -it / 3 } + fadeOut(tween(120)),
                ) {
                    Column(verticalArrangement = Arrangement.spacedBy(11.dp)) {
                    AuthField(
                        value = fullName,
                        onValueChange = { fullName = it; error = "" },
                        label = "الاسم الكامل",
                        icon = { Icon(Icons.Rounded.Person, contentDescription = null) },
                        keyboardType = KeyboardType.Text,
                        imeAction = ImeAction.Next,
                    )
                    AuthField(
                        value = phone,
                        onValueChange = { phone = it; error = "" },
                        label = "رقم الهاتف (اختياري)",
                        icon = { Icon(Icons.Rounded.Phone, contentDescription = null) },
                        keyboardType = KeyboardType.Phone,
                        imeAction = ImeAction.Next,
                    )
                    }
                }
                AuthField(
                    value = email,
                    onValueChange = { email = it; error = "" },
                    label = "البريد الإلكتروني",
                    icon = { Icon(Icons.Rounded.Email, contentDescription = null) },
                    keyboardType = KeyboardType.Email,
                    imeAction = ImeAction.Next,
                )
                OutlinedTextField(
                    value = password,
                    onValueChange = { password = it; error = "" },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                    shape = RoundedCornerShape(15.dp),
                    label = { Text("كلمة المرور") },
                    leadingIcon = { Icon(Icons.Rounded.Lock, contentDescription = null, tint = FuchsiaColors.Muted) },
                    trailingIcon = {
                        IconButton(onClick = { showPassword = !showPassword }) {
                            Icon(
                                if (showPassword) Icons.Rounded.VisibilityOff else Icons.Rounded.Visibility,
                                contentDescription = if (showPassword) "إخفاء كلمة المرور" else "إظهار كلمة المرور",
                                tint = FuchsiaColors.Muted,
                            )
                        }
                    },
                    visualTransformation = if (showPassword) VisualTransformation.None else PasswordVisualTransformation(),
                    keyboardOptions = KeyboardOptions(
                        keyboardType = KeyboardType.Password,
                        imeAction = ImeAction.Done,
                    ),
                    colors = fieldColors(),
                )

                if (error.isNotBlank()) ErrorMessage(error)

                Button(
                    onClick = {
                        error = ""
                        val normalizedEmail = email.trim().lowercase()
                        if (!Patterns.EMAIL_ADDRESS.matcher(normalizedEmail).matches()) {
                            error = "يرجى إدخال بريد إلكتروني صحيح."
                        } else if (password.length < 8) {
                            error = "كلمة المرور يجب أن تحتوي على 8 أحرف على الأقل."
                        } else if (isRegister && fullName.trim().length < 2) {
                            error = "يرجى إدخال الاسم الكامل."
                        } else {
                            busy = true
                            scope.launch {
                                try {
                                    if (isRegister) {
                                        val response = FuchsiaApi.requestRegistrationCode(
                                            fullName.trim(), normalizedEmail, password, phone.trim(),
                                        )
                                        val debugCode = response.optString("debugCode").takeIf { it.length == 6 }
                                        onCodeRequested(normalizedEmail, debugCode)
                                    } else {
                                        val session = FuchsiaApi.login(normalizedEmail, password)
                                        SessionVault.save(context, session.user, session.token)
                                        onAuthComplete()
                                    }
                                } catch (failure: Throwable) {
                                    error = failure.message ?: "تعذر الاتصال بالخادم. يرجى المحاولة مجددًا."
                                } finally {
                                    busy = false
                                }
                            }
                        }
                    },
                    enabled = !busy,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(56.dp)
                        .background(
                            Brush.horizontalGradient(listOf(FuchsiaColors.Primary, FuchsiaColors.PrimaryDark)),
                            RoundedCornerShape(17.dp),
                        ),
                    shape = RoundedCornerShape(16.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = androidx.compose.ui.graphics.Color.Transparent),
                    elevation = ButtonDefaults.buttonElevation(defaultElevation = 3.dp, pressedElevation = 1.dp),
                ) {
                    if (busy) {
                        CircularProgressIndicator(modifier = Modifier.size(21.dp), color = FuchsiaColors.White, strokeWidth = 2.dp)
                    } else {
                        Text(if (isRegister) "متابعة إلى التحقق" else "تسجيل الدخول", fontWeight = FontWeight.Bold)
                    }
                }

                OutlinedButton(
                        onClick = {
                            error = ""
                            busy = true
                            scope.launch {
                                try {
                                    val session = FuchsiaApi.guest()
                                    SessionVault.save(context, session.user, session.token)
                                    onAuthComplete()
                                } catch (failure: Throwable) {
                                    error = failure.message ?: "تعذر بدء التصفح دون حساب."
                                } finally {
                                    busy = false
                                }
                            }
                        },
                        enabled = !busy,
                        modifier = Modifier.fillMaxWidth().height(51.dp),
                        shape = RoundedCornerShape(15.dp),
                        colors = ButtonDefaults.outlinedButtonColors(contentColor = FuchsiaColors.PrimaryDark),
                ) {
                    Text("التصفح دون حساب", fontWeight = FontWeight.SemiBold)
                }
            }
        }

        Text(
            "بياناتك محفوظة بأمان على جهازك.",
            modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp),
            color = FuchsiaColors.Muted,
            style = MaterialTheme.typography.bodyMedium.copy(fontSize = 12.sp),
            textAlign = TextAlign.Center,
        )
    }
}

@Composable
private fun AuthField(
    value: String,
    onValueChange: (String) -> Unit,
    label: String,
    icon: @Composable () -> Unit,
    keyboardType: KeyboardType,
    imeAction: ImeAction,
) {
    OutlinedTextField(
        value = value,
        onValueChange = onValueChange,
        modifier = Modifier.fillMaxWidth(),
        singleLine = true,
        shape = RoundedCornerShape(15.dp),
        label = { Text(label) },
        leadingIcon = icon,
        keyboardOptions = KeyboardOptions(keyboardType = keyboardType, imeAction = imeAction),
        colors = fieldColors(),
    )
}

@Composable
private fun fieldColors() = OutlinedTextFieldDefaults.colors(
    focusedBorderColor = FuchsiaColors.Primary,
    unfocusedBorderColor = FuchsiaColors.Line,
    focusedLabelColor = FuchsiaColors.TextAccent,
    cursorColor = FuchsiaColors.Primary,
    focusedContainerColor = FuchsiaColors.White,
    unfocusedContainerColor = FuchsiaColors.White,
)

@Composable
internal fun ErrorMessage(message: String) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        color = FuchsiaColors.Error.copy(alpha = 0.08f),
    ) {
        Text(
            text = message,
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 10.dp),
            color = FuchsiaColors.Error,
            style = MaterialTheme.typography.bodyMedium,
            textAlign = TextAlign.Start,
        )
    }
}
