import type { ViewProps, HostComponent } from 'react-native';
import { codegenNativeComponent, codegenNativeCommands } from 'react-native';
import type { CodegenTypes } from 'react-native';

export interface LocalSourceImage {
  filename: string;
  directory?: string;
  mode?: string;
}

type CanvasText = {
  text: string;
  font?: string;
  fontSize?: CodegenTypes.Double;
  fontColor?: CodegenTypes.Int32;
  overlay?: string;
  anchor?: { x: CodegenTypes.Double; y: CodegenTypes.Double };
  position: { x: CodegenTypes.Double; y: CodegenTypes.Double };
  coordinate?: string;
  /**
   * If your text is multiline, `alignment` can align shorter lines with left/center/right.
   */
  alignment?: string;
  /**
   * If your text is multiline, `lineHeightMultiple` can adjust the space between lines.
   */
  lineHeightMultiple?: CodegenTypes.Double;
};

type InitialPathData = {
  pathId: CodegenTypes.Int32;
  color: CodegenTypes.Int32;
  width: CodegenTypes.Double;
  points: Array<string>;
};

type CanvasChangeEvent = {
  eventType: string;
  pathsUpdate?: CodegenTypes.Int32;
  success?: boolean;
  path?: string;
};

type ComponentType = HostComponent<NativeProps>;

export interface NativeProps extends ViewProps {
  /**
   * Local source image to load into the canvas
   */
  localSourceImage?: LocalSourceImage;

  /**
   * Text to be drawn on the canvas
   */
  text?: CanvasText[];

  /**
   * Callback when the canvas has finished loading and is ready for interaction.
   */
  onCanvasReady?: CodegenTypes.DirectEventHandler<null>;

  onChange?: CodegenTypes.BubblingEventHandler<CanvasChangeEvent> | null;
  onGenerateBase64?: CodegenTypes.DirectEventHandler<{ base64: string }> | null;
  onInitialPathsLoaded?: CodegenTypes.DirectEventHandler<{
    loadedCount: CodegenTypes.Int32;
  }> | null;
}

export interface NativeCommands {
  save: (
    viewRef: React.ElementRef<ComponentType>,
    imageType: string,
    folder: string,
    filename: string,
    transparent: boolean,
    includeImage: boolean,
    includeText: boolean,
    cropToImageSize: boolean
  ) => void;
  addPoint: (
    viewRef: React.ElementRef<ComponentType>,
    x: CodegenTypes.Double,
    y: CodegenTypes.Double
  ) => void;
  addPath: (
    viewRef: React.ElementRef<ComponentType>,
    pathId: CodegenTypes.Int32,
    color: CodegenTypes.Int32,
    width: CodegenTypes.Double,
    points: Array<string>
  ) => void;
  addInitialPaths: (
    viewRef: React.ElementRef<ComponentType>,
    pathsArray: Array<InitialPathData>
  ) => void;
  newPath: (
    viewRef: React.ElementRef<ComponentType>,
    pathId: CodegenTypes.Int32,
    color: CodegenTypes.Int32,
    width: CodegenTypes.Double
  ) => void;
  deletePath: (
    viewRef: React.ElementRef<ComponentType>,
    pathId: CodegenTypes.Int32
  ) => void;
  endPath: (viewRef: React.ElementRef<ComponentType>) => void;
  clear: (viewRef: React.ElementRef<ComponentType>) => void;
  transferToBase64: (
    viewRef: React.ElementRef<ComponentType>,
    imageType: string,
    transparent: boolean,
    includeImage: boolean,
    includeText: boolean,
    cropToImageSize: boolean
  ) => void;
}

export default codegenNativeComponent<NativeProps>(
  'RNTSketchCanvas'
) as HostComponent<NativeProps>;

export const Commands: NativeCommands = codegenNativeCommands<NativeCommands>({
  supportedCommands: [
    'save',
    'addPoint',
    'addPath',
    'addInitialPaths',
    'newPath',
    'deletePath',
    'endPath',
    'clear',
    'transferToBase64',
  ],
});
