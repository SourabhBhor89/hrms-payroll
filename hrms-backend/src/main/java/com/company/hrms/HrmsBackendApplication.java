package com.company.hrms;

import com.company.hrms.config.JwtProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableConfigurationProperties(JwtProperties.class)
@EnableScheduling
public class HrmsBackendApplication {

	public static void main(String[] args) {
		SpringApplication.run(HrmsBackendApplication.class, args);
	}

}
