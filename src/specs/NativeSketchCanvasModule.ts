import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export interface Spec extends TurboModule {
  getConstants: () => {
    MainBundlePath: string;
    NSDocumentDirectory: string;
    NSLibraryDirectory: string;
    NSCachesDirectory: string;
  };
}

export default TurboModuleRegistry.getEnforcing<Spec>('SketchCanvasModule');
