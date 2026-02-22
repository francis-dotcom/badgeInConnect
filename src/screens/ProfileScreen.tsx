import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Card, Button, Avatar, List } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

export default function ProfileScreen() {
  const { user, logout } = useAuth();

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

  const menuItems = [
    {
      icon: 'person-outline',
      title: 'Edit Profile',
      description: 'Update your personal information',
      onPress: () => Alert.alert('Info', 'Edit profile feature coming soon'),
    },
    {
      icon: 'notifications-outline',
      title: 'Notifications',
      description: 'Manage your notification preferences',
      onPress: () => Alert.alert('Info', 'Notifications feature coming soon'),
    },
    {
      icon: 'shield-outline',
      title: 'Privacy & Security',
      description: 'Manage your privacy settings',
      onPress: () => Alert.alert('Info', 'Privacy settings coming soon'),
    },
    {
      icon: 'help-circle-outline',
      title: 'Help & Support',
      description: 'Get help with the app',
      onPress: () => Alert.alert('Info', 'Help center coming soon'),
    },
    {
      icon: 'document-text-outline',
      title: 'Terms & Privacy',
      description: 'View terms of service and privacy policy',
      onPress: () => Alert.alert('Info', 'Legal documents coming soon'),
    },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Profile Header */}
      <Card style={styles.profileCard}>
        <View style={styles.profileHeader}>
          <Avatar.Text 
            size={80} 
            label={user?.name?.charAt(0).toUpperCase() || 'C'} 
            style={styles.avatar}
          />
          <View style={styles.profileInfo}>
            <Text style={styles.userName}>{user?.name}</Text>
            <Text style={styles.userEmail}>{user?.email}</Text>
            <Text style={styles.userRole}>Caregiver</Text>
          </View>
        </View>
      </Card>

      {/* Quick Stats */}
      <View style={styles.statsContainer}>
        <Card style={styles.statCard}>
          <View style={styles.statContent}>
            <Ionicons name="time" size={24} color="#2563EB" />
            <Text style={styles.statValue}>24.5</Text>
            <Text style={styles.statLabel}>Hours This Week</Text>
          </View>
        </Card>

        <Card style={styles.statCard}>
          <View style={styles.statContent}>
            <Ionicons name="calendar" size={24} color="#10b981" />
            <Text style={styles.statValue}>6</Text>
            <Text style={styles.statLabel}>Shifts This Week</Text>
          </View>
        </Card>

        <Card style={styles.statCard}>
          <View style={styles.statContent}>
            <Ionicons name="cash" size={24} color="#f59e0b" />
            <Text style={styles.statValue}>$728</Text>
            <Text style={styles.statLabel}>Est. Earnings</Text>
          </View>
        </Card>
      </View>

      {/* Menu Items */}
      <Card style={styles.menuCard}>
        <List.Section>
          {menuItems.map((item, index) => (
            <List.Item
              key={index}
              title={item.title}
              description={item.description}
              left={(props) => (
                <Ionicons 
                  name={item.icon as any} 
                  size={24} 
                  color="#6b7280" 
                  style={props.style}
                />
              )}
              right={(props) => (
                <Ionicons 
                  name="chevron-forward" 
                  size={20} 
                  color="#9ca3af" 
                  style={props.style}
                />
              )}
              onPress={item.onPress}
              style={styles.menuItem}
            />
          ))}
        </List.Section>
      </Card>

      {/* App Info */}
      <Card style={styles.infoCard}>
        <View style={styles.infoContent}>
          <Text style={styles.appName}>Caregiver Clock</Text>
          <Text style={styles.appVersion}>Version 1.0.0</Text>
          <Text style={styles.appDescription}>
            Mobile app for caregivers to clock in/out and manage shift notes
          </Text>
        </View>
      </Card>

      {/* Logout Button */}
      <Button
        mode="outlined"
        onPress={handleLogout}
        style={styles.logoutButton}
        textColor="#dc2626"
      >
        <Ionicons name="log-out" size={18} color="#dc2626" />
        <Text style={styles.logoutText}>Logout</Text>
      </Button>
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
  profileCard: {
    padding: 20,
    marginBottom: 20,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    marginRight: 16,
  },
  profileInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 4,
  },
  userRole: {
    fontSize: 14,
    color: '#2563EB',
    fontWeight: '500',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
  },
  statContent: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginVertical: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
  menuCard: {
    marginBottom: 20,
  },
  menuItem: {
    paddingVertical: 4,
  },
  infoCard: {
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  infoContent: {
    alignItems: 'center',
  },
  appName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  appVersion: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  appDescription: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
  },
  logoutButton: {
    borderColor: '#dc2626',
    paddingVertical: 8,
  },
  logoutText: {
    marginLeft: 8,
    fontWeight: '500',
  },
});
