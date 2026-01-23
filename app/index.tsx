import { MaterialIcons } from "@expo/vector-icons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import type { ComponentType, JSX } from "react";
import ExploreScreen from "./(tabs)/components";
import HomeScreen from "./(tabs)/index";

const Tab = createBottomTabNavigator();

export default function Index(): JSX.Element {
  const screenOptions = {
    headerShown: false,
  } as const;

  const renderIcon = (
    name: string
  ): ((props: {focused: boolean }) => JSX.Element) => {
    const IconComponent = () =>
      <MaterialIcons name={name as any} size={24} />;
    IconComponent.displayName = `TabIcon(${name})`;
    return IconComponent;
  }


  const tabScreen = (
    name: string,
    component: ComponentType<any>,
    iconName: string,
  ) => (
    <Tab.Screen
      key={name}
      name={name}
      component={component}
      options={{
        tabBarLabel: name,
        tabBarIcon: renderIcon(iconName),
      }}
    />
  );

  return (
    <Tab.Navigator screenOptions={screenOptions}>
      {tabScreen("Home", HomeScreen, "home")}
    </Tab.Navigator>
  );
}
