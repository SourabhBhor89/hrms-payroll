package com.company.hrms.config;

public interface GeofenceConfigProvider {
    boolean isGeofenceEnabled();
    Double getOfficeLatitude();
    Double getOfficeLongitude();
    Double getAllowedRadiusMeters();
}
