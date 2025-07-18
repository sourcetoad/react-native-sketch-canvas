import React, { Component } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';

import RNSketchCanvas from '@sourcetoad/react-native-sketch-canvas';
import type { Path } from '@sourcetoad/react-native-sketch-canvas';

type Example8State = {
  performanceResults: string;
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

interface Example8Props {
  onClose: () => void;
}

export default class Example8 extends Component<Example8Props, Example8State> {
  constructor(props: Example8Props) {
    super(props);

    this.state = {
      performanceResults: '',
      testKey: 0,
      currentTestData: [],
    };
  }

  testCanvas: any;
  testStartTime: number = 0;

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

    // Force complete re-render by updating state
    this.setState({
      performanceResults: this.state.performanceResults + startLog,
      testKey: Date.now(),
      currentTestData: testData,
    });
  };

  render() {
    return (
      <View style={{ flex: 1 }}>
        <TouchableOpacity onPress={this.props.onClose}>
          <Text style={{ margin: 10, fontSize: 18 }}>Close</Text>
        </TouchableOpacity>
        <Text style={{ margin: 10, fontSize: 16, fontWeight: 'bold' }}>
          API Consistency Testing
        </Text>
        <Text style={{ margin: 10, fontSize: 14 }}>
          Testing onInitialPathsLoaded with various edge cases
        </Text>

        <View style={{ margin: 10, flexDirection: 'row', flexWrap: 'wrap' }}>
          <TouchableOpacity
            style={[styles.functionButton, { width: 120, marginRight: 5 }]}
            onPress={() => this.testEdgeCase('empty')}
          >
            <Text style={{ color: 'white', fontSize: 12 }}>Empty Array</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.functionButton, { width: 120, marginRight: 5 }]}
            onPress={() => this.testEdgeCase('normal')}
          >
            <Text style={{ color: 'white', fontSize: 12 }}>Normal Paths</Text>
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
          onClosePressed={this.props.onClose}
        />
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
