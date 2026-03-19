import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { Home, PlusCircle, User, Globe, MessageSquare } from 'lucide-react-native';

// Importação dos Provedores de Contexto (Cérebros do App)
import { ThemeProvider, ThemeContext } from '../contexts/ThemeContext';
import { UserProvider } from '../contexts/UserContext'; // Adicionado para gerenciar o nome do usuário

// Importação das Telas
import NewsScreen from '../screens/NewsScreen'; 
import HomeScreen from '../screens/HomeScreen';
import AddTransactionScreen from '../screens/AddTransactionScreen';
import AiManagerScreen from '../screens/AiManagerScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator();

// Componente interno para aplicar estilos dinâmicos baseados no tema (Dark/Light)
function TabNavigator() {
  const { isDark } = React.useContext(ThemeContext);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#2563eb',
        tabBarInactiveTintColor: '#64748b',
        tabBarStyle: { 
          height: 60, 
          paddingBottom: 10,
          backgroundColor: isDark ? '#0f172a' : '#ffffff', // Fundo dinâmico da barra inferior
          borderTopColor: isDark ? '#1e293b' : '#e2e8f0'   // Linha superior dinâmica
        }
      }}
    >
      <Tab.Screen 
        name="Início" 
        component={HomeScreen} 
        options={{ tabBarIcon: ({ color }) => <Home color={color} size={24} /> }} 
      />
      <Tab.Screen 
        name="Lançar" 
        component={AddTransactionScreen} 
        options={{ tabBarIcon: ({ color }) => <PlusCircle color={color} size={30} /> }} 
      />
      <Tab.Screen 
        name="Radar" 
        component={NewsScreen} 
        options={{ tabBarIcon: ({ color }) => <Globe color={color} size={24} /> }} 
      />
      <Tab.Screen 
        name="Gestor IA" 
        component={AiManagerScreen} 
        options={{ tabBarIcon: ({ color }) => <MessageSquare color={color} size={24} /> }} 
      />
      <Tab.Screen 
        name="Perfil" 
        component={ProfileScreen} 
        options={{ tabBarIcon: ({ color }) => <User color={color} size={24} /> }} 
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <ThemeProvider>
      <UserProvider>
        <NavigationContainer>
          <TabNavigator />
        </NavigationContainer>
      </UserProvider>
    </ThemeProvider>
  );
}