# react-native-sketch-canvas

_Forked from [terrylinla/react-native-sketch-canvas](https://github.com/terrylinla/react-native-sketch-canvas) as package abandoned in 2018._

---

A React Native component for drawing by touching on both iOS and Android, with TypeScript support.

<img src="https://github.com/sourcetoad/react-native-sketch-canvas/assets/611784/1b46536b-bbb7-4d60-a4e2-16604eb8c4e1" height="400" />&nbsp;&nbsp;&nbsp;&nbsp;<img src="https://github.com/sourcetoad/react-native-sketch-canvas/assets/611784/2657b68a-a482-4038-913a-5b812d3f163b" height="400" />

## Features

- Built on [Nitro Modules](https://nitro.margelo.com) (New Architecture only)
- Support iOS and Android
- Full TypeScript support
- Stroke thickness and color are changeable while drawing
- Can undo strokes one by one
- Can serialize path data to JSON for syncing between devices
- Save drawing to a non-transparent image (png or jpg) or a transparent image (png only)
- One `save()` exports a file, a base64 string or raw bytes (`ArrayBuffer`), and returns a promise
- Use vector concept - sketches won't be cropped in different sizes of canvas
- Support translucent colors and eraser
- Support drawing on an image
- High performance
- Can draw multiple canvases in the same screen
- Can draw multiple multiline text on canvas
- Support for custom UI components
- Permission handling for Android image saving
- Initial paths loading with native batch processing for optimal performance
- Real-time path loading feedback with onInitialPathsLoaded callback

## Installation

---

### Requirements

- React Native >= 0.86, New Architecture only
- [`react-native-nitro-modules`](https://github.com/mrousavy/nitro) ~0.37.1 (peer dependency)
- iOS 15.1+
- Android minSdk 24

Install from `yarn` together with the Nitro Modules peer dependency

```bash
yarn add @sourcetoad/react-native-sketch-canvas react-native-nitro-modules@~0.37.1
```

Then run `pod install` in your `ios` folder. Both platforms autolink.

## Migrating from 2.x

---

3.0 replaces the Fabric component and TurboModule with a Nitro view, and merges every export into one `save()` and one `onSketchSaved`.

- Install the peer dependency `react-native-nitro-modules` (~0.37.1). React Native >= 0.86 and the New Architecture are required.
- `SketchCanvas.save()` takes a [SaveOptions](#saveoptions-object) object whose `type` picks the output: `'file'` (the default), `'base64'` or `'arraybuffer'`. It returns `Promise<SaveResult>` (`{ success, type, data }`).
- `RNSketchCanvas.save()` takes no arguments. It reads `savePreference()`, whose `type` picks the output (see [SavePreference](#savepreference-object)), and also returns `Promise<SaveResult>`.
- **Breaking:** `getBase64()` and `onGenerateBase64` are removed. Use `save({ type: 'base64' })`; the result arrives in `onSketchSaved` and in the promise.
- **Breaking:** the second argument of `onSketchSaved` is now a [SaveResponse](#saveresult-and-saveresponse-objects) object (`{ type, data }`) instead of the saved path. For a file save, the path is `response.data` (`null` on failure).
- The positional `save(imageType, transparent, folder, filename, includeImage, includeText, cropToImageSize)` still works and saves a file, but it is deprecated and will be removed in a future major version.
- If the canvas isn't ready (not mounted yet, unmounted, or Android's native canvas isn't ready), the promise rejects with `Error('Canvas is not ready')` and `onSketchSaved` doesn't fire (as in 2.x).
- `OnChangeEventType` is deprecated. It's still exported, but no change events use it anymore.
- Update your Jest mock (see [Jest Setup](#jest-setup)).

In 2.x you passed positional arguments, the path arrived as the second `onSketchSaved` argument, and base64 had its own method and callback:

```tsx
<SketchCanvas
  ref={canvas}
  onSketchSaved={(success, path) => console.log(success, path)}
  onGenerateBase64={({ base64 }) => console.log(base64)}
/>;
canvas.current.save('png', false, 'RNSketchCanvas', 'drawing', true, true, false);
canvas.current.getBase64('png', false, true, true, false);
```

In 3.0 you pass an options object (omitted options use their defaults), and every result arrives in `onSketchSaved`:

```tsx
<SketchCanvas
  ref={canvas}
  onSketchSaved={(success, response) => {
    if (response.type === 'file') {
      console.log(success, response.data);
    } else if (response.type === 'base64') {
      console.log(response.data);
    }
  }}
/>;
canvas.current.save({ folder: 'RNSketchCanvas', filename: 'drawing' });
canvas.current.save({ type: 'base64' });
```

Or await the result of a specific call:

```tsx
const { success, data: path } = await canvas.current.save({ folder: 'RNSketchCanvas', filename: 'drawing' });
const { data: base64 } = await canvas.current.save({ type: 'base64' });
```

Behaviour changes (iOS, from the Swift rewrite):

- All `text` field changes are applied. 2.x could skip some updates to an existing `text` array.
- A save that fails to create its folder no longer crashes. It resolves `{ success: false, type: 'file', data: null }`.

Other changes:

- `initialPaths` now loads once even when the canvas becomes ready before its first layout.
- Android text without `fontSize` uses size 0 instead of throwing.
- A stroke or path with a missing or invalid colour is sent as colour 0 (`#00000000`), which both platforms draw as an eraser stroke, as 2.x did on iOS.

`onInitialPathsLoaded` is unchanged at runtime: it still receives `{ loadedCount }`.

## Usage

---

### ● Using without UI component (for customizing UI)

```tsx
import React from 'react';
import {
  AppRegistry,
  StyleSheet,
  View,
} from 'react-native';

import { SketchCanvas } from '@sourcetoad/react-native-sketch-canvas';

export default function Example() {
  return (
    <View style={styles.container}>
      <View style={{ flex: 1, flexDirection: 'row' }}>
        <SketchCanvas
          style={{ flex: 1 }}
          strokeColor={'red'}
          strokeWidth={7}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5FCFF',
  },
});

AppRegistry.registerComponent('example', () => Example);
```

#### Saving and exporting

`save()` takes an options object whose `type` picks the output: a file (the default), a base64 string or the encoded image bytes as an `ArrayBuffer`. Every result arrives in `onSketchSaved(success, response)`, and each call also returns a promise if you'd rather await it:

```tsx
import React, { useRef } from 'react';
import { Button, View } from 'react-native';
import {
  SketchCanvas,
  type SaveResponse,
} from '@sourcetoad/react-native-sketch-canvas';

export default function SaveExample() {
  const canvas = useRef<SketchCanvas>(null);

  const onSketchSaved = (success: boolean, response: SaveResponse) => {
    if (response.type === 'file') {
      console.log(success ? `Saved to ${response.data}` : 'Save failed');
    } else if (response.type === 'base64') {
      console.log(`data:image/jpeg;base64,${response.data}`);
    } else {
      console.log(`${response.data?.byteLength} bytes`);
    }
  };

  const onSave = () =>
    canvas.current!.save({
      folder: 'RNSketchCanvas',
      filename: `drawing-${Date.now()}`,
      imageType: 'png',
    }).catch((e) => console.warn((e as Error).message));

  const onExport = () =>
    canvas.current!.save({ type: 'base64', imageType: 'jpg' }).catch(() => {});

  const onUpload = async () => {
    const { data } = await canvas.current!.save({ type: 'arraybuffer' });
    await fetch('https://example.com/upload', { method: 'POST', body: data });
  };

  return (
    <View style={{ flex: 1 }}>
      <SketchCanvas
        ref={canvas}
        style={{ flex: 1 }}
        strokeColor="red"
        strokeWidth={7}
        onSketchSaved={onSketchSaved}
      />
      <Button title="Save" onPress={onSave} />
      <Button title="Export" onPress={onExport} />
      <Button title="Upload" onPress={onUpload} />
    </View>
  );
}
```

- `save()` resolves with a [SaveResult](#saveresult-and-saveresponse-objects) (`{ success, type, data }`). The result type follows `type`, so `data` is a `string` for `'file'` and `'base64'` and an `ArrayBuffer` for `'arraybuffer'` (`null` when a file save fails). A file save that can't create the image or its folder resolves with `success: false` and `data: null`. On iOS a failed final write still reports `true` (see [Known Issues](#known-issues)). On Android an exception while exporting rejects.
- `onSketchSaved(success, response)` fires once for every save that resolves, with `response` being `{ type, data }`.
- `save()` rejects with `Error('Canvas is not ready')` if the canvas hasn't finished mounting (or is unmounted). It can also reject with a one-line native error message (an Android export failure) or an argument error. `onSketchSaved` never fires when `save()` rejects. On Android, commands sent before the canvas is ready are dropped, so a save right after mount can reject.
- On iOS, a canvas with no size yet (before its first layout) exports an empty string for `'base64'` and an empty `ArrayBuffer` for `'arraybuffer'`, and a file save resolves `success: false`. Android rejects with `Error('Canvas is not ready')` until the canvas has a size.
- `save({ type: 'base64' })` and `save({ type: 'arraybuffer' })` with no other options return a PNG of the whole canvas, including the background image and text. The `ArrayBuffer` holds exactly the bytes the base64 string encodes.

#### Properties

---

| Prop                    |    Type    | Description                                                                                                                                                                                                                                                                                                                                 |
|:------------------------|:----------:|:--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| style                   |  `object`  | Styles to be applied on canvas component                                                                                                                                                                                                                                                                                                    |
| strokeColor             |  `string`  | Set the color of stroke, which can be #RRGGBB or #RRGGBBAA. If strokeColor is set to #00000000, it will automatically become an eraser. <br/>NOTE: Once an eraser path is sent to Android, Android View will disable hardware acceleration automatically. It might reduce the canvas performance afterward.                                 |
| strokeWidth             |  `number`  | The thickness of stroke                                                                                                                                                                                                                                                                                                                     |
| onStrokeStart           | `function` | An optional function which accepts 2 arguments `x` and `y`. Called when user's finger touches the canvas (starts to draw)                                                                                                                                                                                                                   |
| onStrokeChanged         | `function` | An optional function which accepts 2 arguments `x` and `y`. Called when user's finger moves                                                                                                                                                                                                                                                 |
| onStrokeEnd             | `function` | An optional function called when user's finger leaves the canvas (end drawing)                                                                                                                                                                                                                                                              |
| onSketchSaved           | `function` | An optional function which accepts 2 arguments `success` and `response`. `response` is a [SaveResponse](#saveresult-and-saveresponse-objects) (`{ type, data }`): the saved file path for `type: 'file'` (`null` on failure), the base64 string for `'base64'`, or the image bytes for `'arraybuffer'`. Called once when a `save()` promise resolves. |
| onPathsChange           | `function` | An optional function which accepts 1 argument `pathsCount`, which indicates the number of paths. Useful for UI controls.                                                                                                                                                                                                                    |
| user                    |  `string`  | An identifier to identify who draws the path. Useful when undo between two users                                                                                                                                                                                                                                                            |
| touchEnabled            |   `bool`   | If false, disable touching. Default is true.                                                                                                                                                                                                                                                                                                |
| localSourceImage        |  `object`  | Require an object (see [below](#objects)) which consists of `filename`, `directory`(optional) and `mode`(optional). If set, the image will be loaded and display as a background in canvas.                                                                                                                                                 |
| permissionDialogTitle   |  `string`  | Android Only: Provide a Dialog Title for the Image Saving PermissionDialog. Defaults to empty string if not set                                                                                                                                                                                                                             |
| permissionDialogMessage |  `string`  | Android Only: Provide a Dialog Message for the Image Saving PermissionDialog. Defaults to empty string if not set                                                                                                                                                                                                                           |
| onCanvasReady           | `function` | An optional function called when the canvas is ready for interaction.                                                                                                                                                                                                                                                                       |
| initialPaths            |  `array`   | Array of paths to load into the canvas when it becomes ready. Uses native batch processing for optimal performance. Each path should follow the [Path object](#objects) format.                                                                                                                                                             |
| onInitialPathsLoaded    | `function` | An optional function which accepts 1 argument `eventData`. Called when `initialPaths` have been processed and loaded into the canvas. `eventData` is an object with `{ loadedCount: number }` property containing the number of paths successfully loaded.                                                                                  |

#### Methods

---

| Method                                                                        | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
|:------------------------------------------------------------------------------|:-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| clear()                                                                       | Clear all the paths                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| undo()                                                                        | Delete the latest path. Can undo multiple times.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| addPath(path)                                                                 | Add a path (see [below](#objects)) to canvas.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| deletePath(id)                                                                | Delete a path with its `id`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| save(options) | Takes a [SaveOptions](#saveoptions-object) object and returns `Promise<SaveResult>` (`{ success, type, data }`); the result is also sent to `onSketchSaved`. `type` picks the output:<br/>`'file'` (default): saves the image to the filesystem and resolves the path in `data` (`null` on failure).<br/>Android: Save image in `imageType` format with transparent background (if `transparent` sets to True) to **/sdcard/Pictures/`folder`/`filename`** (which is Environment.DIRECTORY_PICTURES).<br/>iOS: Save image in `imageType` format with transparent background (if `transparent` sets to True) to **temporary directory/`folder`/`filename`** (which is NSTemporaryDirectory()).<br/>`'base64'`: resolves the base64-encoded image in `data`.<br/>`'arraybuffer'`: resolves the encoded image bytes in `data` as an `ArrayBuffer`.<br/>If `localSourceImage` is set and a background image is loaded successfully, set `includeImage` to true to include background image and set `cropToImageSize` to true to crop output image to background image.<br/>Rejects with `Error('Canvas is not ready')` if the canvas isn't ready, or with a one-line native error message (an Android export failure) or an argument error; `onSketchSaved` doesn't fire on a rejection.<br/>**Deprecated:** `save(imageType, transparent, folder, filename, includeImage, includeText, cropToImageSize)` still works (as `type: 'file'`) and will be removed in a future major version. |
| getPaths()                                                                    | Get the paths that drawn on the canvas                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| setInitialPaths(initialPaths)                                                 | Set initial paths to the canvas using native batch processing. This method is called automatically when the `initialPaths` prop is provided, but can also be called manually for dynamic path loading.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |

#### Constants

---

| Constant    | Description                                                                          |
|:------------|:-------------------------------------------------------------------------------------|
| MAIN_BUNDLE | Android: empty string, '' <br/>iOS: equivalent to [[NSBundle mainBundle] bundlePath] |
| DOCUMENT    | Android: empty string, '' <br/>iOS: equivalent to NSDocumentDirectory                |
| LIBRARY     | Android: empty string, '' <br/>iOS: equivalent to NSLibraryDirectory                 |
| CACHES      | Android: empty string, '' <br/>iOS: equivalent to NSCachesDirectory                  |

### ● Using with built-in UI components

<img src="https://i.imgur.com/O0vVdD6.png" height="400" />

```tsx
import React from 'react';
import {
  AppRegistry,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import RNSketchCanvas from '@sourcetoad/react-native-sketch-canvas';

export default function Example() {
  return (
    <View style={styles.container}>
      <View style={{ flex: 1, flexDirection: 'row' }}>
        <RNSketchCanvas
          containerStyle={{ backgroundColor: 'transparent', flex: 1 }}
          canvasStyle={{ backgroundColor: 'transparent', flex: 1 }}
          defaultStrokeIndex={0}
          defaultStrokeWidth={5}
          closeComponent={<View style={styles.functionButton}><Text style={{color: 'white'}}>Close</Text></View>}
          undoComponent={<View style={styles.functionButton}><Text style={{color: 'white'}}>Undo</Text></View>}
          clearComponent={<View style={styles.functionButton}><Text style={{color: 'white'}}>Clear</Text></View>}
          eraseComponent={<View style={styles.functionButton}><Text style={{color: 'white'}}>Eraser</Text></View>}
          strokeComponent={color => (
            <View style={[{ backgroundColor: color }, styles.strokeColorButton]} />
          )}
          strokeSelectedComponent={(color, index, changed) => {
            return (
              <View style={[{ backgroundColor: color, borderWidth: 2 }, styles.strokeColorButton]} />
            )
          }}
          strokeWidthComponent={(w) => {
            return (<View style={styles.strokeWidthButton}>
              <View  style={{
                backgroundColor: 'white', marginHorizontal: 2.5,
                width: Math.sqrt(w / 3) * 10, height: Math.sqrt(w / 3) * 10, borderRadius: Math.sqrt(w / 3) * 10 / 2
              }} />
            </View>
          )}}
          saveComponent={<View style={styles.functionButton}><Text style={{color: 'white'}}>Save</Text></View>}
          savePreference={() => {
            return {
              folder: 'RNSketchCanvas',
              filename: String(Math.ceil(Math.random() * 100000000)),
              transparent: false,
              imageType: 'png'
            }
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5FCFF',
  },
  strokeColorButton: {
    marginHorizontal: 2.5,
    marginVertical: 8,
    width: 30,
    height: 30,
    borderRadius: 15,
  },
  strokeWidthButton: {
    marginHorizontal: 2.5,
    marginVertical: 8,
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#39579A'
  },
  functionButton: {
    marginHorizontal: 2.5,
    marginVertical: 8,
    height: 30,
    width: 60,
    backgroundColor: '#39579A',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 5,
  }
});

AppRegistry.registerComponent('example', () => Example);
```

#### Properties

---

| Prop                    |    Type     | Description                                                                                                                                                                                                                                                                                                                                       |
|:------------------------|:-----------:|:--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| containerStyle          |  `object`   | Styles to be applied on container                                                                                                                                                                                                                                                                                                                 |
| canvasStyle             |  `object`   | Styles to be applied on canvas component                                                                                                                                                                                                                                                                                                          |
| onStrokeStart           | `function`  | See [above](#properties)                                                                                                                                                                                                                                                                                                                          |
| onStrokeChanged         | `function`  | See [above](#properties)                                                                                                                                                                                                                                                                                                                          |
| onStrokeEnd             | `function`  | See [above](#properties)                                                                                                                                                                                                                                                                                                                          |
| onPathsChange           | `function`  | See [above](#properties)                                                                                                                                                                                                                                                                                                                          |
| onClosePressed          | `function`  | An optional function called when user taps closeComponent                                                                                                                                                                                                                                                                                         |
| onUndoPressed           | `function`  | An optional function that accepts a argument `id` (the deleted id of path) and is called when user taps "undo"                                                                                                                                                                                                                                    |
| onClearPressed          | `function`  | An optional function called when user taps clearComponent                                                                                                                                                                                                                                                                                         |
| user                    |  `string`   | See [above](#properties)                                                                                                                                                                                                                                                                                                                          |
| closeComponent          | `component` | An optional component for closing                                                                                                                                                                                                                                                                                                                 |
| eraseComponent          | `component` | An optional component for eraser                                                                                                                                                                                                                                                                                                                  |
| undoComponent           | `component` | An optional component for undoing                                                                                                                                                                                                                                                                                                                 |
| clearComponent          | `component` | An optional component for clearing                                                                                                                                                                                                                                                                                                                |
| saveComponent           | `component` | An optional component for saving                                                                                                                                                                                                                                                                                                                  |
| strokeComponent         | `function`  | An optional function which accepts 1 argument `color` and should return a component.                                                                                                                                                                                                                                                              |
| strokeSelectedComponent | `function`  | An optional function which accepts 3 arguments `color`, `selectedIndex`, `isColorChanged` and should return a component. `isColorChanged` is useful for animating when changing color. Because rerendering also calls this function, we need `isColorChanged` to determine whether the component is rerendering or the selected color is changed. |
| strokeWidthComponent    | `function`  | An optional function which accepts 1 argument `width` and should return a component.                                                                                                                                                                                                                                                              |
| strokeColors            |   `array`   | An array of colors. Example: `[{ color: '#000000' }, {color: '#FF0000'}]`                                                                                                                                                                                                                                                                         |
| defaultStrokeIndex      |  `numbber`  | The default index of selected stroke color                                                                                                                                                                                                                                                                                                        |
| defaultStrokeWidth      |  `number`   | The default thickness of stroke                                                                                                                                                                                                                                                                                                                   |
| minStrokeWidth          |  `number`   | The minimum value of thickness                                                                                                                                                                                                                                                                                                                    |
| maxStrokeWidth          |  `number`   | The maximum value of thickness                                                                                                                                                                                                                                                                                                                    |
| strokeWidthStep         |  `number`   | The step value of thickness when tapping `strokeWidthComponent`.                                                                                                                                                                                                                                                                                  |
| savePreference          | `function`  | A function which is called when saving image and should return an object (see [below](#objects)).                                                                                                                                                                                                                                                 |
| onSketchSaved           | `function`  | See [above](#properties)                                                                                                                                                                                                                                                                                                          |
| onCanvasReady           | `function`  | An optional function called when the canvas is ready for interaction.                                                                                                                                                                                                                                                                             |
| initialPaths            |   `array`   | Array of paths to load into the canvas when it becomes ready. Uses native batch processing for optimal performance. Each path should follow the [Path object](#objects) format.                                                                                                                                                                   |
| onInitialPathsLoaded    | `function`  | An optional function which accepts 1 argument `eventData`. Called when `initialPaths` have been processed and loaded into the canvas. `eventData` is an object with `{ loadedCount: number }` property containing the number of paths successfully loaded.                                                                                        |

#### Methods

---

| Method         | Description           |
|:---------------|:----------------------|
| clear()        | See [above](#methods) |
| undo()         | See [above](#methods) |
| addPath(path)  | See [above](#methods) |
| deletePath(id) | See [above](#methods) |
| save()         | Saves with `savePreference()` (or a png file with a generated filename). `savePreference().type` picks the output (`'file'` by default). Returns `Promise<SaveResult>` and calls `onSketchSaved` |

#### Constants

---

| Constant    | Description             |
|:------------|:------------------------|
| MAIN_BUNDLE | See [above](#constants) |
| DOCUMENT    | See [above](#constants) |
| LIBRARY     | See [above](#constants) |
| CACHES      | See [above](#constants) |

## Background Image

---

To use an image as background, `localSourceImage`(see [below](#background-image)) requires an object, which consists of `filename`, `directory`(optional) and `mode`(optional). <br/>
Note: Because native module cannot read the file in JS bundle, file path cannot be relative to JS side. For example, '../assets/image/image.png' will fail to load image.

### Typical Usage

- Load image from app native bundle
  - Android:
    1. Put your images into android/app/src/main/res/drawable.
    2. Set `filename` to the name of image files with or without file extension.
    3. Set `directory` to ''
  - iOS:
    1. Open Xcode and add images to project by right-clicking `Add Files to [YOUR PROJECT NAME]`.
    2. Set `filename` to the name of image files with file extension.
    3. Set `directory` to MAIN_BUNDLE (e.g. RNSketchCanvas.MAIN_BUNDLE or SketchCanvas.MAIN_BUNDLE)
- Load image from camera
  1. Retrieve photo complete path (including file extension) after snapping.
  2. Set `filename` to that path.
  3. Set `directory` to ''

### Content Mode

- AspectFill<br/>
  <img src="https://i.imgur.com/vRydI60.png" height="200" />
- AspectFit (default)<br/>
  <img src="https://i.imgur.com/r8DtgIN.png" height="200" />
- ScaleToFill<br/>
  <img src="https://i.imgur.com/r9dRnAC.png" height="200" />

## Initial Paths

---

The `initialPaths` prop allows you to preload paths into the canvas when it becomes ready. This feature uses native batch processing for optimal performance, making it ideal for loading saved sketches or collaborative drawing sessions.

### Usage

```tsx
import React from 'react';
import { View } from 'react-native';
import { SketchCanvas } from '@sourcetoad/react-native-sketch-canvas';
import type { Path } from '@sourcetoad/react-native-sketch-canvas';

const savedPaths: Path[] = [
  {
    path: {
      id: 12345,
      color: '#FF0000',
      width: 5,
      data: [
        '100.0,100.0',
        '150.0,150.0',
        '200.0,200.0'
      ]
    },
    size: { width: 400, height: 600 }
  }
];

export default function Example() {
  return (
    <View style={{ flex: 1 }}>
      <SketchCanvas
        style={{ flex: 1 }}
        initialPaths={savedPaths}
        onInitialPathsLoaded={(result: unknown) => {
          // Receives { loadedCount } at runtime (see Known Issues)
          const loadedCount = (result as { loadedCount?: number }).loadedCount ?? 0;
          console.log(`Loaded ${loadedCount} paths successfully`);
        }}
        onCanvasReady={() => {
          console.log('Canvas is ready for interaction');
        }}
      />
    </View>
  );
}
```

### Event Handling

The `onInitialPathsLoaded` callback provides feedback when initial paths have been processed:

```tsx
onInitialPathsLoaded={(result: unknown) => {
  // Receives { loadedCount } at runtime (see Known Issues)
  const loadedCount = (result as { loadedCount?: number }).loadedCount ?? 0;

  if (loadedCount > 0) {
    console.log(`Successfully loaded ${loadedCount} paths`);
  } else {
    console.log('No paths were loaded');
  }
}}
```

## Objects

---

### SavePreference object

```json5
{
  type: 'file',
  folder: 'RNSketchCanvas',
  filename: 'image',
  transparent: true,
  imageType: 'jpg',
  includeImage: true,
  includeText: false,
  cropToImageSize: true
}
```

| Property         | Type    | Description                                                                                                                                                                                  |
|:-----------------|:--------|:---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| type?            | string  | The output of the toolbar save<br/>Options: `file`, `base64`, `arraybuffer`. (Default is `file`)                                                                                              |
| folder           | string  | `file` only. Android: the folder name in `Pictures` directory<br/>iOS: the folder name in the temporary directory                                                                            |
| filename         | string  | `file` only. The file name of image                                                                                                                                                          |
| transparent      | boolean | save canvas with transparent background (png only). Android ignores it for `jpg`; on iOS don't combine it with `jpg`                                                                       |
| imageType        | string  | image file format<br/>Options: `png`, `jpg`                                                                                                                                                  |
| includeImage?    | boolean | Set to `true` to include the image loaded from `LocalSourceImage`. (Default is `true`)                                                                                                       |
| includeText?     | boolean | Set to `true` to include the text drawn from `Text`. (Default is `true`)                                                                                                                     |
| cropToImageSize? | boolean | Set to `true` to crop output image to the image loaded from `LocalSourceImage`. (Default is `false`)                                                                                         |

### SaveOptions object

```tsx
await canvas.current.save({ folder: 'RNSketchCanvas', filename: 'image', imageType: 'jpg' });
await canvas.current.save({ type: 'base64', transparent: true, includeText: false });
await canvas.current.save({ type: 'arraybuffer' });
```

`SaveOptions` is a union of `FileSaveOptions`, `Base64SaveOptions` and `ArrayBufferSaveOptions`, picked by `type`.

| Property         | Type    | Description                                                                                                         |
|:-----------------|:--------|:--------------------------------------------------------------------------------------------------------------------|
| type?            | string  | The output<br/>Options: `file`, `base64`, `arraybuffer`. (Default is `file`)                                         |
| filename         | string  | `file` only, required. The file name of the image                                                                   |
| folder?          | string  | `file` only. Android: the folder name in `Pictures` directory<br/>iOS: the folder name in the temporary directory. (Default is `''`) |
| imageType?       | string  | Image format<br/>Options: `png`, `jpg`. (Default is `png`)                                                          |
| transparent?     | boolean | Use a transparent background (png only). Android ignores it for `jpg`; on iOS don't combine it with `jpg`. (Default is `false`) |
| includeImage?    | boolean | Set to `true` to include the image loaded from `LocalSourceImage`. (Default is `true`)                              |
| includeText?     | boolean | Set to `true` to include the text drawn from `Text`. (Default is `true`)                                            |
| cropToImageSize? | boolean | Set to `true` to crop output image to the image loaded from `LocalSourceImage`. (Default is `false`)                |

### SaveResult and SaveResponse objects

`SaveResult` is what the `save()` promise resolves with. `SaveResponse` is the same object without `success`, passed as the second argument of `onSketchSaved`.

```tsx
const result = await canvas.current.save({ filename: 'image' });
```

`result` is `{ success: true, type: 'file', data: '/.../Pictures/image.png' }`.

| Property | Type                                 | Description                                                                                       |
|:---------|:-------------------------------------|:--------------------------------------------------------------------------------------------------|
| success  | boolean                              | `SaveResult` only. `true` if the image was written. iOS reports `true` even when the final write fails (2.x behaviour; see [Known Issues](#known-issues)). `true` for `base64` and `arraybuffer`, even when iOS exports an empty result from a canvas with no size yet |
| type     | string                               | `file`, `base64` or `arraybuffer`, matching the `type` you saved with                              |
| data     | string \| ArrayBuffer \| null        | `file`: the full path of the saved file, or `null` when the save failed<br/>`base64`: the base64-encoded image (iOS: an empty string before the canvas has a size)<br/>`arraybuffer`: the encoded image bytes (iOS: an empty `ArrayBuffer` before the canvas has a size) |

### Path object

```json5
{
  drawer: 'user1',
  size: { // the size of drawer's canvas
    width: 480,
    height: 640
  },
  path: {
    id: 8979841, // path id
    color: '#000000FF', // #RRGGBB or #RRGGBBAA; a missing or invalid colour is sent as #00000000 and draws as an eraser stroke
    width: 5,
    data: [
      "296.11,281.34",  // x,y
      "293.52,284.64",
      "290.75,289.73"
    ]
  }
}
```

### LocalSourceImage object

```json5
{
  filename: 'image.png',  // e.g. 'image.png' or '/storage/sdcard0/Pictures/image.png'
  directory: '', // e.g. SketchCanvas.MAIN_BUNDLE or '/storage/sdcard0/Pictures/'
  mode: 'AspectFill'
}
```

| Property   | Type    | Description                                                                                                                      | Default     |
|:-----------|:--------|:---------------------------------------------------------------------------------------------------------------------------------|:------------|
| filename   | string  | the fold name of the background image file (can be a full path)                                                                  |             |
| directory? | string  | the directory of the background image file (usually used with [constants](#constants))                                           | ''          |
| mode?      | boolean | Specify how the background image resizes itself to fit or fill the canvas.<br/>Options: `AspectFill`, `AspectFit`, `ScaleToFill` | `AspectFit` |

### CanvasText object

```json5
{
  text: 'TEXT',
  font: '',
  fontSize: 20,
  fontColor: 'red',
  overlay: 'TextOnSketch',
  anchor: { x: 0, y: 1 },
  position: { x: 100, y: 200 },
  coordinate: 'Absolute',
  alignment: 'Center',
  lineHeightMultiple: 1.2
}
```

| Property            | Type   | Description                                                                                                                                                                   | Default        |
|:--------------------|:-------|:------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|:---------------|
| text                | string | the text to display (can be multiline by `\n`)                                                                                                                                |                |
| font?               | string | Android: You can set `font` to `fonts/[filename].ttf` to load font in `android/app/src/main/assets/fonts/` in your Android project<br/>iOS: Set `font` that included with iOS |                |
| fontSize?           | number | font size. Android applies it in px, not dp (see [Known Issues](#known-issues))                                                                                                | 0              |
| fontColor?          | string | text color                                                                                                                                                                    | iOS: transparent<br/>Android: black |
| overlay?            | string | Set to `TextOnSketch` to overlay drawing with text, otherwise the text will be overlaid with drawing.<br/>Options: `TextOnSketch`, `SketchOnText`                             | SketchOnText   |
| anchor?             | object | Set the origin point of the image. (0, 0) to (1, 1). (0, 0) and (1, 1) indicate the top-left and bottom-right point of the image respectively.                                | { x: 0, y: 0 } |
| position            | object | Set the position of the image on canvas. If `coordinate` is `Ratio`, (0, 0) and (1, 1) indicate the top-left and bottom-right point of the canvas respectively.               | { x: 0, y: 0 } |
| coordinate?         | string | Set to `Absolute` and `Ratio` to treat `position` as absolute position (in point) and proportion respectively.<br/>Options: `Absolute`, `Ratio`                               | Absolute       |
| alignment?          | string | Specify how the text aligns inside container. Only work when `text` is multiline text.                                                                                        | Left           |
| lineHeightMultiple? | number | Multiply line height by this factor. Only work when `text` is multiline text. Android: set it for multiline text, or the lines overlap                                       | 1.0            |

## Known Issues

---

These are 2.x behaviours that 3.0 keeps as they are, unless noted.

- Android: detaching and re-attaching the canvas (for example pushing a screen and popping back) blanks it, including the background image and text. After that drawing commands are dropped and logged as "Canvas is not ready", and `save()` rejects with `Error('Canvas is not ready')`.
- Android: commands sent before the canvas is ready are dropped, so `save()` rejects with `Error('Canvas is not ready')`. iOS accepts them before it's ready.
- Android: saving writes with the File API to the public `Pictures` directory, not MediaStore, so scoped storage can block it (for example API 29 without `requestLegacyExternalStorage`).
- Android: the storage permission request on mount returns a status string that is always truthy, and its result is ignored.
- Android: `MAIN_BUNDLE`, `DOCUMENT`, `LIBRARY` and `CACHES` are empty strings.
- Android: loading a background image from a file passes `filename` and `directory` to `File` in reversed order.
- Android: exports ignore the background image `mode` and always use AspectFit.
- Android: text `fontSize` is applied in px, not dp.
- Android: multiline text overlaps unless `lineHeightMultiple` is set.
- Text without `fontColor` is transparent on iOS and black on Android. Text without `fontSize` uses size 0 (Android threw in 2.x).
- iOS stroke width is an integer, while Android's is a float.
- iOS: a save reports success even if writing the file fails.
- `onPathsChange` timing differs per platform. iOS calls it on `addPath`, `deletePath`, `clear` and initial paths, but not for drawn strokes. Android also calls it for drawn strokes and when a background image loads.
- Saved files and base64 output differ per platform:

  |                    | iOS                                       | Android                                    |
  |:-------------------|:------------------------------------------|:-------------------------------------------|
  | Save location      | `NSTemporaryDirectory()/folder/filename`  | `Pictures/folder/filename`                 |
  | Base64 line breaks | `\r\n` every 64 characters                | `\n` every 76 characters                    |
  | JPEG quality       | 100%                                      | 90%                                        |

  Because the base64 line breaks differ, strip whitespace before decoding, or use `save({ type: 'arraybuffer' })`, which returns the encoded bytes with no line breaks to handle.

- `onInitialPathsLoaded` is typed `(count: number) => void` but receives `{ loadedCount }`.

## Example

---

The source code includes 9 examples, using built-in UI components, using with only canvas, sync between two canvases, and performance testing with initial paths loading.

Check full example app in the [example](./example) folder

### Jest Setup

If you're using Jest in your project, mock `react-native-nitro-modules` so the canvas renders without native code. Add the following to your Jest setup file:

```javascript
jest.mock('react-native-nitro-modules', () => {
  const React = require('react');
  const { View } = require('react-native');
  const createMethods = () => ({
    newPath: jest.fn(),
    addPoint: jest.fn(),
    endPath: jest.fn(),
    addPath: jest.fn(),
    addInitialPaths: jest.fn(),
    deletePath: jest.fn(),
    clear: jest.fn(),
    save: jest.fn(() => Promise.resolve({ success: true, path: '/tmp/x.png' })),
    transferToBase64: jest.fn(() => Promise.resolve('BASE64')),
    transferToArrayBuffer: jest.fn(() => Promise.resolve(new ArrayBuffer(4))),
  });
  return {
    getHostComponent: () =>
      function MockSketchCanvasHost(props) {
        const methods = React.useMemo(createMethods, []);
        React.useEffect(() => {
          props.hybridRef?.f(methods);
        }, [methods, props.hybridRef]);
        return React.createElement(View, props);
      },
    callback: (f) => ({ f }),
    NitroModules: {
      createHybridObject: jest.fn(() => ({
        mainBundlePath: 'test',
        documentDirectory: 'test',
        libraryDirectory: 'test',
        cachesDirectory: 'test',
      })),
    },
  };
});
```

If your mock covers other Nitro libraries, extend it rather than adding a second `jest.mock('react-native-nitro-modules')`.

This mock renders the canvas as a plain `View`, makes `save()` resolve, and provides the constants.

### TypeScript Support

All types are exported for TypeScript consumers:

```tsx
import type {
  ImageType,
  OnChangeEventType,
  Size,
  PathData,
  Path,
  CanvasText,
  SavePreference,
  LocalSourceImage,
  SketchCanvasProps,
  RNSketchCanvasProps,
  SaveType,
  SaveOptions,
  FileSaveOptions,
  Base64SaveOptions,
  ArrayBufferSaveOptions,
  SaveResponse,
  SaveResult,
} from '@sourcetoad/react-native-sketch-canvas';
```

`OnChangeEventType` is deprecated and only kept for compatibility.
