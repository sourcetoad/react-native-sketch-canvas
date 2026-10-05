import 'react-native';
import React from 'react';
import RNSketchCanvas from '../index';

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
