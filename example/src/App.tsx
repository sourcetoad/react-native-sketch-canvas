import React from 'react';
import { Button, SafeAreaView, StyleSheet } from 'react-native';
import { SketchCanvas } from '@sourcetoad/react-native-sketch-canvas';

export default function App() {
  const ref = React.useRef<SketchCanvas>(null);

  return (
    <SafeAreaView style={styles.container}>
      <SketchCanvas
        ref={ref}
        style={{
          backgroundColor: '#fff',
          width: '100%',
          height: 400,
          marginBottom: 30,
        }}
        onSketchSaved={(success, path) => {
          console.log(success ? 'saved' : 'failed', path);
        }}
        onGenerateBase64={(base64) => {
          console.log(base64);
        }}
        onPathsChange={(pathsCount) => {
          console.log(pathsCount);
        }}
      />

      <Button
        title="Save"
        onPress={() => {
          // get base64
          // ref.current?.getBase64('jpg', true, true, false, true);

          // save
          ref.current?.save('jpg', true, '', 'testimage', true, false, true);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5FCFF',
  },
  box: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    backgroundColor: '#eee',
  },
});
