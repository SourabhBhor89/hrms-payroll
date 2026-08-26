package com.company.hrms.service;

import com.company.hrms.config.GeofenceConfigProvider;
import com.company.hrms.exception.GeofenceException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class GeofenceService {

    private final GeofenceConfigProvider geofenceConfigProvider;

    private static final double EARTH_RADIUS_METERS = 6371000.0;

    /**
     * Validates whether the given employee coordinates are within the configured office geofence.
     *
     * @param latitude  Employee device latitude
     * @param longitude Employee device longitude
     * @return Calculated distance in meters if geofence is enabled, or null if geofencing is disabled.
     * @throws GeofenceException if coordinates are invalid, missing, or outside the allowed radius.
     */
    public Double validateLocation(Double latitude, Double longitude) {
        if (!geofenceConfigProvider.isGeofenceEnabled()) {
            log.debug("Geofencing is disabled. Bypassing location validation.");
            return null;
        }

        if (latitude == null || longitude == null || latitude.isNaN() || longitude.isNaN() || latitude.isInfinite() || longitude.isInfinite()) {
            log.warn("Geofence validation failed: missing or invalid coordinates. Lat: {}, Lon: {}", latitude, longitude);
            throw new GeofenceException("LOCATION_REQUIRED", "Location access is required to clock in/out. Please enable device location and try again.");
        }

        if (latitude < -90.0 || latitude > 90.0) {
            log.warn("Geofence validation failed: latitude out of range [-90, 90]: {}", latitude);
            throw new GeofenceException("INVALID_LOCATION", "Invalid latitude: " + latitude + ". Must be between -90 and 90.");
        }

        if (longitude < -180.0 || longitude > 180.0) {
            log.warn("Geofence validation failed: longitude out of range [-180, 180]: {}", longitude);
            throw new GeofenceException("INVALID_LOCATION", "Invalid longitude: " + longitude + ". Must be between -180 and 180.");
        }

        Double officeLat = geofenceConfigProvider.getOfficeLatitude();
        Double officeLon = geofenceConfigProvider.getOfficeLongitude();
        Double allowedRadius = geofenceConfigProvider.getAllowedRadiusMeters();

        if (officeLat == null || officeLon == null || allowedRadius == null) {
            log.error("Geofence configuration missing office coordinates or allowed radius.");
            throw new GeofenceException("GEOFENCE_CONFIGURATION_ERROR", "Geofence system configuration error. Please contact HR or System Administrator.");
        }

        double distanceMeters = calculateDistanceMeters(latitude, longitude, officeLat, officeLon);

        if (distanceMeters > allowedRadius) {
            long approxDistance = Math.round(distanceMeters);
            long radiusInt = Math.round(allowedRadius);
            log.info("Geofence rejected punch: distance={}m exceeds allowedRadius={}m (Lat:{}, Lon:{})", approxDistance, radiusInt, latitude, longitude);
            String message = String.format("You are outside the allowed office area (approximately %d meters away). Please move within %d meters of the office and try again.", approxDistance, radiusInt);
            throw new GeofenceException("OUTSIDE_GEOFENCE", message, distanceMeters, allowedRadius);
        }

        log.info("Geofence validation passed: distance={}m within allowedRadius={}m", Math.round(distanceMeters), Math.round(allowedRadius));
        return distanceMeters;
    }

    /**
     * Calculates the geographic distance in meters between two lat/lon pairs using the Haversine formula.
     */
    public double calculateDistanceMeters(double lat1, double lon1, double lat2, double lon2) {
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);

        double radLat1 = Math.toRadians(lat1);
        double radLat2 = Math.toRadians(lat2);

        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(radLat1) * Math.cos(radLat2);

        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return EARTH_RADIUS_METERS * c;
    }
}
