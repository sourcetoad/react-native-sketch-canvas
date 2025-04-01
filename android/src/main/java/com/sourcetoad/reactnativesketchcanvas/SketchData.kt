package com.sourcetoad.reactnativesketchcanvas

import android.graphics.*
import java.util.ArrayList

class SketchData(val id: Int, val strokeColor: Int, val strokeWidth: Float, points: ArrayList<PointF> = ArrayList()) {
    val points: ArrayList<PointF> = ArrayList(points)
    val isTranslucent: Boolean = ((strokeColor shr 24) and 0xff) != 255 && strokeColor != Color.TRANSPARENT

    private var mPaint: Paint? = null
    private var mPath: Path? = if (isTranslucent) evaluatePath() else null
    private var mDirty: RectF? = null

    companion object {
        fun midPoint(p1: PointF, p2: PointF): PointF {
            return PointF((p1.x + p2.x) * 0.5f, (p1.y + p2.y) * 0.5f)
        }
    }

    constructor(id: Int, strokeColor: Int, strokeWidth: Float) : this(id, strokeColor, strokeWidth, ArrayList())

    fun addPoint(p: PointF): Rect {
        points.add(p)
        val updateRect: RectF

        val pointsCount = points.size

        if (isTranslucent) {
            if (pointsCount >= 3) {
                addPointToPath(mPath!!, points[pointsCount - 3], points[pointsCount - 2], p)
            } else if (pointsCount >= 2) {
                addPointToPath(mPath!!, points[0], points[0], p)
            } else {
                addPointToPath(mPath!!, p, p, p)
            }

            val x = p.x
            val y = p.y
            if (mDirty == null) {
                mDirty = RectF(x, y, x + 1, y + 1)
                updateRect = RectF(x - strokeWidth, y - strokeWidth, x + strokeWidth, y + strokeWidth)
            } else {
                mDirty!!.union(x, y)
                updateRect = RectF(mDirty!!.left - strokeWidth, mDirty!!.top - strokeWidth, mDirty!!.right + strokeWidth, mDirty!!.bottom + strokeWidth)
            }
        } else {
            if (pointsCount >= 3) {
                val a = points[pointsCount - 3]
                val b = points[pointsCount - 2]
                val c = p
                val prevMid = midPoint(a, b)
                val currentMid = midPoint(b, c)

                updateRect = RectF(prevMid.x, prevMid.y, prevMid.x, prevMid.y)
                updateRect.union(b.x, b.y)
                updateRect.union(currentMid.x, currentMid.y)
            } else if (pointsCount >= 2) {
                val a = points[pointsCount - 2]
                val b = p
                val mid = midPoint(a, b)

                updateRect = RectF(a.x, a.y, a.x, a.y)
                updateRect.union(mid.x, mid.y)
            } else {
                updateRect = RectF(p.x, p.y, p.x, p.y)
            }

            updateRect.inset(-strokeWidth * 2, -strokeWidth * 2)
        }
        val integralRect = Rect()
        updateRect.roundOut(integralRect)

        return integralRect
    }

    fun drawLastPoint(canvas: Canvas) {
        val pointsCount = points.size
        if (pointsCount < 1) {
            return
        }

        draw(canvas, pointsCount - 1)
    }

    fun draw(canvas: Canvas) {
        if (isTranslucent) {
            canvas.drawPath(mPath!!, getPaint())
        } else {
            val pointsCount = points.size
            for (i in 0 until pointsCount) {
                draw(canvas, i)
            }
        }
    }

    private fun getPaint(): Paint {
        if (mPaint == null) {
            val isErase = strokeColor == Color.TRANSPARENT

            mPaint = Paint()
            mPaint!!.color = strokeColor
            mPaint!!.strokeWidth = strokeWidth
            mPaint!!.style = Paint.Style.STROKE
            mPaint!!.strokeCap = Paint.Cap.ROUND
            mPaint!!.strokeJoin = Paint.Join.ROUND
            mPaint!!.isAntiAlias = true
            mPaint!!.xfermode = PorterDuffXfermode(if (isErase) PorterDuff.Mode.CLEAR else PorterDuff.Mode.SRC_OVER)
        }
        return mPaint!!
    }

    private fun draw(canvas: Canvas, pointIndex: Int) {
        val pointsCount = points.size
        if (pointIndex >= pointsCount) {
            return
        }

        if (pointsCount >= 3 && pointIndex >= 2) {
            val a = points[pointIndex - 2]
            val b = points[pointIndex - 1]
            val c = points[pointIndex]
            val prevMid = midPoint(a, b)
            val currentMid = midPoint(b, c)

            // Draw a curve
            val path = Path()
            path.moveTo(prevMid.x, prevMid.y)
            path.quadTo(b.x, b.y, currentMid.x, currentMid.y)

            canvas.drawPath(path, getPaint())
        } else if (pointsCount >= 2 && pointIndex >= 1) {
            val a = points[pointIndex - 1]
            val b = points[pointIndex]
            val mid = midPoint(a, b)

            // Draw a line to the middle of points a and b
            // This is so the next draw which uses a curve looks correct and continues from there
            canvas.drawLine(a.x, a.y, mid.x, mid.y, getPaint())
        } else if (pointsCount >= 1) {
            val a = points[pointIndex]

            // Draw a single point
            canvas.drawPoint(a.x, a.y, getPaint())
        }
    }

    private fun evaluatePath(): Path {
        val pointsCount = points.size
        val path = Path()

        for (pointIndex in 0 until pointsCount) {
            if (pointsCount >= 3 && pointIndex >= 2) {
                val a = points[pointIndex - 2]
                val b = points[pointIndex - 1]
                val c = points[pointIndex]
                val prevMid = midPoint(a, b)
                val currentMid = midPoint(b, c)

                // Draw a curve
                path.moveTo(prevMid.x, prevMid.y)
                path.quadTo(b.x, b.y, currentMid.x, currentMid.y)
            } else if (pointsCount >= 2 && pointIndex >= 1) {
                val a = points[pointIndex - 1]
                val b = points[pointIndex]
                val mid = midPoint(a, b)

                // Draw a line to the middle of points a and b
                // This is so the next draw which uses a curve looks correct and continues from there
                path.moveTo(a.x, a.y)
                path.lineTo(mid.x, mid.y)
            } else if (pointsCount >= 1) {
                val a = points[pointIndex]

                // Draw a single point
                path.moveTo(a.x, a.y)
                path.lineTo(a.x, a.y)
            }
        }
        return path
    }

    private fun addPointToPath(path: Path, tPoint: PointF, pPoint: PointF, point: PointF) {
        val mid1 = PointF((pPoint.x + tPoint.x) * 0.5f, (pPoint.y + tPoint.y) * 0.5f)
        val mid2 = PointF((point.x + pPoint.x) * 0.5f, (point.y + pPoint.y) * 0.5f)
        path.moveTo(mid1.x, mid1.y)
        path.quadTo(pPoint.x, pPoint.y, mid2.x, mid2.y)
    }
}