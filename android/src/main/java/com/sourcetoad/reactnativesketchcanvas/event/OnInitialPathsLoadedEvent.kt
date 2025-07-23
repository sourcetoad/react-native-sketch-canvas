package com.sourcetoad.reactnativesketchcanvas.event

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableMap
import com.facebook.react.uimanager.events.Event

class OnInitialPathsLoadedEvent(
  surfaceId: Int,
  viewId: Int,
  private val loadedCount: Int,
) : Event<OnInitialPathsLoadedEvent>(surfaceId, viewId)  {
  override fun getEventName(): String {
    return EVENT_NAME
  }

  override fun getEventData(): WritableMap {
    val eventData = Arguments.createMap()
    eventData.putInt("loadedCount", loadedCount)
    return eventData
  }

  companion object {
    const val EVENT_NAME = "onInitialPathsLoaded"
  }
}