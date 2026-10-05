import 'react-native';
import React from 'react';
import RNSketchCanvas, { SketchCanvas } from '../index';

import { render, screen } from '@testing-library/react-native';

const flush = () => new Promise((resolve) => setImmediate(resolve));

const renderCanvas = (
  props: Partial<React.ComponentProps<typeof RNSketchCanvas>> = {}
) => {
  const ref = React.createRef<RNSketchCanvas>();
  render(<RNSketchCanvas ref={ref} {...(props as any)} />);
  return ref.current!;
};

test('renders correctly', async () => {
  render(<RNSketchCanvas />);
});

test('save returns a promise of the save result', async () => {
  const onSketchSaved = jest.fn();
  const canvas = renderCanvas({ onSketchSaved });

  const promise = canvas.save();

  expect(promise).toBeInstanceOf(Promise);
  await expect(promise).resolves.toEqual({
    success: true,
    type: 'file',
    data: '/tmp/x.png',
  });
  await flush();
  expect(onSketchSaved).toHaveBeenCalledTimes(1);
  expect(onSketchSaved).toHaveBeenCalledWith(true, {
    type: 'file',
    data: '/tmp/x.png',
  });
  expect(screen.getByTestId('sketch-canvas-host')).toBeTruthy();
});

const getMethods = (canvas: RNSketchCanvas) =>
  (canvas as any)._sketchCanvas._view;

test('getBase64 is gone', () => {
  const canvas = renderCanvas();

  expect((canvas as any).getBase64).toBeUndefined();
});

test('save honours savePreference().type for base64', async () => {
  const onSketchSaved = jest.fn();
  const canvas = renderCanvas({
    onSketchSaved,
    savePreference: () => ({
      type: 'base64',
      folder: '',
      filename: '',
      transparent: true,
      imageType: 'jpg',
    }),
  });

  await expect(canvas.save()).resolves.toEqual({
    success: true,
    type: 'base64',
    data: 'BASE64',
  });

  expect(getMethods(canvas).save).not.toHaveBeenCalled();
  expect(getMethods(canvas).transferToBase64).toHaveBeenCalledWith(
    'jpg',
    true,
    true,
    true,
    false
  );
  await flush();
  expect(onSketchSaved).toHaveBeenCalledWith(true, {
    type: 'base64',
    data: 'BASE64',
  });
});

test('save honours savePreference().type for arraybuffer', async () => {
  const onSketchSaved = jest.fn();
  const canvas = renderCanvas({
    onSketchSaved,
    savePreference: () => ({
      type: 'arraybuffer',
      folder: '',
      filename: '',
      transparent: false,
      imageType: 'png',
      includeText: false,
    }),
  });

  const result = await canvas.save();

  expect(result.type).toBe('arraybuffer');
  expect(result.data).toBeInstanceOf(ArrayBuffer);
  expect(getMethods(canvas).transferToArrayBuffer).toHaveBeenCalledWith(
    'png',
    false,
    true,
    false,
    false
  );
  await flush();
  expect(onSketchSaved).toHaveBeenCalledWith(true, {
    type: 'arraybuffer',
    data: result.data,
  });
});

test('save passes the savePreference through as an options object', async () => {
  const save = jest.spyOn(SketchCanvas.prototype, 'save');
  const canvas = renderCanvas({
    savePreference: () => ({
      folder: 'folder',
      filename: 'name',
      transparent: true,
      imageType: 'jpg',
      cropToImageSize: true,
    }),
  });

  await canvas.save();

  expect(save).toHaveBeenCalledTimes(1);
  expect(save.mock.calls[0]).toHaveLength(1);
  expect(typeof save.mock.calls[0]![0]).toBe('object');
  expect(getMethods(canvas).save).toHaveBeenCalledWith(
    'jpg',
    'folder',
    'name',
    true,
    true,
    true,
    true
  );
});

test('save without a savePreference uses the defaults and a unique filename', async () => {
  const save = jest.spyOn(SketchCanvas.prototype, 'save');
  const canvas = renderCanvas();

  await canvas.save();

  expect(save).toHaveBeenCalledTimes(1);
  expect(save.mock.calls[0]).toHaveLength(1);
  expect(typeof save.mock.calls[0]![0]).toBe('object');
  expect(getMethods(canvas).save).toHaveBeenCalledWith(
    'png',
    '',
    expect.stringMatching(/^[0-9a-f-]{36}$/),
    false,
    true,
    true,
    false
  );
});

afterEach(() => {
  jest.restoreAllMocks();
});
