# Upgrading

---

## Migrating from 2.x

---

3.0 replaces the Fabric component and TurboModule with a Nitro view, and merges every export into one `save()` and one `onSketchSaved`.

- Install the peer dependency `react-native-nitro-modules` (~0.37.1). React Native >= 0.86 and the New Architecture are required.
- `SketchCanvas.save()` takes a [SaveOptions](README.md#saveoptions-object) object whose `type` picks the output: `'file'` (the default), `'base64'` or `'arraybuffer'`. It returns `Promise<SaveResult>` (`{ success, type, data }`).
- `RNSketchCanvas.save()` takes no arguments. It reads `savePreference()`, whose `type` picks the output (see [SavePreference](README.md#savepreference-object)), and also returns `Promise<SaveResult>`.
- **Breaking:** `getBase64()` and `onGenerateBase64` are removed. Use `save({ type: 'base64' })`; the result arrives in `onSketchSaved` and in the promise.
- **Breaking:** the second argument of `onSketchSaved` is now a [SaveResponse](README.md#saveresult-and-saveresponse-objects) object (`{ type, data }`) instead of the saved path. For a file save, the path is `response.data` (`null` on failure).
- The positional `save(imageType, transparent, folder, filename, includeImage, includeText, cropToImageSize)` still works and saves a file, but it is deprecated and will be removed in a future major version.
- If the canvas isn't ready (not mounted yet, unmounted, or Android's native canvas isn't ready), the promise rejects with `Error('Canvas is not ready')` and `onSketchSaved` doesn't fire (as in 2.x).
- `OnChangeEventType` is deprecated. It's still exported, but no change events use it anymore.
- Update your Jest mock (see [Jest Setup](README.md#jest-setup)).

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
- Android keeps the drawing, background image and text when the canvas is detached and re-attached (for example pushing a screen and popping back), as iOS does. 2.x blanked the canvas and dropped every later command. The canvas releases its memory when it unmounts.

`onInitialPathsLoaded` is unchanged at runtime: it still receives `{ loadedCount }`.
