const { User, Trip } = require('../models');

class AIService {
  /**
   * Calculate compatibility score between two users for a specific trip
   */
  static calculateCompatibilityScore(requester, recipient, trip) {
    const factors = {
      destinationMatch: 0,
      dateOverlap: 0,
      interestSimilarity: 0,
      budgetCompatibility: 0,
      travelStyleMatch: 0,
      languageMatch: 0
    };

    // Destination match (30% weight)
    if (requester.preferredDestinations && recipient.preferredDestinations) {
      const commonDestinations = requester.preferredDestinations.filter(dest =>
        recipient.preferredDestinations.includes(dest)
      );
      factors.destinationMatch = Math.min(commonDestinations.length * 20, 100);
    }

    // Date overlap (25% weight)
    if (requester.availableDates && recipient.availableDates && trip.dates) {
      const tripStart = new Date(trip.dates.start);
      const tripEnd = new Date(trip.dates.end);
      
      const requesterOverlap = this.calculateDateOverlap(
        requester.availableDates, tripStart, tripEnd
      );
      const recipientOverlap = this.calculateDateOverlap(
        recipient.availableDates, tripStart, tripEnd
      );
      
      factors.dateOverlap = Math.min(requesterOverlap, recipientOverlap);
    }

    // Interest similarity (20% weight)
    if (requester.interests && recipient.interests) {
      const commonInterests = requester.interests.filter(interest =>
        recipient.interests.includes(interest)
      );
      const totalInterests = new Set([...requester.interests, ...recipient.interests]).size;
      factors.interestSimilarity = totalInterests > 0 ? (commonInterests.length / totalInterests) * 100 : 0;
    }

    // Budget compatibility (15% weight)
    if (requester.budgetRange && recipient.budgetRange && trip.budget) {
      factors.budgetCompatibility = this.calculateBudgetCompatibility(
        requester.budgetRange, recipient.budgetRange, trip.budget
      );
    }

    // Travel style match (5% weight)
    if (requester.travelStyle && recipient.travelStyle) {
      factors.travelStyleMatch = requester.travelStyle === recipient.travelStyle ? 100 : 
        this.getTravelStyleCompatibility(requester.travelStyle, recipient.travelStyle);
    }

    // Language match (5% weight)
    if (requester.languages && recipient.languages) {
      const commonLanguages = requester.languages.filter(lang =>
        recipient.languages.includes(lang)
      );
      factors.languageMatch = commonLanguages.length > 0 ? 100 : 0;
    }

    // Calculate weighted score
    const weights = {
      destinationMatch: 0.30,
      dateOverlap: 0.25,
      interestSimilarity: 0.20,
      budgetCompatibility: 0.15,
      travelStyleMatch: 0.05,
      languageMatch: 0.05
    };

    const totalScore = Object.keys(factors).reduce((sum, factor) => {
      return sum + (factors[factor] * weights[factor]);
    }, 0);

    return {
      score: Math.round(totalScore),
      factors
    };
  }

  /**
   * Calculate date overlap percentage
   */
  static calculateDateOverlap(availableDates, tripStart, tripEnd) {
    if (!availableDates || availableDates.length === 0) return 0;

    const tripDuration = tripEnd - tripStart;
    let overlapDuration = 0;

    availableDates.forEach(dateRange => {
      const availStart = new Date(dateRange.start);
      const availEnd = new Date(dateRange.end);

      const overlapStart = new Date(Math.max(tripStart, availStart));
      const overlapEnd = new Date(Math.min(tripEnd, availEnd));

      if (overlapStart < overlapEnd) {
        overlapDuration += overlapEnd - overlapStart;
      }
    });

    return Math.min((overlapDuration / tripDuration) * 100, 100);
  }

  /**
   * Calculate budget compatibility
   */
  static calculateBudgetCompatibility(requesterBudget, recipientBudget, tripBudget) {
    const requesterMax = requesterBudget.max || requesterBudget.preferred * 1.5;
    const recipientMax = recipientBudget.max || recipientBudget.preferred * 1.5;
    
    const minBudget = Math.min(requesterMax, recipientMax);
    const maxBudget = Math.max(requesterBudget.min || 0, recipientBudget.min || 0);

    if (tripBudget >= maxBudget && tripBudget <= minBudget) {
      return 100;
    } else if (tripBudget < maxBudget) {
      return Math.max(0, 100 - ((maxBudget - tripBudget) / maxBudget) * 100);
    } else {
      return Math.max(0, 100 - ((tripBudget - minBudget) / tripBudget) * 100);
    }
  }

  /**
   * Get travel style compatibility score
   */
  static getTravelStyleCompatibility(style1, style2) {
    const compatibilityMatrix = {
      'budget': { 'budget': 100, 'mid-range': 70, 'luxury': 20, 'backpacker': 90 },
      'mid-range': { 'budget': 70, 'mid-range': 100, 'luxury': 80, 'backpacker': 50 },
      'luxury': { 'budget': 20, 'mid-range': 80, 'luxury': 100, 'backpacker': 10 },
      'backpacker': { 'budget': 90, 'mid-range': 50, 'luxury': 10, 'backpacker': 100 }
    };

    return compatibilityMatrix[style1]?.[style2] || 50;
  }

  /**
   * Generate AI-powered trip suggestions
   */
  static async generateTripSuggestions(userId, preferences = {}) {
    try {
      const user = await User.findById(userId);
      if (!user) throw new Error('User not found');

      const suggestions = [];

      // Based on user's past trips and interests
      const pastTrips = await Trip.find({ 
        $or: [
          { creator: userId },
          { participants: userId }
        ]
      }).limit(10);

      // Analyze patterns
      const destinationFrequency = {};
      const interestFrequency = {};
      const budgetRanges = [];

      pastTrips.forEach(trip => {
        // Count destinations
        if (trip.destination.city) {
          destinationFrequency[trip.destination.city] = 
            (destinationFrequency[trip.destination.city] || 0) + 1;
        }

        // Count interests
        trip.interests.forEach(interest => {
          interestFrequency[interest] = (interestFrequency[interest] || 0) + 1;
        });

        // Collect budget data
        if (trip.budget) {
          budgetRanges.push(trip.budget);
        }
      });

      // Generate suggestions based on patterns
      const popularDestinations = Object.keys(destinationFrequency)
        .sort((a, b) => destinationFrequency[b] - destinationFrequency[a])
        .slice(0, 5);

      const preferredInterests = Object.keys(interestFrequency)
        .sort((a, b) => interestFrequency[b] - interestFrequency[a])
        .slice(0, 5);

      // Create suggestion templates
      const suggestionTemplates = [
        {
          type: 'similar_destination',
          title: 'Explore Similar Destinations',
          destinations: this.getSimilarDestinations(popularDestinations),
          interests: preferredInterests,
          confidence: 0.8
        },
        {
          type: 'new_experience',
          title: 'Try Something New',
          destinations: this.getComplementaryDestinations(user.interests),
          interests: this.getComplementaryInterests(preferredInterests),
          confidence: 0.6
        },
        {
          type: 'seasonal',
          title: 'Perfect for This Season',
          destinations: this.getSeasonalDestinations(),
          interests: user.interests,
          confidence: 0.7
        }
      ];

      return suggestionTemplates;
    } catch (error) {
      console.error('Error generating trip suggestions:', error);
      return [];
    }
  }

  /**
   * Get similar destinations based on user preferences
   */
  static getSimilarDestinations(userDestinations) {
    const destinationClusters = {
      'beach': ['Bali', 'Maldives', 'Goa', 'Phuket', 'Santorini'],
      'mountain': ['Nepal', 'Switzerland', 'Himachal Pradesh', 'Colorado', 'Patagonia'],
      'cultural': ['Kyoto', 'Rome', 'Istanbul', 'Rajasthan', 'Morocco'],
      'urban': ['Tokyo', 'New York', 'London', 'Singapore', 'Dubai']
    };

    // Simple clustering logic - in production, use ML clustering
    return destinationClusters.beach.slice(0, 3);
  }

  /**
   * Get complementary destinations
   */
  static getComplementaryDestinations(interests) {
    const interestDestinationMap = {
      'adventure': ['New Zealand', 'Costa Rica', 'Nepal'],
      'culture': ['India', 'Egypt', 'Peru'],
      'food': ['Italy', 'Japan', 'Thailand'],
      'nightlife': ['Berlin', 'Barcelona', 'Bangkok'],
      'nature': ['Iceland', 'Norway', 'Canada']
    };

    const suggestions = [];
    interests.forEach(interest => {
      if (interestDestinationMap[interest]) {
        suggestions.push(...interestDestinationMap[interest]);
      }
    });

    return [...new Set(suggestions)].slice(0, 3);
  }

  /**
   * Get seasonal destination recommendations
   */
  static getSeasonalDestinations() {
    const month = new Date().getMonth();
    const seasonalDestinations = {
      0: ['Dubai', 'Thailand', 'India'], // January
      1: ['Japan', 'Singapore', 'Vietnam'], // February
      2: ['Egypt', 'Morocco', 'Nepal'], // March
      3: ['Turkey', 'Greece', 'Spain'], // April
      4: ['Europe', 'Mediterranean', 'Balkans'], // May
      5: ['Scandinavia', 'Russia', 'Eastern Europe'], // June
      6: ['Indonesia', 'Malaysia', 'Philippines'], // July
      7: ['Romania', 'Bulgaria', 'Baltic States'], // August
      8: ['India', 'Nepal', 'Central Asia'], // September
      9: ['Morocco', 'Egypt', 'Jordan'], // October
      10: ['India', 'Myanmar', 'Laos'], // November
      11: ['Thailand', 'Cambodia', 'Vietnam'] // December
    };

    return seasonalDestinations[month] || ['Popular destinations'];
  }

  /**
   * Get complementary interests
   */
  static getComplementaryInterests(userInterests) {
    const interestMap = {
      'adventure': ['hiking', 'rock climbing', 'water sports'],
      'culture': ['museums', 'historical sites', 'local festivals'],
      'food': ['cooking classes', 'food tours', 'local markets'],
      'nightlife': ['bars', 'clubs', 'live music'],
      'nature': ['wildlife', 'photography', 'camping']
    };

    const suggestions = [];
    userInterests.forEach(interest => {
      if (interestMap[interest]) {
        suggestions.push(...interestMap[interest]);
      }
    });

    return [...new Set(suggestions)].slice(0, 5);
  }

  /**
   * Analyze trip safety score
   */
  static calculateSafetyScore(destination, travelDates) {
    // In production, integrate with real-time safety APIs
    const baseSafetyScores = {
      'Japan': 95,
      'Singapore': 94,
      'Switzerland': 93,
      'Norway': 92,
      'Denmark': 91,
      'Canada': 90,
      'Australia': 89,
      'Germany': 88,
      'United Kingdom': 87,
      'France': 85,
      'Italy': 83,
      'Spain': 82,
      'Thailand': 78,
      'India': 65,
      'Egypt': 60,
      'Turkey': 70,
      'Morocco': 68
    };

    const baseScore = baseSafetyScores[destination.country] || 70;
    
    // Adjust for seasonal factors
    const seasonalAdjustment = this.getSeasonalSafetyAdjustment(destination, travelDates);
    
    return Math.max(0, Math.min(100, baseScore + seasonalAdjustment));
  }

  /**
   * Get seasonal safety adjustments
   */
  static getSeasonalSafetyAdjustment(destination, travelDates) {
    // Simple seasonal adjustment logic
    const month = new Date(travelDates.start).getMonth();
    
    // Monsoon season adjustments for certain regions
    if (destination.country === 'India' && (month >= 5 && month <= 9)) {
      return -10; // Monsoon season
    }
    
    // Hurricane season for tropical destinations
    if (['Thailand', 'Philippines', 'Indonesia'].includes(destination.country) && 
        (month >= 5 && month <= 10)) {
      return -5;
    }
    
    return 0;
  }

  /**
   * Generate smart budget estimation
   */
  static estimateTripBudget(destination, duration, travelStyle, activities) {
    const baseCosts = {
      'budget': { daily: 30, accommodation: 15, food: 10, transport: 5 },
      'mid-range': { daily: 80, accommodation: 40, food: 25, transport: 15 },
      'luxury': { daily: 200, accommodation: 120, food: 50, transport: 30 }
    };

    const destinationMultipliers = {
      'Japan': 1.8,
      'Switzerland': 2.0,
      'Norway': 1.9,
      'Singapore': 1.5,
      'Thailand': 0.6,
      'India': 0.4,
      'Vietnam': 0.5,
      'Indonesia': 0.5,
      'Morocco': 0.6,
      'Turkey': 0.7
    };

    const style = travelStyle || 'mid-range';
    const costs = baseCosts[style];
    const multiplier = destinationMultipliers[destination.country] || 1.0;
    
    const dailyCost = costs.daily * multiplier;
    const totalCost = dailyCost * duration;
    
    // Add activity costs
    const activityCosts = activities.length * 20 * multiplier;
    
    return {
      total: Math.round(totalCost + activityCosts),
      daily: Math.round(dailyCost),
      breakdown: {
        accommodation: Math.round(costs.accommodation * multiplier * duration),
        food: Math.round(costs.food * multiplier * duration),
        transport: Math.round(costs.transport * multiplier * duration),
        activities: Math.round(activityCosts)
      }
    };
  }
}

module.exports = AIService;