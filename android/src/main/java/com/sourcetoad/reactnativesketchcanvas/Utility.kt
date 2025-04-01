package com.sourcetoad.reactnativesketchcanvas

import android.graphics.RectF

object Utility {
    @JvmStatic
    fun fillImage(imgWidth: Float, imgHeight: Float, targetWidth: Float, targetHeight: Float, mode: String): RectF {
        val imageAspectRatio = imgWidth / imgHeight
        val targetAspectRatio = targetWidth / targetHeight
        return when (mode) {
            "AspectFill" -> {
                val scaleFactor = if (targetAspectRatio < imageAspectRatio) targetHeight / imgHeight else targetWidth / imgWidth
                val w = imgWidth * scaleFactor
                val h = imgHeight * scaleFactor
                RectF((targetWidth - w) / 2, (targetHeight - h) / 2, w + (targetWidth - w) / 2, h + (targetHeight - h) / 2)
            }
            "AspectFit" -> {
                val scaleFactor = if (targetAspectRatio > imageAspectRatio) targetHeight / imgHeight else targetWidth / imgWidth
                val w = imgWidth * scaleFactor
                val h = imgHeight * scaleFactor
                RectF((targetWidth - w) / 2, (targetHeight - h) / 2, w + (targetWidth - w) / 2, h + (targetHeight - h) / 2)
            }
            "ScaleToFill" -> {
                RectF(0f, 0f, targetWidth, targetHeight)
            }
            else -> {
                RectF(0f, 0f, targetWidth, targetHeight)
            }
        }
    }
}
