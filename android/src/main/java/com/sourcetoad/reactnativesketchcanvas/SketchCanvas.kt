package com.sourcetoad.reactnativesketchcanvas

import android.database.Cursor
import android.graphics.*
import android.net.Uri
import android.os.Environment
import android.provider.MediaStore
import android.util.Base64
import android.util.Log
import android.view.View
import androidx.exifinterface.media.ExifInterface
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.UIManagerHelper
import com.sourcetoad.reactnativesketchcanvas.event.OnCanvasReadyEvent
import com.sourcetoad.reactnativesketchcanvas.event.OnChangeEvent
import com.sourcetoad.reactnativesketchcanvas.event.OnGenerateBase64Event
import com.sourcetoad.reactnativesketchcanvas.event.OnInitialPathsLoadedEvent
import java.io.ByteArrayOutputStream
import java.io.File
import java.io.FileOutputStream
import java.util.*

class CanvasText {
    var text: String? = null
    var paint: Paint? = null
    var anchor: PointF? = null
    var position: PointF? = null
    var drawPosition: PointF? = null
    var lineOffset: PointF? = null
    var isAbsoluteCoordinate = false
    var textBounds: Rect? = null
    var height = 0f
}

class SketchCanvas(context: ThemedReactContext) : View(context) {
    private val mPaths = ArrayList<SketchData>()
    private var mCurrentPath: SketchData? = null
    private val mContext: ThemedReactContext = context
    private var mDisableHardwareAccelerated = false
    private val mPaint = Paint()
    private var mDrawingBitmap: Bitmap? = null
    private var mTranslucentDrawingBitmap: Bitmap? = null
    private var mDrawingCanvas: Canvas? = null
    private var mTranslucentDrawingCanvas: Canvas? = null
    private var mNeedsFullRedraw = true
    private var mOriginalWidth = 0
    private var mOriginalHeight = 0
    private var mBackgroundImage: Bitmap? = null
    private var mContentMode: String? = null
    private val mArrCanvasText = ArrayList<CanvasText>()
    private val mArrTextOnSketch = ArrayList<CanvasText>()
    private val mArrSketchOnText = ArrayList<CanvasText>()
    private var mIsCanvasInitialized = false

    fun getParentViewId(): Int {
        val parentView = parent as View
        return parentView.id
    }

    fun isCanvasReady(): Boolean {
        return mIsCanvasInitialized && mDrawingCanvas != null
    }

    private fun getFileUri(filepath: String): Uri {
        var uri = Uri.parse(filepath)
        if (uri.scheme == null) {
            uri = Uri.parse("file://$filepath")
        }
        return uri
    }

    private fun getOriginalFilepath(filepath: String): String {
        val uri = getFileUri(filepath)
        var originalFilepath = filepath
        if (uri.scheme == "content") {
            try {
                val cursor: Cursor? = mContext.contentResolver.query(uri, null, null, null, null)
                if (cursor != null && cursor.moveToFirst()) {
                    originalFilepath =
                        cursor.getString(cursor.getColumnIndexOrThrow(MediaStore.Images.Media.DATA))
                    cursor.close()
                }
            } catch (ignored: IllegalArgumentException) {
            }
        }
        return originalFilepath
    }

    fun openImageFile(filename: String?, directory: String?, mode: String?): Boolean {
        if (filename != null) {
            val res =
                mContext.resources.getIdentifier(
                    if (filename.lastIndexOf('.') == -1) filename
                    else filename.substring(0, filename.lastIndexOf('.')),
                    "drawable",
                    mContext.packageName
                )
            val bitmapOptions = BitmapFactory.Options()
            val originalFilepath = getOriginalFilepath(filename)
            val file = File(originalFilepath, directory ?: "")
            var bitmap =
                if (res == 0) {
                    BitmapFactory.decodeFile(file.toString(), bitmapOptions)
                } else {
                    BitmapFactory.decodeResource(mContext.resources, res)
                }
            try {
                val exif = ExifInterface(file.absolutePath)
                val matrix = Matrix()
                val orientation = exif.getAttributeInt(ExifInterface.TAG_ORIENTATION, 1)
                when (orientation) {
                    ExifInterface.ORIENTATION_ROTATE_90 -> matrix.postRotate(90f)
                    ExifInterface.ORIENTATION_ROTATE_180 -> matrix.postRotate(180f)
                    ExifInterface.ORIENTATION_ROTATE_270 -> matrix.postRotate(270f)
                }
                bitmap =
                    Bitmap.createBitmap(bitmap, 0, 0, bitmap.width, bitmap.height, matrix, true)
            } catch (e: Exception) {
            }
            if (bitmap != null) {
                mBackgroundImage = bitmap
                mOriginalHeight = bitmap.height
                mOriginalWidth = bitmap.width
                mContentMode = mode
                invalidateCanvas(true)
                return true
            }
        }
        return false
    }

    fun setCanvasText(aText: ReadableArray?) {
        mArrCanvasText.clear()
        mArrSketchOnText.clear()
        mArrTextOnSketch.clear()
        if (aText != null) {
            for (i in 0 until aText.size()) {
                val property = aText.getMap(i)
                if (property?.hasKey("text") == true) {
                    val alignment = property.getString("alignment") ?: "Left"
                    var lineOffset = 0
                    var maxTextWidth = 0
                    val lines = property.getString("text")!!.split("\n").toTypedArray()
                    val textSet = ArrayList<CanvasText>(lines.size)
                    for (line in lines) {
                        val arr =
                            if (property.hasKey("overlay") &&
                                "TextOnSketch" == property.getString("overlay")
                            )
                                mArrTextOnSketch
                            else mArrSketchOnText
                        val text = CanvasText()
                        val p = Paint(Paint.ANTI_ALIAS_FLAG)
                        p.textAlign = Paint.Align.LEFT
                        text.text = line
                        if (property.hasKey("font")) {
                            val font: Typeface =
                                try {
                                    Typeface.createFromAsset(
                                        mContext.assets,
                                        property.getString("font")
                                    )
                                } catch (ex: Exception) {
                                    Typeface.create(property.getString("font"), Typeface.NORMAL)
                                }
                            p.typeface = font
                        }

                        p.textSize = property.getDouble("fontSize").toFloat()
                        p.color =
                            if (property.hasKey("fontColor")) property.getInt("fontColor") else Color.BLACK
                        text.anchor =
                            PointF(
                                property.getMap("anchor")?.getDouble("x")?.toFloat() ?: 0f,
                                property.getMap("anchor")?.getDouble("y")?.toFloat() ?: 0f
                            )
                        text.position =
                            PointF(
                                property.getMap("position")?.getDouble("x")?.toFloat() ?: 0f,
                                property.getMap("position")?.getDouble("y")?.toFloat() ?: 0f
                            )
                        text.paint = p
                        text.isAbsoluteCoordinate =
                            !(property.hasKey("coordinate") && "Ratio" == property.getString("coordinate"))
                        text.textBounds = Rect()
                        p.getTextBounds(text.text, 0, text.text!!.length, text.textBounds)
                        text.lineOffset = PointF(0f, lineOffset.toFloat())

                        if (property.hasKey("lineHeightMultiple")) {
                            lineOffset +=
                                (text.textBounds!!.height() *
                                        1.5 *
                                        (property.getDouble("lineHeightMultiple")))
                                    .toInt()
                        }

                        maxTextWidth = maxTextWidth.coerceAtLeast(text.textBounds!!.width())
                        arr.add(text)
                        mArrCanvasText.add(text)
                        textSet.add(text)
                    }
                    for (text in textSet) {
                        text.height = lineOffset.toFloat()
                        if (text.textBounds!!.width() < maxTextWidth) {
                            val diff = maxTextWidth - text.textBounds!!.width()
                            text.textBounds!!.left += (diff * text.anchor!!.x).toInt()
                            text.textBounds!!.right += (diff * text.anchor!!.x).toInt()
                        }
                    }
                    if (width > 0 && height > 0) {
                        for (text in textSet) {
                            text.height = lineOffset.toFloat()
                            val position = PointF(text.position!!.x, text.position!!.y)
                            if (!text.isAbsoluteCoordinate) {
                                position.x *= width
                                position.y *= height
                            }
                            position.x -= text.textBounds!!.left.toFloat()
                            position.y -= text.textBounds!!.top.toFloat()
                            position.x -= (text.textBounds!!.width() * text.anchor!!.x)
                            position.y -= (text.height * text.anchor!!.y)
                            text.drawPosition = position
                        }
                    }
                    if (lines.size > 1) {
                        for (text in textSet) {
                            when (alignment) {
                                "Left" -> {}
                                "Right" ->
                                    text.lineOffset!!.x =
                                        (maxTextWidth - text.textBounds!!.width()).toFloat()

                                "Center" ->
                                    text.lineOffset!!.x =
                                        ((maxTextWidth - text.textBounds!!.width()) / 2).toFloat()
                            }
                        }
                    }
                }
            }
        }
        invalidateCanvas(false)
    }

    fun clear() {
        mPaths.clear()
        mCurrentPath = null
        mNeedsFullRedraw = true
        invalidateCanvas(true)
    }

    fun newPath(id: Int, strokeColor: Int, strokeWidth: Float) {
        mCurrentPath = SketchData(id, strokeColor, strokeWidth)
        mPaths.add(mCurrentPath!!)
        val isErase = strokeColor == Color.TRANSPARENT
        if (isErase && !mDisableHardwareAccelerated) {
            mDisableHardwareAccelerated = true
            setLayerType(LAYER_TYPE_SOFTWARE, null)
        }
        invalidateCanvas(true)
    }

    fun addPoint(x: Float, y: Float) {
        val updateRect = mCurrentPath!!.addPoint(PointF(x, y))
        if (mCurrentPath!!.isTranslucent) {
            mTranslucentDrawingCanvas!!.drawColor(Color.TRANSPARENT, PorterDuff.Mode.MULTIPLY)
            mCurrentPath!!.draw(mTranslucentDrawingCanvas!!)
        } else {
            mCurrentPath!!.drawLastPoint(mDrawingCanvas!!)
        }
        invalidate(updateRect)
    }

    fun addPath(id: Int, strokeColor: Int, strokeWidth: Float, points: ArrayList<PointF>) {
        var exist = false
        for (data in mPaths) {
            if (data.id == id) {
                exist = true
                break
            }
        }
        if (!exist) {
            val newPath = SketchData(id, strokeColor, strokeWidth, points)
            mPaths.add(newPath)
            val isErase = strokeColor == Color.TRANSPARENT
            if (isErase && !mDisableHardwareAccelerated) {
                mDisableHardwareAccelerated = true
                setLayerType(LAYER_TYPE_SOFTWARE, null)
            }
            newPath.draw(mDrawingCanvas!!)
            invalidateCanvas(true)
        }
    }

    fun addInitialPaths(pathsArray: ReadableArray?) {
        Log.d("SketchCanvas", "addInitialPaths called with pathsArray: ${pathsArray?.size()} paths")
        if (pathsArray == null) {
            Log.d("SketchCanvas", "pathsArray is null, returning early")
            return
        }

        var hasErasePaths = false
        val pathsToAdd = ArrayList<SketchData>()

        // Process all paths first, validating and converting data
        for (i in 0 until pathsArray.size()) {
            val pathData = pathsArray.getMap(i)
            if (pathData != null) {
                val sketchData = convertReadableMapToSketchData(pathData)
                if (sketchData != null) {
                    // Check if this path already exists
                    var exist = false
                    for (data in mPaths) {
                        if (data.id == sketchData.id) {
                            exist = true
                            break
                        }
                    }
                    if (!exist) {
                        pathsToAdd.add(sketchData)
                        if (sketchData.strokeColor == Color.TRANSPARENT) {
                            hasErasePaths = true
                        }
                    }
                }
            }
        }

        // Configure hardware acceleration if needed for erase paths
        if (hasErasePaths && !mDisableHardwareAccelerated) {
            mDisableHardwareAccelerated = true
            setLayerType(LAYER_TYPE_SOFTWARE, null)
        }

        // Add all valid paths to the collection
        mPaths.addAll(pathsToAdd)

        // Draw all new paths to the canvas
        for (path in pathsToAdd) {
            path.draw(mDrawingCanvas!!)
        }

        // Single canvas invalidation after all paths are processed
        if (pathsToAdd.isNotEmpty()) {
            invalidateCanvas(true)
        }

        // Dispatch onInitialPathsLoaded event with the count of successfully loaded paths
        val surfaceId = UIManagerHelper.getSurfaceId(mContext)
        val parentViewId = getParentViewId()
        Log.d(
            "SketchCanvas",
            "Dispatching onInitialPathsLoaded event: surfaceId=$surfaceId, viewId=$parentViewId, loadedCount=${pathsToAdd.size}"
        )
        UIManagerHelper.getEventDispatcherForReactTag(mContext, parentViewId)
            ?.dispatchEvent(
                OnInitialPathsLoadedEvent(surfaceId, parentViewId, pathsToAdd.size)
            )
    }

    private fun convertReadableMapToSketchData(pathData: ReadableMap): SketchData? {
        try {
            // Extract and validate required fields
            if (!pathData.hasKey("pathId") ||
                !pathData.hasKey("color") ||
                !pathData.hasKey("width") ||
                !pathData.hasKey("points")
            ) {
                return null
            }

            val pathId = pathData.getInt("pathId")
            val color = pathData.getInt("color")
            val width = pathData.getDouble("width").toFloat()
            val pointsArray = pathData.getArray("points")

            if (pointsArray == null) {
                return null
            }

            // Convert points array to ArrayList<PointF>
            val points = ArrayList<PointF>(pointsArray.size())
            for (i in 0 until pointsArray.size()) {
                val pointString = pointsArray.getString(i)
                if (pointString != null) {
                    val coordinates = pointString.split(",")
                    if (coordinates.size >= 2) {
                        try {
                            val x = coordinates[0].toFloat()
                            val y = coordinates[1].toFloat()
                            points.add(PointF(x, y))
                        } catch (e: NumberFormatException) {
                            // Skip invalid coordinate, continue processing other points
                            continue
                        }
                    }
                }
            }

            // Only create SketchData if we have valid points
            return if (points.isNotEmpty()) {
                SketchData(pathId, color, width, points)
            } else {
                null
            }
        } catch (e: Exception) {
            // Return null for any malformed path data
            return null
        }
    }

    fun deletePath(id: Int) {
        var index = -1
        for (i in mPaths.indices) {
            if (mPaths[i].id == id) {
                index = i
                break
            }
        }
        if (index > -1) {
            mPaths.removeAt(index)
            mNeedsFullRedraw = true
            invalidateCanvas(true)
        }
    }

    fun end() {
        if (mCurrentPath != null) {
            if (mCurrentPath!!.isTranslucent) {
                mCurrentPath!!.draw(mDrawingCanvas!!)
                mTranslucentDrawingCanvas!!.drawColor(Color.TRANSPARENT, PorterDuff.Mode.MULTIPLY)
            }
            mCurrentPath = null
        }
    }

    fun onSaved(success: Boolean, path: String?) {
        val surfaceId = UIManagerHelper.getSurfaceId(mContext)
        UIManagerHelper.getEventDispatcherForReactTag(mContext, getParentViewId())
            ?.dispatchEvent(
                OnChangeEvent(surfaceId, getParentViewId(), "save", success, path ?: "", 0)
            )
    }

    fun save(
        format: String,
        folder: String,
        filename: String,
        transparent: Boolean,
        includeImage: Boolean,
        includeText: Boolean,
        cropToImageSize: Boolean
    ) {
        val f =
            File(
                Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_PICTURES)
                    .toString() + File.separator + folder
            )
        val success = if (f.exists()) true else f.mkdirs()
        if (success) {
            val bitmap =
                createImage(
                    format == "png" && transparent,
                    includeImage,
                    includeText,
                    cropToImageSize
                )
            val file =
                File(
                    Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_PICTURES)
                        .toString() +
                            File.separator +
                            folder +
                            File.separator +
                            filename +
                            if (format == "png") ".png" else ".jpg"
                )
            try {
                FileOutputStream(file).use { fos ->
                    bitmap.compress(
                        if (format == "png") Bitmap.CompressFormat.PNG else Bitmap.CompressFormat.JPEG,
                        if (format == "png") 100 else 90,
                        fos
                    )
                }
                onSaved(true, file.path)
            } catch (e: Exception) {
                e.printStackTrace()
                onSaved(false, null)
            }
        } else {
            Log.e("SketchCanvas", "Failed to create folder!")
            onSaved(false, null)
        }
    }

    fun getBase64(
        format: String,
        transparent: Boolean,
        includeImage: Boolean,
        includeText: Boolean,
        cropToImageSize: Boolean
    ) {
        val bitmap =
            createImage(format == "png" && transparent, includeImage, includeText, cropToImageSize)
        val byteArrayOS = ByteArrayOutputStream()
        bitmap.compress(
            if (format == "png") Bitmap.CompressFormat.PNG else Bitmap.CompressFormat.JPEG,
            if (format == "png") 100 else 90,
            byteArrayOS
        )

        UIManagerHelper.getEventDispatcherForReactTag(mContext, getParentViewId())
            ?.dispatchEvent(
                OnGenerateBase64Event(
                    UIManagerHelper.getSurfaceId(mContext),
                    getParentViewId(),
                    Base64.encodeToString(byteArrayOS.toByteArray(), Base64.DEFAULT)
                )
            )
    }

    override fun onSizeChanged(w: Int, h: Int, oldw: Int, oldh: Int) {
        super.onSizeChanged(w, h, oldw, oldh)
        if (width > 0 && height > 0) {
            mDrawingBitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
            mDrawingCanvas = Canvas(mDrawingBitmap!!)
            mTranslucentDrawingBitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
            mTranslucentDrawingCanvas = Canvas(mTranslucentDrawingBitmap!!)
            for (text in mArrCanvasText) {
                val position = PointF(text.position!!.x, text.position!!.y)
                if (!text.isAbsoluteCoordinate) {
                    position.x *= width
                    position.y *= height
                }
                position.x -= text.textBounds!!.left.toFloat()
                position.y -= text.textBounds!!.top.toFloat()
                position.x -= (text.textBounds!!.width() * text.anchor!!.x)
                position.y -= (text.height * text.anchor!!.y)
                text.drawPosition = position
            }
            mNeedsFullRedraw = true
            invalidate()

            if (!mIsCanvasInitialized) {
                UIManagerHelper.getEventDispatcherForReactTag(mContext, getParentViewId())
                    ?.dispatchEvent(
                        OnCanvasReadyEvent(
                            UIManagerHelper.getSurfaceId(mContext),
                            getParentViewId()
                        )
                    )
                mIsCanvasInitialized = true
            }
        }
    }

    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)
        if (mNeedsFullRedraw && mDrawingCanvas != null) {
            mDrawingCanvas!!.drawColor(Color.TRANSPARENT, PorterDuff.Mode.MULTIPLY)
            for (path in mPaths) {
                path.draw(mDrawingCanvas!!)
            }
            mNeedsFullRedraw = false
        }
        if (mBackgroundImage != null) {
            val dstRect = Rect()
            canvas.getClipBounds(dstRect)
            canvas.drawBitmap(
                mBackgroundImage!!,
                null,
                Utility.fillImage(
                    mBackgroundImage!!.width.toFloat(),
                    mBackgroundImage!!.height.toFloat(),
                    dstRect.width().toFloat(),
                    dstRect.height().toFloat(),
                    mContentMode!!
                ),
                null
            )
        }
        for (text in mArrSketchOnText) {
            canvas.drawText(
                text.text!!,
                text.drawPosition!!.x + text.lineOffset!!.x,
                text.drawPosition!!.y + text.lineOffset!!.y,
                text.paint!!
            )
        }
        if (mDrawingBitmap != null) {
            canvas.drawBitmap(mDrawingBitmap!!, 0f, 0f, mPaint)
        }
        if (mTranslucentDrawingBitmap != null && mCurrentPath != null && mCurrentPath!!.isTranslucent) {
            canvas.drawBitmap(mTranslucentDrawingBitmap!!, 0f, 0f, mPaint)
        }
        for (text in mArrTextOnSketch) {
            canvas.drawText(
                text.text!!,
                text.drawPosition!!.x + text.lineOffset!!.x,
                text.drawPosition!!.y + text.lineOffset!!.y,
                text.paint!!
            )
        }
    }

    private fun invalidateCanvas(shouldDispatchEvent: Boolean) {
        if (shouldDispatchEvent) {
            val surfaceId = UIManagerHelper.getSurfaceId(mContext)

            UIManagerHelper.getEventDispatcherForReactTag(mContext, getParentViewId())
                ?.dispatchEvent(
                    OnChangeEvent(
                        surfaceId,
                        getParentViewId(),
                        "pathsUpdate",
                        false,
                        "",
                        mPaths.size
                    )
                )
        }
        invalidate()
    }

    private fun createImage(
        transparent: Boolean,
        includeImage: Boolean,
        includeText: Boolean,
        cropToImageSize: Boolean
    ): Bitmap {
        val bitmap =
            Bitmap.createBitmap(
                if (mBackgroundImage != null && cropToImageSize) mOriginalWidth else width,
                if (mBackgroundImage != null && cropToImageSize) mOriginalHeight else height,
                Bitmap.Config.ARGB_8888
            )
        val canvas = Canvas(bitmap)
        canvas.drawARGB(if (transparent) 0 else 255, 255, 255, 255)
        if (mBackgroundImage != null && includeImage) {
            val targetRect = Rect()
            Utility.fillImage(
                mBackgroundImage!!.width.toFloat(),
                mBackgroundImage!!.height.toFloat(),
                bitmap.width.toFloat(),
                bitmap.height.toFloat(),
                "AspectFit"
            )
                .roundOut(targetRect)
            canvas.drawBitmap(mBackgroundImage!!, null, targetRect, null)
        }
        if (includeText) {
            for (text in mArrSketchOnText) {
                canvas.drawText(
                    text.text!!,
                    text.drawPosition!!.x + text.lineOffset!!.x,
                    text.drawPosition!!.y + text.lineOffset!!.y,
                    text.paint!!
                )
            }
        }
        if (mBackgroundImage != null && cropToImageSize) {
            val targetRect = Rect()
            Utility.fillImage(
                mDrawingBitmap!!.width.toFloat(),
                mDrawingBitmap!!.height.toFloat(),
                bitmap.width.toFloat(),
                bitmap.height.toFloat(),
                "AspectFill"
            )
                .roundOut(targetRect)
            canvas.drawBitmap(mDrawingBitmap!!, null, targetRect, mPaint)
        } else {
            canvas.drawBitmap(mDrawingBitmap!!, 0f, 0f, mPaint)
        }
        if (includeText) {
            for (text in mArrTextOnSketch) {
                canvas.drawText(
                    text.text!!,
                    text.drawPosition!!.x + text.lineOffset!!.x,
                    text.drawPosition!!.y + text.lineOffset!!.y,
                    text.paint!!
                )
            }
        }
        return bitmap
    }
}
