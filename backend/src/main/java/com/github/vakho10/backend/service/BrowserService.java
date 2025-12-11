package com.github.vakho10.backend.service;

import com.github.vakho10.backend.payload.ActiveInputResponse;
import com.github.vakho10.backend.payload.BrowserStatus;
import io.github.bonigarcia.wdm.WebDriverManager;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.Setter;
import lombok.extern.slf4j.Slf4j;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.chrome.ChromeOptions;
import org.openqa.selenium.devtools.DevTools;
import org.openqa.selenium.devtools.v142.emulation.Emulation;
import org.openqa.selenium.devtools.v142.page.Page;
import org.openqa.selenium.interactions.PointerInput;
import org.openqa.selenium.interactions.Sequence;
import org.springframework.context.annotation.Scope;
import org.springframework.context.annotation.ScopedProxyMode;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

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

    private final SimpMessagingTemplate messagingTemplate;
    private ScheduledExecutorService scheduler;
    private String lastScreenshot;

    @PostConstruct
    void init() {
        // Setup Chrome driver
        WebDriverManager.chromedriver().setup();
    }

    @PreDestroy
    void destroy() {
        stopBrowser();
    }

    public void startBrowser() {
        ChromeOptions options = new ChromeOptions();
        options.addArguments("--headless=new"); // Use new headless mode
        options.addArguments("--disable-gpu"); // Recommended for headless execution
        options.addArguments("--no-sandbox"); // Often needed for Linux environments
        driver = new ChromeDriver(options);

        // Initialize DevTools
        devTools = driver.getDevTools();
        devTools.createSession();

        log.debug("Browser initialized");

        // Start the screenshot monitoring task
        scheduler = Executors.newSingleThreadScheduledExecutor();
        scheduler.scheduleAtFixedRate(this::checkAndPushScreenshot, 0, 200, TimeUnit.MILLISECONDS);
    }

    public void stopBrowser() {
        if (scheduler != null) {
            scheduler.shutdown();
            try {
                if (!scheduler.awaitTermination(1, TimeUnit.SECONDS)) {
                    scheduler.shutdownNow();
                }
            } catch (InterruptedException e) {
                scheduler.shutdownNow();
            }
        }
        if (driver != null) {
            driver.quit();
            driver = null;
            log.debug("Browser destroyed");
        }
    }

    public BrowserStatus getBrowserStatus() {
        return BrowserStatus.builder()
                .alive(driver != null)
                .build();
    }

    private void checkAndPushScreenshot() {
        if (driver == null || sessionId == null) {
            return;
        }

        try {
            String currentScreenshot = captureVisibleViewportScreenshot();
            if (currentScreenshot != null && !currentScreenshot.equals(lastScreenshot)) {
                lastScreenshot = currentScreenshot;
                messagingTemplate.convertAndSend("/topic/screenshot.%s".formatted(sessionId), currentScreenshot);
            }
        } catch (Exception e) {
            log.error("Failed to capture/push screenshot", e);
        }
    }

    public void touch() {
        // An empty method to trigger bean instantiation, even if no other method is
        // called
    }

    /**
     * Resize the viewport to a specific width and height (inner content area),
     * not the outer Chrome window.
     */
    public void resizeViewport(int width, int height) {
        if (devTools == null) {
            return;
        }
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
                Optional.empty()));
        log.debug("Viewport resized to {}x{}", width, height);
    }

    /**
     * Capture only the currently visible viewport.
     */
    public String captureVisibleViewportScreenshot() {
        try {
            return devTools.send(
                    Page.captureScreenshot(
                            Optional.empty(), // format
                            Optional.empty(), // quality
                            Optional.empty(), // clip
                            Optional.empty(), // fromSurface
                            Optional.of(false), // captureBeyondViewport = false
                            Optional.empty() // optimizeForSpeed
                    ));
        } catch (Exception e) {
            log.warn("Failed to capture screenshot: {}", e.getMessage());
            return null;
        }
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

    public ActiveInputResponse clickAt(int x, int y) {
        if (driver == null || sessionId == null) {
            return null;
        }
        // Using Selenium Actions API (low-level pointer input)
        PointerInput mouse = new PointerInput(PointerInput.Kind.MOUSE, "default mouse");
        Sequence click = new Sequence(mouse, 0);

        click.addAction(mouse.createPointerMove(Duration.ZERO, PointerInput.Origin.viewport(), x, y));
        click.addAction(mouse.createPointerDown(PointerInput.MouseButton.LEFT.asArg()));
        click.addAction(mouse.createPointerUp(PointerInput.MouseButton.LEFT.asArg()));

        driver.perform(List.of(click));

        log.debug("Clicked at coordinates: {}x{}", x, y);

        // Save active input element
        WebElement active = driver.switchTo().activeElement();
        String tag = active.getTagName();

        if ("input".equalsIgnoreCase(tag)) {
            ActiveInputResponse response = new ActiveInputResponse();
            response.setType(active.getAttribute("type"));
            response.setValue(active.getAttribute("value"));
            return response;
        } else if ("textarea".equalsIgnoreCase(tag)) {
            ActiveInputResponse response = new ActiveInputResponse();
            response.setType(active.getAttribute("type"));
            response.setValue(active.getText());
            return response;
        } else {
            log.warn("Clicked element is not focusable: " + tag);
            return null;
        }
    }

    public void moveMouse(int x, int y) {
        if (driver == null || sessionId == null) {
            return;
        }
        PointerInput mouse = new PointerInput(PointerInput.Kind.MOUSE, "default mouse");
        Sequence move = new Sequence(mouse, 0);
        move.addAction(mouse.createPointerMove(Duration.ZERO, PointerInput.Origin.viewport(), x, y));
        try {
            driver.perform(List.of(move));
        } catch (org.openqa.selenium.interactions.MoveTargetOutOfBoundsException e) {
            log.warn("Mouse move out of bounds: {}x{}", x, y);
        }
    }

    public void sendValueToActiveInput(String value) {
        WebElement active = driver.switchTo().activeElement();
        active.sendKeys(value);
        log.debug("Sent value '{}' to active input element", value);
    }
}   
