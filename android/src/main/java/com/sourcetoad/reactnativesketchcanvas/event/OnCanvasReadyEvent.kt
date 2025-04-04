package com.sourcetoad.reactnativesketchcanvas

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableMap
import com.facebook.react.uimanager.events.Event

class OnCanvasReadyEvent(
  surfaceId: Int,
  viewId: Int,
) : Event<OnCanvasReadyEvent>(surfaceId, viewId)  {
  override fun getEventName(): String {
    return EVENT_NAME
  }

  override fun getEventData(): WritableMap {
    val eventData = Arguments.createMap()
    return eventData
  }

  companion object {
    const val EVENT_NAME = "onCanvasReady"
  }
}
