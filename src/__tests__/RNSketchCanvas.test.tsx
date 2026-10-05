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

test('getBase64 returns the promise and forwards onGenerateBase64', async () => {
  const onGenerateBase64 = jest.fn();
  const canvas = renderCanvas({ onGenerateBase64 });

  const promise = canvas.getBase64('png', false, true, true, false);

  expect(promise).toBeInstanceOf(Promise);
  await expect(promise).resolves.toBe('BASE64');
  await flush();
  expect(onGenerateBase64).toHaveBeenCalledWith({ base64: 'BASE64' });
});

test('save returns a promise of the save result', async () => {
  const onSketchSaved = jest.fn();
  const canvas = renderCanvas({ onSketchSaved });

  const promise = canvas.save();

  expect(promise).toBeInstanceOf(Promise);
  await expect(promise).resolves.toEqual({
    success: true,
    path: '/tmp/x.png',
  });
  await flush();
  expect(onSketchSaved).toHaveBeenCalledWith(true, '/tmp/x.png');
  expect(screen.getByTestId('sketch-canvas-host')).toBeTruthy();
});

const getMethods = (canvas: RNSketchCanvas) =>
  (canvas as any)._sketchCanvas._view;

test('getBase64 accepts an options object', async () => {
  const canvas = renderCanvas();

  await expect(
    canvas.getBase64({ imageType: 'jpg', transparent: true })
  ).resolves.toBe('BASE64');

  expect(getMethods(canvas).transferToBase64).toHaveBeenCalledWith(
    'jpg',
    true,
    true,
    true,
    false
  );
});

test('getBase64 with no argument uses all the defaults', async () => {
  const canvas = renderCanvas();

  await expect(canvas.getBase64()).resolves.toBe('BASE64');

  expect(getMethods(canvas).transferToBase64).toHaveBeenCalledWith(
    'png',
    false,
    true,
    true,
    false
  );
});

test('getBase64 still accepts the positional form', async () => {
  const canvas = renderCanvas();

  await canvas.getBase64('jpg', true, false, true, true);

  expect(getMethods(canvas).transferToBase64).toHaveBeenCalledWith(
    'jpg',
    true,
    false,
    true,
    true
  );
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
