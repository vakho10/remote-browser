package com.github.vakho10.backend.service;

import io.github.bonigarcia.wdm.WebDriverManager;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.Setter;
import lombok.extern.slf4j.Slf4j;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.chrome.ChromeOptions;
import org.openqa.selenium.devtools.DevTools;
import org.openqa.selenium.devtools.v142.emulation.Emulation;
import org.openqa.selenium.devtools.v142.page.Page;
import org.springframework.context.annotation.Scope;
import org.springframework.context.annotation.ScopedProxyMode;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
@Scope(scopeName = "websocket", proxyMode = ScopedProxyMode.TARGET_CLASS)
public class BrowserService {

    private ChromeDriver driver;
    private DevTools devTools;

    @Getter
    @Setter
    private String sessionId;

    @PostConstruct
    void init() {
        WebDriverManager.chromedriver().setup();

        ChromeOptions options = new ChromeOptions();
        options.addArguments("--headless=new"); // Use new headless mode
        options.addArguments("--disable-gpu"); // Recommended for headless execution
        options.addArguments("--no-sandbox"); // Often needed for Linux environments
        driver = new ChromeDriver(options);


        // Initialize DevTools
        devTools = driver.getDevTools();
        devTools.createSession();

        log.debug("Browser initialized");
    }

    @PreDestroy
    void destroy() {
        if (driver != null) {
            driver.quit();
            driver = null;
            log.debug("Browser destroyed");
        }
    }

    public void touch() {
        // An empty method to trigger bean instantiation, even if no other method is called
    }

    /**
     * Resize the viewport to a specific width and height (inner content area),
     * not the outer Chrome window.
     */
    public void resizeViewport(int width, int height) {
        devTools.send(Emulation.setDeviceMetricsOverride(
                width,
                height,
                1.0, // device scale factor
                false, // mobile
                Optional.empty(),
                Optional.empty(),
                Optional.empty(),
                Optional.empty(),
                Optional.empty(),
                Optional.empty(),
                Optional.empty(),
                Optional.empty(),
                Optional.empty(),
                Optional.empty()
        ));
        log.debug("Viewport resized to {}x{}", width, height);
    }

    /**
     * Capture only the currently visible viewport.
     */
    public String captureVisibleViewportScreenshot() {
        return devTools.send(
                Page.captureScreenshot(
                        Optional.empty(), // format
                        Optional.empty(), // quality
                        Optional.empty(), // clip
                        Optional.empty(), // fromSurface
                        Optional.of(false), // captureBeyondViewport = false
                        Optional.empty() // optimizeForSpeed
                )
        );
    }

    public void connectToUrl(String url) {
        driver.get(url);
    }

    public void scrollUp() {
        driver.executeScript("window.scrollBy(0, -100)");
    }

    public void scrollDown() {
        driver.executeScript("window.scrollBy(0, 100)");
    }
}
