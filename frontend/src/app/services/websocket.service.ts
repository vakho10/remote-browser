import {Injectable} from "@angular/core";
import {Client, IMessage} from "@stomp/stompjs";
import {ReplaySubject, Subject} from "rxjs";

@Injectable({
  providedIn: "root",
})
export class WebSocketService {
  private client: Client;

  imageSubject = new Subject<string>();

  // ReplaySubject remembers all emitted values
  resizeSubject = new ReplaySubject<{ width: number, height: number }>();

  private screenshotSubscribed = false;

  private pollingTimeoutId: any;
  private sessionId: string | null = null;

  constructor() {
    this.client = new Client({brokerURL: '/ws', reconnectDelay: 5000});

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

        // Subscribe to a session-specific screenshot topic
        this.client.subscribe(
          `/topic/screenshot.${this.sessionId}`,
          this.handleImageResponse.bind(this)
        );

        // Start polling screenshots
        this.startPollingScreenshots();
      });

      // Request session topic
      this.getSessionId();
    };

    this.client.onDisconnect = () => {
      console.log("Disconnected from WebSocket");
      this.stopPollingScreenshots();
    };

    this.client.onStompError = (frame) => {
      console.error("WebSocket Error:", frame);
      this.stopPollingScreenshots();
    };
  }

  /** Activate the WebSocket connection */
  activate() {
    this.client.activate();
  }

  /** Deactivate the connection and stop polling */
  deactivate() {
    this.stopPollingScreenshots();
    this.client.deactivate();
    this.sessionId = null;
    this.screenshotSubscribed = false;
  }

  resizeTo(width: number, height: number) {
    this.resizeSubject.next({width, height});
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

  /** Request a single screenshot from the server */
  private requestScreenshot() {
    if (!this.sessionId) return;
    this.client.publish({
      destination: "/app/get-screenshot",
      body: "",
    });
  }

  /** Handle incoming screenshot messages */
  private handleImageResponse(message: IMessage) {
    console.log("Received screenshot");
    this.imageSubject.next(message.body);

    // Stop any existing timeout before scheduling next
    if (this.pollingTimeoutId) clearTimeout(this.pollingTimeoutId);

    // Schedule the next request after 1 second
    this.pollingTimeoutId = setTimeout(() => {
      this.requestScreenshot();
    }, 1000);
  }

  /** Start the polling loop */
  private startPollingScreenshots() {
    this.requestScreenshot();
  }

  /** Stop the polling loop */
  private stopPollingScreenshots() {
    if (this.pollingTimeoutId) {
      clearTimeout(this.pollingTimeoutId);
      this.pollingTimeoutId = null;
    }
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
}
