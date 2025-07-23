# react-native-sketch-canvas

_Forked from [terrylinla/react-native-sketch-canvas](https://github.com/terrylinla/react-native-sketch-canvas) as package abandoned in 2018._

---

A React Native component for drawing by touching on both iOS and Android, with TypeScript support.

<img src="https://github.com/sourcetoad/react-native-sketch-canvas/assets/611784/1b46536b-bbb7-4d60-a4e2-16604eb8c4e1" height="400" />&nbsp;&nbsp;&nbsp;&nbsp;<img src="https://github.com/sourcetoad/react-native-sketch-canvas/assets/611784/2657b68a-a482-4038-913a-5b812d3f163b" height="400" />

## Features

- Supports New Architecture
- Support iOS and Android
- Full TypeScript support
- Stroke thickness and color are changeable while drawing
- Can undo strokes one by one
- Can serialize path data to JSON for syncing between devices
- Save drawing to a non-transparent image (png or jpg) or a transparent image (png only)
- Use vector concept - sketches won't be cropped in different sizes of canvas
- Support translucent colors and eraser
- Support drawing on an image
- High performance
- Can draw multiple canvases in the same screen
- Can draw multiple multiline text on canvas
- Support for custom UI components
- Permission handling for Android image saving
- **Initial paths loading with native batch processing for optimal performance**
- **Real-time path loading feedback with onInitialPathsLoaded callback**

## Installation

---

Install from `yarn` (only support RN >= 0.40)

```bash
yarn install @sourcetoad/react-native-sketch-canvas
```

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
| onSketchSaved           | `function` | An optional function which accepts 2 arguments `success` and `path`. If `success` is true, image is saved successfully and the saved image path might be in second argument. In Android, image path will always be returned. In iOS, image is saved to camera roll or file system, path will be set to null or image location respectively. |
| onPathsChange           | `function` | An optional function which accepts 1 argument `pathsCount`, which indicates the number of paths. Useful for UI controls.                                                                                                                                                                                                                    |
| user                    |  `string`  | An identifier to identify who draws the path. Useful when undo between two users                                                                                                                                                                                                                                                            |
| touchEnabled            |   `bool`   | If false, disable touching. Default is true.                                                                                                                                                                                                                                                                                                |
| localSourceImage        |  `object`  | Require an object (see [below](#objects)) which consists of `filename`, `directory`(optional) and `mode`(optional). If set, the image will be loaded and display as a background in canvas.                                                                                                                                                 |
| permissionDialogTitle   |  `string`  | Android Only: Provide a Dialog Title for the Image Saving PermissionDialog. Defaults to empty string if not set                                                                                                                                                                                                                             |
| permissionDialogMessage |  `string`  | Android Only: Provide a Dialog Message for the Image Saving PermissionDialog. Defaults to empty string if not set                                                                                                                                                                                                                           |
| onGenerateBase64        | `function` | An optional function which accepts 1 argument `result` containing the base64 string of the canvas. Called when `getBase64()` is invoked.                                                                                                                                                                                                    |
| onCanvasReady           | `function` | An optional function called when the canvas is ready for interaction.                                                                                                                                                                                                                                                                       |
| initialPaths            |  `array`   | Array of paths to load into the canvas when it becomes ready. Uses native batch processing for optimal performance. Each path should follow the [Path object](#objects) format.                                                                                                                                                            |
| onInitialPathsLoaded    | `function` | An optional function which accepts 1 argument `eventData`. Called when `initialPaths` have been processed and loaded into the canvas. `eventData` is an object with `{ loadedCount: number }` property containing the number of paths successfully loaded. |

#### Methods

---

| Method                                                                        | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
|:------------------------------------------------------------------------------|:-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| clear()                                                                       | Clear all the paths                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| undo()                                                                        | Delete the latest path. Can undo multiple times.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| addPath(path)                                                                 | Add a path (see [below](#objects)) to canvas.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| deletePath(id)                                                                | Delete a path with its `id`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| save(imageType, transparent, folder, filename, includeImage, cropToImageSize) | Save image to camera roll or filesystem. If `localSourceImage` is set and a background image is loaded successfully, set `includeImage` to true to include background image and set `cropToImageSize` to true to crop output image to background image.<br/>Android: Save image in `imageType` format with transparent background (if `transparent` sets to True) to **/sdcard/Pictures/`folder`/`filename`** (which is Environment.DIRECTORY_PICTURES).<br/>iOS: Save image in `imageType` format with transparent background (if `transparent` sets to True) to camera roll or file system. If `folder` and `filename` are set, image will save to **temporary directory/`folder`/`filename`** (which is NSTemporaryDirectory()) |
| getPaths()                                                                    | Get the paths that drawn on the canvas                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| getBase64(imageType, transparent, includeImage, includeText, cropToImageSize) | Get the base64 string of the canvas. The result will be sent through the `onGenerateBase64` event handler. Parameters:<br/>- `imageType`: "png" or "jpg"<br/>- `transparent`: whether to include transparency<br/>- `includeImage`: whether to include background image<br/>- `includeText`: whether to include text<br/>- `cropToImageSize`: whether to crop to background image size                                                                                                                                                                                                                                                                                                                                             |
| setInitialPaths(initialPaths) | Set initial paths to the canvas using native batch processing. This method is called automatically when the `initialPaths` prop is provided, but can also be called manually for dynamic path loading.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |

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
| onSketchSaved           | `function`  | See [above](#properties)                                                                                                                                                                                                                                                                                                                          |
| onCanvasReady           | `function`  | An optional function called when the canvas is ready for interaction.                                                                                                                                                                                                                                                                             |
| initialPaths            |  `array`   | Array of paths to load into the canvas when it becomes ready. Uses native batch processing for optimal performance. Each path should follow the [Path object](#objects) format.                                                                                                                                                            |
| onInitialPathsLoaded    | `function` | An optional function which accepts 1 argument `eventData`. Called when `initialPaths` have been processed and loaded into the canvas. `eventData` is an object with `{ loadedCount: number }` property containing the number of paths successfully loaded. |

#### Methods

---

| Method         | Description           |
|:---------------|:----------------------|
| clear()        | See [above](#methods) |
| undo()         | See [above](#methods) |
| addPath(path)  | See [above](#methods) |
| deletePath(id) | See [above](#methods) |
| save()         |                       |

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

To use an image as background, `localSourceImage`(see [below](#background-image)) reqires an object, which consists of `filename`, `directory`(optional) and `mode`(optional). <br/>
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

The `initialPaths` prop allows you to pre-load paths into the canvas when it becomes ready. This feature uses native batch processing for optimal performance, making it ideal for loading saved sketches or collaborative drawing sessions.

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
        onInitialPathsLoaded={(eventData) => {
          const loadedCount = eventData.loadedCount || 0;
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

### Performance Benefits

- **Batch Processing**: Paths are loaded in a single native operation instead of individual calls
- **Optimized Rendering**: Native layer handles path scaling and coordinate conversion efficiently
- **Memory Efficient**: Reduces JavaScript bridge overhead for large path datasets

### Use Cases

- **Saved Sketches**: Restore previously saved drawings
- **Collaborative Drawing**: Load paths from other users in real-time
- **Template Loading**: Pre-populate canvas with template drawings
- **Undo/Redo**: Efficiently restore canvas state

### Event Handling

The `onInitialPathsLoaded` callback provides feedback when initial paths have been processed:

```tsx
onInitialPathsLoaded={(eventData) => {
  const loadedCount = eventData.loadedCount || 0;
  
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
| folder?          | string  | Android: the folder name in `Pictures` directory<br/>iOS: if `filename` is not null, image will save to temporary directory with folder and filename, otherwise, it will save to camera roll |
| filename?        | string  | the file name of image<br/>iOS: Set to `null` to save image to camera roll.                                                                                                                  |
| transparent      | boolean | save canvas with transparent background, ignored if imageType is `jpg`                                                                                                                       |
| imageType        | string  | image file format<br/>Options: `png`, `jpg`                                                                                                                                                  |
| includeImage?    | boolean | Set to `true` to include the image loaded from `LocalSourceImage`. (Default is `true`)                                                                                                       |
| includeText?     | boolean | Set to `true` to include the text drawn from `Text`. (Default is `true`)                                                                                                                     |
| cropToImageSize? | boolean | Set to `true` to crop output image to the image loaded from `LocalSourceImage`. (Default is `false`)                                                                                         |

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
    color: '#FF000000', // ARGB or RGB
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
| fontSize?           | number | font size                                                                                                                                                                     | 12             |
| fontColor?          | string | text color                                                                                                                                                                    | black          |
| overlay?            | string | Set to `TextOnSketch` to overlay drawing with text, otherwise the text will be overlaid with drawing.<br/>Options: `TextOnSketch`, `SketchOnText`                             | SketchOnText   |
| anchor?             | object | Set the origin point of the image. (0, 0) to (1, 1). (0, 0) and (1, 1) indicate the top-left and bottom-right point of the image respectively.                                | { x: 0, y: 0 } |
| position            | object | Set the position of the image on canvas. If `coordinate` is `Ratio`, (0, 0) and (1, 1) indicate the top-left and bottom-right point of the canvas respectively.               | { x: 0, y: 0 } |
| coordinate?         | string | Set to `Absolute` and `Ratio` to treat `position` as absolute position (in point) and proportion respectively.<br/>Options: `Absolute`, `Ratio`                               | Absolute       |
| alignment?          | string | Specify how the text aligns inside container. Only work when `text` is multiline text.                                                                                        | Left           |
| lineHeightMultiple? | number | Multiply line height by this factor. Only work when `text` is multiline text.                                                                                                 | 1.0            |

## Example

---

The source code includes 9 examples, using built-in UI components, using with only canvas, sync between two canvases, and performance testing with initial paths loading.

Check full example app in the [example](./example) folder

### New Examples

- **Example 8**: API consistency testing for initial paths loading with various edge cases
- **Example 9**: Performance testing suite for large datasets using the new `initialPaths` feature

### Jest Setup

If you're using Jest in your project, you'll need to mock the TurboModule registry. Add the following to your Jest setup file:

```javascript
jest.mock('react-native/Libraries/TurboModule/TurboModuleRegistry', () => {
  const turboModuleRegistry = jest.requireActual(
    'react-native/Libraries/TurboModule/TurboModuleRegistry'
  );
  return {
    ...turboModuleRegistry,
    getEnforcing: (name) => {
      // List of TurboModules libraries to mock
      const modulesToMock = ['SketchCanvasModule'];
      if (modulesToMock.includes(name)) {
        return {
          getConstants: jest.fn(() => ({
            MainBundlePath: 'test',
            NSDocumentDirectory: 'test',
            NSLibraryDirectory: 'test',
            NSCachesDirectory: 'test',
          })),
        };
      }
      return turboModuleRegistry.getEnforcing(name);
    },
  };
});
```

This mock ensures that the native module constants are available during testing.

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
} from '@sourcetoad/react-native-sketch-canvas';
```
