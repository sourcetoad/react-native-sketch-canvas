package com.sourcetoad.reactnativesketchcanvas

import com.facebook.react.BaseReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfoProvider
import com.facebook.react.uimanager.ViewManager
import com.margelo.nitro.sketchcanvas.RNSketchCanvasNitroOnLoad
import com.margelo.nitro.sketchcanvas.views.HybridSketchCanvasViewManager

class RNTSketchCanvasViewPackage : BaseReactPackage() {
    override fun getModule(name: String, reactContext: ReactApplicationContext): NativeModule? {
        return null
    }

    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> {
        return listOf(HybridSketchCanvasViewManager())
    }

    override fun getReactModuleInfoProvider(): ReactModuleInfoProvider {
        return ReactModuleInfoProvider { emptyMap() }
    }

    companion object {
        init {
            RNSketchCanvasNitroOnLoad.initializeNative()
        }
    }
}
