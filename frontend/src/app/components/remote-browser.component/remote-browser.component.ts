import {Component, ElementRef, inject, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {WebSocketService} from "../../services/websocket.service";
import {AsyncPipe} from "@angular/common";
import {FormsModule} from "@angular/forms";

@Component({
  selector: 'app-remote-browser',
  standalone: true,
  imports: [AsyncPipe, FormsModule],
  templateUrl: './remote-browser.component.html',
  styleUrl: './remote-browser.component.scss'
})
export class RemoteBrowserComponent implements OnInit, OnDestroy {

  webSocketService = inject(WebSocketService);
  currentUrl: string | null = null;
  inputFieldUrl = "";
  private resizeObserver?: ResizeObserver;

  @ViewChild('content', {static: true})
  content!: ElementRef;

  ngOnInit() {
    this.webSocketService.activate();

    this.resizeObserver = new ResizeObserver(entries => {
      const entry = entries[0];
      this.resizeTo(entry.contentRect.width, entry.contentRect.height);
    });
    this.resizeObserver.observe(this.content.nativeElement);
  }

  connectToWebsite() {
    this.webSocketService.connectToWebsite(this.inputFieldUrl);
    this.currentUrl = this.inputFieldUrl
  }

  ngOnDestroy() {
    this.webSocketService.deactivate();
    this.resizeObserver?.disconnect();
  }

  resizeTo(width: number, height: number) {
    this.webSocketService.resizeTo(width, height);
  }

  goBack() {

  }

  goForward() {

  }

  refreshPage() {
    if (!this.currentUrl) return;
    this.webSocketService.connectToWebsite(this.currentUrl);
  }

  scrollUp() {
    this.webSocketService.scrollUp();
  }

  scrollDown() {
    this.webSocketService.scrollDown();
  }
}
