package com.sourcetoad.reactnativesketchcanvas

import com.facebook.react.uimanager.ThemedReactContext
import android.util.AttributeSet
import android.view.ViewGroup

class RNTSketchCanvasView : ViewGroup {
    private var sketchCanvas: SketchCanvas? = null

    constructor(context: ThemedReactContext?) : super(context) {
        init(context)
    }

    constructor(context: ThemedReactContext?, attrs: AttributeSet?) : super(context, attrs) {
        init(context)
    }

    constructor(context: ThemedReactContext?, attrs: AttributeSet?, defStyleAttr: Int) : super(
        context,
        attrs,
        defStyleAttr
    ) {
        init(context)
    }

    private fun init(context: ThemedReactContext?) {
        sketchCanvas = SketchCanvas(context!!)

        addView(sketchCanvas)
    }

    fun getSketchCanvas(): SketchCanvas {
        return sketchCanvas!!
    }

    override fun onLayout(
        changed: Boolean,
        left: Int,
        top: Int,
        right: Int,
        bottom: Int
    ) {
        sketchCanvas!!.layout(0, 0, right - left, bottom - top)
    }
}