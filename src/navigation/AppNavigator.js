import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { Home, PlusCircle, Bell, User } from 'lucide-react-native';

// Telas
import HomeScreen from '../screens/HomeScreen';
import AddTransactionScreen from '../screens/AddTransactionScreen';
import AlertsScreen from '../screens/AlertsScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: '#2563eb',
          tabBarInactiveTintColor: '#64748b',
          tabBarStyle: { height: 60, paddingBottom: 10 }
        }}
      >
        <Tab.Screen 
          name="Início" 
          component={HomeScreen} 
          options={{ tabBarIcon: ({ color }) => <Home color={color} size={24} /> }}
        />
        <Tab.Screen 
          name="Gastar" 
          component={AddTransactionScreen} 
          options={{ tabBarIcon: ({ color }) => <PlusCircle color={color} size={30} /> }}
        />
        <Tab.Screen 
          name="Alertas" 
          component={AlertsScreen} 
          options={{ tabBarIcon: ({ color }) => <Bell color={color} size={24} /> }}
        />
        <Tab.Screen 
          name="Perfil" 
          component={ProfileScreen} 
          options={{ tabBarIcon: ({ color }) => <User color={color} size={24} /> }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

