import { PanResponder, processColor } from 'react-native';
import React from 'react';
import SketchCanvas from '../SketchCanvas';

import { act, render, screen } from '@testing-library/react-native';

const nitroMock = jest.requireMock('react-native-nitro-modules');

const getHost = () => screen.getByTestId('sketch-canvas-host');

const getMethods = (canvas: SketchCanvas) => (canvas as any)._view;

const layout = (width = 300, height = 300) =>
  act(() => {
    getHost().props.onLayout({ nativeEvent: { layout: { width, height } } });
  });

const flush = () => new Promise((resolve) => setImmediate(resolve));

const renderCanvas = (
  props: React.ComponentProps<typeof SketchCanvas> = {}
) => {
  const ref = React.createRef<SketchCanvas>();
  const result = render(<SketchCanvas ref={ref} {...props} />);
  return { ...result, canvas: ref.current! };
};

afterEach(() => {
  nitroMock.mockOptions.deliverHybridRef = true;
  jest.restoreAllMocks();
});

test('renders correctly', async () => {
  render(<SketchCanvas ref={React.createRef()} />);
});

describe('pan input', () => {
  const grantEvt = {
    nativeEvent: { pageX: 110, pageY: 220, locationX: 10, locationY: 20 },
  };

  const renderWithPan = (
    props: React.ComponentProps<typeof SketchCanvas> = {}
  ) => {
    const create = jest.spyOn(PanResponder, 'create');
    const result = renderCanvas({
      strokeColor: '#FF0000',
      strokeWidth: 5,
      ...props,
    });
    const config = create.mock.calls[0]![0];
    return { ...result, config };
  };

  test('grant, move and release drive the native path', () => {
    const { canvas, config } = renderWithPan();
    const methods = getMethods(canvas);

    config.onPanResponderGrant!(grantEvt as any, { x0: 130, y0: 250 } as any);
    expect(methods.newPath).toHaveBeenCalledWith(
      expect.any(Number),
      processColor('#FF0000'),
      5
    );
    expect(methods.addPoint).toHaveBeenLastCalledWith(30, 50);

    config.onPanResponderMove!({} as any, { moveX: 140, moveY: 260 } as any);
    expect(methods.addPoint).toHaveBeenLastCalledWith(40, 60);

    config.onPanResponderRelease!({} as any, {} as any);
    expect(methods.endPath).toHaveBeenCalledTimes(1);
  });

  test('an invalid strokeColor starts the path with colour 0', () => {
    const { canvas, config } = renderWithPan({ strokeColor: 'not-a-colour' });
    const methods = getMethods(canvas);

    config.onPanResponderGrant!(grantEvt as any, { x0: 130, y0: 250 } as any);

    expect(methods.newPath).toHaveBeenCalledWith(expect.any(Number), 0, 5);
    expect(methods.addPoint).toHaveBeenLastCalledWith(30, 50);
  });

  test('touchEnabled={false} sends nothing', () => {
    const { canvas, config } = renderWithPan({ touchEnabled: false });
    const methods = getMethods(canvas);

    config.onPanResponderGrant!(grantEvt as any, { x0: 130, y0: 250 } as any);
    config.onPanResponderMove!({} as any, { moveX: 140, moveY: 260 } as any);
    config.onPanResponderRelease!({} as any, {} as any);

    expect(methods.newPath).not.toHaveBeenCalled();
    expect(methods.addPoint).not.toHaveBeenCalled();
    expect(methods.endPath).not.toHaveBeenCalled();
  });
});

describe('save', () => {
  test('file maps the options to the native argument order', async () => {
    const onSketchSaved = jest.fn();
    const { canvas } = renderCanvas({ onSketchSaved });

    const result = await canvas.save({
      type: 'file',
      filename: 'name',
      folder: 'folder',
      imageType: 'jpg',
      transparent: true,
      includeImage: false,
      includeText: false,
      cropToImageSize: true,
    });

    expect(getMethods(canvas).save).toHaveBeenCalledWith(
      'jpg',
      'folder',
      'name',
      true,
      false,
      false,
      true
    );
    expect(result).toEqual({ success: true, type: 'file', data: '/tmp/x.png' });
    await flush();
    expect(onSketchSaved).toHaveBeenCalledTimes(1);
    expect(onSketchSaved).toHaveBeenCalledWith(true, {
      type: 'file',
      data: '/tmp/x.png',
    });
  });

  test('file is the default type and the defaults are applied', async () => {
    const { canvas } = renderCanvas();

    const result = await canvas.save({
      filename: 'name',
      transparent: undefined,
    });

    expect(getMethods(canvas).save).toHaveBeenCalledWith(
      'png',
      '',
      'name',
      false,
      true,
      true,
      false
    );
    expect(result.type).toBe('file');
  });

  test('a failed file save resolves null data', async () => {
    const onSketchSaved = jest.fn();
    const { canvas } = renderCanvas({ onSketchSaved });
    getMethods(canvas).save.mockResolvedValueOnce({ success: false });

    const result = await canvas.save({ filename: 'name' });

    expect(result).toEqual({ success: false, type: 'file', data: null });
    await flush();
    expect(onSketchSaved).toHaveBeenCalledWith(false, {
      type: 'file',
      data: null,
    });
  });

  test('base64 maps the options to transferToBase64', async () => {
    const onSketchSaved = jest.fn();
    const { canvas } = renderCanvas({ onSketchSaved });

    const result = await canvas.save({
      type: 'base64',
      imageType: 'jpg',
      transparent: true,
      includeImage: false,
      includeText: false,
      cropToImageSize: true,
    });

    expect(getMethods(canvas).transferToBase64).toHaveBeenCalledWith(
      'jpg',
      true,
      false,
      false,
      true
    );
    expect(getMethods(canvas).save).not.toHaveBeenCalled();
    expect(result).toEqual({ success: true, type: 'base64', data: 'BASE64' });
    await flush();
    expect(onSketchSaved).toHaveBeenCalledTimes(1);
    expect(onSketchSaved).toHaveBeenCalledWith(true, {
      type: 'base64',
      data: 'BASE64',
    });
  });

  test('base64 applies the defaults', async () => {
    const { canvas } = renderCanvas();

    await canvas.save({ type: 'base64' });

    expect(getMethods(canvas).transferToBase64).toHaveBeenCalledWith(
      'png',
      false,
      true,
      true,
      false
    );
  });

  test('arraybuffer maps the options to transferToArrayBuffer', async () => {
    const onSketchSaved = jest.fn();
    const { canvas } = renderCanvas({ onSketchSaved });

    const result = await canvas.save({
      type: 'arraybuffer',
      imageType: 'jpg',
      transparent: true,
      includeImage: false,
      includeText: true,
      cropToImageSize: true,
    });

    expect(getMethods(canvas).transferToArrayBuffer).toHaveBeenCalledWith(
      'jpg',
      true,
      false,
      true,
      true
    );
    expect(result.success).toBe(true);
    expect(result.type).toBe('arraybuffer');
    expect(result.data).toBeInstanceOf(ArrayBuffer);
    expect(result.data!.byteLength).toBe(4);
    await flush();
    expect(onSketchSaved).toHaveBeenCalledTimes(1);
    expect(onSketchSaved).toHaveBeenCalledWith(true, {
      type: 'arraybuffer',
      data: result.data,
    });
  });

  test('arraybuffer applies the defaults', async () => {
    const { canvas } = renderCanvas();

    await canvas.save({ type: 'arraybuffer' });

    expect(getMethods(canvas).transferToArrayBuffer).toHaveBeenCalledWith(
      'png',
      false,
      true,
      true,
      false
    );
  });

  test('the positional form saves a file', async () => {
    const onSketchSaved = jest.fn();
    const { canvas } = renderCanvas({ onSketchSaved });

    const result = await canvas.save(
      'png',
      true,
      'folder',
      'name',
      true,
      false,
      true
    );

    expect(getMethods(canvas).save).toHaveBeenCalledWith(
      'png',
      'folder',
      'name',
      true,
      true,
      false,
      true
    );
    expect(result).toEqual({ success: true, type: 'file', data: '/tmp/x.png' });
    await flush();
    expect(onSketchSaved).toHaveBeenCalledWith(true, {
      type: 'file',
      data: '/tmp/x.png',
    });
  });

  test('both forms make the same native call', async () => {
    const { canvas } = renderCanvas();

    await canvas.save('jpg', true, 'folder', 'name', false, true, true);
    await canvas.save({
      imageType: 'jpg',
      transparent: true,
      folder: 'folder',
      filename: 'name',
      includeImage: false,
      includeText: true,
      cropToImageSize: true,
    });

    const calls = getMethods(canvas).save.mock.calls;
    expect(calls).toHaveLength(2);
    expect(calls[1]).toEqual(calls[0]);
  });

  test.each([
    { type: 'file' as const, filename: 'name' },
    { type: 'base64' as const },
    { type: 'arraybuffer' as const },
  ])('$type rejects after unmount without a callback', async (options) => {
    const onSketchSaved = jest.fn();
    const { canvas, unmount } = renderCanvas({ onSketchSaved });
    unmount();

    await expect(canvas.save(options)).rejects.toThrow('Canvas is not ready');
    await flush();
    expect(onSketchSaved).not.toHaveBeenCalled();
  });

  test('rejects before the hybrid ref arrives', async () => {
    nitroMock.mockOptions.deliverHybridRef = false;
    const onSketchSaved = jest.fn();
    const { canvas } = renderCanvas({ onSketchSaved });

    await expect(canvas.save({ type: 'base64' })).rejects.toThrow(
      'Canvas is not ready'
    );
    await flush();
    expect(onSketchSaved).not.toHaveBeenCalled();
  });

  test('a native rejection rejects without a callback', async () => {
    const onSketchSaved = jest.fn();
    const { canvas } = renderCanvas({ onSketchSaved });
    getMethods(canvas).transferToArrayBuffer.mockRejectedValueOnce(
      new Error('CanvasNotReadyError')
    );

    await expect(canvas.save({ type: 'arraybuffer' })).rejects.toThrow(
      'CanvasNotReadyError'
    );
    await flush();
    expect(onSketchSaved).not.toHaveBeenCalled();
  });

  test.each([
    { method: 'save', options: { type: 'file' as const } },
    { method: 'transferToBase64', options: { type: 'base64' as const } },
    {
      method: 'transferToArrayBuffer',
      options: { type: 'arraybuffer' as const },
    },
  ])(
    'a synchronous $method throw rejects without a callback',
    async ({ method, options }) => {
      const onSketchSaved = jest.fn();
      const { canvas } = renderCanvas({ onSketchSaved });
      getMethods(canvas)[method].mockImplementationOnce(() => {
        throw new Error('expected a String');
      });

      let promise: Promise<unknown> | undefined;
      expect(() => {
        promise = canvas.save(options as any);
      }).not.toThrow();
      await expect(promise).rejects.toThrow('expected a String');
      await flush();
      expect(onSketchSaved).not.toHaveBeenCalled();
    }
  );

  test('an onSketchSaved error is not swallowed', () => {
    const onSketchSaved = jest.fn(() => {
      throw new Error('handler');
    });
    const { canvas } = renderCanvas({ onSketchSaved });
    const mapped: any = {};
    mapped.then = jest.fn(() => mapped);
    mapped.catch = jest.fn(() => mapped);
    getMethods(canvas).save.mockReturnValueOnce({
      then: jest.fn(() => mapped),
    });

    canvas.save({ type: 'file', filename: 'name' });

    expect(mapped.catch).not.toHaveBeenCalled();
    expect(mapped.then).toHaveBeenCalledTimes(1);
    const [onFulfilled, onRejected] = mapped.then.mock.calls[0];
    expect(onRejected).toEqual(expect.any(Function));
    expect(() => onRejected(new Error('native'))).not.toThrow();
    expect(() =>
      onFulfilled({ success: true, type: 'file', data: '/tmp/x.png' })
    ).toThrow('handler');
    expect(onSketchSaved).toHaveBeenCalledWith(true, {
      type: 'file',
      data: '/tmp/x.png',
    });
  });

  test('an ignored rejection is not unhandled', async () => {
    nitroMock.mockOptions.deliverHybridRef = false;
    const unhandled = jest.fn();
    process.on('unhandledRejection', unhandled);
    try {
      const { canvas } = renderCanvas();
      const promise = canvas.save({ type: 'arraybuffer' });
      await flush();
      await flush();
      expect(unhandled).not.toHaveBeenCalled();
      await expect(promise).rejects.toThrow('Canvas is not ready');
    } finally {
      process.off('unhandledRejection', unhandled);
    }
  });

  test('getBase64 is gone', () => {
    const { canvas } = renderCanvas();

    expect((canvas as any).getBase64).toBeUndefined();
  });
});

test('onPathsChange is forwarded', () => {
  const onPathsChange = jest.fn();
  renderCanvas({ onPathsChange });

  getHost().props.onPathsChange.f(3);

  expect(onPathsChange).toHaveBeenCalledWith(3);
});

test('onInitialPathsLoaded receives { loadedCount }', () => {
  const onInitialPathsLoaded = jest.fn();
  renderCanvas({ onInitialPathsLoaded });

  getHost().props.onInitialPathsLoaded.f(2);

  expect(onInitialPathsLoaded).toHaveBeenCalledWith({ loadedCount: 2 });
});

test('initial paths load on canvas ready', () => {
  const onCanvasReady = jest.fn();
  const initialPaths = [
    {
      size: { width: 150, height: 150 },
      path: { id: 7, color: '#00FF00', width: 4, data: ['10,20', '30,40'] },
    },
  ];
  const { canvas } = renderCanvas({ initialPaths, onCanvasReady });

  layout(300, 300);
  getHost().props.onCanvasReady.f();

  expect(onCanvasReady).toHaveBeenCalledTimes(1);
  expect(getMethods(canvas).addInitialPaths).toHaveBeenCalledWith([
    {
      pathId: 7,
      color: processColor('#00FF00'),
      width: 4,
      points: ['20,40', '60,80'],
    },
  ]);
});

test('initial paths load once after layout when the canvas is ready first', () => {
  const onCanvasReady = jest.fn();
  const initialPaths = [
    {
      size: { width: 150, height: 150 },
      path: { id: 7, color: '#00FF00', width: 4, data: ['10,20', '30,40'] },
    },
  ];
  const { canvas } = renderCanvas({ initialPaths, onCanvasReady });
  const methods = getMethods(canvas);

  act(() => {
    getHost().props.onCanvasReady.f();
  });

  expect(onCanvasReady).toHaveBeenCalledTimes(1);
  expect(methods.addInitialPaths).not.toHaveBeenCalled();

  layout(300, 300);

  expect(methods.addInitialPaths).toHaveBeenCalledTimes(1);
  expect(methods.addInitialPaths).toHaveBeenCalledWith([
    {
      pathId: 7,
      color: processColor('#00FF00'),
      width: 4,
      points: ['20,40', '60,80'],
    },
  ]);

  layout(300, 300);

  expect(methods.addInitialPaths).toHaveBeenCalledTimes(1);
});

test('initial paths load once when layout comes before ready', () => {
  const initialPaths = [
    {
      size: { width: 150, height: 150 },
      path: { id: 7, color: '#00FF00', width: 4, data: ['10,20', '30,40'] },
    },
  ];
  const { canvas } = renderCanvas({ initialPaths });
  const methods = getMethods(canvas);

  layout(300, 300);
  act(() => {
    getHost().props.onCanvasReady.f();
  });
  layout(300, 300);

  expect(methods.addInitialPaths).toHaveBeenCalledTimes(1);
});

test('the wrapper view gets the style and the host gets the handlers', () => {
  const style = { width: 300, height: 200 };
  renderCanvas({ style });

  const host = getHost();
  const wrapper = screen.toJSON() as any;

  expect(wrapper.type).toBe('View');
  expect(wrapper.props.style).toEqual(style);
  expect(wrapper.props.collapsable).toBe(false);
  expect(wrapper.children).toHaveLength(1);
  expect(wrapper.children[0].props.testID).toBe('sketch-canvas-host');
  expect(host.props.style).toEqual({ flex: 1 });
  expect(typeof host.props.onLayout).toBe('function');
  expect(typeof host.props.onResponderGrant).toBe('function');
  expect(typeof host.props.onResponderMove).toBe('function');
  expect(typeof host.props.onResponderRelease).toBe('function');
});

test('constants come from the nitro hybrid object', () => {
  expect(SketchCanvas.MAIN_BUNDLE).toBe('test');
  expect(SketchCanvas.DOCUMENT).toBe('test');
  expect(SketchCanvas.LIBRARY).toBe('test');
  expect(SketchCanvas.CACHES).toBe('test');
});

test('callbacks stay stable across re-renders', () => {
  const ref = React.createRef<SketchCanvas>();
  const { rerender } = render(<SketchCanvas ref={ref} strokeWidth={3} />);
  const before = getHost().props;

  rerender(
    <SketchCanvas ref={ref} strokeWidth={9} onPathsChange={jest.fn()} />
  );
  const after = getHost().props;

  expect(after.hybridRef).toBe(before.hybridRef);
  expect(after.onCanvasReady).toBe(before.onCanvasReady);
  expect(after.onPathsChange).toBe(before.onPathsChange);
  expect(after.onInitialPathsLoaded).toBe(before.onInitialPathsLoaded);
});

test('paths queued before layout reach native when the ref arrives late', () => {
  nitroMock.mockOptions.deliverHybridRef = false;
  const { canvas } = renderCanvas();
  const methods = {
    addPath: jest.fn(),
  };

  canvas.addPath({
    size: { width: 300, height: 300 },
    path: { id: 11, color: '#0000FF', width: 6, data: ['1,2', '3,4'] },
  });
  layout(300, 300);
  expect(methods.addPath).not.toHaveBeenCalled();

  act(() => {
    getHost().props.hybridRef.f(methods);
  });

  expect(methods.addPath).toHaveBeenCalledWith(11, processColor('#0000FF'), 6, [
    '1,2',
    '3,4',
  ]);
});

test('the host receives processed text and the same localSourceImage', () => {
  const localSourceImage = {
    filename: 'whale.png',
    directory: SketchCanvas.MAIN_BUNDLE,
    mode: 'AspectFit' as const,
  };
  const minimal = { text: 'Hi', position: { x: 10, y: 20 }, fontSize: 12 };
  const full = {
    text: 'Full',
    font: 'Arial',
    fontSize: 20,
    fontColor: '#FF0000',
    overlay: 'SketchOnText' as const,
    anchor: { x: 0.5, y: 0.5 },
    position: { x: 0.5, y: 0.25 },
    coordinate: 'Ratio' as const,
    alignment: 'Center' as const,
    lineHeightMultiple: 1.5,
  };
  renderCanvas({ localSourceImage, text: [minimal, full] });

  const host = getHost();
  const [sentMinimal, sentFull] = host.props.text;

  expect(host.props.localSourceImage).toBe(localSourceImage);
  expect(sentMinimal).toEqual(minimal);
  expect(sentMinimal.fontColor).toBeUndefined();
  for (const key of [
    'font',
    'overlay',
    'anchor',
    'coordinate',
    'alignment',
    'lineHeightMultiple',
  ]) {
    expect(sentMinimal).not.toHaveProperty(key);
  }
  expect(sentFull).toEqual({ ...full, fontColor: processColor('#FF0000') });
});

test('initial paths without a colour load with colour 0', () => {
  const initialPaths = [
    {
      size: { width: 150, height: 150 },
      path: { id: 7, color: undefined, width: 4, data: ['10,20'] },
    },
    {
      size: { width: 150, height: 150 },
      path: { id: 8, color: '#00FF00', width: 4, data: ['30,40'] },
    },
  ];
  const { canvas } = renderCanvas({ initialPaths });

  layout(300, 300);
  getHost().props.onCanvasReady.f();

  expect(getMethods(canvas).addInitialPaths).toHaveBeenCalledWith([
    { pathId: 7, color: 0, width: 4, points: ['20,40'] },
    {
      pathId: 8,
      color: processColor('#00FF00'),
      width: 4,
      points: ['60,80'],
    },
  ]);
});

test('a path without a colour is added with colour 0', () => {
  const { canvas } = renderCanvas();
  layout(300, 300);

  canvas.addPath({
    size: { width: 300, height: 300 },
    path: { id: 12, color: undefined, width: 6, data: ['1,2'] },
  });

  expect(getMethods(canvas).addPath).toHaveBeenCalledWith(12, 0, 6, ['1,2']);
});
