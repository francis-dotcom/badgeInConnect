import { Tabs } from "expo-router";
import { Feather } from "@expo/vector-icons";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          height: 84,
          paddingBottom: 34,
          paddingTop: 12,
          backgroundColor: "#FFFFFF",
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "600",
          fontFamily: "Outfit_600SemiBold",
        },
        tabBarActiveTintColor: "#3D8A5A",
        tabBarInactiveTintColor: "#A8A7A5",
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => <Feather name="home" size={size ?? 22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="schedule-calendar"
        options={{
          title: "Schedule",
          tabBarIcon: ({ color, size }) => <Feather name="calendar" size={size ?? 22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="active-shift"
        options={{
          title: "Timesheet",
          tabBarIcon: ({ color, size }) => <Feather name="clock" size={size ?? 22} color={color} />,
        }}
      />
      <Tabs.Screen name="shift-details" options={{ href: null }} />
      <Tabs.Screen name="client-details" options={{ href: null }} />
      <Tabs.Screen name="client-list" options={{ href: null }} />
      <Tabs.Screen name="available-shifts" options={{ href: null }} />
      <Tabs.Screen name="schedule-list" options={{ href: null }} />
      <Tabs.Screen name="shift-report" options={{ href: null }} />
      <Tabs.Screen name="support" options={{ href: null }} />
    </Tabs>
  );
}
