import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';

// Imported only to prove the mobile -> @journal/core workspace wiring resolves
// at runtime through Metro. No domain logic yet.
import { CORE_READY } from '@journal/core';

export default function App() {
  return (
    <View style={styles.container}>
      <Text>Journal — scaffolding placeholder</Text>
      <Text>@journal/core wired: {String(CORE_READY)}</Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
