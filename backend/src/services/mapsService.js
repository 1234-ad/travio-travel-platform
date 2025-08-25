const axios = require('axios');
const logger = require('../utils/logger');

class MapsService {
  constructor() {
    this.googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY;
    this.baseUrl = 'https://maps.googleapis.com/maps/api';
  }

  /**
   * Get nearby places (hotels, restaurants, etc.)
   */
  async getNearbyPlaces(location, type, radius = 5000, keyword = '') {
    try {
      const url = `${this.baseUrl}/place/nearbysearch/json`;
      const params = {
        location: `${location.latitude},${location.longitude}`,
        radius,
        type,
        keyword,
        key: this.googleMapsApiKey
      };

      const response = await axios.get(url, { params });
      
      if (response.data.status === 'OK') {
        return response.data.results.map(place => ({
          id: place.place_id,
          name: place.name,
          rating: place.rating,
          priceLevel: place.price_level,
          location: {
            latitude: place.geometry.location.lat,
            longitude: place.geometry.location.lng
          },
          address: place.vicinity,
          photos: place.photos ? place.photos.map(photo => ({
            reference: photo.photo_reference,
            url: this.getPhotoUrl(photo.photo_reference, 400)
          })) : [],
          types: place.types,
          openNow: place.opening_hours?.open_now,
          distance: this.calculateDistance(
            location.latitude,
            location.longitude,
            place.geometry.location.lat,
            place.geometry.location.lng
          )
        }));
      } else {
        throw new Error(`Google Places API error: ${response.data.status}`);
      }
    } catch (error) {
      logger.error('Get nearby places error:', error);
      throw error;
    }
  }

  /**
   * Get place details by place ID
   */
  async getPlaceDetails(placeId) {
    try {
      const url = `${this.baseUrl}/place/details/json`;
      const params = {
        place_id: placeId,
        fields: 'name,rating,formatted_phone_number,formatted_address,opening_hours,website,photos,reviews,price_level,geometry',
        key: this.googleMapsApiKey
      };

      const response = await axios.get(url, { params });
      
      if (response.data.status === 'OK') {
        const place = response.data.result;
        return {
          id: placeId,
          name: place.name,
          rating: place.rating,
          phone: place.formatted_phone_number,
          address: place.formatted_address,
          website: place.website,
          priceLevel: place.price_level,
          location: {
            latitude: place.geometry.location.lat,
            longitude: place.geometry.location.lng
          },
          openingHours: place.opening_hours?.weekday_text,
          photos: place.photos ? place.photos.map(photo => ({
            reference: photo.photo_reference,
            url: this.getPhotoUrl(photo.photo_reference, 800)
          })) : [],
          reviews: place.reviews ? place.reviews.map(review => ({
            author: review.author_name,
            rating: review.rating,
            text: review.text,
            time: review.time
          })) : []
        };
      } else {
        throw new Error(`Google Places API error: ${response.data.status}`);
      }
    } catch (error) {
      logger.error('Get place details error:', error);
      throw error;
    }
  }

  /**
   * Search for places by text query
   */
  async searchPlaces(query, location, radius = 50000) {
    try {
      const url = `${this.baseUrl}/place/textsearch/json`;
      const params = {
        query,
        location: location ? `${location.latitude},${location.longitude}` : undefined,
        radius: location ? radius : undefined,
        key: this.googleMapsApiKey
      };

      const response = await axios.get(url, { params });
      
      if (response.data.status === 'OK') {
        return response.data.results.map(place => ({
          id: place.place_id,
          name: place.name,
          rating: place.rating,
          priceLevel: place.price_level,
          location: {
            latitude: place.geometry.location.lat,
            longitude: place.geometry.location.lng
          },
          address: place.formatted_address,
          photos: place.photos ? place.photos.map(photo => ({
            reference: photo.photo_reference,
            url: this.getPhotoUrl(photo.photo_reference, 400)
          })) : [],
          types: place.types,
          openNow: place.opening_hours?.open_now
        }));
      } else {
        throw new Error(`Google Places API error: ${response.data.status}`);
      }
    } catch (error) {
      logger.error('Search places error:', error);
      throw error;
    }
  }

  /**
   * Get directions between two points
   */
  async getDirections(origin, destination, mode = 'driving') {
    try {
      const url = `${this.baseUrl}/directions/json`;
      const params = {
        origin: `${origin.latitude},${origin.longitude}`,
        destination: `${destination.latitude},${destination.longitude}`,
        mode,
        key: this.googleMapsApiKey
      };

      const response = await axios.get(url, { params });
      
      if (response.data.status === 'OK') {
        const route = response.data.routes[0];
        const leg = route.legs[0];
        
        return {
          distance: leg.distance,
          duration: leg.duration,
          steps: leg.steps.map(step => ({
            instruction: step.html_instructions.replace(/<[^>]*>/g, ''),
            distance: step.distance,
            duration: step.duration,
            startLocation: step.start_location,
            endLocation: step.end_location
          })),
          polyline: route.overview_polyline.points,
          bounds: route.bounds
        };
      } else {
        throw new Error(`Google Directions API error: ${response.data.status}`);
      }
    } catch (error) {
      logger.error('Get directions error:', error);
      throw error;
    }
  }

  /**
   * Geocode an address to get coordinates
   */
  async geocodeAddress(address) {
    try {
      const url = `${this.baseUrl}/geocode/json`;
      const params = {
        address,
        key: this.googleMapsApiKey
      };

      const response = await axios.get(url, { params });
      
      if (response.data.status === 'OK') {
        const result = response.data.results[0];
        return {
          location: {
            latitude: result.geometry.location.lat,
            longitude: result.geometry.location.lng
          },
          formattedAddress: result.formatted_address,
          addressComponents: result.address_components,
          placeId: result.place_id
        };
      } else {
        throw new Error(`Google Geocoding API error: ${response.data.status}`);
      }
    } catch (error) {
      logger.error('Geocode address error:', error);
      throw error;
    }
  }

  /**
   * Reverse geocode coordinates to get address
   */
  async reverseGeocode(latitude, longitude) {
    try {
      const url = `${this.baseUrl}/geocode/json`;
      const params = {
        latlng: `${latitude},${longitude}`,
        key: this.googleMapsApiKey
      };

      const response = await axios.get(url, { params });
      
      if (response.data.status === 'OK') {
        const result = response.data.results[0];
        return {
          formattedAddress: result.formatted_address,
          addressComponents: result.address_components,
          placeId: result.place_id
        };
      } else {
        throw new Error(`Google Geocoding API error: ${response.data.status}`);
      }
    } catch (error) {
      logger.error('Reverse geocode error:', error);
      throw error;
    }
  }

  /**
   * Get photo URL from photo reference
   */
  getPhotoUrl(photoReference, maxWidth = 400) {
    return `${this.baseUrl}/place/photo?maxwidth=${maxWidth}&photoreference=${photoReference}&key=${this.googleMapsApiKey}`;
  }

  /**
   * Calculate distance between two coordinates (Haversine formula)
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of the Earth in kilometers
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c; // Distance in kilometers
    return Math.round(distance * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Convert degrees to radians
   */
  deg2rad(deg) {
    return deg * (Math.PI/180);
  }

  /**
   * Get nearby essentials (ATMs, pharmacies, gas stations, etc.)
   */
  async getNearbyEssentials(location, radius = 5000) {
    try {
      const essentialTypes = [
        { type: 'atm', category: 'finance' },
        { type: 'pharmacy', category: 'health' },
        { type: 'gas_station', category: 'transport' },
        { type: 'hospital', category: 'health' },
        { type: 'police', category: 'safety' },
        { type: 'bank', category: 'finance' },
        { type: 'supermarket', category: 'shopping' }
      ];

      const results = {};

      for (const essential of essentialTypes) {
        try {
          const places = await this.getNearbyPlaces(location, essential.type, radius);
          results[essential.category] = results[essential.category] || [];
          results[essential.category].push(...places.slice(0, 5)); // Limit to 5 per type
        } catch (error) {
          logger.warn(`Failed to get ${essential.type}:`, error.message);
        }
      }

      return results;
    } catch (error) {
      logger.error('Get nearby essentials error:', error);
      throw error;
    }
  }

  /**
   * Get travel time matrix between multiple origins and destinations
   */
  async getTravelTimeMatrix(origins, destinations, mode = 'driving') {
    try {
      const url = `${this.baseUrl}/distancematrix/json`;
      const params = {
        origins: origins.map(o => `${o.latitude},${o.longitude}`).join('|'),
        destinations: destinations.map(d => `${d.latitude},${d.longitude}`).join('|'),
        mode,
        units: 'metric',
        key: this.googleMapsApiKey
      };

      const response = await axios.get(url, { params });
      
      if (response.data.status === 'OK') {
        return response.data.rows.map((row, originIndex) => ({
          origin: origins[originIndex],
          destinations: row.elements.map((element, destIndex) => ({
            destination: destinations[destIndex],
            distance: element.distance,
            duration: element.duration,
            status: element.status
          }))
        }));
      } else {
        throw new Error(`Google Distance Matrix API error: ${response.data.status}`);
      }
    } catch (error) {
      logger.error('Get travel time matrix error:', error);
      throw error;
    }
  }

  /**
   * Get timezone for a location
   */
  async getTimezone(location, timestamp = Date.now()) {
    try {
      const url = `${this.baseUrl}/timezone/json`;
      const params = {
        location: `${location.latitude},${location.longitude}`,
        timestamp: Math.floor(timestamp / 1000),
        key: this.googleMapsApiKey
      };

      const response = await axios.get(url, { params });
      
      if (response.data.status === 'OK') {
        return {
          timeZoneId: response.data.timeZoneId,
          timeZoneName: response.data.timeZoneName,
          dstOffset: response.data.dstOffset,
          rawOffset: response.data.rawOffset
        };
      } else {
        throw new Error(`Google Timezone API error: ${response.data.status}`);
      }
    } catch (error) {
      logger.error('Get timezone error:', error);
      throw error;
    }
  }

  /**
   * Get elevation for a location
   */
  async getElevation(location) {
    try {
      const url = `${this.baseUrl}/elevation/json`;
      const params = {
        locations: `${location.latitude},${location.longitude}`,
        key: this.googleMapsApiKey
      };

      const response = await axios.get(url, { params });
      
      if (response.data.status === 'OK') {
        return response.data.results[0].elevation;
      } else {
        throw new Error(`Google Elevation API error: ${response.data.status}`);
      }
    } catch (error) {
      logger.error('Get elevation error:', error);
      throw error;
    }
  }
}

module.exports = new MapsService();