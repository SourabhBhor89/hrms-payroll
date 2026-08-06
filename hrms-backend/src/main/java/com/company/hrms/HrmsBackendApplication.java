package com.company.hrms;

import com.company.hrms.config.JwtProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;

@SpringBootApplication
@EnableConfigurationProperties(JwtProperties.class)
public class HrmsBackendApplication {

	public static void main(String[] args) {
		SpringApplication.run(HrmsBackendApplication.class, args);
	}

}
