package com.company.hrms.service;

import com.company.hrms.config.GeofenceConfigProvider;
import com.company.hrms.exception.GeofenceException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class GeofenceServiceTest {

    private GeofenceConfigProvider configProvider;
    private GeofenceService geofenceService;

    // Office coordinates (as per business requirements)
    private static final double OFFICE_LAT = 22.7528376043815;
    private static final double OFFICE_LON = 75.86748476315944;
    private static final double ALLOWED_RADIUS = 50.0;

    @BeforeEach
    void setUp() {
        configProvider = mock(GeofenceConfigProvider.class);
        geofenceService = new GeofenceService(configProvider);

        when(configProvider.isGeofenceEnabled()).thenReturn(true);
        when(configProvider.getOfficeLatitude()).thenReturn(OFFICE_LAT);
        when(configProvider.getOfficeLongitude()).thenReturn(OFFICE_LON);
        when(configProvider.getAllowedRadiusMeters()).thenReturn(ALLOWED_RADIUS);
    }

    @Test
    @DisplayName("Distance calculation accurately matches known Haversine distance")
    void testCalculateDistanceMeters() {
        // Distance from office to exact same point is 0
        double distZero = geofenceService.calculateDistanceMeters(OFFICE_LAT, OFFICE_LON, OFFICE_LAT, OFFICE_LON);
        assertEquals(0.0, distZero, 0.001);

        // Distance for a tiny offset (~30m away)
        double latNear = 22.753000;
        double lonNear = 75.867484;
        double distNear = geofenceService.calculateDistanceMeters(OFFICE_LAT, OFFICE_LON, latNear, lonNear);
        assertTrue(distNear > 0 && distNear < 30.0);
    }

    @Test
    @DisplayName("Location within 50m radius is allowed")
    void testValidateLocation_WithinRadius_Allowed() {
        // Coordinates ~20m away from office
        double userLat = 22.752900;
        double userLon = 75.867484;

        Double distance = geofenceService.validateLocation(userLat, userLon);
        assertNotNull(distance);
        assertTrue(distance <= ALLOWED_RADIUS);
    }

    @Test
    @DisplayName("Location exactly at or within boundary rule is allowed")
    void testValidateLocation_Boundary_Allowed() {
        // Exact office coordinates
        Double distance = geofenceService.validateLocation(OFFICE_LAT, OFFICE_LON);
        assertNotNull(distance);
        assertEquals(0.0, distance, 0.01);
    }

    @Test
    @DisplayName("Location outside 50m radius throws GeofenceException with OUTSIDE_GEOFENCE error code")
    void testValidateLocation_OutsideRadius_Rejected() {
        // Coordinates ~500m away
        double userLat = 22.757000;
        double userLon = 75.867484;

        GeofenceException ex = assertThrows(GeofenceException.class, () ->
                geofenceService.validateLocation(userLat, userLon)
        );

        assertEquals("OUTSIDE_GEOFENCE", ex.getErrorCode());
        assertNotNull(ex.getDistanceMeters());
        assertTrue(ex.getDistanceMeters() > ALLOWED_RADIUS);
        assertTrue(ex.getMessage().contains("outside the allowed office area"));
    }

    @Test
    @DisplayName("Invalid latitude (>90) throws GeofenceException with INVALID_LOCATION")
    void testValidateLocation_InvalidLatitude_Rejected() {
        GeofenceException ex = assertThrows(GeofenceException.class, () ->
                geofenceService.validateLocation(100.0, 75.8674)
        );
        assertEquals("INVALID_LOCATION", ex.getErrorCode());
    }

    @Test
    @DisplayName("Invalid longitude (>180) throws GeofenceException with INVALID_LOCATION")
    void testValidateLocation_InvalidLongitude_Rejected() {
        GeofenceException ex = assertThrows(GeofenceException.class, () ->
                geofenceService.validateLocation(22.7528, 200.0)
        );
        assertEquals("INVALID_LOCATION", ex.getErrorCode());
    }

    @Test
    @DisplayName("Null latitude/longitude throws GeofenceException with LOCATION_REQUIRED")
    void testValidateLocation_NullCoordinates_Rejected() {
        GeofenceException ex = assertThrows(GeofenceException.class, () ->
                geofenceService.validateLocation(null, null)
        );
        assertEquals("LOCATION_REQUIRED", ex.getErrorCode());
    }

    @Test
    @DisplayName("NaN coordinates throws GeofenceException with LOCATION_REQUIRED")
    void testValidateLocation_NaNCoordinates_Rejected() {
        GeofenceException ex = assertThrows(GeofenceException.class, () ->
                geofenceService.validateLocation(Double.NaN, 75.8674)
        );
        assertEquals("LOCATION_REQUIRED", ex.getErrorCode());
    }

    @Test
    @DisplayName("When geofencing is disabled, any coordinates (or null) bypass validation")
    void testValidateLocation_Disabled_Bypassed() {
        when(configProvider.isGeofenceEnabled()).thenReturn(false);

        Double distNull = geofenceService.validateLocation(null, null);
        assertNull(distNull);

        Double distFar = geofenceService.validateLocation(0.0, 0.0);
        assertNull(distFar);
    }
}
