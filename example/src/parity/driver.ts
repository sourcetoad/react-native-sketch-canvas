import { PixelRatio, Platform, processColor } from 'react-native';
import type { SketchCanvas } from '@sourcetoad/react-native-sketch-canvas';
import { Commands } from '../../../src/specs/SketchCanvasNativeComponent';
import type { Stroke } from './scenes';

const scale = Platform.OS === 'ios' ? 1 : PixelRatio.get();

export function drawStroke(canvas: SketchCanvas, stroke: Stroke): void {
  const view = canvas.ref.current;
  if (!view) {
    throw new Error(`Canvas is not mounted for stroke ${stroke.id}`);
  }
  Commands.newPath(
    view,
    stroke.id,
    processColor(stroke.color) as number,
    stroke.width * scale
  );
  stroke.points.forEach(([x, y]) =>
    Commands.addPoint(view, x * scale, y * scale)
  );
  Commands.endPath(view);
}
