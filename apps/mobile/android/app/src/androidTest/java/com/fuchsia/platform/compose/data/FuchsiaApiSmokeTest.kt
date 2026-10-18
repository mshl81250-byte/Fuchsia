package com.fuchsia.platform.compose.data

import androidx.test.ext.junit.runners.AndroidJUnit4
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertFalse
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class FuchsiaApiSmokeTest {
    @Test
    fun categoriesAreLoadedFromConfiguredApi() = runBlocking {
        val categories = FuchsiaApi.categories()
        assertFalse("The configured API should return at least one category", categories.isEmpty())
    }
}
