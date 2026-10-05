import { PixelRatio, Platform, processColor } from 'react-native';
import type { SketchCanvas } from '@sourcetoad/react-native-sketch-canvas';
import type { Stroke } from './scenes';

const scale = Platform.OS === 'ios' ? 1 : PixelRatio.get();

export function drawStroke(canvas: SketchCanvas, stroke: Stroke): void {
  const view = (canvas as any)._view;
  if (!view) {
    throw new Error(`Canvas is not mounted for stroke ${stroke.id}`);
  }
  view.newPath(
    stroke.id,
    processColor(stroke.color) as number,
    stroke.width * scale
  );
  stroke.points.forEach(([x, y]) => view.addPoint(x * scale, y * scale));
  view.endPath();
}
