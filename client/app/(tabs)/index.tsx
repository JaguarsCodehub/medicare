import { Button, StyleSheet, TextInput } from 'react-native'
import React from 'react'
import { router } from 'expo-router'
import { Text, View } from '@/components/Themed'
import Colors from '@/constants/Colors'
import { useColorScheme } from '@/components/useColorScheme'

const Home = () => {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Welcome to Medicare</Text>
        <Text style={styles.subtitle}>
          Your trusted companion for health and medication management
        </Text>
      </View>

      <View style={styles.buttonContainer}>
        <Button
          title='Login'
          onPress={() => router.push('/(auth)/login')}
          // color={colors.tint}
        />
        <View style={styles.buttonSpacer} />
        <Button
          title='Register'
          onPress={() => router.push('/(auth)/register')}
          // color={colors.tint}
        />
      </View>

      <View>
        <View style={{ marginBottom: 10, marginTop: 10 }}>
          <Button
            title='Add Medication'
            onPress={() => router.push('/(medications)/add')}
          />
        </View>

        <View style={{ marginBottom: 10 }}>
          <Button
            title='View Medication Schedule'
            onPress={() => router.push('/(medications)/schedule')}
          />
        </View>
      </View>
    </View>
  );
}

export default Home

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    opacity: 0.7,
  },
  buttonContainer: {
    width: '100%',
    paddingHorizontal: 20,
  },
  buttonSpacer: {
    height: 15,
  }
})