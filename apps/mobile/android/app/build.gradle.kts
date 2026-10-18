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
val fuchsiaApiBaseUrl = providers.gradleProperty("FUCHSIA_API_BASE_URL")
    .orElse(providers.environmentVariable("FUCHSIA_API_BASE_URL"))
    .getOrElse("https://fuchsia-wvbrvhtl.manus.space")
    .trimEnd('/')
fun String.asBuildConfigString() = "\"${replace("\\", "\\\\").replace("\"", "\\\"")}\""

android {
    namespace = "com.fuchsia.platform.compose"
    compileSdk = 37
    buildToolsVersion = "36.0.0"

    defaultConfig {
        applicationId = "com.fuchsia.platform"
        minSdk = 24
        targetSdk = 36
        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
        versionCode = 7
        versionName = "1.3.2"
        buildConfigField("long", "BUILD_TIMESTAMP_MS", "${System.currentTimeMillis()}L")
        buildConfigField("String", "API_BASE_URL", fuchsiaApiBaseUrl.asBuildConfigString())
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
            isShrinkResources = true
            signingConfig = if (
                releaseStoreFile != null && releaseStorePassword != null &&
                releaseKeyAlias != null && releaseKeyPassword != null
            ) signingConfigs.getByName("release") else signingConfigs.getByName("debug")
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro",
            )
        }
    }

    splits {
        abi {
            isEnable = true
            reset()
            include("arm64-v8a", "armeabi-v7a")
            isUniversalApk = false
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
    implementation(project(":design-system"))
    val composeBom = platform("androidx.compose:compose-bom:2026.09.00")
    implementation(composeBom)
    androidTestImplementation(composeBom)

    implementation("androidx.activity:activity-compose:1.13.0")
    implementation("androidx.core:core-ktx:1.17.0")
    implementation("androidx.biometric:biometric:1.1.0")
    implementation("androidx.fragment:fragment-ktx:1.8.9")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.material:material-icons-extended")
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.navigation:navigation-compose:2.10.2")
    implementation("androidx.lifecycle:lifecycle-runtime-compose:2.11.0")
    implementation("org.maplibre.gl:android-sdk:13.6.1")
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
