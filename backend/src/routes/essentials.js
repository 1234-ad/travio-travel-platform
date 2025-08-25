const express = require('express');
const auth = require('../middleware/auth');
const mapsService = require('../services/mapsService');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * @route   GET /api/essentials/nearby
 * @desc    Get nearby essential services (hotels, restaurants, ATMs, etc.)
 * @access  Private
 */
router.get('/nearby', auth, async (req, res) => {
  try {
    const { latitude, longitude, radius = 5000, type } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({
        error: 'Missing coordinates',
        message: 'Latitude and longitude are required'
      });
    }

    const location = {
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude)
    };

    let results;

    if (type) {
      // Get specific type of places
      results = await mapsService.getNearbyPlaces(location, type, parseInt(radius));
    } else {
      // Get all essential services
      results = await mapsService.getNearbyEssentials(location, parseInt(radius));
    }

    res.json({
      location,
      radius: parseInt(radius),
      results
    });

  } catch (error) {
    logger.error('Get nearby essentials error:', error);
    res.status(500).json({
      error: 'Failed to get nearby essentials',
      message: 'An error occurred while fetching nearby services'
    });
  }
});

/**
 * @route   GET /api/essentials/hotels
 * @desc    Get nearby hotels and accommodations
 * @access  Private
 */
router.get('/hotels', auth, async (req, res) => {
  try {
    const { latitude, longitude, radius = 10000, priceLevel, rating } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({
        error: 'Missing coordinates',
        message: 'Latitude and longitude are required'
      });
    }

    const location = {
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude)
    };

    let hotels = await mapsService.getNearbyPlaces(location, 'lodging', parseInt(radius));

    // Filter by price level if specified
    if (priceLevel) {
      const targetPriceLevel = parseInt(priceLevel);
      hotels = hotels.filter(hotel => hotel.priceLevel === targetPriceLevel);
    }

    // Filter by minimum rating if specified
    if (rating) {
      const minRating = parseFloat(rating);
      hotels = hotels.filter(hotel => hotel.rating >= minRating);
    }

    // Sort by rating (highest first)
    hotels.sort((a, b) => (b.rating || 0) - (a.rating || 0));

    res.json({
      location,
      filters: { priceLevel, rating },
      count: hotels.length,
      hotels
    });

  } catch (error) {
    logger.error('Get nearby hotels error:', error);
    res.status(500).json({
      error: 'Failed to get hotels',
      message: 'An error occurred while fetching nearby hotels'
    });
  }
});

/**
 * @route   GET /api/essentials/restaurants
 * @desc    Get nearby restaurants and food places
 * @access  Private
 */
router.get('/restaurants', auth, async (req, res) => {
  try {
    const { latitude, longitude, radius = 5000, cuisine, priceLevel, openNow } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({
        error: 'Missing coordinates',
        message: 'Latitude and longitude are required'
      });
    }

    const location = {
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude)
    };

    let restaurants = await mapsService.getNearbyPlaces(
      location, 
      'restaurant', 
      parseInt(radius),
      cuisine || ''
    );

    // Filter by price level if specified
    if (priceLevel) {
      const targetPriceLevel = parseInt(priceLevel);
      restaurants = restaurants.filter(restaurant => restaurant.priceLevel === targetPriceLevel);
    }

    // Filter by open now if specified
    if (openNow === 'true') {
      restaurants = restaurants.filter(restaurant => restaurant.openNow === true);
    }

    // Sort by rating (highest first)
    restaurants.sort((a, b) => (b.rating || 0) - (a.rating || 0));

    res.json({
      location,
      filters: { cuisine, priceLevel, openNow },
      count: restaurants.length,
      restaurants
    });

  } catch (error) {
    logger.error('Get nearby restaurants error:', error);
    res.status(500).json({
      error: 'Failed to get restaurants',
      message: 'An error occurred while fetching nearby restaurants'
    });
  }
});

/**
 * @route   GET /api/essentials/atms
 * @desc    Get nearby ATMs and banks
 * @access  Private
 */
router.get('/atms', auth, async (req, res) => {
  try {
    const { latitude, longitude, radius = 5000 } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({
        error: 'Missing coordinates',
        message: 'Latitude and longitude are required'
      });
    }

    const location = {
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude)
    };

    const [atms, banks] = await Promise.all([
      mapsService.getNearbyPlaces(location, 'atm', parseInt(radius)),
      mapsService.getNearbyPlaces(location, 'bank', parseInt(radius))
    ]);

    // Combine and sort by distance
    const allFinancialServices = [...atms, ...banks].sort((a, b) => a.distance - b.distance);

    res.json({
      location,
      count: allFinancialServices.length,
      services: allFinancialServices
    });

  } catch (error) {
    logger.error('Get nearby ATMs error:', error);
    res.status(500).json({
      error: 'Failed to get ATMs',
      message: 'An error occurred while fetching nearby ATMs'
    });
  }
});

/**
 * @route   GET /api/essentials/gas-stations
 * @desc    Get nearby gas stations and fuel stops
 * @access  Private
 */
router.get('/gas-stations', auth, async (req, res) => {
  try {
    const { latitude, longitude, radius = 10000 } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({
        error: 'Missing coordinates',
        message: 'Latitude and longitude are required'
      });
    }

    const location = {
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude)
    };

    const gasStations = await mapsService.getNearbyPlaces(location, 'gas_station', parseInt(radius));

    // Sort by distance (closest first)
    gasStations.sort((a, b) => a.distance - b.distance);

    res.json({
      location,
      count: gasStations.length,
      gasStations
    });

  } catch (error) {
    logger.error('Get nearby gas stations error:', error);
    res.status(500).json({
      error: 'Failed to get gas stations',
      message: 'An error occurred while fetching nearby gas stations'
    });
  }
});

/**
 * @route   GET /api/essentials/pharmacies
 * @desc    Get nearby pharmacies and medical stores
 * @access  Private
 */
router.get('/pharmacies', auth, async (req, res) => {
  try {
    const { latitude, longitude, radius = 5000 } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({
        error: 'Missing coordinates',
        message: 'Latitude and longitude are required'
      });
    }

    const location = {
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude)
    };

    const pharmacies = await mapsService.getNearbyPlaces(location, 'pharmacy', parseInt(radius));

    // Sort by distance (closest first)
    pharmacies.sort((a, b) => a.distance - b.distance);

    res.json({
      location,
      count: pharmacies.length,
      pharmacies
    });

  } catch (error) {
    logger.error('Get nearby pharmacies error:', error);
    res.status(500).json({
      error: 'Failed to get pharmacies',
      message: 'An error occurred while fetching nearby pharmacies'
    });
  }
});

/**
 * @route   GET /api/essentials/hospitals
 * @desc    Get nearby hospitals and medical facilities
 * @access  Private
 */
router.get('/hospitals', auth, async (req, res) => {
  try {
    const { latitude, longitude, radius = 20000 } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({
        error: 'Missing coordinates',
        message: 'Latitude and longitude are required'
      });
    }

    const location = {
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude)
    };

    const hospitals = await mapsService.getNearbyPlaces(location, 'hospital', parseInt(radius));

    // Sort by distance (closest first)
    hospitals.sort((a, b) => a.distance - b.distance);

    res.json({
      location,
      count: hospitals.length,
      hospitals
    });

  } catch (error) {
    logger.error('Get nearby hospitals error:', error);
    res.status(500).json({
      error: 'Failed to get hospitals',
      message: 'An error occurred while fetching nearby hospitals'
    });
  }
});

/**
 * @route   GET /api/essentials/place/:placeId
 * @desc    Get detailed information about a specific place
 * @access  Private
 */
router.get('/place/:placeId', auth, async (req, res) => {
  try {
    const { placeId } = req.params;

    if (!placeId) {
      return res.status(400).json({
        error: 'Missing place ID',
        message: 'Place ID is required'
      });
    }

    const placeDetails = await mapsService.getPlaceDetails(placeId);

    res.json({
      place: placeDetails
    });

  } catch (error) {
    logger.error('Get place details error:', error);
    res.status(500).json({
      error: 'Failed to get place details',
      message: 'An error occurred while fetching place details'
    });
  }
});

/**
 * @route   GET /api/essentials/search
 * @desc    Search for places by text query
 * @access  Private
 */
router.get('/search', auth, async (req, res) => {
  try {
    const { query, latitude, longitude, radius = 50000 } = req.query;

    if (!query) {
      return res.status(400).json({
        error: 'Missing query',
        message: 'Search query is required'
      });
    }

    const location = latitude && longitude ? {
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude)
    } : null;

    const results = await mapsService.searchPlaces(query, location, parseInt(radius));

    res.json({
      query,
      location,
      count: results.length,
      results
    });

  } catch (error) {
    logger.error('Search places error:', error);
    res.status(500).json({
      error: 'Failed to search places',
      message: 'An error occurred while searching for places'
    });
  }
});

/**
 * @route   GET /api/essentials/directions
 * @desc    Get directions between two points
 * @access  Private
 */
router.get('/directions', auth, async (req, res) => {
  try {
    const { 
      originLat, 
      originLng, 
      destLat, 
      destLng, 
      mode = 'driving' 
    } = req.query;

    if (!originLat || !originLng || !destLat || !destLng) {
      return res.status(400).json({
        error: 'Missing coordinates',
        message: 'Origin and destination coordinates are required'
      });
    }

    const origin = {
      latitude: parseFloat(originLat),
      longitude: parseFloat(originLng)
    };

    const destination = {
      latitude: parseFloat(destLat),
      longitude: parseFloat(destLng)
    };

    const directions = await mapsService.getDirections(origin, destination, mode);

    res.json({
      origin,
      destination,
      mode,
      directions
    });

  } catch (error) {
    logger.error('Get directions error:', error);
    res.status(500).json({
      error: 'Failed to get directions',
      message: 'An error occurred while fetching directions'
    });
  }
});

/**
 * @route   POST /api/essentials/geocode
 * @desc    Geocode an address to get coordinates
 * @access  Private
 */
router.post('/geocode', auth, async (req, res) => {
  try {
    const { address } = req.body;

    if (!address) {
      return res.status(400).json({
        error: 'Missing address',
        message: 'Address is required'
      });
    }

    const result = await mapsService.geocodeAddress(address);

    res.json({
      address,
      result
    });

  } catch (error) {
    logger.error('Geocode address error:', error);
    res.status(500).json({
      error: 'Failed to geocode address',
      message: 'An error occurred while geocoding the address'
    });
  }
});

/**
 * @route   POST /api/essentials/reverse-geocode
 * @desc    Reverse geocode coordinates to get address
 * @access  Private
 */
router.post('/reverse-geocode', auth, async (req, res) => {
  try {
    const { latitude, longitude } = req.body;

    if (!latitude || !longitude) {
      return res.status(400).json({
        error: 'Missing coordinates',
        message: 'Latitude and longitude are required'
      });
    }

    const result = await mapsService.reverseGeocode(
      parseFloat(latitude), 
      parseFloat(longitude)
    );

    res.json({
      coordinates: { latitude, longitude },
      result
    });

  } catch (error) {
    logger.error('Reverse geocode error:', error);
    res.status(500).json({
      error: 'Failed to reverse geocode',
      message: 'An error occurred while reverse geocoding coordinates'
    });
  }
});

/**
 * @route   GET /api/essentials/timezone
 * @desc    Get timezone information for a location
 * @access  Private
 */
router.get('/timezone', auth, async (req, res) => {
  try {
    const { latitude, longitude, timestamp } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({
        error: 'Missing coordinates',
        message: 'Latitude and longitude are required'
      });
    }

    const location = {
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude)
    };

    const timezoneInfo = await mapsService.getTimezone(
      location, 
      timestamp ? parseInt(timestamp) : Date.now()
    );

    res.json({
      location,
      timezone: timezoneInfo
    });

  } catch (error) {
    logger.error('Get timezone error:', error);
    res.status(500).json({
      error: 'Failed to get timezone',
      message: 'An error occurred while fetching timezone information'
    });
  }
});

/**
 * @route   GET /api/essentials/categories
 * @desc    Get available categories of essential services
 * @access  Private
 */
router.get('/categories', auth, async (req, res) => {
  try {
    const categories = {
      accommodation: {
        name: 'Accommodation',
        types: ['lodging', 'campground', 'rv_park'],
        icon: 'hotel'
      },
      food: {
        name: 'Food & Dining',
        types: ['restaurant', 'meal_takeaway', 'cafe', 'bakery', 'bar'],
        icon: 'restaurant'
      },
      transport: {
        name: 'Transportation',
        types: ['gas_station', 'subway_station', 'train_station', 'bus_station', 'airport'],
        icon: 'directions_car'
      },
      health: {
        name: 'Health & Medical',
        types: ['hospital', 'pharmacy', 'doctor', 'dentist', 'veterinary_care'],
        icon: 'local_hospital'
      },
      finance: {
        name: 'Finance & Banking',
        types: ['atm', 'bank'],
        icon: 'account_balance'
      },
      shopping: {
        name: 'Shopping',
        types: ['supermarket', 'convenience_store', 'shopping_mall', 'clothing_store'],
        icon: 'shopping_cart'
      },
      safety: {
        name: 'Safety & Emergency',
        types: ['police', 'fire_station', 'embassy'],
        icon: 'security'
      },
      entertainment: {
        name: 'Entertainment',
        types: ['tourist_attraction', 'museum', 'amusement_park', 'zoo', 'movie_theater'],
        icon: 'attractions'
      }
    };

    res.json({
      categories
    });

  } catch (error) {
    logger.error('Get categories error:', error);
    res.status(500).json({
      error: 'Failed to get categories',
      message: 'An error occurred while fetching categories'
    });
  }
});

module.exports = router;