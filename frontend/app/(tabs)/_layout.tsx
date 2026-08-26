import { Tabs } from 'expo-router';
import { TabBar } from '@/components/ui/TabBar';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false, animation: 'shift' }}
      tabBar={() => <TabBar />}
    >
      <Tabs.Screen name="index" options={{ title: 'Events' }} />
      <Tabs.Screen name="balances" options={{ title: 'Balances' }} />
      <Tabs.Screen name="profile" options={{ title: 'You' }} />
    </Tabs>
  );
}
