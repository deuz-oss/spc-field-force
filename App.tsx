import React from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
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
import { createBottomTabNavigator, BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { APP_NAME, ROLE_LABEL } from './src/config';
import { C, F } from './src/theme';
import { useBreakpoint } from './src/utils/responsive';
import { DialogHost } from './src/components/dialog';
import { useCurrentUser, useStore } from './src/store/useStore';
import { Role, User } from './src/types';

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

const RAIL_WIDTH = 232;

/** Kartu identitas ringkas di puncak rail (web/tablet) — memberi konteks "siapa saya & di mana" */
function RailHeader({ me }: { me: User }) {
  return (
    <View style={{ paddingHorizontal: 18, paddingTop: 22, paddingBottom: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View
          style={{
            width: 34,
            height: 34,
            borderRadius: 10,
            backgroundColor: C.primary,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="footsteps" size={18} color="#fff" />
        </View>
        <Text style={{ color: '#fff', fontFamily: F.xbold, fontSize: 15 }}>{APP_NAME}</Text>
      </View>
      <View style={{ marginTop: 18, borderTopWidth: 1, borderColor: 'rgba(255,255,255,0.08)', paddingTop: 14 }}>
        <Text style={{ color: '#fff', fontFamily: F.bold, fontSize: 13 }} numberOfLines={1}>
          {me.name}
        </Text>
        <Text style={{ color: 'rgba(255,255,255,0.55)', fontFamily: F.reg, fontSize: 11.5, marginTop: 1 }}>
          {ROLE_LABEL[me.role]}
        </Text>
      </View>
    </View>
  );
}

/** Tab bar responsif: rail vertikal tetap di web/tablet lebar (≥900dp), bottom tabs di mobile. */
function ResponsiveTabBar({ state, navigation, isDesktop, me }: BottomTabBarProps & { isDesktop: boolean; me: User }) {
  const routes = state.routes;

  if (!isDesktop) {
    return (
      <View
        style={{
          flexDirection: 'row',
          borderTopWidth: 1,
          borderColor: C.border,
          backgroundColor: C.card,
          paddingTop: 6,
          paddingBottom: 8,
        }}
      >
        {routes.map((route, i) => {
          const focused = state.index === i;
          const color = focused ? C.primary : C.faint;
          return (
            <TouchableOpacity
              key={route.key}
              onPress={() => navigation.navigate(route.name)}
              accessibilityRole="button"
              accessibilityState={focused ? { selected: true } : {}}
              style={{ flex: 1, alignItems: 'center', gap: 2, minHeight: 44, justifyContent: 'center' }}
            >
              <Ionicons name={TAB_ICON[route.name] ?? 'ellipse-outline'} size={21} color={color} />
              <Text style={{ fontSize: 10.5, fontFamily: F.semi, color }}>{route.name}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  }

  return (
    <View
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: RAIL_WIDTH,
        backgroundColor: C.railBg,
      }}
    >
      <RailHeader me={me} />
      <View style={{ paddingHorizontal: 12, gap: 2 }}>
        {routes.map((route, i) => {
          const focused = state.index === i;
          return (
            <TouchableOpacity
              key={route.key}
              onPress={() => navigation.navigate(route.name)}
              accessibilityRole="button"
              accessibilityState={focused ? { selected: true } : {}}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                paddingVertical: 11,
                paddingHorizontal: 12,
                borderRadius: 10,
                backgroundColor: focused ? 'rgba(37,99,235,0.22)' : 'transparent',
              }}
            >
              <Ionicons
                name={TAB_ICON[route.name] ?? 'ellipse-outline'}
                size={19}
                color={focused ? '#93B4FF' : 'rgba(255,255,255,0.6)'}
              />
              <Text
                style={{
                  fontSize: 13.5,
                  fontFamily: focused ? F.bold : F.semi,
                  color: focused ? '#FFFFFF' : 'rgba(255,255,255,0.7)',
                }}
              >
                {route.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function MainTabs({ role, me }: { role: Role; me: User }) {
  const { isDesktop } = useBreakpoint();
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
      tabBar={(props) => <ResponsiveTabBar {...props} isDesktop={isDesktop} me={me} />}
      screenOptions={({ route }) => ({
        headerStyle: { backgroundColor: C.primary, shadowOpacity: 0, borderBottomWidth: 0 },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: { fontFamily: F.bold, fontSize: 17 },
        headerShadowVisible: false,
        sceneStyle: isDesktop ? { marginLeft: RAIL_WIDTH } : undefined,
        headerRight: () => (
          <View
            style={{
              marginRight: 16,
              maxWidth: 170,
              paddingHorizontal: 10,
              paddingVertical: 4,
              borderRadius: 999,
              backgroundColor: 'rgba(255,255,255,0.16)',
            }}
          >
            <Text
              numberOfLines={1}
              ellipsizeMode="tail"
              style={{ color: '#fff', fontFamily: F.semi, fontSize: 11.5 }}
            >
              {ROLE_LABEL[role]}
            </Text>
          </View>
        ),
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
            <Stack.Screen name="Main" options={{ headerShown: false }}>
              {() => <MainTabs role={user.role} me={user} />}
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
