package com.github.vakho10.backend.listener;

import com.github.vakho10.backend.service.BrowserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionConnectEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

@Slf4j
@Component
@RequiredArgsConstructor
public class WebSocketEventsListener {

    private final BrowserService browserService;

    @EventListener
    public void handleSessionConnect(SessionConnectEvent event) {
        log.debug("New WebSocket connection established");

        // When a bean is declared in a custom scope (like websocket), Spring does not eagerly create
        // an instance at application startup. Instead, the instance is created the first time it is
        // accessed (used) in the context of a given WebSocket session.
        browserService.touch();
    }

    @EventListener
    public void handleSessionDisconnect(SessionDisconnectEvent event) {
        log.debug("WebSocket connection closed");
    }
}
