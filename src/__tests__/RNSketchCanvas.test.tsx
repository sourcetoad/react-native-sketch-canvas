import 'react-native';
import React from 'react';
import RNSketchCanvas from '../index';

import { render } from '@testing-library/react';
import '@testing-library/jest-dom';

test('renders correctly', async () => {
  render(<RNSketchCanvas />);
});
