// app/medications/schedule.tsx

import React, { useEffect, useState } from 'react';
import { View, Text, Button, ScrollView, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { api } from '../../lib/api';
import { getUserEmail } from '@/lib/tokenStorage';
import { Text as ThemedText, View as ThemedView } from '@/components/Themed';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { MaterialIcons } from '@expo/vector-icons';

type Medication = {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  times: string[];
  takenLog: {
    id: string;
    timestamp: string;
    status: 'TAKEN' | 'MISSED';
  }[];
};

export default function MedicationScheduleScreen() {
  const [medications, setMedications] = useState<Medication[]>([]);
  const [message, setMessage] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const fetchMedications = async () => {
    try {
      const email = await getUserEmail();
      if (!email) {
        setMessage('Please login again');
        return;
      }

      const res = await api.get('/medications', {
        params: { email }
      });
      setMedications(res.data);
    } catch (err: any) {
      console.error("Medications Schedule", err.message);
      setMessage('Error fetching medications');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchMedications();
    setRefreshing(false);
  };

  useEffect(() => {
    fetchMedications();
  }, []);

  const isTimeTaken = (
    takenLog: Medication['takenLog'],
    time: string
  ): 'TAKEN' | 'MISSED' | null => {
    const today = new Date().toISOString().split('T')[0];
    for (const log of takenLog) {
      if (
        log.timestamp.startsWith(today) &&
        log.timestamp.includes(`${time}:00`)
      ) {
        return log.status;
      }
    }
    return null;
  };

  const handleMark = async (
    medicationId: string,
    time: string,
    status: 'TAKEN' | 'MISSED'
  ) => {
    try {
      const email = await getUserEmail();
      if (!email) {
        setMessage('Please login again');
        return;
      }

      await api.post(`/medications/${medicationId}/taken-log`, {
        time,
        status,
        email
      });
      setMessage(`Marked ${status} for ${time}`);
      await fetchMedications();
    } catch (err: any) {
      setMessage(err.response?.data?.error || 'Error marking');
    }
  };

  const getStatusColor = (status: 'TAKEN' | 'MISSED' | null) => {
    switch (status) {
      case 'TAKEN':
        return '#00c267';
      case 'MISSED':
        return '#C62828';
      default:
        return '#546E7A';
    }
  };

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <ThemedView style={styles.header}>
        <View style={styles.headerContent}>
          <MaterialIcons name="schedule" size={32} color="#FFFFFF" style={styles.headerIcon} />
          <View>
            <ThemedText style={styles.title}>Today's Schedule</ThemedText>
            <ThemedText style={styles.subtitle}>
              {medications.length} medications scheduled
            </ThemedText>
          </View>
        </View>
      </ThemedView>

      {medications.map((med) => (
        <ThemedView key={med.id} style={styles.medicationCard}>
          <View style={styles.medicationHeader}>
            <View style={styles.medicationTitleContainer}>
              <MaterialIcons name="medication" size={24} color="#2C3E50" style={styles.medicationIcon} />
              <ThemedText style={styles.medicationName}>{med.name}</ThemedText>
            </View>
            <View style={styles.dosageBadge}>
              <MaterialIcons name="fiber-manual-record" size={8} color="#1976D2" style={styles.dosageIcon} />
              <ThemedText style={styles.dosageText}>{med.dosage}</ThemedText>
            </View>
          </View>

          <View style={styles.frequencyContainer}>
            <MaterialIcons name="repeat" size={16} color="#7F8C8D" style={styles.frequencyIcon} />
            <ThemedText style={styles.frequencyText}>{med.frequency}</ThemedText>
          </View>

          <View style={styles.timesContainer}>
            {med.times.map((time) => {
              const status = isTimeTaken(med.takenLog, time);
              return (
                <View key={time} style={styles.timeSlot}>
                  <View style={styles.timeHeader}>
                    <View style={styles.timeInfo}>
                      <MaterialIcons name="access-time" size={16} color="#2C3E50" style={styles.timeIcon} />
                      <ThemedText style={styles.timeText}>{time}</ThemedText>
                    </View>
                    <View style={[styles.statusIndicator, { backgroundColor: getStatusColor(status) }]} />
                  </View>

                  {status === null && (
                    <View style={styles.actionButtons}>
                      <TouchableOpacity
                        style={[styles.actionButton, styles.takenButton]}
                        onPress={() => handleMark(med.id, time, 'TAKEN')}
                      >
                        <MaterialIcons name="check-circle" size={20} color="#FFFFFF" style={styles.buttonIcon} />
                        <ThemedText style={styles.actionButtonText}>Taken</ThemedText>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionButton, styles.missedButton]}
                        onPress={() => handleMark(med.id, time, 'MISSED')}
                      >
                        <MaterialIcons name="cancel" size={20} color="#FFFFFF" style={styles.buttonIcon} />
                        <ThemedText style={styles.actionButtonText}>Missed</ThemedText>
                      </TouchableOpacity>
                    </View>
                  )}

                  {status && (
                    <View style={styles.statusContainer}>
                      <MaterialIcons 
                        name={status === 'TAKEN' ? 'check-circle' : 'cancel'} 
                        size={20} 
                        color={getStatusColor(status)} 
                        style={styles.statusIcon} 
                      />
                      <ThemedText style={[styles.statusText, { color: getStatusColor(status) }]}>
                        {status === 'TAKEN' ? 'Taken' : 'Missed'}
                      </ThemedText>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </ThemedView>
      ))}

      {message ? (
        <ThemedView style={styles.messageContainer}>
          <MaterialIcons name="info" size={20} color="#E65100" style={styles.messageIcon} />
          <ThemedText style={styles.message}>{message}</ThemedText>
        </ThemedView>
      ) : null}

      {medications.length === 0 && (
        <ThemedView style={styles.emptyState}>
          <MaterialIcons name="event-busy" size={48} color="#7F8C8D" style={styles.emptyStateIcon} />
          <ThemedText style={styles.emptyStateText}>
            No medications scheduled for today
          </ThemedText>
        </ThemedView>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  header: {
    padding: 20,
    paddingTop: 40,
    backgroundColor: '#4A90E2',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIcon: {
    marginRight: 15,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#FFFFFF',
    opacity: 0.8,
  },
  medicationCard: {
    margin: 10,
    padding: 15,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  medicationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  medicationTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  medicationIcon: {
    marginRight: 8,
  },
  medicationName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  dosageBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  dosageIcon: {
    marginRight: 4,
  },
  dosageText: {
    color: '#1976D2',
    fontSize: 14,
    fontWeight: '500',
  },
  frequencyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  frequencyIcon: {
    marginRight: 6,
  },
  frequencyText: {
    color: '#7F8C8D',
    fontSize: 14,
  },
  timesContainer: {
    gap: 10,
  },
  timeSlot: {
    borderTopWidth: 1,
    borderTopColor: '#ECF0F1',
    paddingTop: 10,
  },
  timeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  timeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeIcon: {
    marginRight: 6,
  },
  timeText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#2C3E50',
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    borderRadius: 8,
    gap: 6,
  },
  takenButton: {
    backgroundColor: '#00875A',
  },
  missedButton: {
    backgroundColor: '#C62828',
  },
  buttonIcon: {
    marginRight: 4,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusIcon: {
    marginRight: 4,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
  },
  messageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 10,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#FFF3E0',
  },
  messageIcon: {
    marginRight: 8,
  },
  message: {
    flex: 1,
    color: '#E65100',
    fontSize: 14,
  },
  emptyState: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateIcon: {
    marginBottom: 12,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#7F8C8D',
    textAlign: 'center',
  },
});
