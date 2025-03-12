import 'react-native';
import React from 'react';
import SketchCanvas from '../SketchCanvas';

import { render } from '@testing-library/react-native';

test('renders correctly', async () => {
  render(<SketchCanvas ref={React.createRef()} />);
});
