package com.company.hrms.config;

import jakarta.annotation.PostConstruct;
import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Getter
@Setter
@Component
@ConfigurationProperties(prefix = "app.geofence")
public class GeofenceProperties {

    private boolean enabled = true;
    private Double officeLatitude;
    private Double officeLongitude;
    private Double allowedRadiusMeters = 50.0;

    @PostConstruct
    public void validateConfiguration() {
        if (enabled) {
            if (officeLatitude == null || officeLatitude < -90.0 || officeLatitude > 90.0) {
                throw new IllegalStateException("Geofence is enabled but office-latitude is invalid: " + officeLatitude + ". Must be between -90 and 90.");
            }
            if (officeLongitude == null || officeLongitude < -180.0 || officeLongitude > 180.0) {
                throw new IllegalStateException("Geofence is enabled but office-longitude is invalid: " + officeLongitude + ". Must be between -180 and 180.");
            }
            if (allowedRadiusMeters == null || allowedRadiusMeters <= 0.0) {
                throw new IllegalStateException("Geofence is enabled but allowed-radius-meters is invalid: " + allowedRadiusMeters + ". Must be greater than 0.");
            }
        }
    }
}
