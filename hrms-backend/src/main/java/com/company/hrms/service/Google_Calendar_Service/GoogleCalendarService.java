package com.company.hrms.service.Google_Calendar_Service;

import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import com.company.hrms.dto.Google_Calendar.GoogleCalendarEvent;
import com.company.hrms.dto.Google_Calendar.GoogleCalendarResponse;

@Service
public class GoogleCalendarService 
{
    
    private final RestClient restClient;

    public GoogleCalendarService(RestClient.Builder builder) {
        this.restClient = builder.build();
    }
    
    @Value("${google.calendar.api-key}")
    private String apiKey;

    @Value("${google.calendar.calendar-id}")
    private String calendarId;


    public GoogleCalendarResponse getEvents() {

        return restClient.get()
                .uri(uriBuilder -> uriBuilder
                        .scheme("https")
                        .host("www.googleapis.com")
                        .path("/calendar/v3/calendars/{calendarId}/events")
                        .queryParam("key", apiKey)
                        .queryParam("singleEvents", true)
                        .queryParam("orderBy", "startTime")
                        .queryParam("timeMin", "2026-01-01T00:00:00Z")
                        .queryParam("timeMax", "2026-12-31T23:59:59Z")
                        .build(calendarId))
                .retrieve()
                .body(GoogleCalendarResponse.class);
    }

    public List<GoogleCalendarEvent> getPublicHolidays() 
    {
        GoogleCalendarResponse response = getEvents();

        return response.getItems().stream().filter(event ->
                                                    event.getDescription() != null &&
                                                    event.getDescription().startsWith("Public holiday")
                                                ).toList();
    }

}
