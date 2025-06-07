// app/medications/add.tsx

import React, { useState } from 'react';
import { View, TextInput, Button, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { api } from '../../lib/api';
import { getUserEmail } from '@/lib/tokenStorage';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Stack } from 'expo-router';

type MedicationCategory = 'Tablet' | 'Capsule' | 'Syrup';

export default function AddMedicationScreen() {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<MedicationCategory>('Tablet');
  const [dosage, setDosage] = useState('1');
  const [frequency, setFrequency] = useState('Once daily');
  const [times, setTimes] = useState<string[]>(['']);
  const [message, setMessage] = useState('');
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [currentTimeIndex, setCurrentTimeIndex] = useState(0);

  // Generate numbers 1-9 for tablet/capsule dosage
  const dosageNumbers = Array.from({ length: 9 }, (_, i) => (i + 1).toString());

  const handleAddTime = () => {
    setTimes([...times, '']);
  };

  const handleTimePress = (index: number) => {
    setCurrentTimeIndex(index);
    setShowTimePicker(true);
  };

  const handleTimeChange = (event: any, selectedTime?: Date) => {
    setShowTimePicker(false);
    if (selectedTime) {
      const hours = selectedTime.getHours().toString().padStart(2, '0');
      const minutes = selectedTime.getMinutes().toString().padStart(2, '0');
      const timeString = `${hours}:${minutes}`;
      
      const newTimes = [...times];
      newTimes[currentTimeIndex] = timeString;
      setTimes(newTimes);
    }
  };

  const handleRemoveTime = (index: number) => {
    const newTimes = times.filter((_, i) => i !== index);
    setTimes(newTimes.length ? newTimes : ['']);
  };

  const handleSubmit = async () => {
    try {
      const email = await getUserEmail();
      if (!email) {
        setMessage('Please login again');
        return;
      }

      // Filter out empty times
      const validTimes = times.filter(time => time.trim() !== '');

      if (validTimes.length === 0) {
        setMessage('Please add at least one time');
        return;
      }

      // Format dosage based on category
      const formattedDosage = category === 'Syrup' 
        ? `${dosage} ml`
        : `${dosage} ${category}${Number(dosage) > 1 ? 's' : ''}`;

      await api.post('/medications', {
        name,
        dosage: formattedDosage,
        frequency,
        times: validTimes,
        email
      });

      setMessage('Medication added successfully!');
      // Reset form
      setName('');
      setCategory('Tablet');
      setDosage('1');
      setFrequency('Once daily');
      setTimes(['']);
    } catch (err: any) {
      setMessage(err.response?.data?.error || 'Error adding medication');
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* <Stack.Screen options={{headerShown: false}} /> */}
      <Text style={styles.label}>Medication Name:</Text>
      <TextInput
        value={name}
        onChangeText={setName}
        style={styles.input}
        placeholder="Enter medication name"
      />

      <Text style={styles.label}>Category:</Text>
      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={category}
          onValueChange={(value) => {
            setCategory(value as MedicationCategory);
            setDosage('1'); // Reset dosage when category changes
          }}
          style={styles.picker}
        >
          <Picker.Item label="Tablet" value="Tablet" />
          <Picker.Item label="Capsule" value="Capsule" />
          <Picker.Item label="Syrup" value="Syrup" />
        </Picker>
      </View>

      <Text style={styles.label}>Dosage:</Text>
      <View style={styles.dosageContainer}>
        <TextInput
          value={dosage}
          onChangeText={(value) => {
            // Only allow numbers
            if (value === '' || /^\d+$/.test(value)) {
              setDosage(value);
            }
          }}
          style={[styles.input, styles.dosageInput]}
          placeholder="Enter amount"
          keyboardType="numeric"
          maxLength={2}
        />
        <Text style={styles.dosageUnit}>
          {category === 'Syrup' 
            ? 'ml' 
            : `${category}${Number(dosage) > 1 ? 's' : ''}`}
        </Text>
      </View>

      <Text style={styles.label}>Frequency:</Text>
      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={frequency}
          onValueChange={(itemValue) => setFrequency(itemValue)}
          style={styles.picker}
        >
          <Picker.Item label='Once daily' value='Once daily' />
          <Picker.Item label='Twice daily' value='Twice daily' />
          <Picker.Item label='Three times daily' value='Three times daily' />
          <Picker.Item label='Every 8 hours' value='Every 8 hours' />
          <Picker.Item label='Once a week' value='Once a week' />
        </Picker>
      </View>

      <Text style={styles.label}>Times:</Text>
      {times.map((time, index) => (
        <View key={index} style={styles.timeContainer}>
          <TouchableOpacity 
            style={styles.timeButton}
            onPress={() => handleTimePress(index)}
          >
            <Text style={styles.timeButtonText}>
              {time || 'Select Time'}
            </Text>
          </TouchableOpacity>
          {times.length > 1 && (
            <TouchableOpacity 
              style={styles.removeButton}
              onPress={() => handleRemoveTime(index)}
            >
              <Text style={styles.removeButtonText}>×</Text>
            </TouchableOpacity>
          )}
        </View>
      ))}

      <TouchableOpacity 
        style={styles.addTimeButton}
        onPress={handleAddTime}
      >
        <Text style={styles.addTimeButtonText}>+ Add Another Time</Text>
      </TouchableOpacity>

      {showTimePicker && (
        <DateTimePicker
          value={new Date()}
          mode="time"
          is24Hour={true}
          display="default"
          onChange={handleTimeChange}
        />
      )}

      <TouchableOpacity 
        style={styles.submitButton}
        onPress={handleSubmit}
      >
        <Text style={styles.submitButtonText}>Save Medication</Text>
      </TouchableOpacity>

      {message ? <Text style={styles.message}>{message}</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#fff',
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    fontSize: 16,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 15,
  },
  picker: {
    height: 50,
  },
  dosageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  dosageInput: {
    flex: 1,
    marginBottom: 0,
    marginRight: 10,
  },
  dosageUnit: {
    fontSize: 16,
    color: '#666',
    marginLeft: 10,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  timeButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#f8f8f8',
  },
  timeButtonText: {
    fontSize: 16,
    color: '#333',
  },
  removeButton: {
    marginLeft: 10,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButtonText: {
    fontSize: 24,
    color: '#ff4444',
  },
  addTimeButton: {
    marginVertical: 10,
    padding: 12,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    alignItems: 'center',
  },
  addTimeButtonText: {
    color: '#666',
    fontSize: 16,
  },
  submitButton: {
    marginTop: 20,
    backgroundColor: '#4A90E2',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  message: {
    marginTop: 20,
    textAlign: 'center',
    color: '#E74C3C',
  },
});
