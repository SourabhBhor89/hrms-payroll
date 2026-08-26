import { Injectable } from '@angular/core';

export interface LocationCoordinates {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

@Injectable({
  providedIn: 'root'
})
export class GeolocationService {

  getCurrentPosition(): Promise<LocationCoordinates> {
    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || typeof navigator === 'undefined' || !('geolocation' in navigator)) {
        return reject('Your browser does not support location-based attendance. Please use a supported browser/device.');
      }

      const options: PositionOptions = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      };

      navigator.geolocation.getCurrentPosition(
        (position: GeolocationPosition) => {
          if (position.coords.accuracy && position.coords.accuracy > 3000) {
            console.warn(`[GeolocationService] Low accuracy location detected (${Math.round(position.coords.accuracy)}m). The browser is using IP geolocation fallback.`);
            return reject(
              `Low accuracy location detected (accuracy: ${Math.round(position.coords.accuracy / 1000)}km). ` +
              `Your browser is providing IP-based location fallback instead of precise device location. ` +
              `Please enable 'Use precise location' in Chrome site permissions and turn on Windows Location Services.`
            );
          }
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy
          });
        },
        (error: GeolocationPositionError) => {
          switch (error.code) {
            case error.PERMISSION_DENIED:
              reject('Location access is required to clock in/out. Please allow location access and try again.');
              break;
            case error.POSITION_UNAVAILABLE:
              reject('Unable to determine your current location. Please check your device location settings and try again.');
              break;
            case error.TIMEOUT:
              reject('Unable to get your location in time. Please try again.');
              break;
            default:
              reject(error.message || 'Unable to retrieve location.');
              break;
          }
        },
        options
      );
    });
  }
}
