package com.sourcetoad.reactnativesketchcanvas

import android.graphics.PointF
import android.util.Log
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.common.MapBuilder
import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.ViewManagerDelegate
import com.facebook.react.uimanager.annotations.ReactProp
import com.facebook.react.viewmanagers.RNTSketchCanvasManagerDelegate
import com.facebook.react.viewmanagers.RNTSketchCanvasManagerInterface


@ReactModule(name = RNTSketchCanvasViewManager.NAME)
class RNTSketchCanvasViewManager :
    SimpleViewManager<RNTSketchCanvasView>(),
    RNTSketchCanvasManagerInterface<RNTSketchCanvasView> {
    private val mDelegate: ViewManagerDelegate<RNTSketchCanvasView>

    init {
        mDelegate = RNTSketchCanvasManagerDelegate(this)
    }

    override fun getDelegate(): ViewManagerDelegate<RNTSketchCanvasView>? {
        return mDelegate
    }

    override fun getName(): String {
        return NAME
    }

    override fun receiveCommand(
        root: RNTSketchCanvasView,
        commandId: String,
        args: ReadableArray?
    ) {
        if (root.getSketchCanvas().isCanvasReady()) {
            mDelegate.receiveCommand(root, commandId, args)
        } else {
            Log.i("RNTSketchCanvas", "Canvas is not ready")
        }
    }

    override fun getExportedCustomBubblingEventTypeConstants(): MutableMap<String, Any> {
        return MapBuilder.of(
            OnChangeEvent.EVENT_NAME,
            MapBuilder.of(
                "phasedRegistrationNames",
                MapBuilder.of(
                    "bubbled", "onChange",
                    "captured", "onChangeCapture"
                )
            )
        )
    }

    override fun getExportedCustomDirectEventTypeConstants(): MutableMap<String, Any> {
        return MapBuilder.of(
            OnGenerateBase64Event.EVENT_NAME,
            MapBuilder.of(
                "registrationName",
                "onGenerateBase64"
            ),
            OnCanvasReadyEvent.EVENT_NAME,
            MapBuilder.of(
                "registrationName",
                "onCanvasReady"
            )
        )
    }

    public override fun createViewInstance(context: ThemedReactContext): RNTSketchCanvasView {
        return RNTSketchCanvasView(context)
    }

    companion object {
        const val NAME = "RNTSketchCanvas"
    }

    @ReactProp(name = "localSourceImage")
    override fun setLocalSourceImage(view: RNTSketchCanvasView?, localSourceImage: ReadableMap?) {
        if (localSourceImage?.getString("filename") != null) {
            view?.getSketchCanvas()?.openImageFile(
                if (localSourceImage.hasKey("filename")) localSourceImage.getString("filename") else null,
                if (localSourceImage.hasKey("directory")) localSourceImage.getString("directory") else "",
                if (localSourceImage.hasKey("mode")) localSourceImage.getString("mode") else ""
            )
        }
    }

    @ReactProp(name = "text")
    override fun setText(view: RNTSketchCanvasView?, text: ReadableArray?) {
        view?.getSketchCanvas()?.setCanvasText(text)
    }

    override fun save(
        view: RNTSketchCanvasView?,
        imageType: String,
        folder: String,
        filename: String,
        transparent: Boolean,
        includeImage: Boolean,
        includeText: Boolean,
        cropToImageSize: Boolean
    ) {
        view?.getSketchCanvas()?.save(
            imageType,
            folder ?: "",
            filename,
            transparent,
            includeImage,
            includeText,
            cropToImageSize
        )
    }

    override fun addPoint(view: RNTSketchCanvasView?, x: Double, y: Double) {
        view?.getSketchCanvas()?.addPoint(x.toFloat(), y.toFloat())
    }

    override fun addPath(
        view: RNTSketchCanvasView?,
        pathId: Int,
        color: Int,
        width: Double,
        points: ReadableArray?
    ) {
        val path: ReadableArray? = points
        val pointPath = path?.let { ArrayList<PointF>(it.size()) }
        if (path != null) {
            for (i in 0 until path.size()) {
                val coor =
                    path.getString(i)?.split(",".toRegex())?.dropLastWhile { it.isEmpty() }
                        ?.toTypedArray()
                if (coor != null && pointPath != null) {
                    pointPath.add(PointF(coor[0].toFloat(), coor[1].toFloat()))
                }
            }
        }

        if (pointPath != null) {
            view?.getSketchCanvas()?.addPath(pathId, color, width.toFloat(), pointPath)
        };
    }

    override fun newPath(view: RNTSketchCanvasView?, pathId: Int, color: Int, width: Double) {
        view?.getSketchCanvas()?.newPath(pathId, color, width.toFloat())
    }

    override fun deletePath(view: RNTSketchCanvasView?, pathId: Int) {
        view?.getSketchCanvas()?.deletePath(pathId)
    }

    override fun endPath(view: RNTSketchCanvasView?) {
        view?.getSketchCanvas()?.end()
    }

    override fun clear(view: RNTSketchCanvasView?) {
        view?.getSketchCanvas()?.clear()
    }

    override fun transferToBase64(
        view: RNTSketchCanvasView?,
        imageType: String,
        transparent: Boolean,
        includeImage: Boolean,
        includeText: Boolean,
        cropToImageSize: Boolean
    ) {
        view?.getSketchCanvas()
            ?.getBase64(imageType, transparent, includeImage, includeText, cropToImageSize)
    }
}
