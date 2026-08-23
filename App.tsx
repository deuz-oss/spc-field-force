import React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';
import {
  DarkTheme,
  DefaultTheme,
  NavigationContainer,
} from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { APP_NAME } from './src/config';
import { C, F } from './src/theme';
import { DialogHost } from './src/components/dialog';
import { useCurrentUser, useStore } from './src/store/useStore';
import { Role } from './src/types';

import LoginScreen from './src/screens/LoginScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import MerchantsScreen from './src/screens/MerchantsScreen';
import MerchantDetailScreen from './src/screens/MerchantDetailScreen';
import MerchantFormScreen from './src/screens/MerchantFormScreen';
import ImportScreen from './src/screens/ImportScreen';
import VisitFlowScreen from './src/screens/VisitFlowScreen';
import VisitsScreen from './src/screens/VisitsScreen';
import AttendanceScreen from './src/screens/AttendanceScreen';
import AttendanceDetailScreen from './src/screens/AttendanceDetailScreen';
import ReportsScreen from './src/screens/ReportsScreen';
import UsersScreen from './src/screens/UsersScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import { TrackingWatcher } from './src/components/TrackingWatcher';

const Stack = createNativeStackNavigator();
const Tabs = createBottomTabNavigator();

const TAB_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  Dashboard: 'grid-outline',
  Merchant: 'storefront-outline',
  Kunjungan: 'walk-outline',
  Absensi: 'time-outline',
  Laporan: 'bar-chart-outline',
  Pengguna: 'people-outline',
  Profil: 'person-circle-outline',
};

function MainTabs({ role }: { role: Role }) {
  const tabs =
    role === 'super_admin'
      ? ['Dashboard', 'Merchant', 'Laporan', 'Pengguna', 'Profil']
      : role === 'field_agent'
      ? ['Dashboard', 'Merchant', 'Kunjungan', 'Absensi', 'Profil']
      : ['Dashboard', 'Merchant', 'Laporan', 'Profil']; // admin, team_lead, client

  const screenFor = (name: string) => {
    switch (name) {
      case 'Dashboard':
        return DashboardScreen;
      case 'Merchant':
        return MerchantsScreen;
      case 'Kunjungan':
        return VisitsScreen;
      case 'Absensi':
        return AttendanceScreen;
      case 'Laporan':
        return ReportsScreen;
      case 'Pengguna':
        return UsersScreen;
      default:
        return ProfileScreen;
    }
  };

  return (
    <Tabs.Navigator
      screenOptions={({ route }) => ({
        headerStyle: { backgroundColor: C.primary, shadowOpacity: 0, borderBottomWidth: 0 },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: { fontFamily: F.bold, fontSize: 17 },
        headerShadowVisible: false,
        tabBarActiveTintColor: C.primary,
        tabBarInactiveTintColor: C.faint,
        tabBarLabelStyle: { fontFamily: F.semi, fontSize: 10.5 },
        tabBarStyle: { borderTopColor: C.border, elevation: 0 },
        tabBarIcon: ({ color, size }) =>
          <Ionicons name={TAB_ICON[route.name] ?? 'ellipse-outline'} color={color} size={size} />,
      })}
    >
      {tabs.map((name) => (
        <Tabs.Screen key={name} name={name} component={screenFor(name)} />
      ))}
    </Tabs.Navigator>
  );
}

export default function App() {
  const ready = useStore((s) => s.ready);
  const user = useCurrentUser();
  const [fontsLoaded] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });

  if (!ready || !fontsLoaded)
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg }}>
        <View
          style={{
            width: 72,
            height: 72,
            borderRadius: 20,
            backgroundColor: C.primary,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="footsteps" size={34} color="#FFFFFF" />
        </View>
        <Text style={{ fontSize: 22, fontWeight: '800', color: C.text, marginTop: 16 }}>{APP_NAME}</Text>
        <ActivityIndicator style={{ marginTop: 14 }} color={C.primary} />
      </View>
    );

  const navTheme = {
    ...DefaultTheme,
    colors: { ...DefaultTheme.colors, primary: C.primary, background: C.bg, card: '#fff' },
  };

  const stackOpts = {
    headerStyle: { backgroundColor: C.primary, shadowOpacity: 0, borderBottomWidth: 0 },
    headerTintColor: '#FFFFFF',
    headerTitleStyle: { fontFamily: F.bold, fontSize: 17 },
    headerShadowVisible: false,
  };

  return (
    <SafeAreaProvider>
      <NavigationContainer theme={navTheme}>
        <StatusBar style="light" />
        {!user ? (
          <Stack.Navigator screenOptions={stackOpts}>
            <Stack.Screen
              name="Login"
              component={LoginScreen}
              options={{ title: APP_NAME, headerShown: false }}
            />
          </Stack.Navigator>
        ) : (
          <Stack.Navigator screenOptions={stackOpts}>
            <Stack.Screen name="Main">
              {() => <MainTabs role={user.role} />}
            </Stack.Screen>
            <Stack.Screen
              name="MerchantDetail"
              component={MerchantDetailScreen}
              options={{ title: 'Detail Merchant' }}
            />
            <Stack.Screen
              name="MerchantForm"
              component={MerchantFormScreen}
              options={{ title: 'Data Merchant' }}
            />
            <Stack.Screen
              name="Import"
              component={ImportScreen}
              options={{ title: 'Impor Merchant (CSV)' }}
            />
            <Stack.Screen
              name="VisitFlow"
              component={VisitFlowScreen}
              options={{ title: 'Kunjungan Merchant', headerBackTitle: 'Tutup' }}
            />
            <Stack.Screen
              name="AttendanceDetail"
              component={AttendanceDetailScreen}
              options={{ title: 'Detail Absensi' }}
            />
          </Stack.Navigator>
        )}
        <DialogHost />
        <TrackingWatcher />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

// tema gelap tidak dipakai eksplisit namun disiapkan bila dibutuhkan
void DarkTheme;
