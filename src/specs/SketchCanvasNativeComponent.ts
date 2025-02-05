import type { ViewProps, HostComponent } from 'react-native';
import codegenNativeComponent from 'react-native/Libraries/Utilities/codegenNativeComponent';
import codegenNativeCommands from 'react-native/Libraries/Utilities/codegenNativeCommands';
import type {
  DirectEventHandler,
  BubblingEventHandler,
  Int32,
  Double,
} from 'react-native/Libraries/Types/CodegenTypes';

export interface LocalSourceImage {
  filename: string;
  directory?: string;
  mode?: string;
}

type CanvasText = {
  text: string;
  font?: string;
  fontSize?: Double;
  fontColor?: Int32;
  overlay?: string;
  anchor?: { x: Double; y: Double };
  position: { x: Double; y: Double };
  coordinate?: string;
  /**
   * If your text is multiline, `alignment` can align shorter lines with left/center/right.
   */
  alignment?: string;
  /**
   * If your text is multiline, `lineHeightMultiple` can adjust the space between lines.
   */
  lineHeightMultiple?: Double;
};

type CanvasChangeEvent = {
  pathsUpdate?: Int32;
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

  onChange?: BubblingEventHandler<CanvasChangeEvent> | null;
  onGenerateBase64?: DirectEventHandler<{ base64: string }> | null;
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
    x: Double,
    y: Double
  ) => void;
  addPath: (
    viewRef: React.ElementRef<ComponentType>,
    pathId: Int32,
    color: Int32,
    width: Double,
    points: Array<string>
  ) => void;
  newPath: (
    viewRef: React.ElementRef<ComponentType>,
    pathId: Int32,
    color: Int32,
    width: Double
  ) => void;
  deletePath: (viewRef: React.ElementRef<ComponentType>, pathId: Int32) => void;
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
    'newPath',
    'deletePath',
    'endPath',
    'clear',
    'transferToBase64',
  ],
});
