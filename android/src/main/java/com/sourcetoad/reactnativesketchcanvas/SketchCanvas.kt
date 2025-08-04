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
import java.util.concurrent.Executors
import kotlin.math.sqrt

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
    private val mPathIds = HashSet<Int>() // O(1) lookup for duplicate detection optimization
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

    companion object {
        private const val MAX_BITMAP_WIDTH = 4096
        private const val MAX_BITMAP_HEIGHT = 4096
        private const val MAX_BITMAP_MEMORY_BYTES = 64 * 1024 * 1024 // 64MB
        private val imageLoadExecutor = Executors.newSingleThreadExecutor()
    }

    fun getParentViewId(): Int {
        val parentView = parent as View
        return parentView.id
    }

    private fun calculateInSampleSize(options: BitmapFactory.Options, reqWidth: Int, reqHeight: Int): Int {
        val height = options.outHeight
        val width = options.outWidth
        
        if (height <= reqHeight && width <= reqWidth) {
            return 1
        }
        
        // More efficient calculation - use the larger scale factor to ensure we stay within bounds
        val heightRatio = height / reqHeight
        val widthRatio = width / reqWidth
        val ratio = maxOf(heightRatio, widthRatio)
        
        // Find the largest power of 2 that is <= ratio
        var inSampleSize = 1
        while (inSampleSize < ratio) {
            inSampleSize *= 2
        }
        
        return inSampleSize
    }

    private fun isValidBitmapSize(width: Int, height: Int): Boolean {
        if (width <= 0 || height <= 0) return false
        if (width > MAX_BITMAP_WIDTH || height > MAX_BITMAP_HEIGHT) return false
        
        val memoryBytes = width.toLong() * height.toLong() * 4 // ARGB_8888 = 4 bytes per pixel
        return memoryBytes <= MAX_BITMAP_MEMORY_BYTES
    }

    private fun getValidatedDimensions(width: Int, height: Int): Pair<Int, Int> {
        if (isValidBitmapSize(width, height)) {
            return Pair(width, height)
        }

        val aspectRatio = width.toFloat() / height.toFloat()
        var validWidth = width
        var validHeight = height

        if (width > MAX_BITMAP_WIDTH) {
            validWidth = MAX_BITMAP_WIDTH
            validHeight = (MAX_BITMAP_WIDTH / aspectRatio).toInt()
        }

        if (validHeight > MAX_BITMAP_HEIGHT) {
            validHeight = MAX_BITMAP_HEIGHT
            validWidth = (MAX_BITMAP_HEIGHT * aspectRatio).toInt()
        }

        val memoryBytes = validWidth.toLong() * validHeight.toLong() * 4
        if (memoryBytes > MAX_BITMAP_MEMORY_BYTES) {
            val maxPixels = MAX_BITMAP_MEMORY_BYTES / 4
            val scaleFactor = kotlin.math.sqrt(maxPixels.toDouble() / (width * height))
            validWidth = (width * scaleFactor).toInt()
            validHeight = (height * scaleFactor).toInt()
        }

        return Pair(validWidth, validHeight)
    }

    private fun getOptimalBitmapConfig(hasAlpha: Boolean): Bitmap.Config {
        // Use RGB_565 (2 bytes per pixel) when transparency not needed for better performance
        return if (hasAlpha) Bitmap.Config.ARGB_8888 else Bitmap.Config.RGB_565
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
        if (filename == null) return false
        
        // Start async loading immediately and return true to indicate loading started
        imageLoadExecutor.execute {
            loadImageAsync(filename, directory, mode)
        }
        return true
    }
    
    private fun loadImageAsync(filename: String, directory: String?, mode: String?) {
        try {
            val res = mContext.resources.getIdentifier(
                if (filename.lastIndexOf('.') == -1) filename
                else filename.substring(0, filename.lastIndexOf('.')),
                "drawable",
                mContext.packageName
            )
            
            var bitmap: Bitmap? = null
            val startTime = System.currentTimeMillis()
            
            if (res == 0) {
                // Loading from file
                bitmap = loadBitmapFromFile(filename, directory)
            } else {
                // Loading from resources
                bitmap = loadBitmapFromResource(res)
            }
            
            // Handle EXIF rotation if loading from file
            if (bitmap != null && res == 0) {
                bitmap = applyExifRotation(bitmap, filename, directory)
            }
            
            val loadTime = System.currentTimeMillis() - startTime
            Log.d("SketchCanvas", "Image loading completed in ${loadTime}ms")
            
            // Update UI on main thread
            if (bitmap != null) {
                post {
                    mBackgroundImage = bitmap
                    mOriginalHeight = bitmap.height
                    mOriginalWidth = bitmap.width
                    mContentMode = mode
                    invalidateCanvas(true)
                }
            }
        } catch (e: Exception) {
            Log.e("SketchCanvas", "Failed to load image: ${e.message}")
        }
    }
    
    private fun loadBitmapFromFile(filename: String, directory: String?): Bitmap? {
        val originalFilepath = getOriginalFilepath(filename)
        val file = File(originalFilepath, directory ?: "")
        
        // First pass: get dimensions without loading full bitmap
        val bounds = BitmapFactory.Options()
        bounds.inJustDecodeBounds = true
        BitmapFactory.decodeFile(file.toString(), bounds)
        
        if (bounds.outWidth <= 0 || bounds.outHeight <= 0) {
            return null
        }
        
        // Calculate appropriate sample size
        val sampleSize = calculateInSampleSize(bounds, MAX_BITMAP_WIDTH, MAX_BITMAP_HEIGHT)
        
        // Determine if image has alpha channel
        val hasAlpha = bounds.outMimeType?.let { 
            it.equals("image/png", ignoreCase = true) || 
            it.equals("image/gif", ignoreCase = true) 
        } ?: false
        
        // Second pass: load the downsampled bitmap with optimal config
        val options = BitmapFactory.Options()
        options.inSampleSize = sampleSize
        options.inPreferredConfig = getOptimalBitmapConfig(hasAlpha)
        options.inTempStorage = ByteArray(16 * 1024) // 16KB temp storage for better performance
        
        val bitmap = BitmapFactory.decodeFile(file.toString(), options)
        
        if (bitmap != null) {
            Log.d("SketchCanvas", "Loaded file bitmap: original=${bounds.outWidth}x${bounds.outHeight}, " +
                "downsampled=${bitmap.width}x${bitmap.height}, sampleSize=$sampleSize, " +
                "config=${bitmap.config}, memory=${bitmap.byteCount / 1024}KB")
        }
        
        return bitmap
    }
    
    private fun loadBitmapFromResource(resId: Int): Bitmap? {
        // First pass: get dimensions
        val bounds = BitmapFactory.Options()
        bounds.inJustDecodeBounds = true
        BitmapFactory.decodeResource(mContext.resources, resId, bounds)
        
        if (bounds.outWidth <= 0 || bounds.outHeight <= 0) {
            return null
        }
        
        val sampleSize = calculateInSampleSize(bounds, MAX_BITMAP_WIDTH, MAX_BITMAP_HEIGHT)
        
        // Resources are typically PNG with alpha
        val options = BitmapFactory.Options()
        options.inSampleSize = sampleSize
        options.inPreferredConfig = getOptimalBitmapConfig(true)
        options.inTempStorage = ByteArray(16 * 1024)
        
        val bitmap = BitmapFactory.decodeResource(mContext.resources, resId, options)
        
        if (bitmap != null) {
            Log.d("SketchCanvas", "Loaded resource bitmap: original=${bounds.outWidth}x${bounds.outHeight}, " +
                "downsampled=${bitmap.width}x${bitmap.height}, sampleSize=$sampleSize, " +
                "config=${bitmap.config}, memory=${bitmap.byteCount / 1024}KB")
        }
        
        return bitmap
    }
    
    private fun applyExifRotation(bitmap: Bitmap, filename: String, directory: String?): Bitmap {
        return try {
            val originalFilepath = getOriginalFilepath(filename)
            val file = File(originalFilepath, directory ?: "")
            val exif = ExifInterface(file.absolutePath)
            val orientation = exif.getAttributeInt(ExifInterface.TAG_ORIENTATION, 1)
            
            when (orientation) {
                ExifInterface.ORIENTATION_ROTATE_90,
                ExifInterface.ORIENTATION_ROTATE_180,
                ExifInterface.ORIENTATION_ROTATE_270 -> {
                    val matrix = Matrix()
                    val degrees = when (orientation) {
                        ExifInterface.ORIENTATION_ROTATE_90 -> 90f
                        ExifInterface.ORIENTATION_ROTATE_180 -> 180f
                        ExifInterface.ORIENTATION_ROTATE_270 -> 270f
                        else -> 0f
                    }
                    matrix.postRotate(degrees)
                    
                    val rotatedBitmap = Bitmap.createBitmap(bitmap, 0, 0, bitmap.width, bitmap.height, matrix, true)
                    if (rotatedBitmap != bitmap) {
                        bitmap.recycle()
                        Log.d("SketchCanvas", "Applied EXIF rotation: ${degrees}°")
                        rotatedBitmap
                    } else {
                        bitmap
                    }
                }
                else -> bitmap
            }
        } catch (e: Exception) {
            Log.w("SketchCanvas", "Failed to apply EXIF rotation: ${e.message}")
            bitmap
        }
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
        mPathIds.clear()
        mCurrentPath = null
        mNeedsFullRedraw = true
        invalidateCanvas(true)
    }

    fun newPath(id: Int, strokeColor: Int, strokeWidth: Float) {
        mCurrentPath = SketchData(id, strokeColor, strokeWidth)
        mPaths.add(mCurrentPath!!)
        mPathIds.add(id)
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
        if (!mPathIds.contains(id)) {
            val newPath = SketchData(id, strokeColor, strokeWidth, points)
            mPaths.add(newPath)
            mPathIds.add(id)
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
        if (pathsArray == null) {
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
                    // Performance optimization: O(1) duplicate detection instead of O(n) linear search
                    if (!mPathIds.contains(sketchData.id)) {
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

        // Add all valid paths to the collection and update HashSet
        mPaths.addAll(pathsToAdd)
        for (path in pathsToAdd) {
            mPathIds.add(path.id)
        }

        // Performance optimization: Batch canvas operations instead of individual draws
        // Single invalidation with mNeedsFullRedraw flag reduces GPU operations
        if (pathsToAdd.isNotEmpty()) {
            mNeedsFullRedraw = true
            invalidateCanvas(true)
        }

        // Dispatch onInitialPathsLoaded event with the count of successfully loaded paths
        val surfaceId = UIManagerHelper.getSurfaceId(mContext)
        val parentViewId = getParentViewId()
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
            mPathIds.remove(id)
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
            // Validate and adjust dimensions to prevent oversized bitmaps
            val (validWidth, validHeight) = getValidatedDimensions(width, height)
            
            if (validWidth != width || validHeight != height) {
                Log.w("SketchCanvas", "Canvas size adjusted from ${width}x${height} to ${validWidth}x${validHeight} " +
                    "to prevent memory issues")
            }
            
            try {
                mDrawingBitmap = Bitmap.createBitmap(validWidth, validHeight, Bitmap.Config.ARGB_8888)
                mDrawingCanvas = Canvas(mDrawingBitmap!!)
                mTranslucentDrawingBitmap = Bitmap.createBitmap(validWidth, validHeight, Bitmap.Config.ARGB_8888)
                mTranslucentDrawingCanvas = Canvas(mTranslucentDrawingBitmap!!)
            } catch (e: OutOfMemoryError) {
                Log.e("SketchCanvas", "Failed to create drawing bitmaps: ${e.message}")
                // Try with smaller dimensions as fallback
                val fallbackWidth = validWidth / 2
                val fallbackHeight = validHeight / 2
                try {
                    mDrawingBitmap = Bitmap.createBitmap(fallbackWidth, fallbackHeight, Bitmap.Config.ARGB_8888)
                    mDrawingCanvas = Canvas(mDrawingBitmap!!)
                    mTranslucentDrawingBitmap = Bitmap.createBitmap(fallbackWidth, fallbackHeight, Bitmap.Config.ARGB_8888)
                    mTranslucentDrawingCanvas = Canvas(mTranslucentDrawingBitmap!!)
                    Log.i("SketchCanvas", "Using fallback size: ${fallbackWidth}x${fallbackHeight}")
                } catch (e2: OutOfMemoryError) {
                    Log.e("SketchCanvas", "Failed to create fallback bitmaps, canvas will not work properly")
                    return
                }
            }
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
        // Determine target dimensions
        val targetWidth = if (mBackgroundImage != null && cropToImageSize) mOriginalWidth else width
        val targetHeight = if (mBackgroundImage != null && cropToImageSize) mOriginalHeight else height
        
        // Validate and adjust dimensions to prevent oversized bitmaps
        val (validWidth, validHeight) = getValidatedDimensions(targetWidth, targetHeight)
        
        if (validWidth != targetWidth || validHeight != targetHeight) {
            Log.w("SketchCanvas", "Output image size adjusted from ${targetWidth}x${targetHeight} to ${validWidth}x${validHeight} " +
                "to prevent memory issues")
        }
        
        val bitmap = try {
            Bitmap.createBitmap(validWidth, validHeight, Bitmap.Config.ARGB_8888)
        } catch (e: OutOfMemoryError) {
            Log.e("SketchCanvas", "Failed to create output bitmap: ${e.message}")
            // Try with smaller fallback dimensions
            val fallbackWidth = validWidth / 2
            val fallbackHeight = validHeight / 2
            try {
                Log.i("SketchCanvas", "Using fallback output size: ${fallbackWidth}x${fallbackHeight}")
                Bitmap.createBitmap(fallbackWidth, fallbackHeight, Bitmap.Config.ARGB_8888)
            } catch (e2: OutOfMemoryError) {
                Log.e("SketchCanvas", "Failed to create fallback bitmap, using minimal size")
                Bitmap.createBitmap(100, 100, Bitmap.Config.ARGB_8888)
            }
        }
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
