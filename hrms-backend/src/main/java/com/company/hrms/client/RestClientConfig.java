package com.company.hrms.client;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestClient;

@Configuration
public class RestClientConfig 
{
    /*means: "Spring, create and manage this object as a bean." */
    @Bean
    public RestClient.Builder restClientBuilder()
    {
        return RestClient.builder();
    }
    
}

