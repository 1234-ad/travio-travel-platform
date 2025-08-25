import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Image,
} from 'react-native';
import { FlatList } from 'react-native-gesture-handler';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { theme } from '../theme';

const { width, height } = Dimensions.get('window');

const onboardingData = [
  {
    id: '1',
    title: 'Meet Fellow Travelers',
    subtitle: 'Connect with like-minded travelers worldwide',
    description: 'Find travel companions who share your interests, budget, and travel style. Build meaningful connections before you even start your journey.',
    icon: 'people',
    color: theme.colors.primary,
  },
  {
    id: '2',
    title: 'Smart Trip Matching',
    subtitle: 'AI-powered compatibility scoring',
    description: 'Our intelligent algorithm matches you with travelers based on destinations, dates, interests, and compatibility factors.',
    icon: 'psychology',
    color: theme.colors.secondary,
  },
  {
    id: '3',
    title: 'Travel Safely',
    subtitle: 'Advanced safety features for peace of mind',
    description: 'Emergency SOS, real-time location sharing, identity verification, and 24/7 support to ensure your safety while traveling.',
    icon: 'security',
    color: theme.colors.accent,
  },
  {
    id: '4',
    title: 'Discover & Explore',
    subtitle: 'Find amazing places and experiences',
    description: 'Get personalized recommendations for accommodations, restaurants, activities, and hidden gems from fellow travelers.',
    icon: 'explore',
    color: theme.colors.adventure,
  },
];

const OnboardingScreen = ({ navigation }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef(null);

  const handleNext = () => {
    if (currentIndex < onboardingData.length - 1) {
      const nextIndex = currentIndex + 1;
      flatListRef.current?.scrollToIndex({ index: nextIndex });
      setCurrentIndex(nextIndex);
    } else {
      navigation.navigate('Login');
    }
  };

  const handleSkip = () => {
    navigation.navigate('Login');
  };

  const handleScroll = (event) => {
    const scrollPosition = event.nativeEvent.contentOffset.x;
    const index = Math.round(scrollPosition / width);
    setCurrentIndex(index);
  };

  const renderOnboardingItem = ({ item }) => (
    <View style={[styles.slide, { backgroundColor: item.color + '10' }]}>
      <View style={styles.iconContainer}>
        <View style={[styles.iconCircle, { backgroundColor: item.color }]}>
          <Icon name={item.icon} size={60} color={theme.colors.white} />
        </View>
      </View>
      
      <View style={styles.content}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.subtitle}>{item.subtitle}</Text>
        <Text style={styles.description}>{item.description}</Text>
      </View>
    </View>
  );

  const renderPagination = () => (
    <View style={styles.pagination}>
      {onboardingData.map((_, index) => (
        <View
          key={index}
          style={[
            styles.paginationDot,
            {
              backgroundColor: index === currentIndex 
                ? onboardingData[currentIndex].color 
                : theme.colors.lightGray,
              width: index === currentIndex ? 24 : 8,
            },
          ]}
        />
      ))}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.logo}>Travio</Text>
        <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>

      {/* Onboarding Slides */}
      <FlatList
        ref={flatListRef}
        data={onboardingData}
        renderItem={renderOnboardingItem}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        keyExtractor={(item) => item.id}
      />

      {/* Footer */}
      <View style={styles.footer}>
        {renderPagination()}
        
        <TouchableOpacity 
          style={[
            styles.nextButton, 
            { backgroundColor: onboardingData[currentIndex].color }
          ]} 
          onPress={handleNext}
        >
          <Text style={styles.nextButtonText}>
            {currentIndex === onboardingData.length - 1 ? 'Get Started' : 'Next'}
          </Text>
          <Icon 
            name={currentIndex === onboardingData.length - 1 ? 'check' : 'arrow-forward'} 
            size={20} 
            color={theme.colors.white} 
            style={styles.nextIcon}
          />
        </TouchableOpacity>
      </View>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: 50,
    paddingBottom: theme.spacing.md,
  },
  logo: {
    fontSize: theme.fontSizes.xxl,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  skipButton: {
    padding: theme.spacing.sm,
  },
  skipText: {
    fontSize: theme.fontSizes.md,
    color: theme.colors.gray,
  },
  slide: {
    width,
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
  },
  iconContainer: {
    flex: 0.4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 0.6,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
  },
  title: {
    fontSize: theme.fontSizes.xxxl,
    fontWeight: 'bold',
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    fontSize: theme.fontSizes.lg,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.md,
    fontWeight: '600',
  },
  description: {
    fontSize: theme.fontSizes.md,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  footer: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: 40,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  paginationDot: {
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  nextButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    height: theme.layout.buttonHeight,
    borderRadius: theme.borderRadius.lg,
    paddingHorizontal: theme.spacing.lg,
  },
  nextButtonText: {
    fontSize: theme.fontSizes.lg,
    fontWeight: '600',
    color: theme.colors.white,
  },
  nextIcon: {
    marginLeft: theme.spacing.sm,
  },
});

export default OnboardingScreen;