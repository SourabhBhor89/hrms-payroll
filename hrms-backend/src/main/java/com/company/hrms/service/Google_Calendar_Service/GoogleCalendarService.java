package com.company.hrms.service.Google_Calendar_Service;

import java.net.URI;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.TextStyle;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.concurrent.atomic.AtomicReference;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import com.company.hrms.constants.CacheNames;
import com.company.hrms.dto.Google_Calendar.GoogleCalendarEvent;
import com.company.hrms.dto.Google_Calendar.GoogleCalendarResponse;
import com.company.hrms.dto.response.HolidayDto;

@Service
public class GoogleCalendarService {

    private static final Logger log = LoggerFactory.getLogger(GoogleCalendarService.class);

    private final RestClient restClient;
    private final AtomicReference<List<HolidayDto>> inMemoryCache = new AtomicReference<>(null);
    private volatile long lastFetchTimestamp = 0;
    private static final long CACHE_TTL_MS = 6 * 3600 * 1000L; // 6 hours

    public GoogleCalendarService(RestClient.Builder builder) {
        this.restClient = builder.build();
    }

    @Value("${google.calendar.api-key:}")
    private String apiKey;

    @Value("${google.calendar.calendar-id:en.indian#holiday@group.v.calendar.google.com}")
    private String calendarId;

    private String getEncodedCalendarId() {
        if (calendarId == null || calendarId.isBlank()) {
            return "en.indian%23holiday@group.v.calendar.google.com";
        }
        return calendarId.replace("#", "%23");
    }

    @EventListener(ApplicationReadyEvent.class)
    public void warmupCacheOnStartup() {
        log.info("Warming up Google Calendar holidays cache in background on application startup...");
        refreshHolidaysCache();
    }

    @Scheduled(cron = "0 0 */6 * * *")
    public void scheduledCacheRefresh() {
        log.info("Running scheduled refresh of Google Calendar holidays cache...");
        refreshHolidaysCache();
    }

    public synchronized List<HolidayDto> refreshHolidaysCache() {
        int currentYear = LocalDate.now().getYear();
        List<HolidayDto> holidays = new ArrayList<>();
        try {
            log.info("Fetching Indian holidays from Google Calendar public iCal feed...");
            holidays = fetchFromICalFeed(currentYear);
            if (!holidays.isEmpty()) {
                inMemoryCache.set(holidays);
                lastFetchTimestamp = System.currentTimeMillis();
                log.info("Successfully cached {} holidays in memory.", holidays.size());
            }
        } catch (Exception e) {
            log.warn("Failed to refresh holidays cache: {}", e.getMessage());
        }
        return holidays;
    }

    public GoogleCalendarResponse getEvents() {
        return getEventsFromApi(LocalDate.now().getYear());
    }

    public GoogleCalendarResponse getEventsFromApi(int year) 
    {
        if (apiKey == null || apiKey.isBlank() || "xyz_Api_Key".equalsIgnoreCase(apiKey)) {
            log.info("Google Calendar API key not set or invalid placeholder. Skipping REST API call.");
            return null;
        }

        try {
            String encodedCalendarId = getEncodedCalendarId().replace("@", "%40");
            String timeMin = year + "-01-01T00:00:00Z";
            String timeMax = year + "-12-31T23:59:59Z";
            String apiUrl = "https://www.googleapis.com/calendar/v3/calendars/" + encodedCalendarId
                    + "/events?key=" + apiKey + "&singleEvents=true&orderBy=startTime&timeMin=" + timeMin + "&timeMax=" + timeMax;

            return restClient.get()
                    .uri(URI.create(apiUrl))
                    .retrieve()
                    .body(GoogleCalendarResponse.class);
        } catch (Exception e) {
            log.warn("Failed to fetch Google Calendar events from REST API: {}", e.getMessage());
            return null;
        }
    }

    @Cacheable(value = CacheNames.HOLIDAYS, key = "'all'")
    public List<HolidayDto> getPublicHolidays() {
        try {
            List<HolidayDto> allHolidays = inMemoryCache.get();
            boolean isExpired = (System.currentTimeMillis() - lastFetchTimestamp) > CACHE_TTL_MS;

            if (allHolidays == null || allHolidays.isEmpty() || isExpired) {
                log.info("In-memory holidays cache miss or expired. Fetching fresh data...");
                allHolidays = refreshHolidaysCache();
            }

            if (allHolidays == null || allHolidays.isEmpty()) {
                return List.of();
            }

            return allHolidays.stream()
                    .filter(HolidayDto::isUpcoming)
                    .sorted(Comparator.comparing(HolidayDto::getDate))
                    .toList();
        } catch (Exception e) {
            log.error("Error fetching public holidays: {}", e.getMessage(), e);
            return List.of();
        }
    }

    public List<HolidayDto> fetchFromICalFeed(int year) {
        String calId = getEncodedCalendarId().replace("@", "%40");
        String iCalUrl = "https://calendar.google.com/calendar/ical/" + calId + "/public/basic.ics";

        String icalContent = restClient.get()
                .uri(URI.create(iCalUrl))
                .retrieve()
                .body(String.class);

        if (icalContent == null || icalContent.isBlank()) {
            return List.of();
        }

        return parseICalContent(icalContent, year);
    }

    public List<HolidayDto> parseICalContent(String icalContent, int targetYear) {
        List<HolidayDto> holidays = new ArrayList<>();
        String[] events = icalContent.split("BEGIN:VEVENT");

        int idCounter = 1;
        LocalDate today = LocalDate.now();

        for (int i = 1; i < events.length; i++) {
            String block = events[i];
            if (!block.contains("END:VEVENT")) {
                continue;
            }

            String dtStart = extractICalField(block, "DTSTART");
            String summary = extractICalField(block, "SUMMARY");
            String description = extractICalField(block, "DESCRIPTION");

            if (dtStart == null || summary == null) {
                continue;
            }

            // Extract YYYYMMDD from DTSTART string (e.g., DTSTART;VALUE=DATE:20260126 or DTSTART:20260126T000000Z)
            String rawDate = dtStart.replaceAll("^.*:", "").trim();
            if (rawDate.length() < 8) {
                continue;
            }
            String yyyymmdd = rawDate.substring(0, 8);

            try {
                LocalDate date = LocalDate.parse(yyyymmdd, DateTimeFormatter.ofPattern("yyyyMMdd"));
                if (date.getYear() != targetYear) {
                    continue;
                }

                String dateStr = date.toString();
                String dayName = date.getDayOfWeek().getDisplayName(TextStyle.FULL, Locale.ENGLISH);
                boolean upcoming = !date.isBefore(today);

                String cleanSummary = unescapeICal(summary);
                String cleanDesc = cleanDescription(description);

                String type = cleanDesc.toLowerCase().contains("observance") || cleanDesc.toLowerCase().contains("optional")
                        ? "Optional"
                        : "Mandatory";

                holidays.add(HolidayDto.builder()
                        .id(String.valueOf(idCounter++))
                        .name(cleanSummary)
                        .title(cleanSummary)
                        .date(dateStr)
                        .day(dayName)
                        .type(type)
                        .description(cleanDesc)
                        .upcoming(upcoming)
                        .build());
            } catch (Exception ignored) {
            }
        }

        return holidays.stream()
                .sorted(Comparator.comparing(HolidayDto::getDate))
                .toList();
    }

    private String cleanDescription(String description) {
        if (description == null || description.isBlank()) {
            return "Public holiday";
        }
        String desc = unescapeICal(description);
        int idx = desc.toLowerCase().indexOf("to hide observances");
        if (idx != -1) {
            desc = desc.substring(0, idx).trim();
        }
        if (desc.isBlank()) {
            return "Observance";
        }
        return desc;
    }

    private String extractICalField(String block, String fieldName) {
        for (String line : block.split("\r?\n")) {
            if (line.startsWith(fieldName + ":") || line.startsWith(fieldName + ";")) {
                int colonIdx = line.indexOf(':');
                if (colonIdx != -1 && colonIdx < line.length() - 1) {
                    return line.substring(colonIdx + 1).trim();
                }
            }
        }
        return null;
    }

    private String unescapeICal(String str) {
        if (str == null) return "";
        return str.replace("\\,", ",")
                .replace("\\;", ";")
                .replace("\\n", " ")
                .replace("\\N", " ")
                .replace("\\\\", "\\")
                .trim();
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

