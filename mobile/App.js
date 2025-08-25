import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import Icon from 'react-native-vector-icons/MaterialIcons';
import SplashScreen from 'react-native-splash-screen';

// Import screens
import OnboardingScreen from './src/screens/OnboardingScreen';
import LoginScreen from './src/screens/auth/LoginScreen';
import RegisterScreen from './src/screens/auth/RegisterScreen';
import HomeScreen from './src/screens/HomeScreen';
import TripsScreen from './src/screens/trips/TripsScreen';
import CreateTripScreen from './src/screens/trips/CreateTripScreen';
import ExploreScreen from './src/screens/ExploreScreen';
import MatchesScreen from './src/screens/matches/MatchesScreen';
import CommunityScreen from './src/screens/community/CommunityScreen';
import ProfileScreen from './src/screens/profile/ProfileScreen';
import EmergencyScreen from './src/screens/emergency/EmergencyScreen';
import NearbyScreen from './src/screens/nearby/NearbyScreen';

// Import store
import { store, persistor } from './src/store';

// Import theme
import { theme } from './src/theme';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Auth Stack
const AuthStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Onboarding" component={OnboardingScreen} />
    <Stack.Screen name="Login" component={LoginScreen} />
    <Stack.Screen name="Register" component={RegisterScreen} />
  </Stack.Navigator>
);

// Main Tab Navigator
const MainTabs = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      tabBarIcon: ({ focused, color, size }) => {
        let iconName;

        switch (route.name) {
          case 'Home':
            iconName = 'home';
            break;
          case 'Trips':
            iconName = 'card-travel';
            break;
          case 'Explore':
            iconName = 'explore';
            break;
          case 'Community':
            iconName = 'people';
            break;
          case 'Profile':
            iconName = 'person';
            break;
          default:
            iconName = 'help';
        }

        return <Icon name={iconName} size={size} color={color} />;
      },
      tabBarActiveTintColor: theme.colors.primary,
      tabBarInactiveTintColor: theme.colors.gray,
      tabBarStyle: {
        backgroundColor: theme.colors.white,
        borderTopWidth: 1,
        borderTopColor: theme.colors.lightGray,
        paddingBottom: 5,
        paddingTop: 5,
        height: 60,
      },
      headerShown: false,
    })}
  >
    <Tab.Screen name="Home" component={HomeScreen} />
    <Tab.Screen name="Trips" component={TripsScreen} />
    <Tab.Screen name="Explore" component={ExploreScreen} />
    <Tab.Screen name="Community" component={CommunityScreen} />
    <Tab.Screen name="Profile" component={ProfileScreen} />
  </Tab.Navigator>
);

// Main App Stack
const AppStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="MainTabs" component={MainTabs} />
    <Stack.Screen name="CreateTrip" component={CreateTripScreen} />
    <Stack.Screen name="Matches" component={MatchesScreen} />
    <Stack.Screen name="Emergency" component={EmergencyScreen} />
    <Stack.Screen name="Nearby" component={NearbyScreen} />
  </Stack.Navigator>
);

const App = () => {
  useEffect(() => {
    // Hide splash screen after app loads
    SplashScreen.hide();
  }, []);

  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <NavigationContainer>
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            {/* TODO: Add authentication logic here */}
            <Stack.Screen name="Auth" component={AuthStack} />
            <Stack.Screen name="App" component={AppStack} />
          </Stack.Navigator>
        </NavigationContainer>
      </PersistGate>
    </Provider>
  );
};

export default App;