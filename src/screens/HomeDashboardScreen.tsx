import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as DocumentPicker from "expo-document-picker";

import { useAuth } from "../context/AuthContext";
import { CONFIG, getAdminApiHeaders } from "../constants/Config";
import { useState, useEffect } from "react";

function formatShiftDate(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const isTomorrow = date.toDateString() === tomorrow.toDateString();

  if (isToday) return "Today";
  if (isTomorrow) return "Tomorrow";
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export default function HomeDashboardScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [upcomingShifts, setUpcomingShifts] = useState<any[]>([]);
  const [caregiver, setCaregiver] = useState<any>(null);
  const [dashboardStats, setDashboardStats] = useState<any>(null);
  const [isStatsLoading, setIsStatsLoading] = useState(true);
  const [docsExpanded, setDocsExpanded] = useState(false);

  const loadDashboardData = async () => {
    if (!user?.email) return;
    
    try {
      // 1. Get Profile
      const profileRes = await fetch(`${CONFIG.API_BASE_URL}/api/caregivers/profile?email=${user.email}`);
      const profileData = await profileRes.json();
      
      if (profileData.success && profileData.caregiver) {
        setCaregiver(profileData.caregiver);
        const caregiverId = profileData.caregiver.id;

        // 2. Get Shifts
        const shiftsRes = await fetch(`${CONFIG.API_BASE_URL}/api/admin/shifts?caregiver_id=${caregiverId}`, {
          headers: getAdminApiHeaders(),
        });
        const shifts = await shiftsRes.json();
        
        if (Array.isArray(shifts)) {
          const now = new Date();
          const tomorrow = new Date(now);
          tomorrow.setDate(now.getDate() + 2);

          const upcoming = shifts
            .filter((s: any) => {
              const start = new Date(s.start_time);
              const isInProgress = !!s.actual_start_time && !s.actual_end_time;
              const isUpcoming = start > now && start <= tomorrow;
              const isOverdue = !s.actual_start_time && !s.actual_end_time && start <= now && start >= new Date(now.getTime() - 24 * 60 * 60 * 1000); 
              
              return (isInProgress || isUpcoming || isOverdue) && s.status !== 'cancelled' && s.status !== 'missed';
            })
            .sort((a: any, b: any) => {
              const aInProgress = !!a.actual_start_time && !a.actual_end_time;
              const bInProgress = !!b.actual_start_time && !b.actual_end_time;
              if (aInProgress && !bInProgress) return -1;
              if (!aInProgress && bInProgress) return 1;
              return new Date(a.start_time).getTime() - new Date(b.start_time).getTime();
            });
          
          setUpcomingShifts(upcoming);
        }
      }

      // 3. Get Dashboard Stats
      const statsRes = await fetch(`${CONFIG.API_BASE_URL}/api/caregivers/dashboard-stats?email=${user.email}`);
      const statsData = await statsRes.json();
      if (statsData.success) {
        setDashboardStats(statsData.stats);
      }
    } catch (err) {
      console.error("Error loading dashboard data:", err);
    } finally {
      setIsStatsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();

    // Poll every 30s so new shifts/assignments appear without manual restart
    const interval = setInterval(() => {
      loadDashboardData();
    }, 30000);

    return () => clearInterval(interval);
  }, [user]);


  const handleUploadDoc = async (documentType: string) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const asset = result.assets[0];
      const formData = new FormData();
      formData.append('email', user?.email || '');
      formData.append('documentType', documentType);
      
      const fileToUpload = {
        uri: Platform.OS === 'ios' ? asset.uri.replace('file://', '') : asset.uri,
        name: asset.name,
        type: asset.mimeType || 'application/octet-stream',
      } as any;
      
      formData.append('file', fileToUpload);

      setIsStatsLoading(true);
      const res = await fetch(`${CONFIG.API_BASE_URL}/api/caregivers/documents`, {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json',
          // Note: fetch will set the correct boundary for multipart/form-data
        },
      });

      const data = await res.json();
      if (data.success) {
        Alert.alert("Success", "Document uploaded and sent for approval.");
        loadDashboardData(); // Refresh dashboard
      } else {
        Alert.alert("Error", data.error || "Failed to upload document.");
      }
    } catch (error: any) {
      console.error("Upload error:", error);
      Alert.alert("Error", "An error occurred during upload.");
    } finally {
      setIsStatsLoading(false);
    }
  };

  const now = new Date();
  const dateText = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(now);

  const displayName = caregiver ? caregiver.first_name : (user?.name || "Caregiver");

  const getStatusRingColor = (shift: any) => {
    const start = new Date(shift.start_time);
    const now = new Date();
    const isToday = start.toDateString() === now.toDateString();
    
    if (shift.actual_end_time) return "#EF4444"; // Red (Completed/Clocked out)
    if (shift.actual_start_time) return "#10B981"; // Green (In Progress)
    if (isToday) return "#F59E0B"; // Yellow (Day of shift)
    return "#E5E7EB"; // Grey (Scheduled later)
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.root}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.greeting}>Good morning, {displayName}</Text>
              <Text style={styles.dateText}>{dateText}</Text>
            </View>
            <TouchableOpacity style={styles.notifBtn}>
              <Feather name="bell" size={18} color="#1A1918" />
            </TouchableOpacity>
          </View>

          {/* Weekly Progress Section */}
          <View style={styles.weeklySection}>
            <View style={styles.weeklyCard}>
              <View style={styles.weeklyItem}>
                <Text style={styles.weeklyValue}>{dashboardStats?.week?.total_shifts || 0}</Text>
                <Text style={styles.weeklyLabel}>Shifts this week</Text>
              </View>
              <View style={styles.weeklyDivider} />
              <View style={styles.weeklyItem}>
                <Text style={styles.weeklyValue}>
                  {parseFloat(dashboardStats?.week?.total_hours || 0).toFixed(1)}h
                </Text>
                <Text style={styles.weeklyLabel}>Hours logged</Text>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            {upcomingShifts.length > 0 ? (
              upcomingShifts.map((shift, idx) => {
                const isInProgress = !!shift.actual_start_time && !shift.actual_end_time;
                const formattedDate = formatShiftDate(shift.start_time);
                const ringColor = getStatusRingColor(shift);
                
                return (
                  <TouchableOpacity 
                    key={shift.id || idx} 
                    style={[styles.shiftCard, idx > 0 && { marginTop: 12 }]}
                    onPress={() => {
                      if (isInProgress) {
                        router.push({
                          pathname: "/(tabs)/active-shift",
                          params: { shift: JSON.stringify(shift) }
                        });
                      } else {
                        router.push({
                          pathname: "/(tabs)/client-details",
                          params: { 
                            clientId: shift.client_id, 
                            clientName: shift.client_name 
                          }
                        });
                      }
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.accentBar, { backgroundColor: ringColor }]} />
                    <View style={styles.shiftContent}>
                      <View style={styles.shiftTopRow}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                          {/* Circular Status Ring */}
                          <View style={[styles.statusRing, { borderColor: ringColor }]}>
                            <View style={[styles.statusRingInner, { backgroundColor: ringColor + '20' }]}>
                               <Feather name={isInProgress ? "play" : "clock"} size={12} color={ringColor} />
                            </View>
                          </View>
                          <View>
                            <Text style={styles.clientName}>{shift.client_name}</Text>
                            <Text style={styles.dateLabel}>{formattedDate}</Text>
                          </View>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          {isInProgress ? (
                            <View style={[styles.clockReminderPill, { backgroundColor: '#F0F9F4', borderColor: '#3D8A5A' }]}>
                              <Feather name="log-out" size={12} color="#3D8A5A" />
                              <Text style={[styles.clockReminderText, { color: '#3D8A5A' }]}>Clock Out</Text>
                            </View>
                          ) : (
                            !shift.actual_start_time && (new Date(shift.start_time).getTime() - new Date().getTime() <= 5 * 60 * 1000) && (
                              <View style={styles.clockReminderPill}>
                                <Feather name="clock" size={12} color="#C85A5A" />
                                <Text style={styles.clockReminderText}>Clock In</Text>
                              </View>
                            )
                          )}
                        </View>
                      </View>

                      <View style={styles.detailsGrid}>
                        <View style={styles.detailRow}>
                          <Feather name="clock" size={16} color="#9C9B99" />
                          <Text style={styles.detailText}>
                            {new Date(shift.start_time).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} — {new Date(shift.end_time).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                          </Text>
                        </View>
                        <View style={styles.detailRow}>
                          <Feather name="map-pin" size={16} color="#9C9B99" />
                          <Text style={styles.detailText}>{shift.client_address || "Address not available"}</Text>
                        </View>
                      </View>

                      <View style={[styles.viewButton, { backgroundColor: ringColor }]}>
                        <Text style={styles.viewButtonText}>{isInProgress ? "Manage Active Shift" : "View Details"}</Text>
                        <Feather name="arrow-right" size={16} color="#FFFFFF" />
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })
            ) : (
              <View style={[styles.shiftCard, { padding: 24, justifyContent: 'center', alignItems: 'center' }]}>
                <Text style={{ color: "#6D6C6A", fontFamily: "Outfit_500Medium" }}>No shifts scheduled for the next 48 hours.</Text>
              </View>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Alerts</Text>
            
            {dashboardStats ? (
              <>
                {dashboardStats.missed_shifts.map((s: any) => (
                  <View key={s.id} style={[styles.alertCard, { backgroundColor: "#FEF2F0" }]}>
                    <View style={[styles.alertIconWrap, { backgroundColor: "#EF4444" }]}>
                      <Feather name="alert-triangle" size={18} color="#FFFFFF" />
                    </View>
                    <View style={styles.alertContent}>
                      <Text style={[styles.alertTitle, { color: "#EF4444" }]}>CRITICAL: Missed Shift</Text>
                      <Text style={styles.alertDesc}>{new Date(s.start_time).toLocaleDateString()} — {s.client_name}</Text>
                    </View>
                  </View>
                ))}

                {dashboardStats.compliance.length > 0 && (
                  <View>
                    {/* Collapsed header row */}
                    <TouchableOpacity
                      style={[styles.alertCard, { backgroundColor: "#F0F4FE" }]}
                      onPress={() => setDocsExpanded(v => !v)}
                      activeOpacity={0.8}
                    >
                      <View style={[styles.alertIconWrap, { backgroundColor: "#5B7EC2" }]}>
                        <Feather name="shield" size={18} color="#FFFFFF" />
                      </View>
                      <View style={styles.alertContent}>
                        <Text style={[styles.alertTitle, { color: "#5B7EC2" }]}>
                          Outstanding Documents
                        </Text>
                        <Text style={styles.alertDesc}>
                          {dashboardStats.compliance.length} document{dashboardStats.compliance.length !== 1 ? 's' : ''} require attention
                        </Text>
                      </View>
                      <View style={[
                        styles.alertIconWrap,
                        { backgroundColor: "#E0E7FA", width: 28, height: 28, marginLeft: 4 }
                      ]}>
                        <Feather
                          name={docsExpanded ? "chevron-up" : "chevron-down"}
                          size={16}
                          color="#5B7EC2"
                        />
                      </View>
                    </TouchableOpacity>

                    {/* Expanded document list */}
                    {docsExpanded && dashboardStats.compliance.map((c: any, idx: number) => {
                      return (
                        <View
                          key={idx}
                          style={[
                            styles.alertCard,
                            { backgroundColor: "#F8F9FF", marginTop: 6, borderLeftWidth: 3, borderLeftColor: "#5B7EC2" }
                          ]}
                        >
                          <View style={styles.alertContent}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                              <View style={{ flex: 1 }}>
                                <Text style={[styles.alertTitle, { color: "#5B7EC2", fontSize: 13 }]}>
                                  {c.document_type}
                                </Text>
                                <Text style={styles.alertDesc}>
                                  {c.status === 'missing'
                                    ? 'Not submitted — tap Upload to send'
                                    : `${c.status}${c.expiry_date ? ` · Expires ${new Date(c.expiry_date).toLocaleDateString()}` : ''}`
                                  }
                                </Text>
                              </View>
                              <TouchableOpacity
                                style={styles.uploadBtnMini}
                                onPress={() => handleUploadDoc(c.document_type)}
                              >
                                <Feather name="upload" size={14} color="#FFFFFF" />
                                <Text style={styles.uploadBtnTextMini}>Upload</Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                )}

                {dashboardStats.upcoming_shift && !upcomingShifts.find(u => u.id === dashboardStats.upcoming_shift.id) && (
                  <View style={[styles.alertCard, { backgroundColor: "#FFF8E8" }]}>
                    <View style={[styles.alertIconWrap, { backgroundColor: "#D4A64A" }]}>
                      <Feather name="clock" size={18} color="#FFFFFF" />
                    </View>
                    <View style={styles.alertContent}>
                      <Text style={[styles.alertTitle, { color: "#B8922E" }]}>Next Engagement</Text>
                      <Text style={styles.alertDesc}>
                        {dashboardStats.upcoming_shift.client_name} at {new Date(dashboardStats.upcoming_shift.start_time).toLocaleTimeString()}
                      </Text>
                    </View>
                  </View>
                )}

                {dashboardStats.assignment_alerts?.map((a: any) => (
                  <View key={a.id} style={[styles.alertCard, { backgroundColor: "#E6F4EA" }]}>
                    <View style={[styles.alertIconWrap, { backgroundColor: "#3D8A5A" }]}>
                      <Feather name="check-circle" size={18} color="#FFFFFF" />
                    </View>
                    <View style={styles.alertContent}>
                      <Text style={[styles.alertTitle, { color: "#3D8A5A" }]}>Shift Assigned</Text>
                      <Text style={styles.alertDesc}>{a.display_message}</Text>
                    </View>
                  </View>
                ))}

                {dashboardStats.broadcast_alerts?.map((a: any) => (
                  <View key={a.id} style={[styles.alertCard, { backgroundColor: "#F0F4FF" }]}>
                    <View style={[styles.alertIconWrap, { backgroundColor: "#5570F1" }]}>
                      <Feather name="volume-2" size={18} color="#FFFFFF" />
                    </View>
                    <View style={styles.alertContent}>
                      <Text style={[styles.alertTitle, { color: "#5570F1" }]}>ADMIN BROADCAST: {a.subject}</Text>
                      <Text style={styles.alertDesc}>{a.body}</Text>
                    </View>
                  </View>
                ))}
                
                {dashboardStats.missed_shifts.length === 0 && 
                 dashboardStats.compliance.length === 0 && 
                 !dashboardStats.upcoming_shift && 
                 (!dashboardStats.broadcast_alerts || dashboardStats.broadcast_alerts.length === 0) && (
                    <Text style={{ color: "#6D6C6A", fontSize: 13, textAlign: 'center', paddingVertical: 10 }}>No critical alerts at this time.</Text>
                )}
              </>
            ) : isStatsLoading ? (
                <ActivityIndicator size="small" color="#3D8A5A" />
            ) : (
                <Text style={{ color: "#6D6C6A", fontSize: 13, textAlign: 'center', paddingVertical: 10 }}>Unable to load alerts.</Text>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <View style={styles.quickGrid}>
              <QuickCard 
                icon={<Feather name="calendar" size={20} color="#3D8A5A" />} 
                text="View Schedule" 
                bg="#C8F0D8" 
                onPress={() => router.push("/(tabs)/schedule-list")}
              />
              <QuickCard 
                icon={<Feather name="plus-circle" size={20} color="#D89575" />} 
                text="Available Shifts" 
                bg="#FFF0E8" 
                onPress={() => router.push("/(tabs)/available-shifts")}
              />
              <QuickCard 
                icon={<Feather name="headphones" size={20} color="#7C5CBF" />} 
                text="Support" 
                bg="#EDE8F5" 
                onPress={() => router.push("/(tabs)/support")}
              />
            </View>
          </View>

          <View style={{ height: 24 }} />
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

function QuickCard({
  icon,
  text,
  bg,
  onPress,
}: {
  icon: React.ReactNode;
  text: string;
  bg: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.quickCard} onPress={onPress}>
      <View style={[styles.quickIcon, { backgroundColor: bg }]}>{icon}</View>
      <Text style={styles.quickText}>{text}</Text>
    </TouchableOpacity>
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
  safe: { flex: 1, backgroundColor: "#F5F4F1" },
  root: { flex: 1, backgroundColor: "#F5F4F1" },
  content: { paddingHorizontal: 24, paddingTop: 8, gap: 24 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  greeting: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1A1918",
    letterSpacing: -0.5,
    fontFamily: "Outfit_600SemiBold",
  },
  dateText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#6D6C6A",
    fontFamily: "Outfit_500Medium",
    marginTop: 6,
  },
  notifBtn: {
    width: 44,
    height: 44,
    borderRadius: 100,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    ...(shadow || {}),
  },

  weeklySection: {
    marginBottom: 8,
  },
  weeklyCard: {
    backgroundColor: "#3D8A5A",
    borderRadius: 20,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    ...(shadow || {}),
  },
  weeklyItem: {
    alignItems: "center",
    flex: 1,
  },
  weeklyValue: {
    fontSize: 24,
    fontWeight: "700",
    color: "#FFFFFF",
    fontFamily: "Outfit_700Bold",
  },
  weeklyLabel: {
    fontSize: 12,
    color: "#C8F0D8",
    marginTop: 4,
    fontFamily: "Outfit_500Medium",
  },
  weeklyDivider: {
    width: 1,
    height: 40,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },

  section: { gap: 12 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1A1918",
    letterSpacing: -0.2,
    fontFamily: "Outfit_600SemiBold",
  },

  shiftCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    overflow: "hidden",
    flexDirection: "row",
    ...(shadow || {}),
  },
  accentBar: { width: 4, backgroundColor: "#3D8A5A" },
  shiftContent: { paddingVertical: 16, paddingHorizontal: 18, gap: 12, flex: 1 },
  shiftTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  clientName: { fontSize: 16, fontWeight: "600", color: "#1A1918", fontFamily: "Outfit_600SemiBold" },
  dateLabel: { 
    fontSize: 12, 
    color: "#6D6C6A", 
    fontFamily: "Outfit_400Regular",
    marginTop: 2 
  },
  clockReminderPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FFEBEB",
    borderRadius: 100,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: "#FFCDCD",
  },
  clockReminderText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#C85A5A",
    fontFamily: "Outfit_600SemiBold",
  },

  detailsGrid: { gap: 10 },
  detailRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  detailText: { fontSize: 14, fontWeight: "500", color: "#6D6C6A", fontFamily: "Outfit_500Medium" },

  viewButton: {
    height: 44,
    borderRadius: 12,
    backgroundColor: "#3D8A5A",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  viewButtonText: { fontSize: 15, fontWeight: "600", color: "#FFFFFF", fontFamily: "Outfit_600SemiBold" },

  alertCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 12,
  },
  alertIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 100,
    alignItems: "center",
    justifyContent: "center",
  },
  alertContent: { flex: 1 },
  alertTitle: { fontSize: 14, fontWeight: "600", fontFamily: "Outfit_600SemiBold" },
  alertDesc: { fontSize: 12, fontWeight: "400", color: "#6D6C6A", fontFamily: "Outfit_400Regular" },
  uploadBtnMini: {
    backgroundColor: "#3D8A5A",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 8,
  },
  uploadBtnTextMini: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "600",
    fontFamily: "Outfit_600SemiBold",
  },

  quickGrid: { gap: 12 },
  quickCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 18,
    alignItems: "center",
    gap: 12,
    ...(shadow || {}),
  },
  quickIcon: {
    width: 44,
    height: 44,
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickText: { fontSize: 13, fontWeight: "600", color: "#1A1918", fontFamily: "Outfit_600SemiBold" },
  statusRing: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusRingInner: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
