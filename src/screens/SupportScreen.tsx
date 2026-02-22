import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAuth } from "../context/AuthContext";
import { CONFIG } from "../constants/Config";

type Category = "General" | "Scheduling" | "Client" | "Technical";
type Urgency = "Low" | "Medium" | "High";

const categories: Category[] = ["General", "Scheduling", "Client", "Technical"];
const urgencies: Urgency[] = ["Low", "Medium", "High"];

export default function SupportScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [category, setCategory] = useState<Category>("General");
  const [urgency, setUrgency] = useState<Urgency>("Low");
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);

  const handleCall = () => {
    Linking.openURL("tel:1234567890");
  };

  const handleEmail = () => {
    Linking.openURL("mailto:support@caregiverclock.com?subject=Support%20Request");
  };

  const handleText = () => {
    Linking.openURL("sms:1234567890");
  };

  const handleSendNote = async () => {
    if (!message.trim()) {
      Alert.alert("Empty Note", "Please add details before sending.");
      return;
    }

    try {
      setIsSending(true);
      const res = await fetch(`${CONFIG.API_BASE_URL}/api/caregivers/support-message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: user?.email,
          subject: `Support Request - ${category} (${urgency})`,
          body: message.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data?.success) {
        Alert.alert("Error", data?.error || "Could not send support note.");
        return;
      }

      Alert.alert("Sent", "Your support note has been delivered.");
      setMessage("");
      setCategory("General");
      setUrgency("Low");
    } catch (error) {
      console.error("Support send error:", error);
      Alert.alert("Error", "An unexpected error occurred.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.root}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
              <Feather name="chevron-left" size={20} color="#1A1918" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Support</Text>
            <View style={{ width: 40, height: 40 }} />
          </View>

          <View style={styles.introWrap}>
            <View style={styles.helpIconBubble}>
              <Feather name="help-circle" size={20} color="#3D8A5A" />
            </View>
            <Text style={styles.introTitle}>How can we help?</Text>
            <Text style={styles.introSub}>Reach out to us anytime — we&apos;re here for you.</Text>
          </View>

          <View style={styles.contactGrid}>
            <ContactAction
              title="Call Us"
              subtitle="Talk with support"
              icon="phone"
              onPress={handleCall}
            />
            <ContactAction
              title="Email"
              subtitle="Get quick help"
              icon="mail"
              onPress={handleEmail}
            />
            <ContactAction
              title="Text"
              subtitle="Chat on your way"
              icon="message-circle"
              onPress={handleText}
            />
          </View>

          <View style={styles.officeCard}>
            <View style={styles.officeHeader}>
              <Feather name="map-pin" size={15} color="#3D8A5A" />
              <Text style={styles.officeHeaderText}>Office Information</Text>
            </View>
            <OfficeRow icon="map-pin" text="456 Maple Ave, Suite 210" />
            <OfficeRow icon="phone" text="+1 (555) 100-2233" />
            <OfficeRow icon="mail" text="support@caregiverclock.com" />
            <OfficeRow icon="clock" text="Mon–Fri | 8:00 AM – 5:00 PM" last />
          </View>

          <View style={styles.sectionWrap}>
            <View style={styles.sectionTitleRow}>
              <Feather name="edit-3" size={15} color="#3D8A5A" />
              <Text style={styles.sectionTitle}>Send a Note to Office</Text>
            </View>

            <View style={styles.formCard}>
              <SelectRow
                label="Category"
                value={category}
                onPress={() => {
                  const next = categories[(categories.indexOf(category) + 1) % categories.length];
                  setCategory(next);
                }}
              />
              <SelectRow
                label="Urgency"
                value={urgency}
                onPress={() => {
                  const next = urgencies[(urgencies.indexOf(urgency) + 1) % urgencies.length];
                  setUrgency(next);
                }}
              />

              <TextInput
                style={styles.messageInput}
                placeholder="Type your support note here..."
                placeholderTextColor="#A8A7A5"
                value={message}
                onChangeText={setMessage}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />

              <TouchableOpacity
                onPress={handleSendNote}
                disabled={isSending}
                style={[styles.sendBtn, isSending && styles.sendBtnDisabled]}
              >
                {isSending ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Feather name="send" size={16} color="#FFFFFF" />
                    <Text style={styles.sendBtnText}>Send Note</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.sectionWrap}>
            <View style={styles.sectionTitleRow}>
              <Feather name="clock" size={15} color="#3D8A5A" />
              <Text style={styles.sectionTitle}>Recent Notes</Text>
            </View>
            <View style={styles.recentCard}>
              <RecentNoteRow
                title="Schedule Change"
                date="Today"
                status="Sent"
                statusColor="#3D8A5A"
                detail="Requested a shift change for Tuesday morning due to a doctor appointment."
              />
              <RecentNoteRow
                title="Client Access"
                date="Yesterday"
                status="Pending"
                statusColor="#D48806"
                detail="Reported front door code issue; unable to enter from keypad."
              />
              <RecentNoteRow
                title="Supply Request"
                date="2 days ago"
                status="Resolved"
                statusColor="#3D8A5A"
                detail="Requested gloves and sanitizer refill for home visit kit."
                last
              />
            </View>
          </View>

          <View style={{ height: 22 }} />
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

function ContactAction({
  title,
  subtitle,
  icon,
  onPress,
}: {
  title: string;
  subtitle: string;
  icon: keyof typeof Feather.glyphMap;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.contactCard} onPress={onPress}>
      <View style={styles.contactIconWrap}>
        <Feather name={icon} size={16} color="#3D8A5A" />
      </View>
      <Text style={styles.contactTitle}>{title}</Text>
      <Text style={styles.contactSub}>{subtitle}</Text>
    </TouchableOpacity>
  );
}

function OfficeRow({
  icon,
  text,
  last,
}: {
  icon: keyof typeof Feather.glyphMap;
  text: string;
  last?: boolean;
}) {
  return (
    <View style={[styles.officeRow, !last && styles.rowBorder]}>
      <Feather name={icon} size={14} color="#6D6C6A" />
      <Text style={styles.officeText}>{text}</Text>
    </View>
  );
}

function SelectRow({ label, value, onPress }: { label: string; value: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.selectRow} onPress={onPress}>
      <Text style={styles.selectLabel}>{label}</Text>
      <View style={styles.selectValueWrap}>
        <Text style={styles.selectValue}>{value}</Text>
        <Feather name="chevron-down" size={14} color="#6D6C6A" />
      </View>
    </TouchableOpacity>
  );
}

function RecentNoteRow({
  title,
  date,
  status,
  statusColor,
  detail,
  last,
}: {
  title: string;
  date: string;
  status: string;
  statusColor: string;
  detail: string;
  last?: boolean;
}) {
  return (
    <View style={[styles.recentRow, !last && styles.rowBorder]}>
      <View style={styles.recentTop}>
        <Text style={styles.recentTitle}>{title}</Text>
        <View style={styles.statusBadge}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <Text style={[styles.statusText, { color: statusColor }]}>{status}</Text>
        </View>
      </View>
      <Text style={styles.recentDate}>{date}</Text>
      <Text style={styles.recentDetail}>{detail}</Text>
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
  content: { paddingHorizontal: 20, paddingTop: 8, gap: 14 },

  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    ...(shadow || {}),
  },
  headerTitle: { fontSize: 18, color: "#1A1918", fontFamily: "Outfit_600SemiBold" },

  introWrap: { alignItems: "center", gap: 4, paddingTop: 4 },
  helpIconBubble: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#DDF3E6",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  introTitle: { fontSize: 19, color: "#1A1918", fontFamily: "Outfit_700Bold" },
  introSub: { fontSize: 12, color: "#6D6C6A", fontFamily: "Outfit_400Regular" },

  contactGrid: { flexDirection: "row", gap: 10 },
  contactCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: "center",
    gap: 4,
    ...(shadow || {}),
  },
  contactIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#DDF3E6",
    alignItems: "center",
    justifyContent: "center",
  },
  contactTitle: { fontSize: 11, color: "#1A1918", fontFamily: "Outfit_600SemiBold" },
  contactSub: { fontSize: 10, color: "#8E8D8A", fontFamily: "Outfit_400Regular" },

  officeCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    overflow: "hidden",
    ...(shadow || {}),
  },
  officeHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 11,
    backgroundColor: "#F1F5F2",
  },
  officeHeaderText: { fontSize: 12, color: "#1A1918", fontFamily: "Outfit_600SemiBold" },
  officeRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingVertical: 11 },
  officeText: { fontSize: 12, color: "#4A4947", fontFamily: "Outfit_400Regular", flex: 1 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: "#EFEDEA" },

  sectionWrap: { gap: 8 },
  sectionTitleRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingLeft: 2 },
  sectionTitle: { fontSize: 13, color: "#1A1918", fontFamily: "Outfit_600SemiBold" },

  formCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 12,
    gap: 10,
    ...(shadow || {}),
  },
  selectRow: {
    height: 38,
    backgroundColor: "#F5F4F1",
    borderRadius: 10,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  selectLabel: { fontSize: 12, color: "#6D6C6A", fontFamily: "Outfit_500Medium" },
  selectValueWrap: { flexDirection: "row", alignItems: "center", gap: 6 },
  selectValue: { fontSize: 12, color: "#1A1918", fontFamily: "Outfit_600SemiBold" },
  messageInput: {
    minHeight: 88,
    backgroundColor: "#F5F4F1",
    borderRadius: 10,
    padding: 12,
    color: "#1A1918",
    fontSize: 13,
    fontFamily: "Outfit_400Regular",
  },
  sendBtn: {
    height: 42,
    borderRadius: 10,
    backgroundColor: "#3D8A5A",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  sendBtnDisabled: { opacity: 0.6 },
  sendBtnText: { color: "#FFFFFF", fontSize: 13, fontFamily: "Outfit_600SemiBold" },

  recentCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    overflow: "hidden",
    ...(shadow || {}),
  },
  recentRow: { paddingHorizontal: 14, paddingVertical: 11, gap: 4 },
  recentTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  recentTitle: { fontSize: 12, color: "#1A1918", fontFamily: "Outfit_600SemiBold", flex: 1 },
  recentDate: { fontSize: 10, color: "#8E8D8A", fontFamily: "Outfit_400Regular" },
  recentDetail: { fontSize: 11, color: "#6D6C6A", fontFamily: "Outfit_400Regular", lineHeight: 16 },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 999,
    backgroundColor: "#F4F8F5",
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusText: { fontSize: 10, fontFamily: "Outfit_600SemiBold" },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
});
