/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { Component } from 'react';
import {
  AppRegistry,
  StyleSheet,
  Text,
  View,
  Alert,
  TouchableOpacity,
  ScrollView,
  Platform,
  SafeAreaView,
  TextInput,
} from 'react-native';

import RNSketchCanvas, {
  SketchCanvas,
} from '@sourcetoad/react-native-sketch-canvas';
import type { Path } from '@sourcetoad/react-native-sketch-canvas';

type ExampleState = {
  example: number;
  color: string;
  thickness: number;
  message: string;
  photoPath: any;
  scrollEnabled: boolean;
  performanceResults: string;
  testSize: number;
  testKey: number;
  currentTestData: Path[];
};

const testPath1: Path[] = [
  {
    path: {
      id: 48034205,
      color: '#FF0000',
      width: 5,
      data: [
        '565.47,259.47',
        '565.47,254',
        '564.45,238.63',
        '559.84,216.66',
        '552.9,191.47',
        '541.21,161.56',
        '523.7,133.11',
        '508.1,114.47',
        '497.58,105.88',
        '482.46,98.99',
        '467.64,97.48',
        '459.36,100.76',
        '454.79,107.44',
        '447.61,134.91',
        '444.44,166.78',
        '442.97,203.28',
        '442.97,220.49',
        '456.83,260.94',
        '479.03,291.37',
        '503.71,316.47',
        '535.02,345.02',
        '585.24,388.53',
        '606.96,406.27',
        '624.82,419.17',
        '633.8,427.67',
        '634.96,428.95',
        '634.96,429.48',
        '630.39,420.75',
        '628.48,418.48',
      ],
    },
    size: { width: 1280, height: 652 },
  },
  {
    path: {
      id: 50223646,
      color: '#FF0000',
      width: 5,
      data: [
        '567.97,256.49',
        '565.82,252.94',
        '566.45,252.48',
        '565.47,247.71',
        '563.95,238.16',
        '563.95,224.89',
        '563.95,214.86',
        '568.62,201.67',
        '578.46,182.59',
        '592.39,163.97',
        '609.14,148.3',
        '625.33,139.49',
        '647.67,131.57',
        '663.59,127.37',
        '682.97,123.97',
        '703.48,123.97',
        '721.17,123.97',
        '735.32,123.97',
        '746.95,134.1',
        '753.79,145.92',
        '756.45,161.81',
        '756.45,184.47',
        '754.51,209.8',
        '747.82,230.05',
        '736.97,251.61',
        '721.58,275.1',
        '700.22,300.01',
        '685.44,318.33',
        '673.64,333.23',
        '661.29,349.32',
        '655.36,358.3',
        '652.93,364.94',
        '649.45,371.52',
        '647.35,385.27',
        '645.57,397.08',
        '641.91,410.31',
        '640.93,418.06',
        '639.97,421.95',
        '637.97,425.87',
        '637.97,427.81',
        '637.97,428.7',
        '637.97,428.97',
      ],
    },
    size: { width: 1280, height: 652 },
  },
];

// Generate large dataset for performance testing
const generateLargePathDataset = (count: number): Path[] => {
  const paths: Path[] = [];
  const colors = [
    '#FF0000',
    '#00FF00',
    '#0000FF',
    '#FFFF00',
    '#FF00FF',
    '#00FFFF',
  ];

  for (let i = 0; i < count; i++) {
    const baseId = 10000000 + i;
    const color = colors[i % colors.length];
    const width = 3 + (i % 5); // width 3-7

    // Generate path data points
    const pathData: string[] = [];
    const startX = 50 + (i % 10) * 50;
    const startY = 50 + (i % 10) * 50;

    for (let j = 0; j < 20; j++) {
      const x = startX + Math.sin((j / 20) * Math.PI * 2) * 30;
      const y = startY + Math.cos((j / 20) * Math.PI * 2) * 30;
      pathData.push(`${x.toFixed(2)},${y.toFixed(2)}`);
    }

    paths.push({
      path: {
        id: baseId,
        color,
        width,
        data: pathData,
      },
      size: { width: 1280, height: 652 },
    });
  }

  return paths;
};

export default class example extends Component<any, ExampleState> {
  constructor(props: any) {
    super(props);

    this.state = {
      example: 0,
      color: '#FF0000',
      thickness: 5,
      message: '',
      photoPath: null,
      scrollEnabled: true,
      performanceResults: '',
      testSize: 100,
      testKey: 0,
      currentTestData: [],
    };
  }

  camera: any;
  canvas: any;
  canvas1: any;
  canvas2: any;
  performanceCanvas: any;
  testCanvas: any;
  testStartTime: number = 0;

  closeExample = () => {
    this.setState({
      example: 0,
      performanceResults: '',
      testKey: 0,
      currentTestData: [],
    });
  };

  takePicture = async () => {
    if (this.camera) {
      try {
        const options = { quality: 0.5, base64: true };
        const data = await this.camera.takePictureAsync(options);

        this.setState({
          photoPath: data.uri.replace('file://', ''),
        });
      } catch (err) {
        console.log(err);
      }
    }
  };

  runPerformanceTest = (pathCount: number) => {
    console.log(`🚀 Starting performance test with ${pathCount} paths`);
    const testData = generateLargePathDataset(pathCount);

    this.testStartTime = Date.now();
    const startLog = `🧪 Performance Test Started\nDataset: ${pathCount} paths\nPlatform: ${Platform.OS}\nStarted at: ${new Date().toISOString()}\n`;

    // Load new paths by updating the initialPaths prop and forcing re-render
    this.setState({
      performanceResults: this.state.performanceResults + startLog,
      testKey: Date.now(),
      currentTestData: testData,
    });
  };

  testEdgeCase = (testType: string) => {
    console.log(`🧪 Testing edge case: ${testType}`);
    this.testStartTime = Date.now();

    let testData: Path[] = [];
    let description = '';

    switch (testType) {
      case 'empty':
        testData = [];
        description = 'Empty array test';
        break;
      case 'normal':
        testData = testPath1;
        description = 'Normal paths test';
        break;
      case 'duplicates':
        testData = [...testPath1, ...testPath1]; // Duplicate paths
        description = 'Duplicate paths test';
        break;
    }

    const startLog = `🧪 API Edge Case Test Started\nType: ${description}\nDataset: ${testData.length} paths\nPlatform: ${Platform.OS}\nStarted at: ${new Date().toISOString()}\n`;

    // Load new paths by updating the initialPaths prop and forcing re-render
    this.setState({
      performanceResults: this.state.performanceResults + startLog,
      testKey: Date.now(),
      currentTestData: testData,
    });
  };

  render() {
    return (
      <SafeAreaView style={styles.container}>
        {this.state.example === 0 && (
          <View
            style={{
              justifyContent: 'center',
              alignItems: 'center',
              width: 340,
            }}
          >
            <TouchableOpacity
              onPress={() => {
                this.setState({ example: 1 });
              }}
            >
              <Text
                style={{ alignSelf: 'center', marginTop: 15, fontSize: 18 }}
              >
                - Example 1 -
              </Text>
              <Text>Use build-in UI components</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                this.setState({ example: 2 });

                if (this.canvas) {
                  // debug: attempt to load paths immediately without waiting for onCanvasReady
                  testPath1.forEach((path) => {
                    this.canvas.addPath(path);
                  });
                }
              }}
            >
              <Text
                style={{ alignSelf: 'center', marginTop: 15, fontSize: 18 }}
              >
                - Example 2 -
              </Text>
              <Text>Use canvas only and customize UI components</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                this.setState({ example: 3 });
              }}
            >
              <Text
                style={{ alignSelf: 'center', marginTop: 15, fontSize: 18 }}
              >
                - Example 3 -
              </Text>
              <Text>Sync two canvases</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                Alert.alert('TODO: will be implemented in the future');
              }}
            >
              <Text
                style={{ alignSelf: 'center', marginTop: 15, fontSize: 18 }}
              >
                - Example 4 -
              </Text>
              <Text>Take a photo first</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                this.setState({ example: 5 });
              }}
            >
              <Text
                style={{ alignSelf: 'center', marginTop: 15, fontSize: 18 }}
              >
                - Example 5 -
              </Text>
              <Text>Load local image</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                this.setState({ example: 6 });
              }}
            >
              <Text
                style={{ alignSelf: 'center', marginTop: 15, fontSize: 18 }}
              >
                - Example 6 -
              </Text>
              <Text>Draw text on canvas</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                this.setState({ example: 7 });
              }}
            >
              <Text
                style={{ alignSelf: 'center', marginTop: 15, fontSize: 18 }}
              >
                - Example 7 -
              </Text>
              <Text>Multiple canvases in ScrollView</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                this.setState({
                  example: 8,
                  performanceResults: '',
                  testKey: 0,
                  currentTestData: [],
                });
              }}
            >
              <Text
                style={{ alignSelf: 'center', marginTop: 15, fontSize: 18 }}
              >
                - Example 8 -
              </Text>
              <Text>Test onInitialPathsLoaded event</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                this.setState({
                  example: 9,
                  performanceResults: '',
                  testKey: 0,
                  currentTestData: [],
                });
              }}
            >
              <Text
                style={{ alignSelf: 'center', marginTop: 15, fontSize: 18 }}
              >
                - Example 9 -
              </Text>
              <Text>Performance Testing Suite</Text>
            </TouchableOpacity>
          </View>
        )}

        {this.state.example === 1 && (
          <View style={{ flex: 1, flexDirection: 'row' }}>
            <RNSketchCanvas
              containerStyle={{ backgroundColor: 'transparent', flex: 1 }}
              canvasStyle={{ backgroundColor: 'transparent', flex: 1 }}
              onCanvasReady={() => {
                console.log('onCanvasReady');
              }}
              onStrokeEnd={(data) => {}}
              closeComponent={
                <View style={styles.functionButton}>
                  <Text style={{ color: 'white' }}>Close</Text>
                </View>
              }
              onClosePressed={() => {
                this.setState({ example: 0 });
              }}
              undoComponent={
                <View style={styles.functionButton}>
                  <Text style={{ color: 'white' }}>Undo</Text>
                </View>
              }
              onUndoPressed={(id) => {
                // Alert.alert('do something')
              }}
              clearComponent={
                <View style={styles.functionButton}>
                  <Text style={{ color: 'white' }}>Clear</Text>
                </View>
              }
              onClearPressed={() => {
                // Alert.alert('do something')
              }}
              eraseComponent={
                <View style={styles.functionButton}>
                  <Text style={{ color: 'white' }}>Eraser</Text>
                </View>
              }
              strokeComponent={(color) => (
                <View
                  style={[{ backgroundColor: color }, styles.strokeColorButton]}
                />
              )}
              strokeSelectedComponent={(color, index, changed) => {
                return (
                  <View
                    style={[
                      { backgroundColor: color, borderWidth: 2 },
                      styles.strokeColorButton,
                    ]}
                  />
                );
              }}
              strokeWidthComponent={(w) => {
                return (
                  <View style={styles.strokeWidthButton}>
                    <View
                      style={{
                        backgroundColor: 'white',
                        marginHorizontal: 2.5,
                        width: Math.sqrt(w / 3) * 10,
                        height: Math.sqrt(w / 3) * 10,
                        borderRadius: (Math.sqrt(w / 3) * 10) / 2,
                      }}
                    />
                  </View>
                );
              }}
              defaultStrokeIndex={0}
              defaultStrokeWidth={5}
              saveComponent={
                <View style={styles.functionButton}>
                  <Text style={{ color: 'white' }}>Save</Text>
                </View>
              }
              savePreference={() => {
                return {
                  folder: 'RNSketchCanvas',
                  filename: String(Math.ceil(Math.random() * 100000000)),
                  transparent: false,
                  imageType: 'png',
                };
              }}
              onSketchSaved={(success, path) => {
                console.log('onSketchSaved', success, path);
                Alert.alert(
                  success ? 'Image saved!' : 'Failed to save image!',
                  path
                );
              }}
              onPathsChange={(pathsCount) => {
                console.log('pathsCount', pathsCount);
              }}
            />
          </View>
        )}

        {this.state.example === 2 && (
          <View style={{ flex: 1, flexDirection: 'row' }}>
            <View style={{ flex: 1, flexDirection: 'column' }}>
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                }}
              >
                <TouchableOpacity
                  style={styles.functionButton}
                  onPress={() => {
                    this.setState({ example: 0 });
                  }}
                >
                  <Text style={{ color: 'white' }}>Close</Text>
                </TouchableOpacity>
                <View style={{ flexDirection: 'row' }}>
                  <TouchableOpacity
                    style={styles.functionButton}
                    onPress={() => {
                      this.setState({ thickness: 10 });
                    }}
                  >
                    <Text style={{ color: 'white' }}>Thick</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.functionButton}
                    onPress={() => {
                      this.setState({ thickness: 5 });
                    }}
                  >
                    <Text style={{ color: 'white' }}>Thin</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <SketchCanvas
                localSourceImage={{
                  filename: 'whale.png',
                  directory: SketchCanvas.MAIN_BUNDLE,
                  mode: 'AspectFit',
                }}
                onCanvasReady={() => {
                  console.log('onCanvasReady #2');

                  // debug path #2
                  testPath1.forEach((path) => {
                    this.canvas.addPath(path);
                  });
                }}
                // localSourceImage={{ filename: 'bulb.png', directory: RNSketchCanvas.MAIN_BUNDLE }}
                ref={(ref) => (this.canvas = ref)}
                style={{ flex: 1 }}
                strokeColor={this.state.color}
                strokeWidth={this.state.thickness}
                onGenerateBase64={(result) => {
                  console.log('base64 result:', result);
                }}
                onStrokeStart={(x, y) => {
                  console.log('x: ', x, ', y: ', y);
                  this.setState({ message: 'Start' });
                }}
                onStrokeChanged={(x, y) => {
                  console.log('x: ', x, ', y: ', y);
                  this.setState({ message: 'Changed' });
                }}
                onStrokeEnd={() => {
                  this.setState({ message: 'End' });
                }}
                onPathsChange={(pathsCount) => {
                  console.log('pathsCount', pathsCount);
                }}
              />
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <View style={{ flexDirection: 'row' }}>
                  <TouchableOpacity
                    style={[styles.functionButton, { backgroundColor: 'red' }]}
                    onPress={() => {
                      this.setState({ color: '#FF0000' });
                    }}
                  >
                    <Text style={{ color: 'white' }}>Red</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.functionButton,
                      { backgroundColor: 'black' },
                    ]}
                    onPress={() => {
                      this.setState({ color: '#000000' });
                    }}
                  >
                    <Text style={{ color: 'white' }}>Black</Text>
                  </TouchableOpacity>
                </View>
                <Text style={{ marginRight: 8, fontSize: 20 }}>
                  {this.state.message}
                </Text>
                <TouchableOpacity
                  style={[
                    styles.functionButton,
                    { backgroundColor: 'black', width: 90 },
                  ]}
                  onPress={() => {
                    Alert.alert(JSON.stringify(this.canvas.getPaths()));
                    this.canvas.getBase64('jpg', false, true, true, true);
                  }}
                >
                  <Text style={{ color: 'white' }}>Get Paths</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {this.state.example === 3 && (
          <View style={{ flex: 1, flexDirection: 'column' }}>
            <RNSketchCanvas
              ref={(ref) => (this.canvas1 = ref)}
              user={'user1'}
              containerStyle={{ backgroundColor: 'transparent', flex: 1 }}
              canvasStyle={{ backgroundColor: 'transparent', flex: 1 }}
              closeComponent={
                <View style={styles.functionButton}>
                  <Text style={{ color: 'white' }}>Close</Text>
                </View>
              }
              onClosePressed={() => {
                this.setState({ example: 0 });
              }}
              undoComponent={
                <View style={styles.functionButton}>
                  <Text style={{ color: 'white' }}>Undo</Text>
                </View>
              }
              onUndoPressed={(id) => {
                this.canvas2.deletePath(id);
              }}
              clearComponent={
                <View style={styles.functionButton}>
                  <Text style={{ color: 'white' }}>Clear</Text>
                </View>
              }
              onClearPressed={() => {
                this.canvas2.clear();
              }}
              eraseComponent={
                <View style={styles.functionButton}>
                  <Text style={{ color: 'white' }}>Eraser</Text>
                </View>
              }
              strokeComponent={(color) => (
                <View
                  style={[{ backgroundColor: color }, styles.strokeColorButton]}
                />
              )}
              strokeSelectedComponent={(color, index, changed) => {
                return (
                  <View
                    style={[
                      { backgroundColor: color, borderWidth: 2 },
                      styles.strokeColorButton,
                    ]}
                  />
                );
              }}
              strokeWidthComponent={(w) => {
                return (
                  <View style={styles.strokeWidthButton}>
                    <View
                      style={{
                        backgroundColor: 'white',
                        marginHorizontal: 2.5,
                        width: Math.sqrt(w / 3) * 10,
                        height: Math.sqrt(w / 3) * 10,
                        borderRadius: (Math.sqrt(w / 3) * 10) / 2,
                      }}
                    />
                  </View>
                );
              }}
              defaultStrokeIndex={0}
              defaultStrokeWidth={5}
              saveComponent={
                <View style={styles.functionButton}>
                  <Text style={{ color: 'white' }}>Save</Text>
                </View>
              }
              savePreference={() => {
                return {
                  folder: 'RNSketchCanvas',
                  filename: String(Math.ceil(Math.random() * 100000000)),
                  transparent: true,
                  imageType: 'jpg',
                };
              }}
              onSketchSaved={(success, path) => {
                Alert.alert(
                  success ? 'Image saved!' : 'Failed to save image!',
                  path
                );
              }}
              onStrokeEnd={(path) => {
                this.canvas2.addPath(path);
              }}
              onPathsChange={(pathsCount) => {
                console.log('pathsCount(user1)', pathsCount);
              }}
            />
            <RNSketchCanvas
              ref={(ref) => (this.canvas2 = ref)}
              user={'user2'}
              containerStyle={{ backgroundColor: 'transparent', flex: 1 }}
              canvasStyle={{ backgroundColor: 'transparent', flex: 1 }}
              undoComponent={
                <View style={styles.functionButton}>
                  <Text style={{ color: 'white' }}>Undo</Text>
                </View>
              }
              onUndoPressed={(id) => {
                this.canvas1.deletePath(id);
              }}
              clearComponent={
                <View style={styles.functionButton}>
                  <Text style={{ color: 'white' }}>Clear</Text>
                </View>
              }
              onClearPressed={() => {
                this.canvas1.clear();
              }}
              eraseComponent={
                <View style={styles.functionButton}>
                  <Text style={{ color: 'white' }}>Eraser</Text>
                </View>
              }
              strokeComponent={(color) => (
                <View
                  style={[{ backgroundColor: color }, styles.strokeColorButton]}
                />
              )}
              strokeSelectedComponent={(color, index, changed) => {
                return (
                  <View
                    style={[
                      { backgroundColor: color, borderWidth: 2 },
                      styles.strokeColorButton,
                    ]}
                  />
                );
              }}
              strokeWidthComponent={(w) => {
                return (
                  <View style={styles.strokeWidthButton}>
                    <View
                      style={{
                        backgroundColor: 'white',
                        marginHorizontal: 2.5,
                        width: Math.sqrt(w / 3) * 10,
                        height: Math.sqrt(w / 3) * 10,
                        borderRadius: (Math.sqrt(w / 3) * 10) / 2,
                      }}
                    />
                  </View>
                );
              }}
              defaultStrokeIndex={0}
              defaultStrokeWidth={5}
              saveComponent={
                <View style={styles.functionButton}>
                  <Text style={{ color: 'white' }}>Save</Text>
                </View>
              }
              savePreference={() => {
                return {
                  folder: 'RNSketchCanvas',
                  filename: String(Math.ceil(Math.random() * 100000000)),
                  transparent: true,
                  imageType: 'jpg',
                };
              }}
              onSketchSaved={(success, path) => {
                Alert.alert(
                  success ? 'Image saved!' : 'Failed to save image!',
                  path
                );
              }}
              onStrokeEnd={(path) => {
                this.canvas1.addPath(path);
              }}
              onPathsChange={(pathsCount) => {
                console.log('pathsCount(user2)', pathsCount);
              }}
            />
          </View>
        )}

        {this.state.example === 4 &&
          (this.state.photoPath === null ? (
            <View style={styles.cameraContainer}>
              {/* TODO: Implement camera component (vision-camera) */}
              <View
                style={{
                  flex: 0,
                  flexDirection: 'row',
                  justifyContent: 'center',
                }}
              >
                <TouchableOpacity
                  onPress={this.takePicture.bind(this)}
                  style={styles.capture}
                >
                  <Text style={{ fontSize: 14 }}> SNAP </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={{ flex: 1, flexDirection: 'row' }}>
              <RNSketchCanvas
                localSourceImage={{
                  filename: this.state.photoPath,
                  directory: undefined,
                  mode: 'AspectFit',
                }}
                containerStyle={{ backgroundColor: 'transparent', flex: 1 }}
                canvasStyle={{ backgroundColor: 'transparent', flex: 1 }}
                onStrokeEnd={(data) => {}}
                closeComponent={
                  <View style={styles.functionButton}>
                    <Text style={{ color: 'white' }}>Close</Text>
                  </View>
                }
                onClosePressed={() => {
                  this.setState({ example: 0 });
                }}
                undoComponent={
                  <View style={styles.functionButton}>
                    <Text style={{ color: 'white' }}>Undo</Text>
                  </View>
                }
                onUndoPressed={(id) => {
                  // Alert.alert('do something')
                }}
                clearComponent={
                  <View style={styles.functionButton}>
                    <Text style={{ color: 'white' }}>Clear</Text>
                  </View>
                }
                onClearPressed={() => {
                  // Alert.alert('do something')
                }}
                eraseComponent={
                  <View style={styles.functionButton}>
                    <Text style={{ color: 'white' }}>Eraser</Text>
                  </View>
                }
                strokeComponent={(color) => (
                  <View
                    style={[
                      { backgroundColor: color },
                      styles.strokeColorButton,
                    ]}
                  />
                )}
                strokeSelectedComponent={(color, index, changed) => {
                  return (
                    <View
                      style={[
                        { backgroundColor: color, borderWidth: 2 },
                        styles.strokeColorButton,
                      ]}
                    />
                  );
                }}
                strokeWidthComponent={(w) => {
                  return (
                    <View style={styles.strokeWidthButton}>
                      <View
                        style={{
                          backgroundColor: 'white',
                          marginHorizontal: 2.5,
                          width: Math.sqrt(w / 3) * 10,
                          height: Math.sqrt(w / 3) * 10,
                          borderRadius: (Math.sqrt(w / 3) * 10) / 2,
                        }}
                      />
                    </View>
                  );
                }}
                defaultStrokeIndex={0}
                defaultStrokeWidth={5}
                saveComponent={
                  <View style={styles.functionButton}>
                    <Text style={{ color: 'white' }}>Save</Text>
                  </View>
                }
                savePreference={() => {
                  return {
                    folder: 'RNSketchCanvas',
                    filename: String(Math.ceil(Math.random() * 100000000)),
                    transparent: false,
                    imageType: 'png',
                  };
                }}
                onSketchSaved={(success, path) => {
                  Alert.alert(
                    success ? 'Image saved!' : 'Failed to save image!',
                    path
                  );
                }}
                onPathsChange={(pathsCount) => {
                  console.log('pathsCount', pathsCount);
                }}
              />
            </View>
          ))}

        {this.state.example === 5 && (
          <View style={{ flex: 1, flexDirection: 'row' }}>
            <RNSketchCanvas
              localSourceImage={{
                filename: 'bigimage.jpg',
                directory: SketchCanvas.MAIN_BUNDLE,
                mode: 'AspectFit',
              }}
              // localSourceImage={{ filename: 'bulb.png', directory: RNSketchCanvas.MAIN_BUNDLE }}
              containerStyle={{ backgroundColor: 'transparent', flex: 1 }}
              canvasStyle={{ backgroundColor: 'transparent', flex: 1 }}
              onStrokeEnd={(data) => {}}
              closeComponent={
                <View style={styles.functionButton}>
                  <Text style={{ color: 'white' }}>Close</Text>
                </View>
              }
              onClosePressed={() => {
                this.setState({ example: 0 });
              }}
              undoComponent={
                <View style={styles.functionButton}>
                  <Text style={{ color: 'white' }}>Undo</Text>
                </View>
              }
              onUndoPressed={(id) => {
                // Alert.alert('do something')
              }}
              clearComponent={
                <View style={styles.functionButton}>
                  <Text style={{ color: 'white' }}>Clear</Text>
                </View>
              }
              onClearPressed={() => {
                // Alert.alert('do something')
              }}
              eraseComponent={
                <View style={styles.functionButton}>
                  <Text style={{ color: 'white' }}>Eraser</Text>
                </View>
              }
              strokeComponent={(color) => (
                <View
                  style={[{ backgroundColor: color }, styles.strokeColorButton]}
                />
              )}
              strokeSelectedComponent={(color, index, changed) => {
                return (
                  <View
                    style={[
                      { backgroundColor: color, borderWidth: 2 },
                      styles.strokeColorButton,
                    ]}
                  />
                );
              }}
              strokeWidthComponent={(w) => {
                return (
                  <View style={styles.strokeWidthButton}>
                    <View
                      style={{
                        backgroundColor: 'white',
                        marginHorizontal: 2.5,
                        width: Math.sqrt(w / 3) * 10,
                        height: Math.sqrt(w / 3) * 10,
                        borderRadius: (Math.sqrt(w / 3) * 10) / 2,
                      }}
                    />
                  </View>
                );
              }}
              defaultStrokeIndex={0}
              defaultStrokeWidth={5}
              saveComponent={
                <View style={styles.functionButton}>
                  <Text style={{ color: 'white' }}>Save</Text>
                </View>
              }
              savePreference={() => {
                return {
                  folder: 'RNSketchCanvas',
                  filename: String(Math.ceil(Math.random() * 100000000)),
                  transparent: false,
                  includeImage: true,
                  cropToImageSize: false,
                  imageType: 'jpg',
                };
              }}
              onSketchSaved={(success, path) => {
                Alert.alert(
                  success ? 'Image saved!' : 'Failed to save image!',
                  path
                );
              }}
              onPathsChange={(pathsCount) => {
                console.log('pathsCount', pathsCount);
              }}
            />
          </View>
        )}

        {this.state.example === 6 && (
          <View style={{ flex: 1, flexDirection: 'column' }}>
            <TextInput
              value={this.state.message}
              onChangeText={(text) => this.setState({ message: text })}
            />
            <RNSketchCanvas
              text={[
                {
                  text: this.state.message,
                  fontSize: 25,
                  position: { x: 0, y: 0.25 },
                  anchor: { x: 0, y: 0 },
                  coordinate: 'Ratio',
                  fontColor: 'green',
                },
                {
                  text: 'Welcome to my GitHub',
                  font: 'fonts/IndieFlower.ttf',
                  fontSize: 30,
                  position: { x: 0, y: 0 },
                  anchor: { x: 0, y: 0 },
                  coordinate: 'Absolute',
                  fontColor: 'red',
                },
                {
                  text: 'Center\nMULTILINE',
                  fontSize: 25,
                  position: { x: 0.5, y: 0.5 },
                  anchor: { x: 0.5, y: 0.5 },
                  coordinate: 'Ratio',
                  overlay: 'SketchOnText',
                  fontColor: 'black',
                  alignment: 'Center',
                  lineHeightMultiple: 1,
                },
                {
                  text: 'Right\nMULTILINE',
                  fontSize: 25,
                  position: { x: 1, y: 0.25 },
                  anchor: { x: 1, y: 0.5 },
                  coordinate: 'Ratio',
                  overlay: 'TextOnSketch',
                  fontColor: 'black',
                  alignment: 'Right',
                  lineHeightMultiple: 1,
                },
                {
                  text: 'Signature',
                  font: 'Zapfino',
                  fontSize: 40,
                  position: { x: 0, y: 1 },
                  anchor: { x: 0, y: 1 },
                  coordinate: 'Ratio',
                  overlay: 'TextOnSketch',
                  fontColor: '#444444',
                },
              ]}
              containerStyle={{ backgroundColor: 'transparent', flex: 1 }}
              canvasStyle={{ backgroundColor: 'transparent', flex: 1 }}
              onStrokeEnd={(data) => {}}
              closeComponent={
                <View style={styles.functionButton}>
                  <Text style={{ color: 'white' }}>Close</Text>
                </View>
              }
              onClosePressed={() => {
                this.setState({ example: 0 });
              }}
              undoComponent={
                <View style={styles.functionButton}>
                  <Text style={{ color: 'white' }}>Undo</Text>
                </View>
              }
              onUndoPressed={(id) => {
                // Alert.alert('do something')
              }}
              clearComponent={
                <View style={styles.functionButton}>
                  <Text style={{ color: 'white' }}>Clear</Text>
                </View>
              }
              onClearPressed={() => {
                // Alert.alert('do something')
              }}
              eraseComponent={
                <View style={styles.functionButton}>
                  <Text style={{ color: 'white' }}>Eraser</Text>
                </View>
              }
              strokeComponent={(color) => (
                <View
                  style={[{ backgroundColor: color }, styles.strokeColorButton]}
                />
              )}
              strokeSelectedComponent={(color, index, changed) => {
                return (
                  <View
                    style={[
                      { backgroundColor: color, borderWidth: 2 },
                      styles.strokeColorButton,
                    ]}
                  />
                );
              }}
              strokeWidthComponent={(w) => {
                return (
                  <View style={styles.strokeWidthButton}>
                    <View
                      style={{
                        backgroundColor: 'white',
                        marginHorizontal: 2.5,
                        width: Math.sqrt(w / 3) * 10,
                        height: Math.sqrt(w / 3) * 10,
                        borderRadius: (Math.sqrt(w / 3) * 10) / 2,
                      }}
                    />
                  </View>
                );
              }}
              defaultStrokeIndex={0}
              defaultStrokeWidth={5}
              saveComponent={
                <View style={styles.functionButton}>
                  <Text style={{ color: 'white' }}>Save</Text>
                </View>
              }
              savePreference={() => {
                return {
                  folder: 'RNSketchCanvas',
                  filename: String(Math.ceil(Math.random() * 100000000)),
                  transparent: false,
                  includeImage: false,
                  includeText: false,
                  cropToImageSize: false,
                  imageType: 'jpg',
                };
              }}
              onSketchSaved={(success, path) => {
                Alert.alert(
                  success ? 'Image saved!' : 'Failed to save image!',
                  path
                );
              }}
              onPathsChange={(pathsCount) => {
                console.log('pathsCount', pathsCount);
              }}
            />
          </View>
        )}

        {this.state.example === 7 && (
          <View style={{ flex: 1, flexDirection: 'row' }}>
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ padding: 36 }}
              scrollEnabled={this.state.scrollEnabled}
            >
              <TouchableOpacity onPress={() => this.setState({ example: 0 })}>
                <Text>Close</Text>
              </TouchableOpacity>
              <SketchCanvas
                text={[
                  {
                    text: 'Page 1',
                    position: { x: 20, y: 20 },
                    fontSize: Platform.select({ ios: 24, android: 48 }),
                  },
                  {
                    text: 'Signature',
                    font: Platform.select({
                      ios: 'Zapfino',
                      android: 'fonts/IndieFlower.ttf',
                    }),
                    position: { x: 20, y: 220 },
                    fontSize: Platform.select({ ios: 24, android: 48 }),
                    fontColor: 'red',
                  },
                ]}
                localSourceImage={{
                  filename: 'whale.png',
                  directory: SketchCanvas.MAIN_BUNDLE,
                  mode: 'AspectFit',
                }}
                style={styles.page}
                onStrokeStart={() => this.setState({ scrollEnabled: false })}
                onStrokeEnd={() => this.setState({ scrollEnabled: true })}
              />
              <SketchCanvas
                text={[
                  {
                    text: 'Page 2',
                    position: { x: 0.95, y: 0.05 },
                    anchor: { x: 1, y: 0 },
                    coordinate: 'Ratio',
                    fontSize: Platform.select({ ios: 24, android: 48 }),
                  },
                ]}
                style={styles.page}
                onStrokeStart={() => this.setState({ scrollEnabled: false })}
                onStrokeEnd={() => this.setState({ scrollEnabled: true })}
              />
              <SketchCanvas
                text={[
                  {
                    text: 'Page 3',
                    position: { x: 0.5, y: 0.95 },
                    anchor: { x: 0.5, y: 1 },
                    coordinate: 'Ratio',
                    fontSize: Platform.select({ ios: 24, android: 48 }),
                  },
                ]}
                style={styles.page}
                onStrokeStart={() => this.setState({ scrollEnabled: false })}
                onStrokeEnd={() => this.setState({ scrollEnabled: true })}
              />
              <SketchCanvas
                text={[
                  {
                    text: 'Page 4',
                    position: { x: 20, y: 20 },
                    fontSize: Platform.select({ ios: 24, android: 48 }),
                  },
                ]}
                style={styles.page}
                onStrokeStart={() => this.setState({ scrollEnabled: false })}
                onStrokeEnd={() => this.setState({ scrollEnabled: true })}
              />
            </ScrollView>
          </View>
        )}

        {this.state.example === 8 && (
          <View style={{ flex: 1 }}>
            <TouchableOpacity onPress={() => this.setState({ example: 0 })}>
              <Text style={{ margin: 10, fontSize: 18 }}>Close</Text>
            </TouchableOpacity>
            <Text style={{ margin: 10, fontSize: 16, fontWeight: 'bold' }}>
              API Consistency Testing
            </Text>
            <Text style={{ margin: 10, fontSize: 14 }}>
              Testing onInitialPathsLoaded with various edge cases
            </Text>

            <View
              style={{ margin: 10, flexDirection: 'row', flexWrap: 'wrap' }}
            >
              <TouchableOpacity
                style={[styles.functionButton, { width: 120, marginRight: 5 }]}
                onPress={() => this.testEdgeCase('empty')}
              >
                <Text style={{ color: 'white', fontSize: 12 }}>
                  Empty Array
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.functionButton, { width: 120, marginRight: 5 }]}
                onPress={() => this.testEdgeCase('normal')}
              >
                <Text style={{ color: 'white', fontSize: 12 }}>
                  Normal Paths
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.functionButton, { width: 120, marginRight: 5 }]}
                onPress={() => this.testEdgeCase('duplicates')}
              >
                <Text style={{ color: 'white', fontSize: 12 }}>Duplicates</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={{ margin: 10, height: 150 }}>
              <Text style={{ fontSize: 12, fontFamily: 'monospace' }}>
                {this.state.performanceResults}
              </Text>
            </ScrollView>

            <RNSketchCanvas
              key={`test-canvas-${this.state.testKey}`}
              ref={(ref) => (this.testCanvas = ref)}
              containerStyle={{ backgroundColor: 'transparent', flex: 1 }}
              canvasStyle={{ backgroundColor: 'white', flex: 1 }}
              initialPaths={
                this.state.currentTestData.length > 0
                  ? this.state.currentTestData
                  : testPath1
              }
              onInitialPathsLoaded={(loadedCount) => {
                const endTime = Date.now();
                const duration = endTime - this.testStartTime;

                // Handle case where loadedCount might be an object instead of number
                let actualCount = loadedCount;
                if (typeof loadedCount === 'object') {
                  // If it's an object, try to extract the count or use expected data length
                  actualCount =
                    this.state.currentTestData.length > 0
                      ? this.state.currentTestData.length
                      : testPath1.length;
                  console.log(
                    '🐛 API Test - loadedCount was an object:',
                    loadedCount
                  );
                } else if (typeof loadedCount !== 'number') {
                  actualCount =
                    parseInt(String(loadedCount)) ||
                    (this.state.currentTestData.length > 0
                      ? this.state.currentTestData.length
                      : testPath1.length);
                  console.log(
                    '🐛 API Test - loadedCount was not a number:',
                    loadedCount,
                    'type:',
                    typeof loadedCount
                  );
                }

                const result = `✅ API Test Complete!\nLoaded: ${actualCount} paths\nDuration: ${duration}ms\nPlatform: ${Platform.OS}\nTimestamp: ${new Date().toISOString()}\n\n`;

                console.log(result);
                this.setState({
                  performanceResults: this.state.performanceResults + result,
                });
              }}
              onCanvasReady={() => {
                console.log('API test canvas ready');
              }}
              closeComponent={
                <View style={styles.functionButton}>
                  <Text style={{ color: 'white' }}>Close</Text>
                </View>
              }
              onClosePressed={() => {
                this.setState({ example: 0 });
              }}
            />
          </View>
        )}

        {this.state.example === 9 && (
          <View style={{ flex: 1 }}>
            <TouchableOpacity onPress={() => this.setState({ example: 0 })}>
              <Text style={{ margin: 10, fontSize: 18 }}>Close</Text>
            </TouchableOpacity>
            <Text style={{ margin: 10, fontSize: 16, fontWeight: 'bold' }}>
              Performance Testing Suite
            </Text>
            <Text style={{ margin: 10, fontSize: 14 }}>
              Test addInitialPaths performance with large datasets
            </Text>

            <View
              style={{ margin: 10, flexDirection: 'row', alignItems: 'center' }}
            >
              <Text style={{ fontSize: 14 }}>Test Size: </Text>
              <TextInput
                style={{
                  borderWidth: 1,
                  borderColor: '#ccc',
                  padding: 5,
                  width: 100,
                }}
                value={this.state.testSize.toString()}
                onChangeText={(text) =>
                  this.setState({ testSize: parseInt(text) || 100 })
                }
                keyboardType="numeric"
              />
              <Text style={{ fontSize: 14, marginLeft: 5 }}>paths</Text>
            </View>

            <View
              style={{ margin: 10, flexDirection: 'row', flexWrap: 'wrap' }}
            >
              <TouchableOpacity
                style={[styles.functionButton, { width: 100, marginRight: 5 }]}
                onPress={() => this.runPerformanceTest(10)}
              >
                <Text style={{ color: 'white' }}>Test 10</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.functionButton, { width: 100, marginRight: 5 }]}
                onPress={() => this.runPerformanceTest(50)}
              >
                <Text style={{ color: 'white' }}>Test 50</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.functionButton, { width: 100, marginRight: 5 }]}
                onPress={() => this.runPerformanceTest(100)}
              >
                <Text style={{ color: 'white' }}>Test 100</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.functionButton, { width: 100, marginRight: 5 }]}
                onPress={() => this.runPerformanceTest(250)}
              >
                <Text style={{ color: 'white' }}>Test 250</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.functionButton, { width: 100, marginRight: 5 }]}
                onPress={() => this.runPerformanceTest(this.state.testSize)}
              >
                <Text style={{ color: 'white' }}>Test Custom</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={{ margin: 10, flex: 1 }}>
              <Text style={{ fontSize: 12, fontFamily: 'monospace' }}>
                {this.state.performanceResults}
              </Text>
            </ScrollView>

            <RNSketchCanvas
              key={`performance-canvas-${this.state.testKey}`}
              ref={(ref) => (this.performanceCanvas = ref)}
              containerStyle={{ backgroundColor: 'transparent', height: 200 }}
              canvasStyle={{ backgroundColor: 'white', flex: 1 }}
              initialPaths={this.state.currentTestData}
              onInitialPathsLoaded={(loadedCount) => {
                const endTime = Date.now();
                const duration = endTime - this.testStartTime;

                // Handle case where loadedCount might be an object instead of number
                let actualCount = loadedCount;
                if (typeof loadedCount === 'object') {
                  // If it's an object, try to extract the count or use the current test data length
                  actualCount = this.state.currentTestData.length;
                  console.log('🐛 loadedCount was an object:', loadedCount);
                } else if (typeof loadedCount !== 'number') {
                  actualCount =
                    parseInt(String(loadedCount)) ||
                    this.state.currentTestData.length;
                  console.log(
                    '🐛 loadedCount was not a number:',
                    loadedCount,
                    'type:',
                    typeof loadedCount
                  );
                }

                const averagePerPath =
                  actualCount > 0 ? (duration / actualCount).toFixed(2) : 'N/A';
                const result = `✅ Performance Test Complete!\nLoaded: ${actualCount} paths\nDuration: ${duration}ms\nAverage: ${averagePerPath}ms per path\nPlatform: ${Platform.OS}\n\n`;

                console.log(result);
                this.setState({
                  performanceResults: this.state.performanceResults + result,
                });
              }}
              onCanvasReady={() => {
                console.log('Performance canvas ready');
              }}
              closeComponent={
                <View style={styles.functionButton}>
                  <Text style={{ color: 'white' }}>Close</Text>
                </View>
              }
              onClosePressed={() => {
                this.setState({ example: 0 });
              }}
            />
          </View>
        )}
      </SafeAreaView>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5FCFF',
  },
  strokeColorButton: {
    marginHorizontal: 2.5,
    marginVertical: 8,
    width: 30,
    height: 30,
    borderRadius: 15,
  },
  strokeWidthButton: {
    marginHorizontal: 2.5,
    marginVertical: 8,
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#39579A',
  },
  functionButton: {
    marginHorizontal: 2.5,
    marginVertical: 8,
    height: 30,
    width: 60,
    backgroundColor: '#39579A',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 5,
  },
  cameraContainer: {
    flex: 1,
    flexDirection: 'column',
    backgroundColor: 'black',
    alignSelf: 'stretch',
  },
  preview: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  capture: {
    flex: 0,
    backgroundColor: '#fff',
    borderRadius: 5,
    padding: 15,
    paddingHorizontal: 20,
    alignSelf: 'center',
    margin: 20,
  },
  page: {
    flex: 1,
    height: 300,
    elevation: 2,
    marginVertical: 8,
    backgroundColor: 'white',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.75,
    shadowRadius: 2,
  },
});

AppRegistry.registerComponent('example', () => example);
