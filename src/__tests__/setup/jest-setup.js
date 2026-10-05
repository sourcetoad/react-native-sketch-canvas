jest.mock('react-native/Libraries/vendor/emitter/EventEmitter', () => {
  class EventEmitter {
    addListener = jest.fn();
    removeListener = jest.fn();
    removeAllListeners = jest.fn();
    emit = jest.fn();
  }
  return EventEmitter;
});

jest.mock('react-native/src/private/animated/NativeAnimatedHelper', () => ({
  addListener: jest.fn(),
  removeListener: jest.fn(),
  API: {
    createAnimatedNode: jest.fn(),
    startListeningToAnimatedNodeValue: jest.fn(),
    stopListeningToAnimatedNodeValue: jest.fn(),
    connectAnimatedNodes: jest.fn(),
    disconnectAnimatedNodes: jest.fn(),
    startAnimatingNode: jest.fn(),
    stopAnimation: jest.fn(),
    setAnimatedNodeValue: jest.fn(),
    connectAnimatedNodeToView: jest.fn(),
    disconnectAnimatedNodeFromView: jest.fn(),
    dropAnimatedNode: jest.fn(),
  },
}));

jest.mock('react-native/Libraries/Animated/nodes/AnimatedObject', () => {
  return {
    default: class AnimatedObject {
      constructor(obj) {
        this._value = obj;
      }

      __getValue() {
        return this._value;
      }

      __attach() {}
      __detach() {}
      __getAnimatedValue() {
        return this._value;
      }

      setValue(value) {
        this._value = value;
      }
    },
  };
});

jest.mock('react-native/Libraries/Animated/createAnimatedComponent', () => {
  const React = require('react');

  return function createAnimatedComponent(Component) {
    return class AnimatedComponent extends React.Component {
      _component = null;

      setNativeProps = jest.fn();

      render() {
        return React.createElement(Component, {
          ...this.props,
          ref: (ref) => {
            this._component = ref;
          },
        });
      }
    };
  };
});

jest.mock('react-native-nitro-modules', () => {
  const React = require('react');
  const { View } = require('react-native');
  const mockOptions = { deliverHybridRef: true };
  const createMethods = () => ({
    newPath: jest.fn(),
    addPoint: jest.fn(),
    endPath: jest.fn(),
    addPath: jest.fn(),
    addInitialPaths: jest.fn(),
    deletePath: jest.fn(),
    clear: jest.fn(),
    save: jest.fn(() => Promise.resolve({ success: true, path: '/tmp/x.png' })),
    transferToBase64: jest.fn(() => Promise.resolve('BASE64')),
  });
  return {
    mockOptions,
    getHostComponent: (_name, loadConfig) => {
      loadConfig();
      return function MockSketchCanvasHost(props) {
        const methods = React.useMemo(createMethods, []);
        React.useEffect(() => {
          if (mockOptions.deliverHybridRef) {
            props.hybridRef?.f(methods);
          }
        }, [methods, props.hybridRef]);
        return React.createElement(View, {
          ...props,
          testID: 'sketch-canvas-host',
        });
      };
    },
    callback: (f) => ({ f }),
    NitroModules: {
      createHybridObject: jest.fn(() => ({
        mainBundlePath: 'test',
        documentDirectory: 'test',
        libraryDirectory: 'test',
        cachesDirectory: 'test',
      })),
    },
  };
});
