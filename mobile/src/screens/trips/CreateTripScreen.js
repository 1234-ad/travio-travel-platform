import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Switch
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { theme } from '../../theme';

const CreateTripScreen = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  
  const [tripData, setTripData] = useState({
    title: '',
    description: '',
    destination: {
      city: '',
      country: '',
      region: ''
    },
    dates: {
      start: new Date(),
      end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
    },
    budget: '',
    currency: 'USD',
    travelMode: 'flight',
    interests: [],
    openToPartners: true,
    maxParticipants: 4,
    privacy: 'public'
  });

  const [errors, setErrors] = useState({});

  const travelModes = [
    { id: 'flight', label: 'Flight', icon: 'flight' },
    { id: 'car', label: 'Car', icon: 'directions-car' },
    { id: 'train', label: 'Train', icon: 'train' },
    { id: 'bus', label: 'Bus', icon: 'directions-bus' },
    { id: 'bike', label: 'Bike', icon: 'directions-bike' }
  ];

  const interestOptions = [
    'Adventure', 'Culture', 'Food', 'Nightlife', 'Nature', 'Photography',
    'History', 'Art', 'Music', 'Sports', 'Shopping', 'Relaxation',
    'Wildlife', 'Architecture', 'Local Experience', 'Festivals'
  ];

  const privacyOptions = [
    { id: 'public', label: 'Public', description: 'Anyone can see and join' },
    { id: 'friends', label: 'Friends Only', description: 'Only your friends can see' },
    { id: 'private', label: 'Private', description: 'Invite only' }
  ];

  const handleInputChange = (field, value) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setTripData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setTripData(prev => ({
        ...prev,
        [field]: value
      }));
    }

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: null
      }));
    }
  };

  const toggleInterest = (interest) => {
    setTripData(prev => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter(i => i !== interest)
        : [...prev.interests, interest]
    }));
  };

  const validateForm = () => {
    const newErrors = {};

    if (!tripData.title.trim()) {
      newErrors.title = 'Trip title is required';
    }

    if (!tripData.description.trim()) {
      newErrors.description = 'Trip description is required';
    }

    if (!tripData.destination.city.trim()) {
      newErrors['destination.city'] = 'Destination city is required';
    }

    if (!tripData.destination.country.trim()) {
      newErrors['destination.country'] = 'Destination country is required';
    }

    if (!tripData.budget || isNaN(tripData.budget)) {
      newErrors.budget = 'Valid budget amount is required';
    }

    if (tripData.dates.start >= tripData.dates.end) {
      newErrors.dates = 'End date must be after start date';
    }

    if (tripData.interests.length === 0) {
      newErrors.interests = 'Please select at least one interest';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreateTrip = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      // TODO: Replace with actual API call
      const response = await fetch(`${process.env.API_URL}/api/trips`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await getToken()}` // TODO: Get actual token
        },
        body: JSON.stringify(tripData),
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert(
          'Success',
          'Trip created successfully!',
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack()
            }
          ]
        );
      } else {
        Alert.alert('Error', data.message || 'Failed to create trip');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getToken = async () => {
    // TODO: Get token from AsyncStorage
    return 'dummy-token';
  };

  const onDateChange = (event, selectedDate, type) => {
    if (type === 'start') {
      setShowStartDatePicker(false);
      if (selectedDate) {
        handleInputChange('dates.start', selectedDate);
      }
    } else {
      setShowEndDatePicker(false);
      if (selectedDate) {
        handleInputChange('dates.end', selectedDate);
      }
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color={theme.colors.dark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Trip</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Basic Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basic Information</Text>
          
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Trip Title *</Text>
            <TextInput
              style={[styles.input, errors.title && styles.inputError]}
              placeholder="e.g., Amazing Japan Adventure"
              value={tripData.title}
              onChangeText={(value) => handleInputChange('title', value)}
            />
            {errors.title && <Text style={styles.errorText}>{errors.title}</Text>}
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Description *</Text>
            <TextInput
              style={[styles.textArea, errors.description && styles.inputError]}
              placeholder="Describe your trip plans, what you want to do, and what kind of travel companion you're looking for..."
              value={tripData.description}
              onChangeText={(value) => handleInputChange('description', value)}
              multiline
              numberOfLines={4}
            />
            {errors.description && <Text style={styles.errorText}>{errors.description}</Text>}
          </View>
        </View>

        {/* Destination */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Destination</Text>
          
          <View style={styles.inputContainer}>
            <Text style={styles.label}>City *</Text>
            <TextInput
              style={[styles.input, errors['destination.city'] && styles.inputError]}
              placeholder="e.g., Tokyo"
              value={tripData.destination.city}
              onChangeText={(value) => handleInputChange('destination.city', value)}
            />
            {errors['destination.city'] && <Text style={styles.errorText}>{errors['destination.city']}</Text>}
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Country *</Text>
            <TextInput
              style={[styles.input, errors['destination.country'] && styles.inputError]}
              placeholder="e.g., Japan"
              value={tripData.destination.country}
              onChangeText={(value) => handleInputChange('destination.country', value)}
            />
            {errors['destination.country'] && <Text style={styles.errorText}>{errors['destination.country']}</Text>}
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Region (Optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Kanto Region"
              value={tripData.destination.region}
              onChangeText={(value) => handleInputChange('destination.region', value)}
            />
          </View>
        </View>

        {/* Dates */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Travel Dates</Text>
          
          <View style={styles.dateContainer}>
            <View style={styles.dateInput}>
              <Text style={styles.label}>Start Date</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowStartDatePicker(true)}
              >
                <Icon name="date-range" size={20} color={theme.colors.gray} />
                <Text style={styles.dateText}>
                  {tripData.dates.start.toLocaleDateString()}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.dateInput}>
              <Text style={styles.label}>End Date</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowEndDatePicker(true)}
              >
                <Icon name="date-range" size={20} color={theme.colors.gray} />
                <Text style={styles.dateText}>
                  {tripData.dates.end.toLocaleDateString()}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          {errors.dates && <Text style={styles.errorText}>{errors.dates}</Text>}
        </View>

        {/* Budget */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Budget</Text>
          
          <View style={styles.budgetContainer}>
            <View style={styles.budgetInput}>
              <Text style={styles.label}>Amount *</Text>
              <TextInput
                style={[styles.input, errors.budget && styles.inputError]}
                placeholder="1000"
                value={tripData.budget}
                onChangeText={(value) => handleInputChange('budget', value)}
                keyboardType="numeric"
              />
            </View>
            
            <View style={styles.currencyInput}>
              <Text style={styles.label}>Currency</Text>
              <TouchableOpacity style={styles.currencyButton}>
                <Text style={styles.currencyText}>{tripData.currency}</Text>
                <Icon name="keyboard-arrow-down" size={20} color={theme.colors.gray} />
              </TouchableOpacity>
            </View>
          </View>
          {errors.budget && <Text style={styles.errorText}>{errors.budget}</Text>}
        </View>

        {/* Travel Mode */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Travel Mode</Text>
          <View style={styles.travelModeContainer}>
            {travelModes.map((mode) => (
              <TouchableOpacity
                key={mode.id}
                style={[
                  styles.travelModeButton,
                  tripData.travelMode === mode.id && styles.travelModeButtonActive
                ]}
                onPress={() => handleInputChange('travelMode', mode.id)}
              >
                <Icon
                  name={mode.icon}
                  size={24}
                  color={tripData.travelMode === mode.id ? theme.colors.white : theme.colors.gray}
                />
                <Text
                  style={[
                    styles.travelModeText,
                    tripData.travelMode === mode.id && styles.travelModeTextActive
                  ]}
                >
                  {mode.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Interests */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Interests *</Text>
          <View style={styles.interestsContainer}>
            {interestOptions.map((interest) => (
              <TouchableOpacity
                key={interest}
                style={[
                  styles.interestChip,
                  tripData.interests.includes(interest) && styles.interestChipActive
                ]}
                onPress={() => toggleInterest(interest)}
              >
                <Text
                  style={[
                    styles.interestText,
                    tripData.interests.includes(interest) && styles.interestTextActive
                  ]}
                >
                  {interest}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {errors.interests && <Text style={styles.errorText}>{errors.interests}</Text>}
        </View>

        {/* Trip Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Trip Settings</Text>
          
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Open to Partners</Text>
              <Text style={styles.settingDescription}>
                Allow other travelers to request to join your trip
              </Text>
            </View>
            <Switch
              value={tripData.openToPartners}
              onValueChange={(value) => handleInputChange('openToPartners', value)}
              trackColor={{ false: theme.colors.lightGray, true: theme.colors.primary }}
            />
          </View>

          {tripData.openToPartners && (
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Maximum Participants</Text>
              <TextInput
                style={styles.input}
                placeholder="4"
                value={tripData.maxParticipants.toString()}
                onChangeText={(value) => handleInputChange('maxParticipants', parseInt(value) || 1)}
                keyboardType="numeric"
              />
            </View>
          )}

          <View style={styles.privacyContainer}>
            <Text style={styles.label}>Privacy</Text>
            {privacyOptions.map((option) => (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.privacyOption,
                  tripData.privacy === option.id && styles.privacyOptionActive
                ]}
                onPress={() => handleInputChange('privacy', option.id)}
              >
                <View style={styles.privacyInfo}>
                  <Text
                    style={[
                      styles.privacyLabel,
                      tripData.privacy === option.id && styles.privacyLabelActive
                    ]}
                  >
                    {option.label}
                  </Text>
                  <Text style={styles.privacyDescription}>{option.description}</Text>
                </View>
                <Icon
                  name={tripData.privacy === option.id ? 'radio-button-checked' : 'radio-button-unchecked'}
                  size={20}
                  color={tripData.privacy === option.id ? theme.colors.primary : theme.colors.gray}
                />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Create Button */}
        <TouchableOpacity
          style={[styles.createButton, loading && styles.createButtonDisabled]}
          onPress={handleCreateTrip}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={theme.colors.white} />
          ) : (
            <Text style={styles.createButtonText}>Create Trip</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Date Pickers */}
      {showStartDatePicker && (
        <DateTimePicker
          value={tripData.dates.start}
          mode="date"
          display="default"
          onChange={(event, date) => onDateChange(event, date, 'start')}
          minimumDate={new Date()}
        />
      )}

      {showEndDatePicker && (
        <DateTimePicker
          value={tripData.dates.end}
          mode="date"
          display="default"
          onChange={(event, date) => onDateChange(event, date, 'end')}
          minimumDate={tripData.dates.start}
        />
      )}
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
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.lightGray,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.dark,
  },
  content: {
    flex: 1,
    padding: theme.spacing.lg,
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
  inputContainer: {
    marginBottom: theme.spacing.md,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.dark,
    marginBottom: theme.spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.lightGray,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    fontSize: 16,
    color: theme.colors.dark,
  },
  textArea: {
    borderWidth: 1,
    borderColor: theme.colors.lightGray,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    fontSize: 16,
    color: theme.colors.dark,
    height: 100,
    textAlignVertical: 'top',
  },
  inputError: {
    borderColor: theme.colors.error,
  },
  errorText: {
    color: theme.colors.error,
    fontSize: 14,
    marginTop: theme.spacing.xs,
  },
  dateContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dateInput: {
    flex: 1,
    marginHorizontal: theme.spacing.xs,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.lightGray,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  dateText: {
    marginLeft: theme.spacing.sm,
    fontSize: 16,
    color: theme.colors.dark,
  },
  budgetContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  budgetInput: {
    flex: 1,
    marginRight: theme.spacing.md,
  },
  currencyInput: {
    width: 80,
  },
  currencyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.lightGray,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
  },
  currencyText: {
    fontSize: 16,
    color: theme.colors.dark,
    marginRight: theme.spacing.xs,
  },
  travelModeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  travelModeButton: {
    width: '18%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.lightGray,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
  },
  travelModeButtonActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  travelModeText: {
    fontSize: 12,
    color: theme.colors.gray,
    marginTop: theme.spacing.xs,
  },
  travelModeTextActive: {
    color: theme.colors.white,
  },
  interestsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  interestChip: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.lightGray,
    borderRadius: theme.borderRadius.full,
    marginRight: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  interestChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  interestText: {
    fontSize: 14,
    color: theme.colors.gray,
  },
  interestTextActive: {
    color: theme.colors.white,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
  },
  settingInfo: {
    flex: 1,
    marginRight: theme.spacing.md,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.dark,
  },
  settingDescription: {
    fontSize: 14,
    color: theme.colors.gray,
    marginTop: theme.spacing.xs,
  },
  privacyContainer: {
    marginTop: theme.spacing.md,
  },
  privacyOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.lightGray,
  },
  privacyOptionActive: {
    backgroundColor: theme.colors.lightBlue,
  },
  privacyInfo: {
    flex: 1,
  },
  privacyLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.dark,
  },
  privacyLabelActive: {
    color: theme.colors.primary,
  },
  privacyDescription: {
    fontSize: 14,
    color: theme.colors.gray,
    marginTop: theme.spacing.xs,
  },
  createButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
  },
  createButtonDisabled: {
    opacity: 0.7,
  },
  createButtonText: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default CreateTripScreen;