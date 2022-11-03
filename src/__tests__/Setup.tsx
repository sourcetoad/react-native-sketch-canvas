jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');

  RN.UIManager.getViewManagerConfig = jest.fn(() => {
    return {
      Constants: {},
    };
  });

  Object.defineProperty(RN, 'findNodeHandle', {
    get: jest.fn(() => () => 1),
    set: jest.fn(),
  });

  return RN;
});
