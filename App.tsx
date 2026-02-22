import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>CAREGIVER CLOCK APP</Text>
      <Text style={styles.text}>If you see this, it's working!</Text>
      <Text style={styles.text}>Try refreshing the browser...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#e3f2fd',
    padding: 20,
  },
  text: {
    fontSize: 20,
    color: '#1976d2',
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
});
