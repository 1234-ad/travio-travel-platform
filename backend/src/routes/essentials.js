const express = require('express');
const axios = require('axios');
const auth = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// Google Places API helper
const searchNearbyPlaces = async (location, type, radius = 5000) => {
  try {
    const { lat, lng } = location;
    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    
    if (!apiKey) {
      throw new Error('Google Places API key not configured');
    }

    const response = await axios.get('https://maps.googleapis.com/maps/api/place/nearbysearch/json', {
      params: {
        location: `${lat},${lng}`,
        radius,
        type,
        key: apiKey
      }
    });

    return response.data.results;
  } catch (error) {
    logger.error('Google Places API error:', error);
    throw error;
  }
};

// Get place details
const getPlaceDetails = async (placeId) => {
  try {
    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    
    const response = await axios.get('https://maps.googleapis.com/maps/api/place/details/json', {
      params: {
        place_id: placeId,
        fields: 'name,formatted_address,formatted_phone_number,website,rating,reviews,opening_hours,photos,price_level',
        key: apiKey
      }
    });

    return response.data.result;
  } catch (error) {
    logger.error('Place details API error:', error);
    throw error;
  }
};

// @route   GET /api/essentials/nearby
// @desc    Get nearby essential services
// @access  Private
router.get('/nearby', auth, async (req, res) => {
  try {
    const { lat, lng, type, radius = 5000, limit = 20 } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required'
      });
    }

    const location = { lat: parseFloat(lat), lng: parseFloat(lng) };
    
    let searchType = type;
    if (!type) {
      // Default to lodging if no type specified
      searchType = 'lodging';
    }

    const places = await searchNearbyPlaces(location, searchType, parseInt(radius));
    
    // Limit results
    const limitedPlaces = places.slice(0, parseInt(limit));

    // Format response
    const formattedPlaces = limitedPlaces.map(place => ({
      id: place.place_id,
      name: place.name,
      address: place.vicinity,
      location: place.geometry.location,
      rating: place.rating,
      priceLevel: place.price_level,
      types: place.types,
      photos: place.photos ? place.photos.map(photo => ({
        reference: photo.photo_reference,
        width: photo.width,
        height: photo.height
      })) : [],
      openNow: place.opening_hours?.open_now,
      distance: calculateDistance(location, place.geometry.location)
    }));

    res.json({
      success: true,
      data: {
        places: formattedPlaces,
        searchLocation: location,
        searchType,
        radius: parseInt(radius)
      }
    });
  } catch (error) {
    logger.error('Get nearby essentials error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/essentials/hotels
// @desc    Get nearby hotels and accommodations
// @access  Private
router.get('/hotels', auth, async (req, res) => {
  try {
    const { lat, lng, radius = 5000, minRating = 0, maxPrice = 5 } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required'
      });
    }

    const location = { lat: parseFloat(lat), lng: parseFloat(lng) };
    const places = await searchNearbyPlaces(location, 'lodging', parseInt(radius));

    // Filter by rating and price
    const filteredPlaces = places.filter(place => {
      const rating = place.rating || 0;
      const priceLevel = place.price_level || 0;
      return rating >= parseFloat(minRating) && priceLevel <= parseInt(maxPrice);
    });

    const hotels = filteredPlaces.map(place => ({
      id: place.place_id,
      name: place.name,
      address: place.vicinity,
      location: place.geometry.location,
      rating: place.rating,
      priceLevel: place.price_level,
      photos: place.photos ? place.photos.slice(0, 3) : [],
      openNow: place.opening_hours?.open_now,
      distance: calculateDistance(location, place.geometry.location),
      type: 'hotel'
    }));

    res.json({
      success: true,
      data: {
        hotels: hotels.slice(0, 20),
        filters: {
          minRating: parseFloat(minRating),
          maxPrice: parseInt(maxPrice),
          radius: parseInt(radius)
        }
      }
    });
  } catch (error) {
    logger.error('Get hotels error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/essentials/restaurants
// @desc    Get nearby restaurants
// @access  Private
router.get('/restaurants', auth, async (req, res) => {
  try {
    const { lat, lng, radius = 2000, cuisine, minRating = 0 } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required'
      });
    }

    const location = { lat: parseFloat(lat), lng: parseFloat(lng) };
    const places = await searchNearbyPlaces(location, 'restaurant', parseInt(radius));

    // Filter by cuisine and rating
    let filteredPlaces = places.filter(place => {
      const rating = place.rating || 0;
      return rating >= parseFloat(minRating);
    });

    if (cuisine) {
      filteredPlaces = filteredPlaces.filter(place => 
        place.types.some(type => type.toLowerCase().includes(cuisine.toLowerCase()))
      );
    }

    const restaurants = filteredPlaces.map(place => ({
      id: place.place_id,
      name: place.name,
      address: place.vicinity,
      location: place.geometry.location,
      rating: place.rating,
      priceLevel: place.price_level,
      cuisine: place.types.filter(type => 
        ['restaurant', 'food', 'meal_takeaway', 'meal_delivery'].includes(type)
      ),
      photos: place.photos ? place.photos.slice(0, 3) : [],
      openNow: place.opening_hours?.open_now,
      distance: calculateDistance(location, place.geometry.location),
      type: 'restaurant'
    }));

    res.json({
      success: true,
      data: {
        restaurants: restaurants.slice(0, 20),
        filters: {
          cuisine,
          minRating: parseFloat(minRating),
          radius: parseInt(radius)
        }
      }
    });
  } catch (error) {
    logger.error('Get restaurants error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/essentials/gas-stations
// @desc    Get nearby gas stations
// @access  Private
router.get('/gas-stations', auth, async (req, res) => {
  try {
    const { lat, lng, radius = 10000 } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required'
      });
    }

    const location = { lat: parseFloat(lat), lng: parseFloat(lng) };
    const places = await searchNearbyPlaces(location, 'gas_station', parseInt(radius));

    const gasStations = places.map(place => ({
      id: place.place_id,
      name: place.name,
      address: place.vicinity,
      location: place.geometry.location,
      rating: place.rating,
      openNow: place.opening_hours?.open_now,
      distance: calculateDistance(location, place.geometry.location),
      type: 'gas_station'
    }));

    res.json({
      success: true,
      data: {
        gasStations: gasStations.slice(0, 15),
        searchRadius: parseInt(radius)
      }
    });
  } catch (error) {
    logger.error('Get gas stations error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/essentials/atms
// @desc    Get nearby ATMs
// @access  Private
router.get('/atms', auth, async (req, res) => {
  try {
    const { lat, lng, radius = 5000 } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required'
      });
    }

    const location = { lat: parseFloat(lat), lng: parseFloat(lng) };
    const places = await searchNearbyPlaces(location, 'atm', parseInt(radius));

    const atms = places.map(place => ({
      id: place.place_id,
      name: place.name,
      address: place.vicinity,
      location: place.geometry.location,
      rating: place.rating,
      openNow: place.opening_hours?.open_now,
      distance: calculateDistance(location, place.geometry.location),
      type: 'atm'
    }));

    res.json({
      success: true,
      data: {
        atms: atms.slice(0, 15),
        searchRadius: parseInt(radius)
      }
    });
  } catch (error) {
    logger.error('Get ATMs error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/essentials/hospitals
// @desc    Get nearby hospitals and medical facilities
// @access  Private
router.get('/hospitals', auth, async (req, res) => {
  try {
    const { lat, lng, radius = 15000 } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required'
      });
    }

    const location = { lat: parseFloat(lat), lng: parseFloat(lng) };
    const places = await searchNearbyPlaces(location, 'hospital', parseInt(radius));

    const hospitals = places.map(place => ({
      id: place.place_id,
      name: place.name,
      address: place.vicinity,
      location: place.geometry.location,
      rating: place.rating,
      openNow: place.opening_hours?.open_now,
      distance: calculateDistance(location, place.geometry.location),
      type: 'hospital',
      emergency: true
    }));

    res.json({
      success: true,
      data: {
        hospitals: hospitals.slice(0, 10),
        searchRadius: parseInt(radius)
      }
    });
  } catch (error) {
    logger.error('Get hospitals error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/essentials/place/:placeId
// @desc    Get detailed information about a specific place
// @access  Private
router.get('/place/:placeId', auth, async (req, res) => {
  try {
    const { placeId } = req.params;
    
    const placeDetails = await getPlaceDetails(placeId);

    const formattedDetails = {
      id: placeId,
      name: placeDetails.name,
      address: placeDetails.formatted_address,
      phone: placeDetails.formatted_phone_number,
      website: placeDetails.website,
      rating: placeDetails.rating,
      priceLevel: placeDetails.price_level,
      reviews: placeDetails.reviews ? placeDetails.reviews.slice(0, 5) : [],
      openingHours: placeDetails.opening_hours,
      photos: placeDetails.photos ? placeDetails.photos.slice(0, 10) : []
    };

    res.json({
      success: true,
      data: formattedDetails
    });
  } catch (error) {
    logger.error('Get place details error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Helper function to calculate distance between two points
function calculateDistance(point1, point2) {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (point2.lat - point1.lat) * Math.PI / 180;
  const dLng = (point2.lng - point1.lng) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(point1.lat * Math.PI / 180) * Math.cos(point2.lat * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return Math.round(distance * 100) / 100; // Round to 2 decimal places
}

module.exports = router;