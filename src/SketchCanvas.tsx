'use strict';

import memoize from 'memoize-one';
import React from 'react';
import {
  PanResponder,
  PixelRatio,
  Platform,
  processColor,
  StyleSheet,
  View,
} from 'react-native';
import { callback } from 'react-native-nitro-modules';
import { requestPermissions } from './handlePermissions';
import type {
  SketchCanvasProps,
  CanvasText,
  PathData,
  Path,
  SaveResult,
  SaveOptions,
  Base64Options,
} from './types';
import {
  SketchCanvasHost,
  getSketchCanvasConstants,
  type SketchCanvasViewRef,
} from './SketchCanvasNative';

type CanvasState = {
  text: any;
};

class SketchCanvas extends React.Component<SketchCanvasProps, CanvasState> {
  _view: SketchCanvasViewRef | null = null;

  _hybridRef = callback((ref: SketchCanvasViewRef) => {
    this._view = ref;
    if (this._initialized) {
      this._pathsToProcess.forEach((p) => this.addPath(p));
    }
  });

  _initialPathsPending = false;

  _onCanvasReady = callback(() => {
    this.props.onCanvasReady?.();

    if (!this._initialized) {
      this._initialPathsPending = true;
    } else if (this.props.initialPaths && this.props.initialPaths.length > 0) {
      this.setInitialPaths(this.props.initialPaths);
    }
  });

  _onPathsChange = callback((count: number) =>
    this.props.onPathsChange?.(count)
  );

  _onInitialPathsLoaded = callback((count: number) =>
    this.props.onInitialPathsLoaded?.({ loadedCount: count } as any)
  );

  static defaultProps = {
    style: null,
    strokeColor: '#000000',
    strokeWidth: 3,
    onPathsChange: () => {},
    onStrokeStart: (_x: number, _y: number) => {},
    onStrokeChanged: () => {},
    onStrokeEnd: () => {},
    onSketchSaved: () => {},
    onGenerateBase64: () => {},
    user: null,

    touchEnabled: true,

    text: null,
    localSourceImage: null,

    permissionDialogTitle: '',
    permissionDialogMessage: '',
  };

  _pathsToProcess: Path[];
  _paths: Path[];
  _path: PathData | null;
  _handle: any;
  _screenScale: number;
  _offset: { x: number; y: number };
  _size: { width: number; height: number };
  _initialized: boolean;
  panResponder: any;

  state = {
    text: null,
  };
  static MAIN_BUNDLE: any;
  static DOCUMENT: any;
  static LIBRARY: any;
  static CACHES: any;

  constructor(props: SketchCanvasProps) {
    super(props);
    this._pathsToProcess = [];
    this._paths = [];
    this._path = null;
    this._handle = null;
    this._screenScale = Platform.OS === 'ios' ? 1 : PixelRatio.get();
    this._offset = { x: 0, y: 0 };
    this._size = { width: 0, height: 0 };
    this._initialized = false;

    this.panResponder = PanResponder.create({
      // Ask to be the responder:
      onStartShouldSetPanResponder: (_evt, _gestureState) => true,
      onStartShouldSetPanResponderCapture: (_evt, _gestureState) => true,
      onMoveShouldSetPanResponder: (_evt, _gestureState) => true,
      onMoveShouldSetPanResponderCapture: (_evt, _gestureState) => true,

      onPanResponderGrant: (evt, gestureState) => {
        if (!this.props.touchEnabled) {
          return;
        }
        const e = evt.nativeEvent;
        this._offset = { x: e.pageX - e.locationX, y: e.pageY - e.locationY };
        this._path = {
          id: parseInt(String(Math.random() * 100000000), 10),
          color: this.props.strokeColor,
          width: this.props.strokeWidth,
          data: [],
        };

        if (this._view) {
          this._view.newPath(
            this._path.id,
            processColor(this._path.color) as number,
            this._path.width ? this._path.width * this._screenScale : 0
          );

          this._view.addPoint(
            parseFloat(
              (
                Number((gestureState.x0 - this._offset.x).toFixed(2)) *
                this._screenScale
              ).toString()
            ),
            parseFloat(
              (
                Number((gestureState.y0 - this._offset.y).toFixed(2)) *
                this._screenScale
              ).toString()
            )
          );
        }

        const x = parseFloat((gestureState.x0 - this._offset.x).toFixed(2)),
          y = parseFloat((gestureState.y0 - this._offset.y).toFixed(2));
        this._path.data.push(`${x},${y}`);
        this.props.onStrokeStart?.(x, y);
      },
      onPanResponderMove: (_evt, gestureState) => {
        if (!this.props.touchEnabled) {
          return;
        }
        if (this._path && this._view) {
          this._view.addPoint(
            parseFloat(
              (
                Number((gestureState.moveX - this._offset.x).toFixed(2)) *
                this._screenScale
              ).toString()
            ),
            parseFloat(
              (
                Number((gestureState.moveY - this._offset.y).toFixed(2)) *
                this._screenScale
              ).toString()
            )
          );
          const x = parseFloat(
              (gestureState.moveX - this._offset.x).toFixed(2)
            ),
            y = parseFloat((gestureState.moveY - this._offset.y).toFixed(2));
          this._path.data.push(`${x},${y}`);
          this.props.onStrokeChanged?.(x, y);
        }
      },
      onPanResponderRelease: (_evt, _gestureState) => {
        this._handleStrokeEnd();
      },

      onPanResponderTerminate: (_evt, _gestureState) => {
        this._handleStrokeEnd();
      },

      onShouldBlockNativeResponder: (_evt, _gestureState) => {
        return true;
      },
    });
  }

  _handleStrokeEnd = () => {
    if (!this.props.touchEnabled) {
      return;
    }

    if (this._path) {
      this.props.onStrokeEnd?.({
        path: this._path,
        size: this._size,
        drawer: this.props.user,
      });
      this._paths.push({
        path: this._path,
        size: this._size,
        drawer: this.props.user,
      });
    }

    if (this._view) {
      this._view.endPath();
    }
  };

  _processText(text: any) {
    text &&
      text.forEach(
        (t: { fontColor: any }) => (t.fontColor = processColor(t.fontColor))
      );
    return text;
  }

  getProcessedText = memoize((text: CanvasText[] | undefined) => {
    const textCopy = text ? text.map((t) => Object.assign({}, t)) : null;

    return this._processText(textCopy);
  });

  clear() {
    this._paths = [];
    this._path = null;

    if (this._view) {
      this._view.clear();
    }
  }

  undo() {
    let lastId = -1;
    this._paths.forEach(
      (d: any) => (lastId = d.drawer === this.props.user ? d.path.id : lastId)
    );
    if (lastId >= 0) {
      this.deletePath(lastId);
    }
    return lastId;
  }

  addPath(data: Path) {
    if (this._initialized) {
      if (
        this._paths.filter((p: Path) => p.path.id === data.path.id).length === 0
      ) {
        this._paths.push(data);
      }
      const pathData = data.path.data.map((p: any) => {
        const coor = p.split(',').map((pp: any) => parseFloat(pp).toFixed(2));
        return `${
          (coor[0] * this._screenScale * this._size.width) / data.size.width
        },${
          (coor[1] * this._screenScale * this._size.height) / data.size.height
        }`;
      });

      if (this._view) {
        this._view.addPath(
          data.path.id,
          processColor(data.path.color) as number,
          data.path.width ? data.path.width * this._screenScale : 0,
          pathData
        );
      }
    } else {
      this._pathsToProcess.filter((p: Path) => p.path.id === data.path.id)
        .length === 0 && this._pathsToProcess.push(data);
    }
  }

  setInitialPaths(initialPaths: Path[]) {
    if (
      !this._initialized ||
      !this._view ||
      !initialPaths ||
      initialPaths.length === 0
    ) {
      return;
    }

    // Convert paths to the format expected by native addInitialPaths command
    const pathsArray = initialPaths.map((data: Path) => {
      const pathData = data.path.data.map((p: any) => {
        const coor = p.split(',').map((pp: any) => parseFloat(pp).toFixed(2));
        return `${
          (coor[0] * this._screenScale * this._size.width) / data.size.width
        },${
          (coor[1] * this._screenScale * this._size.height) / data.size.height
        }`;
      });

      return {
        pathId: data.path.id,
        color: processColor(data.path.color) as number,
        width: data.path.width ? data.path.width * this._screenScale : 0,
        points: pathData,
      };
    });

    // Add valid paths to internal tracking
    initialPaths.forEach((data: Path) => {
      if (
        this._paths.filter((p: Path) => p.path.id === data.path.id).length === 0
      ) {
        this._paths.push(data);
      }
    });

    // Call native batch operation
    this._view.addInitialPaths(pathsArray);
  }

  deletePath(id: any) {
    this._paths = this._paths.filter((p) => p.path.id !== id);

    if (this._view) {
      this._view.deletePath(id);
    }
  }

  save(options: SaveOptions): Promise<SaveResult>;
  /**
   * @deprecated Pass a `SaveOptions` object instead. Will be removed in a future major version.
   */
  save(
    imageType: string,
    transparent: boolean,
    folder: string,
    filename: string,
    includeImage: boolean,
    includeText: boolean,
    cropToImageSize: boolean
  ): Promise<SaveResult>;
  save(
    options: SaveOptions | string,
    transparent?: boolean,
    folder?: string,
    filename?: string,
    includeImage?: boolean,
    includeText?: boolean,
    cropToImageSize?: boolean
  ): Promise<SaveResult> {
    if (typeof options === 'object' && options !== null) {
      return this._save(
        options.imageType ?? 'png',
        options.transparent ?? false,
        options.folder ?? '',
        options.filename,
        options.includeImage ?? true,
        options.includeText ?? true,
        options.cropToImageSize ?? false
      );
    }
    return this._save(
      options,
      transparent!,
      folder!,
      filename!,
      includeImage!,
      includeText!,
      cropToImageSize!
    );
  }

  _save(
    imageType: string,
    transparent: boolean,
    folder: string,
    filename: string,
    includeImage: boolean,
    includeText: boolean,
    cropToImageSize: boolean
  ): Promise<SaveResult> {
    const promise: Promise<SaveResult> = this._view
      ? this._view
          .save(
            imageType,
            folder,
            filename,
            transparent,
            includeImage,
            includeText,
            cropToImageSize
          )
          .then(({ success, path }) => ({ success, path: path ?? null }))
      : Promise.reject(new Error('Canvas is not ready'));

    promise
      .then(({ success, path }) =>
        this.props.onSketchSaved?.(success, path ?? '')
      )
      .catch(() => {});

    return promise;
  }

  getPaths() {
    return this._paths;
  }

  getBase64(options?: Base64Options): Promise<string>;
  /**
   * @deprecated Pass a `Base64Options` object instead. Will be removed in a future major version.
   */
  getBase64(
    imageType: string,
    transparent: boolean,
    includeImage: boolean,
    includeText: boolean,
    cropToImageSize: boolean
  ): Promise<string>;
  getBase64(
    options?: Base64Options | string,
    transparent?: boolean,
    includeImage?: boolean,
    includeText?: boolean,
    cropToImageSize?: boolean
  ): Promise<string> {
    if (
      options === undefined ||
      (typeof options === 'object' && options !== null)
    ) {
      return this._getBase64(
        options?.imageType ?? 'png',
        options?.transparent ?? false,
        options?.includeImage ?? true,
        options?.includeText ?? true,
        options?.cropToImageSize ?? false
      );
    }
    return this._getBase64(
      options,
      transparent!,
      includeImage!,
      includeText!,
      cropToImageSize!
    );
  }

  _getBase64(
    imageType: string,
    transparent: boolean,
    includeImage: boolean,
    includeText: boolean,
    cropToImageSize: boolean
  ): Promise<string> {
    const promise = this._view
      ? this._view.transferToBase64(
          imageType,
          transparent,
          includeImage,
          includeText,
          cropToImageSize
        )
      : Promise.reject(new Error('Canvas is not ready'));

    promise
      .then((base64) => this.props.onGenerateBase64?.({ base64 }))
      .catch(() => {});

    return promise;
  }

  async componentDidMount() {
    await requestPermissions(
      this.props.permissionDialogTitle || '',
      this.props.permissionDialogMessage || ''
    );
  }

  componentWillUnmount() {
    this._view = null;
  }

  _onLayout = (e: any) => {
    this._size = {
      width: e.nativeEvent.layout.width,
      height: e.nativeEvent.layout.height,
    };
    this._initialized = true;

    this._pathsToProcess.length > 0 &&
      this._pathsToProcess.forEach((p) => this.addPath(p));

    if (this._initialPathsPending) {
      this._initialPathsPending = false;
      if (this.props.initialPaths && this.props.initialPaths.length > 0) {
        this.setInitialPaths(this.props.initialPaths);
      }
    }
  };

  render() {
    return (
      <View style={this.props.style} collapsable={false}>
        <SketchCanvasHost
          style={styles.fill}
          hybridRef={this._hybridRef}
          onLayout={this._onLayout}
          {...this.panResponder.panHandlers}
          onCanvasReady={this._onCanvasReady}
          onPathsChange={this._onPathsChange}
          onInitialPathsLoaded={this._onInitialPathsLoaded}
          localSourceImage={this.props.localSourceImage ?? undefined}
          text={this.getProcessedText(this.props.text) ?? undefined}
        />
      </View>
    );
  }
}

const styles = StyleSheet.create({ fill: { flex: 1 } });

const constants = getSketchCanvasConstants();
SketchCanvas.MAIN_BUNDLE = constants.mainBundlePath;
SketchCanvas.DOCUMENT = constants.documentDirectory;
SketchCanvas.LIBRARY = constants.libraryDirectory;
SketchCanvas.CACHES = constants.cachesDirectory;

export default SketchCanvas;
