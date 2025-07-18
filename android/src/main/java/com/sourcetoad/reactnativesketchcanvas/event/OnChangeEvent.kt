package com.sourcetoad.reactnativesketchcanvas.event

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableMap
import com.facebook.react.uimanager.events.Event

class OnChangeEvent(
        surfaceId: Int,
        viewId: Int,
        private val eventType: String,
        private val success: Boolean,
        private val path: String,
        private val pathsUpdate: Int
) : Event<OnChangeEvent>(surfaceId, viewId) {
  override fun getEventName(): String {
    return EVENT_NAME
  }

  override fun getEventData(): WritableMap {
    val eventData = Arguments.createMap()

    if (eventType == "pathsUpdate") {
      eventData.putString("eventType", eventType)
      eventData.putInt("pathsUpdate", pathsUpdate)
    } else {
      eventData.putString("eventType", eventType)
      eventData.putBoolean("success", success)
      eventData.putString("path", path)
    }
    return eventData
  }

  companion object {
    const val EVENT_NAME = "onChange"
  }
}
