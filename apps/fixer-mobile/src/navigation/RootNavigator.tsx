import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { MainTabNavigator } from './MainTabNavigator';
import { FixerLoginScreen, FixerSignupScreen, FixerOtpVerifyScreen } from '../screens/auth/FixerAuthScreens';
import { FixerUnderReviewScreen } from '../screens/auth/FixerUnderReviewScreen';
import { FixerEditProfileScreen } from '../screens/profile/FixerEditProfileScreen';
import { useAuthStore } from '../stores/auth.store';
import { Colors } from '../theme/tokens';
import { AuthStackParamList } from './types';

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const ReviewStack = createNativeStackNavigator();

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <AuthStack.Screen name="Login" component={FixerLoginScreen} />
      <AuthStack.Screen name="Signup" component={FixerSignupScreen} />
      <AuthStack.Screen name="OtpVerify" component={FixerOtpVerifyScreen} />
    </AuthStack.Navigator>
  );
}

function UnderReviewNavigator() {
  return (
    <ReviewStack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <ReviewStack.Screen name="UnderReview" component={FixerUnderReviewScreen} />
      <ReviewStack.Screen
        name="EditProfile"
        component={FixerEditProfileScreen}
        options={{
          headerShown: true,
          title: 'Edit Business Profile & KYC',
          headerBackTitle: 'Back',
          headerTintColor: Colors.accent,
        }}
      />
    </ReviewStack.Navigator>
  );
}

export function RootNavigator() {
  const { isAuthenticated, isLoading, checkAuth, user, fixerProfile } = useAuthStore();

  useEffect(() => { checkAuth(); }, []);

  if (isLoading) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator size="large" color={Colors.accent} />
      </View>
    );
  }

  const isOwner = user?.role === 'FIXER';
  const isVerified = !isOwner || fixerProfile?.verificationStatus === 'VERIFIED';

  return (
    <NavigationContainer>
      {!isAuthenticated ? (
        <AuthNavigator />
      ) : isVerified ? (
        <MainTabNavigator />
      ) : (
        <UnderReviewNavigator />
      )}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  splash: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.white },
});

