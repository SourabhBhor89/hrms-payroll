import { TestBed } from '@angular/core/testing';
import { GeolocationService } from './geolocation.service';

describe('GeolocationService', () => {
  let service: GeolocationService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(GeolocationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should resolve coordinates when geolocation succeeds', async () => {
    const mockPosition: GeolocationPosition = {
      coords: {
        latitude: 22.7528,
        longitude: 75.8674,
        accuracy: 10,
        altitude: null,
        altitudeAccuracy: null,
        heading: null,
        speed: null
      },
      timestamp: Date.now()
    };

    spyOn(navigator.geolocation, 'getCurrentPosition').and.callFake((success: any) => {
      success(mockPosition);
    });

    const coords = await service.getCurrentPosition();
    expect(coords.latitude).toBe(22.7528);
    expect(coords.longitude).toBe(75.8674);
  });

  it('should reject with PERMISSION_DENIED user message when permission is denied', async () => {
    const mockError: GeolocationPositionError = {
      code: 1, // PERMISSION_DENIED
      message: 'User denied Geolocation',
      PERMISSION_DENIED: 1,
      POSITION_UNAVAILABLE: 2,
      TIMEOUT: 3
    };

    spyOn(navigator.geolocation, 'getCurrentPosition').and.callFake((_: any, error: any) => {
      error(mockError);
    });

    try {
      await service.getCurrentPosition();
      fail('Expected promise to reject');
    } catch (err: any) {
      expect(err).toContain('Location access is required to clock in/out');
    }
  });

  it('should reject with POSITION_UNAVAILABLE user message when position is unavailable', async () => {
    const mockError: GeolocationPositionError = {
      code: 2, // POSITION_UNAVAILABLE
      message: 'Position unavailable',
      PERMISSION_DENIED: 1,
      POSITION_UNAVAILABLE: 2,
      TIMEOUT: 3
    };

    spyOn(navigator.geolocation, 'getCurrentPosition').and.callFake((_: any, error: any) => {
      error(mockError);
    });

    try {
      await service.getCurrentPosition();
      fail('Expected promise to reject');
    } catch (err: any) {
      expect(err).toContain('Unable to determine your current location');
    }
  });

  it('should reject with TIMEOUT user message when request times out', async () => {
    const mockError: GeolocationPositionError = {
      code: 3, // TIMEOUT
      message: 'Timeout expired',
      PERMISSION_DENIED: 1,
      POSITION_UNAVAILABLE: 2,
      TIMEOUT: 3
    };

    spyOn(navigator.geolocation, 'getCurrentPosition').and.callFake((_: any, error: any) => {
      error(mockError);
    });

    try {
      await service.getCurrentPosition();
      fail('Expected promise to reject');
    } catch (err: any) {
      expect(err).toContain('Unable to get your location in time');
    }
  });
});
