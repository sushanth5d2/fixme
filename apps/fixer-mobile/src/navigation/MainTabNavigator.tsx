import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, StyleSheet } from 'react-native';
import {
  MainTabParamList,
  FeedStackParamList,
  MapStackParamList,
  QuotesStackParamList,
  JobsStackParamList,
  ChatStackParamList,
  ProfileStackParamList,
} from './types';
import { RequestFeedScreen } from '../screens/home/RequestFeedScreen';
import { FixerMapExplorerScreen } from '../screens/home/FixerMapExplorerScreen';
import { FixerRequestDetailScreen } from '../screens/home/FixerRequestDetailScreen';
import { SubmitQuoteScreen } from '../screens/home/SubmitQuoteScreen';
import { MyQuotesScreen } from '../screens/home/MyQuotesScreen';
import { MyJobsScreen } from '../screens/jobs/MyJobsScreen';
import { FixerJobDetailScreen } from '../screens/jobs/FixerJobDetailScreen';
import { FixerConversationListScreen } from '../screens/chat/FixerConversationListScreen';
import { FixerChatRoomScreen } from '../screens/chat/FixerChatRoomScreen';
import { FixerMainProfileScreen } from '../screens/profile/FixerMainProfileScreen';
import { FixerEditProfileScreen } from '../screens/profile/FixerEditProfileScreen';
import { FixerManageServicesScreen } from '../screens/profile/FixerManageServicesScreen';
import { FixerManageAreasScreen } from '../screens/profile/FixerManageAreasScreen';
import { FixerManageMembersScreen } from '../screens/profile/FixerManageMembersScreen';
import { FixerRegistrationScreen } from '../screens/profile/FixerRegistrationScreen';
import { FixerNotificationsScreen } from '../screens/profile/FixerNotificationsScreen';
import { useAuthStore } from '../stores/auth.store';
import { Colors, FontSize, FontWeight } from '../theme/tokens';

// ── Feed Stack ──
const FeedStack = createNativeStackNavigator<FeedStackParamList>();
function FeedNavigator() {
  return (
    <FeedStack.Navigator screenOptions={{ headerShadowVisible: false }}>
      <FeedStack.Screen name="Feed" component={RequestFeedScreen} options={{ headerShown: false }} />
      <FeedStack.Screen name="RequestDetail" component={FixerRequestDetailScreen} options={{ title: 'Request Details' }} />
      <FeedStack.Screen name="SubmitQuote" component={SubmitQuoteScreen} options={{ title: 'Send / Edit Quote' }} />
      <FeedStack.Screen
        name="ChatRoom"
        component={FixerChatRoomScreen}
        options={({ route }: any) => ({ title: route.params?.otherUserName || 'Customer Chat' })}
      />
    </FeedStack.Navigator>
  );
}

// ── Map Explorer Stack ──
const MapStack = createNativeStackNavigator<MapStackParamList>();
function MapNavigator() {
  return (
    <MapStack.Navigator screenOptions={{ headerShadowVisible: false }}>
      <MapStack.Screen name="MapExplorer" component={FixerMapExplorerScreen} options={{ headerShown: false }} />
      <MapStack.Screen name="RequestDetail" component={FixerRequestDetailScreen} options={{ title: 'Request Details' }} />
      <MapStack.Screen name="SubmitQuote" component={SubmitQuoteScreen} options={{ title: 'Send / Edit Quote' }} />
      <MapStack.Screen
        name="ChatRoom"
        component={FixerChatRoomScreen}
        options={({ route }: any) => ({ title: route.params?.otherUserName || 'Customer Chat' })}
      />
    </MapStack.Navigator>
  );
}

// ── Quotes Stack ──
const QuotesStack = createNativeStackNavigator<QuotesStackParamList>();
function QuotesNavigator() {
  return (
    <QuotesStack.Navigator screenOptions={{ headerShadowVisible: false }}>
      <QuotesStack.Screen name="QuotesList" component={MyQuotesScreen} options={{ headerShown: false }} />
      <QuotesStack.Screen name="RequestDetail" component={FixerRequestDetailScreen} options={{ title: 'Request Details' }} />
      <QuotesStack.Screen name="SubmitQuote" component={SubmitQuoteScreen} options={{ title: 'Send / Edit Quote' }} />
      <QuotesStack.Screen
        name="ChatRoom"
        component={FixerChatRoomScreen}
        options={({ route }: any) => ({ title: route.params?.otherUserName || 'Customer Chat' })}
      />
    </QuotesStack.Navigator>
  );
}

// ── Jobs Stack ──
const JobsStack = createNativeStackNavigator<JobsStackParamList>();
function JobsNavigator() {
  return (
    <JobsStack.Navigator screenOptions={{ headerShadowVisible: false }}>
      <JobsStack.Screen name="JobsList" component={MyJobsScreen} options={{ headerShown: false }} />
      <JobsStack.Screen name="JobDetail" component={FixerJobDetailScreen} options={{ title: 'Job Details' }} />
      <JobsStack.Screen
        name="ChatRoom"
        component={FixerChatRoomScreen}
        options={({ route }: any) => ({ title: route.params?.otherUserName || 'Customer Chat' })}
      />
    </JobsStack.Navigator>
  );
}

// ── Chat Stack ──
const ChatStack = createNativeStackNavigator<ChatStackParamList>();
function ChatNavigator() {
  return (
    <ChatStack.Navigator screenOptions={{ headerShadowVisible: false }}>
      <ChatStack.Screen name="ConversationList" component={FixerConversationListScreen} options={{ headerShown: false }} />
      <ChatStack.Screen
        name="ChatRoom"
        component={FixerChatRoomScreen}
        options={({ route }: any) => ({ title: route.params?.otherUserName || 'Customer Chat' })}
      />
    </ChatStack.Navigator>
  );
}

// ── Profile Stack ──
const ProfileStack = createNativeStackNavigator<ProfileStackParamList>();
function ProfileNavigator() {
  return (
    <ProfileStack.Navigator screenOptions={{ headerShadowVisible: false }}>
      <ProfileStack.Screen name="Profile" component={FixerMainProfileScreen} options={{ headerShown: false }} />
      <ProfileStack.Screen name="EditProfile" component={FixerEditProfileScreen} options={{ title: 'Edit Profile' }} />
      <ProfileStack.Screen name="ManageMembers" component={FixerManageMembersScreen} options={{ title: 'Team & Technicians' }} />
      <ProfileStack.Screen name="ManageServices" component={FixerManageServicesScreen} options={{ title: 'Repair Specialties' }} />
      <ProfileStack.Screen name="ManageAreas" component={FixerManageAreasScreen} options={{ title: 'Service Coverage' }} />
      <ProfileStack.Screen name="Registration" component={FixerRegistrationScreen} options={{ title: 'Business Details & KYC' }} />
      <ProfileStack.Screen name="Notifications" component={FixerNotificationsScreen} options={{ title: 'Notifications' }} />
    </ProfileStack.Navigator>
  );
}

// ── Main Tab ──
const Tab = createBottomTabNavigator<MainTabParamList>();

const TAB_ICONS: Record<string, string> = {
  FeedTab: '📋',
  MapTab: '🗺️',
  MyJobsTab: '🔧',
  MyQuotesTab: '💰',
  ChatTab: '💬',
  ProfileTab: '👤',
};

export function MainTabNavigator() {
  const { user } = useAuthStore();
  const isMember = user?.role === 'FIXER_MEMBER';

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: () => <Text style={styles.tabIcon}>{TAB_ICONS[route.name]}</Text>,
        tabBarActiveTintColor: Colors.accent,
        tabBarInactiveTintColor: Colors.muted,
        tabBarLabelStyle: styles.tabLabel,
        tabBarStyle: styles.tabBar,
      })}
    >
      {!isMember && (
        <Tab.Screen name="FeedTab" component={FeedNavigator} options={{ tabBarLabel: 'Feed' }} />
      )}
      {!isMember && (
        <Tab.Screen name="MapTab" component={MapNavigator} options={{ tabBarLabel: 'Map' }} />
      )}
      <Tab.Screen
        name="MyJobsTab"
        component={JobsNavigator}
        options={{ tabBarLabel: isMember ? 'Assigned Jobs' : 'My Jobs' }}
      />
      {!isMember && (
        <Tab.Screen name="MyQuotesTab" component={QuotesNavigator} options={{ tabBarLabel: 'Quotes' }} />
      )}
      <Tab.Screen name="ChatTab" component={ChatNavigator} options={{ tabBarLabel: 'Chat' }} />
      <Tab.Screen name="ProfileTab" component={ProfileNavigator} options={{ tabBarLabel: 'Profile' }} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.white,
    borderTopColor: Colors.border,
    height: 60,
    paddingBottom: 8,
    paddingTop: 4,
  },
  tabLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
  },
  tabIcon: {
    fontSize: 20,
  },
});
