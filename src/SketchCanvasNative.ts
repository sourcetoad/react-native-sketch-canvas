import {
  getHostComponent,
  NitroModules,
  type HybridRef,
} from 'react-native-nitro-modules';
import type {
  SketchCanvasConstants,
  SketchCanvasViewMethods,
  SketchCanvasViewProps,
} from './specs/SketchCanvas.nitro';

export const SketchCanvasHost = getHostComponent<
  SketchCanvasViewProps,
  SketchCanvasViewMethods
>('SketchCanvasView', () =>
  require('../nitrogen/generated/shared/json/SketchCanvasViewConfig.json')
);

export type SketchCanvasViewRef = HybridRef<
  SketchCanvasViewProps,
  SketchCanvasViewMethods
>;

export const getSketchCanvasConstants = () =>
  NitroModules.createHybridObject<SketchCanvasConstants>(
    'SketchCanvasConstants'
  );
