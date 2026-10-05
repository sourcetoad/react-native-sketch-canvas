import React, { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SketchCanvas } from '@sourcetoad/react-native-sketch-canvas';
import { drawStroke } from './driver';
import {
  CANVAS_SIZE,
  DEFAULT_EXPORT,
  SCENES,
  exportOptionsOf,
  toPath,
  type ExportOptions,
  type Scene,
} from './scenes';

type ParityGlobals = {
  __parity?: Record<string, string>;
  __parityErrors?: Record<string, string>;
  __parityDone?: boolean;
  __paritySceneIds?: string[];
};

const parityGlobals = globalThis as typeof globalThis & ParityGlobals;

const SCENE_TIMEOUT_MS = 10000;
const IMAGE_POLL_MS = 100;
const WHALE = 'whale.png';

type Deferred<T> = { promise: Promise<T>; resolve: (value: T) => void };

function deferred<T>(): Deferred<T> {
  let resolve: (value: T) => void = () => {};
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

const makeSignals = () => ({
  ready: deferred<void>(),
  initialPathsLoaded: deferred<void>(),
});

const nextFrame = () =>
  new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

function withTimeout<T>(promise: Promise<T>, what: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`timed out waiting for ${what}`)),
      SCENE_TIMEOUT_MS
    );
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

function resetGlobals() {
  parityGlobals.__parity = {};
  parityGlobals.__parityErrors = {};
  parityGlobals.__parityDone = false;
  parityGlobals.__paritySceneIds = SCENES.map((scene) => scene.id);
}

type Props = { onClose: () => void };

export default function ParityScreen({ onClose }: Props) {
  const [index, setIndex] = useState(0);
  const [runId, setRunId] = useState(0);
  const canvasRef = useRef<SketchCanvas | null>(null);
  const signals = useRef(makeSignals());
  const pendingBase64 = useRef<((base64: string) => void) | null>(null);
  const scene: Scene | undefined = SCENES[index];

  const canvasProps = useMemo(
    () =>
      scene && {
        text: scene.text,
        initialPaths: scene.initialPaths?.map(toPath),
        localSourceImage: scene.imageMode && {
          filename: WHALE,
          directory: SketchCanvas.MAIN_BUNDLE,
          mode: scene.imageMode,
        },
      },
    [scene]
  );

  useEffect(() => {
    if (index === 0) {
      resetGlobals();
    }
    if (!scene) {
      parityGlobals.__parityDone = true;
      return;
    }

    let cancelled = false;
    const sceneSignals = signals.current;

    const canvas = () => {
      if (!canvasRef.current) {
        throw new Error('canvas is not mounted');
      }
      return canvasRef.current;
    };

    const capture = (options: ExportOptions) => {
      const result = deferred<string>();
      pendingBase64.current = result.resolve;
      canvas().getBase64(
        options.imageType,
        options.transparent,
        options.includeImage,
        options.includeText,
        options.cropToImageSize
      );
      return withTimeout(result.promise, 'onGenerateBase64');
    };

    const waitForLayout = async () => {
      const deadline = Date.now() + SCENE_TIMEOUT_MS;
      while (!canvas()._initialized) {
        if (Date.now() > deadline) {
          throw new Error('timed out waiting for layout');
        }
        await nextFrame();
      }
    };

    const waitForImage = async () => {
      const reference = await capture({
        ...DEFAULT_EXPORT,
        includeImage: false,
      });
      const deadline = Date.now() + SCENE_TIMEOUT_MS;
      let previous = await capture(DEFAULT_EXPORT);
      for (;;) {
        await sleep(IMAGE_POLL_MS);
        const current = await capture(DEFAULT_EXPORT);
        if (current === previous && current !== reference) {
          return;
        }
        if (Date.now() > deadline) {
          throw new Error('timed out waiting for the image to load');
        }
        previous = current;
      }
    };

    const run = async () => {
      if (scene.trigger === 'initialPaths') {
        await withTimeout(
          sceneSignals.initialPathsLoaded.promise,
          'onInitialPathsLoaded'
        );
      } else {
        await withTimeout(sceneSignals.ready.promise, 'onCanvasReady');
        await waitForLayout();
        scene.strokes?.forEach((stroke) => drawStroke(canvas(), stroke));
        scene.addPaths?.forEach((stroke) => canvas().addPath(toPath(stroke)));
      }
      await nextFrame();
      if (scene.trigger === 'image') {
        await waitForImage();
      }
      return capture(exportOptionsOf(scene));
    };

    run()
      .then(
        (base64) => {
          parityGlobals.__parity![scene.id] = base64;
        },
        (error: Error) => {
          parityGlobals.__parityErrors![scene.id] = error.message;
          console.warn(`parity scene ${scene.id} failed: ${error.message}`);
        }
      )
      .then(() => {
        if (!cancelled) {
          signals.current = makeSignals();
          setIndex((i) => i + 1);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [index, runId, scene]);

  const runAgain = () => {
    signals.current = makeSignals();
    setIndex(0);
    setRunId((id) => id + 1);
  };

  const errors = Object.keys(parityGlobals.__parityErrors ?? {});

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose}>
          <Text style={styles.button}>Close</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={runAgain}>
          <Text style={styles.button}>Run again</Text>
        </TouchableOpacity>
        <Text>
          {scene
            ? `${index + 1}/${SCENES.length} ${scene.id}`
            : `done${errors.length ? ` (errors: ${errors.join(', ')})` : ''}`}
        </Text>
      </View>
      {scene && canvasProps && (
        <View style={styles.canvasFrame}>
          <SketchCanvas
            key={`${runId}-${scene.id}`}
            ref={canvasRef}
            style={styles.canvas}
            text={canvasProps.text}
            initialPaths={canvasProps.initialPaths}
            localSourceImage={canvasProps.localSourceImage}
            onCanvasReady={() => signals.current.ready.resolve()}
            onInitialPathsLoaded={() =>
              signals.current.initialPathsLoaded.resolve()
            }
            onGenerateBase64={({ base64 }) => pendingBase64.current?.(base64)}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignSelf: 'stretch',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    height: 48,
    paddingHorizontal: 16,
  },
  button: {
    fontSize: 18,
    color: '#39579A',
  },
  canvasFrame: {
    position: 'absolute',
    left: 20,
    top: 60,
    width: CANVAS_SIZE,
    height: CANVAS_SIZE,
    backgroundColor: 'white',
  },
  canvas: {
    width: CANVAS_SIZE,
    height: CANVAS_SIZE,
  },
});
