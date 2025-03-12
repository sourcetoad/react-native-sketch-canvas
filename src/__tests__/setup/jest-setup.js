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
