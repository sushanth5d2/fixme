import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HomeStackParamList } from './types';
import { HomeScreen } from '../screens/home/HomeScreen';
import { CreateRequestScreen } from '../screens/home/CreateRequestScreen';
import { RequestDetailScreen } from '../screens/requests/RequestDetailScreen';
import { FixerProfileScreen } from '../screens/fixer/FixerProfileScreen';
import { ChatRoomScreen } from '../screens/chat/ChatRoomScreen';
import { Colors } from '../theme/tokens';

const Stack = createNativeStackNavigator<HomeStackParamList>();

export function HomeNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: Colors.white },
        headerTintColor: Colors.text,
        headerShadowVisible: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen
        name="Home"
        component={HomeScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="CreateRequest"
        component={CreateRequestScreen}
        options={{ title: 'New Repair Request' }}
      />
      <Stack.Screen
        name="RequestDetail"
        component={RequestDetailScreen}
        options={{ title: 'Request Details' }}
      />
      <Stack.Screen
        name="FixerProfile"
        component={FixerProfileScreen}
        options={{ title: 'Fixer Profile' }}
      />
      <Stack.Screen
        name="ChatRoom"
        component={ChatRoomScreen}
        options={({ route }: any) => ({ title: route.params?.otherUserName || 'Chat' })}
      />
    </Stack.Navigator>
  );
}
