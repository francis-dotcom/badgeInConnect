import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Card, Button, Chip } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
  // ... imports 
import { useAuth } from '../context/AuthContext';
import { TimeRecordService } from '../services/TimeRecordService';

interface ActiveShift {
    id: string;
    caregiver_id: string;
    client_id: string;
    client_name: string;
    clock_in_time: string;
    scheduled_start: string;
    scheduled_end: string;
    notes?: string;
}

interface Client {
    id: string;
    name: string;
}

// ... inside component
export default function ClockInOutScreen() {
  const { user } = useAuth();
  const [activeShift, setActiveShift] = useState<ActiveShift | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clockInNotes, setClockInNotes] = useState('');
  const [clockOutNotes, setClockOutNotes] = useState('');
  const [breakDuration, setBreakDuration] = useState('0');
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isClocking, setIsClocking] = useState(false);
  const [locationPermission, setLocationPermission] = useState(false);
  const [earlyExitCode, setEarlyExitCode] = useState('');
  const [showEarlyExitInput, setShowEarlyExitInput] = useState(false);

  useEffect(() => {
    loadData();
    requestLocationPermission();
  }, []);

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationPermission(status === 'granted');
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        setLocation({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });
      }
    } catch (error) {
      console.error('Location permission error:', error);
    }
  };

  // Update loadData
  const loadData = async () => {
    if (!user?.email) return;
    try {
      setIsLoading(true);
      const timeRecordService = new TimeRecordService();
      
      const [shiftData, clientsData] = await Promise.all([
        timeRecordService.getActiveShift(user.email),
        timeRecordService.getClients(), // This one is still local mock, might want to fix later?
      ]);

      setActiveShift(shiftData);
      // For clients: The user might want real clients too? 
      // I'll leave clients as local for now unless asked, to reduce scope creep risk, 
      // OR I can quickly wire it to /api/admin/clients list if easy?
      // Actually, let's keep clients local for this step to minimize breakage, 
      // as the user specifically asked for "Clock In" wiring.
      setClients(clientsData); 
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  // ... handleClockIn
  const handleClockIn = async () => {
    if (!selectedClient || !user?.email) {
      Alert.alert('Error', 'Please select a client and ensure you are logged in');
      return;
    }

    try {
      setIsClocking(true);
      const timeRecordService = new TimeRecordService();
      
      const result = await timeRecordService.clockIn({
        client_id: selectedClient.id,
        notes: clockInNotes.trim() || undefined,
        location_gps_in: location || undefined,
      }, user.email);

      if (result.success) {
        Alert.alert('Success', 'Successfully clocked in!');
        setClockInNotes('');
        setSelectedClient(null);
        await loadData();
      } else {
        Alert.alert('Error', result.error || 'Failed to clock in');
      }
    } catch (error) {
       // ...
    } finally {
      setIsClocking(false);
    }
  };

  // ... handleClockOut
  const handleClockOut = async () => {
    if (!activeShift || !user?.email) {
      Alert.alert('Error', 'No active shift found');
      return;
    }

    try {
      setIsClocking(true);
      const timeRecordService = new TimeRecordService();
      
      const isEarly = activeShift.scheduled_end && new Date() < new Date(activeShift.scheduled_end);
      
      if (isEarly && !earlyExitCode) {
        setShowEarlyExitInput(true);
        Alert.alert('Early Clock-Out', 'You are clocking out before your scheduled end time. Please enter an Early Exit Code from your supervisor.');
        return;
      }

      const result = await timeRecordService.clockOut({
        time_record_id: activeShift.id,
        break_duration_minutes: parseInt(breakDuration) || 0,
        final_notes: clockOutNotes.trim() || undefined,
        location_gps_out: location || undefined,
        early_exit_code: isEarly ? earlyExitCode : undefined
      }, user.email);

      // ... success/fail handling ...
    } catch (error) {
       // ...
    } finally {
      setIsClocking(false);
    }
  };

  const formatDuration = (startTime: string) => {
    const start = new Date(startTime);
    const now = new Date();
    const diff = now.getTime() - start.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Time Tracking</Text>
        <Text style={styles.subtitle}>Clock in and out of your shifts</Text>
      </View>

      {/* Location Status */}
      <View style={styles.locationStatus}>
        <Ionicons 
          name={location ? "location" : "location-outline"} 
          size={20} 
          color={location ? "#10b981" : "#6b7280"} 
        />
        <Text style={[styles.locationText, location && styles.locationTextActive]}>
          {location ? 'Location tracked' : 'Location unavailable'}
        </Text>
      </View>

      {/* Active Shift Display */}
      {activeShift && (
        <Card style={styles.activeShiftCard}>
          <View style={styles.activeShiftContent}>
            <View style={styles.activeShiftHeader}>
              <Ionicons name="time" size={24} color="#10b981" />
              <Text style={styles.activeShiftTitle}>Active Shift</Text>
              <Chip style={styles.activeChip}>Active</Chip>
            </View>
            <Text style={styles.activeShiftTime}>
              Duration: {formatDuration(activeShift.clock_in_time)}
            </Text>
            <Text style={styles.activeShiftClient}>
              Client: {activeShift.client_name || 'Selected Client'}
            </Text>
            <Text style={styles.activeShiftStart}>
              Started: {new Date(activeShift.clock_in_time).toLocaleString()}
            </Text>
          </View>
        </Card>
      )}

      {/* Clock In Form */}
      {!activeShift && (
        <Card style={styles.formCard}>
          <Text style={styles.formTitle}>Clock In</Text>
          
          {/* Client Selection */}
          <Text style={styles.label}>Select Client</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.clientScroll}>
            {clients.map((client) => (
              <TouchableOpacity
                key={client.id}
                style={[
                  styles.clientChip,
                  selectedClient?.id === client.id && styles.clientChipSelected,
                ]}
                onPress={() => setSelectedClient(client)}
              >
                <Text style={[
                  styles.clientChipText,
                  selectedClient?.id === client.id && styles.clientChipTextSelected,
                ]}>
                  {client.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Clock In Notes */}
          <Text style={styles.label}>Shift Notes (Optional)</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Any notes about the start of your shift..."
            value={clockInNotes}
            onChangeText={setClockInNotes}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />

          <Button
            mode="contained"
            onPress={handleClockIn}
            disabled={isClocking || !selectedClient}
            loading={isClocking}
            style={styles.clockButton}
            contentStyle={styles.clockButtonContent}
          >
            <Ionicons name="time" size={20} color="white" />
            <Text style={styles.clockButtonText}>Clock In</Text>
          </Button>
        </Card>
      )}

      {/* Clock Out Form */}
      {activeShift && (
        <Card style={styles.formCard}>
          <Text style={styles.formTitle}>Clock Out</Text>
          
          {/* Break Duration */}
          <Text style={styles.label}>Break Duration (minutes)</Text>
          <TextInput
            style={styles.textInput}
            placeholder="0"
            value={breakDuration}
            onChangeText={setBreakDuration}
            keyboardType="numeric"
          />

          {/* Clock Out Notes */}
          <Text style={styles.label}>End of Shift Notes</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Summary of the shift, any concerns, or important updates..."
            value={clockOutNotes}
            onChangeText={setClockOutNotes}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />

          {showEarlyExitInput && (
            <View style={styles.earlyExitContainer}>
              <Text style={[styles.label, styles.earlyExitLabel]}>Early Exit Code (Required)</Text>
              <TextInput
                style={[styles.textInput, styles.earlyExitInput]}
                placeholder="Enter 6-digit code"
                value={earlyExitCode}
                onChangeText={setEarlyExitCode}
                keyboardType="numeric"
                maxLength={10}
              />
            </View>
          )}

          <Button
            mode="contained"
            onPress={handleClockOut}
            disabled={isClocking}
            loading={isClocking}
            style={[styles.clockButton, styles.clockOutButton]}
            contentStyle={styles.clockButtonContent}
          >
            <Ionicons name="time" size={20} color="white" />
            <Text style={styles.clockButtonText}>Clock Out</Text>
          </Button>
        </Card>
      )}

      {/* Quick Actions */}
      <Card style={styles.actionsCard}>
        <Text style={styles.actionsTitle}>Quick Actions</Text>
        <View style={styles.actionsContainer}>
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="document-text" size={24} color="#2563EB" />
            <Text style={styles.actionButtonText}>Add Note</Text>
          </TouchableOpacity>
        </View>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  contentContainer: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 4,
  },
  locationStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    padding: 12,
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
  },
  locationText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#6b7280',
  },
  locationTextActive: {
    color: '#10b981',
  },
  activeShiftCard: {
    marginBottom: 20,
    backgroundColor: '#ecfdf5',
    borderColor: '#10b981',
    borderWidth: 1,
  },
  activeShiftContent: {
    padding: 16,
  },
  activeShiftHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  activeShiftTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#065f46',
    marginLeft: 8,
    flex: 1,
  },
  activeChip: {
    backgroundColor: '#10b981',
  },
  activeShiftTime: {
    fontSize: 16,
    color: '#065f46',
    marginBottom: 4,
  },
  activeShiftClient: {
    fontSize: 16,
    color: '#065f46',
    marginBottom: 4,
  },
  activeShiftStart: {
    fontSize: 14,
    color: '#047857',
  },
  formCard: {
    marginBottom: 20,
    padding: 16,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  clientScroll: {
    marginBottom: 16,
  },
  clientChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f3f4f6',
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  clientChipSelected: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  clientChipText: {
    fontSize: 14,
    color: '#374151',
  },
  clientChipTextSelected: {
    color: 'white',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9fafb',
    marginBottom: 16,
    minHeight: 80,
  },
  clockButton: {
    backgroundColor: '#2563EB',
  },
  clockOutButton: {
    backgroundColor: '#dc2626',
  },
  clockButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  clockButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  actionsCard: {
    padding: 16,
  },
  actionsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  actionButton: {
    alignItems: 'center',
    padding: 16,
  },
  actionButtonText: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 8,
  },
  earlyExitContainer: {
    backgroundColor: '#fffbeb',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fde68a',
    marginBottom: 16,
  },
  earlyExitLabel: {
    color: '#92400e',
    fontSize: 14,
    marginBottom: 8,
  },
  earlyExitInput: {
    backgroundColor: 'white',
    marginBottom: 0,
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 4,
  },
});
