import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text, StyleSheet } from 'react-native';
import { MainTabParamList, FindFixerStackParamList, ChatStackParamList, ProfileStackParamList } from './types';
import { HomeNavigator } from './HomeNavigator';
import { RequestsListScreen } from '../screens/requests/RequestsListScreen';
import { FixerSearchScreen } from '../screens/fixer/FixerSearchScreen';
import { FixerProfileScreen } from '../screens/fixer/FixerProfileScreen';
import { ConversationListScreen } from '../screens/chat/ConversationListScreen';
import { ChatRoomScreen } from '../screens/chat/ChatRoomScreen';
import { CustomerProfileScreen } from '../screens/profile/CustomerProfileScreen';
import { EditProfileScreen } from '../screens/profile/EditProfileScreen';
import { CustomerJobsListScreen } from '../screens/profile/CustomerJobsListScreen';
import { AddressListScreen } from '../screens/profile/AddressListScreen';
import { AddAddressScreen } from '../screens/profile/AddAddressScreen';
import { NotificationsScreen } from '../screens/profile/NotificationsScreen';
import { CustomerJobDetailScreen } from '../screens/profile/CustomerJobDetailScreen';
import { Colors, FontSize, FontWeight } from '../theme/tokens';

// ── Fixer Stack ──
const FindFixerStack = createNativeStackNavigator<FindFixerStackParamList>();
function FindFixerNavigator() {
  return (
    <FindFixerStack.Navigator screenOptions={{ headerShadowVisible: false }}>
      <FindFixerStack.Screen name="FixerSearch" component={FixerSearchScreen} options={{ headerShown: false }} />
      <FindFixerStack.Screen name="FixerProfile" component={FixerProfileScreen} options={{ title: 'Fixer Profile' }} />
    </FindFixerStack.Navigator>
  );
}

// ── Chat Stack ──
const ChatStack = createNativeStackNavigator<ChatStackParamList>();
function ChatNavigator() {
  return (
    <ChatStack.Navigator screenOptions={{ headerShadowVisible: false }}>
      <ChatStack.Screen name="ConversationList" component={ConversationListScreen} options={{ headerShown: false }} />
      <ChatStack.Screen
        name="ChatRoom"
        component={ChatRoomScreen}
        options={({ route }: any) => ({ title: route.params?.otherUserName || 'Chat' })}
      />
    </ChatStack.Navigator>
  );
}

// ── Profile Stack ──
const ProfileStack = createNativeStackNavigator<ProfileStackParamList>();
function ProfileNavigator() {
  return (
    <ProfileStack.Navigator screenOptions={{ headerShadowVisible: false }}>
      <ProfileStack.Screen name="Profile" component={CustomerProfileScreen} options={{ headerShown: false }} />
      <ProfileStack.Screen name="EditProfile" component={EditProfileScreen} options={{ title: 'Edit Profile' }} />
      <ProfileStack.Screen name="MyJobs" component={CustomerJobsListScreen} options={{ title: 'My Jobs' }} />
      <ProfileStack.Screen name="Addresses" component={AddressListScreen} options={{ title: 'My Addresses' }} />
      <ProfileStack.Screen name="AddAddress" component={AddAddressScreen} options={{ title: 'Add Address' }} />
      <ProfileStack.Screen name="Notifications" component={NotificationsScreen} options={{ title: 'Notifications' }} />
      <ProfileStack.Screen name="JobDetail" component={CustomerJobDetailScreen} options={{ title: 'Job Details' }} />
    </ProfileStack.Navigator>
  );
}

// ── Main Tab ──
const Tab = createBottomTabNavigator<MainTabParamList>();

const TAB_ICONS: Record<string, string> = {
  HomeTab: '🏠',
  RequestsTab: '📋',
  FindFixerTab: '🔍',
  ChatTab: '💬',
  ProfileTab: '👤',
};

export function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: () => (
          <Text style={styles.tabIcon}>{TAB_ICONS[route.name] || '•'}</Text>
        ),
        tabBarActiveTintColor: Colors.accent,
        tabBarInactiveTintColor: Colors.muted,
        tabBarLabelStyle: styles.tabLabel,
        tabBarStyle: styles.tabBar,
      })}
    >
      <Tab.Screen name="HomeTab" component={HomeNavigator} options={{ tabBarLabel: 'Home' }} />
      <Tab.Screen name="RequestsTab" component={RequestsListScreen} options={{ tabBarLabel: 'Requests' }} />
      <Tab.Screen name="FindFixerTab" component={FindFixerNavigator} options={{ tabBarLabel: 'Find Fixer' }} />
      <Tab.Screen name="ChatTab" component={ChatNavigator} options={{ tabBarLabel: 'Chat' }} />
      <Tab.Screen name="ProfileTab" component={ProfileNavigator} options={{ tabBarLabel: 'Profile' }} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.white,
    borderTopColor: Colors.borderLight,
    height: 60,
    paddingBottom: 6,
    paddingTop: 4,
  },
  tabIcon: { fontSize: 22 },
  tabLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
  },
});
