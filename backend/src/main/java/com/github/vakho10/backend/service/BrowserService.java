package com.github.vakho10.backend.service;

import com.github.vakho10.backend.payload.ActiveInputResponse;
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
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.List;
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

    public ActiveInputResponse clickAt(int x, int y) {
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

    public void sendValueToActiveInput(String value) {
        WebElement active = driver.switchTo().activeElement();
        active.sendKeys(value);
        log.debug("Sent value '{}' to active input element", value);
    }
}
