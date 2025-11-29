import {Component, inject, OnDestroy, OnInit} from '@angular/core';
import {WebSocketService} from "../../services/websocket.service";

@Component({
  selector: 'app-remote-browser',
  standalone: true,
  imports: [],
  templateUrl: './remote-browser.component.html',
  styleUrl: './remote-browser.component.scss'
})
export class RemoteBrowserComponent implements OnInit, OnDestroy {

  private webSocketService = inject(WebSocketService);

  ngOnInit(): void {
    this.webSocketService.connect();
  }

  ngOnDestroy(): void {
    this.webSocketService.disconnect();
  }
}
