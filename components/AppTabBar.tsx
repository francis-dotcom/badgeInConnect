import React from "react";
import { View, Text, StyleSheet, Platform } from "react-native";
import { Feather } from "@expo/vector-icons";

export type AppTab = "home" | "schedule" | "timesheet";

export default function AppTabBar({ active }: { active: AppTab }) {
  return (
    <View style={styles.tabBar}>
      <TabItem
        icon={<Feather name="home" size={22} color={active === "home" ? "#3D8A5A" : "#A8A7A5"} />}
        label="Home"
        active={active === "home"}
      />
      <TabItem
        icon={<Feather name="calendar" size={22} color={active === "schedule" ? "#3D8A5A" : "#A8A7A5"} />}
        label="Schedule"
        active={active === "schedule"}
      />
      <TabItem
        icon={<Feather name="clock" size={22} color={active === "timesheet" ? "#3D8A5A" : "#A8A7A5"} />}
        label="Timesheet"
        active={active === "timesheet"}
      />
    </View>
  );
}

function TabItem({
  icon,
  label,
  active,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
}) {
  return (
    <View style={styles.tabItem}>
      {icon}
      <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{label}</Text>
    </View>
  );
}

const shadow = Platform.select({
  ios: {
    shadowColor: "#1A1918",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: -1 },
  },
  android: { elevation: 3 },
});

const styles = StyleSheet.create({
  tabBar: {
    height: 84,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingBottom: 34,
    paddingTop: 12,
    ...(shadow || {}),
  },
  tabItem: { alignItems: "center", gap: 4, flex: 1 },
  tabLabel: {
    fontSize: 10,
    fontWeight: "500",
    color: "#A8A7A5",
    fontFamily: "Outfit_500Medium",
  },
  tabLabelActive: { color: "#3D8A5A", fontWeight: "600" },
});
