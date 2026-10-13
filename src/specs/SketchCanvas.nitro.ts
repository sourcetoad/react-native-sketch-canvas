import type {
  HybridObject,
  HybridView,
  HybridViewMethods,
  HybridViewProps,
} from 'react-native-nitro-modules';

export interface LocalSourceImage {
  filename: string;
  directory?: string;
  mode?: string;
}

export interface SketchCanvasPoint {
  x: number;
  y: number;
}

export interface SketchCanvasText {
  text: string;
  font?: string;
  fontSize?: number;
  fontColor?: number;
  overlay?: string;
  anchor?: SketchCanvasPoint;
  position: SketchCanvasPoint;
  coordinate?: string;
  alignment?: string;
  lineHeightMultiple?: number;
}

export interface SketchCanvasInitialPath {
  pathId: number;
  color: number;
  width: number;
  points: string[];
}

export interface SketchCanvasSaveResult {
  success: boolean;
  path?: string;
}

export interface SketchCanvasViewProps extends HybridViewProps {
  localSourceImage?: LocalSourceImage;
  text?: SketchCanvasText[];
  onCanvasReady?: () => void;
  onPathsChange?: (count: number) => void;
  onInitialPathsLoaded?: (count: number) => void;
}

export interface SketchCanvasViewMethods extends HybridViewMethods {
  newPath(pathId: number, color: number, width: number): void;
  addPoint(x: number, y: number): void;
  endPath(): void;
  addPath(pathId: number, color: number, width: number, points: string[]): void;
  addInitialPaths(paths: SketchCanvasInitialPath[]): void;
  deletePath(pathId: number): void;
  clear(): void;
  save(
    imageType: string,
    folder: string,
    filename: string,
    transparent: boolean,
    includeImage: boolean,
    includeText: boolean,
    cropToImageSize: boolean
  ): Promise<SketchCanvasSaveResult>;
  transferToBase64(
    imageType: string,
    transparent: boolean,
    includeImage: boolean,
    includeText: boolean,
    cropToImageSize: boolean
  ): Promise<string>;
  transferToArrayBuffer(
    imageType: string,
    transparent: boolean,
    includeImage: boolean,
    includeText: boolean,
    cropToImageSize: boolean
  ): Promise<ArrayBuffer>;
}

export type SketchCanvasView = HybridView<
  SketchCanvasViewProps,
  SketchCanvasViewMethods,
  { ios: 'swift'; android: 'kotlin' }
>;

export interface SketchCanvasConstants
  extends HybridObject<{ ios: 'swift'; android: 'kotlin' }> {
  readonly mainBundlePath: string;
  readonly documentDirectory: string;
  readonly libraryDirectory: string;
  readonly cachesDirectory: string;
}
