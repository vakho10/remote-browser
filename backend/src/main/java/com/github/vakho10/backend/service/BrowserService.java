package com.github.vakho10.backend.service;

import io.github.bonigarcia.wdm.WebDriverManager;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import lombok.extern.slf4j.Slf4j;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.chrome.ChromeDriver;
import org.springframework.context.annotation.Scope;
import org.springframework.context.annotation.ScopedProxyMode;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@Scope(scopeName = "websocket", proxyMode = ScopedProxyMode.TARGET_CLASS)
public class BrowserService {

    private WebDriver driver;

    @PostConstruct
    void init() {
        WebDriverManager.chromedriver().setup();
        driver = new ChromeDriver();
        log.debug("Browser initialized");
    }

    @PreDestroy
    void destroy() {
        if (driver != null) {
            driver.quit();
            log.debug("Browser destroyed");
        }
    }

    public void touch() {
        // An empty method to trigger bean instantiation, even if no other method is called
    }
}
