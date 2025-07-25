import type { JSX } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

export type ImageType = 'png' | 'jpg';

export enum OnChangeEventType {
  PathsUpdate = 'pathsUpdate',
  Save = 'save',
}

export type Size = {
  width: number;
  height: number;
};

export type PathData = {
  id: number;
  color: string | undefined;
  width: number | undefined;
  data: string[];
};

export type Path = {
  drawer?: string;
  size: Size;
  path: PathData;
};

export type CanvasText = {
  text: string;
  font?: string;
  fontSize?: number;
  fontColor?: string;
  overlay?: 'TextOnSketch' | 'SketchOnText';
  anchor?: { x: number; y: number };
  position: { x: number; y: number };
  coordinate?: 'Absolute' | 'Ratio';
  /**
   * If your text is multiline, `alignment` can align shorter lines with left/center/right.
   */
  alignment?: 'Left' | 'Center' | 'Right';
  /**
   * If your text is multiline, `lineHeightMultiple` can adjust the space between lines.
   */
  lineHeightMultiple?: number;
};

export interface SavePreference {
  folder: string;
  filename: string;
  transparent: boolean;
  imageType: ImageType;
  includeImage?: boolean;
  includeText?: boolean;
  cropToImageSize?: boolean;
}

export interface LocalSourceImage {
  filename: string;
  directory?: string;
  mode?: 'AspectFill' | 'AspectFit' | 'ScaleToFill';
}

export interface SketchCanvasProps {
  style?: StyleProp<ViewStyle>;
  strokeColor?: string;
  strokeWidth?: number;
  user?: string;

  text?: CanvasText[];
  localSourceImage?: LocalSourceImage;
  touchEnabled?: boolean;

  /**
   * Array of paths to load into the canvas when it becomes ready.
   * Uses native batch processing for optimal performance.
   */
  initialPaths?: Path[];

  /**
   * Android Only: Provide a Dialog Title for the Image Saving PermissionDialog. Defaults to empty string if not set
   */
  permissionDialogTitle?: string;

  /**
   * Android Only: Provide a Dialog Message for the Image Saving PermissionDialog. Defaults to empty string if not set
   */
  permissionDialogMessage?: string;

  onStrokeStart?: (x: number, y: number) => void;
  onStrokeChanged?: (x: number, y: number) => void;
  onStrokeEnd?: (path: Path) => void;
  onSketchSaved?: (result: boolean, path: string) => void;
  onGenerateBase64?: (result: { base64: string }) => void;
  onPathsChange?: (pathsCount: number) => void;
  onCanvasReady?: () => void;
  /**
   * Callback fired when initial paths have been loaded into the canvas.
   * @param loadedCount Number of paths successfully loaded
   */
  onInitialPathsLoaded?: (loadedCount: number) => void;

  getBase64?: (
    imageType: ImageType,
    transparent: boolean,
    includeImage: boolean,
    includeText: boolean,
    cropToImageSize: boolean
  ) => void;
}

export interface RNSketchCanvasProps {
  containerStyle?: StyleProp<ViewStyle>;
  canvasStyle?: StyleProp<ViewStyle>;
  onStrokeStart?: (x: number, y: number) => void;
  onStrokeChanged?: () => void;
  onStrokeEnd?: (path: Path) => void;
  onClosePressed?: () => void;
  onUndoPressed?: (id: number) => void;
  onClearPressed?: () => void;
  onPathsChange?: (pathsCount: number) => void;
  user?: string;

  closeComponent?: JSX.Element;
  eraseComponent?: JSX.Element;
  undoComponent?: JSX.Element;
  clearComponent?: JSX.Element;
  saveComponent?: JSX.Element;
  strokeComponent?: (color: string) => JSX.Element;
  strokeSelectedComponent?: (
    color: string,
    index: number,
    changed: boolean
  ) => JSX.Element;
  strokeWidthComponent?: (width: number) => JSX.Element;

  strokeColors?: { color: string }[];
  defaultStrokeIndex?: number;
  defaultStrokeWidth?: number;

  minStrokeWidth?: number;
  maxStrokeWidth?: number;
  strokeWidthStep?: number;

  alphlaValues: string[];

  /**
   * Array of paths to load into the canvas when it becomes ready.
   * Uses native batch processing for optimal performance.
   */
  initialPaths?: Path[];

  /**
   * @param imageType "png" or "jpg"
   * @param includeImage default true
   * @param cropToImageSize default false
   */
  savePreference?: () => {
    folder: string;
    filename: string;
    transparent: boolean;
    imageType: ImageType;
    includeImage?: boolean;
    includeText?: boolean;
    cropToImageSize?: boolean;
  };
  onSketchSaved?: (result: boolean, path: string) => void;
  onGenerateBase64?: (result: { base64: string }) => void;
  onCanvasReady?: () => void;
  /**
   * Callback fired when initial paths have been loaded into the canvas.
   * @param loadedCount Number of paths successfully loaded
   */
  onInitialPathsLoaded?: (loadedCount: number) => void;

  text?: CanvasText[];
  /**
   * {
   *    filename: string,
   *    directory: string,
   *    mode: 'AspectFill' | 'AspectFit' | 'ScaleToFill'
   * }
   */
  localSourceImage?: LocalSourceImage;

  /**
   * Android Only: Provide a Dialog Title for the Image Saving PermissionDialog. Defaults to empty string if not set
   */
  permissionDialogTitle?: string;

  /**
   * Android Only: Provide a Dialog Message for the Image Saving PermissionDialog. Defaults to empty string if not set
   */
  permissionDialogMessage?: string;
}
