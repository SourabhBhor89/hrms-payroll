package com.company.hrms.config;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class YamlGeofenceConfigProvider implements GeofenceConfigProvider {

    private final GeofenceProperties geofenceProperties;

    @Override
    public boolean isGeofenceEnabled() {
        return geofenceProperties.isEnabled();
    }

    @Override
    public Double getOfficeLatitude() {
        return geofenceProperties.getOfficeLatitude();
    }

    @Override
    public Double getOfficeLongitude() {
        return geofenceProperties.getOfficeLongitude();
    }

    @Override
    public Double getAllowedRadiusMeters() {
        return geofenceProperties.getAllowedRadiusMeters();
    }
}
