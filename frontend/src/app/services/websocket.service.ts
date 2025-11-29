import {Injectable} from "@angular/core";
import {Client} from "@stomp/stompjs";

@Injectable({
  providedIn: "root",
})
export class WebSocketService {
  private client: Client;

  constructor() {
    this.client = new Client({
      brokerURL: '/ws',
      reconnectDelay: 5000
    });

    this.client.onConnect = (frame) => {
      console.log("Connected to WebSocket", frame);
    };

    this.client.onDisconnect = (frame) => {
      console.log("Disconnected from WebSocket", frame);
    }

    this.client.onStompError = (frame) => {
      console.error("WebSocket Error:", frame);
    };
  }

  connect(): void {
    this.client.activate();
  }

  disconnect(): void {
    this.client.deactivate();
  }
}
