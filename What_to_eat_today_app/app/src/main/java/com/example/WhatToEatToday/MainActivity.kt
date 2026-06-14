package com.example.WhatToEatToday

import android.Manifest
import android.annotation.SuppressLint
import android.app.Activity
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.os.Bundle
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import android.view.ViewGroup
import android.webkit.JavascriptInterface
import android.webkit.WebChromeClient
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.ComponentActivity
import androidx.activity.compose.BackHandler
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Scaffold
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import com.example.WhatToEatToday.ui.theme.今天吃什么Theme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            今天吃什么Theme {
                Scaffold(modifier = Modifier.fillMaxSize()) { _ ->
                    WebViewScreen()
                }
            }
        }
    }
}

@SuppressLint("SetJavaScriptEnabled")
@Composable
fun WebViewScreen(
    url: String = "http://111.229.182.32:3000"
) {
    var isLoading by remember { mutableStateOf(true) }
    var webView by remember { mutableStateOf<WebView?>(null) }

    BackHandler(enabled = webView?.canGoBack() == true) {
        webView?.goBack()
    }

    val bridgeHolder = remember { mutableStateOf<SpeechBridge?>(null) }

    Box(modifier = Modifier.fillMaxSize()) {
        AndroidView(
            modifier = Modifier.fillMaxSize(),
            factory = { context ->
                WebView(context).apply {
                    layoutParams = ViewGroup.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.MATCH_PARENT
                    )

                    settings.javaScriptEnabled = true
                    settings.domStorageEnabled = true
                    settings.useWideViewPort = true
                    settings.loadWithOverviewMode = true
                    settings.builtInZoomControls = true
                    settings.displayZoomControls = false
                    settings.setSupportZoom(true)
                    settings.allowFileAccess = false
                    settings.allowContentAccess = false

                    webViewClient = object : WebViewClient() {
                        override fun onPageStarted(view: WebView?, url: String?, favicon: Bitmap?) {
                            isLoading = true
                        }

                        override fun onPageFinished(view: WebView?, url: String?) {
                            isLoading = false
                        }
                    }

                    webChromeClient = object : WebChromeClient() {
                        override fun onProgressChanged(view: WebView?, newProgress: Int) {
                            if (newProgress == 100) {
                                isLoading = false
                            }
                        }
                    }

                    SpeechBridge(context as Activity, this).also {
                        addJavascriptInterface(it, "androidSpeech")
                        bridgeHolder.value = it
                    }

                    loadUrl(url)
                    webView = this
                }
            },
            update = { view ->
                view.loadUrl(url)
            }
        )

        if (isLoading) {
            CircularProgressIndicator(
                modifier = Modifier.align(Alignment.Center)
            )
        }
    }

    DisposableEffect(Unit) {
        onDispose {
            bridgeHolder.value?.destroy()
        }
    }
}

class SpeechBridge(
    private val activity: Activity,
    private val webView: WebView
) {
    private val recognizer: SpeechRecognizer? =
        if (SpeechRecognizer.isRecognitionAvailable(activity)) {
            SpeechRecognizer.createSpeechRecognizer(activity)
        } else null

    private val listener = object : RecognitionListener {
        override fun onReadyForSpeech(params: Bundle?) {}
        override fun onBeginningOfSpeech() {}
        override fun onRmsChanged(rmsdB: Float) {}
        override fun onBufferReceived(buffer: ByteArray?) {}
        override fun onEndOfSpeech() {
            postToJs("window.__speechOnEnd?.()")
        }

        override fun onError(error: Int) {
            val msg = when (error) {
                SpeechRecognizer.ERROR_NO_MATCH -> "没有识别到语音"
                SpeechRecognizer.ERROR_NETWORK -> "网络错误"
                SpeechRecognizer.ERROR_AUDIO -> "音频错误"
                SpeechRecognizer.ERROR_SPEECH_TIMEOUT -> "未检测到语音"
                else -> "识别失败"
            }
            postToJs("window.__speechOnError?.('${msg.replace("'", "\\'")}')")
        }

        override fun onResults(results: Bundle?) {
            val text = results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)?.firstOrNull() ?: ""
            postToJs("window.__speechOnResult?.('${text.replace("'", "\\'")}')")
        }

        @Suppress("DEPRECATION")
        override fun onPartialResults(partialResults: Bundle?) {
            val text = partialResults?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)?.firstOrNull() ?: ""
            postToJs("window.__speechOnInterim?.('${text.replace("'", "\\'")}')")
        }

        override fun onEvent(eventType: Int, params: Bundle?) {}
    }

    private fun postToJs(script: String) {
        activity.runOnUiThread {
            webView.evaluateJavascript(script, null)
        }
    }

    @JavascriptInterface
    fun startListening() {
        if (recognizer == null) {
            postToJs("window.__speechOnError?.('语音识别不可用')")
            return
        }
        if (ContextCompat.checkSelfPermission(activity, Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            postToJs("window.__speechOnError?.('需要麦克风权限')")
            return
        }
        activity.runOnUiThread {
            val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
                putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
                putExtra(RecognizerIntent.EXTRA_LANGUAGE, "zh-CN")
                putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
            }
            recognizer.setRecognitionListener(listener)
            recognizer.startListening(intent)
        }
    }

    @JavascriptInterface
    fun stopListening() {
        activity.runOnUiThread {
            recognizer?.stopListening()
        }
    }

    fun destroy() {
        recognizer?.destroy()
    }
}
