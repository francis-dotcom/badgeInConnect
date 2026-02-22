import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  Platform,
} from 'react-native';
import { Card, Button, Chip } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { TimeRecordService } from '../services/TimeRecordService';
import { CONFIG } from "../constants/Config";

interface TimeRecord {
  id: string;
  caregiver_id: string;
  client_id: string;
  clock_in_time: string;
  clock_out_time?: string;
  break_duration_minutes: number;
  total_hours?: number;
  status: 'active' | 'completed' | 'adjusted';
  notes?: string;
  created_at: string;
  updated_at: string;
  client_name?: string;
}

interface HistoryStats {
  totalShifts: number;
  totalHours: number;
  totalEarnings: number;
}

import { useAuth } from "../context/AuthContext";

// ... imports

export default function HistoryScreen() {
  const { user } = useAuth();
  const [timeRecords, setTimeRecords] = useState<TimeRecord[]>([]);
  const [stats, setStats] = useState<HistoryStats>({
    totalShifts: 0,
    totalHours: 0,
    totalEarnings: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState<TimeRecord | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [filterPeriod, setFilterPeriod] = useState<'week' | 'month' | 'all'>('week');

  useEffect(() => {
    if (user?.email) {
      loadData();
    }
  }, [user, filterPeriod]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      
      // 1. Get Caregiver ID
      console.log('HistoryScreen: Fetching profile for', user?.email);
      const profileRes = await fetch(`${CONFIG.API_BASE_URL}/api/caregivers/profile?email=${user?.email}`);
      const profileData = await profileRes.json();
      
      if (!profileData.success || !profileData.caregiver) {
        console.error('HistoryScreen: Profile not found', profileData);
        throw new Error("Caregiver profile not found");
      }
      
      const caregiverId = profileData.caregiver.id;
      console.log('HistoryScreen: Caregiver ID:', caregiverId);

      // 2. Get Records
      const timeRecordService = new TimeRecordService();
      const records = await timeRecordService.getTimeRecords(caregiverId, 100);
      console.log('HistoryScreen: Fetched records count:', records.length);
      
      // Log statuses to debug filtering
      records.forEach(r => console.log(`Record ${r.id}: status=${r.status}, start=${r.clock_in_time}, end=${r.clock_out_time || 'null'}`));

      const filteredRecords = filterRecordsByPeriod(records);
      const calculatedStats = calculateStats(filteredRecords);
      
      setTimeRecords(filteredRecords);
      setStats(calculatedStats);
    } catch (error) {
      console.error('Error loading history:', error);
      // Alert.alert('Error', 'Failed to load history data'); // Suppress for cleaner UI on initial load
    } finally {
      setIsLoading(false);
    }
  };

  const filterRecordsByPeriod = (records: TimeRecord[]): TimeRecord[] => {
    if (filterPeriod === 'all') return records;
    
    const now = new Date();
    let cutoffDate = new Date();
    
    switch (filterPeriod) {
      case 'week':
        cutoffDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        cutoffDate.setMonth(now.getMonth() - 1);
        break;
    }
    
    return records.filter(record => 
      new Date(record.clock_in_time) >= cutoffDate
    );
  };

  const calculateStats = (records: TimeRecord[]): HistoryStats => {
    const completedRecords = records.filter(r => r.status === 'completed');
    const totalHours = completedRecords.reduce((sum, record) => 
      sum + (record.total_hours || 0), 0
    );
    
    const hourlyRate = 30; // Mock hourly rate
    const totalEarnings = totalHours * hourlyRate;
    
    return {
      totalShifts: completedRecords.length,
      totalHours: Math.round(totalHours * 10) / 10,
      totalEarnings: Math.round(totalEarnings),
    };
  };

  const formatDuration = (clockIn: string, clockOut?: string): string => {
    if (!clockOut) return 'Active';
    
    const start = new Date(clockIn);
    const end = new Date(clockOut);
    const diff = end.getTime() - start.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatTime = (dateString: string): string => {
    return new Date(dateString).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const calculateEarnings = (hours?: number): number => {
    const hourlyRate = 30;
    return Math.round((hours || 0) * hourlyRate);
  };

  const showRecordDetail = (record: TimeRecord) => {
    setSelectedRecord(record);
    setShowDetailModal(true);
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading history...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Time History</Text>
          <Text style={styles.subtitle}>View your work history and earnings</Text>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <Card style={styles.statCard}>
            <View style={styles.statContent}>
              <Ionicons name="calendar" size={24} color="#2563EB" />
              <Text style={styles.statValue}>{stats.totalShifts}</Text>
              <Text style={styles.statLabel}>Total Shifts</Text>
            </View>
          </Card>

          <Card style={styles.statCard}>
            <View style={styles.statContent}>
              <Ionicons name="time" size={24} color="#10b981" />
              <Text style={styles.statValue}>{stats.totalHours}</Text>
              <Text style={styles.statLabel}>Total Hours</Text>
            </View>
          </Card>

          <Card style={styles.statCard}>
            <View style={styles.statContent}>
              <Ionicons name="cash" size={24} color="#f59e0b" />
              <Text style={styles.statValue}>${stats.totalEarnings}</Text>
              <Text style={styles.statLabel}>Total Earnings</Text>
            </View>
          </Card>
        </View>

        {/* Filter Chips */}
        <View style={styles.filterContainer}>
          <Text style={styles.filterLabel}>Period</Text>
          <View style={styles.chipContainer}>
            {[
              { key: 'week' as const, label: 'Last Week' },
              { key: 'month' as const, label: 'Last Month' },
              { key: 'all' as const, label: 'All Time' },
            ].map((period) => (
              <TouchableOpacity
                key={period.key}
                onPress={() => setFilterPeriod(period.key)}
              >
                <Chip 
                  style={[
                    styles.filterChip,
                    filterPeriod === period.key && styles.filterChipSelected,
                  ]}
                >
                  {period.label}
                </Chip>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Time Records List */}
        {timeRecords.length === 0 ? (
          <Card style={styles.emptyCard}>
            <View style={styles.emptyContent}>
              <Ionicons name="time" size={48} color="#9ca3af" />
              <Text style={styles.emptyTitle}>No time records found</Text>
              <Text style={styles.emptySubtitle}>
                Try adjusting your filters or clock in to start tracking time
              </Text>
            </View>
          </Card>
        ) : (
          <View style={styles.recordsContainer}>
            {timeRecords.map((record) => (
              <Card key={record.id} style={styles.recordCard}>
                <TouchableOpacity onPress={() => showRecordDetail(record)}>
                  <View style={styles.recordHeader}>
                    <View style={styles.recordHeaderLeft}>
                      <Text style={styles.clientName}>
                        {record.client_name || 'Unknown Client'}
                      </Text>
                      <Chip 
                        style={[
                          styles.statusChip,
                          record.status === 'completed' && styles.statusChipCompleted,
                          record.status === 'active' && styles.statusChipActive,
                        ]}
                      >
                        {record.status === 'active' ? 'In Progress' : record.status}
                      </Chip>
                    </View>
                    <Text style={styles.recordDate}>
                      {formatDate(record.clock_in_time)}
                    </Text>
                  </View>

                  <View style={styles.recordDetails}>
                    <View style={styles.detailRow}>
                      <Ionicons name="time" size={16} color="#6b7280" />
                      <Text style={styles.detailText}>
                        {formatTime(record.clock_in_time)} - 
                        {record.clock_out_time ? formatTime(record.clock_out_time) : 'Active'}
                      </Text>
                    </View>

                    <View style={styles.detailRow}>
                      <Ionicons name="hourglass" size={16} color="#6b7280" />
                      <Text style={styles.detailText}>
                        {formatDuration(record.clock_in_time, record.clock_out_time)}
                      </Text>
                    </View>

                    <View style={styles.detailRow}>
                      <Ionicons name="cash" size={16} color="#6b7280" />
                      <Text style={styles.detailText}>
                        ${calculateEarnings(record.total_hours)}
                      </Text>
                    </View>
                  </View>

                  {record.notes && (
                    <View style={styles.notesSection}>
                      <Text style={styles.notesText} numberOfLines={2}>
                        {record.notes}
                      </Text>
                    </View>
                  )}

                  {record.break_duration_minutes > 0 && (
                    <Text style={styles.breakText}>
                      Break: {record.break_duration_minutes} minutes
                    </Text>
                  )}
                </TouchableOpacity>
              </Card>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Detail Modal */}
      <Modal
        visible={showDetailModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowDetailModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedRecord && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Shift Details</Text>
                  <TouchableOpacity onPress={() => setShowDetailModal(false)}>
                    <Ionicons name="close" size={24} color="#6b7280" />
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.modalBody}>
                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>Client & Status</Text>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Client:</Text>
                      <Text style={styles.detailValue}>
                        {selectedRecord.client_name || 'Unknown'}
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Status:</Text>
                      <Chip 
                        style={[
                          styles.statusChip,
                          selectedRecord.status === 'completed' && styles.statusChipCompleted,
                          selectedRecord.status === 'active' && styles.statusChipActive,
                        ]}
                      >
                        {selectedRecord.status === 'active' ? 'In Progress' : selectedRecord.status}
                      </Chip>
                    </View>
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>Time</Text>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Clock In:</Text>
                      <Text style={styles.detailValue}>
                        {new Date(selectedRecord.clock_in_time).toLocaleString()}
                      </Text>
                    </View>
                    {selectedRecord.clock_out_time && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Clock Out:</Text>
                        <Text style={styles.detailValue}>
                          {new Date(selectedRecord.clock_out_time).toLocaleString()}
                        </Text>
                      </View>
                    )}
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Duration:</Text>
                      <Text style={styles.detailValue}>
                        {formatDuration(selectedRecord.clock_in_time, selectedRecord.clock_out_time)}
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Total Hours:</Text>
                      <Text style={styles.detailValue}>
                        {selectedRecord.total_hours || 0} hours
                      </Text>
                    </View>
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>Earnings</Text>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Estimated:</Text>
                      <Text style={styles.detailValue}>
                        ${calculateEarnings(selectedRecord.total_hours)}
                      </Text>
                    </View>
                  </View>

                  {selectedRecord.break_duration_minutes > 0 && (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailSectionTitle}>Break</Text>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Duration:</Text>
                        <Text style={styles.detailValue}>
                          {selectedRecord.break_duration_minutes} minutes
                        </Text>
                      </View>
                    </View>
                  )}

                  {selectedRecord.notes && (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailSectionTitle}>Notes</Text>
                      <Text style={styles.notesDetailText}>
                        {selectedRecord.notes}
                      </Text>
                    </View>
                  )}
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const shadow = Platform.select({
  ios: {
    shadowColor: "#1A1918",
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 2 },
  },
  android: { elevation: 3 },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F4F1',
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 40,
    gap: 14,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F4F1',
  },
  loadingText: {
    fontSize: 14,
    color: '#6D6C6A',
    fontFamily: 'Outfit_500Medium',
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 0,
  },
  title: {
    fontSize: 18,
    color: '#1A1918',
    fontFamily: 'Outfit_600SemiBold',
  },
  subtitle: {
    fontSize: 12,
    color: '#6D6C6A',
    marginTop: 4,
    fontFamily: 'Outfit_400Regular',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  statCard: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    ...(shadow || {}),
  },
  statContent: {
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1918',
    fontFamily: 'Outfit_600SemiBold',
  },
  statLabel: {
    fontSize: 10,
    color: '#8E8D8A',
    textAlign: 'center',
    fontFamily: 'Outfit_400Regular',
  },
  filterContainer: {
    gap: 8,
  },
  filterLabel: {
    fontSize: 13,
    color: '#1A1918',
    fontFamily: 'Outfit_600SemiBold',
    paddingLeft: 2,
  },
  chipContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    backgroundColor: '#FFFFFF',
    height: 32,
    borderRadius: 10,
    ...(shadow || {}),
  },
  filterChipSelected: {
    backgroundColor: '#DDF3E6',
  },
  emptyCard: {
    padding: 30,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    ...(shadow || {}),
  },
  emptyContent: {
    alignItems: 'center',
    gap: 12,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1918',
    fontFamily: 'Outfit_600SemiBold',
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#6D6C6A',
    textAlign: 'center',
    fontFamily: 'Outfit_400Regular',
    maxWidth: 240,
  },
  recordsContainer: {
    gap: 12,
  },
  recordCard: {
    padding: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    ...(shadow || {}),
  },
  recordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  recordHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  clientName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1918',
    fontFamily: 'Outfit_600SemiBold',
  },
  statusChip: {
    backgroundColor: '#F4F8F5',
    height: 22,
    borderRadius: 999,
  },
  statusChipCompleted: {
    backgroundColor: '#DDF3E6',
  },
  statusChipActive: {
    backgroundColor: '#FFF3E8',
  },
  recordDate: {
    fontSize: 11,
    color: '#6D6C6A',
    fontFamily: 'Outfit_500Medium',
  },
  recordDetails: {
    gap: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#EFEDEA',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 12,
    color: '#4A4947',
    fontFamily: 'Outfit_400Regular',
  },
  notesSection: {
    backgroundColor: '#F5F4F1',
    padding: 10,
    borderRadius: 10,
    marginTop: 10,
  },
  notesText: {
    fontSize: 11,
    color: '#6D6C6A',
    fontStyle: 'italic',
    fontFamily: 'Outfit_400Regular',
  },
  breakText: {
    fontSize: 10,
    color: '#9C9B99',
    marginTop: 6,
    fontFamily: 'Outfit_400Regular',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(26, 25, 24, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    width: '100%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F4F1',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1918',
    fontFamily: 'Outfit_600SemiBold',
  },
  modalBody: {
    padding: 20,
  },
  detailSection: {
    marginBottom: 20,
  },
  detailSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1918',
    marginBottom: 12,
    fontFamily: 'Outfit_600SemiBold',
  },
  detailLabel: {
    fontSize: 12,
    color: '#6D6C6A',
    width: 90,
    fontFamily: 'Outfit_500Medium',
  },
  detailValue: {
    fontSize: 13,
    color: '#1A1918',
    flex: 1,
    fontFamily: 'Outfit_400Regular',
  },
  notesDetailText: {
    fontSize: 13,
    color: '#4B4A48',
    lineHeight: 20,
    fontFamily: 'Outfit_400Regular',
  },
});
