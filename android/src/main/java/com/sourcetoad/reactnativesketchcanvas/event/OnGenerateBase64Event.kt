package com.sourcetoad.reactnativesketchcanvas

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableMap
import com.facebook.react.uimanager.events.Event

class OnGenerateBase64Event(
  surfaceId: Int,
  viewId: Int,
  private val base64: String
) : Event<OnGenerateBase64Event>(surfaceId, viewId)  {
  override fun getEventName(): String {
    return EVENT_NAME
  }

  override fun getEventData(): WritableMap {
    val eventData = Arguments.createMap()

    eventData.putString("base64", base64);

    return eventData
  }

  companion object {
    const val EVENT_NAME = "onGenerateBase64"
  }
}
