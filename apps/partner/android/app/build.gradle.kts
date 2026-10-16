plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.plugin.compose")
}

val fuchsiaApiBaseUrl = providers.gradleProperty("FUCHSIA_API_BASE_URL")
    .orElse(providers.environmentVariable("FUCHSIA_API_BASE_URL"))
    .getOrElse("https://fuchsia-x7dwxpzd.manus.space")
    .trimEnd('/')
fun String.asBuildConfigString() = "\"${replace("\\", "\\\\").replace("\"", "\\\"")}\""
val firebaseProjectId = providers.gradleProperty("FIREBASE_PROJECT_ID").orElse(providers.environmentVariable("FIREBASE_PROJECT_ID")).getOrElse("")
val firebaseApplicationId = providers.gradleProperty("FIREBASE_APPLICATION_ID").orElse(providers.environmentVariable("FIREBASE_APPLICATION_ID")).getOrElse("")
val firebaseApiKey = providers.gradleProperty("FIREBASE_API_KEY").orElse(providers.environmentVariable("FIREBASE_API_KEY")).getOrElse("")
val firebaseMessagingSenderId = providers.gradleProperty("FIREBASE_MESSAGING_SENDER_ID").orElse(providers.environmentVariable("FIREBASE_MESSAGING_SENDER_ID")).getOrElse("")
val firebaseStorageBucket = providers.gradleProperty("FIREBASE_STORAGE_BUCKET").orElse(providers.environmentVariable("FIREBASE_STORAGE_BUCKET")).getOrElse("")

android {
    namespace = "com.fuchsia.partner"
    compileSdk = 37
    buildToolsVersion = "36.0.0"

    defaultConfig {
        applicationId = "com.fuchsia.partner"
        minSdk = 24
        targetSdk = 36
        versionCode = 2
        versionName = "0.2.0"
        buildConfigField("String", "API_BASE_URL", fuchsiaApiBaseUrl.asBuildConfigString())
        buildConfigField("String", "FIREBASE_PROJECT_ID", firebaseProjectId.asBuildConfigString())
        buildConfigField("String", "FIREBASE_APPLICATION_ID", firebaseApplicationId.asBuildConfigString())
        buildConfigField("String", "FIREBASE_API_KEY", firebaseApiKey.asBuildConfigString())
        buildConfigField("String", "FIREBASE_MESSAGING_SENDER_ID", firebaseMessagingSenderId.asBuildConfigString())
        buildConfigField("String", "FIREBASE_STORAGE_BUCKET", firebaseStorageBucket.asBuildConfigString())
    }

    buildTypes {
        debug {
            versionNameSuffix = "-debug"
        }
        release {
            isMinifyEnabled = true
            isShrinkResources = true
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
}

dependencies {
    implementation(project(":design-system"))
    implementation(platform("androidx.compose:compose-bom:2026.09.00"))
    implementation("androidx.activity:activity-compose:1.13.0")
    implementation("androidx.core:core-ktx:1.17.0")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.material:material-icons-extended")
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("io.coil-kt:coil-compose:2.7.0")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.10.2")
    implementation("com.google.firebase:firebase-messaging:24.1.0")

    debugImplementation("androidx.compose.ui:ui-tooling")
}
