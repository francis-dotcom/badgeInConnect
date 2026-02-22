import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Card, Button, Avatar } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { TimeRecordService } from '../services/TimeRecordService';

interface DashboardStats {
  totalHours: number;
  totalShifts: number;
  estimatedEarnings: number;
  currentShift: any;
}

export default function DashboardScreen() {
  const { user, logout } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalHours: 0,
    totalShifts: 0,
    estimatedEarnings: 0,
    currentShift: null,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      const timeRecordService = new TimeRecordService();
      
      // Get current shift
      const currentShift = await timeRecordService.getActiveShift();
      
      // Get week stats (mock data for now)
      const weekStats = {
        totalHours: 24.5,
        totalShifts: 6,
        estimatedEarnings: 728,
      };

      setStats({
        ...weekStats,
        currentShift,
      });
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      Alert.alert('Error', 'Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', onPress: logout, style: 'destructive' },
      ]
    );
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
        <Text>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.userInfo}>
          <Avatar.Text size={50} label={user?.name?.charAt(0).toUpperCase() || 'C'} />
          <View style={styles.userText}>
            <Text style={styles.userName}>Welcome back, {user?.name}</Text>
            <Text style={styles.userRole}>Caregiver</Text>
          </View>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Ionicons name="log-out-outline" size={24} color="#64748b" />
        </TouchableOpacity>
      </View>

      {/* Current Shift Status */}
      {stats.currentShift && (
        <Card style={styles.currentShiftCard}>
          <View style={styles.currentShiftContent}>
            <View style={styles.currentShiftHeader}>
              <Ionicons name="time" size={24} color="#10b981" />
              <Text style={styles.currentShiftTitle}>Current Shift</Text>
            </View>
            <Text style={styles.currentShiftTime}>
              Duration: {formatDuration(stats.currentShift.clock_in_time)}
            </Text>
            <Text style={styles.currentShiftClient}>
              Client: {stats.currentShift.client_name || 'Active'}
            </Text>
            <Text style={styles.currentShiftStart}>
              Started: {new Date(stats.currentShift.clock_in_time).toLocaleTimeString()}
            </Text>
          </View>
        </Card>
      )}

      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        <Card style={styles.statCard}>
          <View style={styles.statContent}>
            <Ionicons name="time" size={24} color="#2563EB" />
            <Text style={styles.statValue}>{stats.totalHours}</Text>
            <Text style={styles.statLabel}>Hours This Week</Text>
          </View>
        </Card>

        <Card style={styles.statCard}>
          <View style={styles.statContent}>
            <Ionicons name="calendar" size={24} color="#10b981" />
            <Text style={styles.statValue}>{stats.totalShifts}</Text>
            <Text style={styles.statLabel}>Total Shifts</Text>
          </View>
        </Card>

        <Card style={styles.statCard}>
          <View style={styles.statContent}>
            <Ionicons name="cash" size={24} color="#f59e0b" />
            <Text style={styles.statValue}>${stats.estimatedEarnings}</Text>
            <Text style={styles.statLabel}>Est. Earnings</Text>
          </View>
        </Card>
      </View>

      {/* Quick Actions */}
      <Card style={styles.actionsCard}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsContainer}>
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="person" size={24} color="#2563EB" />
            <Text style={styles.actionButtonText}>Edit Profile</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="document-text" size={24} color="#2563EB" />
            <Text style={styles.actionButtonText}>View Notes</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="list" size={24} color="#2563EB" />
            <Text style={styles.actionButtonText}>Work History</Text>
          </TouchableOpacity>
        </View>
      </Card>

      {/* Recent Activity */}
      <Card style={styles.activityCard}>
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        <Text style={styles.noActivityText}>
          No recent activity. Clock in to start tracking your time!
        </Text>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userText: {
    marginLeft: 12,
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  userRole: {
    fontSize: 14,
    color: '#6b7280',
  },
  logoutButton: {
    padding: 8,
  },
  currentShiftCard: {
    marginBottom: 20,
    backgroundColor: '#ecfdf5',
    borderColor: '#10b981',
    borderWidth: 1,
  },
  currentShiftContent: {
    padding: 16,
  },
  currentShiftHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  currentShiftTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#065f46',
    marginLeft: 8,
  },
  currentShiftTime: {
    fontSize: 14,
    color: '#065f46',
    marginBottom: 4,
  },
  currentShiftClient: {
    fontSize: 14,
    color: '#065f46',
    marginBottom: 4,
  },
  currentShiftStart: {
    fontSize: 12,
    color: '#047857',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    marginHorizontal: 4,
    alignItems: 'center',
    padding: 16,
  },
  statContent: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginVertical: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
  actionsCard: {
    marginBottom: 20,
    padding: 16,
  },
  sectionTitle: {
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
    padding: 12,
  },
  actionButtonText: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
    textAlign: 'center',
  },
  activityCard: {
    padding: 16,
  },
  noActivityText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
