import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Linking,
  ScrollView,
  ActivityIndicator,
  Vibration
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Geolocation from '@react-native-community/geolocation';
import { theme } from '../../theme';

const EmergencyScreen = () => {
  const navigation = useNavigation();
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sosActive, setSosActive] = useState(false);
  const [emergencyContacts, setEmergencyContacts] = useState([
    { name: 'Local Police', number: '911', type: 'police' },
    { name: 'Medical Emergency', number: '911', type: 'medical' },
    { name: 'Fire Department', number: '911', type: 'fire' },
    { name: 'Tourist Helpline', number: '1-800-TOURIST', type: 'tourist' }
  ]);

  useEffect(() => {
    getCurrentLocation();
  }, []);

  const getCurrentLocation = () => {
    Geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        });
      },
      (error) => {
        console.log('Location error:', error);
        Alert.alert('Location Error', 'Unable to get current location');
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );
  };

  const triggerSOS = async () => {
    Alert.alert(
      'Emergency SOS',
      'This will alert emergency services and your emergency contacts. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'EMERGENCY',
          style: 'destructive',
          onPress: () => activateSOS()
        }
      ]
    );
  };

  const activateSOS = async () => {
    setSosActive(true);
    setLoading(true);
    
    // Vibrate to indicate SOS activation
    Vibration.vibrate([0, 500, 200, 500]);

    try {
      // Get current location
      getCurrentLocation();

      // TODO: Send SOS to backend
      const sosData = {
        location: location,
        timestamp: new Date().toISOString(),
        emergencyType: 'general',
        userId: 'current-user-id' // TODO: Get from auth context
      };

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));

      Alert.alert(
        'SOS Activated',
        'Emergency services and your contacts have been notified. Help is on the way.',
        [
          {
            text: 'OK',
            onPress: () => setSosActive(false)
          }
        ]
      );

    } catch (error) {
      Alert.alert('Error', 'Failed to send SOS. Please try calling emergency services directly.');
      setSosActive(false);
    } finally {
      setLoading(false);
    }
  };

  const callEmergencyNumber = (number) => {
    Alert.alert(
      'Call Emergency Services',
      `Call ${number}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Call',
          onPress: () => Linking.openURL(`tel:${number}`)
        }
      ]
    );
  };

  const shareLocation = () => {
    if (!location) {
      Alert.alert('Location Error', 'Location not available');
      return;
    }

    const locationUrl = `https://maps.google.com/?q=${location.latitude},${location.longitude}`;
    
    Alert.alert(
      'Share Location',
      'Share your current location with emergency contacts?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Share',
          onPress: () => {
            // TODO: Implement location sharing
            Alert.alert('Location Shared', 'Your location has been shared with emergency contacts');
          }
        }
      ]
    );
  };

  const startSafetyTimer = () => {
    Alert.alert(
      'Safety Check-in',
      'Set a safety timer. You will be prompted to check in at regular intervals.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: '30 minutes', onPress: () => setSafetyTimer(30) },
        { text: '1 hour', onPress: () => setSafetyTimer(60) },
        { text: '2 hours', onPress: () => setSafetyTimer(120) }
      ]
    );
  };

  const setSafetyTimer = (minutes) => {
    // TODO: Implement safety timer
    Alert.alert('Timer Set', `Safety check-in timer set for ${minutes} minutes`);
  };

  const reportIncident = () => {
    navigation.navigate('ReportIncident');
  };

  const viewSafetyTips = () => {
    navigation.navigate('SafetyTips');
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color={theme.colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Emergency</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* SOS Button */}
        <View style={styles.sosSection}>
          <TouchableOpacity
            style={[styles.sosButton, sosActive && styles.sosButtonActive]}
            onPress={triggerSOS}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="large" color={theme.colors.white} />
            ) : (
              <>
                <Icon name="warning" size={60} color={theme.colors.white} />
                <Text style={styles.sosButtonText}>
                  {sosActive ? 'SOS ACTIVE' : 'EMERGENCY SOS'}
                </Text>
                <Text style={styles.sosButtonSubtext}>
                  {sosActive ? 'Help is on the way' : 'Tap to alert emergency services'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          
          <View style={styles.quickActions}>
            <TouchableOpacity style={styles.quickAction} onPress={shareLocation}>
              <Icon name="my-location" size={24} color={theme.colors.primary} />
              <Text style={styles.quickActionText}>Share Location</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.quickAction} onPress={startSafetyTimer}>
              <Icon name="timer" size={24} color={theme.colors.primary} />
              <Text style={styles.quickActionText}>Safety Timer</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.quickAction} onPress={reportIncident}>
              <Icon name="report" size={24} color={theme.colors.primary} />
              <Text style={styles.quickActionText}>Report Incident</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.quickAction} onPress={viewSafetyTips}>
              <Icon name="info" size={24} color={theme.colors.primary} />
              <Text style={styles.quickActionText}>Safety Tips</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Emergency Contacts */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Emergency Contacts</Text>
          
          {emergencyContacts.map((contact, index) => (
            <TouchableOpacity
              key={index}
              style={styles.contactItem}
              onPress={() => callEmergencyNumber(contact.number)}
            >
              <View style={styles.contactIcon}>
                <Icon
                  name={
                    contact.type === 'police' ? 'local-police' :
                    contact.type === 'medical' ? 'local-hospital' :
                    contact.type === 'fire' ? 'local-fire-department' :
                    'help'
                  }
                  size={24}
                  color={theme.colors.white}
                />
              </View>
              <View style={styles.contactInfo}>
                <Text style={styles.contactName}>{contact.name}</Text>
                <Text style={styles.contactNumber}>{contact.number}</Text>
              </View>
              <Icon name="phone" size={20} color={theme.colors.primary} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Current Location */}
        {location && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Current Location</Text>
            <View style={styles.locationCard}>
              <Icon name="location-on" size={20} color={theme.colors.primary} />
              <View style={styles.locationInfo}>
                <Text style={styles.locationText}>
                  Lat: {location.latitude.toFixed(6)}
                </Text>
                <Text style={styles.locationText}>
                  Lng: {location.longitude.toFixed(6)}
                </Text>
                <Text style={styles.locationAccuracy}>
                  Accuracy: ±{Math.round(location.accuracy)}m
                </Text>
              </View>
              <TouchableOpacity onPress={getCurrentLocation}>
                <Icon name="refresh" size={20} color={theme.colors.primary} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Safety Features */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Safety Features</Text>
          
          <View style={styles.featureList}>
            <View style={styles.featureItem}>
              <Icon name="shield" size={20} color={theme.colors.success} />
              <Text style={styles.featureText}>Real-time location tracking</Text>
            </View>
            
            <View style={styles.featureItem}>
              <Icon name="notifications" size={20} color={theme.colors.success} />
              <Text style={styles.featureText}>Automatic emergency alerts</Text>
            </View>
            
            <View style={styles.featureItem}>
              <Icon name="people" size={20} color={theme.colors.success} />
              <Text style={styles.featureText}>Trusted contact notifications</Text>
            </View>
            
            <View style={styles.featureItem}>
              <Icon name="security" size={20} color={theme.colors.success} />
              <Text style={styles.featureText}>24/7 emergency support</Text>
            </View>
          </View>
        </View>

        {/* Emergency Tips */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Emergency Tips</Text>
          <View style={styles.tipsCard}>
            <Text style={styles.tipText}>• Stay calm and assess the situation</Text>
            <Text style={styles.tipText}>• Call local emergency services first</Text>
            <Text style={styles.tipText}>• Share your location with trusted contacts</Text>
            <Text style={styles.tipText}>• Keep important documents accessible</Text>
            <Text style={styles.tipText}>• Know your embassy contact information</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.error,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.white,
  },
  content: {
    flex: 1,
    padding: theme.spacing.lg,
  },
  sosSection: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  sosButton: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: theme.colors.error,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: theme.colors.error,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  sosButtonActive: {
    backgroundColor: theme.colors.warning,
  },
  sosButtonText: {
    color: theme.colors.white,
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: theme.spacing.sm,
    textAlign: 'center',
  },
  sosButtonSubtext: {
    color: theme.colors.white,
    fontSize: 12,
    marginTop: theme.spacing.xs,
    textAlign: 'center',
  },
  section: {
    marginBottom: theme.spacing.xl,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.dark,
    marginBottom: theme.spacing.md,
  },
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickAction: {
    width: '48%',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.lightGray,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
  },
  quickActionText: {
    fontSize: 14,
    color: theme.colors.dark,
    marginTop: theme.spacing.sm,
    textAlign: 'center',
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.lightGray,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
  },
  contactIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.error,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.dark,
  },
  contactNumber: {
    fontSize: 14,
    color: theme.colors.gray,
    marginTop: theme.spacing.xs,
  },
  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.lightGray,
    borderRadius: theme.borderRadius.md,
  },
  locationInfo: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  locationText: {
    fontSize: 14,
    color: theme.colors.dark,
    fontFamily: 'monospace',
  },
  locationAccuracy: {
    fontSize: 12,
    color: theme.colors.gray,
    marginTop: theme.spacing.xs,
  },
  featureList: {
    backgroundColor: theme.colors.lightGray,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  featureText: {
    fontSize: 14,
    color: theme.colors.dark,
    marginLeft: theme.spacing.md,
  },
  tipsCard: {
    backgroundColor: theme.colors.lightBlue,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
  },
  tipText: {
    fontSize: 14,
    color: theme.colors.dark,
    marginBottom: theme.spacing.sm,
    lineHeight: 20,
  },
});

export default EmergencyScreen;