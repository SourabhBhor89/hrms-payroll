package com.company.hrms.dto.Google_Calendar;

import lombok.Data;

@Data
public class GoogleCalendarEvent {

    private String summary;
    private String description;
    private GoogleEventDate start;

}
