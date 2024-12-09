package com.sourcetoad.reactnativesketchcanvas

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.annotations.ReactModule

@ReactModule(name = RNTSketchCanvasManagerModule.NAME)
class RNTSketchCanvasManagerModule(reactContext: ReactApplicationContext) :
        NativeSketchCanvasModuleSpec(reactContext) {

  override fun getName(): String {
    return NAME
  }

  override fun getTypedExportedConstants(): MutableMap<String, Any> {
    return mutableMapOf(
            "MainBundlePath" to "",
            "NSDocumentDirectory" to "",
            "NSLibraryDirectory" to "",
            "NSCachesDirectory" to ""
    )
  }

  companion object {
    const val NAME = "SketchCanvasModule"
  }
}
