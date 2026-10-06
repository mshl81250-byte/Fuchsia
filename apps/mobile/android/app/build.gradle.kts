plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.plugin.compose")
}

val releaseStoreFile = providers.gradleProperty("FUCHSIA_RELEASE_STORE_FILE")
    .orElse(providers.environmentVariable("FUCHSIA_RELEASE_STORE_FILE")).orNull
val releaseStorePassword = providers.gradleProperty("FUCHSIA_RELEASE_STORE_PASSWORD")
    .orElse(providers.environmentVariable("FUCHSIA_RELEASE_STORE_PASSWORD")).orNull
val releaseKeyAlias = providers.gradleProperty("FUCHSIA_RELEASE_KEY_ALIAS")
    .orElse(providers.environmentVariable("FUCHSIA_RELEASE_KEY_ALIAS")).orNull
val releaseKeyPassword = providers.gradleProperty("FUCHSIA_RELEASE_KEY_PASSWORD")
    .orElse(providers.environmentVariable("FUCHSIA_RELEASE_KEY_PASSWORD")).orNull

android {
    namespace = "com.fuchsia.platform.compose"
    compileSdk = 37
    buildToolsVersion = "36.0.0"

    defaultConfig {
        applicationId = "com.fuchsia.platform.compose"
        minSdk = 24
        targetSdk = 36
        versionCode = 1
        versionName = "1.0.0-native"
        buildConfigField("String", "API_BASE_URL", "\"https://fuchsia-x7dwxpzd.manus.space\"")
        // The user explicitly requested on-screen OTP visibility as the sole test exception.
        buildConfigField("boolean", "OTP_DEBUG", "true")
    }

    signingConfigs {
        create("release") {
            if (releaseStoreFile != null && releaseStorePassword != null &&
                releaseKeyAlias != null && releaseKeyPassword != null
            ) {
                storeFile = file(releaseStoreFile!!)
                storePassword = releaseStorePassword
                keyAlias = releaseKeyAlias
                keyPassword = releaseKeyPassword
            }
        }
    }

    buildTypes {
        debug {
            applicationIdSuffix = ".debug"
            versionNameSuffix = "-debug"
        }
        release {
            isMinifyEnabled = true
            signingConfig = signingConfigs.getByName("release")
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro",
            )
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    buildFeatures {
        compose = true
        buildConfig = true
    }

    packaging {
        resources.excludes += "/META-INF/{AL2.0,LGPL2.1}"
    }
}

dependencies {
    val composeBom = platform("androidx.compose:compose-bom:2026.09.00")
    implementation(composeBom)
    androidTestImplementation(composeBom)

    implementation("androidx.activity:activity-compose:1.13.0")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.material:material-icons-extended")
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.navigation:navigation-compose:2.10.2")
    implementation("androidx.lifecycle:lifecycle-runtime-compose:2.11.0")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.10.2")
    implementation("io.coil-kt.coil3:coil-compose:3.3.0")
    implementation("io.coil-kt.coil3:coil-network-okhttp:3.3.0")

    debugImplementation("androidx.compose.ui:ui-tooling")
    debugImplementation("androidx.compose.ui:ui-test-manifest")
    testImplementation("junit:junit:4.13.2")
    androidTestImplementation("androidx.test.ext:junit:1.3.0")
    androidTestImplementation("androidx.test.espresso:espresso-core:3.7.0")
    androidTestImplementation("androidx.compose.ui:ui-test-junit4")
}
