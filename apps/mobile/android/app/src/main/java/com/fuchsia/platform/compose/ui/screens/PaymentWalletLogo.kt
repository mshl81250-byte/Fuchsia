package com.fuchsia.platform.compose.ui.screens

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Payment
import androidx.compose.material3.Icon
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.unit.dp
import coil3.compose.AsyncImage
import com.fuchsia.platform.compose.data.PaymentWallet
import com.fuchsia.platform.compose.ui.theme.FuchsiaColors

@Composable
fun PaymentWalletLogo(wallet: PaymentWallet, modifier: Modifier = Modifier.size(48.dp)) {
    Surface(
        modifier = modifier,
        shape = RoundedCornerShape(14.dp),
        color = FuchsiaColors.White,
        border = BorderStroke(1.dp, FuchsiaColors.Line),
    ) {
        Box(contentAlignment = Alignment.Center) {
            Icon(Icons.Rounded.Payment, contentDescription = null, tint = FuchsiaColors.Primary, modifier = Modifier.size(25.dp))
            wallet.iconUrl?.takeIf(String::isNotBlank)?.let { iconUrl ->
                AsyncImage(
                    model = iconUrl,
                    contentDescription = "شعار ${wallet.name}",
                    modifier = Modifier.fillMaxSize().padding(4.dp).clip(RoundedCornerShape(10.dp)),
                    contentScale = ContentScale.Fit,
                )
            }
        }
    }
}
