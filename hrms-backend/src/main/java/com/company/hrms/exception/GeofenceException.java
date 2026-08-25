package com.company.hrms.exception;

import lombok.Getter;

@Getter
public class GeofenceException extends RuntimeException {

    private final String errorCode;
    private final Double distanceMeters;
    private final Double allowedRadiusMeters;

    public GeofenceException(String message) {
        super(message);
        this.errorCode = "OUTSIDE_GEOFENCE";
        this.distanceMeters = null;
        this.allowedRadiusMeters = null;
    }

    public GeofenceException(String errorCode, String message) {
        super(message);
        this.errorCode = errorCode;
        this.distanceMeters = null;
        this.allowedRadiusMeters = null;
    }

    public GeofenceException(String message, Double distanceMeters, Double allowedRadiusMeters) {
        super(message);
        this.errorCode = "OUTSIDE_GEOFENCE";
        this.distanceMeters = distanceMeters;
        this.allowedRadiusMeters = allowedRadiusMeters;
    }

    public GeofenceException(String errorCode, String message, Double distanceMeters, Double allowedRadiusMeters) {
        super(message);
        this.errorCode = errorCode;
        this.distanceMeters = distanceMeters;
        this.allowedRadiusMeters = allowedRadiusMeters;
    }
}
