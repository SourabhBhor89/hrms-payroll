package com.company.hrms.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;


/*
 * HealthCheckRoute is a REST controller that provides a health check endpoint for the application.
 * It is mainly used for wake-up calls , beacuse Render is shutdown the application if it is not used for a while.
 * we use Github Actions to ping this endpoint every 5 minutes to keep the application alive.
*/
@RestController
public class HealthCheckRoute 
{
    @GetMapping("/health-check")
    public String healthCheck()
    {
        return "OK";
    }
}