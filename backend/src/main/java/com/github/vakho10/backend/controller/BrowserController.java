package com.github.vakho10.backend.controller;

import com.github.vakho10.backend.payload.ClickRequest;
import com.github.vakho10.backend.payload.MoveRequest;
import com.github.vakho10.backend.payload.ResizeRequest;
import com.github.vakho10.backend.service.BrowserService;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

@Controller
@RequiredArgsConstructor
public class BrowserController {

    private final BrowserService browserService;
    private final SimpMessagingTemplate messagingTemplate;

    @MessageMapping("/get-session-id")
    @SendTo("/topic/get-session-id")
    public String getSessionId() {
        return browserService.getSessionId();
    }

    @MessageMapping("/start-browser")
    public void startBrowser() {
        browserService.startBrowser();
    }

    @MessageMapping("/stop-browser")
    public void stopBrowser() {
        browserService.stopBrowser();
    }

    @MessageMapping("/get-browser-status")
    public void getBrowserStatus() {
        messagingTemplate.convertAndSend(
                "/topic/get-browser-status.%s".formatted(browserService.getSessionId()),
                browserService.getBrowserStatus()
        );
    }

    @MessageMapping("/resize-to")
    public void resizeTo(@Payload ResizeRequest resizeRequest) {
        browserService.resizeViewport(resizeRequest.getWidth(), resizeRequest.getHeight());
    }

    @MessageMapping("/connect-to-url")
    public void connectToUrl(@Payload String url) {
        browserService.connectToUrl(url);
    }

    @MessageMapping("/scroll-up")
    public void scrollUp() {
        browserService.scrollUp();
    }

    @MessageMapping("/scroll-down")
    public void scrollDown() {
        browserService.scrollDown();
    }

    @MessageMapping("/click-at")
    public void clickAt(@Payload ClickRequest clickRequest) {
        var activeInputResponse = browserService.clickAt(clickRequest.getX(), clickRequest.getY());
        if (activeInputResponse != null) {
            messagingTemplate.convertAndSend(
                    "/topic/activate-input.%s".formatted(browserService.getSessionId()),
                    activeInputResponse);
        }
    }

    @MessageMapping("/move-mouse")
    public void moveMouse(@Payload MoveRequest moveRequest) {
        browserService.moveMouse(moveRequest.getX(), moveRequest.getY());
    }

    @MessageMapping("/send-value-to-active-input")
    public void sendValueToActiveInput(@Payload String value) {
        browserService.sendValueToActiveInput(value);
    }

    @MessageMapping("/take-screenshot")
    public void getScreenshot() {
        String screenshot = browserService.captureVisibleViewportScreenshot();

        // Send a screenshot to the session-specific topic
        messagingTemplate.convertAndSend(
                "/topic/taken-screenshot.%s".formatted(browserService.getSessionId()),
                screenshot);
    }
}
