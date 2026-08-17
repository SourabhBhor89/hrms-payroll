package com.company.hrms.service.Google_Calendar_Service;

import java.time.LocalDate;
import java.time.format.TextStyle;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import com.company.hrms.dto.Google_Calendar.GoogleCalendarEvent;
import com.company.hrms.dto.Google_Calendar.GoogleCalendarResponse;
import com.company.hrms.dto.response.HolidayDto;

import com.company.hrms.constants.CacheNames;

@Service
public class GoogleCalendarService {

    private static final Logger log = LoggerFactory.getLogger(GoogleCalendarService.class);

    private final RestClient restClient;

    public GoogleCalendarService(RestClient.Builder builder) {
        this.restClient = builder.build();
    }

    @Value("${google.calendar.api-key}")
    private String apiKey;

    @Value("${google.calendar.calendar-id}")
    private String calendarId;

    public GoogleCalendarResponse getEvents() {
        try {
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
        } catch (Exception e) {
            log.warn("Failed to fetch Google Calendar events from API: {}", e.getMessage());
            return null;
        }
    }

    @Cacheable(value = CacheNames.HOLIDAYS, key = "'all'")
    public List<HolidayDto> getPublicHolidays() {
        log.info("Fetching public holidays from external Google Calendar API / fallbacks (Cache Miss)...");
        GoogleCalendarResponse response = getEvents();
        List<HolidayDto> holidays = new ArrayList<>();

        if (response != null && response.getItems() != null && !response.getItems().isEmpty()) {
            int idCounter = 1;
            for (GoogleCalendarEvent event : response.getItems()) {
                if (event.getSummary() == null || event.getStart() == null) {
                    continue;
                }

                String dateStr = event.getStart().getDate();
                if (dateStr == null && event.getStart().getDateTime() != null) {
                    dateStr = event.getStart().getDateTime().split("T")[0];
                }

                if (dateStr == null) {
                    continue;
                }

                String dayName = "Monday";
                boolean upcoming = true;
                try {
                    LocalDate ld = LocalDate.parse(dateStr);
                    dayName = ld.getDayOfWeek().getDisplayName(TextStyle.FULL, Locale.ENGLISH);
                    upcoming = !ld.isBefore(LocalDate.now());
                } catch (Exception ignored) {
                }

                String desc = event.getDescription() != null && !event.getDescription().isBlank()
                        ? event.getDescription()
                        : "Public holiday";

                String type = desc.toLowerCase().contains("observance") || desc.toLowerCase().contains("optional")
                        ? "Optional"
                        : "Mandatory";

                holidays.add(HolidayDto.builder()
                        .id(String.valueOf(idCounter++))
                        .name(event.getSummary())
                        .title(event.getSummary())
                        .date(dateStr)
                        .day(dayName)
                        .type(type)
                        .description(desc)
                        .upcoming(upcoming)
                        .build());
            }
        }

        List<HolidayDto> sortedHolidays = holidays.stream()
                .sorted((a, b) -> a.getDate().compareTo(b.getDate()))
                .toList();

        if (sortedHolidays.isEmpty()) {
            return getFallbackHolidays();
        }

        return sortedHolidays;
    }

    public List<HolidayDto> getFallbackHolidays() {
        LocalDate today = LocalDate.now();
        List<HolidayDto> list = new ArrayList<>();

        addFallback(list, "1", "Republic Day", "2026-01-26", "Mandatory", "National holiday celebrating the Constitution of India.", today);
        addFallback(list, "2", "Holi", "2026-03-25", "Mandatory", "Festival of colors.", today);
        addFallback(list, "3", "Good Friday", "2026-04-03", "Mandatory", "Christian holiday commemorating the crucifixion of Jesus.", today);
        addFallback(list, "4", "Dr. Ambedkar Jayanti", "2026-04-14", "Optional", "Commemorating the birth anniversary of Dr. B. R. Ambedkar.", today);
        addFallback(list, "5", "May Day", "2026-05-01", "Mandatory", "International Workers' Day.", today);
        addFallback(list, "6", "Independence Day", "2026-08-15", "Mandatory", "National holiday commemorating independence.", today);
        addFallback(list, "7", "Ganesh Chaturthi", "2026-09-14", "Regional", "Festival celebrating Lord Ganesha.", today);
        addFallback(list, "8", "Mahatma Gandhi Jayanti", "2026-10-02", "Mandatory", "National holiday commemorating Mahatma Gandhi.", today);
        addFallback(list, "9", "Dussehra", "2026-10-20", "Mandatory", "Vijayadashami festival celebration.", today);
        addFallback(list, "10", "Diwali", "2026-11-08", "Mandatory", "Festival of Lights company wide holiday.", today);
        addFallback(list, "11", "Christmas Day", "2026-12-25", "Mandatory", "Christmas celebration holiday.", today);

        return list.stream()
                .sorted((a, b) -> a.getDate().compareTo(b.getDate()))
                .toList();
    }

    private void addFallback(List<HolidayDto> list, String id, String title, String dateStr, String type, String desc, LocalDate today) {
        String dayName = "Monday";
        boolean upcoming = true;
        try {
            LocalDate ld = LocalDate.parse(dateStr);
            dayName = ld.getDayOfWeek().getDisplayName(TextStyle.FULL, Locale.ENGLISH);
            upcoming = !ld.isBefore(today);
        } catch (Exception ignored) {
        }

        list.add(HolidayDto.builder()
                .id(id)
                .name(title)
                .title(title)
                .date(dateStr)
                .day(dayName)
                .type(type)
                .description(desc)
                .upcoming(upcoming)
                .build());
    }

    @CacheEvict(value = CacheNames.HOLIDAYS, allEntries = true)
    public void clearHolidaysCache() {
        log.info("Cleared holidays Redis cache.");
    }
}
