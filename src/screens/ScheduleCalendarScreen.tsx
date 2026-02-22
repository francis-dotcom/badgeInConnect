import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Platform, Pressable, ActivityIndicator, RefreshControl, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { CONFIG, getAdminApiHeaders } from "../constants/Config";

import { useAuth } from "../context/AuthContext";
import { useRouter } from "expo-router";

export default function ScheduleCalendarScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [shifts, setShifts] = useState<any[]>([]);

  const loadShifts = async (isRefresh = false) => {
    if (!user?.email) return;
    
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      // Fetching profile

      // 1. Get Caregiver ID from Profile
      const profileRes = await fetch(`${CONFIG.API_BASE_URL}/api/caregivers/profile?email=${user.email}`);
      const profileData = await profileRes.json();
      
      // Profile response received

      if (!profileData.success || !profileData.caregiver) {
        // If profile not found, maybe just show empty shifts or a specific error message on UI?
        // For now, let's not throw, but set specific error state.
        setError("Caregiver profile not found. Please contact admin.");
        setLoading(false);
        setRefreshing(false);
        return; 
      }
      
      const caregiverId = profileData.caregiver.id;

      // 2. Fetch Shifts for this Caregiver
      const res = await fetch(`${CONFIG.API_BASE_URL}/api/admin/shifts?caregiver_id=${caregiverId}`, {
        headers: getAdminApiHeaders(),
      });
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      const data = await res.json();
      
      setShifts(Array.isArray(data) ? data : []);
      setError(null);
    } catch (e: any) {
      console.error(e);
      setError(e?.message || "Failed to load shifts");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (user?.email) {
      loadShifts();
    }
  }, [user?.email]);

  const scheduleByDate = useMemo(() => {
    const map: Record<string, typeof shifts> = {};
    for (const s of shifts) {
      const d = new Date(s.start_time);
      if (Number.isNaN(d.getTime())) continue;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
        d.getDate()
      ).padStart(2, "0")}`;
      if (!map[key]) map[key] = [];
      map[key].push(s);
    }
    return map;
  }, [shifts]);

  // Removed: Auto-selecting first shift date. Calendar now defaults to Today.

  const selectedDateKey = useMemo(() => {
    if (!selectedDate) return "";
    return toDateKey(selectedDate);
  }, [selectedDate]);

  const scheduleForDay = useMemo(
    () => (selectedDateKey ? scheduleByDate[selectedDateKey] || [] : []),
    [scheduleByDate, selectedDateKey]
  );

  const monthDate = selectedDate ?? new Date();
  const monthTitle = monthDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const titleText = selectedDate
    ? selectedDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
    : "Select a date";

  const calendarWeeks = useMemo(() => buildCalendar(monthDate, scheduleByDate), [monthDate, scheduleByDate]);

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.root}>
        <ScrollView 
          contentContainerStyle={styles.content} 
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => loadShifts(true)} />
          }
        >
          <View style={styles.headerRow}>
            <Text style={styles.headerTitle}>My Schedule</Text>
            <View style={styles.addBtn}>
              <Feather name="plus" size={18} color="#FFFFFF" />
            </View>
          </View>

          <View style={styles.segmented}>
            <View style={styles.segmentActive}>
              <Text style={styles.segmentActiveText}>Calendar</Text>
            </View>
            <TouchableOpacity 
              style={styles.segmentInactive}
              onPress={() => router.push("/(tabs)/schedule-list")}
            >
              <Text style={styles.segmentInactiveText}>List</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.monthRow}>
            <Feather name="chevron-left" size={20} color="#6D6C6A" />
            <Text style={styles.monthTitle}>{monthTitle}</Text>
            <Feather name="chevron-right" size={20} color="#6D6C6A" />
          </View>

          <View style={styles.dayHeaders}>
            {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((d) => (
              <Text key={d} style={styles.dayHeader}>{d}</Text>
            ))}
          </View>

          <View style={styles.calendarGrid}>
            {calendarWeeks.map((days, idx) => (
              <WeekRow
                key={idx}
                days={days}
                selectedDate={selectedDate}
                onSelect={setSelectedDate}
                monthDate={monthDate}
              />
            ))}
          </View>

          <View style={styles.legend}>
            <LegendDot color="#3D8A5A" label="Personal Care" />
            <LegendDot color="#D89575" label="Companionship" />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{titleText}</Text>
            {loading ? (
              <View style={styles.emptyCard}>
                <ActivityIndicator color="#3D8A5A" />
                <Text style={styles.emptyText}>Loading shifts...</Text>
              </View>
            ) : error ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>Error: {error}</Text>
              </View>
            ) : scheduleForDay.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>No shifts scheduled for this date.</Text>
              </View>
            ) : (
              scheduleForDay.map((s) => {
                const status = getShiftStatus(s);
                return (
                  <TouchableOpacity 
                    key={s.id}
                    onPress={() => router.push("/(tabs)/active-shift")}
                    activeOpacity={0.7}
                  >
                    <ScheduleCard
                      barColor={status.color}
                      time={formatTime(s.start_time)}
                      timeSuffix={formatAmPm(s.start_time)}
                      name={s.client_name}
                      meta={`Start · ${new Date(s.start_time).toLocaleString()}`}
                      badgeText={status.label}
                      badgeBg={status.bg}
                      badgeColor={status.color}
                    />
                  </TouchableOpacity>
                );
              })
            )}
          </View>

          <View style={{ height: 24 }} />
        </ScrollView>

      </View>
    </SafeAreaView>
  );
}

function formatTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "--:--";
  const h = d.getHours() % 12 || 12;
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

function formatAmPm(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.getHours() >= 12 ? "PM" : "AM";
}

function toDateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function buildCalendar(monthDate: Date, scheduleByDate: Record<string, any[]>) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const weeks: { day: number | null; dot?: string }[][] = [];
  let week: { day: number | null; dot?: string }[] = [];

  for (let i = 0; i < first.getDay(); i++) {
    week.push({ day: null });
  }

  for (let day = 1; day <= last.getDate(); day++) {
    const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const shifts = scheduleByDate[key] || [];
    let dot: string | undefined;
    if (shifts.length > 0) {
      dot = shifts.some((s) => s.status === "approved") ? "#3D8A5A" : "#D89575";
    }
    week.push({ day, dot });
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
  }

  if (week.length > 0) {
    while (week.length < 7) week.push({ day: null });
    weeks.push(week);
  }

  return weeks;
}

function WeekRow({
  days,
  selectedDate,
  onSelect,
  monthDate,
}: {
  days: { day: number | null; dot?: string }[];
  selectedDate: Date | null;
  onSelect: (date: Date) => void;
  monthDate: Date;
}) {
  return (
    <View style={styles.weekRow}>
      {days.map((d, idx) =>
        d.day ? (
          <Pressable
            key={`${monthDate.getFullYear()}-${monthDate.getMonth()}-${d.day}`}
            onPress={() => onSelect(new Date(monthDate.getFullYear(), monthDate.getMonth(), d.day as number))}
            style={({ pressed }) => [
              styles.dayCell,
              selectedDate &&
                selectedDate.getDate() === d.day &&
                selectedDate.getMonth() === monthDate.getMonth() &&
                styles.dayCellActive,
              pressed && styles.dayCellPressed,
            ]}
          >
            <Text
              style={[
                styles.dayText,
                selectedDate &&
                  selectedDate.getDate() === d.day &&
                  selectedDate.getMonth() === monthDate.getMonth() &&
                  styles.dayTextActive,
              ]}
            >
              {d.day}
            </Text>
            {d.dot ? <View style={[styles.dayDot, { backgroundColor: d.dot }]} /> : null}
          </Pressable>
        ) : (
          <View key={`empty-${idx}`} style={styles.dayCell} />
        )
      )}
    </View>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

function ScheduleCard({
  barColor,
  time,
  timeSuffix,
  name,
  meta,
  badgeText,
  badgeBg,
  badgeColor,
}: {
  barColor: string;
  time: string;
  timeSuffix: string;
  name: string;
  meta: string;
  badgeText: string;
  badgeBg: string;
  badgeColor: string;
}) {
  return (
    <View style={styles.scheduleCard}>
      <View style={[styles.scheduleBar, { backgroundColor: barColor }]} />
      <View style={styles.scheduleBody}>
        <View style={styles.timeCol}>
          <Text style={styles.timeText}>{time}</Text>
          <Text style={styles.timeSuffix}>{timeSuffix}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.infoCol}>
          <Text style={styles.cardName}>{name}</Text>
          <Text style={styles.cardMeta}>{meta}</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: badgeBg }]}
        >
          <Text style={[styles.badgeText, { color: badgeColor }]}>{badgeText}</Text>
        </View>
      </View>
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
  safe: { flex: 1, backgroundColor: "#F5F4F1" },
  root: { flex: 1, backgroundColor: "#F5F4F1" },
  content: { paddingHorizontal: 24, paddingTop: 8, gap: 20 },

  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerTitle: {
    fontSize: 26,
    fontWeight: "600",
    color: "#1A1918",
    letterSpacing: -0.5,
    fontFamily: "Outfit_600SemiBold",
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#3D8A5A",
    alignItems: "center",
    justifyContent: "center",
  },

  segmented: {
    height: 40,
    borderRadius: 12,
    backgroundColor: "#EDECEA",
    padding: 4,
    flexDirection: "row",
  },
  segmentActive: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    ...(shadow || {}),
  },
  segmentInactive: { flex: 1, alignItems: "center", justifyContent: "center" },
  segmentActiveText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1A1918",
    fontFamily: "Outfit_600SemiBold",
  },
  segmentInactiveText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#6D6C6A",
    fontFamily: "Outfit_500Medium",
  },

  monthRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  monthTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1A1918",
    fontFamily: "Outfit_600SemiBold",
  },

  dayHeaders: { flexDirection: "row", justifyContent: "space-around" },
  dayHeader: {
    width: 40,
    textAlign: "center",
    fontSize: 11,
    fontWeight: "600",
    color: "#9C9B99",
    fontFamily: "Outfit_600SemiBold",
  },

  calendarGrid: { gap: 4 },
  weekRow: { flexDirection: "row", justifyContent: "space-around" },
  dayCell: {
    width: 40,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  dayCellPressed: { opacity: 0.7 },
  dayCellActive: {
    backgroundColor: "#3D8A5A",
    borderRadius: 12,
  },
  dayText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1A1918",
    fontFamily: "Outfit_500Medium",
  },
  dayTextActive: { color: "#FFFFFF", fontWeight: "600", fontFamily: "Outfit_600SemiBold" },
  dayDot: { width: 5, height: 5, borderRadius: 3 },

  legend: { flexDirection: "row", justifyContent: "center", gap: 16 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: {
    fontSize: 11,
    fontWeight: "500",
    color: "#6D6C6A",
    fontFamily: "Outfit_500Medium",
  },

  section: { gap: 12 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1A1918",
    letterSpacing: -0.2,
    fontFamily: "Outfit_600SemiBold",
  },
  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingVertical: 18,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    ...(shadow || {}),
  },
  emptyText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#6D6C6A",
    fontFamily: "Outfit_500Medium",
  },

  scheduleCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    overflow: "hidden",
    flexDirection: "row",
    ...(shadow || {}),
  },
  scheduleBar: { width: 4 },
  scheduleBody: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  timeCol: { width: 52, alignItems: "center" },
  timeText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1A1918",
    fontFamily: "Outfit_600SemiBold",
  },
  timeSuffix: {
    fontSize: 10,
    fontWeight: "500",
    color: "#9C9B99",
    fontFamily: "Outfit_500Medium",
  },
  divider: { width: 1, height: 36, backgroundColor: "#E5E4E1" },
  infoCol: { flex: 1, gap: 2 },
  cardName: {
    fontSize: 15,
    fontWeight: "500",
    color: "#1A1918",
    fontFamily: "Outfit_500Medium",
  },
  cardMeta: {
    fontSize: 12,
    fontWeight: "400",
    color: "#9C9B99",
    fontFamily: "Outfit_400Regular",
  },
  badge: { borderRadius: 4, paddingVertical: 4, paddingHorizontal: 8 },
  badgeText: {
    fontSize: 10,
    fontWeight: "600",
    fontFamily: "Outfit_600SemiBold",
  },
});

function getShiftStatus(s: any) {
  if (s.actual_end_time) {
    return { label: "COMPLETED", color: "#3D8A5A", bg: "#C8F0D8" }; // Green
  }
  if (s.actual_start_time) {
    return { label: "IN PROGRESS", color: "#D97706", bg: "#FEF3C7" }; // Amber/Orange
  }
  if (s.status === 'approved') {
    return { label: "APPROVED", color: "#4B5563", bg: "#E5E7EB" }; // Gray
  }
  
  // Default/Fallback
  return { label: (s.status || "SCHEDULED").toUpperCase(), color: "#D89575", bg: "#FFF0E8" };
}
