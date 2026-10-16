package com.fuchsia.platform.compose.ui.screens

import android.os.Bundle
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.LocationOn
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.compose.LocalLifecycleOwner
import com.fuchsia.platform.compose.ui.theme.FuchsiaColors
import org.maplibre.android.MapLibre
import org.maplibre.android.camera.CameraPosition
import org.maplibre.android.camera.CameraUpdateFactory
import org.maplibre.android.geometry.LatLng
import org.maplibre.android.maps.MapLibreMap
import org.maplibre.android.maps.MapView
import java.util.Locale

private const val OPEN_FREE_MAP_STYLE = "https://tiles.openfreemap.org/styles/positron"
private const val DEFAULT_LATITUDE = 15.3694
private const val DEFAULT_LONGITUDE = 44.1910

@Composable
fun MapLocationPicker(
    selectedLatitude: Double?,
    selectedLongitude: Double?,
    onConfirmLocation: (Double, Double) -> Unit,
    modifier: Modifier = Modifier,
) {
    val context = LocalContext.current
    val lifecycle = LocalLifecycleOwner.current.lifecycle
    var map by remember { mutableStateOf<MapLibreMap?>(null) }
    var mapLoaded by remember { mutableStateOf(false) }
    var centerLatitude by remember { mutableStateOf(selectedLatitude ?: DEFAULT_LATITUDE) }
    var centerLongitude by remember { mutableStateOf(selectedLongitude ?: DEFAULT_LONGITUDE) }

    val mapView = remember(context) {
        MapLibre.getInstance(context.applicationContext)
        MapView(context).apply { onCreate(Bundle()) }
    }

    DisposableEffect(lifecycle, mapView) {
        val observer = LifecycleEventObserver { _, event ->
            when (event) {
                Lifecycle.Event.ON_START -> mapView.onStart()
                Lifecycle.Event.ON_RESUME -> mapView.onResume()
                Lifecycle.Event.ON_PAUSE -> mapView.onPause()
                Lifecycle.Event.ON_STOP -> mapView.onStop()
                else -> Unit
            }
        }
        lifecycle.addObserver(observer)
        if (lifecycle.currentState.isAtLeast(Lifecycle.State.STARTED)) mapView.onStart()
        if (lifecycle.currentState.isAtLeast(Lifecycle.State.RESUMED)) mapView.onResume()
        onDispose {
            lifecycle.removeObserver(observer)
            mapView.onPause()
            mapView.onStop()
            mapView.onDestroy()
            map = null
        }
    }

    LaunchedEffect(selectedLatitude, selectedLongitude, mapLoaded) {
        val currentMap = map ?: return@LaunchedEffect
        if (!mapLoaded || selectedLatitude == null || selectedLongitude == null) return@LaunchedEffect
        centerLatitude = selectedLatitude
        centerLongitude = selectedLongitude
        currentMap.animateCamera(
            CameraUpdateFactory.newLatLngZoom(LatLng(selectedLatitude, selectedLongitude), 16.0),
            350,
        )
    }

    Column(modifier = modifier, verticalArrangement = Arrangement.spacedBy(9.dp)) {
        Text(
            "يمكن سحب الخريطة حتى يستقر الدبوس على نقطة التسليم، ثم اعتماد الموقع.",
            color = FuchsiaColors.Muted,
            fontSize = 12.sp,
        )
        Box(
            modifier = Modifier.fillMaxWidth().height(252.dp).clip(RoundedCornerShape(17.dp)).background(Color(0xFFE8E5E3)),
        ) {
            AndroidView(
                factory = {
                    mapView.getMapAsync { nativeMap ->
                        map = nativeMap
                        nativeMap.setStyle(OPEN_FREE_MAP_STYLE) {
                            mapLoaded = true
                            val target = LatLng(selectedLatitude ?: DEFAULT_LATITUDE, selectedLongitude ?: DEFAULT_LONGITUDE)
                            nativeMap.cameraPosition = CameraPosition.Builder().target(target).zoom(15.0).build()
                            nativeMap.addOnCameraIdleListener {
                                val point = nativeMap.cameraPosition.target ?: return@addOnCameraIdleListener
                                centerLatitude = point.latitude
                                centerLongitude = point.longitude
                            }
                        }
                    }
                    mapView
                },
                modifier = Modifier.fillMaxSize(),
            )

            Box(
                modifier = Modifier.align(Alignment.Center).padding(bottom = 20.dp),
                contentAlignment = Alignment.Center,
            ) {
                Box(Modifier.size(34.dp).background(FuchsiaColors.Primary.copy(alpha = 0.16f), CircleShape))
                Icon(
                    Icons.Rounded.LocationOn,
                    contentDescription = "دبوس موقع التسليم",
                    tint = FuchsiaColors.Primary,
                    modifier = Modifier.size(42.dp).align(Alignment.TopCenter),
                )
            }

            if (!mapLoaded) {
                Column(
                    modifier = Modifier.align(Alignment.Center).clip(RoundedCornerShape(15.dp)).background(Color.White.copy(alpha = 0.93f)).padding(horizontal = 18.dp, vertical = 13.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(7.dp),
                ) {
                    CircularProgressIndicator(modifier = Modifier.size(22.dp), color = FuchsiaColors.Primary, strokeWidth = 2.dp)
                    Text("جارٍ تحميل الخريطة…", color = FuchsiaColors.Ink, style = MaterialTheme.typography.bodySmall)
                }
            }
        }
        Text(
            "${String.format(Locale.US, "%.5f", centerLatitude)}، ${String.format(Locale.US, "%.5f", centerLongitude)}",
            color = FuchsiaColors.Ink,
            fontSize = 11.sp,
            fontWeight = FontWeight.SemiBold,
        )
        Text(
            "© OpenFreeMap · © OpenMapTiles · بيانات © OpenStreetMap",
            color = FuchsiaColors.Muted,
            fontSize = 10.sp,
        )
        Button(
            onClick = { onConfirmLocation(centerLatitude, centerLongitude) },
            enabled = mapLoaded,
            modifier = Modifier.fillMaxWidth().height(45.dp),
            shape = RoundedCornerShape(13.dp),
            colors = ButtonDefaults.buttonColors(containerColor = FuchsiaColors.Primary),
        ) {
            Icon(Icons.Rounded.LocationOn, contentDescription = null, modifier = Modifier.size(18.dp))
            Text("  اعتماد نقطة الدبوس", fontWeight = FontWeight.Bold)
        }
    }
}
