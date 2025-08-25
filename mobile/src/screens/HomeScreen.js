import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { theme } from '../theme';

// Import components
import Header from '../components/common/Header';
import TripCard from '../components/trips/TripCard';
import QuickActions from '../components/home/QuickActions';
import RecommendationCard from '../components/home/RecommendationCard';
import EmergencyButton from '../components/emergency/EmergencyButton';

const HomeScreen = ({ navigation }) => {
  const [refreshing, setRefreshing] = useState(false);
  const [userTrips, setUserTrips] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [nearbyEssentials, setNearbyEssentials] = useState([]);

  useEffect(() => {
    loadHomeData();
  }, []);

  const loadHomeData = async () => {
    try {
      // TODO: Implement API calls
      // Load user's active trips
      // Load personalized recommendations
      // Load nearby essentials
      console.log('Loading home data...');
    } catch (error) {
      console.error('Error loading home data:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadHomeData();
    setRefreshing(false);
  };

  const handleCreateTrip = () => {
    navigation.navigate('CreateTrip');
  };

  const handleExploreTrips = () => {
    navigation.navigate('Explore');
  };

  const handleEmergency = () => {
    navigation.navigate('Emergency');
  };

  const handleNearbyEssentials = () => {
    navigation.navigate('Nearby');
  };

  const mockTrips = [
    {
      id: '1',
      destination: 'Bali, Indonesia',
      startDate: '2024-03-15',
      endDate: '2024-03-22',
      budget: 1500,
      interests: ['Adventure', 'Culture', 'Food'],
      creator: {
        name: 'Sarah Johnson',
        profilePicture: null,
        verificationStatus: 'verified'
      }
    },
    {
      id: '2',
      destination: 'Tokyo, Japan',
      startDate: '2024-04-10',
      endDate: '2024-04-17',
      budget: 2000,
      interests: ['Culture', 'Food', 'Technology'],
      creator: {
        name: 'Mike Chen',
        profilePicture: null,
        verificationStatus: 'verified'
      }
    }
  ];

  const mockRecommendations = [
    {
      id: '1',
      type: 'destination',
      title: 'Trending: Santorini, Greece',
      description: '15 travelers planning trips here this month',
      image: null,
      action: 'Explore'
    },
    {
      id: '2',
      type: 'tip',
      title: 'Travel Tip: Best Time to Visit Thailand',
      description: 'Avoid monsoon season for the best experience',
      image: null,
      action: 'Read More'
    }
  ];

  return (
    <View style={styles.container}>
      <Header 
        title="Welcome back!"
        showNotifications
        onNotificationPress={() => {/* TODO: Handle notifications */}}
      />
      
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Quick Actions */}
        <QuickActions
          onCreateTrip={handleCreateTrip}
          onExploreTrips={handleExploreTrips}
          onNearbyEssentials={handleNearbyEssentials}
          onEmergency={handleEmergency}
        />

        {/* My Active Trips */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>My Active Trips</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Trips')}>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>
          
          {mockTrips.length > 0 ? (
            mockTrips.slice(0, 2).map((trip) => (
              <TripCard
                key={trip.id}
                trip={trip}
                onPress={() => {/* TODO: Navigate to trip details */}}
                showActions={false}
              />
            ))
          ) : (
            <View style={styles.emptyState}>
              <Icon name="card-travel" size={48} color={theme.colors.gray} />
              <Text style={styles.emptyStateText}>No active trips</Text>
              <TouchableOpacity style={styles.createTripButton} onPress={handleCreateTrip}>
                <Text style={styles.createTripButtonText}>Create Your First Trip</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Recommendations */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recommended for You</Text>
          {mockRecommendations.map((recommendation) => (
            <RecommendationCard
              key={recommendation.id}
              recommendation={recommendation}
              onPress={() => {/* TODO: Handle recommendation press */}}
            />
          ))}
        </View>

        {/* Nearby Essentials Preview */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Nearby Essentials</Text>
            <TouchableOpacity onPress={handleNearbyEssentials}>
              <Text style={styles.seeAllText}>View All</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.essentialsGrid}>
            <TouchableOpacity style={styles.essentialItem}>
              <Icon name="hotel" size={24} color={theme.colors.primary} />
              <Text style={styles.essentialText}>Hotels</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.essentialItem}>
              <Icon name="restaurant" size={24} color={theme.colors.primary} />
              <Text style={styles.essentialText}>Restaurants</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.essentialItem}>
              <Icon name="local-gas-station" size={24} color={theme.colors.primary} />
              <Text style={styles.essentialText}>Gas Stations</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.essentialItem}>
              <Icon name="local-atm" size={24} color={theme.colors.primary} />
              <Text style={styles.essentialText}>ATMs</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Emergency Button */}
      <EmergencyButton onPress={handleEmergency} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: theme.spacing.md,
  },
  section: {
    marginBottom: theme.spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: theme.fontSizes.xl,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  seeAllText: {
    fontSize: theme.fontSizes.md,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xl,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
  },
  emptyStateText: {
    fontSize: theme.fontSizes.md,
    color: theme.colors.gray,
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  createTripButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
  },
  createTripButtonText: {
    color: theme.colors.white,
    fontSize: theme.fontSizes.md,
    fontWeight: '600',
  },
  essentialsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  essentialItem: {
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    flex: 1,
    marginHorizontal: 4,
  },
  essentialText: {
    fontSize: theme.fontSizes.sm,
    color: theme.colors.text,
    marginTop: theme.spacing.xs,
    textAlign: 'center',
  },
});

export default HomeScreen;