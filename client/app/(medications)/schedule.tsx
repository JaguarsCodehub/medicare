// app/medications/schedule.tsx

import React, { useEffect, useState } from 'react';
import { View, Text, Button, ScrollView, StyleSheet, TouchableOpacity, RefreshControl, ActivityIndicator, Dimensions } from 'react-native';
import { api } from '../../lib/api';
import { getUserEmail } from '@/lib/tokenStorage';
import { Text as ThemedText, View as ThemedView } from '@/components/Themed';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack } from 'expo-router';
import { Calendar } from 'react-native-calendars';

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

type TimeStatus = {
  time: string;
  status: 'TAKEN' | 'MISSED' | 'PENDING';
};

type MedicationScheduleItem = {
  medicationId: string;
  name: string;
  dosage: string;
  times: TimeStatus[];
};

type ActivityData = {
  date: string;
  status: 'TAKEN' | 'MISSED' | 'PENDING';
  totalMedications: number;
  takenCount: number;
  missedCount: number;
};

export default function MedicationScheduleScreen() {
  const [schedule, setSchedule] = useState<MedicationScheduleItem[]>([]);
  const [activityData, setActivityData] = useState<ActivityData[]>([]);
  const [message, setMessage] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<{[key: string]: boolean}>({});
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isToday, setIsToday] = useState(true);
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const fetchActivityData = async () => {
    try {
      const email = await getUserEmail();
      if (!email) {
        setMessage('Please login again');
        return;
      }

      const res = await api.get('/medications/activity', {
        params: { email },
      });
      console.log('Received activity data:', res.data);
      setActivityData(res.data);
    } catch (err: any) {
      console.error('Error fetching activity data:', err);
      setMessage(err.response?.data?.error || 'Error fetching activity data');
    }
  };

  const fetchSchedule = async (date?: Date) => {
    try {
      const email = await getUserEmail();
      if (!email) {
        setMessage('Please login again');
        return;
      }

      const dateToFetch = date || selectedDate;
      const dateStr = dateToFetch.toISOString().split('T')[0];

      const res = await api.get('/medications/schedule', {
        params: { 
          email,
          date: dateStr
        },
      });
      console.log('Received schedule data:', res.data);
      setSchedule(res.data.medications);
      setIsToday(res.data.isToday);
      setMessage('');
    } catch (err: any) {
      console.error('Error fetching schedule:', err);
      setMessage(err.response?.data?.error || 'Error fetching schedule');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchSchedule(), fetchActivityData()]);
    setRefreshing(false);
  };

  useEffect(() => {
    fetchSchedule();
    fetchActivityData();
  }, []);

  const handleDateSelect = (date: any) => {
    const newDate = new Date(date.timestamp);
    setSelectedDate(newDate);
    fetchSchedule(newDate);
  };

  const handleMark = async (
    medicationId: string,
    time: string,
    status: 'TAKEN' | 'MISSED'
  ) => {
    const key = `${medicationId}-${time}`;
    try {
      setProcessingStatus(prev => ({ ...prev, [key]: true }));
      const email = await getUserEmail();
      if (!email) {
        setMessage('Please login again');
        return;
      }

      console.log('Marking medication:', { medicationId, time, status });
      const response = await api.post(`/medications/${medicationId}/taken-log`, {
        time,
        status,
        email
      });
      console.log('Mark response:', response.data);

      // Update the schedule with the new data
      setSchedule(prevSchedule => {
        const newSchedule = prevSchedule.map(med => {
          if (med.medicationId === medicationId) {
            return {
              ...med,
              times: med.times.map(timeSlot => {
                if (timeSlot.time === time) {
                  return {
                    ...timeSlot,
                    status: status
                  };
                }
                return timeSlot;
              })
            };
          }
          return med;
        });
        console.log('Updated schedule:', newSchedule);
        return newSchedule;
      });

      setMessage(`Marked ${status} for ${time}`);
    } catch (err: any) {
      console.error('Error marking medication:', err);
      setMessage(err.response?.data?.error || 'Error marking');
      // Revert optimistic update on error
      await fetchSchedule();
    } finally {
      setProcessingStatus(prev => ({ ...prev, [key]: false }));
    }
  };

  const getStatusColor = (status: 'TAKEN' | 'MISSED' | 'PENDING') => {
    switch (status) {
      case 'TAKEN':
        return '#10B981'; // Emerald
      case 'MISSED':
        return '#EF4444'; // Red
      case 'PENDING':
        return '#6B7280'; // Gray
      default:
        return '#6B7280';
    }
  };

  const getStatusIcon = (status: 'TAKEN' | 'MISSED' | 'PENDING') => {
    switch (status) {
      case 'TAKEN':
        return 'checkmark-circle';
      case 'MISSED':
        return 'close-circle';
      case 'PENDING':
        return 'time';
      default:
        return 'time';
    }
  };

  const renderActivityGraph = () => {
    if (activityData.length === 0) {
      return null;
    }

    return (
      <View style={styles.activityGraphContainer}>
        <View style={styles.activityGraphHeader}>
          <Text style={styles.activityGraphTitle}>Weekly Activity</Text>
          <View style={styles.activityGraphLegend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
              <Text style={styles.legendText}>Taken</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#EF4444' }]} />
              <Text style={styles.legendText}>Missed</Text>
            </View>
          </View>
        </View>
        <View style={styles.activityGraph}>
          {activityData.map((day, index) => (
            <View key={index} style={styles.activityDay}>
              <View style={styles.activitySquareContainer}>
                <View 
                  style={[
                    styles.activitySquare,
                    { backgroundColor: getStatusColor(day.status) }
                  ]} 
                />
                <Text style={styles.activityCount}>
                  {day.takenCount}/{day.totalMedications}
                </Text>
              </View>
              <Text style={styles.activityDayText}>
                {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}
              </Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderCalendar = () => {
    const today = new Date().toISOString().split('T')[0];
    const selectedDateStr = selectedDate.toISOString().split('T')[0];

    return (
      <View style={styles.calendarContainer}>
        <Calendar
          current={selectedDateStr}
          onDayPress={handleDateSelect}
          markedDates={{
            [selectedDateStr]: { selected: true, selectedColor: '#4F46E5' },
            [today]: { marked: true, dotColor: '#4F46E5' }
          }}
          theme={{
            todayTextColor: '#4F46E5',
            selectedDayBackgroundColor: '#4F46E5',
            arrowColor: '#4F46E5',
          }}
        />
      </View>
    );
  };

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <Stack.Screen options={{headerShown: false}}/>
      <LinearGradient
        colors={['#4F46E5', '#7C3AED']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <View style={styles.headerTextContainer}>
            <Text style={styles.title}>
              {isToday ? "Today's Schedule" : selectedDate.toLocaleDateString('en-US', { 
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </Text>
            <Text style={styles.subtitle}>
              {schedule.length} medications scheduled
            </Text>
          </View>
          <View style={styles.headerIconContainer}>
            <Ionicons name="calendar" size={32} color="#FFFFFF" />
          </View>
        </View>
      </LinearGradient>

      {renderCalendar()}
      {renderActivityGraph()}

      {schedule.map((med) => (
        <View key={med.medicationId} style={styles.medicationCard}>
          <View style={styles.medicationHeader}>
            <View style={styles.medicationTitleContainer}>
              <View style={styles.medicationIconContainer}>
                <Ionicons name="medkit" size={24} color="#4F46E5" />
              </View>
              <View>
                <Text style={styles.medicationName}>{med.name}</Text>
                <Text style={styles.dosageText}>{med.dosage}</Text>
              </View>
            </View>
          </View>

          <View style={styles.timesContainer}>
            {med.times.map((timeSlot) => {
              const key = `${med.medicationId}-${timeSlot.time}`;
              const isProcessing = processingStatus[key];

              return (
                <View key={timeSlot.time} style={styles.timeSlot}>
                  <View style={styles.timeHeader}>
                    <View style={styles.timeInfo}>
                      <Ionicons name="time" size={16} color="#4B5563" />
                      <Text style={styles.timeText}>{timeSlot.time}</Text>
                    </View>
                    <View style={[styles.statusIndicator, { backgroundColor: getStatusColor(timeSlot.status) }]} />
                  </View>

                  {timeSlot.status === 'PENDING' && isToday ? (
                    <View style={styles.actionButtons}>
                      <TouchableOpacity
                        style={[
                          styles.actionButton, 
                          styles.takenButton,
                          isProcessing && styles.disabledButton
                        ]}
                        onPress={() => handleMark(med.medicationId, timeSlot.time, 'TAKEN')}
                        disabled={isProcessing}
                      >
                        {isProcessing ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <>
                            <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                            <Text style={styles.actionButtonText}>Taken</Text>
                          </>
                        )}
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.actionButton, 
                          styles.missedButton,
                          isProcessing && styles.disabledButton
                        ]}
                        onPress={() => handleMark(med.medicationId, timeSlot.time, 'MISSED')}
                        disabled={isProcessing}
                      >
                        {isProcessing ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <>
                            <Ionicons name="close-circle" size={20} color="#FFFFFF" />
                            <Text style={styles.actionButtonText}>Missed</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={styles.statusContainer}>
                      <Ionicons 
                        name={getStatusIcon(timeSlot.status)} 
                        size={20} 
                        color={getStatusColor(timeSlot.status)} 
                      />
                      <Text style={[styles.statusText, { color: getStatusColor(timeSlot.status) }]}>
                        {timeSlot.status}
                      </Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </View>
      ))}

      {message ? (
        <View style={styles.messageContainer}>
          <Ionicons name="information-circle" size={20} color="#F59E0B" />
          <Text style={styles.message}>{message}</Text>
        </View>
      ) : null}

      {schedule.length === 0 && (
        <View style={styles.emptyState}>
          <Ionicons name="calendar" size={48} color="#9CA3AF" />
          <Text style={styles.emptyStateText}>
            No medications scheduled for {isToday ? 'today' : selectedDate.toLocaleDateString('en-US', { 
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    padding: 20,
    paddingTop: 40,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTextContainer: {
    flex: 1,
  },
  headerIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
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
  activityGraphContainer: {
    margin: 16,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  activityGraphTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  activityGraph: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 100,
  },
  activityDay: {
    alignItems: 'center',
  },
  activitySquare: {
    width: 24,
    height: 24,
    borderRadius: 4,
    marginBottom: 8,
  },
  activityDayText: {
    fontSize: 12,
    color: '#6B7280',
  },
  medicationCard: {
    margin: 16,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  medicationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  medicationTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  medicationIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  medicationName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  dosageText: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  timesContainer: {
    gap: 12,
  },
  timeSlot: {
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 12,
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
    gap: 6,
  },
  timeText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#4B5563',
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 6,
  },
  takenButton: {
    backgroundColor: '#10B981',
  },
  missedButton: {
    backgroundColor: '#EF4444',
  },
  disabledButton: {
    opacity: 0.7,
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
  statusText: {
    fontSize: 14,
    fontWeight: '500',
  },
  messageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#FEF3C7',
    gap: 8,
  },
  message: {
    flex: 1,
    color: '#92400E',
    fontSize: 14,
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 12,
  },
  activityGraphHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  activityGraphLegend: {
    flexDirection: 'row',
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 12,
    color: '#6B7280',
  },
  activitySquareContainer: {
    alignItems: 'center',
    gap: 4,
  },
  activityCount: {
    fontSize: 10,
    color: '#6B7280',
  },
  calendarContainer: {
    margin: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
});
