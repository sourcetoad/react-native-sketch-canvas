package com.margelo.nitro.sketchcanvas

import android.graphics.PointF
import android.util.Log
import android.view.View
import androidx.annotation.Keep
import com.facebook.proguard.annotations.DoNotStrip
import com.facebook.react.uimanager.ThemedReactContext
import com.margelo.nitro.core.ArrayBuffer
import com.margelo.nitro.core.Promise
import com.sourcetoad.reactnativesketchcanvas.CanvasTextInput
import com.sourcetoad.reactnativesketchcanvas.InitialPathInput
import com.sourcetoad.reactnativesketchcanvas.SketchCanvas
import java.io.PrintWriter

@Keep
@DoNotStrip
class HybridSketchCanvasView(context: ThemedReactContext) : HybridSketchCanvasViewSpec() {
  private val canvas = SketchCanvas(context)

  override val view: View = canvas

  override var localSourceImage: LocalSourceImage? = null
    set(value) {
      if (value == field) return
      field = value
      value?.let { canvas.openImageFile(it.filename, it.directory ?: "", it.mode ?: "") }
    }

  override var text: Array<SketchCanvasText>? = null
    set(value) {
      if (value contentEquals field) return
      field = value
      canvas.setCanvasText(value?.map { it.toCanvasTextInput() })
    }

  override var onCanvasReady: (() -> Unit)? = null
    set(value) {
      field = value
      canvas.onCanvasReady = value
    }

  override var onPathsChange: ((count: Double) -> Unit)? = null
    set(value) {
      field = value
      canvas.onPathsChange = value?.let { callback -> { count: Int -> callback(count.toDouble()) } }
    }

  override var onInitialPathsLoaded: ((count: Double) -> Unit)? = null
    set(value) {
      field = value
      canvas.onInitialPathsLoaded =
        value?.let { callback -> { count: Int -> callback(count.toDouble()) } }
    }

  override fun onDropView() {
    onCanvasReady = null
    onPathsChange = null
    onInitialPathsLoaded = null
    canvas.cancelPendingImageLoad()
  }

  private inline fun onUi(crossinline block: (SketchCanvas) -> Unit) {
    canvas.post {
      if (canvas.isCanvasReady()) block(canvas) else Log.i(TAG, NOT_READY)
    }
  }

  private inline fun <T> onUiPromise(crossinline block: (SketchCanvas) -> T): Promise<T> {
    val promise = Promise<T>()
    canvas.post {
      if (!canvas.isCanvasReady()) {
        Log.i(TAG, NOT_READY)
        promise.reject(CanvasNotReadyError())
        return@post
      }
      try {
        promise.resolve(block(canvas))
      } catch (e: Throwable) {
        promise.reject(e)
      }
    }
    return promise
  }

  override fun newPath(pathId: Double, color: Double, width: Double) =
    onUi { it.newPath(pathId.toLong().toInt(), color.toLong().toInt(), width.toFloat()) }

  override fun addPoint(x: Double, y: Double) = onUi { it.addPoint(x.toFloat(), y.toFloat()) }

  override fun endPath() = onUi { it.end() }

  override fun addPath(pathId: Double, color: Double, width: Double, points: Array<String>) =
    onUi {
      val pointPath = ArrayList<PointF>(points.size)
      for (point in points) {
        val coor = point.split(",".toRegex()).dropLastWhile { c -> c.isEmpty() }.toTypedArray()
        pointPath.add(PointF(coor[0].toFloat(), coor[1].toFloat()))
      }
      it.addPath(pathId.toLong().toInt(), color.toLong().toInt(), width.toFloat(), pointPath)
    }

  override fun addInitialPaths(paths: Array<SketchCanvasInitialPath>) =
    onUi {
      it.addInitialPaths(
        paths.map { path ->
          InitialPathInput(
            path.pathId.toLong().toInt(),
            path.color.toLong().toInt(),
            path.width.toFloat(),
            path.points.toList()
          )
        }
      )
    }

  override fun deletePath(pathId: Double) = onUi { it.deletePath(pathId.toLong().toInt()) }

  override fun clear() = onUi { it.clear() }

  override fun save(
    imageType: String,
    folder: String,
    filename: String,
    transparent: Boolean,
    includeImage: Boolean,
    includeText: Boolean,
    cropToImageSize: Boolean
  ): Promise<SketchCanvasSaveResult> =
    onUiPromise {
      val path =
        it.save(imageType, folder, filename, transparent, includeImage, includeText, cropToImageSize)
      SketchCanvasSaveResult(path != null, path)
    }

  override fun transferToBase64(
    imageType: String,
    transparent: Boolean,
    includeImage: Boolean,
    includeText: Boolean,
    cropToImageSize: Boolean
  ): Promise<String> =
    onUiPromise {
      it.encodeBase64(imageType, transparent, includeImage, includeText, cropToImageSize)
    }

  override fun transferToArrayBuffer(
    imageType: String,
    transparent: Boolean,
    includeImage: Boolean,
    includeText: Boolean,
    cropToImageSize: Boolean
  ): Promise<ArrayBuffer> =
    onUiPromise {
      ArrayBuffer.copy(
        it.encodeBytes(imageType, transparent, includeImage, includeText, cropToImageSize)
      )
    }

  private fun SketchCanvasText.toCanvasTextInput() =
    CanvasTextInput(
      text = text,
      font = font,
      fontSize = fontSize,
      fontColor = fontColor?.toLong()?.toInt(),
      overlay = overlay,
      anchorX = anchor?.x,
      anchorY = anchor?.y,
      positionX = position.x,
      positionY = position.y,
      coordinate = coordinate,
      alignment = alignment,
      lineHeightMultiple = lineHeightMultiple
    )

  private class CanvasNotReadyError : Error(NOT_READY) {
    override fun toString() = NOT_READY

    override fun printStackTrace(s: PrintWriter) = s.print(NOT_READY)
  }

  private companion object {
    const val TAG = "RNTSketchCanvas"
    const val NOT_READY = "Canvas is not ready"
  }
}
