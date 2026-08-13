package com.company.hrms.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class HolidayDto {
    private String id;
    private String name;
    private String title;
    private String date;
    private String day;
    private String type;
    private String description;
    private boolean upcoming;
}
