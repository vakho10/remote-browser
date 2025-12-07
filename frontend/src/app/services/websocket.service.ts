import { Injectable } from "@angular/core";
import { Client, IMessage } from "@stomp/stompjs";
import { ReplaySubject, Subject } from "rxjs";

@Injectable({
  providedIn: "root",
})
export class WebSocketService {
  private client: Client;

  takenScreenshotSubject = new Subject<string>();
  imageSubject = new Subject<string>();

  // ReplaySubject remembers all emitted values
  resizeSubject = new ReplaySubject<{ width: number, height: number }>();

  private screenshotSubscribed = false;

  private sessionId: string | null = null;

  constructor() {
    this.client = new Client({ brokerURL: '/ws', reconnectDelay: 5000 });

    this.client.onConnect = () => {
      console.log("Connected to WebSocket");

      // Subscribe only once to get sessionId from the server
      this.client.subscribe("/topic/get-session-id", (msg: IMessage) => {
        if (this.screenshotSubscribed) return; // ignore duplicates
        this.screenshotSubscribed = true;

        this.sessionId = msg.body;
        console.log("Received sessionId:", this.sessionId);

        // Subscribe to resize events and forward them to the backend
        this.resizeSubject.subscribe(size => {
          console.log("Resizing to:", size);
          this.client.publish({
            destination: "/app/resize-to",
            body: JSON.stringify({
              width: size.width,
              height: size.height
            }),
          })
        });

        // Subscribe to active input trigger
        this.client.subscribe(
          `/topic/activate-input.${this.sessionId}`,
          this.handleActivateInputResponse.bind(this)
        );

        // Subscribe to a "take screenshot" button response topic
        this.client.subscribe(
          `/topic/taken-screenshot.${this.sessionId}`,
          this.handleTakeScreenshot.bind(this)
        );

        // Subscribe to a session-specific screenshot topic
        this.client.subscribe(
          `/topic/screenshot.${this.sessionId}`,
          this.handleImageResponse.bind(this)
        );
      });

      // Request session topic
      this.getSessionId();
    };

    this.client.onDisconnect = () => {
      console.log("Disconnected from WebSocket");
    };

    this.client.onStompError = (frame) => {
      console.error("WebSocket Error:", frame);
    };
  }

  /** Activate the WebSocket connection */
  activate() {
    this.client.activate();
  }

  /** Deactivate the connection and stop polling */
  deactivate() {
    this.client.deactivate();
    this.sessionId = null;
    this.screenshotSubscribed = false;
  }

  resizeTo(width: number, height: number) {
    this.resizeSubject.next({ width, height });
  }

  /** Send a command to connect the browser to a URL */
  connectToWebsite(url: string) {
    this.client.publish({
      destination: "/app/connect-to-url",
      body: url,
    });
  }

  private getSessionId() {
    this.client.publish({
      destination: "/app/get-session-id",
      body: "",
    });
  }

  private handleActivateInputResponse(message: IMessage) {
    console.log("Received input activation trigger");
    try {
      const response: { type: string, value: string } = JSON.parse(message.body);
      const inputValue = prompt("Update or enter new value for input field", response.value);
      if (inputValue) {
        console.log("Received input:", inputValue);
        this.sendValueToActiveInput(inputValue);
      }
    } catch (e) {
      console.error('Failed to parse active input:', e);
    }
  }

  /** Handle "screenshot take" triggered by button click */
  private handleTakeScreenshot(message: IMessage) {
    console.log("Received taken screenshot");
    this.takenScreenshotSubject.next(message.body);
  }

  /** Handle incoming screenshot messages */
  private handleImageResponse(message: IMessage) {
    console.log("Received screenshot");
    this.imageSubject.next(message.body);
  }

  sendValueToActiveInput(value: string) {
    this.client.publish({
      destination: "/app/send-value-to-active-input",
      body: value,
    });
  }

  scrollUp() {
    this.client.publish({
      destination: "/app/scroll-up",
      body: "",
    });
  }

  scrollDown() {
    this.client.publish({
      destination: "/app/scroll-down",
      body: "",
    });
  }

  clickAt(x: number, y: number) {
    this.client.publish({
      destination: "/app/click-at",
      body: JSON.stringify({ x, y }),
    });
  }

  takeScreenshot() {
    this.client.publish({
      destination: "/app/take-screenshot",
      body: "",
    });
  }
}
