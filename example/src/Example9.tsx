import React, { Component } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Platform,
} from 'react-native';

import RNSketchCanvas from '@sourcetoad/react-native-sketch-canvas';
import type { Path } from '@sourcetoad/react-native-sketch-canvas';

type Example9State = {
  shouldRenderCanvas: boolean;
  performanceResults: string;
  testSize: number;
  testKey: number;
  currentTestData: Path[];
};

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

interface Example9Props {
  onClose: () => void;
}

export default class Example9 extends Component<Example9Props, Example9State> {
  constructor(props: Example9Props) {
    super(props);

    this.state = {
      shouldRenderCanvas: false,
      performanceResults: '',
      testSize: 100,
      testKey: 0,
      currentTestData: [],
    };
  }

  performanceCanvas: any;
  testStartTime: number = 0;

  runPerformanceTest = (pathCount: number) => {
    console.log(`🚀 Starting performance test with ${pathCount} paths`);
    const testData = generateLargePathDataset(pathCount);

    this.testStartTime = Date.now();
    const startLog = `🧪 Performance Test Started\nDataset: ${pathCount} paths\nPlatform: ${Platform.OS}\nStarted at: ${new Date().toISOString()}\n`;

    this.setState({
      shouldRenderCanvas: false,
    });

    setTimeout(() => {
      this.setState({
        performanceResults: this.state.performanceResults + startLog,
        testKey: Date.now(),
        currentTestData: testData,
        shouldRenderCanvas: true,
      });
    }, 0);
  };

  renderCanvas = () => {
    if (!this.state.shouldRenderCanvas) {
      return null;
    }

    return (
      <RNSketchCanvas
        key={`performance-canvas-${this.state.testKey}`}
        ref={(ref) => (this.performanceCanvas = ref)}
        containerStyle={{ backgroundColor: 'transparent', height: 200 }}
        canvasStyle={{ backgroundColor: 'white', flex: 1 }}
        initialPaths={this.state.currentTestData}
        onInitialPathsLoaded={(eventData) => {
          const endTime = Date.now();
          const duration = endTime - this.testStartTime;

          // Handle different event data structures between platforms
          let actualCount = 0;
          if (typeof eventData === 'number') {
            // iOS sends number directly
            actualCount = eventData;
          } else if (typeof eventData === 'object' && eventData !== null) {
            // Android sends object with loadedCount property
            actualCount = (eventData as any).loadedCount || 0;
            console.log('🐛 Android event data structure:', eventData);
          } else {
            // Fallback to expected test data length
            actualCount = this.state.currentTestData.length;
            console.log('🐛 Unexpected event data:', eventData, 'type:', typeof eventData);
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
        onClosePressed={this.props.onClose}
      />
    );
  };

  render() {
    return (
      <View style={{ flex: 1 }}>
        <TouchableOpacity onPress={this.props.onClose}>
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

        <View style={{ margin: 10, flexDirection: 'row', flexWrap: 'wrap' }}>
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

        {this.renderCanvas()}
      </View>
    );
  }
}

const styles = StyleSheet.create({
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
});
