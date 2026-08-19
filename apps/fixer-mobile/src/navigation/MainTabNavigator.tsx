import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, StyleSheet, View } from 'react-native';
import { MainTabParamList, FeedStackParamList, JobsStackParamList, ChatStackParamList, ProfileStackParamList } from './types';
import { RequestFeedScreen } from '../screens/home/RequestFeedScreen';
import { SubmitQuoteScreen } from '../screens/home/SubmitQuoteScreen';
import { MyQuotesScreen } from '../screens/home/MyQuotesScreen';
import { MyJobsScreen } from '../screens/jobs/MyJobsScreen';
import { FixerJobDetailScreen } from '../screens/jobs/FixerJobDetailScreen';
import { FixerRegistrationScreen } from '../screens/profile/FixerRegistrationScreen';
import { Colors, FontSize, FontWeight, Spacing } from '../theme/tokens';

// Placeholder screens
function PlaceholderScreen({ icon, title, subtitle }: { icon: string; title: string; subtitle: string }) {
  return (
    <View style={pStyles.container}>
      <Text style={pStyles.icon}>{icon}</Text>
      <Text style={pStyles.title}>{title}</Text>
      <Text style={pStyles.subtitle}>{subtitle}</Text>
    </View>
  );
}
const pStyles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.bg, paddingHorizontal: Spacing.xl },
  icon: { fontSize: 48, marginBottom: Spacing.md },
  title: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.text, marginBottom: Spacing.sm },
  subtitle: { fontSize: FontSize.base, color: Colors.textSecondary, textAlign: 'center' },
});

function ChatPlaceholder() {
  return <PlaceholderScreen icon="💬" title="Messages" subtitle="Chat with your customers" />;
}
function ProfilePlaceholder() {
  return <PlaceholderScreen icon="👤" title="Profile" subtitle="Manage your business profile" />;
}

// ── Feed Stack ──
const FeedStack = createNativeStackNavigator<FeedStackParamList>();
function FeedNavigator() {
  return (
    <FeedStack.Navigator screenOptions={{ headerShadowVisible: false }}>
      <FeedStack.Screen name="Feed" component={RequestFeedScreen} options={{ headerShown: false }} />
      <FeedStack.Screen name="SubmitQuote" component={SubmitQuoteScreen} options={{ title: 'Send Quote' }} />
    </FeedStack.Navigator>
  );
}

// ── Jobs Stack ──
const JobsStack = createNativeStackNavigator<JobsStackParamList>();
function JobsNavigator() {
  return (
    <JobsStack.Navigator screenOptions={{ headerShadowVisible: false }}>
      <JobsStack.Screen name="JobsList" component={MyJobsScreen} options={{ headerShown: false }} />
      <JobsStack.Screen name="JobDetail" component={FixerJobDetailScreen} options={{ title: 'Job Details' }} />
    </JobsStack.Navigator>
  );
}

// ── Main Tab ──
const Tab = createBottomTabNavigator<MainTabParamList>();

const TAB_ICONS: Record<string, string> = {
  FeedTab: '📋',
  MyJobsTab: '🔧',
  MyQuotesTab: '💰',
  ChatTab: '💬',
  ProfileTab: '👤',
};

export function MainTabNavigator() {
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
      <Tab.Screen name="FeedTab" component={FeedNavigator} options={{ tabBarLabel: 'Feed' }} />
      <Tab.Screen name="MyJobsTab" component={JobsNavigator} options={{ tabBarLabel: 'My Jobs' }} />
      <Tab.Screen name="MyQuotesTab" component={MyQuotesScreen} options={{ tabBarLabel: 'Quotes' }} />
      <Tab.Screen name="ChatTab" component={ChatPlaceholder} options={{ tabBarLabel: 'Chat' }} />
      <Tab.Screen name="ProfileTab" component={ProfilePlaceholder} options={{ tabBarLabel: 'Profile' }} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: { backgroundColor: Colors.white, borderTopColor: Colors.borderLight, height: 60, paddingBottom: 6, paddingTop: 4 },
  tabIcon: { fontSize: 22 },
  tabLabel: { fontSize: FontSize.xs, fontWeight: FontWeight.medium },
});
