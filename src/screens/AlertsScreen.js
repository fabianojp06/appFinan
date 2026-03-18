import React from 'react';
import { View, Text } from 'react-native';

export default function AlertsScreen() {
  return (
    <View className="flex-1 bg-white items-center justify-center px-6">
      <Text className="text-xl font-bold text-gray-900">Alertas</Text>
      <Text className="text-gray-600 mt-2 text-center">
        Aqui você verá alertas importantes sobre seus gastos, metas e notificações financeiras.
      </Text>
    </View>
  );
}

