package com.github.vakho10.backend.component;

import io.github.bonigarcia.wdm.WebDriverManager;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.chrome.ChromeDriver;
import org.springframework.context.annotation.Scope;
import org.springframework.context.annotation.ScopedProxyMode;
import org.springframework.stereotype.Component;

/**
 * Every websocket session will have its own {@link WebSocketHandler} instance with a unique browser instance.
 */
@Component
@Scope(scopeName = "websocket", proxyMode = ScopedProxyMode.TARGET_CLASS)
public class WebSocketHandler {

    private WebDriver driver;

    @PostConstruct
    void init() {
        WebDriverManager.chromedriver().setup();
        driver = new ChromeDriver();
    }

    @PreDestroy
    public void destroy() {
        if (driver != null) {
            driver.quit();
        }
    }
}
